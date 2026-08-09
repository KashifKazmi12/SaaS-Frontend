import { useEffect, useState, type FormEvent } from "react";
import { Mail, Send } from "lucide-react";
import { FormField, PageAlerts } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NotificationSendTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  sending: boolean;
  error: string;
  message: string;
  onSend: (recipientEmail: string) => Promise<void>;
}

export function NotificationSendTestDialog({
  open,
  onOpenChange,
  eventName,
  emailEnabled,
  inAppEnabled,
  sending,
  error,
  message,
  onSend,
}: NotificationSendTestDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState("");

  useEffect(() => {
    if (!open) return;
    setRecipientEmail("");
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSend(recipientEmail.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send test notification</DialogTitle>
          <DialogDescription>
            Send a test for <span className="font-medium text-foreground">{eventName}</span> to any
            email address you enter below.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <PageAlerts error={error} message={message} />

          <FormField
            id="test-recipient-email"
            type="email"
            label="Recipient email"
            placeholder="name@example.com"
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">What will be sent</p>
            <ul className="mt-2 space-y-1">
              <li className="flex items-center gap-2">
                <Mail className="size-3.5 shrink-0" />
                Email {emailEnabled ? `to ${recipientEmail || "the address above"}` : "(disabled)"}
              </li>
              <li>
                In-app {inAppEnabled ? "to your bell (logged-in account only)" : "(disabled)"}
              </li>
            </ul>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending || !recipientEmail.trim() || !emailEnabled}>
              <Send className="mr-1 size-4" />
              {sending ? "Sending..." : "Send test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
