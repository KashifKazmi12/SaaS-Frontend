import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBusinessOptions, useBusinessVisibility } from "@/hooks/useBusinessOptions";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useListQuery } from "@/hooks/useListQuery";
import { getBusinessDisplayName } from "@/lib/business";
import { ALL_FILTER } from "@/lib/listFilters";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { StockUpdateBatchRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.STOCK;

const MODE_OPTIONS = [
  { value: ALL_FILTER, label: "All modes" },
  { value: "add", label: "Add stock" },
  { value: "set", label: "Set quantity" },
];

function formatWhen(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatNum(value: number | null | undefined) {
  const n = Number(value) || 0;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatMoney(value: number | null | undefined) {
  const n = Number(value) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function StockUpdateHistoryPage() {
  const navigate = useNavigate();
  const { isSuperAdmin, showBusinessColumn } = useBusinessVisibility();
  const crud = useCrudPage<StockUpdateBatchRecord>();
  const list = useListQuery();
  const [items, setItems] = useState<StockUpdateBatchRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { options: businessOptions } = useBusinessOptions(isSuperAdmin ? "all" : "assigned");

  const hasFilters = Boolean(
    list.searchInput.trim() ||
      (list.getFilter("businessId") && list.getFilter("businessId") !== ALL_FILTER) ||
      (list.getFilter("mode") && list.getFilter("mode") !== ALL_FILTER) ||
      list.getFilter("from", "") ||
      list.getFilter("to", "")
  );

  const columns = useMemo(
    () => [
      textColumn<StockUpdateBatchRecord>("createdAt", "When", (row) => formatWhen(row.createdAt)),
      textColumn<StockUpdateBatchRecord>("batchNumber", "Post #", (row) => row.batchNumber, {
        primary: true,
      }),
      textColumn<StockUpdateBatchRecord>("mode", "Mode", (row) =>
        row.mode === "set" ? "Set quantity" : "Add stock"
      ),
      textColumn<StockUpdateBatchRecord>("lineCount", "Lines", (row) => String(row.lineCount)),
      textColumn<StockUpdateBatchRecord>("totalQuantity", "Qty total", (row) =>
        formatNum(row.totalQuantity)
      ),
      textColumn<StockUpdateBatchRecord>("totalSale", "Sal total", (row) =>
        formatMoney(row.totalSale)
      ),
      textColumn<StockUpdateBatchRecord>("totalCost", "Cost total", (row) =>
        formatMoney(row.totalCost)
      ),
      textColumn<StockUpdateBatchRecord>("postedBy", "Posted by", (row) => row.postedByName || "—"),
      ...(showBusinessColumn
        ? [
            textColumn<StockUpdateBatchRecord>("business", "Business", (row) =>
              getBusinessDisplayName(row.business)
            ),
          ]
        : []),
    ],
    [showBusinessColumn]
  );

  async function loadItems() {
    await crud.runLoad(async () => {
      const data = await api.getStockUpdateBatches(list.params);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && list.page > 1) {
        list.setPage(Math.max(1, data.totalPages));
      }
    }, "Unable to load stock update history.");
  }

  useEffect(() => {
    loadItems();
  }, [list.params]);

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell
        action={
          <Button type="button" variant="outline" onClick={() => navigate("/stock/update")}>
            <ArrowLeft className="size-4" />
            Back to update
          </Button>
        }
      >
        <PageAlerts error={crud.error} message={crud.message} />
        <DataTableCard
          title="Stock update history"
          modulePath={MODULE_PATH}
          columns={columns}
          data={items}
          getRowId={(row) => row._id}
          loading={crud.loading}
          empty={items.length === 0}
          emptyMessage={
            hasFilters ? "No posts match your filters." : "No stock updates posted yet."
          }
          loadingMessage="Loading history..."
          rowActions={{
            modulePath: MODULE_PATH,
            showEdit: false,
            showDelete: false,
            onView: (row) => navigate(`/stock/updates/${row._id}`),
          }}
          filters={
            <ListFilters
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              searchPlaceholder="Search post #, product, user..."
              activeCount={list.activeCount}
              onClear={list.clearFilters}
            >
              {showBusinessColumn ? (
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
              ) : null}
              <FilterSelect
                value={list.getFilter("mode")}
                onValueChange={(value) => list.setFilter("mode", value)}
                options={MODE_OPTIONS}
              />
              <Input
                type="date"
                aria-label="From date"
                value={list.getFilter("from", "")}
                onChange={(event) => list.setFilter("from", event.target.value)}
                className="h-9 w-[11rem]"
              />
              <Input
                type="date"
                aria-label="To date"
                value={list.getFilter("to", "")}
                onChange={(event) => list.setFilter("to", event.target.value)}
                className="h-9 w-[11rem]"
              />
            </ListFilters>
          }
          pagination={
            <ListPagination
              page={list.page}
              totalPages={totalPages}
              total={total}
              limit={list.limit}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
            />
          }
        />
      </PageShell>
    </RequirePermission>
  );
}
