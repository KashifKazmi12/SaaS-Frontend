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
import type { StockRecord } from "@/types";

const PAGE_SIZE = 40;
const SEARCH_DEBOUNCE_MS = 250;

function stockLabel(stock: StockRecord) {
  const productName =
    typeof stock.product === "object" && stock.product ? stock.product.name : "Product";
  const variation = stock.variation?.name ? ` · ${stock.variation.name}` : "";
  const sku = stock.sku ? ` (${stock.sku})` : "";
  return `${productName}${variation}${sku}`;
}

export function StockItemSelect({
  businessId,
  value,
  selectedStock = null,
  onSelect,
  label = "Product",
  placeholder = "Search product or SKU",
  id = "stock-item-select",
  required = false,
  disabled = false,
  excludeIds = [],
  onEnterWhenClosed,
}: {
  businessId: string;
  value: string;
  selectedStock?: StockRecord | null;
  onSelect: (stock: StockRecord | null) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  excludeIds?: string[];
  onEnterWhenClosed?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StockRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const exclude = useMemo(() => new Set(excludeIds.filter(Boolean)), [excludeIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setTotalPages(1);
    setSearchInput("");
    setDebouncedSearch("");
    setError("");
  }, [businessId]);

  const loadPage = useCallback(
    async (nextPage: number, search: string, append: boolean) => {
      if (!businessId) return;
      const requestId = ++requestIdRef.current;
      if (append) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");
      try {
        const result = await api.getStock({
          businessId,
          page: nextPage,
          limit: PAGE_SIZE,
          search,
          status: "active",
        });
        if (requestId !== requestIdRef.current) return;
        setItems((current) => {
          const source = append ? [...current, ...result.items] : result.items;
          const seen = new Set<string>();
          return source.filter((row) => {
            if (exclude.has(row._id) && row._id !== value) return false;
            if (seen.has(row._id)) return false;
            seen.add(row._id);
            return true;
          });
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
    [businessId, exclude, value]
  );

  useEffect(() => {
    if (!open || !businessId) return;
    void loadPage(1, debouncedSearch, false);
  }, [open, businessId, debouncedSearch, loadPage]);

  const displayItems = useMemo(() => {
    if (!selectedStock) return items;
    if (items.some((row) => row._id === selectedStock._id)) return items;
    return [selectedStock, ...items];
  }, [items, selectedStock]);

  const labelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of displayItems) map[row._id] = stockLabel(row);
    if (selectedStock) map[selectedStock._id] = stockLabel(selectedStock);
    return map;
  }, [displayItems, selectedStock]);

  const itemIds = useMemo(() => displayItems.map((row) => row._id), [displayItems]);

  function maybeLoadMore(target: HTMLElement) {
    if (loading || loadingMoreRef.current) return;
    if (page >= totalPages) return;
    if (target.scrollTop + target.clientHeight < target.scrollHeight - 48) return;
    void loadPage(page + 1, debouncedSearch, true);
  }

  if (!businessId) {
    return (
      <div className="space-y-2">
        {label ? (
          <FieldLabel htmlFor={id} required={required}>
            {label}
          </FieldLabel>
        ) : null}
        <Input id={id} value="Select a business first" disabled />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label ? (
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>
      ) : null}
      {disabled ? (
        <Input
          id={id}
          value={selectedStock ? stockLabel(selectedStock) : "—"}
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
                ? labelById[value] || ""
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
            const stock =
              displayItems.find((row) => row._id === nextValue) ||
              (selectedStock?._id === nextValue ? selectedStock : null);
            onSelect(stock);
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
          <ComboboxContent>
            <ComboboxEmpty>
              {loading ? "Loading…" : error || "No products found."}
            </ComboboxEmpty>
            <ComboboxList onScroll={(event) => maybeLoadMore(event.currentTarget)}>
              {(itemId) => (
                <ComboboxItem key={itemId} value={itemId}>
                  <span className="truncate">{labelById[itemId] ?? itemId}</span>
                </ComboboxItem>
              )}
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
  );
}
