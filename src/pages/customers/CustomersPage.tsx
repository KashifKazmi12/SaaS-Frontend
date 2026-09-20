import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  DataTableCard,
  FilterSelect,
  ListFilters,
  ListPagination,
  PageAlerts,
  PermissionButton,
  statusColumn,
  textColumn,
} from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { resolveListBusinessId, useListSchemaFields } from "@/hooks/useListSchemaFields";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useListQuery } from "@/hooks/useListQuery";
import { getBusinessDisplayName } from "@/lib/business";
import { formatCustomListValue } from "@/constants/entityFields";
import { ALL_FILTER, STATUS_FILTER_OPTIONS } from "@/lib/listFilters";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { CustomerRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.CUSTOMERS;

function formatCustomerGroup(customer: CustomerRecord) {
  return getBusinessDisplayName(customer.businessGroup);
}

function formatContact(customer: CustomerRecord) {
  return [customer.phone, customer.email].filter(Boolean).join(" · ") || "—";
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const crud = useCrudPage<CustomerRecord>();
  const list = useListQuery();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const groupOptions = user?.businessGroups ?? [];
  const showGroupFilter = groupOptions.length > 1;
  const listGroupId = resolveListBusinessId(
    list.getFilter("groupId"),
    groupOptions.length === 1 ? groupOptions[0].id : undefined
  );
  const listCustomFields = useListSchemaFields("customer", listGroupId);

  const columns = useMemo(
    () => [
      textColumn<CustomerRecord>("name", "Name", (customer) => customer.name, { primary: true }),
      textColumn<CustomerRecord>("businessGroup", "Business group", formatCustomerGroup),
      textColumn<CustomerRecord>("contact", "Contact", formatContact),
      ...listCustomFields.map((field) =>
        textColumn<CustomerRecord>(
          `custom-${field.key}`,
          field.label,
          (customer) => formatCustomListValue(customer.custom?.[field.key], field)
        )
      ),
      statusColumn<CustomerRecord>(),
    ],
    [listCustomFields]
  );

  async function loadCustomers() {
    await crud.runLoad(async () => {
      const data = await api.getCustomers(list.params);
      setCustomers(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && list.page > 1) {
        list.setPage(Math.max(1, data.totalPages));
      }
    }, "Unable to load customers.");
  }

  useEffect(() => {
    loadCustomers();
  }, [list.params]);

  async function handleDelete(customer: CustomerRecord) {
    await crud.runDelete(
      customer.name,
      async () => {
        await api.deleteCustomer(customer._id);
      },
      {
        successMessage: "Customer removed.",
        reload: loadCustomers,
        fallbackError: "Unable to remove customer.",
      }
    );
  }

  async function handleExport() {
    const data = await api.getCustomers({ ...list.params, page: 1, limit: 100 });
    const rows = data.items.map((item) => ({
      name: item.name,
      email: item.email,
      phone: item.phone,
      address: item.address,
      notes: item.notes,
      businessGroup: formatCustomerGroup(item),
      walletBalance: item.walletBalance ?? 0,
      pointsBalance: item.pointsBalance ?? 0,
      custom: item.custom || {},
      status: item.isActive ? "Active" : "Inactive",
    }));

    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers.json";
    link.click();
    URL.revokeObjectURL(url);
    crud.setMessage("Customers exported.");
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="Keep a customer list for each business group.">
        <PageAlerts error={crud.error} message={crud.message} />

        <DataTableCard
          title="All customers"
          modulePath={MODULE_PATH}
          columns={columns}
          data={customers}
          getRowId={(customer) => customer._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onView: (customer) => navigate(`${MODULE_PATH}/${customer._id}`),
            onDelete: handleDelete,
            showEdit: false,
          }}
          headerActions={
            <PermissionButton
              modulePath={MODULE_PATH}
              action="export"
              variant="outline"
              onClick={handleExport}
            >
              Export
            </PermissionButton>
          }
          loading={crud.loading}
          loadingMessage="Loading customers..."
          empty={!crud.loading && customers.length === 0}
          emptyMessage={
            list.activeCount > 0 ? "No customers match your filters." : "No customers yet."
          }
          filters={
            <ListFilters
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              searchPlaceholder="Search customers..."
              activeCount={list.activeCount}
              onClear={list.clearFilters}
            >
              {showGroupFilter && (
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
              )}
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
        />
      </PageShell>
    </RequirePermission>
  );
}
