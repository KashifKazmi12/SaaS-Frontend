import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, PackageCheck } from "lucide-react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  DataTableCard,
  FilterSelect,
  ListFilters,
  ListPagination,
  PageAlerts,
  PermissionIconButton,
  textColumn,
  useConfirm,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useCrudPage } from "@/hooks/useCrudPage";
import { resolveListBusinessId, useListSchemaFields } from "@/hooks/useListSchemaFields";
import { useListQuery } from "@/hooks/useListQuery";
import { getBusinessDisplayName } from "@/lib/business";
import {
  formatCustomListValue,
  isEntityRootKey,
} from "@/constants/entityFields";
import {
  ALL_FILTER,
  ORDER_PAYMENT_FILTER_OPTIONS,
  ORDER_STATUS_OPTIONS,
  ORDER_STATUS_TABS,
  orderPaymentStatusLabel,
} from "@/lib/listFilters";
import { isOpenOrderStatus } from "@/constants/orders";
import { MODULE_PATHS } from "@/lib/modulePaths";
import { currencyFromGroup, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { OrderRecord, OrderStatus } from "@/types";

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

function customerLabel(order: OrderRecord) {
  return getBusinessDisplayName(order.customer as { _id: string; name: string } | string);
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const { can, user } = useAuth();
  const crud = useCrudPage<OrderRecord>();
  const { confirm } = useConfirm();
  const list = useListQuery();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const groupOptions = user?.businessGroups ?? [];
  const [quickUpdatingId, setQuickUpdatingId] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const canUpdate = can(MODULE_PATH, "update");
  const showGroupFilter = groupOptions.length > 1;
  const orderStatusTab = list.getFilter("orderStatus");
  const listGroupId = resolveListBusinessId(
    list.getFilter("groupId"),
    groupOptions.length === 1 ? groupOptions[0].id : undefined
  );
  const listSchemaFields = useListSchemaFields("order", listGroupId, {
    includeRootKeys: true,
  });

  const columns = useMemo(
    () => [
      textColumn<OrderRecord>("orderNumber", "Order", (order) => order.orderNumber, {
        primary: true,
      }),
      textColumn<OrderRecord>("customer", "Customer", (order) => customerLabel(order)),
      ...(showGroupFilter
        ? [
            textColumn<OrderRecord>("group", "Group", (order) =>
              getBusinessDisplayName(order.businessGroup)
            ),
          ]
        : []),
      textColumn<OrderRecord>("total", "Total", (order) =>
        formatMoney(order.total, currencyFromGroup(order.businessGroup))
      ),
      textColumn<OrderRecord>("status", "Status", (order) => (
        <Badge variant={statusBadgeVariant(order.status)}>{orderStatusLabel(order.status)}</Badge>
      )),
      textColumn<OrderRecord>("payment", "Payment", (order) =>
        orderPaymentStatusLabel(order.paymentStatus)
      ),
      textColumn<OrderRecord>("placed", "Placed", (order) => formatDateTime(order.createdAt)),
      ...(listGroupId
        ? listSchemaFields.map((field) =>
            textColumn<OrderRecord>(
              `schema-${field.key}`,
              field.label,
              (order) =>
                formatCustomListValue(
                  isEntityRootKey("order", field.key)
                    ? (order as unknown as Record<string, unknown>)[field.key]
                    : order.custom?.[field.key],
                  field
                )
            )
          )
        : []),
    ],
    [listSchemaFields, listGroupId, showGroupFilter]
  );

  async function loadOrders() {
    await crud.runLoad(async () => {
      const data = await api.getOrders(list.params);
      setOrders(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && list.page > 1) {
        list.setPage(Math.max(1, data.totalPages));
      }
    }, "Unable to load orders.");
  }

  useEffect(() => {
    loadOrders();
  }, [list.params]);

  async function handleQuickStatus(order: OrderRecord, nextStatus: OrderStatus) {
    const payload: Record<string, unknown> = { status: nextStatus };
    let successMessage = `Order marked ${orderStatusLabel(nextStatus).toLowerCase()}.`;

    if (
      nextStatus === "completed" &&
      order.paymentStatus === "unpaid" &&
      order.total > 0 &&
      order.paymentMethod !== "stripe"
    ) {
      const confirmed = await confirm({
        title: "Confirm payment before completing?",
        description:
          "Please confirm this order’s remaining payment is paid, then it will be marked completed.",
        confirmLabel: "Mark paid & completed",
        cancelLabel: "Go back",
      });
      if (!confirmed) return;
      payload.paymentStatus = "paid";
      if (order.paymentMethod === "unpaid") {
        payload.paymentMethod = "cash";
      }
      successMessage = "Order marked paid and completed.";
    }

    setQuickUpdatingId(order._id);
    await crud.runMutation(
      async () => {
        await api.updateOrder(order._id, payload);
      },
      {
        successMessage,
        closeDialog: false,
        reload: loadOrders,
        fallbackError: "Unable to update order.",
      }
    );
    setQuickUpdatingId("");
  }

  function orderQuickActions(order: OrderRecord): ReactNode {
    if (!canUpdate) return null;
    const busy = quickUpdatingId === order._id;

    if (order.status === "pending") {
      return (
        <PermissionIconButton
          modulePath={MODULE_PATH}
          action="update"
          label="Confirm"
          variant="outline"
          size="icon-sm"
          disabled={busy}
          icon={<Check className="size-3.5" />}
          onClick={() => handleQuickStatus(order, "confirmed")}
        />
      );
    }

    if (isOpenOrderStatus(order.status)) {
      return (
        <PermissionIconButton
          modulePath={MODULE_PATH}
          action="update"
          label="Complete"
          variant="outline"
          size="icon-sm"
          disabled={busy}
          icon={<PackageCheck className="size-3.5" />}
          onClick={() => handleQuickStatus(order, "completed")}
        />
      );
    }

    return null;
  }

  async function handleDelete(order: OrderRecord) {
    await crud.runDelete(
      order.orderNumber,
      async () => {
        await api.deleteOrder(order._id);
      },
      {
        successMessage: "Order removed.",
        reload: loadOrders,
        fallbackError: "Unable to remove order.",
      }
    );
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="Create and manage orders across your businesses.">
        <PageAlerts error={crud.error} message={crud.message} />

        <DataTableCard
          title="Orders"
          modulePath={MODULE_PATH}
          columns={columns}
          data={orders}
          getRowId={(order) => order._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onView: (order) => navigate(`${MODULE_PATH}/${order._id}`),
            onDelete: handleDelete,
            hideDelete: (order) =>
              order.status === "completed" || order.status === "cancelled",
            extraActions: orderQuickActions,
          }}
          loading={crud.loading}
          loadingMessage="Loading orders..."
          empty={!crud.loading && orders.length === 0}
          emptyMessage={
            list.activeCount > 0 ? "No orders match your filters." : "No orders yet."
          }
          createLabel="Create order"
          onCreate={() => navigate(`${MODULE_PATH}/new`)}
          filters={
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {ORDER_STATUS_TABS.map((tab) => {
                  const active = orderStatusTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => list.setFilter("orderStatus", tab.value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <ListFilters
                search={list.searchInput}
                onSearchChange={list.setSearchInput}
                searchPlaceholder="Search orders..."
                activeCount={list.activeCount}
                onClear={list.clearFilters}
              >
                {showGroupFilter ? (
                  <FilterSelect
                    value={list.getFilter("groupId")}
                    onValueChange={(value) => list.setFilter("groupId", value)}
                    options={[
                      { value: ALL_FILTER, label: "All groups" },
                      ...groupOptions.map((option) => ({
                        value: option.id,
                        label: option.name,
                      })),
                    ]}
                  />
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMoreFilters((open) => !open)}
                >
                  {showMoreFilters ? "Fewer filters" : "More filters"}
                </Button>
                {showMoreFilters ? (
                  <FilterSelect
                    value={list.getFilter("paymentStatus")}
                    onValueChange={(value) => list.setFilter("paymentStatus", value)}
                    options={ORDER_PAYMENT_FILTER_OPTIONS}
                  />
                ) : null}
              </ListFilters>
            </div>
          }
          pagination={
            <ListPagination
              page={list.page}
              limit={list.limit}
              total={total}
              totalPages={totalPages}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
            />
          }
        />
      </PageShell>
    </RequirePermission>
  );
}
