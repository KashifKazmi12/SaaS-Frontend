import { Bell, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationChannelTogglesProps {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  onInAppChange: (enabled: boolean) => void;
  onEmailChange: (enabled: boolean) => void;
}

export function NotificationChannelToggles({
  inAppEnabled,
  emailEnabled,
  onInAppChange,
  onEmailChange,
}: NotificationChannelTogglesProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onInAppChange(!inAppEnabled)}
        className={cn(
          "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
          inAppEnabled
            ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
            : "border-border bg-card hover:bg-muted/40"
        )}
      >
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            inAppEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <Bell className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">In-app</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Shows in the notification bell for signed-in users.
          </p>
          <p className="mt-2 text-xs font-medium text-primary">
            {inAppEnabled ? "Enabled" : "Disabled"}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onEmailChange(!emailEnabled)}
        className={cn(
          "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
          emailEnabled
            ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
            : "border-border bg-card hover:bg-muted/40"
        )}
      >
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            emailEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <Mail className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Email</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sends through your configured SMTP provider.
          </p>
          <p className="mt-2 text-xs font-medium text-primary">
            {emailEnabled ? "Enabled" : "Disabled"}
          </p>
        </div>
      </button>
    </div>
  );
}
