import { useEffect, useState } from "react";
import {
  type BusinessOptionScope,
  useBusinessOptions,
  useBusinessVisibility,
} from "@/hooks/useBusinessOptions";

export function useBusinessScopeState(platformValue = "") {
  const { isSuperAdmin, assignedCount, singleAssignedBusiness } = useBusinessVisibility();
  const scope: BusinessOptionScope = isSuperAdmin ? "all" : "assigned";
  const { getLabel } = useBusinessOptions(scope);
  const [businessId, setBusinessId] = useState(platformValue);

  useEffect(() => {
    if (!isSuperAdmin && assignedCount === 1 && singleAssignedBusiness) {
      setBusinessId(singleAssignedBusiness.id);
    }
  }, [isSuperAdmin, assignedCount, singleAssignedBusiness]);

  const showPicker = isSuperAdmin || assignedCount > 1;

  const scopeLabel =
    isSuperAdmin && businessId === platformValue
      ? "Platform default"
      : getLabel(businessId) || singleAssignedBusiness?.name || "Business";

  return {
    businessId,
    setBusinessId,
    showPicker,
    singleAssignedBusiness,
    isSuperAdmin,
    scope,
    scopeLabel,
    platformValue,
  };
}
