import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { api } from "@/lib/api";
import { DynamicEntityFields } from "@/components/entity-fields/DynamicEntityFields";
import { StripePaymentLinkPanel } from "@/components/orders/StripePaymentLinkPanel";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  EnumSelect,
  PageAlerts,
  PermissionButton,
  useConfirm,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { getBusinessDisplayName } from "@/lib/business";
import {
  buildEntityPayload,
  detailEntityFields,
  emptyFieldValue,
  isEntityRootKey,
  visibleAdminFields,
} from "@/constants/entityFields";
import {
  ORDER_PAYMENT_METHOD_OPTIONS,
  ORDER_PAYMENT_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
} from "@/lib/listFilters";
import {
  allowedOrderStatusOptions,
  allowedPaymentStatusOptions,
} from "@/constants/orders";
import { resolveMediaUrl } from "@/lib/media";
import { MODULE_PATHS } from "@/lib/modulePaths";
import { currencyFromGroup, formatMoney } from "@/lib/money";
import type {
  EntityFieldDefinition,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderRecord,
  OrderStatus,
} from "@/types";

const MODULE_PATH = MODULE_PATHS.ORDERS;

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function orderStatusLabel(status: OrderStatus) {
  return ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

function statusBadgeVariant(status: OrderStatus) {
  if (status === "cancelled") return "destructive" as const;
  if (status === "completed") return "default" as const;
  if (status === "pending") return "outline" as const;
  return "secondary" as const;
}

function paymentMethodLabel(method: OrderPaymentMethod) {
  return ORDER_PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label || method;
}

function paymentStatusLabel(status: OrderPaymentStatus) {
  return ORDER_PAYMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

function orderFormValues(
  fields: EntityFieldDefinition[],
  order?: OrderRecord
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of detailEntityFields(fields)) {
    if (isEntityRootKey("order", field.key)) {
      values[field.key] =
        order && field.key in order
          ? (order as Record<string, unknown>)[field.key]
          : emptyFieldValue(field);
    } else {
      values[field.key] = order?.custom?.[field.key] ?? emptyFieldValue(field);
    }
  }
  return values;
}

function customerName(order: OrderRecord) {
  return getBusinessDisplayName(order.customer as { _id: string; name: string } | string);
}

function customerContact(order: OrderRecord) {
  if (!order.customer || typeof order.customer !== "object") return "";
  return [order.customer.phone, order.customer.email].filter(Boolean).join(" · ");
}

function orderBusinessId(order: OrderRecord) {
  const first = order.items?.[0]?.business;
  if (first && typeof first === "object") return first._id;
  if (typeof first === "string") return first;
  return "";
}

function ItemImage({ path, alt }: { path?: string; alt: string }) {
  const src = path ? resolveMediaUrl(path) : "";
  if (!src) {
    return (
      <div className="bg-muted text-muted-foreground flex size-16 shrink-0 items-center justify-center rounded-lg border sm:size-20">
        <ImageIcon className="size-5" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="bg-muted size-16 shrink-0 rounded-lg border object-cover sm:size-20"
    />
  );
}

export default function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useAuth();
  const { confirm } = useConfirm();
  const canUpdate = can(MODULE_PATH, "update");

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refundingStripe, setRefundingStripe] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<OrderPaymentStatus>("unpaid");
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>("unpaid");
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [schemaFields, setSchemaFields] = useState<EntityFieldDefinition[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const pendingCheckoutUrlRef = useRef<string | null>(null);

  async function loadPaymentLink(data: OrderRecord) {
    const needsLink =
      data.paymentMethod === "stripe" &&
      data.paymentStatus === "unpaid" &&
      data.total > 0;
    if (!needsLink) {
      setCheckoutUrl("");
      pendingCheckoutUrlRef.current = null;
      return;
    }

    const fromNavigation = pendingCheckoutUrlRef.current;
    if (fromNavigation) {
      setCheckoutUrl(fromNavigation);
      pendingCheckoutUrlRef.current = null;
      return;
    }

    setPaymentLinkLoading(true);
    try {
      const link = await api.getOrderPaymentLink(data._id);
      setCheckoutUrl(link.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payment link.");
      setCheckoutUrl("");
    } finally {
      setPaymentLinkLoading(false);
    }
  }

  async function loadOrder() {
    if (!orderId) return;

    const navState = location.state as { checkoutUrl?: string } | null;
    if (navState?.checkoutUrl) {
      pendingCheckoutUrlRef.current = navState.checkoutUrl;
      navigate(location.pathname + location.search, { replace: true, state: null });
    }

    setLoading(true);
    setError("");
    try {
      const data = await api.getOrder(orderId);
      setOrder(data);
      setStatus(data.status);
      setPaymentStatus(data.paymentStatus);
      setPaymentMethod(data.paymentMethod);
      await loadPaymentLink(data);
    } catch (err) {
      setOrder(null);
      setCheckoutUrl("");
      setError(err instanceof Error ? err.message : "Unable to load order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (!order) {
      setSchemaFields([]);
      setFormValues({});
      return;
    }

    const businessId = orderBusinessId(order);
    if (!businessId) return;

    let cancelled = false;
    setSchemaLoading(true);
    api
      .getOrderSchema({ businessId })
      .then((data) => {
        if (cancelled) return;
        setSchemaFields(data.fields);
        setFormValues(orderFormValues(data.fields, order));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load order fields.");
          setSchemaFields([]);
          setFormValues({});
        }
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [order?._id]);

  function updateFormField(key: string, value: unknown) {
    if (!canUpdate || order?.status === "cancelled" || order?.status === "completed") return;
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  function applyOrder(updated: OrderRecord) {
    setOrder(updated);
    setStatus(updated.status);
    setPaymentStatus(updated.paymentStatus);
    setPaymentMethod(updated.paymentMethod);
    setFormValues(orderFormValues(schemaFields, updated));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!order || !canUpdate || schemaLoading) return;

    const stripeLocked = order.paymentMethod === "stripe";
    let nextPaymentStatus = paymentStatus;
    let nextPaymentMethod = paymentMethod;

    if (
      !stripeLocked &&
      status === "completed" &&
      paymentStatus === "unpaid" &&
      order.total > 0 &&
      order.status !== "completed"
    ) {
      const confirmed = await confirm({
        title: "Confirm payment before completing?",
        description:
          "Please confirm this order’s remaining payment is paid, then it will be marked completed.",
        confirmLabel: "Mark paid & completed",
        cancelLabel: "Go back",
      });
      if (!confirmed) return;
      nextPaymentStatus = "paid";
      if (nextPaymentMethod === "unpaid") {
        nextPaymentMethod = "cash";
      }
      setPaymentStatus(nextPaymentStatus);
      setPaymentMethod(nextPaymentMethod);
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      let updated: OrderRecord;
      if (order.status === "cancelled") {
        updated = await api.updateOrder(order._id, { paymentStatus: nextPaymentStatus });
      } else {
        const entityPayload = buildEntityPayload(
          "order",
          formValues,
          visibleAdminFields(schemaFields)
        );
        updated = await api.updateOrder(order._id, {
          status,
          ...(stripeLocked
            ? {}
            : {
                paymentStatus: nextPaymentStatus,
                paymentMethod: nextPaymentMethod,
              }),
          ...entityPayload,
        });
      }
      applyOrder(updated);
      setMessage(
        updated.status === "cancelled" && updated.paymentStatus === "refund_pending"
          ? "Order cancelled. Store credit/points restored. Cash or bank payment still needs a refund."
          : order.status !== "completed" &&
              updated.status === "completed" &&
              paymentStatus === "unpaid" &&
              nextPaymentStatus === "paid"
            ? "Marked paid and completed."
            : "Order saved."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save order.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRefundToWallet() {
    if (!order || !canUpdate) return;
    setRefunding(true);
    setError("");
    setMessage("");
    try {
      const updated = await api.refundOrderToWallet(order._id);
      applyOrder(updated);
      setMessage(
        `Refunded ${formatMoney(
          updated.refundToWalletAmount || updated.total,
          currencyFromGroup(updated.businessGroup)
        )} to customer store credit.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refund to wallet.");
    } finally {
      setRefunding(false);
    }
  }

  async function handleRefundStripe() {
    if (!order || !canUpdate) return;
    setRefundingStripe(true);
    setError("");
    setMessage("");
    try {
      const updated = await api.refundOrderViaStripe(order._id);
      applyOrder(updated);
      setMessage(
        `Refunded ${formatMoney(updated.total, currencyFromGroup(updated.businessGroup))} via Stripe.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refund via Stripe.");
    } finally {
      setRefundingStripe(false);
    }
  }

  const detailFields = detailEntityFields(schemaFields);
  const orderBranchName =
    order?.items?.[0]?.business
      ? getBusinessDisplayName(order.items[0].business)
      : "";
  const isStripePayment = order?.paymentMethod === "stripe";
  const canEditOrder =
    canUpdate && order != null && order.status !== "cancelled" && order.status !== "completed";
  const canEditStatus = canEditOrder;
  /** Payment: unpaid/paid while open. Completed locked. Cancelled only refund_pending → refunded. Stripe never editable. */
  const canEditPayment =
    canUpdate &&
    order != null &&
    !isStripePayment &&
    order.status !== "completed" &&
    (order.status !== "cancelled" || order.paymentStatus === "refund_pending");
  const canEditPaymentMethod = canEditOrder && !isStripePayment;
  const showCancelRefundBanner =
    order?.status === "cancelled" &&
    (order.paymentStatus === "refund_pending" ||
      order.paymentStatus === "refunded" ||
      (order.walletApplied || 0) > 0 ||
      (order.pointsRedeemed || 0) > 0);

  const statusOptions = order ? allowedOrderStatusOptions(order.status) : ORDER_STATUS_OPTIONS;
  const paymentOptions = order
    ? allowedPaymentStatusOptions(order.status, order.paymentStatus)
    : ORDER_PAYMENT_STATUS_OPTIONS.filter(
        (option) => option.value === "unpaid" || option.value === "paid"
      );
  const methodOptions = ORDER_PAYMENT_METHOD_OPTIONS.filter(
    (option) => option.value !== "stripe" || paymentMethod === "stripe"
  );

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell
        title={order ? `Order ${order.orderNumber}` : "Order"}
        description={
          order?.status === "completed"
            ? "Completed — status, payment, and method are locked."
            : order?.status === "cancelled"
              ? order.paymentStatus === "refund_pending"
                ? "This order is cancelled. Cash/bank refunds need follow-up."
                : order.paymentStatus === "refunded"
                  ? (order.refundToWalletAmount || 0) > 0
                    ? "This order is cancelled. Paid remainder was refunded to store credit."
                    : "This order is cancelled. Paid remainder was marked refunded outside the system."
                  : "This order is cancelled."
              : canUpdate
                ? "View and update this order. Completing locks status and payment."
                : "View this order. You do not have permission to edit."
        }
        action={
          <Button type="button" variant="outline" onClick={() => navigate(MODULE_PATH)}>
            <ArrowLeft className="size-4" />
            Back to orders
          </Button>
        }
      >
        <PageAlerts error={error} message={message} />

        {!loading && order && paymentLinkLoading && !checkoutUrl ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              Loading card payment link…
            </CardContent>
          </Card>
        ) : null}

        {!loading && order && checkoutUrl ? (
          <StripePaymentLinkPanel
            checkoutUrl={checkoutUrl}
            orderNumber={order.orderNumber}
            amountLabel={`Amount due: ${formatMoney(order.total, currencyFromGroup(order.businessGroup))}`}
          />
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading order...</p>
        ) : !order ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Order not found.
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {order.status === "completed" ? (
              <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <CardContent className="pt-4 text-sm">
                  This order is <span className="font-medium">Completed</span> — status, payment
                  status, and payment method are locked.
                </CardContent>
              </Card>
            ) : null}

            {showCancelRefundBanner ? (
              <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20">
                <CardHeader className="border-b border-amber-200/80 dark:border-amber-900/40">
                  <CardTitle className="text-base">Cancellation & refunds</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm">
                  <ul className="text-muted-foreground list-disc space-y-1.5 pl-4">
                    {(order.walletApplied || 0) > 0 ? (
                      <li>
                        Store credit restored:{" "}
                        <span className="text-foreground font-medium">
                          {formatMoney(
                            order.walletApplied || 0,
                            currencyFromGroup(order.businessGroup)
                          )}
                        </span>
                      </li>
                    ) : null}
                    {(order.pointsRedeemed || 0) > 0 ? (
                      <li>
                        Loyalty points restored:{" "}
                        <span className="text-foreground font-medium">
                          {order.pointsRedeemed}
                        </span>
                      </li>
                    ) : null}
                    {order.paymentStatus === "refund_pending" ? (
                      <li>
                        {order.paymentMethod === "stripe" ? "Card" : "Cash/bank"} payment of{" "}
                        <span className="text-foreground font-medium">
                          {formatMoney(order.total, currencyFromGroup(order.businessGroup))}
                        </span>{" "}
                        was collected and is <strong>not</strong> auto-refunded.
                        {order.paymentMethod === "stripe"
                          ? " Refund via Stripe below, credit the customer wallet, or mark refunded if you already returned the money."
                          : " Refund outside the system, or use Refund to wallet below."}
                      </li>
                    ) : null}
                    {order.paymentStatus === "refunded" ? (
                      (order.refundToWalletAmount || 0) > 0 ? (
                        <li>
                          Paid remainder{" "}
                          <span className="text-foreground font-medium">
                            {formatMoney(
                              order.refundToWalletAmount,
                              currencyFromGroup(order.businessGroup)
                            )}
                          </span>{" "}
                          was credited to the customer’s store credit.
                        </li>
                      ) : (
                        <li>
                          Paid remainder{" "}
                          <span className="text-foreground font-medium">
                            {formatMoney(order.total, currencyFromGroup(order.businessGroup))}
                          </span>{" "}
                          was marked refunded outside the system.
                        </li>
                      )
                    ) : null}
                  </ul>
                  {canUpdate && order.paymentStatus === "refund_pending" && order.total > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {order.paymentMethod === "stripe" ? (
                        <PermissionButton
                          modulePath={MODULE_PATH}
                          action="update"
                          type="button"
                          disabled={refundingStripe}
                          onClick={handleRefundStripe}
                        >
                          {refundingStripe
                            ? "Refunding..."
                            : `Refund ${formatMoney(order.total, currencyFromGroup(order.businessGroup))} via Stripe`}
                        </PermissionButton>
                      ) : null}
                      <PermissionButton
                        modulePath={MODULE_PATH}
                        action="update"
                        type="button"
                        variant="outline"
                        disabled={refunding}
                        onClick={handleRefundToWallet}
                      >
                        {refunding
                          ? "Refunding..."
                          : `Refund ${formatMoney(order.total, currencyFromGroup(order.businessGroup))} to wallet`}
                      </PermissionButton>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] lg:items-start">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="border-b">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle>Order overview</CardTitle>
                      <Badge variant={statusBadgeVariant(order.status)}>
                        {orderStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Customer
                      </p>
                      <p className="mt-1 font-medium">{customerName(order)}</p>
                      {customerContact(order) ? (
                        <p className="text-muted-foreground mt-0.5 text-sm">
                          {customerContact(order)}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Group
                      </p>
                      <p className="mt-1 font-medium">
                        {getBusinessDisplayName(order.businessGroup)}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        {order.source === "customer_app" ? "Placed from app" : "Placed by admin"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Business
                      </p>
                      <p className="mt-1 font-medium">{orderBranchName || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Placed
                      </p>
                      <p className="mt-1 font-medium">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Payment
                      </p>
                      <p className="mt-1 font-medium">{paymentStatusLabel(order.paymentStatus)}</p>
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        {paymentMethodLabel(order.paymentMethod)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle>Items ({order.items.length})</CardTitle>
                      <p className="text-sm font-semibold">
                        {formatMoney(order.total, currencyFromGroup(order.businessGroup))}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 sm:p-6">
                    {order.items.map((item) => (
                      <div
                        key={item._id || `${item.product}-${item.variation}`}
                        className="flex gap-3 rounded-xl border p-3 sm:gap-4"
                      >
                        <ItemImage path={item.imagePath} alt={item.name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium leading-snug">{item.name}</p>
                              <p className="text-muted-foreground mt-1 text-xs">
                                {[
                                  item.sku ? `SKU ${item.sku}` : null,
                                  item.business
                                    ? getBusinessDisplayName(item.business)
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </p>
                            </div>
                            <p className="shrink-0 font-medium">
                              {formatMoney(item.lineTotal, currencyFromGroup(order.businessGroup))}
                            </p>
                          </div>
                          <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            <span>Qty {item.quantity}</span>
                            <span>
                              {formatMoney(item.unitPrice, currencyFromGroup(order.businessGroup))}{" "}
                              each
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t pt-3 text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">
                        {formatMoney(order.subtotal, currencyFromGroup(order.businessGroup))}
                      </span>
                    </div>
                    {(order.discountAmount || 0) > 0 ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {order.discountType === "percent" && (order.discountValue || 0) > 0
                            ? `Discount (${order.discountValue}%)`
                            : "Discount"}
                        </span>
                        <span className="font-medium">
                          −
                          {formatMoney(
                            order.discountAmount || 0,
                            currencyFromGroup(order.businessGroup)
                          )}
                        </span>
                      </div>
                    ) : null}
                    {(order.pointsDiscount || 0) > 0 ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Points ({order.pointsRedeemed || 0})
                        </span>
                        <span className="font-medium">
                          −
                          {formatMoney(
                            order.pointsDiscount || 0,
                            currencyFromGroup(order.businessGroup)
                          )}
                        </span>
                      </div>
                    ) : null}
                    {(order.walletApplied || 0) > 0 ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Store credit</span>
                        <span className="font-medium">
                          −
                          {formatMoney(
                            order.walletApplied || 0,
                            currencyFromGroup(order.businessGroup)
                          )}
                        </span>
                      </div>
                    ) : null}
                    {(order.pointsEarned || 0) > 0 ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {order.pointsAwarded ? "Points earned" : "Points (when completed)"}
                        </span>
                        <span className="font-medium">+{order.pointsEarned}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Total due</span>
                      <span className="text-base font-semibold">
                        {formatMoney(order.total, currencyFromGroup(order.businessGroup))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4 lg:sticky lg:top-4">
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle>Status & payment</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-4">
                    <EnumSelect
                      id="order-status"
                      label="Status"
                      value={status}
                      onValueChange={(value) => setStatus(value as OrderStatus)}
                      options={statusOptions}
                      required
                      disabled={!canEditStatus}
                      hint={
                        canEditStatus
                          ? "Move among open stages (pending, confirmed, preparing, in transit), complete, or cancel. Completing locks status and payment."
                          : order.status === "completed"
                            ? "Completed — status and payment are locked."
                            : undefined
                      }
                    />
                    <EnumSelect
                      id="order-payment-status"
                      label="Payment status"
                      value={paymentStatus}
                      onValueChange={(value) => {
                        const next = value as OrderPaymentStatus;
                        setPaymentStatus(next);
                        if (next === "paid" && paymentMethod === "unpaid") {
                          setPaymentMethod("cash");
                        }
                      }}
                      options={paymentOptions}
                      required
                      disabled={!canEditPayment}
                      hint={
                        isStripePayment
                          ? "Managed by Stripe — cannot be changed manually."
                          : canEditPayment && order.status !== "cancelled"
                            ? "Unpaid or paid. Completing marks paid and locks this field."
                            : order.status === "completed"
                              ? "Locked on completed orders."
                              : undefined
                      }
                    />
                    <EnumSelect
                      id="order-payment-method"
                      label="Payment method"
                      value={paymentMethod}
                      onValueChange={(value) => setPaymentMethod(value as OrderPaymentMethod)}
                      options={methodOptions}
                      required
                      disabled={!canEditPaymentMethod}
                      hint={
                        isStripePayment
                          ? "Card (Stripe) — locked after the order is created."
                          : canEditPaymentMethod
                            ? "Any method. Completing locks this field."
                            : order.status === "completed"
                              ? "Locked on completed orders."
                              : undefined
                      }
                    />
                  </CardContent>
                </Card>

                {detailFields.length > 0 ? (
                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle>Order fields</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-4">
                      {schemaLoading ? (
                        <p className="text-sm text-muted-foreground">Loading fields...</p>
                      ) : (
                        <DynamicEntityFields
                          fields={schemaFields}
                          values={formValues}
                          onChange={updateFormField}
                          idPrefix="order-detail"
                          disabled={!canEditOrder}
                          surface="detail"
                        />
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {canEditOrder || (canEditPayment && order.status === "cancelled") ? (
                  <PermissionButton
                    modulePath={MODULE_PATH}
                    action="update"
                    type="submit"
                    className="w-full"
                    disabled={saving || schemaLoading}
                  >
                    {saving ? "Saving..." : "Save order"}
                  </PermissionButton>
                ) : null}
              </div>
            </div>
          </form>
        )}
      </PageShell>
    </RequirePermission>
  );
}
