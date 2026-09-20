import { useCallback, useEffect, useMemo, useState } from "react";
import { ALL_FILTER } from "@/lib/listFilters";
import { useDebouncedValue } from "./useDebouncedValue";

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50];
const FILTER_DEBOUNCE_MS = 300;

export function useListQuery() {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const search = useDebouncedValue(searchInput, FILTER_DEBOUNCE_MS);

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setFilters({});
  }, []);

  const setLimit = useCallback((nextLimit: number) => {
    setLimitState(nextLimit);
    setPage(1);
  }, []);

  const getFilter = useCallback(
    (key: string, fallback = ALL_FILTER) => filters[key] || fallback,
    [filters]
  );

  const params = useMemo(
    () => ({
      page,
      limit,
      search,
      ...filters,
    }),
    [page, limit, search, filters]
  );

  const activeCount =
    Number(Boolean(searchInput.trim())) +
    Object.values(filters).filter((value) => value && value !== ALL_FILTER).length;

  return {
    page,
    setPage,
    limit,
    setLimit,
    searchInput,
    setSearchInput,
    search,
    filters,
    setFilter,
    getFilter,
    clearFilters,
    params,
    activeCount,
  };
}
