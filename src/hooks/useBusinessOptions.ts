import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export type BusinessOptionScope = "assigned" | "all";

export interface BusinessOption {
  id: string;
  name: string;
}

export function useBusinessOptions(scope: BusinessOptionScope) {
  const { user } = useAuth();
  const [allBusinesses, setAllBusinesses] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignedOptions = useMemo(
    () => (user?.businesses ?? []).map((business) => ({ id: business.id, name: business.name })),
    [user?.businesses]
  );

  useEffect(() => {
    if (scope !== "all" || !user) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getBusinesses()
      .then((data) => {
        if (cancelled) return;
        setAllBusinesses(data.map((business) => ({ id: business._id, name: business.name })));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load businesses.");
        setAllBusinesses([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, user]);

  const options = scope === "all" ? allBusinesses : assignedOptions;

  const labelById = useMemo(
    () => Object.fromEntries(options.map((option) => [option.id, option.name])),
    [options]
  );

  return {
    options,
    labelById,
    loading: scope === "all" ? loading : false,
    error,
    getLabel: (id: string) => labelById[id] ?? "",
  };
}

export function useBusinessVisibility() {
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin ?? false;
  const assignedCount = user?.businesses?.length ?? 0;

  return {
    isSuperAdmin,
    assignedCount,
    showBusinessColumn: isSuperAdmin || assignedCount > 1,
    needsBusinessPickerOnCreate: isSuperAdmin || assignedCount > 1,
    singleAssignedBusiness: assignedCount === 1 ? user!.businesses[0] : null,
  };
}
