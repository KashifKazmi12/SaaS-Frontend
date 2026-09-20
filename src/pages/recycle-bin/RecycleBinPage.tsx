import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
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
import { useCrudPage } from "@/hooks/useCrudPage";
import { useListQuery } from "@/hooks/useListQuery";
import { ALL_FILTER } from "@/lib/listFilters";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { RecycleBinRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.RECYCLE_BIN;

function formatDeletedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function RecycleBinPage() {
  const crud = useCrudPage<RecycleBinRecord>();
  const list = useListQuery();
  const { confirm } = useConfirm();
  const [items, setItems] = useState<RecycleBinRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [typeOptions, setTypeOptions] = useState<Array<{ value: string; label: string }>>([
    { value: ALL_FILTER, label: "All types" },
  ]);

  const typeFilter = list.getFilter("type");
  const hasFilters = Boolean(list.searchInput.trim() || (typeFilter && typeFilter !== ALL_FILTER));

  const columns = useMemo(
    () => [
      textColumn<RecycleBinRecord>("type", "Type", (row) => row.typeLabel),
      textColumn<RecycleBinRecord>("title", "Name", (row) => row.title, { primary: true }),
      textColumn<RecycleBinRecord>("subtitle", "Details", (row) => row.subtitle || "—"),
      textColumn<RecycleBinRecord>("context", "Location", (row) => row.context || "—"),
      textColumn<RecycleBinRecord>("deletedAt", "Deleted", (row) => formatDeletedAt(row.deletedAt)),
    ],
    []
  );

  async function loadItems() {
    await crud.runLoad(async () => {
      const data = await api.getRecycleBin(list.params);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && list.page > 1) {
        list.setPage(Math.max(1, data.totalPages));
      }
    }, "Unable to load the recycle bin.");
  }

  useEffect(() => {
    loadItems();
  }, [list.params]);

  useEffect(() => {
    api
      .getRecycleBinTypes()
      .then((data) => {
        setTypeOptions([
          { value: ALL_FILTER, label: "All types" },
          ...data.items,
        ]);
      })
      .catch(() => {
        setTypeOptions([{ value: ALL_FILTER, label: "All types" }]);
      });
  }, []);

  async function handleRestore(row: RecycleBinRecord) {
    const confirmed = await confirm({
      title: `Restore ${row.title}?`,
      description: "It will show in the live list again.",
      confirmLabel: "Restore",
    });
    if (!confirmed) return;

    await crud.runMutation(() => api.restoreRecycleBinItem(row.type, row.id).then(() => undefined), {
      successMessage: `${row.typeLabel} restored.`,
      closeDialog: false,
      reload: loadItems,
      fallbackError: "Unable to restore this record.",
    });
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell>
        <PageAlerts error={crud.error} message={crud.message} />
        <DataTableCard
          title="Recycle Bin"
          modulePath={MODULE_PATH}
          columns={columns}
          data={items}
          getRowId={(row) => `${row.type}:${row.id}`}
          loading={crud.loading}
          empty={items.length === 0}
          emptyMessage={
            hasFilters ? "No records match your filters." : "No deleted records."
          }
          loadingMessage="Loading recycle bin..."
          filters={
            <ListFilters
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              searchPlaceholder="Search deleted records..."
              activeCount={list.activeCount}
              onClear={list.clearFilters}
            >
              <FilterSelect
                id="recycle-bin-type"
                value={typeFilter}
                onValueChange={(value) => list.setFilter("type", value)}
                options={typeOptions}
                placeholder="All types"
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
          rowActions={{
            modulePath: MODULE_PATH,
            showView: false,
            showEdit: false,
            extraActions: (row) => (
              <PermissionIconButton
                modulePath={MODULE_PATH}
                action="update"
                label="Restore"
                icon={<RotateCcw className="size-3.5" />}
                onClick={() => handleRestore(row)}
              />
            ),
          }}
        />
      </PageShell>
    </RequirePermission>
  );
}
