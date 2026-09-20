import { useEffect, useMemo, useState } from "react";
import { ALL_FILTER } from "@/lib/listFilters";
import { api } from "@/lib/api";
import type { InsightsGroup, InsightsRange } from "@/types";

export const INSIGHTS_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
] as const;

export function insightsTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayInputValue() {
  return toDateInputValue(new Date());
}

function defaultCustomRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

export function useInsightsScope() {
  const [groups, setGroups] = useState<InsightsGroup[]>([]);
  const [groupId, setGroupId] = useState("");
  const [businessId, setBusinessId] = useState(ALL_FILTER);
  const [range, setRangeState] = useState<InsightsRange>("7d");
  const [customFrom, setCustomFromState] = useState("");
  const [customTo, setCustomToState] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .getInsightGroups()
      .then((data) => {
        if (cancelled) return;
        setGroups(data.items);
        setGroupId((current) => current || data.items[0]?._id || "");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load groups.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const group = useMemo(
    () => groups.find((item) => item._id === groupId) || null,
    [groups, groupId]
  );

  const customReady =
    range !== "custom" || Boolean(customFrom && customTo && customFrom <= customTo);

  const params = useMemo(
    () => ({
      groupId,
      businessId: businessId === ALL_FILTER ? undefined : businessId,
      range,
      from: range === "custom" ? customFrom : undefined,
      to: range === "custom" ? customTo : undefined,
      timeZone: insightsTimeZone(),
    }),
    [groupId, businessId, range, customFrom, customTo]
  );

  function onGroupChange(next: string) {
    setGroupId(next);
    setBusinessId(ALL_FILTER);
  }

  function setRange(next: InsightsRange) {
    setRangeState(next);
    if (next === "custom" && (!customFrom || !customTo)) {
      const seeded = defaultCustomRange();
      setCustomFromState(seeded.from);
      setCustomToState(seeded.to);
    }
  }

  function setCustomFrom(next: string) {
    setCustomFromState(next);
    if (customTo && next > customTo) setCustomToState(next);
  }

  function setCustomTo(next: string) {
    setCustomToState(next);
    if (customFrom && next < customFrom) setCustomFromState(next);
  }

  return {
    groups,
    group,
    groupId,
    setGroupId: onGroupChange,
    businessId,
    setBusinessId,
    range,
    setRange,
    customFrom,
    customTo,
    setCustomFrom,
    setCustomTo,
    params,
    error,
    setError,
    ready: Boolean(groupId),
    canFetch: Boolean(groupId) && customReady,
  };
}
