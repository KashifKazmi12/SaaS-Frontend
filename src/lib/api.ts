import { buildQuery, type ListQueryParams } from "@/lib/queryString";
import type { ListResponse, NamedOption } from "@/types";

/** Local: `/api` (Vite proxy). Production: full backend URL, e.g. https://api.example.com/api */
const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data as T;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  return parseResponse<T>(response);
}

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  return parseResponse<T>(response);
}

export const api = {
  login: (username: string, password: string) =>
    request<{ user: import("@/types").AuthUser; navigation: import("@/types").NavItem[] }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }
    ),

  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),

  me: () =>
    request<{ user: import("@/types").AuthUser; navigation: import("@/types").NavItem[] }>(
      "/auth/me"
    ),

  updateProfile: (payload: Record<string, unknown>) =>
    request<{ user: import("@/types").AuthUser; navigation: import("@/types").NavItem[] }>(
      "/auth/profile",
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    ),

  getModules: (params?: ListQueryParams) =>
    request<ListResponse<import("@/types").ModuleRecord>>(`/modules${buildQuery(params)}`),

  getModuleOptions: () =>
    request<{ items: import("@/types").ModuleRecord[] }>("/modules/options"),

  createModule: (payload: Record<string, unknown>) =>
    request<import("@/types").ModuleRecord>("/modules", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateModule: (id: string, payload: Record<string, unknown>) =>
    request<import("@/types").ModuleRecord>(`/modules/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteModule: (id: string) =>
    request<{ message: string }>(`/modules/${id}`, { method: "DELETE" }),

  getRoles: (params?: ListQueryParams) =>
    request<ListResponse<import("@/types").RoleRecord>>(`/roles${buildQuery(params)}`),

  getRoleOptions: () => request<{ items: NamedOption[] }>("/roles/options"),

  createRole: (payload: Record<string, unknown>) =>
    request<import("@/types").RoleRecord>("/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateRole: (id: string, payload: Record<string, unknown>) =>
    request<import("@/types").RoleRecord>(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteRole: (id: string) =>
    request<{ message: string }>(`/roles/${id}`, { method: "DELETE" }),

  getUsers: (params?: ListQueryParams) =>
    request<ListResponse<import("@/types").UserRecord>>(`/users${buildQuery(params)}`),

  createUser: (payload: Record<string, unknown>) =>
    request<import("@/types").UserRecord>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateUser: (id: string, payload: Record<string, unknown>) =>
    request<import("@/types").UserRecord>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteUser: (id: string) =>
    request<{ message: string }>(`/users/${id}`, { method: "DELETE" }),

  getBusinessGroups: (params?: ListQueryParams) =>
    request<ListResponse<import("@/types").BusinessGroupRecord>>(
      `/business-groups${buildQuery(params)}`
    ),

  getBusinessGroupOptions: () => request<{ items: NamedOption[] }>("/business-groups/options"),

  getBusinessGroup: (id: string) =>
    request<import("@/types").BusinessGroupRecord>(`/business-groups/${id}`),

  createBusinessGroup: (payload: Record<string, unknown>) =>
    request<import("@/types").BusinessGroupRecord>("/business-groups", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateBusinessGroup: (id: string, payload: Record<string, unknown>) =>
    request<import("@/types").BusinessGroupRecord>(`/business-groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteBusinessGroup: (id: string) =>
    request<{ message: string }>(`/business-groups/${id}`, { method: "DELETE" }),

  getBusinesses: (params?: ListQueryParams) =>
    request<ListResponse<import("@/types").BusinessRecord>>(`/businesses${buildQuery(params)}`),

  getBusinessOptions: () => request<{ items: NamedOption[] }>("/businesses/options"),

  getBusiness: (id: string) => request<import("@/types").BusinessRecord>(`/businesses/${id}`),

  createBusiness: (payload: Record<string, unknown>) =>
    request<import("@/types").BusinessRecord>("/businesses", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateBusiness: (id: string, payload: Record<string, unknown>) =>
    request<import("@/types").BusinessRecord>(`/businesses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteBusiness: (id: string) =>
    request<{ message: string }>(`/businesses/${id}`, { method: "DELETE" }),

  getBusinessEntitySchema: (businessId: string, entity: import("@/types").EntitySchemaEntity) =>
    request<import("@/types").EntitySchemaRecord>(`/businesses/${businessId}/schemas/${entity}`),

  updateBusinessEntitySchema: (
    businessId: string,
    entity: import("@/types").EntitySchemaEntity,
    payload: { fields?: import("@/types").EntityFieldDefinition[]; presetKey?: string }
  ) =>
    request<import("@/types").EntitySchemaRecord>(`/businesses/${businessId}/schemas/${entity}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getProducts: (params?: ListQueryParams) =>
    request<ListResponse<import("@/types").ProductRecord>>(`/products${buildQuery(params)}`),

  getProductSchema: (businessId: string, surface?: "admin" | "customerApp") =>
    request<import("@/types").EntitySchemaRecord>(
      `/products/schema${buildQuery({ businessId, surface })}`
    ),

  getProduct: (id: string) => request<import("@/types").ProductDetailResponse>(`/products/${id}`),

  createProduct: (payload: Record<string, unknown>) =>
    request<import("@/types").ProductDetailResponse>("/products", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateProduct: (id: string, payload: Record<string, unknown>) =>
    request<import("@/types").ProductDetailResponse>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteProduct: (id: string) =>
    request<{ message: string }>(`/products/${id}`, { method: "DELETE" }),

  createProductVariation: (productId: string, payload: Record<string, unknown>) =>
    request<import("@/types").ProductVariationRecord>(`/products/${productId}/variations`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateProductVariation: (
    productId: string,
    variationId: string,
    payload: Record<string, unknown>
  ) =>
    request<import("@/types").ProductVariationRecord>(
      `/products/${productId}/variations/${variationId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    ),

  deleteProductVariation: (productId: string, variationId: string) =>
    request<{ message: string }>(`/products/${productId}/variations/${variationId}`, {
      method: "DELETE",
    }),

  getCategories: (params?: ListQueryParams) =>
    request<ListResponse<import("@/types").CategoryRecord>>(`/categories${buildQuery(params)}`),

  getCategorySchema: (businessId: string, surface?: "admin" | "customerApp") =>
    request<import("@/types").EntitySchemaRecord>(
      `/categories/schema${buildQuery({ businessId, surface })}`
    ),

  getCategoryOptions: (businessId?: string) =>
    request<{ items: Array<NamedOption & { business?: string }> }>(
      `/categories/options${buildQuery({ businessId })}`
    ),

  createCategory: (payload: Record<string, unknown>) =>
    request<import("@/types").CategoryRecord>("/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateCategory: (id: string, payload: Record<string, unknown>) =>
    request<import("@/types").CategoryRecord>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteCategory: (id: string) =>
    request<{ message: string }>(`/categories/${id}`, { method: "DELETE" }),

  getCustomers: (params?: ListQueryParams) =>
    request<ListResponse<import("@/types").CustomerRecord>>(`/customers${buildQuery(params)}`),

  getCustomerSchema: (groupId: string, surface?: "admin" | "customerApp") =>
    request<import("@/types").EntitySchemaRecord>(
      `/customers/schema${buildQuery({ groupId, surface })}`
    ),

  getCustomerGroupOptions: () =>
    request<{ items: NamedOption[] }>("/customers/group-options"),

  getCustomerOptions: (groupId?: string) =>
    request<{ items: Array<NamedOption & { phone?: string; email?: string; businessGroup?: string }> }>(
      `/customers/options${buildQuery({ groupId })}`
    ),

  getCustomer: (id: string) =>
    request<import("@/types").CustomerRecord>(`/customers/${id}`),

  getCustomerOrders: (id: string, params?: ListQueryParams) =>
    request<ListResponse<import("@/types").OrderRecord>>(
      `/customers/${id}/orders${buildQuery(params)}`
    ),

  getCustomerWalletLedger: (id: string, params?: ListQueryParams) =>
    request<
      ListResponse<import("@/types").CustomerWalletLedgerEntry> & {
        walletBalance: number;
      }
    >(`/customers/${id}/wallet-ledger${buildQuery(params)}`),

  applyCustomerWallet: (
    id: string,
    payload: { type: string; amount: number; note?: string }
  ) =>
    request<{
      walletBalance: number;
      entry: import("@/types").CustomerWalletLedgerEntry;
    }>(`/customers/${id}/wallet`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCustomerPointsLedger: (id: string, params?: ListQueryParams) =>
    request<
      ListResponse<import("@/types").CustomerPointsLedgerEntry> & {
        pointsBalance: number;
      }
    >(`/customers/${id}/points-ledger${buildQuery(params)}`),

  applyCustomerPoints: (
    id: string,
    payload: { type: string; points: number; note?: string }
  ) =>
    request<{
      pointsBalance: number;
      entry: import("@/types").CustomerPointsLedgerEntry;
    }>(`/customers/${id}/points`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createCustomer: (payload: Record<string, unknown>) =>
    request<import("@/types").CustomerRecord>("/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateCustomer: (id: string, payload: Record<string, unknown>) =>
    request<import("@/types").CustomerRecord>(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteCustomer: (id: string) =>
    request<{ message: string }>(`/customers/${id}`, { method: "DELETE" }),

  getOrders: (params?: ListQueryParams) =>
    request<ListResponse<import("@/types").OrderRecord>>(`/orders${buildQuery(params)}`),

  getOrderSchema: (
    params: { groupId?: string; businessId?: string; surface?: "admin" | "customerApp" }
  ) =>
    request<import("@/types").EntitySchemaRecord>(
      `/orders/schema${buildQuery(params)}`
    ),

  getOrder: (id: string) => request<import("@/types").OrderRecord>(`/orders/${id}`),

  getOrderPaymentLink: (id: string) =>
    request<{ checkoutUrl: string }>(`/orders/${id}/payment-link`, { method: "POST" }),

  getOrderCatalogOptions: (params: { groupId: string; businessId: string }) =>
    request<{
      items: import("@/types").OrderCatalogProduct[];
      portalPaymentMethods?: import("@/constants/commerce").CheckoutPaymentMethod[];
    }>(`/orders/catalog-options${buildQuery(params)}`),

  createOrder: (payload: Record<string, unknown>) =>
    request<import("@/types").OrderRecord>("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateOrder: (id: string, payload: Record<string, unknown>) =>
    request<import("@/types").OrderRecord>(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  refundOrderToWallet: (id: string) =>
    request<import("@/types").OrderRecord>(`/orders/${id}/refund-to-wallet`, {
      method: "POST",
    }),

  refundOrderViaStripe: (id: string) =>
    request<import("@/types").OrderRecord>(`/orders/${id}/refund-stripe`, {
      method: "POST",
    }),

  deleteOrder: (id: string) =>
    request<{ message: string }>(`/orders/${id}`, { method: "DELETE" }),

  getStock: (params?: ListQueryParams) =>
    request<ListResponse<import("@/types").StockRecord>>(`/stock${buildQuery(params)}`),

  getStockSchema: (businessId: string, surface?: "admin" | "customerApp") =>
    request<import("@/types").EntitySchemaRecord>(
      `/stock/schema${buildQuery({ businessId, surface })}`
    ),

  getStockItem: (id: string) => request<import("@/types").StockRecord>(`/stock/${id}`),

  updateStock: (id: string, payload: Record<string, unknown>) =>
    request<import("@/types").StockRecord>(`/stock/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getResolvedTheme: () =>
    request<import("@/types/brandTheme").BrandThemeRecord>("/themes/resolved"),

  getMyTheme: () => request<import("@/types/brandTheme").BrandThemeRecord>("/themes/me"),

  getMyThemeStatus: () => request<{ hasCustomTheme: boolean }>("/themes/me/status"),

  updateMyTheme: (payload: { light: Record<string, string>; dark: Record<string, string> }) =>
    request<import("@/types/brandTheme").BrandThemeRecord>("/themes/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteMyTheme: () => request<{ message: string }>("/themes/me", { method: "DELETE" }),

  getNotificationEvents: (businessId?: string) => {
    const query = businessId ? `?businessId=${encodeURIComponent(businessId)}` : "";
    return request<{
      businessId: string | null;
      items: import("@/types").NotificationEventListItem[];
    }>(`/notification-events${query}`);
  },

  getNotificationEventBusinesses: () =>
    request<{ _id: string; name: string }[]>("/notification-events/businesses"),

  getNotificationEvent: (eventId: string, businessId?: string) => {
    const query = businessId ? `?businessId=${encodeURIComponent(businessId)}` : "";
    return request<{
      event: import("@/types").NotificationEventRecord;
      setting: import("@/types").NotificationEventSettingRecord;
      business: { _id: string; name: string } | null;
      hasBusinessOverride: boolean;
      scope: "platform" | "business";
      sampleVariables: Record<string, string>;
    }>(`/notification-events/${eventId}${query}`);
  },

  updateNotificationEventSettings: (
    eventId: string,
    payload: {
      inAppEnabled: boolean;
      emailEnabled: boolean;
      inAppTemplate: string;
      emailSubjectTemplate: string;
      emailBodyTemplate: string;
    },
    businessId?: string
  ) => {
    const query = businessId ? `?businessId=${encodeURIComponent(businessId)}` : "";
    return request(`/notification-events/${eventId}/settings${query}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  previewNotificationEvent: (
    eventId: string,
    variables: Record<string, string>,
    businessId?: string,
    setting?: {
      inAppTemplate?: string;
      emailSubjectTemplate?: string;
      emailBodyTemplate?: string;
    }
  ) => {
    const query = businessId ? `?businessId=${encodeURIComponent(businessId)}` : "";
    return request<import("@/types").NotificationPreviewResult>(
      `/notification-events/${eventId}/preview${query}`,
      {
        method: "POST",
        body: JSON.stringify({ variables, setting }),
      }
    );
  },

  cloneNotificationEvent: (eventId: string, businessIds: string[]) =>
    request<{ cloned: unknown[] }>(`/notification-events/${eventId}/clone`, {
      method: "POST",
      body: JSON.stringify({ businessIds }),
    }),

  sendTestNotificationEvent: (
    eventId: string,
    payload: {
      businessId?: string;
      businessName?: string;
      recipientEmail: string;
      variables?: Record<string, string>;
    }
  ) =>
    request<{ message: string }>(`/notification-events/${eventId}/test`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getInboxNotifications: (page = 1, limit = 20) =>
    request<{
      items: import("@/types").InAppNotificationRecord[];
      total: number;
      unreadCount: number;
      page: number;
      limit: number;
    }>(`/notifications/inbox?page=${page}&limit=${limit}`),

  getUnreadNotificationCount: () =>
    request<{ unreadCount: number }>("/notifications/inbox/unread-count"),

  markNotificationRead: (notificationId: string) =>
    request(`/notifications/inbox/${notificationId}/read`, { method: "PATCH" }),

  markAllNotificationsRead: () =>
    request<{ updatedCount: number }>("/notifications/inbox/read-all", { method: "PATCH" }),

  getPlatformPayments: () =>
    request<import("@/constants/commerce").PlatformStripeSettings>("/settings/payments"),

  updatePlatformPayments: (payload: Record<string, unknown>) =>
    request<import("@/constants/commerce").PlatformStripeSettings>("/settings/payments", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  getUploadConfig: () =>
    request<import("@/lib/media").UploadConfig>("/uploads/config"),

  uploadFile: (file: File, folder?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (folder) {
      formData.append("folder", folder);
    }
    return uploadRequest<{ path: string; url: string }>("/uploads", formData);
  },

  deleteUpload: (path: string) =>
    request<{ message: string }>("/uploads", {
      method: "DELETE",
      body: JSON.stringify({ path }),
    }),

  getInsightGroups: () =>
    request<{ items: import("@/types").InsightsGroup[] }>("/insights/groups"),

  getDashboardSummary: (params?: ListQueryParams) =>
    request<import("@/types").DashboardSummary>(`/insights/dashboard/summary${buildQuery(params)}`),

  getDashboardCharts: (params?: ListQueryParams) =>
    request<import("@/types").DashboardCharts>(`/insights/dashboard/charts${buildQuery(params)}`),

  getDashboardUnpaid: (params?: ListQueryParams) =>
    request<import("@/types").ListResponse<import("@/types").InsightsAttentionOrder>>(
      `/insights/dashboard/unpaid${buildQuery(params)}`
    ),

  getDashboardRefunds: (params?: ListQueryParams) =>
    request<import("@/types").ListResponse<import("@/types").InsightsAttentionOrder>>(
      `/insights/dashboard/refunds${buildQuery(params)}`
    ),

  getDashboardStockAlerts: (params?: ListQueryParams) =>
    request<import("@/types").ListResponse<import("@/types").InsightsAttentionStock>>(
      `/insights/dashboard/stock-alerts${buildQuery(params)}`
    ),

  getDashboardBreakdowns: (params?: ListQueryParams) =>
    request<import("@/types").DashboardBreakdowns>(
      `/insights/dashboard/breakdowns${buildQuery(params)}`
    ),

  getRecycleBin: (params?: ListQueryParams) =>
    request<import("@/types").ListResponse<import("@/types").RecycleBinRecord>>(
      `/recycle-bin${buildQuery(params)}`
    ),

  getRecycleBinTypes: () =>
    request<{ items: { value: string; label: string }[] }>("/recycle-bin/types"),

  restoreRecycleBinItem: (type: string, id: string) =>
    request<{ message: string }>(`/recycle-bin/${type}/${id}/restore`, { method: "POST" }),
};
