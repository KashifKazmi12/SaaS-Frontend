import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ChevronDown,
  LayoutGrid,
  LayoutDashboard,
  BarChart3,
  Building2,
  Package,
  PanelLeftClose,
  PanelLeft,
  Recycle,
  Settings2,
  Bell,
  Users,
  ShoppingBag,
  Warehouse,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<string, typeof Package> = {
  Dashboard: LayoutDashboard,
  Reports: BarChart3,
  Businesses: Building2,
  Catalog: Package,
  Products: Package,
  Customers: Users,
  Orders: ShoppingBag,
  Stock: Warehouse,
  "Recycle Bin": Recycle,
  Settings: Settings2,
  Notifications: Bell,
  Payments: CreditCard,
};

const STORAGE_KEY = "core-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function SidebarTip({
  collapsed,
  label,
  children,
}: {
  collapsed: boolean;
  label: string;
  children: ReactNode;
}) {
  if (!collapsed) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={<div className="w-full" />}>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const { navigation } = useAuth();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    setExpanded((current) => {
      const next = { ...current };

      for (const item of navigation) {
        const childActive = item.children.some((child) =>
          location.pathname.startsWith(child.path)
        );
        if (childActive) {
          next[item.id] = true;
        }
      }

      return next;
    });
  }, [location.pathname, navigation]);

  function toggleCollapsed() {
    setCollapsed((current) => !current);
  }

  function toggleExpanded(id: string, childActive: boolean) {
    if (collapsed) {
      setCollapsed(false);
      setExpanded((current) => ({ ...current, [id]: true }));
      return;
    }
    setExpanded((current) => {
      const currentlyOpen = current[id] ?? childActive;
      return {
        ...current,
        [id]: !currentlyOpen,
      };
    });
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 py-5",
            collapsed ? "justify-center px-2" : "px-5"
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <LayoutGrid className="size-4" />
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-sidebar-foreground/60">
                Workspace
              </p>
              <h1 className="truncate text-base font-semibold text-sidebar-foreground">
                Core System
              </h1>
            </div>
          ) : null}
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto p-2">
          {navigation.map((item) => {
            const Icon = MODULE_ICONS[item.name] || LayoutGrid;
            const hasChildren = item.children.length > 0;
            const childActive = item.children.some((child) =>
              location.pathname.startsWith(child.path)
            );
            const parentActive =
              !hasChildren &&
              (location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`));
            const isExpanded = !collapsed && (expanded[item.id] ?? childActive);
            const active = parentActive || childActive;

            const rowClassName = cn(
              "flex w-full items-center rounded-lg text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0 py-2.5" : "gap-2 px-3 py-2",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent/70"
            );

            const iconEl = <Icon className="size-4 shrink-0 opacity-80" />;

            const row = hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpanded(item.id, childActive)}
                className={rowClassName}
                aria-expanded={isExpanded}
                aria-label={item.name}
              >
                {iconEl}
                {!collapsed ? (
                  <>
                    <span className="flex-1 text-left">{item.name}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 opacity-70 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </>
                ) : null}
              </button>
            ) : (
              <NavLink to={item.path} className={rowClassName} aria-label={item.name}>
                {iconEl}
                {!collapsed ? item.name : null}
              </NavLink>
            );

            return (
              <div key={item.id} className="space-y-1">
                <SidebarTip collapsed={collapsed} label={item.name}>
                  {row}
                </SidebarTip>

                {hasChildren && isExpanded ? (
                  <div className="ml-4 space-y-1 border-l border-sidebar-border pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.id}
                        to={child.path}
                        className={({ isActive }) =>
                          cn(
                            "block rounded-lg px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                          )
                        }
                      >
                        {child.name}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div
          className={cn(
            "border-t border-sidebar-border p-2",
            collapsed && "flex justify-center"
          )}
        >
          <SidebarTip collapsed={collapsed} label="Expand sidebar">
            <Button
              type="button"
              variant="ghost"
              size={collapsed ? "icon" : "default"}
              onClick={toggleCollapsed}
              className={cn(
                "text-sidebar-foreground hover:bg-sidebar-accent/70",
                !collapsed && "w-full justify-start gap-2"
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeft className="size-4" />
              ) : (
                <>
                  <PanelLeftClose className="size-4" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </SidebarTip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
