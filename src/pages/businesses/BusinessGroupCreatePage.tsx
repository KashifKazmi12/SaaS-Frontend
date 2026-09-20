import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  LoyaltySettingsFields,
  emptyLoyaltyForm,
  loyaltyPayloadFromForm,
  type LoyaltyFormState,
} from "@/components/business/LoyaltySettingsFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GROUP_CURRENCY_OPTIONS,
  type GroupCurrency,
} from "@/constants/commerce";
import { MODULE_PATHS } from "@/lib/modulePaths";

const MODULE_PATH = MODULE_PATHS.BUSINESS_GROUPS;

const STOREFRONT_THEME_OPTIONS = [
  { value: "marketplace", label: "Marketplace" },
  { value: "dining", label: "Dining" },
] as const;

export default function BusinessGroupCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [logoPath, setLogoPath] = useState("");
  const [storefrontTheme, setStorefrontTheme] = useState<"marketplace" | "dining">(
    "marketplace"
  );
  const [currency, setCurrency] = useState<GroupCurrency>("PKR");
  const [loyalty, setLoyalty] = useState<LoyaltyFormState>(emptyLoyaltyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await api.createBusinessGroup({
        name: name.trim(),
        code,
        description,
        logoPath,
        storefrontTheme,
        currency,
        ...loyaltyPayloadFromForm(loyalty),
      });
      setMessage("Business group created.");
      navigate(`${MODULE_PATH}/${created._id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create business group.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequirePermission path={MODULE_PATH} action="create">
      <PageShell
        title="Create business group"
        description="Set the currency for every branch in this group. Card checkout is configured once in Settings → Payments."
        action={
          <Button type="button" variant="outline" onClick={() => navigate(MODULE_PATH)}>
            <ArrowLeft className="size-4" />
            Back to groups
          </Button>
        }
      >
        <PageAlerts error={error} message={message} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-start">
            <div className="space-y-4">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Group details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                  <FormField
                    id="group-name"
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <FormField
                    id="group-code"
                    label="Code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <FormField
                    id="group-description"
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                  />
                  <EnumSelect
                    id="group-currency"
                    label="Currency"
                    value={currency}
                    onValueChange={(value) => setCurrency(value as GroupCurrency)}
                    options={[...GROUP_CURRENCY_OPTIONS]}
                    required
                  />
                  <div className="sm:col-span-2">
                    <FileUploadField
                      id="group-logo"
                      label="Logo"
                      mode="single"
                      folder="groups"
                      value={logoPath}
                      onChange={setLogoPath}
                      recommendedSize={{
                        width: 512,
                        height: 512,
                        tip: "Square logos look sharp in the storefront header.",
                      }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs sm:col-span-2">
                    One currency applies to every business in this group.
                  </p>
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
                <CardContent className="space-y-3 pt-4 text-sm">
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
                </CardContent>
              </Card>

              <PermissionButton
                modulePath={MODULE_PATH}
                action="create"
                type="submit"
                className="w-full"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create group"}
              </PermissionButton>
            </div>
          </div>
        </form>
      </PageShell>
    </RequirePermission>
  );
}
