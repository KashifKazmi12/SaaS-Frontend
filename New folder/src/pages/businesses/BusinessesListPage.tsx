import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { BusinessGroupSelect } from "@/components/business";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  CrudDialog,
  DataTableCard,
  FileUploadField,
  FilterSelect,
  FormField,
  imageColumn,
  ListFilters,
  ListPagination,
  PageAlerts,
  statusColumn,
  textColumn,
} from "@/components/shared";
import { useBusinessGroupOptions } from "@/hooks/useBusinessGroupOptions";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useListQuery } from "@/hooks/useListQuery";
import { ALL_FILTER, STATUS_FILTER_OPTIONS } from "@/lib/listFilters";
import { resolveMediaUrl } from "@/lib/media";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { BusinessRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.BUSINESSES_LIST;

export default function BusinessesListPage() {
  const navigate = useNavigate();
  const crud = useCrudPage<BusinessRecord>();
  const list = useListQuery();
  const { options: groupOptions } = useBusinessGroupOptions();
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [businessGroupId, setBusinessGroupId] = useState("");

  function groupName(business: BusinessRecord) {
    if (!business.businessGroup) return "—";
    if (typeof business.businessGroup === "object") return business.businessGroup.name;
    return "—";
  }

  const columns = useMemo(
    () => [
      imageColumn<BusinessRecord>(
        "logo",
        "Image",
        (business) => (business.logoPath ? resolveMediaUrl(business.logoPath) : ""),
        { alt: (business) => business.name }
      ),
      textColumn<BusinessRecord>("name", "Name", (business) => business.name, { primary: true }),
      textColumn<BusinessRecord>("code", "Code", (business) => business.code),
      textColumn<BusinessRecord>("businessGroup", "Business group", groupName),
      textColumn<BusinessRecord>("email", "Email", (business) => business.email),
      textColumn<BusinessRecord>("phone", "Phone", (business) => business.phone),
      statusColumn<BusinessRecord>(),
    ],
    []
  );

  async function loadData() {
    await crud.runLoad(async () => {
      const data = await api.getBusinesses(list.params);
      setBusinesses(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && list.page > 1) {
        list.setPage(Math.max(1, data.totalPages));
      }
    }, "Unable to load businesses.");
  }

  useEffect(() => {
    loadData();
  }, [list.params]);

  function resetForm() {
    setName("");
    setCode("");
    setEmail("");
    setPhone("");
    setAddress("");
    setDescription("");
    setLogoPath("");
    setBusinessGroupId("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    await crud.runMutation(
      async () => {
        await api.createBusiness({
          name,
          code,
          email,
          phone,
          address,
          description,
          logoPath,
          businessGroupId: businessGroupId || null,
        });
      },
      {
        successMessage: "Business created.",
        reload: loadData,
        fallbackError: "Unable to save business.",
      }
    );
  }

  async function handleDelete(business: BusinessRecord) {
    await crud.runDelete(
      business.name,
      async () => {
        await api.deleteBusiness(business._id);
      },
      {
        successMessage: "Business removed.",
        reload: loadData,
        fallbackError: "Unable to remove business.",
      }
    );
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="Create and manage businesses. Currency comes from the business group.">
        <PageAlerts error={crud.error} message={crud.message} />

        <DataTableCard
          title="All businesses"
          modulePath={MODULE_PATH}
          columns={columns}
          data={businesses}
          getRowId={(business) => business._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onView: (business) =>
              navigate(`${MODULE_PATHS.BUSINESSES_LIST}/${business._id}/settings`),
            onDelete: handleDelete,
          }}
          loading={crud.loading}
          loadingMessage="Loading businesses..."
          empty={!crud.loading && businesses.length === 0}
          emptyMessage={
            list.activeCount > 0 ? "No businesses match your filters." : "No businesses yet."
          }
          filters={
            <ListFilters
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              searchPlaceholder="Search name, code, email, or phone..."
              activeCount={list.activeCount}
              onClear={list.clearFilters}
            >
              {groupOptions.length > 1 ? (
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
          createLabel="Create business"
          onCreate={() => crud.startCreate(resetForm)}
        />

        <CrudDialog
          open={crud.dialogOpen}
          onOpenChange={crud.setDialogOpen}
          editing={false}
          createTitle="Create business"
          editTitle="Create business"
          createSubmitLabel="Create business"
          onSubmit={handleSubmit}
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="business-name"
              label="Name"
              containerClassName="sm:col-span-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <FormField
              id="business-code"
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <BusinessGroupSelect
              value={businessGroupId}
              onValueChange={setBusinessGroupId}
              required
              allowEmpty={false}
            />
            <FormField
              id="business-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <FormField
              id="business-phone"
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <FormField
              id="business-address"
              label="Address"
              containerClassName="sm:col-span-2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <FormField
              id="business-description"
              label="Description"
              containerClassName="sm:col-span-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="sm:col-span-2">
              <FileUploadField
                id="business-logo"
                label="Branch image / logo"
                mode="single"
                folder="businesses"
                value={logoPath}
                onChange={setLogoPath}
                recommendedSize={{
                  width: 600,
                  height: 600,
                  tip: "Square branch photos match storefront cards. Other ratios may crop with cover fit.",
                }}
              />
            </div>
          </div>
        </CrudDialog>
      </PageShell>
    </RequirePermission>
  );
}
