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
  ScrollText,
  Settings2,
  Bell,
  Users,
  ShoppingBag,
  Warehouse,
  CreditCard,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLayout } from "@/context/LayoutContext";
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
  "Activity Log": ScrollText,
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
  const { mobileNavOpen, closeMobileNav } = useLayout();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(readCollapsed);

  // On mobile the drawer is always labeled; desktop keeps collapse preference.
  const desktopCollapsed = collapsed;

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

  function toggleExpanded(id: string, childActive: boolean, isMobile: boolean) {
    if (!isMobile && desktopCollapsed) {
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

  function renderNav(isMobile: boolean) {
    const iconOnly = !isMobile && desktopCollapsed;

    return (
      <>
        <div
          className={cn(
            "flex items-center gap-3 py-5",
            iconOnly ? "justify-center px-2" : "px-5"
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <LayoutGrid className="size-4" />
          </div>
          {!iconOnly ? (
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-sidebar-foreground/60">
                Workspace
              </p>
              <h1 className="truncate text-base font-semibold text-sidebar-foreground">
                Core System
              </h1>
            </div>
          ) : null}
          {isMobile ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent/70"
              onClick={closeMobileNav}
              aria-label="Close menu"
            >
              <X className="size-4" />
            </Button>
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
            const isExpanded = !iconOnly && (expanded[item.id] ?? childActive);
            const active = parentActive || childActive;

            const rowClassName = cn(
              "flex w-full items-center rounded-lg text-sm font-medium transition-colors",
              iconOnly ? "justify-center px-0 py-2.5" : "gap-2 px-3 py-2.5",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent/70"
            );

            const iconEl = <Icon className="size-4 shrink-0 opacity-80" />;

            const row = hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpanded(item.id, childActive, isMobile)}
                className={rowClassName}
                aria-expanded={isExpanded}
                aria-label={item.name}
              >
                {iconEl}
                {!iconOnly ? (
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
              <NavLink
                to={item.path}
                className={rowClassName}
                aria-label={item.name}
                onClick={isMobile ? closeMobileNav : undefined}
              >
                {iconEl}
                {!iconOnly ? item.name : null}
              </NavLink>
            );

            return (
              <div key={item.id} className="space-y-1">
                <SidebarTip collapsed={iconOnly} label={item.name}>
                  {row}
                </SidebarTip>

                {hasChildren && isExpanded ? (
                  <div className="ml-4 space-y-1 border-l border-sidebar-border pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.id}
                        to={child.path}
                        onClick={isMobile ? closeMobileNav : undefined}
                        className={({ isActive }) =>
                          cn(
                            "block rounded-lg px-3 py-2.5 text-sm transition-colors",
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

        {!isMobile ? (
          <div
            className={cn(
              "border-t border-sidebar-border p-2",
              iconOnly && "flex justify-center"
            )}
          >
            <SidebarTip collapsed={iconOnly} label="Expand sidebar">
              <Button
                type="button"
                variant="ghost"
                size={iconOnly ? "icon" : "default"}
                onClick={toggleCollapsed}
                className={cn(
                  "text-sidebar-foreground hover:bg-sidebar-accent/70",
                  !iconOnly && "w-full justify-start gap-2"
                )}
                aria-label={iconOnly ? "Expand sidebar" : "Collapse sidebar"}
              >
                {iconOnly ? (
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
        ) : null}
      </>
    );
  }

  return (
    <TooltipProvider>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out md:flex",
          desktopCollapsed ? "w-16" : "w-64"
        )}
      >
        {renderNav(false)}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          mobileNavOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileNavOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity",
            mobileNavOpen ? "opacity-100" : "opacity-0"
          )}
          aria-label="Close menu"
          onClick={closeMobileNav}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 ease-out",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {renderNav(true)}
        </aside>
      </div>
    </TooltipProvider>
  );
}
