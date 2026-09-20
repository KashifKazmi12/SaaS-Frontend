import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, LayoutGrid, LayoutDashboard, BarChart3, Building2, Package, Recycle, Settings2, Bell, Users, ShoppingBag, Warehouse, CreditCard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Separator } from "@/components/ui/separator";
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

export function Sidebar() {
  const { navigation } = useAuth();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  function toggleExpanded(id: string, childActive: boolean) {
    setExpanded((current) => {
      const currentlyOpen = current[id] ?? childActive;
      return {
        ...current,
        [id]: !currentlyOpen,
      };
    });
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <LayoutGrid className="size-4" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-sidebar-foreground/60">Workspace</p>
          <h1 className="text-base font-semibold text-sidebar-foreground">Core System</h1>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.map((item) => {
          const Icon = MODULE_ICONS[item.name] || LayoutGrid;
          const hasChildren = item.children.length > 0;
          const childActive = item.children.some((child) =>
            location.pathname.startsWith(child.path)
          );
          const parentActive =
            !hasChildren &&
            (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));
          const isExpanded = expanded[item.id] ?? childActive;

          const rowClassName = cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            parentActive || childActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent/70"
          );

          return (
            <div key={item.id} className="space-y-1">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpanded(item.id, childActive)}
                  className={rowClassName}
                  aria-expanded={isExpanded}
                >
                  <Icon className="size-4 shrink-0 opacity-80" />
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 opacity-70 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
              ) : (
                <NavLink to={item.path} className={rowClassName}>
                  <Icon className="size-4 shrink-0 opacity-80" />
                  {item.name}
                </NavLink>
              )}

              {hasChildren && isExpanded && (
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
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
