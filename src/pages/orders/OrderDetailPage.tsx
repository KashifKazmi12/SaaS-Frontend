import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, History, ImageIcon, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { DynamicEntityFields } from "@/components/entity-fields/DynamicEntityFields";
import { OrderCreateSuccessDialog } from "@/components/orders/OrderCreateSuccessDialog";
import { OrderStaffCodeField } from "@/components/orders/OrderStaffCodeField";
import { StripePaymentLinkPanel } from "@/components/orders/StripePaymentLinkPanel";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  EnumSelect,
  PageAlerts,
  PermissionButton,
  useConfirm,
} from "@/components/shared";
import {
  staffCodePayload,
  useOrderStaffCodeRequired,
  validateOrderStaffCode,
} from "@/hooks/useOrderStaffGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ActivityLogRecord,
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

function orderHistoryActionLabel(action: string, summary?: string) {
  if (action === "order.create") return "Created";
  if (action === "order.update") {
    return summary?.includes("from desktop") ? "Updated (desktop)" : "Updated";
  }
  if (action === "order.refund_wallet") return "Refund to wallet";
  if (action === "order.refund_stripe") return "Refund via Stripe";
  if (action === "order.remove") return "Removed";
  return action || "—";
}

function historyActorName(row: ActivityLogRecord) {
  if (row.actorName) return row.actorName;
  if (row.actor && typeof row.actor === "object" && row.actor.name) return row.actor.name;
  return "System";
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

/** How a refunded order was settled — payment status stays "refunded". */
function refundHowLabel(order: OrderRecord) {
  if (order.paymentStatus !== "refunded") return "";
  if ((order.refundToWalletAmount || 0) > 0) return "Refunded to wallet";
  if (order.paymentMethod === "stripe") return "Refunded via Stripe";
  return "Marked as refunded";
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
          ? (order as unknown as Record<string, unknown>)[field.key]
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
  const { can, user } = useAuth();
  const { confirm } = useConfirm();
  const { isStaffCodeRequired, rememberStaffCodeRequired } = useOrderStaffCodeRequired();
  const canUpdate = can(MODULE_PATH, "update");

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffCodeRequired, setStaffCodeRequired] = useState(false);
  const [staffCode, setStaffCode] = useState("");
  const [staffCodeError, setStaffCodeError] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [refundingStripe, setRefundingStripe] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<ActivityLogRecord[]>([]);
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<OrderPaymentStatus>("unpaid");
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>("unpaid");
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [schemaFields, setSchemaFields] = useState<EntityFieldDefinition[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const pendingCheckoutUrlRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
    setStaffCode("");
    setStaffCodeError("");
    void isStaffCodeRequired(businessId).then((required) => {
      if (cancelled) return;
      setStaffCodeRequired(required);
      rememberStaffCodeRequired(businessId, required);
    });
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
  }, [order?._id, isStaffCodeRequired, rememberStaffCodeRequired]);

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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (!canUpdate || saving || schemaLoading || receiptOpen || !order) return;
      formRef.current?.requestSubmit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUpdate, saving, schemaLoading, receiptOpen, order]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!order || !canUpdate || schemaLoading) return;

    const stripeLocked = order.paymentMethod === "stripe";
    let nextPaymentStatus = paymentStatus;
    let nextPaymentMethod = paymentMethod;

    // Completed / cancelled: use the refund action buttons at the bottom.
    if (order.status === "completed" || order.status === "cancelled") {
      setError(
        "Use the refund actions below: Mark as refunded, Refund to customer wallet, or Refund via Stripe."
      );
      return;
    }

    const businessId = orderBusinessId(order);
    let resolvedStaffCode = "";
    if (staffCodeRequired) {
      setStaffCodeError("");
      try {
        const staff = await validateOrderStaffCode(businessId, staffCode);
        resolvedStaffCode = staff.staffCode;
      } catch (err) {
        setStaffCodeError(err instanceof Error ? err.message : "Invalid staff code.");
        return;
      }
    }

    if (
      !stripeLocked &&
      status === "completed" &&
      paymentStatus === "unpaid" &&
      order.total > 0 &&
      order.status !== "completed"
    ) {
      const result = await confirm({
        title: "Confirm payment before completing?",
        description:
          "Please confirm this order’s remaining payment is paid, then it will be marked completed.",
        confirmLabel: "Mark paid & completed",
        cancelLabel: "Go back",
      });
      if (!result.confirmed) return;
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
        updated = await api.updateOrder(order._id, {
          paymentStatus: nextPaymentStatus,
          ...staffCodePayload(resolvedStaffCode),
        });
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
          ...staffCodePayload(resolvedStaffCode),
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
    const amount = formatMoney(order.total, currencyFromGroup(order.businessGroup));
    const businessId = orderBusinessId(order);
    const result = await confirm({
      title: "Refund to customer wallet?",
      description: `This credits ${amount} to the customer’s store wallet and marks the order as refunded. Use this when the customer wants store credit instead of cash or a bank transfer.`,
      confirmLabel: "Refund to customer wallet",
      cancelLabel: "Cancel",
      staffCodeBusinessId: staffCodeRequired ? businessId : undefined,
    });
    if (!result.confirmed) return;
    setRefunding(true);
    setError("");
    setMessage("");
    try {
      const updated = await api.refundOrderToWallet(
        order._id,
        staffCodePayload(result.staffCode)
      );
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

  /** Mark refunded after cash/bank/transfer outside the system — no wallet credit. */
  async function handleMarkRefundedOutside() {
    if (!order || !canUpdate) return;
    const amount = formatMoney(order.total, currencyFromGroup(order.businessGroup));
    const businessId = orderBusinessId(order);
    const result = await confirm({
      title: "Mark as refunded?",
      description: `Confirm you already returned ${amount} to the customer by cash, bank transfer, or another payout. The order will be marked refunded. No money will be added to their wallet.`,
      confirmLabel: "Mark as refunded",
      cancelLabel: "Cancel",
      staffCodeBusinessId: staffCodeRequired ? businessId : undefined,
    });
    if (!result.confirmed) return;
    setRefunding(true);
    setError("");
    setMessage("");
    try {
      const updated = await api.updateOrder(order._id, {
        paymentStatus: "refunded",
        ...staffCodePayload(result.staffCode),
      });
      applyOrder(updated);
      setMessage("Marked refunded. No wallet credit added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to mark refunded.");
    } finally {
      setRefunding(false);
    }
  }

  async function openHistory() {
    if (!order) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    setError("");
    try {
      const data = await api.getOrderHistory(order._id, { page: 1, limit: 100 });
      setHistoryItems(data.items || []);
    } catch (err) {
      setHistoryItems([]);
      setError(err instanceof Error ? err.message : "Unable to load order history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleRefundStripe() {
    if (!order || !canUpdate) return;
    const amount = formatMoney(order.total, currencyFromGroup(order.businessGroup));
    const businessId = orderBusinessId(order);
    const result = await confirm({
      title: "Refund via Stripe?",
      description: `This refunds ${amount} back to the customer’s card through Stripe and marks the order as refunded.`,
      confirmLabel: "Refund via Stripe",
      cancelLabel: "Cancel",
      staffCodeBusinessId: staffCodeRequired ? businessId : undefined,
    });
    if (!result.confirmed) return;
    setRefundingStripe(true);
    setError("");
    setMessage("");
    try {
      const updated = await api.refundOrderViaStripe(
        order._id,
        staffCodePayload(result.staffCode)
      );
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
  /** Payment editable while open. Completed/cancelled use refund action buttons instead. */
  const canEditPayment =
    canUpdate && order != null && !isStripePayment && canEditOrder;
  const canEditPaymentMethod = canEditOrder && !isStripePayment;
  const showRefundBanner =
    (order?.status === "cancelled" || order?.status === "completed") &&
    (order.paymentStatus === "refund_pending" ||
      order.paymentStatus === "refunded" ||
      (order.paymentStatus === "paid" && order.total > 0) ||
      (order.status === "cancelled" &&
        ((order.walletApplied || 0) > 0 || (order.pointsRedeemed || 0) > 0)));

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
            ? order.paymentStatus === "refund_pending"
              ? "Completed — refund follow-up needed for the collected payment."
              : order.paymentStatus === "refunded"
                ? `Completed — ${refundHowLabel(order) || "Refunded"}.`
                : "Completed — status and method are locked. Refunds are still allowed."
            : order?.status === "cancelled"
              ? order.paymentStatus === "refund_pending"
                ? "This order is cancelled. Cash/bank refunds need follow-up."
                : order.paymentStatus === "refunded"
                  ? `This order is cancelled. ${refundHowLabel(order) || "Refunded"}.`
                  : "This order is cancelled."
              : canUpdate
                ? "View and update this order. Completing locks status; refunds stay available."
                : "View this order. You do not have permission to edit."
        }
        action={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {order ? (
              <>
                <Button type="button" variant="outline" onClick={() => void openHistory()}>
                  <History className="size-4" />
                  View history
                </Button>
                <Button type="button" variant="outline" onClick={() => setReceiptOpen(true)}>
                  <Receipt className="size-4" />
                  View receipt
                </Button>
              </>
            ) : null}
            <Button type="button" variant="outline" onClick={() => navigate(MODULE_PATH)}>
              <ArrowLeft className="size-4" />
              Back to orders
            </Button>
          </div>
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
          <form ref={formRef} onSubmit={handleSave} className="space-y-4">
            {order.status === "completed" &&
            order.paymentStatus !== "refund_pending" &&
            order.paymentStatus !== "refunded" &&
            !(order.paymentStatus === "paid" && order.total > 0) ? (
              <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <CardContent className="pt-4 text-sm">
                  This order is <span className="font-medium">Completed</span> — status and payment
                  method are locked.
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
                        {order.source === "customer_app"
                          ? "Placed from app"
                          : order.source === "desktop"
                            ? "Placed from desktop"
                            : "Placed by admin"}
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
                      {order.paymentStatus === "refunded" && refundHowLabel(order) ? (
                        <p className="text-muted-foreground mt-0.5 text-sm">{refundHowLabel(order)}</p>
                      ) : null}
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        {paymentMethodLabel(order.paymentMethod)}
                      </p>
                    </div>
                    {order.desktopReferenceId ? (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                          Desktop reference
                        </p>
                        <p className="mt-1 font-medium font-mono text-sm">
                          {order.desktopReferenceId}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                          Offline receipt id — searchable for refunds
                        </p>
                      </div>
                    ) : null}
                    {order.source === "desktop" && order.clientMutationId ? (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                          Offline order id
                        </p>
                        <p className="mt-1 break-all font-mono text-sm font-medium">
                          {order.clientMutationId}
                        </p>
                      </div>
                    ) : null}
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
                          ? "Move among open stages (pending, confirmed, preparing, in transit), complete, or cancel. Completing locks status; refunds stay available."
                          : order.status === "completed"
                            ? "Completed — status is locked. Payment refund follow-up is still allowed."
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
                        order.status === "completed" || order.status === "cancelled"
                          ? "Locked — use refund actions below."
                          : isStripePayment
                            ? "Managed by Stripe after payment."
                            : canEditPayment
                              ? "Unpaid or paid. Completing locks status; refunds remain available afterward."
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

                {canEditOrder ||
                (canEditPayment &&
                  (order.status === "cancelled" || order.status === "completed")) ? (
                  <div className="space-y-3">
                    {staffCodeRequired ? (
                      <OrderStaffCodeField
                        id="order-detail-staff-code"
                        value={staffCode}
                        onChange={(value) => {
                          setStaffCode(value);
                          setStaffCodeError("");
                        }}
                        error={staffCodeError}
                        disabled={saving}
                      />
                    ) : null}
                    <PermissionButton
                      modulePath={MODULE_PATH}
                      action="update"
                      type="submit"
                      className="w-full"
                      disabled={
                        saving ||
                        schemaLoading ||
                        (staffCodeRequired && !staffCode.trim())
                      }
                    >
                      {saving ? "Saving..." : "Save order"}
                    </PermissionButton>
                  </div>
                ) : null}
              </div>
            </div>

            {showRefundBanner ? (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-base">Refunds</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm">
                  {(order.walletApplied || 0) > 0 && order.status === "cancelled" ? (
                    <p className="text-muted-foreground">
                      Store credit restored:{" "}
                      <span className="text-foreground font-medium">
                        {formatMoney(
                          order.walletApplied || 0,
                          currencyFromGroup(order.businessGroup)
                        )}
                      </span>
                    </p>
                  ) : null}
                  {(order.pointsRedeemed || 0) > 0 && order.status === "cancelled" ? (
                    <p className="text-muted-foreground">
                      Loyalty points restored:{" "}
                      <span className="text-foreground font-medium">{order.pointsRedeemed}</span>
                    </p>
                  ) : null}
                  {order.paymentStatus === "refunded" && refundHowLabel(order) ? (
                    <p className="text-muted-foreground">{refundHowLabel(order)}</p>
                  ) : null}
                  {canUpdate &&
                  order.total > 0 &&
                  (order.paymentStatus === "refund_pending" ||
                    order.paymentStatus === "paid") ? (
                    <div className="flex flex-wrap gap-2">
                      {order.paymentMethod === "stripe" ? (
                        <PermissionButton
                          modulePath={MODULE_PATH}
                          action="update"
                          type="button"
                          disabled={refundingStripe || refunding}
                          onClick={handleRefundStripe}
                        >
                          {refundingStripe ? "Refunding..." : "Refund via Stripe"}
                        </PermissionButton>
                      ) : null}
                      <PermissionButton
                        modulePath={MODULE_PATH}
                        action="update"
                        type="button"
                        variant="outline"
                        disabled={refunding || refundingStripe}
                        onClick={handleMarkRefundedOutside}
                      >
                        {refunding ? "Saving..." : "Mark as refunded"}
                      </PermissionButton>
                      <PermissionButton
                        modulePath={MODULE_PATH}
                        action="update"
                        type="button"
                        variant="outline"
                        disabled={refunding || refundingStripe}
                        onClick={handleRefundToWallet}
                      >
                        {refunding ? "Refunding..." : "Refund to customer wallet"}
                      </PermissionButton>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </form>
        )}

        <OrderCreateSuccessDialog
          open={receiptOpen && Boolean(order)}
          order={order}
          checkoutUrl={checkoutUrl || null}
          businessName={orderBranchName}
          sessionUserName={user?.name || ""}
          variant="receipt"
          showViewDetail={false}
          onAddNew={() => {
            setReceiptOpen(false);
            navigate(`${MODULE_PATH}/new`);
          }}
          onOpenChange={setReceiptOpen}
        />

        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Order history{order ? ` · ${order.orderNumber}` : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[min(60vh,480px)] overflow-y-auto">
              {historyLoading ? (
                <p className="text-muted-foreground text-sm">Loading history…</p>
              ) : historyItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No history yet for this order. New create, update, and refund actions will
                  appear here with the user who performed them.
                </p>
              ) : (
                <ul className="space-y-3">
                  {historyItems.map((row) => (
                    <li
                      key={row._id}
                      className="rounded-lg border px-3 py-2.5 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium">
                            {orderHistoryActionLabel(row.action, row.summary)}
                          </p>
                          <p className="text-muted-foreground break-words">{row.summary}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {historyActorName(row)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs">
                        {formatDateTime(row.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </PageShell>
    </RequirePermission>
  );
}
