import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { BusinessGroupSelect } from "@/components/business";
import { EntityFieldSchemaEditor } from "@/components/entity-fields/EntityFieldSchemaEditor";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import { FormField, FileUploadField, PageAlerts, PermissionButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { MODULE_PATHS } from "@/lib/modulePaths";
import {
  CHECKOUT_PAYMENT_METHOD_OPTIONS,
  DEFAULT_CHECKOUT_PAYMENT_METHODS,
  DEFAULT_PORTAL_PAYMENT_METHODS,
  type CheckoutPaymentMethod,
} from "@/constants/commerce";
import type { EntityFieldDefinition, EntitySchemaEntity } from "@/types";

const MODULE_PATH = MODULE_PATHS.BUSINESSES_LIST;

type PageTab = "general" | "payments" | "schema";

const PAGE_TABS: Array<{ id: PageTab; label: string }> = [
  { id: "general", label: "General" },
  { id: "payments", label: "Payments" },
  { id: "schema", label: "Schema" },
];

const SCHEMA_TABS: Array<{ id: EntitySchemaEntity; label: string; help: string }> = [
  {
    id: "customer",
    label: "Customer",
    help: "System fields stay for search, orders, and login later. Hide the ones this business does not need, or add extra fields for this business only.",
  },
  {
    id: "product",
    label: "Product",
    help: "Price, SKU, and unit stay for catalog and stock. Do not add size or color here — those are variations. Extra fields are for this business only.",
  },
  {
    id: "category",
    label: "Category",
    help: "Name stays required. Hide description if this business does not use it, or add extra fields for this business only.",
  },
  {
    id: "stock",
    label: "Stock",
    help: "Quantity and min stock stay for inventory. Extra fields are for this business only.",
  },
  {
    id: "order",
    label: "Order",
    help: "System fields (like Notes) stay locked. Hide or expose them to the customer app from More options. Add custom extras below for this business only.",
  },
];

type SchemaDraft = {
  fields: EntityFieldDefinition[];
  presets: EntityFieldDefinition[];
};

const EMPTY_DRAFTS: Record<EntitySchemaEntity, SchemaDraft> = {
  customer: { fields: [], presets: [] },
  product: { fields: [], presets: [] },
  category: { fields: [], presets: [] },
  stock: { fields: [], presets: [] },
  order: { fields: [], presets: [] },
};

function resolveCheckoutMethods(value?: string[]): CheckoutPaymentMethod[] {
  const selected = CHECKOUT_PAYMENT_METHOD_OPTIONS.map((item) => item.value).filter((method) =>
    (value || []).includes(method)
  );
  return selected.length ? selected : [...DEFAULT_CHECKOUT_PAYMENT_METHODS];
}

function resolvePortalMethods(value?: string[]): CheckoutPaymentMethod[] {
  const selected = CHECKOUT_PAYMENT_METHOD_OPTIONS.map((item) => item.value).filter((method) =>
    (value || []).includes(method)
  );
  return selected.length ? selected : [...DEFAULT_PORTAL_PAYMENT_METHODS];
}

export default function BusinessSettingsPage() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const canUpdate = can(MODULE_PATH, "update");
  const [pageTab, setPageTab] = useState<PageTab>("general");
  const [schemaTab, setSchemaTab] = useState<EntitySchemaEntity>("customer");
  const [businessName, setBusinessName] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [businessGroupId, setBusinessGroupId] = useState("");
  const [checkoutPaymentMethods, setCheckoutPaymentMethods] = useState<CheckoutPaymentMethod[]>(
    DEFAULT_CHECKOUT_PAYMENT_METHODS
  );
  const [portalPaymentMethods, setPortalPaymentMethods] = useState<CheckoutPaymentMethod[]>(
    DEFAULT_PORTAL_PAYMENT_METHODS
  );
  const [drafts, setDrafts] = useState(EMPTY_DRAFTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const activeSchema = SCHEMA_TABS.find((item) => item.id === schemaTab) || SCHEMA_TABS[0];
  const draft = drafts[schemaTab];

  async function loadPage() {
    if (!businessId) return;
    setLoading(true);
    setError("");
    try {
      const [business, customer, product, category, stock, order] = await Promise.all([
        api.getBusiness(businessId),
        api.getBusinessEntitySchema(businessId, "customer"),
        api.getBusinessEntitySchema(businessId, "product"),
        api.getBusinessEntitySchema(businessId, "category"),
        api.getBusinessEntitySchema(businessId, "stock"),
        api.getBusinessEntitySchema(businessId, "order"),
      ]);

      setBusinessName(business.name);
      setName(business.name);
      setCode(business.code);
      setEmail(business.email);
      setPhone(business.phone);
      setAddress(business.address || "");
      setDescription(business.description || "");
      setLogoPath(business.logoPath || "");
      setBusinessGroupId(
        typeof business.businessGroup === "object" && business.businessGroup
          ? business.businessGroup._id
          : typeof business.businessGroup === "string"
            ? business.businessGroup
            : ""
      );
      setCheckoutPaymentMethods(resolveCheckoutMethods(business.checkoutPaymentMethods));
      setPortalPaymentMethods(resolvePortalMethods(business.portalPaymentMethods));
      setDrafts({
        customer: { fields: customer.fields, presets: customer.presets },
        product: { fields: product.fields, presets: product.presets },
        category: { fields: category.fields, presets: category.presets },
        stock: { fields: stock.fields, presets: stock.presets },
        order: { fields: order.fields, presets: order.presets },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load business settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, [businessId]);

  function updateDraft(entity: EntitySchemaEntity, fields: EntityFieldDefinition[]) {
    setDrafts((current) => ({
      ...current,
      [entity]: { ...current[entity], fields },
    }));
  }

  function switchPageTab(next: PageTab) {
    setPageTab(next);
    setMessage("");
    setError("");
  }


  async function handleSaveGeneral(event: FormEvent) {
    event.preventDefault();
    if (!businessId || !canUpdate) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const business = await api.updateBusiness(businessId, {
        name,
        code,
        email,
        phone,
        address,
        description,
        logoPath,
        businessGroupId: businessGroupId || null,
      });
      setBusinessName(business.name);
      setMessage("Business details saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save business.");
    } finally {
      setSaving(false);
    }
  }

  function toggleCheckoutMethod(method: CheckoutPaymentMethod, checked: boolean) {
    setCheckoutPaymentMethods((current) => {
      if (checked) {
        return CHECKOUT_PAYMENT_METHOD_OPTIONS.map((item) => item.value).filter(
          (value) => value === method || current.includes(value)
        );
      }
      return current.filter((value) => value !== method);
    });
  }

  function togglePortalMethod(method: CheckoutPaymentMethod, checked: boolean) {
    setPortalPaymentMethods((current) => {
      if (checked) {
        return CHECKOUT_PAYMENT_METHOD_OPTIONS.map((item) => item.value).filter(
          (value) => value === method || current.includes(value)
        );
      }
      return current.filter((value) => value !== method);
    });
  }

  async function handleSavePayments(event: FormEvent) {
    event.preventDefault();
    if (!businessId || !canUpdate) return;
    if (checkoutPaymentMethods.length === 0) {
      setError("Select at least one storefront payment option.");
      return;
    }
    if (portalPaymentMethods.length === 0) {
      setError("Select at least one portal payment option.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const business = await api.updateBusiness(businessId, {
        checkoutPaymentMethods,
        portalPaymentMethods,
      });
      setCheckoutPaymentMethods(resolveCheckoutMethods(business.checkoutPaymentMethods));
      setPortalPaymentMethods(resolvePortalMethods(business.portalPaymentMethods));
      setMessage("Payment options saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save payment options.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSchema() {
    if (!businessId || !canUpdate) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await api.updateBusinessEntitySchema(businessId, schemaTab, {
        fields: draft.fields,
      });
      setDrafts((current) => ({
        ...current,
        [schemaTab]: { fields: data.fields, presets: data.presets },
      }));
      setMessage(`${activeSchema.label} fields saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save fields.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell
        description={
          businessName ? `Settings for ${businessName}.` : "View and update this business."
        }
        action={
          <Button type="button" variant="outline" onClick={() => navigate(MODULE_PATHS.BUSINESSES_LIST)}>
            <ArrowLeft className="size-4" />
            Back to businesses
          </Button>
        }
      >
        <PageAlerts error={error} message={message} />

        <div className="flex flex-wrap gap-2">
          {PAGE_TABS.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={pageTab === item.id ? "default" : "outline"}
              onClick={() => switchPageTab(item.id)}
              className={cn(pageTab === item.id && "pointer-events-none")}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {pageTab === "general" && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading business...</p>
              ) : (
                <form className="space-y-4" onSubmit={handleSaveGeneral}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      id="business-name"
                      label="Name"
                      containerClassName="sm:col-span-2"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      disabled={!canUpdate}
                    />
                    <FormField
                      id="business-code"
                      label="Code"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      required
                      disabled={!canUpdate}
                    />
                    <BusinessGroupSelect
                      value={businessGroupId}
                      onValueChange={setBusinessGroupId}
                      required
                      allowEmpty={false}
                      readOnly={!canUpdate}
                    />
                    <FormField
                      id="business-email"
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      disabled={!canUpdate}
                    />
                    <FormField
                      id="business-phone"
                      label="Phone"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      required
                      disabled={!canUpdate}
                    />
                    <FormField
                      id="business-address"
                      label="Address"
                      containerClassName="sm:col-span-2"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      disabled={!canUpdate}
                    />
                    <FormField
                      id="business-description"
                      label="Description"
                      containerClassName="sm:col-span-2"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      disabled={!canUpdate}
                    />
                    <div className="sm:col-span-2">
                      <FileUploadField
                        id="business-logo"
                        label="Branch image / logo"
                        mode="single"
                        folder="businesses"
                        value={logoPath}
                        onChange={setLogoPath}
                        disabled={!canUpdate}
                        recommendedSize={{
                          width: 600,
                          height: 600,
                          tip: "Square branch photos match storefront cards. Other ratios may crop with cover fit.",
                        }}
                      />
                    </div>
                  </div>
                  <PermissionButton
                    modulePath={MODULE_PATH}
                    action="update"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save business"}
                  </PermissionButton>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {pageTab === "payments" && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Payment options</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-muted-foreground text-sm">Loading payments...</p>
              ) : (
                <form className="space-y-8" onSubmit={handleSavePayments}>
                  <section className="space-y-3">
                    <div>
                      <h3 className="text-sm font-medium">Storefront checkout</h3>
                      <p className="text-muted-foreground text-xs">
                        Methods customers see when ordering online.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {CHECKOUT_PAYMENT_METHOD_OPTIONS.map((option) => {
                        const checked = checkoutPaymentMethods.includes(option.value);
                        return (
                          <label
                            key={`checkout-${option.value}`}
                            htmlFor={`checkout-method-${option.value}`}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                              checked
                                ? "border-foreground/20 bg-muted/40"
                                : "border-border hover:bg-muted/20",
                              !canUpdate && "cursor-not-allowed opacity-70"
                            )}
                          >
                            <Checkbox
                              id={`checkout-method-${option.value}`}
                              checked={checked}
                              disabled={!canUpdate}
                              onCheckedChange={(value) =>
                                toggleCheckoutMethod(option.value, Boolean(value))
                              }
                              className="mt-0.5"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">{option.label}</span>
                              <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                                {option.description}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div>
                      <h3 className="text-sm font-medium">Admin portal</h3>
                      <p className="text-muted-foreground text-xs">
                        Methods staff can choose when creating an order in the portal.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {CHECKOUT_PAYMENT_METHOD_OPTIONS.map((option) => {
                        const checked = portalPaymentMethods.includes(option.value);
                        return (
                          <label
                            key={`portal-${option.value}`}
                            htmlFor={`portal-method-${option.value}`}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                              checked
                                ? "border-foreground/20 bg-muted/40"
                                : "border-border hover:bg-muted/20",
                              !canUpdate && "cursor-not-allowed opacity-70"
                            )}
                          >
                            <Checkbox
                              id={`portal-method-${option.value}`}
                              checked={checked}
                              disabled={!canUpdate}
                              onCheckedChange={(value) =>
                                togglePortalMethod(option.value, Boolean(value))
                              }
                              className="mt-0.5"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">{option.label}</span>
                              <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                                {option.description}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>

                  <p className="text-muted-foreground flex items-start gap-1.5 text-xs leading-relaxed">
                    <Lock className="mt-px size-[1em] shrink-0" aria-hidden="true" />
                    <span>
                      We protect your payments. At the end of the month you receive a settlement
                      of this branch’s sales.
                    </span>
                  </p>
                  <PermissionButton
                    modulePath={MODULE_PATH}
                    action="update"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save payments"}
                  </PermissionButton>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {pageTab === "schema" && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Fields</CardTitle>
              <CardAction>
                <div
                  role="tablist"
                  aria-label="Choose a record type"
                  className="bg-muted inline-flex flex-wrap rounded-lg p-1"
                >
                  {SCHEMA_TABS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={schemaTab === item.id}
                      onClick={() => {
                        setSchemaTab(item.id);
                        setMessage("");
                        setError("");
                      }}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        schemaTab === item.id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading fields...</p>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">{activeSchema.help}</p>
                  <EntityFieldSchemaEditor
                    fields={draft.fields}
                    presets={draft.presets}
                    onChange={(fields) => updateDraft(schemaTab, fields)}
                    canUpdate={canUpdate}
                  />
                  <PermissionButton
                    modulePath={MODULE_PATH}
                    action="update"
                    onClick={handleSaveSchema}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : `Save ${activeSchema.label.toLowerCase()} fields`}
                  </PermissionButton>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </PageShell>
    </RequirePermission>
  );
}
