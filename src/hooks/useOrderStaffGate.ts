import { useCallback, useRef } from "react";
import { api } from "@/lib/api";

export type ResolvedStaffCode = {
  staffCode: string;
  staffName: string;
  staffUserId: string;
};

/**
 * Cached lookup for whether a business requires shared-login staff codes.
 * Uses an Orders-module endpoint so branch staff without Businesses permission
 * still get the correct flag.
 */
export function useOrderStaffCodeRequired() {
  const settingsCacheRef = useRef<Record<string, boolean>>({});

  const rememberStaffCodeRequired = useCallback((businessId: string, required: boolean) => {
    const bid = String(businessId || "").trim();
    if (!bid) return;
    settingsCacheRef.current[bid] = required;
  }, []);

  const isStaffCodeRequired = useCallback(async (businessId: string) => {
    const bid = String(businessId || "").trim();
    if (!bid) return false;
    if (Object.prototype.hasOwnProperty.call(settingsCacheRef.current, bid)) {
      return settingsCacheRef.current[bid];
    }
    try {
      const data = await api.getOrderStaffCodeRequired(bid);
      const required = Boolean(data.required);
      settingsCacheRef.current[bid] = required;
      return required;
    } catch {
      // Do not cache failures — permission/network blips should retry next action.
      return false;
    }
  }, []);

  return {
    isStaffCodeRequired,
    rememberStaffCodeRequired,
  };
}

/** Validate a typed staff code against the business before create/save/refund. */
export async function validateOrderStaffCode(
  businessId: string,
  code: string
): Promise<ResolvedStaffCode> {
  const bid = String(businessId || "").trim();
  const staffCode = String(code || "").trim();
  if (!bid) throw new Error("Select a business first.");
  if (!staffCode) throw new Error("Enter a staff code.");
  const staff = await api.resolveOrderStaffCode({ businessId: bid, staffCode });
  return {
    staffCode,
    staffName: staff.name,
    staffUserId: staff._id,
  };
}

export function staffCodePayload(staffCode?: string | null) {
  const code = String(staffCode || "").trim();
  return code ? { staffCode: code } : {};
}
