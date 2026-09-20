import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImageIcon, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { BusinessGroupSelect, BusinessSelect } from "@/components/business";
import { DynamicEntityFields } from "@/components/entity-fields/DynamicEntityFields";
import { OrderCreateSuccessDialog } from "@/components/orders/OrderCreateSuccessDialog";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  EnumSelect,
  FormField,
  PageAlerts,
  PermissionButton,
  PermissionIconButton,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import {
  buildEntityPayload,
  emptyFieldValue,
  visibleAdminFields,
} from "@/constants/entityFields";
import {
  earnPointsFromSubtotal,
  resolveLoyaltySettings,
} from "@/constants/loyalty";
import {
  CHECKOUT_PAYMENT_METHOD_OPTIONS,
  DEFAULT_PORTAL_PAYMENT_METHODS,
  type CheckoutPaymentMethod,
} from "@/constants/commerce";
import { resolveMediaUrl } from "@/lib/media";
import { MODULE_PATHS } from "@/lib/modulePaths";
import { formatMoney } from "@/lib/money";
import type {
  EntityFieldDefinition,
  OrderCatalogProduct,
  OrderPaymentMethod,
  OrderRecord,
} from "@/types";

const MODULE_PATH = MODULE_PATHS.ORDERS;

function resolvePortalMethods(value?: string[]): CheckoutPaymentMethod[] {
  const selected = CHECKOUT_PAYMENT_METHOD_OPTIONS.map((item) => item.value).filter((method) =>
    (value || []).includes(method)
  );
  return selected.length ? selected : [...DEFAULT_PORTAL_PAYMENT_METHODS];
}

interface DraftItem {
  key: string;
  productId: string;
  variationId: string;
  quantity: string;
}

function newDraftItem(): DraftItem {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: "",
    variationId: "",
    quantity: "1",
  };
}

