import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { BusinessGroupSelect } from "@/components/business";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  CrudDialog,
  DataTableCard,
  FormField,
  PageAlerts,
  statusColumn,
  textColumn,
} from "@/components/shared";
import { useCrudPage } from "@/hooks/useCrudPage";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { BusinessGroupRecord, BusinessRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.BUSINESSES_LIST;

export default function BusinessesListPage() {
  const crud = useCrudPage<BusinessRecord>();
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [groups, setGroups] = useState<BusinessGroupRecord[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [businessGroupId, setBusinessGroupId] = useState("");

  function groupName(business: BusinessRecord) {
    if (!business.businessGroup) return "—";
    if (typeof business.businessGroup === "object") return business.businessGroup.name;
    const group = groups.find((item) => item._id === business.businessGroup);
    return group?.name || "—";
  }

  const columns = useMemo(
    () => [
      textColumn<BusinessRecord>("name", "Name", (business) => business.name, { primary: true }),
      textColumn<BusinessRecord>("code", "Code", (business) => business.code),
      textColumn<BusinessRecord>("businessGroup", "Business group", groupName),
      textColumn<BusinessRecord>("email", "Email", (business) => business.email),
      textColumn<BusinessRecord>("phone", "Phone", (business) => business.phone),
      statusColumn<BusinessRecord>(),
    ],
    [groups]
  );

  async function loadData() {
    await crud.runLoad(async () => {
      const [businessesData, groupsData] = await Promise.all([
        api.getBusinesses(),
        api.getBusinessGroups(),
      ]);
      setBusinesses(businessesData);
      setGroups(groupsData);
    }, "Unable to load businesses.");
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setName("");
    setCode("");
    setEmail("");
    setPhone("");
    setAddress("");
    setDescription("");
    setBusinessGroupId("");
  }

  function populateForm(business: BusinessRecord) {
    setName(business.name);
    setCode(business.code);
    setEmail(business.email);
    setPhone(business.phone);
    setAddress(business.address);
    setDescription(business.description);
    setBusinessGroupId(
      typeof business.businessGroup === "object" && business.businessGroup
        ? business.businessGroup._id
        : typeof business.businessGroup === "string"
          ? business.businessGroup
          : ""
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const payload = {
      name,
      code,
      email,
      phone,
      address,
      description,
      businessGroupId: businessGroupId || null,
    };

    await crud.runMutation(
      async () => {
        if (crud.editing) {
          await api.updateBusiness(crud.editing._id, payload);
        } else {
          await api.createBusiness(payload);
        }
      },
      {
        successMessage: crud.editing ? "Business updated." : "Business created.",
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
      <PageShell description="Create and manage businesses. Each business can belong to a business group.">
        <PageAlerts error={crud.error} message={crud.message} />

        <DataTableCard
          title="All businesses"
          modulePath={MODULE_PATH}
          columns={columns}
          data={businesses}
          getRowId={(business) => business._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onEdit: (business) => crud.startEdit(business, populateForm),
            onDelete: handleDelete,
          }}
          loading={crud.loading}
          loadingMessage="Loading businesses..."
          empty={!crud.loading && businesses.length === 0}
          emptyMessage="No businesses yet."
          createLabel="Create business"
          onCreate={() => crud.startCreate(resetForm)}
        />

        <CrudDialog
          open={crud.dialogOpen}
          onOpenChange={crud.setDialogOpen}
          editing={Boolean(crud.editing)}
          createTitle="Create business"
          editTitle="Edit business"
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
            />
            <BusinessGroupSelect
              groups={groups}
              value={businessGroupId}
              onValueChange={setBusinessGroupId}
            />
            <FormField
              id="business-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormField
              id="business-phone"
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
          </div>
        </CrudDialog>
      </PageShell>
    </RequirePermission>
  );
}
