export type Permission =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "import";

export const PERMISSIONS: Permission[] = [
  "view",
  "create",
  "update",
  "delete",
  "export",
  "import",
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  export: "Export",
  import: "Import",
};

export interface NavChild {
  id: string;
  name: string;
  path: string;
  order: number;
  permissions: Permission[];
}

export interface NavItem {
  id: string;
  name: string;
  path: string;
  order: number;
  permissions: Permission[];
  children: NavChild[];
}

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  isSuperAdmin: boolean;
  role: { id: string; name: string } | null;
  businesses: { id: string; name: string }[];
}

export interface ModuleRecord {
  _id: string;
  name: string;
  path: string;
  order: number;
  isSubModule: boolean;
  parent?: { _id: string; name: string; path: string } | string | null;
  isActive: boolean;
}

export interface RoleRecord {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  modulePermissions: {
    module: ModuleRecord | string;
    permissions: Permission[];
  }[];
}

export interface UserRecord {
  _id: string;
  name: string;
  username: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  role?: { _id: string; name: string } | null;
  businesses?: { _id: string; name: string }[];
}

export interface BusinessGroupRecord {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface BusinessRecord {
  _id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  isActive: boolean;
  businessGroup?: { _id: string; name: string } | string | null;
}

export interface ProductRecord {
  _id: string;
  name: string;
  description: string;
  basePrice: number;
  costPrice: number;
  sku: string;
  barcode: string;
  unit: string;
  images: import("@/lib/media").ProductImage[];
  hasVariations: boolean;
  variationCount?: number;
  isActive: boolean;
  category?: { _id: string; name: string } | string | null;
  business?: { _id: string; name: string } | string;
}

export interface CategoryRecord {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  business?: { _id: string; name: string } | string;
}

export interface VariationOption {
  name: string;
  value: string;
}

export interface ProductVariationRecord {
  _id: string;
  product: string;
  name: string;
  options: VariationOption[];
  sku: string;
  barcode: string;
  price: number;
  costPrice: number;
  isActive: boolean;
}

export interface ProductDetailResponse {
  product: ProductRecord;
  variations: ProductVariationRecord[];
}

export interface VariationDraft {
  _id?: string;
  name: string;
  sku: string;
  barcode: string;
  price: string;
  costPrice: string;
  isActive: boolean;
  options: VariationOption[];
}

export interface NotificationVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

export interface NotificationEventRecord {
  _id: string;
  key: string;
  name: string;
  description: string;
  variables: NotificationVariable[];
  defaultInAppTemplate: string;
  defaultEmailSubject: string;
  defaultEmailBody: string;
  isSystem: boolean;
  isActive: boolean;
}

export interface NotificationEventSettingRecord {
  _id: string;
  event: string;
  business: { _id: string; name: string } | null;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  inAppTemplate: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
}

export interface NotificationEventListItem {
  event: NotificationEventRecord;
  setting: NotificationEventSettingRecord;
  business: { _id: string; name: string } | null;
  hasBusinessOverride: boolean;
  scope: "platform" | "business";
}

export interface NotificationPreviewResult {
  variables: Record<string, string>;
  inApp: { body: string };
  email: {
    subject: string;
    text: string;
    html: string;
  };
}

export interface InAppNotificationRecord {
  _id: string;
  eventKey: string;
  title: string;
  body: string;
  read: boolean;
  readAt?: string | null;
  business?: { _id: string; name: string } | null;
  createdAt: string;
}
