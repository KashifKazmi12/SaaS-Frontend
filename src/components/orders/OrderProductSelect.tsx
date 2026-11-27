import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FieldLabel } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { api } from "@/lib/api";
import type { OrderCatalogProduct } from "@/types";

const PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 300;

export interface OrderProductSelectProps {
  groupId: string;
  businessId: string;
  value: string;
  selectedProduct?: OrderCatalogProduct | null;
  onSelect: (product: OrderCatalogProduct | null) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onEnterWhenClosed?: () => void;
}

function productLabel(product: OrderCatalogProduct) {
  return product.sku ? `${product.name} (${product.sku})` : product.name;
}

function money(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function OrderProductSelect({
  groupId,
  businessId,
  value,
  selectedProduct = null,
  onSelect,
  label = "Product",
  placeholder = "Search product",
  id = "order-product-select",
  required = false,
  disabled = false,
  className,
  onEnterWhenClosed,
}: OrderProductSelectProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OrderCatalogProduct[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setTotalPages(1);
    setSearchInput("");
    setDebouncedSearch("");
    setError("");
  }, [groupId, businessId]);

  const loadPage = useCallback(
    async (nextPage: number, search: string, append: boolean) => {
      if (!groupId || !businessId) return;
      const requestId = ++requestIdRef.current;
      if (append) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
        // Drop stale page so typing doesn't keep showing the previous A–Z list.
        setItems([]);
        setPage(1);
        setTotalPages(1);
      }
      setError("");
      try {
        const result = await api.getOrderCatalogOptions({
          groupId,
          businessId,
          page: nextPage,
          limit: PAGE_SIZE,
          search: search || undefined,
        });
        if (requestId !== requestIdRef.current) return;
        setItems((current) => {
          if (!append) return result.items;
          const seen = new Set(current.map((row) => row._id));
          const merged = [...current];
          for (const row of result.items) {
            if (seen.has(row._id)) continue;
            seen.add(row._id);
            merged.push(row);
          }
          return merged;
        });
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : "Unable to load products.");
        if (!append) setItems([]);
      } finally {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [groupId, businessId]
  );

  useEffect(() => {
    if (!open || !groupId || !businessId) return;
    void loadPage(1, debouncedSearch, false);
  }, [open, groupId, businessId, debouncedSearch, loadPage]);

  const displayItems = useMemo(() => {
    if (!selectedProduct) return items;
    if (items.some((row) => row._id === selectedProduct._id)) return items;
    return [selectedProduct, ...items];
  }, [items, selectedProduct]);

  const labelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of displayItems) {
      map[row._id] = productLabel(row);
    }
    if (selectedProduct) {
      map[selectedProduct._id] = productLabel(selectedProduct);
    }
    return map;
  }, [displayItems, selectedProduct]);

  const itemIds = useMemo(() => displayItems.map((row) => row._id), [displayItems]);

  function maybeLoadMore(target: HTMLElement) {
    if (loading || loadingMoreRef.current) return;
    if (page >= totalPages) return;
    if (target.scrollTop + target.clientHeight < target.scrollHeight - 48) return;
    void loadPage(page + 1, debouncedSearch, true);
  }

  if (!businessId || !groupId) {
    return (
      <div className={className}>
        <div className="space-y-2">
          {label ? (
            <FieldLabel htmlFor={id} required={required}>
              {label}
            </FieldLabel>
          ) : null}
          <Input id={id} value="Select a business first" disabled />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {label ? (
          <FieldLabel htmlFor={id} required={required}>
            {label}
          </FieldLabel>
        ) : null}

        {disabled ? (
          <Input
            id={id}
            value={selectedProduct ? productLabel(selectedProduct) : "—"}
            disabled
          />
        ) : (
          <Combobox
            items={itemIds}
            value={value || null}
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setSearchInput("");
                setDebouncedSearch("");
              }
            }}
            filter={null}
            autoComplete="none"
            inputValue={
              open
                ? searchInput
                : value
                  ? labelById[value] || selectedProduct?.name || ""
                  : ""
            }
            onInputValueChange={(next) => {
              if (!open) return;
              setSearchInput(next);
            }}
            onValueChange={(nextValue) => {
              if (!nextValue) {
                onSelect(null);
                return;
              }
              const product =
                displayItems.find((row) => row._id === nextValue) ||
                (selectedProduct?._id === nextValue ? selectedProduct : null);
              onSelect(product);
            }}
            itemToStringLabel={(itemValue) => labelById[itemValue] ?? itemValue}
            required={required}
          >
            <ComboboxInput
              id={id}
              placeholder={placeholder}
              className="w-full"
              onKeyDown={(event) => {
                if (event.key !== "Enter" || open) return;
                if (!onEnterWhenClosed) return;
                event.preventDefault();
                event.stopPropagation();
                onEnterWhenClosed();
              }}
            />
            <ComboboxContent className="min-w-[min(22rem,var(--available-width))] w-[min(28rem,var(--available-width))]">
              <ComboboxEmpty>
                {loading ? "Loading…" : error || "No products found."}
              </ComboboxEmpty>
              <ComboboxList onScroll={(event) => maybeLoadMore(event.currentTarget)}>
                {(itemId) => {
                  const product =
                    displayItems.find((row) => row._id === itemId) ||
                    (selectedProduct?._id === itemId ? selectedProduct : null);
                  const sale = Number(product?.basePrice) || 0;
                  const cost = Number(product?.costPrice) || 0;
                  return (
                    <ComboboxItem key={itemId} value={itemId} className="items-start py-1.5">
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-1">
                        <span className="leading-snug break-words">
                          {labelById[itemId] ?? itemId}
                        </span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          Sal {money(sale)} · Cost {money(cost)}
                        </span>
                      </span>
                    </ComboboxItem>
                  );
                }}
              </ComboboxList>
              {loadingMore ? (
                <p className="text-muted-foreground border-t px-2 py-1.5 text-center text-xs">
                  Loading more…
                </p>
              ) : null}
            </ComboboxContent>
          </Combobox>
        )}
      </div>
    </div>
  );
}
