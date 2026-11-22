import { useEffect, useMemo, useState } from "react";
import { Bell, Building2, Mail, Search } from "lucide-react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import { BusinessSelect } from "@/components/business";
import { NotificationEventEditorPanel } from "@/components/notification/NotificationEventEditorPanel";
import { PageAlerts } from "@/components/shared";
import { useBusinessScopeState } from "@/hooks/useBusinessScope";
import { MODULE_PATHS } from "@/lib/modulePaths";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NotificationEventListItem } from "@/types";

const MODULE_PATH = MODULE_PATHS.SETTINGS_NOTIFICATIONS;
const PLATFORM_SCOPE = "";

const PLATFORM_DEFAULT_OPTION = { value: PLATFORM_SCOPE, label: "Platform default" };

export default function NotificationEventsPage() {
  const {
    businessId,
    setBusinessId,
    showPicker,
    singleAssignedBusiness,
    isSuperAdmin,
    scope,
    scopeLabel,
  } = useBusinessScopeState(PLATFORM_SCOPE);

  const [items, setItems] = useState<NotificationEventListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedItem = useMemo(
    () => items.find((item) => item.event._id === selectedId) || null,
    [items, selectedId]
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter(
      (item) =>
        item.event.name.toLowerCase().includes(query) ||
        item.event.key.toLowerCase().includes(query) ||
        item.event.description.toLowerCase().includes(query)
    );
  }, [items, search]);

  async function loadEvents(nextBusinessId = businessId) {
    setLoading(true);
    setError("");

    try {
      const data = await api.getNotificationEvents(nextBusinessId || undefined);
      setItems(data.items);
      setSelectedId((current) => {
        if (current && data.items.some((item) => item.event._id === current)) {
          return current;
        }
        return data.items[0]?.event._id || null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notification events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [businessId]);

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell>
        <PageAlerts error={error} />

        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Editing scope</p>
              <p className="text-xs text-muted-foreground">{scopeLabel}</p>
            </div>
          </div>

          <div className="w-full sm:max-w-xs">
            {showPicker ? (
              <BusinessSelect
                scope={scope}
                value={businessId}
                onValueChange={setBusinessId}
                visibility="always"
                extraOptions={isSuperAdmin ? [PLATFORM_DEFAULT_OPTION] : undefined}
                placeholder="Platform default"
                label=""
              />
            ) : (
              <Badge variant="secondary" className="h-8 px-3">
                {singleAssignedBusiness?.name || scopeLabel}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <CardContent className="space-y-3 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search events..."
                  className="pl-9"
                />
              </div>

              {loading ? (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                  Loading events...
                </p>
              ) : filteredItems.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                  No notification events found.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => {
                    const isSelected = item.event._id === selectedId;

                    return (
                      <button
                        key={item.event._id}
                        type="button"
                        onClick={() => setSelectedId(item.event._id)}
                        className={cn(
                          "w-full rounded-xl border p-3 text-left transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-transparent bg-muted/30 hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.event.name}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {item.event.description}
                            </p>
                          </div>
                          {item.hasBusinessOverride && (
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              Custom
                            </Badge>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Badge
                            variant={item.setting.inAppEnabled ? "default" : "secondary"}
                            className="gap-1 text-[10px]"
                          >
                            <Bell className="size-3" />
                            In-app
                          </Badge>
                          <Badge
                            variant={item.setting.emailEnabled ? "default" : "secondary"}
                            className="gap-1 text-[10px]"
                          >
                            <Mail className="size-3" />
                            Email
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <NotificationEventEditorPanel
            item={selectedItem}
            businessId={businessId}
            isSuperAdmin={isSuperAdmin}
            onSaved={loadEvents}
          />
        </div>
      </PageShell>
    </RequirePermission>
  );
}
