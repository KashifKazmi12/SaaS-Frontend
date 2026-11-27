export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NamedOption {
  _id: string;
  name: string;
  currency?: string;
  loyaltyEnabled?: boolean;
  earnPointsPerCurrency?: number;
  redeemPointsPerCurrency?: number;
  minOrderToRedeem?: number;
  maxPointsPercent?: number;
  minPointsToRedeem?: number;
}

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

export interface AuthBusiness {
  id: string;
  name: string;
  businessGroupId: string;
}

export interface AuthBusinessGroup {
  id: string;
  name: string;
  currency?: string;
  code?: string;
  loyaltyEnabled?: boolean;
  earnPointsPerCurrency?: number;
  redeemPointsPerCurrency?: number;
  minOrderToRedeem?: number;
  maxPointsPercent?: number;
  minPointsToRedeem?: number;
}

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  isSuperAdmin: boolean;
  role: { id: string; name: string } | null;
  businesses: AuthBusiness[];
  businessGroups: AuthBusinessGroup[];
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
  staffCode?: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  role?: { _id: string; name: string } | null;
  businesses?: { _id: string; name: string }[];
}

export interface BusinessGroupRecord {
  _id: string;
  name: string;
  code: string;
  description: string;
  logoPath?: string;
  storefrontTheme?: "marketplace" | "dining";
  currency?: import("@/constants/commerce").GroupCurrency;
  loyaltyEnabled?: boolean;
  earnPointsPerCurrency?: number;
  redeemPointsPerCurrency?: number;
  minOrderToRedeem?: number;
  maxPointsPercent?: number;
  minPointsToRedeem?: number;
  isActive: boolean;
}

export interface BusinessOrderSettings {
  defaultStatus: "pending" | "confirmed" | "preparing" | "in_transit" | "completed";
  defaultPaymentStatus: "unpaid" | "paid";
  /** When true, order actions ask for a staff code under a shared login. */
  sharedLoginStaffCode?: boolean;
}

export interface BusinessRecord {
  _id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  logoPath?: string;
  checkoutPaymentMethods?: import("@/constants/commerce").CheckoutPaymentMethod[];
  portalPaymentMethods?: import("@/constants/commerce").CheckoutPaymentMethod[];
  orderSettings?: BusinessOrderSettings;
  isActive: boolean;
  businessGroup?: { _id: string; name: string } | string | null;
}

export interface ProductPackaging {
  unit: string;
  factorToBase: number;
  label?: string;
}

export interface ProductRecipeLine {
  product: string | { _id: string; name?: string; sku?: string; unit?: string; productKind?: string };
  variation?: string | null;
  quantity: number;
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
  productKind?: string;
  packagings?: ProductPackaging[];
  recipe?: ProductRecipeLine[];
  images: import("@/lib/media").ProductImage[];
  hasVariations: boolean;
  variationCount?: number;
  isActive: boolean;
  category?: { _id: string; name: string } | string | null;
  business?:
    | {
        _id: string;
        name: string;
        businessGroup?: { _id: string; name?: string; currency?: string } | string;
      }
    | string;
  custom?: Record<string, unknown>;
}

export interface CategoryRecord {
  _id: string;
  name: string;
  description: string;
  imagePath?: string;
  custom?: Record<string, unknown>;
  isActive: boolean;
  business?: { _id: string; name: string } | string;
}

export type EntityFieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "select"
  | "boolean"
  | "date";

export type EntitySchemaEntity = "customer" | "product" | "category" | "stock" | "order";

export interface EntityFieldDefinition {
  key: string;
  label: string;
  type: EntityFieldType;
  required: boolean;
  locked: boolean;
  hideable: boolean;
  visible: boolean;
  showOnAdmin: boolean;
  showOnCustomerApp: boolean;
  showInList: boolean;
  options: string[];
}

export interface EntitySchemaRecord {
  business: { _id: string; name: string } | string;
  entity: EntitySchemaEntity;
  fields: EntityFieldDefinition[];
  presets: EntityFieldDefinition[];
  surface?: "admin" | "customerApp";
}

export interface CustomerRecord {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  custom?: Record<string, unknown>;
  walletBalance?: number;
  pointsBalance?: number;
  isActive: boolean;
  businessGroup?: { _id: string; name: string; currency?: string } | string;
}

export type WalletEntryType = "top_up" | "adjust" | "redeem";

export interface CustomerWalletLedgerEntry {
  _id: string;
  type: WalletEntryType;
  amount: number;
  balanceAfter: number;
  note: string;
  order?: { _id: string; orderNumber: string } | string | null;
  createdBy?: { _id: string; name: string } | string | null;
  createdAt?: string;
}

export type PointsEntryType = "earn" | "adjust" | "redeem";

