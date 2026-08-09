// Uses same-origin /api via Vite proxy in development
const API_BASE = "/api";

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

  getModules: () => request<import("@/types").ModuleRecord[]>("/modules"),

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

  getRoles: () => request<import("@/types").RoleRecord[]>("/roles"),

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

  getUsers: () => request<import("@/types").UserRecord[]>("/users"),

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

  getBusinessGroups: () => request<import("@/types").BusinessGroupRecord[]>("/business-groups"),

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

  getBusinesses: () => request<import("@/types").BusinessRecord[]>("/businesses"),

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

  getProducts: () => request<import("@/types").ProductRecord[]>("/products"),

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

  getCategories: () => request<import("@/types").CategoryRecord[]>("/categories"),

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
};
