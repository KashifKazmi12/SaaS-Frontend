import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  EnumSelect,
  FileUploadField,
  FormField,
  PageAlerts,
  PermissionButton,
} from "@/components/shared";
import { LoyaltySettingsFields, emptyLoyaltyForm, loyaltyFormFromGroup, loyaltyPayloadFromForm, type LoyaltyFormState } from "@/components/business/LoyaltySettingsFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GROUP_CURRENCY_OPTIONS,
  type GroupCurrency,
} from "@/constants/commerce";
import { MODULE_PATHS } from "@/lib/modulePaths";
import { useAuth } from "@/context/AuthContext";
import type { BusinessGroupRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.BUSINESS_GROUPS;

const STOREFRONT_THEME_OPTIONS = [
  { value: "marketplace", label: "Marketplace" },
  { value: "dining", label: "Dining" },
] as const;

function normalizeCurrency(value?: string): GroupCurrency {
  return GROUP_CURRENCY_OPTIONS.some((option) => option.value === value)
    ? (value as GroupCurrency)
    : "PKR";
}

export default function BusinessGroupDetailPage() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const canUpdate = can(MODULE_PATH, "update");

  const [group, setGroup] = useState<BusinessGroupRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [storefrontTheme, setStorefrontTheme] = useState<"marketplace" | "dining">(
    "marketplace"
  );
  const [currency, setCurrency] = useState<GroupCurrency>("PKR");
  const [isActive, setIsActive] = useState(true);
  const [loyalty, setLoyalty] = useState<LoyaltyFormState>(emptyLoyaltyForm());

  function applyGroup(data: BusinessGroupRecord) {
    setGroup(data);
    setName(data.name || "");
    setCode(data.code || "");
    setDescription(data.description || "");
    setLogoPath(data.logoPath || "");
    setStorefrontTheme(data.storefrontTheme === "dining" ? "dining" : "marketplace");
    setCurrency(normalizeCurrency(data.currency));
    setIsActive(data.isActive !== false);
    setLoyalty(loyaltyFormFromGroup(data));
  }

  async function loadGroup() {
    if (!groupId) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.getBusinessGroup(groupId);
      applyGroup(data);
    } catch (err) {
      setGroup(null);
      setError(err instanceof Error ? err.message : "Unable to load business group.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!group || !canUpdate) return;
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await api.updateBusinessGroup(group._id, {
        name: name.trim(),
        code,
        description,
        logoPath,
        storefrontTheme,
        currency,
        isActive,
        ...loyaltyPayloadFromForm(loyalty),
      });
      applyGroup(updated);
      setMessage("Business group saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save business group.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell
        title={group ? group.name : "Business group"}
        description={
          canUpdate
            ? "Currency applies to all branches. Card checkout is platform Stripe."
            : "View this group. You do not have permission to edit."
        }
        action={
          <Button type="button" variant="outline" onClick={() => navigate(MODULE_PATH)}>
            <ArrowLeft className="size-4" />
            Back to groups
          </Button>
        }
      >
        <PageAlerts error={error} message={message} />

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading business group...</p>
        ) : !group ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Business group not found.
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-start">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="border-b">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle>Group details</CardTitle>
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                    <FormField
                      id="group-name"
                      label="Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={!canUpdate}
                    />
                    <FormField
                      id="group-code"
                      label="Code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={!canUpdate}
                    />
                    <FormField
                      id="group-description"
                      label="Description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={!canUpdate}
                      containerClassName="sm:col-span-2"
                    />
                    <EnumSelect
                      id="group-theme"
                      label="Customer app theme"
                      value={storefrontTheme}
                      onValueChange={(value) =>
                        setStorefrontTheme(value === "dining" ? "dining" : "marketplace")
                      }
                      options={[...STOREFRONT_THEME_OPTIONS]}
                      required
                      disabled={!canUpdate}
                    />
                    <EnumSelect
                      id="group-currency"
                      label="Currency"
                      value={currency}
                      onValueChange={(value) => setCurrency(value as GroupCurrency)}
                      options={[...GROUP_CURRENCY_OPTIONS]}
                      required
                      disabled={!canUpdate}
                    />
                    <div className="sm:col-span-2">
                      <FileUploadField
                        id="group-logo"
                        label="Logo"
                        mode="single"
                        folder="groups"
                        value={logoPath}
                        onChange={setLogoPath}
                        disabled={!canUpdate}
                        recommendedSize={{
                          width: 512,
                          height: 512,
                          tip: "Square logos look sharp in the storefront header.",
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b">
                    <CardTitle>Loyalty points</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <LoyaltySettingsFields
                      value={loyalty}
                      onChange={(patch) => setLoyalty((current) => ({ ...current, ...patch }))}
                      disabled={!canUpdate}
                      currency={currency}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4 lg:sticky lg:top-4">
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="font-medium">{currency}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Theme</span>
                      <span className="font-medium">
                        {storefrontTheme === "dining" ? "Dining" : "Marketplace"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Loyalty</span>
                      <span className="font-medium">
                        {loyalty.loyaltyEnabled ? "On" : "Off"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Status</span>
                      {canUpdate ? (
                        <div className="inline-flex rounded-lg border p-0.5">
                          <button
                            type="button"
                            onClick={() => setIsActive(true)}
                            className={
                              isActive
                                ? "rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background"
                                : "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                            }
                          >
                            Active
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsActive(false)}
                            className={
                              !isActive
                                ? "rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background"
                                : "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                            }
                          >
                            Inactive
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium">{isActive ? "Active" : "Inactive"}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {canUpdate ? (
                  <PermissionButton
                    modulePath={MODULE_PATH}
                    action="update"
                    type="submit"
                    className="w-full"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save group"}
                  </PermissionButton>
                ) : null}
              </div>
            </div>
          </form>
        )}
      </PageShell>
    </RequirePermission>
  );
}
