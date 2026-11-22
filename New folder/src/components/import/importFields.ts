import type { ImportTargetField } from "@/lib/excelImport";

export const STOCK_IMPORT_FIELDS: ImportTargetField[] = [
  { key: "sku", label: "SKU or name", required: true, autoMapAs: "sku-or-name" },
  { key: "quantity", label: "Quantity", required: true },
  { key: "importNotes", label: "Extra info", multi: true },
];

export const PRODUCT_IMPORT_FIELDS: ImportTargetField[] = [
  { key: "name", label: "Product name", required: true },
  { key: "sku", label: "SKU", required: true },
  { key: "barcode", label: "Barcode" },
  { key: "price", label: "Price" },
  { key: "costPrice", label: "Cost" },
  { key: "unit", label: "Unit" },
  {
    key: "packagingFactor",
    label: "Packaging",
    packaging: true,
  },
  { key: "category", label: "Category" },
  { key: "variation", label: "Variation" },
  { key: "description", label: "Description" },
  { key: "quantity", label: "Stock qty" },
  { key: "importNotes", label: "Extra info", multi: true },
];

export type StockQuantityMode = "add" | "set";

export interface ImportResultSummary {
  created: number;
  updated: number;
  skipped: number;
  errorCount?: number;
  errors: Array<{ row: number; message: string }>;
}
