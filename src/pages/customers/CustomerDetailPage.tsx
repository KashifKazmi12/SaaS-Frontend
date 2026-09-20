import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { DynamicEntityFields } from "@/components/entity-fields/DynamicEntityFields";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  DataTable,
  EnumSelect,
  FormField,
  ListPagination,
  PageAlerts,
  PermissionButton,
  textColumn,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { buildEntityPayload, detailEntityFields } from "@/constants/entityFields";
import {
  WALLET_ENTRY_TYPE_OPTIONS,
  walletEntryTypeLabel,
  type WalletEntryType,
} from "@/constants/wallet";
import {
  POINTS_ENTRY_TYPE_OPTIONS,
  pointsEntryTypeLabel,
  type PointsEntryType,
} from "@/constants/loyalty";
import { getBusinessDisplayName } from "@/lib/business";
import { DEFAULT_PAGE_SIZE } from "@/hooks/useListQuery";
import { ORDER_STATUS_OPTIONS, orderPaymentStatusLabel } from "@/lib/listFilters";
import { MODULE_PATHS } from "@/lib/modulePaths";
import { currencyFromGroup, formatMoney } from "@/lib/money";
import type {
  CustomerPointsLedgerEntry,
  CustomerRecord,
  CustomerWalletLedgerEntry,
  EntityFieldDefinition,
  OrderRecord,
  OrderStatus,
} from "@/types";

const MODULE_PATH = MODULE_PATHS.CUSTOMERS;
const ORDERS_PATH = MODULE_PATHS.ORDERS;

function customerFormValues(customer?: CustomerRecord): Record<string, unknown> {
  if (!customer) {
    return { name: "", phone: "", email: "", address: "", notes: "" };
  }

  return {
    name: customer.name || "",
    phone: customer.phone || "",
    email: customer.email || "",
    address: customer.address || "",
    notes: customer.notes || "",
    ...(customer.custom || {}),
  };
}

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

function groupIdFromCustomer(customer: CustomerRecord) {
  if (customer.businessGroup && typeof customer.businessGroup === "object") {
    return customer.businessGroup._id;
  }
  if (typeof customer.businessGroup === "string") return customer.businessGroup;
  return "";
}

