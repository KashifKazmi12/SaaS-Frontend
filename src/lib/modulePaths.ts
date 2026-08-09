export const MODULE_PATHS = {
  BUSINESS_GROUPS: "/businesses/groups",
  BUSINESSES_LIST: "/businesses/list",
  CATALOG_PRODUCTS: "/catalog/products",
  CATALOG_CATEGORIES: "/catalog/categories",
  SETTINGS_MODULES: "/settings/modules",
  SETTINGS_ROLES: "/settings/roles",
  SETTINGS_USERS: "/settings/users",
  SETTINGS_THEMES: "/settings/themes",
  SETTINGS_NOTIFICATIONS: "/settings/notifications",
} as const;

export type ModulePath = (typeof MODULE_PATHS)[keyof typeof MODULE_PATHS];

export const MODULE_PAGE_TITLES: Record<ModulePath, string> = {
  [MODULE_PATHS.BUSINESS_GROUPS]: "Business Groups",
  [MODULE_PATHS.BUSINESSES_LIST]: "All Businesses",
  [MODULE_PATHS.CATALOG_PRODUCTS]: "Products",
  [MODULE_PATHS.CATALOG_CATEGORIES]: "Categories",
  [MODULE_PATHS.SETTINGS_MODULES]: "Modules",
  [MODULE_PATHS.SETTINGS_ROLES]: "Roles",
  [MODULE_PATHS.SETTINGS_USERS]: "System Users",
  [MODULE_PATHS.SETTINGS_THEMES]: "My Theme",
  [MODULE_PATHS.SETTINGS_NOTIFICATIONS]: "Notifications",
};

export function getPageTitle(pathname: string): string {
  const match = Object.entries(MODULE_PAGE_TITLES).find(([path]) => pathname.startsWith(path));
  return match?.[1] || "Dashboard";
}
