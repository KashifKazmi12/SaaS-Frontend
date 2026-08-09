import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { InAppNotificationRecord } from "@/types";

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleDateString();
}

export function NotificationInboxMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InAppNotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await api.getUnreadNotificationCount();
      setUnreadCount(data.unreadCount);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getInboxNotifications(1, 10);
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = window.setInterval(loadUnreadCount, 60000);
    return () => window.clearInterval(interval);
  }, [loadUnreadCount]);

  useEffect(() => {
    if (open) {
      loadInbox();
    }
  }, [open, loadInbox]);

  async function handleOpenNotification(notification: InAppNotificationRecord) {
    if (!notification.read) {
      await api.markNotificationRead(notification._id);
      setItems((current) =>
        current.map((item) =>
          item._id === notification._id ? { ...item, read: true } : item
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }
  }

  async function handleMarkAllRead() {
    await api.markAllNotificationsRead();
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon-sm" aria-label="Notifications" className="relative" />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px] overflow-hidden p-0">
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="mr-1 size-4" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
                <Bell className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                New in-app alerts will show up here.
              </p>
            </div>
          ) : (
            items.map((notification) => (
              <DropdownMenuItem
                key={notification._id}
                className="block cursor-pointer rounded-none border-b px-0 py-0 focus:bg-transparent"
                onClick={() => handleOpenNotification(notification)}
              >
                <div
                  className={cn(
                    "flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bell className="size-4" />
                    {!notification.read && (
                      <span className="absolute top-0 right-0 size-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          notification.read ? "font-normal" : "font-semibold"
                        )}
                      >
                        {notification.title}
                      </p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {notification.body}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
