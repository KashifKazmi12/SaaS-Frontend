import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  DataTableCard,
  FilterSelect,
  ListFilters,
  ListPagination,
  PageAlerts,
  textColumn,
} from "@/components/shared";
import { useBusinessOptions, useBusinessVisibility } from "@/hooks/useBusinessOptions";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useListQuery } from "@/hooks/useListQuery";
import { getBusinessDisplayName } from "@/lib/business";
import { ALL_FILTER } from "@/lib/listFilters";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { ActivityLogRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.ACTIVITY_LOG;

const ACTION_FILTER_OPTIONS = [
  { value: ALL_FILTER, label: "All actions" },
  { value: "stock.update", label: "Stock update" },
];

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatStockChange(row: ActivityLogRecord) {
  const before = row.meta?.before as { quantity?: number; minStock?: number } | undefined;
  const after = row.meta?.after as { quantity?: number; minStock?: number } | undefined;
  if (!before || !after) return "—";

  const parts: string[] = [];
  if (before.quantity !== after.quantity) {
    parts.push(`Qty ${before.quantity ?? 0} → ${after.quantity ?? 0}`);
  }
  if (before.minStock !== after.minStock) {
    parts.push(`Min ${before.minStock ?? 0} → ${after.minStock ?? 0}`);
  }
  return parts.length ? parts.join(" · ") : "—";
}

function actionLabel(action: string) {
  if (action === "stock.update") return "Stock update";
  return action || "—";
}

export default function ActivityLogPage() {
  const { isSuperAdmin, showBusinessColumn } = useBusinessVisibility();
  const crud = useCrudPage<ActivityLogRecord>();
  const list = useListQuery();
  const [items, setItems] = useState<ActivityLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { options: businessOptions } = useBusinessOptions(isSuperAdmin ? "all" : "assigned");

  const actionFilter = list.getFilter("action");
  const hasFilters = Boolean(
    list.searchInput.trim() ||
      (list.getFilter("businessId") && list.getFilter("businessId") !== ALL_FILTER) ||
      (actionFilter && actionFilter !== ALL_FILTER)
  );

  const columns = useMemo(
    () => [
      textColumn<ActivityLogRecord>("createdAt", "When", (row) => formatWhen(row.createdAt)),
      textColumn<ActivityLogRecord>("action", "Action", (row) => actionLabel(row.action)),
      textColumn<ActivityLogRecord>("summary", "Summary", (row) => row.summary, { primary: true }),
      textColumn<ActivityLogRecord>("change", "Change", formatStockChange),
      textColumn<ActivityLogRecord>("actor", "User", (row) => row.actorName || "—"),
      ...(showBusinessColumn
        ? [
            textColumn<ActivityLogRecord>("business", "Business", (row) =>
              getBusinessDisplayName(row.business)
            ),
          ]
        : []),
    ],
    [showBusinessColumn]
  );

  async function loadItems() {
    await crud.runLoad(async () => {
      const data = await api.getActivityLog(list.params);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && list.page > 1) {
        list.setPage(Math.max(1, data.totalPages));
      }
    }, "Unable to load the activity log.");
  }

  useEffect(() => {
    loadItems();
  }, [list.params]);

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell>
        <PageAlerts error={crud.error} message={crud.message} />
        <DataTableCard
          title="Activity Log"
          modulePath={MODULE_PATH}
          columns={columns}
          data={items}
          getRowId={(row) => row._id}
          loading={crud.loading}
          empty={items.length === 0}
          emptyMessage={
            hasFilters ? "No activity matches your filters." : "No activity recorded yet."
          }
          loadingMessage="Loading activity log..."
          filters={
            <ListFilters
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              searchPlaceholder="Search activity..."
              activeCount={list.activeCount}
              onClear={list.clearFilters}
            >
              {showBusinessColumn && (
                <FilterSelect
                  value={list.getFilter("businessId")}
                  onValueChange={(value) => list.setFilter("businessId", value)}
                  options={[
                    { value: ALL_FILTER, label: "All businesses" },
                    ...businessOptions.map((option) => ({
                      value: option.id,
                      label: option.name,
                    })),
                  ]}
                />
              )}
              <FilterSelect
                id="activity-log-action"
                value={actionFilter}
                onValueChange={(value) => list.setFilter("action", value)}
                options={ACTION_FILTER_OPTIONS}
                placeholder="All actions"
              />
            </ListFilters>
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
