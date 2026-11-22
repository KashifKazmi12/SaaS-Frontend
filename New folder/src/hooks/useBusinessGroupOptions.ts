import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import type { BusinessGroupRecord } from "@/types";

export interface BusinessGroupOption {
  id: string;
  name: string;
  currency?: string;
  code?: string;
}

interface UseBusinessGroupOptionsParams {
  groups?: BusinessGroupRecord[];
  /** Pre-mapped options (e.g. from page state). */
  options?: BusinessGroupOption[];
}

/** Group list from the signed-in session — no per-page API fetch unless options/groups passed in. */
export function useBusinessGroupOptions({
  groups: externalGroups,
  options: optionsProp,
}: UseBusinessGroupOptionsParams = {}) {
  const { user } = useAuth();

  const options = useMemo<BusinessGroupOption[]>(() => {
    if (Array.isArray(optionsProp)) return optionsProp;
    if (externalGroups) {
      return externalGroups.map((group) => ({
        id: group._id,
        name: group.name,
        currency: group.currency,
        code: group.code,
      }));
    }
    return (user?.businessGroups ?? []).map((group) => ({
      id: group.id,
      name: group.name,
      currency: group.currency,
      code: group.code,
    }));
  }, [optionsProp, externalGroups, user?.businessGroups]);

  const labelById = useMemo(
    () => Object.fromEntries(options.map((option) => [option.id, option.name])),
    [options]
  );

  return {
    options,
    labelById,
    loading: false,
    error: null as string | null,
    getLabel: (id: string) => labelById[id] ?? "",
  };
}
