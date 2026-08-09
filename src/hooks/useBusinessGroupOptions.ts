import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { BusinessGroupRecord } from "@/types";

export interface BusinessGroupOption {
  id: string;
  name: string;
}

interface UseBusinessGroupOptionsParams {
  groups?: BusinessGroupRecord[];
}

export function useBusinessGroupOptions({ groups: externalGroups }: UseBusinessGroupOptionsParams = {}) {
  const [fetchedGroups, setFetchedGroups] = useState<BusinessGroupOption[]>([]);
  const [loading, setLoading] = useState(!externalGroups);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (externalGroups) {
      setFetchedGroups(externalGroups.map((group) => ({ id: group._id, name: group.name })));
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getBusinessGroups()
      .then((data) => {
        if (cancelled) return;
        setFetchedGroups(data.map((group) => ({ id: group._id, name: group.name })));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load business groups.");
        setFetchedGroups([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [externalGroups]);

  const options = externalGroups
    ? externalGroups.map((group) => ({ id: group._id, name: group.name }))
    : fetchedGroups;

  const labelById = useMemo(
    () => Object.fromEntries(options.map((option) => [option.id, option.name])),
    [options]
  );

  return {
    options,
    labelById,
    loading: externalGroups ? false : loading,
    error,
    getLabel: (id: string) => labelById[id] ?? "",
  };
}
