import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

export type BusinessOptionScope = "assigned" | "all";

export interface BusinessOption {
  id: string;
  name: string;
  businessGroupId?: string;
}

/** Business list from the signed-in session — no per-page API fetch. */
export function useBusinessOptions(scope: BusinessOptionScope) {
  const { user } = useAuth();

  const options = useMemo<BusinessOption[]>(() => {
    const list = user?.businesses ?? [];
    // Session already holds assigned (staff) or all active (super admin).
    void scope;
    return list.map((business) => ({
      id: business.id,
      name: business.name,
      businessGroupId: business.businessGroupId,
    }));
  }, [user?.businesses, scope]);

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
