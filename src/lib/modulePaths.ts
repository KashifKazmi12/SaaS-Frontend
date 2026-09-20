export const MODULE_PATHS = {
  DASHBOARD: "/dashboard",
  BUSINESS_GROUPS: "/businesses/groups",
  BUSINESSES_LIST: "/businesses/list",
  CATALOG_PRODUCTS: "/catalog/products",
  CATALOG_CATEGORIES: "/catalog/categories",
  CUSTOMERS: "/customers",
  ORDERS: "/orders",
  RECYCLE_BIN: "/recycle-bin",
  SETTINGS_MODULES: "/settings/modules",
  SETTINGS_ROLES: "/settings/roles",
  SETTINGS_USERS: "/settings/users",
  SETTINGS_THEMES: "/settings/themes",
  SETTINGS_NOTIFICATIONS: "/settings/notifications",
  SETTINGS_PAYMENTS: "/settings/payments",
  STOCK: "/stock",
} as const;

export type ModulePath = (typeof MODULE_PATHS)[keyof typeof MODULE_PATHS];

export const MODULE_PAGE_TITLES: Record<ModulePath, string> = {
  [MODULE_PATHS.DASHBOARD]: "Dashboard",
  [MODULE_PATHS.BUSINESS_GROUPS]: "Business Groups",
  [MODULE_PATHS.BUSINESSES_LIST]: "All Businesses",
  [MODULE_PATHS.CATALOG_PRODUCTS]: "Products",
  [MODULE_PATHS.CATALOG_CATEGORIES]: "Categories",
  [MODULE_PATHS.CUSTOMERS]: "Customers",
  [MODULE_PATHS.ORDERS]: "Orders",
  [MODULE_PATHS.RECYCLE_BIN]: "Recycle Bin",
  [MODULE_PATHS.STOCK]: "Stock",
  [MODULE_PATHS.SETTINGS_MODULES]: "Modules",
  [MODULE_PATHS.SETTINGS_ROLES]: "Roles",
  [MODULE_PATHS.SETTINGS_USERS]: "System Users",
  [MODULE_PATHS.SETTINGS_THEMES]: "My Theme",
  [MODULE_PATHS.SETTINGS_NOTIFICATIONS]: "Notifications",
  [MODULE_PATHS.SETTINGS_PAYMENTS]: "Payments",
};

export function getPageTitle(pathname: string): string {
  if (/^\/businesses\/list\/[^/]+\/settings/.test(pathname)) {
    return "Business settings";
  }
  if (pathname === "/businesses/groups/new") {
    return "Create business group";
  }
  if (/^\/businesses\/groups\/[^/]+$/.test(pathname)) {
    return "Business group";
  }
  const match = Object.entries(MODULE_PAGE_TITLES).find(([path]) => pathname.startsWith(path));
  return match?.[1] || "Dashboard";
}
