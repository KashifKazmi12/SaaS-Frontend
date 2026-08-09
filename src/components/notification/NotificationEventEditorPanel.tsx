import { useEffect, useMemo, useState } from "react";
import { Eye, Mail, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { BusinessMultiSelect } from "@/components/business";
import { NotificationChannelToggles } from "@/components/notification/NotificationChannelToggles";
import { NotificationSendTestDialog } from "@/components/notification/NotificationSendTestDialog";
import { NotificationEmailPreviewDialog } from "@/components/notification/NotificationEmailPreviewDialog";
import { NotificationInAppPreview } from "@/components/notification/NotificationInAppPreview";
import { NotificationVariablesPanel } from "@/components/notification/NotificationVariablesPanel";
import { FormField, PageAlerts, PermissionButton } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { NotificationEventListItem } from "@/types";

const MODULE_PATH = MODULE_PATHS.SETTINGS_NOTIFICATIONS;

type EditorTab = "content" | "clone";

interface NotificationEventEditorPanelProps {
  item: NotificationEventListItem | null;
  businessId: string;
  isSuperAdmin: boolean;
  onSaved: () => Promise<void>;
}

export function NotificationEventEditorPanel({
  item,
  businessId,
  isSuperAdmin,
  onSaved,
}: NotificationEventEditorPanelProps) {
  const [tab, setTab] = useState<EditorTab>("content");
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppTemplate, setInAppTemplate] = useState("");
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState("");
  const [emailBodyTemplate, setEmailBodyTemplate] = useState("");
  const [cloneBusinessIds, setCloneBusinessIds] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testError, setTestError] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!item) return;

    setTab("content");
    setInAppEnabled(item.setting.inAppEnabled);
    setEmailEnabled(item.setting.emailEnabled);
    setInAppTemplate(item.setting.inAppTemplate);
    setEmailSubjectTemplate(item.setting.emailSubjectTemplate);
    setEmailBodyTemplate(item.setting.emailBodyTemplate);
    setCloneBusinessIds([]);
    setError("");
    setMessage("");
  }, [item]);

  const previewTitle = useMemo(() => item?.event.name || "Notification", [item]);

  if (!item) {
    return (
      <Card className="flex min-h-[520px] items-center justify-center border-dashed">
        <CardContent className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Sparkles className="size-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-base">Select a notification event</CardTitle>
          <CardDescription className="mt-2">
            Choose an event from the list to configure channels, message text, and previews.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  const currentItem = item;

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.updateNotificationEventSettings(
        currentItem.event._id,
        {
          inAppEnabled,
          emailEnabled,
          inAppTemplate,
          emailSubjectTemplate,
          emailBodyTemplate,
        },
        businessId || undefined
      );
      setMessage("Settings saved.");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save notification settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreviewEmail() {
    setError("");
    try {
      const preview = await api.previewNotificationEvent(
        currentItem.event._id,
        {},
        businessId || undefined,
        {
          inAppTemplate,
          emailSubjectTemplate,
          emailBodyTemplate,
        }
      );
      setPreviewSubject(preview.email.subject);
      setPreviewHtml(preview.email.html);
      setPreviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to preview email.");
    }
  }

  async function handleSendTest(recipientEmail: string) {
    setTesting(true);
    setTestError("");
    setTestMessage("");

    try {
      const response = await api.sendTestNotificationEvent(currentItem.event._id, {
        businessId: businessId || undefined,
        businessName: currentItem.business?.name || "Core System",
        recipientEmail,
      });
      setTestMessage(response.message);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Unable to send test notification.");
    } finally {
      setTesting(false);
    }
  }

  function openTestDialog() {
    setTestError("");
    setTestMessage("");
    setTestDialogOpen(true);
  }

  async function handleClone() {
    if (cloneBusinessIds.length === 0) {
      setError("Select at least one business to clone settings into.");
      return;
    }

    setCloning(true);
    setError("");
    setMessage("");

    try {
      await api.cloneNotificationEvent(currentItem.event._id, cloneBusinessIds);
      setMessage("Settings cloned to selected businesses.");
      setCloneBusinessIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clone notification settings.");
    } finally {
      setCloning(false);
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="space-y-4 border-b bg-muted/20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{currentItem.event.name}</CardTitle>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {currentItem.event.key}
                </Badge>
                {currentItem.hasBusinessOverride && <Badge variant="secondary">Override</Badge>}
              </div>
              <CardDescription>{currentItem.event.description}</CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handlePreviewEmail}>
                <Eye className="mr-1 size-4" />
                Preview email
              </Button>
              <PermissionButton
                modulePath={MODULE_PATH}
                action="update"
                variant="outline"
                size="sm"
                disabled={!emailEnabled}
                onClick={openTestDialog}
              >
                <Send className="mr-1 size-4" />
                Send test
              </PermissionButton>
              <PermissionButton
                modulePath={MODULE_PATH}
                action="update"
                size="sm"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Saving..." : "Save changes"}
              </PermissionButton>
            </div>
          </div>

          <div className="inline-flex rounded-lg border bg-background p-1">
            <Button
              type="button"
              size="sm"
              variant={tab === "content" ? "default" : "ghost"}
              onClick={() => setTab("content")}
            >
              Content
            </Button>
            {isSuperAdmin && (
              <Button
                type="button"
                size="sm"
                variant={tab === "clone" ? "default" : "ghost"}
                onClick={() => setTab("clone")}
              >
                Clone
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <PageAlerts error={error} message={message} />

          {tab === "content" ? (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <NotificationChannelToggles
                  inAppEnabled={inAppEnabled}
                  emailEnabled={emailEnabled}
                  onInAppChange={setInAppEnabled}
                  onEmailChange={setEmailEnabled}
                />

                <div className="space-y-4 rounded-xl border p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <p className="text-sm font-medium">Message content</p>
                  </div>

                  <NotificationVariablesPanel variables={currentItem.event.variables} compact />

                  <div className="space-y-2">
                    <Label htmlFor="in-app-template">In-app message</Label>
                    <Textarea
                      id="in-app-template"
                      value={inAppTemplate}
                      onChange={(event) => setInAppTemplate(event.target.value)}
                      rows={4}
                      className="resize-y"
                    />
                  </div>

                  <FormField
                    id="email-subject"
                    label="Email subject"
                    value={emailSubjectTemplate}
                    onChange={(event) => setEmailSubjectTemplate(event.target.value)}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="email-body">Email message</Label>
                    <Textarea
                      id="email-body"
                      value={emailBodyTemplate}
                      onChange={(event) => setEmailBodyTemplate(event.target.value)}
                      rows={8}
                      className="resize-y font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <NotificationInAppPreview title={previewTitle} body={inAppTemplate} />

                <Card>
                  <CardHeader className="border-b py-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="size-4" />
                      Email subject preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium">
                      {emailSubjectTemplate || "Your email subject will appear here."}
                    </p>
                    <p className="mt-3 line-clamp-6 text-xs leading-relaxed text-muted-foreground">
                      {emailBodyTemplate || "Your email body preview will appear here."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <NotificationVariablesPanel variables={currentItem.event.variables} />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-4 rounded-xl border border-dashed p-6">
              <div>
                <p className="text-sm font-medium">Clone to businesses</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Copy the current settings into one or more businesses. Existing business overrides
                  will be replaced.
                </p>
              </div>
              <BusinessMultiSelect
                scope="all"
                value={cloneBusinessIds}
                onValueChange={setCloneBusinessIds}
                placeholder="Select businesses"
              />
              <PermissionButton
                modulePath={MODULE_PATH}
                action="create"
                disabled={cloning}
                onClick={handleClone}
              >
                {cloning ? "Cloning..." : "Clone settings"}
              </PermissionButton>
            </div>
          )}
        </CardContent>
      </Card>

      <NotificationEmailPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        subject={previewSubject}
        html={previewHtml}
      />

      <NotificationSendTestDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        eventName={currentItem.event.name}
        emailEnabled={emailEnabled}
        inAppEnabled={inAppEnabled}
        sending={testing}
        error={testError}
        message={testMessage}
        onSend={handleSendTest}
      />
    </>
  );
}
