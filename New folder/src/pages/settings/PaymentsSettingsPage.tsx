import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import { FormCheckboxField, FormField, PageAlerts, PermissionButton } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { PlatformStripeSettings } from "@/constants/commerce";

const MODULE_PATH = MODULE_PATHS.SETTINGS_PAYMENTS;

const EMPTY: PlatformStripeSettings = {
  enabled: false,
  publishableKey: "",
  secretKeyConfigured: false,
  webhookSecretConfigured: false,
  testMode: true,
  stripeReady: false,
};

export default function PaymentsSettingsPage() {
  const [settings, setSettings] = useState(EMPTY);
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getPlatformPayments();
      setSettings(data);
      setPublishableKey(data.publishableKey || "");
      setEnabled(data.enabled);
      setTestMode(data.testMode);
      setSecretKey("");
      setWebhookSecret("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payment settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload: Record<string, unknown> = {
        enabled,
        testMode,
        publishableKey,
      };
      if (secretKey.trim()) payload.secretKey = secretKey.trim();
      if (webhookSecret.trim()) payload.webhookSecret = webhookSecret.trim();
      const data = await api.updatePlatformPayments(payload);
      setSettings(data);
      setPublishableKey(data.publishableKey || "");
      setEnabled(data.enabled);
      setTestMode(data.testMode);
      setSecretKey("");
      setWebhookSecret("");
      setMessage("Payment settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save payment settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="One Stripe account for every business. Card checkout uses these keys; collections are tracked per branch on each charge.">
        <PageAlerts error={error} message={message} />
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Stripe</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading payment settings...</p>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <FormCheckboxField
                  id="stripe-enabled"
                  label="Enable card checkout on the storefront"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
                <FormCheckboxField
                  id="stripe-test-mode"
                  label="Test mode"
                  checked={testMode}
                  onCheckedChange={setTestMode}
                />
                <FormField
                  id="stripe-publishable-key"
                  label="Publishable key"
                  value={publishableKey}
                  onChange={(event) => setPublishableKey(event.target.value)}
                  autoComplete="off"
                />
                <FormField
                  id="stripe-secret-key"
                  label="Secret key"
                  type="password"
                  value={secretKey}
                  onChange={(event) => setSecretKey(event.target.value)}
                  placeholder={settings.secretKeyConfigured ? "Saved — enter a new key to replace" : ""}
                  autoComplete="off"
                />
                <FormField
                  id="stripe-webhook-secret"
                  label="Webhook secret"
                  type="password"
                  value={webhookSecret}
                  onChange={(event) => setWebhookSecret(event.target.value)}
                  placeholder={
                    settings.webhookSecretConfigured ? "Saved — enter a new secret to replace" : ""
                  }
                  autoComplete="off"
                  help="In Stripe, add an endpoint to /api/stripe/webhook for checkout.session.completed and charge.refunded."
                />
                <p className="text-muted-foreground text-xs">
                  {settings.stripeReady
                    ? "Card checkout is ready. Customers can pay the remainder after points and store credit."
                    : "Card checkout stays hidden until this is enabled and both Stripe keys are saved."}
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
      </PageShell>
    </RequirePermission>
  );
}
