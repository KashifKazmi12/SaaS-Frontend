import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { CategoryRecord } from "@/types";

export function useCategoryOptions(businessId?: string) {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load categories.");
          setCategories([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => {
    const active = categories.filter((category) => category.isActive);
    if (!businessId) return active;

    return active.filter((category) => {
      const id =
        typeof category.business === "object" && category.business
          ? category.business._id
          : typeof category.business === "string"
            ? category.business
            : "";
      return id === businessId;
    });
  }, [categories, businessId]);

  const labelById = useMemo(
    () =>
      Object.fromEntries(
        options.map((category) => [category._id, category.name])
      ),
    [options]
  );

  return {
    options: options.map((category) => ({ id: category._id, name: category.name })),
    loading,
    error,
    labelById,
    getLabel: (id: string) => labelById[id] ?? "",
  };
}
