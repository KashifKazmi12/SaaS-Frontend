import { useEffect, useMemo, useRef, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  PRODUCT_UNIT_LABELS,
  normalizeProductUnit,
} from "@/constants/catalog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ProductRecord } from "@/types";

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 40;

export function productMatchValue(product: ProductRecord) {
  const sku = String(product.sku || "").trim();
  return sku || String(product.name || "").trim();
}

function productLabel(product: ProductRecord) {
  const sku = String(product.sku || "").trim();
  return sku ? `${product.name} (${sku})` : product.name;
}

/** Base unit + packaging units (same idea as stock receive modal). */
export function stockImportSellUnitOptions(product: ProductRecord | null | undefined) {
  if (!product) return [];
  const base = normalizeProductUnit(product.unit || "piece");
  const options = [
    {
      unit: base,
      label: PRODUCT_UNIT_LABELS[base] || base,
      isBase: true,
    },
  ];
  for (const pack of product.packagings || []) {
    const unit = normalizeProductUnit(pack.unit || "");
    if (!unit || unit === base) continue;
    if (options.some((row) => row.unit === unit)) continue;
    options.push({
      unit,
      label: PRODUCT_UNIT_LABELS[unit] || unit,
      isBase: false,
    });
  }
  return options;
}

/** First packaging if present, otherwise the product base unit. */
export function defaultStockImportUnit(product: ProductRecord | null | undefined) {
  if (!product) return "piece";
  const base = normalizeProductUnit(product.unit || "piece");
  const firstPack = (product.packagings || []).find((row) => {
    const unit = normalizeProductUnit(row.unit || "");
    return Boolean(unit) && unit !== base && Number(row.factorToBase) > 0;
  });
  if (firstPack?.unit) return normalizeProductUnit(firstPack.unit);
  return base;
}

/** Same rules as stock import backend: exact SKU, or exact name (case-insensitive). */
export function catalogMatchesCode(
  items: Array<{ name?: string; sku?: string }>,
  code: string
) {
  const key = code.trim();
  if (!key) return false;
  const lower = key.toLowerCase();
  return items.some((row) => {
    const sku = String(row.sku || "").trim();
    const name = String(row.name || "").trim();
    return sku === key || name.toLowerCase() === lower;
  });
}

export function findCatalogMatch(
  items: ProductRecord[],
  code: string
): ProductRecord | null {
  const key = code.trim();
  if (!key) return null;
  const lower = key.toLowerCase();
  const bySku = items.find((row) => String(row.sku || "").trim() === key);
  if (bySku) return bySku;
  const byName = items.filter(
    (row) => String(row.name || "").trim().toLowerCase() === lower
  );
  return byName.length === 1 ? byName[0] : null;
}

export async function resolveStockImportProduct(
  businessId: string,
  code: string
): Promise<ProductRecord | null> {
  const key = code.trim();
  if (!key || !businessId) return null;
  const result = await api.getProducts({
    businessId,
    search: key,
    page: 1,
    limit: PAGE_SIZE,
    status: "active",
  });
  return findCatalogMatch(result.items || [], key);
}

/** @deprecated use resolveStockImportProduct */
export async function checkStockImportProductMatch(
  businessId: string,
  code: string
): Promise<boolean> {
  return Boolean(await resolveStockImportProduct(businessId, code));
}

export function StockImportProductCell({
  businessId,
  value,
  onChange,
  onProductResolved,
  invalid = false,
  "aria-label": ariaLabel,
}: {
  businessId: string;
  value: string;
  onChange: (next: string) => void;
  onProductResolved?: (product: ProductRecord) => void;
  invalid?: boolean;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  /** Keep showing product name after pick even when stored match value is the SKU. */
  const [displayName, setDisplayName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const boundMatchRef = useRef("");
  const itemsRef = useRef<ProductRecord[]>([]);
  const selectingRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const next = String(value || "").trim();
    if (!next) {
      setDisplayName("");
      setSelectedId(null);
      boundMatchRef.current = "";
      return;
    }
    if (next === boundMatchRef.current) return;
    setDisplayName("");
    setSelectedId(null);
    boundMatchRef.current = "";
  }, [value]);

  useEffect(() => {
    if (!open || !businessId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    void api
      .getProducts({
        businessId,
        search: debouncedSearch || undefined,
        page: 1,
        limit: PAGE_SIZE,
        status: "active",
      })
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        setItems(result.items || []);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : "Unable to load products.");
        setItems([]);
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
      });
  }, [open, businessId, debouncedSearch]);

  const labelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of items) {
      map[row._id] = productLabel(row);
    }
    return map;
  }, [items]);

  const itemIds = useMemo(() => items.map((row) => row._id), [items]);

  function applyProduct(product: ProductRecord) {
    const matchValue = productMatchValue(product);
    const name = String(product.name || "").trim();
    selectingRef.current = true;
    boundMatchRef.current = matchValue;
    setSelectedId(product._id);
    setDisplayName(name || matchValue);
    onChange(matchValue);
    onProductResolved?.(product);
    window.setTimeout(() => {
      selectingRef.current = false;
    }, 0);
  }

  return (
    <Combobox
      items={itemIds}
      value={selectedId}
      open={open}
      onOpenChange={(next) => {
        if (!next && selectingRef.current) {
          setOpen(false);
          setSearchInput("");
          setDebouncedSearch("");
          return;
        }
        setOpen(next);
        if (next) {
          setSearchInput("");
          setDebouncedSearch("");
          return;
        }
        setSearchInput("");
        setDebouncedSearch("");
      }}
      filter={null}
      autoComplete="none"
      inputValue={open ? searchInput : displayName || value || ""}
      onInputValueChange={(next) => {
        if (!open) return;
        setSearchInput(next);
      }}
      onValueChange={(nextId) => {
        if (!nextId) return;
        const product =
          itemsRef.current.find((row) => row._id === nextId) ||
          items.find((row) => row._id === nextId);
        if (!product) return;
        applyProduct(product);
      }}
      itemToStringLabel={(itemId) => labelById[itemId] ?? itemId}
    >
      <ComboboxInput
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        placeholder="Search name or SKU"
        className={cn(
          "h-7 min-w-[160px] w-full text-xs",
          invalid && "border-destructive ring-1 ring-destructive/50"
        )}
      />
      <ComboboxContent className="min-w-[240px]">
        <ComboboxEmpty>{loading ? "Loading…" : error || "No products found."}</ComboboxEmpty>
        <ComboboxList>
          {(itemId) => (
            <ComboboxItem
              key={itemId}
              value={itemId}
              onMouseDown={(event) => {
                event.preventDefault();
                const product = itemsRef.current.find((row) => row._id === itemId);
                if (product) applyProduct(product);
                setOpen(false);
                setSearchInput("");
                setDebouncedSearch("");
              }}
            >
              <span className="truncate">{labelById[itemId] ?? itemId}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
