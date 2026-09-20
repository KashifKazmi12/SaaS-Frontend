import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  DataTableCard,
  FilterSelect,
  imageColumn,
  ListFilters,
  ListPagination,
  PageAlerts,
  statusColumn,
  textColumn,
} from "@/components/shared";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useListQuery } from "@/hooks/useListQuery";
import { resolveMediaUrl } from "@/lib/media";
import { STATUS_FILTER_OPTIONS } from "@/lib/listFilters";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { BusinessGroupRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.BUSINESS_GROUPS;

export default function BusinessGroupsPage() {
  const navigate = useNavigate();
  const crud = useCrudPage<BusinessGroupRecord>();
  const list = useListQuery();
  const [groups, setGroups] = useState<BusinessGroupRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const columns = useMemo(
    () => [
      imageColumn<BusinessGroupRecord>(
        "logo",
        "Logo",
        (group) => (group.logoPath ? resolveMediaUrl(group.logoPath) : ""),
        { alt: (group) => group.name }
      ),
      textColumn<BusinessGroupRecord>("name", "Name", (group) => group.name, { primary: true }),
      textColumn<BusinessGroupRecord>("code", "Code", (group) => group.code || "—"),
      textColumn<BusinessGroupRecord>(
        "theme",
        "Storefront",
        (group) => (group.storefrontTheme === "dining" ? "Dining" : "Marketplace")
      ),
      textColumn<BusinessGroupRecord>("currency", "Currency", (group) => group.currency || "PKR"),
      textColumn<BusinessGroupRecord>("description", "Description", (group) => group.description),
      statusColumn<BusinessGroupRecord>(),
    ],
    []
  );

  async function loadGroups() {
    await crud.runLoad(async () => {
      const data = await api.getBusinessGroups(list.params);
      setGroups(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && list.page > 1) {
        list.setPage(Math.max(1, data.totalPages));
      }
    }, "Unable to load business groups.");
  }

  useEffect(() => {
    loadGroups();
  }, [list.params]);

  async function handleDelete(group: BusinessGroupRecord) {
    await crud.runDelete(
      group.name,
      async () => {
        await api.deleteBusinessGroup(group._id);
      },
      {
        successMessage: "Business group removed.",
        reload: loadGroups,
        fallbackError: "Unable to remove business group.",
      }
    );
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="Group businesses together. Currency is per group. Card checkout uses platform Stripe.">
        <PageAlerts error={crud.error} message={crud.message} />

        <DataTableCard
          title="All business groups"
          modulePath={MODULE_PATH}
          columns={columns}
          data={groups}
          getRowId={(group) => group._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onView: (group) => navigate(`${MODULE_PATH}/${group._id}`),
            onDelete: handleDelete,
            showEdit: false,
          }}
          loading={crud.loading}
          loadingMessage="Loading business groups..."
          empty={!crud.loading && groups.length === 0}
          emptyMessage={
            list.activeCount > 0 ? "No business groups match your filters." : "No business groups yet."
          }
          filters={
            <ListFilters
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              searchPlaceholder="Search groups..."
              activeCount={list.activeCount}
              onClear={list.clearFilters}
            >
              <FilterSelect
                value={list.getFilter("status")}
                onValueChange={(value) => list.setFilter("status", value)}
                options={STATUS_FILTER_OPTIONS}
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
          createLabel="Create group"
          onCreate={() => navigate(`${MODULE_PATH}/new`)}
        />
      </PageShell>
    </RequirePermission>
  );
}
