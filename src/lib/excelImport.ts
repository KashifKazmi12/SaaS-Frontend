/**
 * Shared Excel → row parsing for import wizards.
 */
import * as XLSX from "xlsx";

export type SheetRow = Record<string, string>;

export interface ParsedSheet {
  fileName: string;
  columns: string[];
  rows: SheetRow[];
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    // Avoid scientific notation for SKUs/barcodes typed as numbers.
    if (Number.isInteger(value) && Math.abs(value) >= 1e12) {
      return String(value);
    }
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export async function parseExcelFile(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("This file has no sheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!matrix.length) {
    throw new Error("This sheet is empty.");
  }

  const headerRow = matrix[0] || [];
  const columns: string[] = [];
  const used = new Set<string>();

  headerRow.forEach((cell, index) => {
    let name = cellToString(cell) || `Column ${index + 1}`;
    let unique = name;
    let n = 2;
    while (used.has(unique.toLowerCase())) {
      unique = `${name} (${n})`;
      n += 1;
    }
    used.add(unique.toLowerCase());
    columns.push(unique);
  });

  if (!columns.length) {
    throw new Error("Could not read column headers.");
  }

  const rows: SheetRow[] = [];
  for (let r = 1; r < matrix.length; r += 1) {
    const line = matrix[r] || [];
    const row: SheetRow = {};
    let hasValue = false;
    columns.forEach((col, index) => {
      const text = cellToString(line[index]);
      row[col] = text;
      if (text) hasValue = true;
    });
    if (hasValue) rows.push(row);
  }

  if (!rows.length) {
    throw new Error("No data rows found.");
  }

  return { fileName: file.name, columns, rows };
}

export interface ImportTargetField {
  key: string;
  label: string;
  required?: boolean;
  /** Allow mapping multiple source columns into one value. */
  multi?: boolean;
}

/** Guess source column for a target field from header text. */
export function autoMapColumns(
  columns: string[],
  fields: ImportTargetField[]
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const aliases: Record<string, string[]> = {
    sku: ["sku", "item code", "itemcode", "product code", "code", "article"],
    quantity: ["quantity", "qty", "stock", "on hand", "onhand", "balance"],
    minStock: ["min stock", "minstock", "reorder", "reorder level", "minimum"],
    name: ["name", "product", "product name", "item", "item name", "title"],
    barcode: ["barcode", "ean", "upc", "gtin"],
    price: ["price", "sale price", "selling price", "unit price", "mrp", "rate"],
    costPrice: ["cost", "cost price", "purchase price", "buy price"],
    unit: ["unit", "uom", "measure"],
    category: ["category", "cat", "group", "type"],
    variation: ["variation", "variant", "size", "color", "option"],
    description: ["description", "details", "desc"],
    importNotes: ["notes", "note", "remarks", "comment", "extra", "reference"],
  };

  const normalized = columns.map((col) => ({
    col,
    key: col.toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim(),
  }));

  for (const field of fields) {
    const wanted = aliases[field.key] || [field.key.toLowerCase()];
    const hit = normalized.find((entry) =>
      wanted.some((alias) => entry.key === alias || entry.key.includes(alias))
    );
    map[field.key] = hit ? [hit.col] : [];
  }

  return map;
}

export function applyColumnMap(
  rows: SheetRow[],
  mapping: Record<string, string[]>,
  fields: ImportTargetField[]
): Record<string, string>[] {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const field of fields) {
      const sources = mapping[field.key] || [];
      if (field.multi) {
        const parts = sources
          .map((col) => {
            const value = row[col]?.trim();
            if (!value) return "";
            return `${col}: ${value}`;
          })
          .filter(Boolean);
        out[field.key] = parts.join(" | ");
      } else {
        const col = sources[0];
        out[field.key] = col ? row[col]?.trim() || "" : "";
      }
    }
    return out;
  });
}
