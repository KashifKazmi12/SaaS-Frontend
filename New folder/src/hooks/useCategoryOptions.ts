import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

export function useCategoryOptions(businessId?: string) {
  const [options, setOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getCategoryOptions(businessId)
      .then((data) => {
        if (!cancelled) {
          setOptions(data.items.map((category) => ({ id: category._id, name: category.name })));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load categories.");
          setOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const labelById = useMemo(
    () => Object.fromEntries(options.map((category) => [category.id, category.name])),
    [options]
  );

  return {
    options,
    loading,
    error,
    labelById,
    getLabel: (id: string) => labelById[id] ?? "",
  };
}
