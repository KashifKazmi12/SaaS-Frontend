import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { FormField } from "@/components/shared/FormField";
import { PageAlerts } from "@/components/shared/PageAlerts";
import { formatAssignedBusinesses } from "@/lib/business";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name);
    setEmail(user.email || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setMessage("");
  }, [open, user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        ...(newPassword
          ? {
              password: newPassword,
              currentPassword: currentPassword || undefined,
            }
          : {}),
      });
      setMessage("Profile updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update your personal details and password.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <PageAlerts error={error} message={message} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="profile-name"
              label="Full name"
              containerClassName="sm:col-span-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <FormField
              id="profile-username"
              label="Username"
              value={user?.username || ""}
              disabled
            />
            <FormField
              id="profile-role"
              label="Role"
              value={user?.isSuperAdmin ? "Super Admin" : user?.role?.name || "No role"}
              disabled
            />
            {!user?.isSuperAdmin && (
              <FormField
                id="profile-businesses"
                label="Businesses"
                containerClassName="sm:col-span-2"
                value={formatAssignedBusinesses(user?.businesses, "No businesses assigned")}
                disabled
              />
            )}
            <FormField
              id="profile-email"
              label="Email"
              type="email"
              containerClassName="sm:col-span-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <p className="text-sm font-medium">Change password</p>
            <FormField
              id="profile-current-password"
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required={Boolean(newPassword)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="profile-new-password"
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required={Boolean(newPassword)}
              />
              <FormField
                id="profile-confirm-password"
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={Boolean(newPassword)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