function formatSignedMoney(amount: number, currency?: string | null) {
  const value = Number(amount) || 0;
  const formatted = formatMoney(Math.abs(value), currency);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export default function CustomerDetailPage() {
  const { customerId = "" } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const canUpdate = can(MODULE_PATH, "update");
  const canViewOrders = can(ORDERS_PATH, "view");

  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formValues, setFormValues] = useState<Record<string, unknown>>(customerFormValues());
  const [schemaFields, setSchemaFields] = useState<EntityFieldDefinition[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState(DEFAULT_PAGE_SIZE);

  const [ledger, setLedger] = useState<CustomerWalletLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLimit, setLedgerLimit] = useState(DEFAULT_PAGE_SIZE);

  const [walletOpen, setWalletOpen] = useState(false);
  const [walletType, setWalletType] = useState<WalletEntryType>("top_up");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletNote, setWalletNote] = useState("");
  const [walletSaving, setWalletSaving] = useState(false);
  const [walletError, setWalletError] = useState("");

  const [pointsLedger, setPointsLedger] = useState<CustomerPointsLedgerEntry[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsTotal, setPointsTotal] = useState(0);
  const [pointsTotalPages, setPointsTotalPages] = useState(1);
  const [pointsPage, setPointsPage] = useState(1);
  const [pointsLimit, setPointsLimit] = useState(DEFAULT_PAGE_SIZE);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [pointsType, setPointsType] = useState<PointsEntryType>("earn");
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsNote, setPointsNote] = useState("");
  const [pointsSaving, setPointsSaving] = useState(false);
  const [pointsError, setPointsError] = useState("");

  const currency = currencyFromGroup(customer?.businessGroup);
  const walletBalance = Number(customer?.walletBalance) || 0;
  const pointsBalance = Math.max(0, Math.floor(Number(customer?.pointsBalance) || 0));

  const orderColumns = useMemo(
    () => [
      textColumn<OrderRecord>("orderNumber", "Order", (order) => order.orderNumber, {
        primary: true,
      }),
      textColumn<OrderRecord>("placed", "Placed", (order) => formatDateTime(order.createdAt)),
      textColumn<OrderRecord>("total", "Total", (order) =>
        formatMoney(order.total, currencyFromGroup(order.businessGroup))
      ),
      textColumn<OrderRecord>("status", "Status", (order) => (
        <Badge variant={statusBadgeVariant(order.status)}>{orderStatusLabel(order.status)}</Badge>
      )),
      textColumn<OrderRecord>("payment", "Payment", (order) =>
        orderPaymentStatusLabel(order.paymentStatus)
      ),
      textColumn<OrderRecord>("source", "Source", (order) =>
        order.source === "customer_app" ? "App" : "Admin"
      ),
    ],
    []
  );

  const ledgerColumns = useMemo(
    () => [
      textColumn<CustomerWalletLedgerEntry>("when", "When", (entry) =>
        formatDateTime(entry.createdAt)
      ),
      textColumn<CustomerWalletLedgerEntry>("type", "Type", (entry) =>
        walletEntryTypeLabel(entry.type)
      ),
      textColumn<CustomerWalletLedgerEntry>("amount", "Amount", (entry) =>
        formatSignedMoney(entry.amount, currency)
      ),
      textColumn<CustomerWalletLedgerEntry>("balance", "Balance after", (entry) =>
        formatMoney(entry.balanceAfter, currency)
      ),
      textColumn<CustomerWalletLedgerEntry>("note", "Note", (entry) => entry.note || "—"),
      textColumn<CustomerWalletLedgerEntry>("by", "By", (entry) =>
        entry.createdBy && typeof entry.createdBy === "object"
          ? entry.createdBy.name
          : "—"
      ),
    ],
    [currency]
  );

  const pointsColumns = useMemo(
    () => [
      textColumn<CustomerPointsLedgerEntry>("when", "When", (entry) =>
        formatDateTime(entry.createdAt)
      ),
      textColumn<CustomerPointsLedgerEntry>("type", "Type", (entry) =>
        pointsEntryTypeLabel(entry.type)
      ),
      textColumn<CustomerPointsLedgerEntry>("points", "Points", (entry) => {
        const value = Number(entry.points) || 0;
        if (value > 0) return `+${value}`;
        if (value < 0) return String(value);
        return "0";
      }),
      textColumn<CustomerPointsLedgerEntry>("balance", "Balance after", (entry) =>
        String(entry.balanceAfter)
      ),
      textColumn<CustomerPointsLedgerEntry>("note", "Note", (entry) => entry.note || "—"),
      textColumn<CustomerPointsLedgerEntry>("by", "By", (entry) =>
        entry.createdBy && typeof entry.createdBy === "object" ? entry.createdBy.name : "—"
      ),
    ],
    []
  );

  async function loadCustomer() {
    if (!customerId) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.getCustomer(customerId);
      setCustomer(data);
      setFormValues(customerFormValues(data));
    } catch (err) {
      setCustomer(null);
      setError(err instanceof Error ? err.message : "Unable to load customer.");
    } finally {
      setLoading(false);
    }
  }

  async function loadOrders() {
    if (!customerId) return;
    setOrdersLoading(true);
    try {
      const data = await api.getCustomerOrders(customerId, {
        page: ordersPage,
        limit: ordersLimit,
      });
      setOrders(data.items);
      setOrdersTotal(data.total);
      setOrdersTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && ordersPage > 1) {
        setOrdersPage(Math.max(1, data.totalPages));
      }
    } catch (err) {
      setOrders([]);
      setOrdersTotal(0);
      setOrdersTotalPages(1);
      setError(err instanceof Error ? err.message : "Unable to load order history.");
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadLedger() {
    if (!customerId) return;
    setLedgerLoading(true);
    try {
      const data = await api.getCustomerWalletLedger(customerId, {
        page: ledgerPage,
        limit: ledgerLimit,
      });
      setLedger(data.items);
      setLedgerTotal(data.total);
      setLedgerTotalPages(data.totalPages);
      setCustomer((current) =>
        current ? { ...current, walletBalance: data.walletBalance } : current
      );
      if (data.items.length === 0 && data.total > 0 && ledgerPage > 1) {
        setLedgerPage(Math.max(1, data.totalPages));
      }
    } catch (err) {
      setLedger([]);
      setLedgerTotal(0);
      setLedgerTotalPages(1);
      setError(err instanceof Error ? err.message : "Unable to load wallet history.");
    } finally {
      setLedgerLoading(false);
    }
  }

  async function loadPointsLedger() {
    if (!customerId) return;
    setPointsLoading(true);
    try {
      const data = await api.getCustomerPointsLedger(customerId, {
        page: pointsPage,
        limit: pointsLimit,
      });
      setPointsLedger(data.items);
      setPointsTotal(data.total);
      setPointsTotalPages(data.totalPages);
      setCustomer((current) =>
        current ? { ...current, pointsBalance: data.pointsBalance } : current
      );
      if (data.items.length === 0 && data.total > 0 && pointsPage > 1) {
        setPointsPage(Math.max(1, data.totalPages));
      }
    } catch (err) {
      setPointsLedger([]);
      setPointsTotal(0);
      setPointsTotalPages(1);
      setError(err instanceof Error ? err.message : "Unable to load points history.");
    } finally {
      setPointsLoading(false);
    }
  }

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  useEffect(() => {
    loadOrders();
  }, [customerId, ordersPage, ordersLimit]);

  useEffect(() => {
    loadLedger();
  }, [customerId, ledgerPage, ledgerLimit]);

  useEffect(() => {
    loadPointsLedger();
  }, [customerId, pointsPage, pointsLimit]);

  useEffect(() => {
    if (!customer) {
      setSchemaFields([]);
      return;
    }

    const groupId = groupIdFromCustomer(customer);
    if (!groupId) return;

    let cancelled = false;
    setSchemaLoading(true);
    api
      .getCustomerSchema(groupId)
      .then((data) => {
        if (!cancelled) setSchemaFields(data.fields);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load customer fields.");
          setSchemaFields([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customer?._id]);

  function updateField(key: string, value: unknown) {
    if (!canUpdate) return;
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!customer || !canUpdate || schemaLoading) return;

    const phone = String(formValues.phone || "").trim();
    const email = String(formValues.email || "").trim();
    if (!phone && !email) {
      setError("Enter a phone number or email.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = buildEntityPayload("customer", formValues, schemaFields);
      const updated = await api.updateCustomer(customer._id, {
        ...payload,
        isActive: customer.isActive,
      });
      setCustomer(updated);
      setFormValues(customerFormValues(updated));
      setMessage("Customer saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save customer.");
    } finally {
      setSaving(false);
    }
  }

  function openWalletDialog(type: WalletEntryType = "top_up") {
    setWalletType(type);
    setWalletAmount("");
    setWalletNote("");
    setWalletError("");
    setWalletOpen(true);
  }

  async function handleWalletSubmit(event: FormEvent) {
    event.preventDefault();
    if (!customer || !canUpdate) return;

    const amount = Number(walletAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      setWalletError("Enter a non-zero amount.");
      return;
    }

    setWalletSaving(true);
    setWalletError("");
    try {
      const result = await api.applyCustomerWallet(customer._id, {
        type: walletType,
        amount,
        note: walletNote.trim(),
      });
      setCustomer((current) =>
        current ? { ...current, walletBalance: result.walletBalance } : current
      );
      setWalletOpen(false);
      setMessage("Wallet updated.");
      if (ledgerPage !== 1) setLedgerPage(1);
      else await loadLedger();
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Unable to update wallet.");
    } finally {
      setWalletSaving(false);
    }
  }

  function openPointsDialog(type: PointsEntryType = "earn") {
    setPointsType(type);
    setPointsAmount("");
    setPointsNote("");
    setPointsError("");
    setPointsOpen(true);
  }

  async function handlePointsSubmit(event: FormEvent) {
    event.preventDefault();
    if (!customer || !canUpdate) return;

    const points = Number(pointsAmount);
    if (!Number.isFinite(points) || points === 0) {
      setPointsError("Enter a non-zero points amount.");
      return;
    }

    setPointsSaving(true);
    setPointsError("");
    try {
      const result = await api.applyCustomerPoints(customer._id, {
        type: pointsType,
        points,
        note: pointsNote.trim(),
      });
      setCustomer((current) =>
        current ? { ...current, pointsBalance: result.pointsBalance } : current
      );
      setPointsOpen(false);
      setMessage("Points updated.");
      if (pointsPage !== 1) setPointsPage(1);
      else await loadPointsLedger();
    } catch (err) {
      setPointsError(err instanceof Error ? err.message : "Unable to update points.");
    } finally {
      setPointsSaving(false);
    }
  }

  const detailFields = detailEntityFields(schemaFields);
  const groupName = customer ? getBusinessDisplayName(customer.businessGroup) : "";
  const amountHint =
    walletType === "adjust"
      ? "Use a positive amount to add, or negative to subtract."
      : walletType === "redeem"
        ? "Amount to take from the wallet."
        : "Amount to add to the wallet.";
  const pointsHint =
    pointsType === "adjust"
      ? "Use a positive number to add, or negative to subtract."
      : pointsType === "redeem"
        ? "Points to take from the balance."
        : "Points to add to the balance.";

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell
        title={customer ? customer.name : "Customer"}
        description={
          canUpdate
            ? "View customer details, wallet, points, and order history."
            : "View this customer. You do not have permission to edit."
        }
        action={
          <Button type="button" variant="outline" onClick={() => navigate(MODULE_PATH)}>
            <ArrowLeft className="size-4" />
            Back to customers
          </Button>
        }
      >
        <PageAlerts error={error} message={message} />

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading customer...</p>
        ) : !customer ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Customer not found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-start">
                <Card>
                  <CardHeader className="border-b">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle>Profile</CardTitle>
                      <Badge variant={customer.isActive ? "default" : "secondary"}>
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Business group
                      </p>
                      <p className="mt-1 font-medium">{groupName || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Contact
                      </p>
                      <p className="mt-1 font-medium">
                        {[customer.phone, customer.email].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>

                    {schemaLoading ? (
                      <p className="text-muted-foreground text-sm sm:col-span-2">
                        Loading fields...
                      </p>
                    ) : detailFields.length > 0 ? (
                      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                        <DynamicEntityFields
                          fields={schemaFields}
                          values={formValues}
                          onChange={updateField}
                          idPrefix="customer-detail"
                          disabled={!canUpdate}
                          surface="detail"
                        />
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm sm:col-span-2">
                        No fields available for this group.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-4 lg:sticky lg:top-4">
                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Wallet</span>
                        <span className="font-medium">{formatMoney(walletBalance, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Points</span>
                        <span className="font-medium">{pointsBalance}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Orders</span>
                        <span className="font-medium">{ordersTotal}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Group</span>
                        <span className="font-medium text-right">{groupName || "—"}</span>
                      </div>
                      {canUpdate ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openWalletDialog("top_up")}
                            >
                              Add credit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openWalletDialog("adjust")}
                            >
                              Adjust wallet
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openWalletDialog("redeem")}
                            >
                              Redeem credit
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openPointsDialog("earn")}
                            >
                              Earn points
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openPointsDialog("adjust")}
                            >
                              Adjust points
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openPointsDialog("redeem")}
                            >
                              Redeem points
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>

                  {canUpdate ? (
                    <PermissionButton
                      modulePath={MODULE_PATH}
                      action="update"
                      type="submit"
                      className="w-full"
                      disabled={saving || schemaLoading}
                    >
                      {saving ? "Saving..." : "Save customer"}
                    </PermissionButton>
                  ) : null}
                </div>
              </div>
            </form>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>Wallet history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {ledgerLoading ? (
                  <DataTable
                    columns={ledgerColumns}
                    data={ledger}
                    getRowId={(entry) => entry._id}
                    loading
                  />
                ) : ledger.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No wallet activity yet.</p>
                ) : (
                  <>
                    <DataTable
                      columns={ledgerColumns}
                      data={ledger}
                      getRowId={(entry) => entry._id}
                    />
                    <ListPagination
                      page={ledgerPage}
                      limit={ledgerLimit}
                      total={ledgerTotal}
                      totalPages={ledgerTotalPages}
                      onPageChange={setLedgerPage}
                      onLimitChange={(limit) => {
                        setLedgerLimit(limit);
                        setLedgerPage(1);
                      }}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>Points history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {pointsLoading ? (
                  <DataTable
                    columns={pointsColumns}
                    data={pointsLedger}
                    getRowId={(entry) => entry._id}
                    loading
                  />
                ) : pointsLedger.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No points activity yet.</p>
                ) : (
                  <>
                    <DataTable
                      columns={pointsColumns}
                      data={pointsLedger}
                      getRowId={(entry) => entry._id}
                    />
                    <ListPagination
                      page={pointsPage}
                      limit={pointsLimit}
                      total={pointsTotal}
                      totalPages={pointsTotalPages}
                      onPageChange={setPointsPage}
                      onLimitChange={(limit) => {
                        setPointsLimit(limit);
                        setPointsPage(1);
                      }}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>Order history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {ordersLoading ? (
                  <DataTable
                    columns={orderColumns}
                    data={orders}
                    getRowId={(order) => order._id}
                    loading
                  />
                ) : orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders yet for this customer.</p>
                ) : (
                  <>
                    <DataTable
                      columns={orderColumns}
                      data={orders}
                      getRowId={(order) => order._id}
                      rowActions={
                        canViewOrders
                          ? {
                              modulePath: ORDERS_PATH,
                              onView: (order) => navigate(`${ORDERS_PATH}/${order._id}`),
                              showEdit: false,
                              showDelete: false,
                            }
                          : undefined
                      }
                    />
                    <ListPagination
                      page={ordersPage}
                      limit={ordersLimit}
                      total={ordersTotal}
                      totalPages={ordersTotalPages}
                      onPageChange={setOrdersPage}
                      onLimitChange={(limit) => {
                        setOrdersLimit(limit);
                        setOrdersPage(1);
                      }}
                    />
                  </>
                )}
                {!canViewOrders && orders.length > 0 ? (
                  <p className="text-muted-foreground text-xs">
                    You can see order history here. Open Orders module permission is needed to open
                    an order.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update wallet</DialogTitle>
              <DialogDescription>
                Balance is in {currency}. Current balance: {formatMoney(walletBalance, currency)}.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleWalletSubmit}>
              <PageAlerts error={walletError} />
              <EnumSelect
                id="wallet-type"
                label="Action"
                value={walletType}
                onValueChange={(value) => setWalletType(value as WalletEntryType)}
                options={[...WALLET_ENTRY_TYPE_OPTIONS]}
                required
              />
              <div className="space-y-2">
                <FormField
                  id="wallet-amount"
                  type="number"
                  label="Amount"
                  value={walletAmount}
                  onChange={(event) => setWalletAmount(event.target.value)}
                  step="0.01"
                  required
                />
                <p className="text-muted-foreground text-xs">{amountHint}</p>
              </div>
              <FormField
                id="wallet-note"
                label="Note"
                value={walletNote}
                onChange={(event) => setWalletNote(event.target.value)}
                placeholder="Optional"
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setWalletOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={walletSaving}>
                  {walletSaving ? "Saving..." : "Apply"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={pointsOpen} onOpenChange={setPointsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update points</DialogTitle>
              <DialogDescription>
                Current balance: {pointsBalance} points. 100 points = {formatMoney(1, currency)}.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handlePointsSubmit}>
              <PageAlerts error={pointsError} />
              <EnumSelect
                id="points-type"
                label="Action"
                value={pointsType}
                onValueChange={(value) => setPointsType(value as PointsEntryType)}
                options={[...POINTS_ENTRY_TYPE_OPTIONS]}
                required
              />
              <div className="space-y-2">
                <FormField
                  id="points-amount"
                  type="number"
                  label="Points"
                  value={pointsAmount}
                  onChange={(event) => setPointsAmount(event.target.value)}
                  step="1"
                  required
                />
                <p className="text-muted-foreground text-xs">{pointsHint}</p>
              </div>
              <FormField
                id="points-note"
                label="Note"
                value={pointsNote}
                onChange={(event) => setPointsNote(event.target.value)}
                placeholder="Optional"
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPointsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pointsSaving}>
                  {pointsSaving ? "Saving..." : "Apply"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageShell>
    </RequirePermission>
  );
}