function orderFormValues(fields: EntityFieldDefinition[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of visibleAdminFields(fields)) {
    values[field.key] = emptyFieldValue(field);
  }
  return values;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export default function OrderCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sessionGroups = user?.businessGroups ?? [];
  const sessionBusinesses = user?.businesses ?? [];
  const [catalog, setCatalog] = useState<OrderCatalogProduct[]>([]);
  const [groupId, setGroupId] = useState(
    () => (sessionGroups.length === 1 ? sessionGroups[0].id : "")
  );
  const [businessId, setBusinessId] = useState(() => {
    const gid = sessionGroups.length === 1 ? sessionGroups[0].id : "";
    if (!gid) return "";
    const forGroup = sessionBusinesses.filter((b) => b.businessGroupId === gid);
    return forGroup.length === 1 ? forGroup[0].id : "";
  });
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>("unpaid");
  const [discountMode, setDiscountMode] = useState<"fixed" | "percent">("fixed");
  const [discountInput, setDiscountInput] = useState("");
  const [portalPaymentMethods, setPortalPaymentMethods] = useState<CheckoutPaymentMethod[]>(
    DEFAULT_PORTAL_PAYMENT_METHODS
  );
  const [items, setItems] = useState<DraftItem[]>([newDraftItem()]);
  const [productFocusToken, setProductFocusToken] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [schemaFields, setSchemaFields] = useState<EntityFieldDefinition[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [successOrder, setSuccessOrder] = useState<OrderRecord | null>(null);
  const [successCheckoutUrl, setSuccessCheckoutUrl] = useState<string | null>(null);

  const branchOptions = useMemo(
    () =>
      sessionBusinesses
        .filter((business) => business.businessGroupId === groupId)
        .map((business) => ({
          id: business.id,
          name: business.name,
          businessGroupId: business.businessGroupId,
        })),
    [sessionBusinesses, groupId]
  );

  const selectedGroup = sessionGroups.find((group) => group.id === groupId);
  const groupCurrency = selectedGroup?.currency || "PKR";
  const loyalty = useMemo(
    () => resolveLoyaltySettings(selectedGroup),
    [selectedGroup]
  );

  const estimatedSubtotal = useMemo(() => {
    return roundMoney(
      items.reduce((sum, item) => {
        if (!item.productId) return sum;
        const product = catalog.find((row) => row._id === item.productId);
        if (!product) return sum;
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        let unit = Number(product.basePrice) || 0;
        if (product.hasVariations && item.variationId) {
          const variation = product.variations.find((row) => row._id === item.variationId);
          unit = Number(variation?.price) || 0;
        }
        return sum + unit * qty;
      }, 0)
    );
  }, [items, catalog]);

  const discountValue = useMemo(
    () => Math.max(0, Number(discountInput) || 0),
    [discountInput]
  );

  const discountAmount = useMemo(() => {
    if (discountMode === "percent") {
      const pct = Math.min(discountValue, 100);
      return roundMoney(Math.min((estimatedSubtotal * pct) / 100, estimatedSubtotal));
    }
    return Math.min(roundMoney(discountValue), estimatedSubtotal);
  }, [discountMode, discountValue, estimatedSubtotal]);

  const preview = useMemo(() => {
    const total = roundMoney(Math.max(0, estimatedSubtotal - discountAmount));
    return {
      pointsRedeemed: 0,
      pointsDiscount: 0,
      walletApplied: 0,
      discountAmount,
      total,
      pointsEarned: loyalty.loyaltyEnabled
        ? earnPointsFromSubtotal(total, loyalty.earnPointsPerCurrency)
        : 0,
      fullyCovered: total === 0 && estimatedSubtotal > 0,
    };
  }, [estimatedSubtotal, discountAmount, loyalty]);

  /** Keep fixed discount input within the current subtotal (same idea as % → 100). */
  useEffect(() => {
    if (discountMode !== "fixed" || !discountInput.trim()) return;
    const current = Number(discountInput);
    if (!Number.isFinite(current) || current <= estimatedSubtotal) return;
    setDiscountInput(String(roundMoney(estimatedSubtotal)));
  }, [estimatedSubtotal, discountMode, discountInput]);

  const paymentOptions = useMemo(() => {
    return CHECKOUT_PAYMENT_METHOD_OPTIONS.filter((option) =>
      portalPaymentMethods.includes(option.value)
    ).map((option) => ({ value: option.value, label: option.label }));
  }, [portalPaymentMethods]);

  useEffect(() => {
    if (sessionGroups.length === 1) {
      setGroupId(sessionGroups[0].id);
    }
  }, [sessionGroups]);

  useEffect(() => {
    if (!groupId) {
      setBusinessId("");
      return;
    }

    setCustomerName("");
    setItems([newDraftItem()]);
    setCatalog([]);
    setSchemaFields([]);
    setFormValues({});
    setDiscountInput("");
    setDiscountMode("fixed");

    const branchesForGroup = sessionBusinesses.filter(
      (business) => business.businessGroupId === groupId
    );
    if (branchesForGroup.length === 1) {
      setBusinessId(branchesForGroup[0].id);
    } else {
      setBusinessId((current) =>
        branchesForGroup.some((branch) => branch.id === current) ? current : ""
      );
    }
  }, [groupId, sessionBusinesses]);

  useEffect(() => {
    if (!groupId || !businessId) {
      setCatalog([]);
      setSchemaFields([]);
      setFormValues({});
      setItems([newDraftItem()]);
      return;
    }

    let cancelled = false;
    setSchemaLoading(true);
    const draft = newDraftItem();
    setItems([draft]);

    Promise.all([
      api.getOrderCatalogOptions({ groupId, businessId }),
      api.getOrderSchema({ businessId }),
    ])
      .then(([products, schema]) => {
        if (cancelled) return;
        setCatalog(products.items);
        setSchemaFields(schema.fields);
        setFormValues(orderFormValues(schema.fields));
        const methods = resolvePortalMethods(products.portalPaymentMethods);
        setPortalPaymentMethods(methods);
        setPaymentMethod((current) =>
          methods.includes(current as CheckoutPaymentMethod)
            ? current
            : ((methods[0] || "unpaid") as OrderPaymentMethod)
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load products or fields.");
          setCatalog([]);
          setSchemaFields([]);
          setFormValues({});
        }
      })
      .finally(() => {
        if (cancelled) return;
        setSchemaLoading(false);
        setProductFocusToken(`${draft.key}:${Date.now()}`);
      });

    return () => {
      cancelled = true;
    };
  }, [groupId, businessId]);

  function updateFormField(key: string, value: unknown) {
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  }

  function insertItemAfter(afterKey: string) {
    const draft = newDraftItem();
    setItems((current) => {
      const index = current.findIndex((row) => row.key === afterKey);
      if (index < 0) return [...current, draft];
      const next = [...current];
      next.splice(index + 1, 0, draft);
      return next;
    });
    const token = `${draft.key}:${Date.now()}`;
    setProductFocusToken(token);
    // Ensure focus lands on the new row product field after paint.
    window.setTimeout(() => {
      const trigger = document.getElementById(`product-${draft.key}`);
      trigger?.focus();
    }, 30);
  }

  function handleItemEnter(afterKey: string) {
    if (!businessId) return;
    insertItemAfter(afterKey);
  }

  function removeItemRow(itemKey: string) {
    setItems((current) => {
      if (current.length <= 1) {
        const draft = newDraftItem();
        window.setTimeout(() => {
          setProductFocusToken(`${draft.key}:${Date.now()}`);
          document.getElementById(`product-${draft.key}`)?.focus();
        }, 30);
        return [draft];
      }
      const index = current.findIndex((row) => row.key === itemKey);
      const next = current.filter((row) => row.key !== itemKey);
      const focusRow = next[Math.max(0, index - 1)] ?? next[0];
      window.setTimeout(() => {
        setProductFocusToken(`${focusRow.key}:${Date.now()}`);
        document.getElementById(`product-${focusRow.key}`)?.focus();
      }, 30);
      return next;
    });
  }

  function handleItemRowKeyDown(event: KeyboardEvent<HTMLDivElement>, itemKey: string) {
    if (event.key !== "Delete") return;
    const target = event.target as HTMLElement | null;
    // Don't remove while a dropdown list is open / being navigated.
    if (target?.closest('[data-slot="select-content"]')) return;
    if (target?.closest('[data-slot="select-trigger"]')?.getAttribute("aria-expanded") === "true") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    removeItemRow(itemKey);
  }

  function handleQtyKeyDown(event: KeyboardEvent<HTMLInputElement>, itemKey: string) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleItemEnter(itemKey);
  }

  function resetFormForNextOrder() {
    setCustomerName("");
    const draft = newDraftItem();
    setItems([draft]);
    setFormValues(orderFormValues(schemaFields));
    setPaymentMethod(
      (portalPaymentMethods[0] || "unpaid") as OrderPaymentMethod
    );
    setDiscountInput("");
    setDiscountMode("fixed");
    setError("");
    setMessage("");
    setProductFocusToken(`${draft.key}:${Date.now()}`);
  }

  function handleSuccessAddNew() {
    setSuccessOrder(null);
    setSuccessCheckoutUrl(null);
    resetFormForNextOrder();
  }

  function handleSuccessViewDetail() {
    if (!successOrder) return;
    const id = successOrder._id;
    setSuccessOrder(null);
    setSuccessCheckoutUrl(null);
    navigate(`${MODULE_PATH}/${id}`);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (schemaLoading) {
      setError("Order fields are still loading.");
      return;
    }
    if (!groupId) {
      setError("Please select a business group.");
      return;
    }
    if (!businessId) {
      setError("Please select a business.");
      return;
    }
    if (!customerName.trim()) {
      setError("Please enter a customer name.");
      return;
    }

    const payloadItems = items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId,
        variationId: item.variationId || undefined,
        quantity: Number(item.quantity) || 1,
      }));

    if (payloadItems.length === 0) {
      setError("Add at least one product.");
      return;
    }

    setSaving(true);
    try {
      const entityPayload = buildEntityPayload("order", formValues, schemaFields);
      const order = await api.createOrder({
        groupId,
        businessId,
        customerName: customerName.trim(),
        items: payloadItems,
        paymentMethod,
        discountType: discountMode,
        discountValue:
          discountMode === "percent"
            ? Math.min(discountValue, 100)
            : discountAmount > 0
              ? discountAmount
              : 0,
        discountAmount: discountAmount > 0 ? discountAmount : 0,
        ...entityPayload,
      });
      setSuccessOrder(order);
      setSuccessCheckoutUrl(order.checkoutUrl || null);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequirePermission path={MODULE_PATH} action="create">
      <PageShell
        title="Create order"
        description="Pick one business, then add products from that business only."
        action={
          <Button type="button" variant="outline" onClick={() => navigate(MODULE_PATH)}>
            <ArrowLeft className="size-4" />
            Back to orders
          </Button>
        }
      >
        <PageAlerts error={error} message={message} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)] lg:items-start">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <BusinessGroupSelect
                  id="order-group"
                  label="Business group"
                  value={groupId}
                  onValueChange={(next) => {
                    setGroupId(next);
                    setBusinessId("");
                  }}
                  options={sessionGroups.map((group) => ({
                    id: group.id,
                    name: group.name,
                  }))}
                  allowEmpty={false}
                  required
                />
                <BusinessSelect
                  id="order-business"
                  label="Business"
                  scope="assigned"
                  value={businessId}
                  onValueChange={setBusinessId}
                  options={branchOptions}
                  required
                  placeholder={
                    groupId ? "Select business" : "Select a business group first"
                  }
                  // hint="Products are limited to this business."
                />
              </div>

              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>
                      Items <span className="text-destructive">*</span>
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!businessId}
                      tabIndex={-1}
                      onClick={() => {
                        const draft = newDraftItem();
                        setItems((current) => [...current, draft]);
                        setProductFocusToken(`${draft.key}:${Date.now()}`);
                      }}
                    >
                      <Plus className="size-4" />
                      Add item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {!businessId ? (
                    <p className="text-sm text-muted-foreground">
                      Select a business to load its products.
                    </p>
                  ) : (
                    items.map((item) => {
                      const product = catalog.find((row) => row._id === item.productId);
                      const imageSrc = product?.imagePath
                        ? resolveMediaUrl(product.imagePath)
                        : "";
                      return (
                        <div
                          key={item.key}
                          className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[64px_1fr_1fr_90px_auto]"
                          onKeyDown={(event) => handleItemRowKeyDown(event, item.key)}
                        >
                          <div className="bg-muted flex size-16 items-center justify-center overflow-hidden rounded-lg border">
                            {imageSrc ? (
                              <img src={imageSrc} alt="" className="size-full object-cover" />
                            ) : (
                              <ImageIcon className="text-muted-foreground size-4" />
                            )}
                          </div>
                          <EnumSelect
                            id={`product-${item.key}`}
                            label="Product"
                            value={item.productId}
                            onValueChange={(value) =>
                              updateItem(item.key, { productId: value, variationId: "" })
                            }
                            options={catalog.map((row) => ({
                              value: row._id,
                              label: row.name,
                            }))}
                            required
                            placeholder={catalog.length ? "Select product" : "No products"}
                            focusOpenToken={
                              productFocusToken?.startsWith(`${item.key}:`)
                                ? productFocusToken
                                : null
                            }
                            onOpenChange={(open) => {
                              // One-shot assist only — clear token after dismiss or select.
                              if (
                                !open &&
                                productFocusToken?.startsWith(`${item.key}:`)
                              ) {
                                setProductFocusToken(null);
                              }
                            }}
                            onEnterWhenClosed={() => handleItemEnter(item.key)}
                          />
                          {product?.hasVariations ? (
                            <EnumSelect
                              id={`variation-${item.key}`}
                              label="Variation"
                              value={item.variationId}
                              onValueChange={(value) =>
                                updateItem(item.key, { variationId: value })
                              }
                              options={product.variations.map((row) => ({
                                value: row._id,
                                label: `${row.name} · ${formatMoney(row.price, groupCurrency)}`,
                              }))}
                              required
                              autoOpenOnFocus
                              onEnterWhenClosed={() => handleItemEnter(item.key)}
                            />
                          ) : (
                            <FormField
                              id={`price-${item.key}`}
                              label="Price"
                              value={product ? formatMoney(product.basePrice, groupCurrency) : "—"}
                              disabled
                            />
                          )}
                          <FormField
                            id={`qty-${item.key}`}
                            label="Qty"
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(item.key, { quantity: event.target.value })
                            }
                            onKeyDown={(event) => handleQtyKeyDown(event, item.key)}
                            required
                          />
                          <div className="flex items-end">
                            <PermissionIconButton
                              modulePath={MODULE_PATH}
                              action="create"
                              label="Remove item"
                              variant="destructive"
                              icon={<Trash2 />}
                              tabIndex={-1}
                              onClick={() => removeItemRow(item.key)}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Order details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                  <FormField
                    id="order-customer-name"
                    label="Customer name"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Walk-in customer name"
                    required
                    autoComplete="off"
                  />
                  <EnumSelect
                    id="order-payment-method"
                    label="Payment via"
                    value={paymentMethod}
                    onValueChange={(value) => setPaymentMethod(value as OrderPaymentMethod)}
                    options={paymentOptions}
                    required
                    autoOpenOnFocus
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 lg:sticky lg:top-4">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Est. subtotal</span>
                    <span className="font-medium">
                      {formatMoney(estimatedSubtotal, groupCurrency)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="order-discount" className="text-muted-foreground">
                        Discount
                      </label>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="border-input bg-muted/40 inline-flex h-8 rounded-lg border p-0.5"
                          role="group"
                          aria-label="Discount type"
                        >
                          <button
                            type="button"
                            className={`rounded-md px-2 text-xs font-medium transition-colors ${
                              discountMode === "fixed"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            onClick={() => {
                              setDiscountMode("fixed");
                              const current = Number(discountInput);
                              if (
                                Number.isFinite(current) &&
                                current > estimatedSubtotal
                              ) {
                                setDiscountInput(String(roundMoney(estimatedSubtotal)));
                              }
                            }}
                          >
                            {groupCurrency}
                          </button>
                          <button
                            type="button"
                            className={`rounded-md px-2 text-xs font-medium transition-colors ${
                              discountMode === "percent"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            onClick={() => {
                              setDiscountMode("percent");
                              const current = Number(discountInput);
                              if (Number.isFinite(current) && current > 100) {
                                setDiscountInput("100");
                              }
                            }}
                          >
                            %
                          </button>
                        </div>
                        <input
                          id="order-discount"
                          type="number"
                          min={0}
                          max={
                            discountMode === "percent"
                              ? 100
                              : estimatedSubtotal || undefined
                          }
                          step={discountMode === "percent" ? "1" : "0.01"}
                          inputMode="decimal"
                          placeholder="0"
                          value={discountInput}
                          onChange={(event) => {
                            const next = event.target.value;
                            if (next === "") {
                              setDiscountInput("");
                              return;
                            }
                            const num = Number(next);
                            if (!Number.isFinite(num)) {
                              setDiscountInput(next);
                              return;
                            }
                            if (discountMode === "percent" && num > 100) {
                              setDiscountInput("100");
                              return;
                            }
                            if (discountMode === "fixed" && num > estimatedSubtotal) {
                              setDiscountInput(String(roundMoney(estimatedSubtotal)));
                              return;
                            }
                            setDiscountInput(next);
                          }}
                          className="border-input bg-background h-8 w-20 rounded-lg border px-2 text-right text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        />
                      </div>
                    </div>
                    {discountAmount > 0 && discountMode === "percent" ? (
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">
                          {Math.min(discountValue, 100)}% off
                        </span>
                        <span>−{formatMoney(discountAmount, groupCurrency)}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t pt-3">
                    <span className="font-medium">Total due</span>
                    <span className="font-semibold">
                      {formatMoney(preview.total, groupCurrency)}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {loyalty.loyaltyEnabled && preview.pointsEarned > 0
                      ? `About ${preview.pointsEarned} points when completed. Customer is saved for analytics.`
                      : loyalty.loyaltyEnabled
                        ? "Customer is saved to this group for order history and analytics."
                        : "Customer is saved to this group for order history and analytics. Loyalty is off."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Order fields</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 pt-4">
                  {!businessId ? (
                    <p className="text-sm text-muted-foreground">
                      Select a business to load its order fields.
                    </p>
                  ) : schemaLoading ? (
                    <p className="text-sm text-muted-foreground">Loading fields...</p>
                  ) : visibleAdminFields(schemaFields).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No extra fields for this business.</p>
                  ) : (
                    <DynamicEntityFields
                      fields={schemaFields}
                      values={formValues}
                      onChange={updateFormField}
                      idPrefix="order-create"
                    />
                  )}
                </CardContent>
              </Card>

              <PermissionButton
                modulePath={MODULE_PATH}
                action="create"
                type="submit"
                className="w-full"
                disabled={saving || schemaLoading || !businessId}
              >
                {saving ? "Creating..." : "Create order"}
              </PermissionButton>
            </div>
          </div>
        </form>

        <OrderCreateSuccessDialog
          open={Boolean(successOrder)}
          order={successOrder}
          checkoutUrl={successCheckoutUrl}
          businessName={branchOptions.find((row) => row.id === businessId)?.name}
          onAddNew={handleSuccessAddNew}
          onViewDetail={handleSuccessViewDetail}
          onOpenChange={(open) => {
            if (!open) {
              // Closing without "Add new" still clears the form so the next order is clean.
              handleSuccessAddNew();
            }
          }}
        />
      </PageShell>
    </RequirePermission>
  );
}