export interface CustomerPointsLedgerEntry {
  _id: string;
  type: PointsEntryType;
  points: number;
  balanceAfter: number;
  note: string;
  order?: { _id: string; orderNumber: string } | string | null;
  createdBy?: { _id: string; name: string } | string | null;
  createdAt?: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "in_transit"
  | "completed"
  | "cancelled";
export type OrderPaymentStatus = "unpaid" | "paid" | "refund_pending" | "refunded";
export type OrderPaymentMethod = "unpaid" | "cash" | "bank_transfer" | "store_credit" | "stripe";
export type OrderSource = "customer_app" | "admin" | "desktop";

export interface OrderItemRecord {
  _id?: string;
  product: string;
  variation?: string | null;
  business?: { _id: string; name: string } | string;
  name: string;
  sku: string;
  imagePath?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderRecord {
  _id: string;
  orderNumber: string;
  businessGroup?: { _id: string; name: string; currency?: string } | string;
  customer?:
    | { _id: string; name: string; email?: string; phone?: string }
    | string;
  items: OrderItemRecord[];
  subtotal: number;
  /** Manual order-level discount before points/wallet. */
  discountAmount?: number;
  /** How discount was entered: fixed amount or percent of subtotal. */
  discountType?: "fixed" | "percent";
  /** Entered value (currency amount or 0–100 percent). */
  discountValue?: number;
  walletApplied?: number;
  pointsRedeemed?: number;
  pointsDiscount?: number;
  pointsEarned?: number;
  pointsAwarded?: boolean;
  total: number;
  refundToWalletAmount?: number;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeRefundId?: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: OrderPaymentMethod;
  source: OrderSource;
  /** Desktop/offline human reference (separate from orderNumber). */
  desktopReferenceId?: string;
  clientMutationId?: string;
  notes: string;
  custom?: Record<string, unknown>;
  stockApplied: boolean;
  /** Staff who placed the order (staff code when enabled, else logged-in user). */
  placedBy?: { _id: string; name: string } | string | null;
  /** Present when admin/storefront create starts a Stripe Checkout session. */
  checkoutUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderCatalogProduct {
  _id: string;
  name: string;
  basePrice: number;
  /** Purchase/cost price (base unit). */
  costPrice?: number;
  hasVariations: boolean;
  sku: string;
  business: string;
  imagePath?: string;
  unit?: string;
  packagings?: ProductPackaging[];
  productKind?: string;
  /** On-hand quantity in base units (non-variation products). */
  stockQuantity?: number;
  variations: Array<{
    _id: string;
    name: string;
    price: number;
    costPrice?: number;
    sku: string;
    stockQuantity?: number;
  }>;
}

export type StockLevel = "in" | "low" | "out";

export interface StockSellUnit {
  unit: string;
  factorToBase: number;
  isBase?: boolean;
  label?: string;
}

export interface StockRecord {
  _id: string;
  quantity: number;
  minStock: number;
  custom?: Record<string, unknown>;
  stockLevel: StockLevel;
  sku: string;
  unit: string;
  /** Current sell/base unit price (variation price or product basePrice). */
  price?: number;
  /** Purchase/cost price (base unit). */
  costPrice?: number;
  productKind?: string;
  packagings?: ProductPackaging[];
  sellUnits?: StockSellUnit[];
  isActive: boolean;
  product:
    | {
        _id: string;
        name: string;
        sku: string;
        unit: string;
        basePrice?: number;
        costPrice?: number;
        productKind?: string;
        packagings?: ProductPackaging[];
        hasVariations: boolean;
        isActive: boolean;
        category?: { _id: string; name: string } | string | null;
      }
    | string;
  variation?: {
    _id: string;
    name: string;
    sku: string;
    price?: number;
    costPrice?: number;
    isActive: boolean;
  } | null;
  business?: { _id: string; name: string } | string;
}

export interface StockUpdateBatchLine {
  stock: string | null;
  productName: string;
  sku: string;
  variationName: string;
  packagingUnit: string;
  quantity: number | null;
  unitPrice: number | null;
  costPrice: number | null;
  beforeQty: number;
  afterQty: number;
  saleAmount: number;
  costAmount: number;
}

export interface StockUpdateBatchRecord {
  _id: string;
  batchNumber: string;
  business: { _id: string; name: string } | null;
  mode: "add" | "set";
  postedBy: string | null;
  postedByName: string;
  lineCount: number;
  totalQuantity: number;
  totalSale: number;
  totalCost: number;
  totalSaleAmount: number;
  totalCostAmount: number;
  lines?: StockUpdateBatchLine[];
  createdAt?: string;
  updatedAt?: string;
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

export type InsightsRange = "today" | "7d" | "30d" | "custom";

export interface InsightsGroup {
  _id: string;
  name: string;
  currency?: string;
}

export interface InsightsAttentionOrder {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  customer: string;
  createdAt: string;
}

export interface InsightsAttentionStock {
  _id: string;
  name: string;
  variation: string;
  business: string;
  quantity: number;
  minStock: number;
  level: "low" | "out";
}

export interface DashboardKpis {
  sales: number;
  completedOrders: number;
  ordersPlaced: number;
  cancelledOrders: number;
  openOrders: number;
  unpaidOpen: number;
  unpaidAmount: number;
  refundPending: number;
  refundPendingAmount: number;
  refunded: number;
  refundedAmount: number;
  lowStock: number;
  outOfStock: number;
}

export interface DashboardSummary {
  group: InsightsGroup;
  businesses: NamedOption[];
  range: { key: string; from: string; to: string };
  kpis: DashboardKpis;
}

export interface DashboardCharts {
  byDay: Array<{ date: string; orders: number; sales: number }>;
  byStatus: Array<{ status: string; count: number; total: number }>;
}

export interface DashboardBreakdowns {
  byBranch: Array<{ businessId: string; name: string; sales: number; quantity: number }>;
  byPayment: Array<{ paymentStatus: string; count: number; total: number }>;
  topProducts: Array<{ name: string; sku: string; quantity: number; sales: number }>;
}

export interface DashboardReportOrder {
  _id: string;
  orderNumber: string;
  customer: string;
  itemsSummary: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  createdAt?: string;
}

export interface DashboardReportOrders {
  group: InsightsGroup;
  businesses: NamedOption[];
  range: { key: string; from: string; to: string };
  total: number;
  limit: number;
  truncated: boolean;
  items: DashboardReportOrder[];
}

export interface RecycleBinRecord {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  subtitle: string;
  context: string;
  deletedAt: string;
}

export interface ActivityLogRecord {
  _id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  meta: Record<string, unknown>;
  actorName: string;
  actor: { _id: string; name: string } | string | null;
  business: { _id: string; name: string } | string | null;
  createdAt: string;
}
