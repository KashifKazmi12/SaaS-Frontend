import { useState } from "react";
import { BusinessGroupSelect, BusinessSelect } from "@/components/business";
import { FieldLabel } from "@/components/shared";
import { ALL_FILTER } from "@/lib/listFilters";
import { INSIGHTS_RANGE_OPTIONS, todayInputValue, toDateInputValue } from "@/hooks/useInsightsScope";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BusinessGroupRecord, InsightsGroup, InsightsRange, NamedOption } from "@/types";
import { formatInsightDateRange, insightsRangeLabel } from "./insightsUtils";

function defaultDraftRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

export function InsightsFilters({
  groups,
  groupId,
  onGroupChange,
  businesses,
  businessId,
  onBusinessChange,
  range,
  onRangeChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  group,
  rangeFrom,
  rangeTo,
  loading = false,
}: {
  groups: InsightsGroup[];
  groupId: string;
  onGroupChange: (value: string) => void;
  businesses: NamedOption[];
  businessId: string;
  onBusinessChange: (value: string) => void;
  range: InsightsRange;
  onRangeChange: (value: InsightsRange) => void;
  customFrom?: string;
  customTo?: string;
  onCustomFromChange?: (value: string) => void;
  onCustomToChange?: (value: string) => void;
  group?: InsightsGroup | null;
  rangeFrom?: string;
  rangeTo?: string;
  loading?: boolean;
}) {
  const activeGroup = group || groups.find((item) => item._id === groupId) || null;
  const today = todayInputValue();
  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const rangeCaption =
    range === "custom" && customFrom && customTo
      ? formatInsightDateRange(customFrom, customTo)
      : rangeFrom && rangeTo
        ? formatInsightDateRange(rangeFrom, rangeTo)
        : insightsRangeLabel(range);
  const draftValid = Boolean(draftFrom && draftTo && draftFrom <= draftTo);

  function openCustomDialog() {
    if (customFrom && customTo) {
      setDraftFrom(customFrom);
      setDraftTo(customTo);
    } else {
      const seeded = defaultDraftRange();
      setDraftFrom(seeded.from);
      setDraftTo(seeded.to);
    }
    setCustomOpen(true);
  }

  function handlePeriodClick(next: InsightsRange) {
    if (next === "custom") {
      openCustomDialog();
      return;
    }
    onRangeChange(next);
  }

  function applyCustom() {
    if (!draftValid) return;
    onCustomFromChange?.(draftFrom);
    onCustomToChange?.(draftTo);
    onRangeChange("custom");
    setCustomOpen(false);
  }

  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {groups.length <= 1 ? (
            <p className="truncate text-sm font-medium">{activeGroup?.name || "Business group"}</p>
          ) : null}
          {activeGroup?.currency ? (
            <Badge variant="outline" className="h-6 px-1.5 text-[10px] font-normal">
              {activeGroup.currency}
            </Badge>
          ) : null}
          <span className="text-muted-foreground text-xs">{rangeCaption}</span>
          {groups.length > 1 || businesses.length > 1 ? (
            <span className="bg-border hidden h-4 w-px sm:block" />
          ) : null}
          {groups.length > 1 ? (
            <div className="flex h-8 min-w-[200px] items-center rounded-md border bg-background pl-2.5">
              <span className="text-muted-foreground shrink-0 text-xs">Group</span>
              <BusinessGroupSelect
                id="insights-group"
                label=""
                groups={groups as BusinessGroupRecord[]}
                value={groupId}
                onValueChange={onGroupChange}
                allowEmpty={false}
                visibility="always"
                triggerSize="sm"
                triggerClassName="border-0 bg-transparent shadow-none dark:bg-transparent"
                className="min-w-0 flex-1"
              />
            </div>
          ) : null}
          {businesses.length > 1 ? (
            <div className="flex h-8 min-w-[200px] items-center rounded-md border bg-background pl-2.5">
              <span className="text-muted-foreground shrink-0 text-xs">Branch</span>
              <BusinessSelect
                id="insights-branch"
                label=""
                scope="assigned"
                options={businesses.map((item) => ({ id: item._id, name: item.name }))}
                extraOptions={[{ value: ALL_FILTER, label: "All branches" }]}
                value={businessId || ALL_FILTER}
                onValueChange={onBusinessChange}
                visibility="always"
                triggerSize="sm"
                triggerClassName="border-0 bg-transparent shadow-none dark:bg-transparent"
                className="min-w-0 flex-1"
              />
            </div>
          ) : null}
        </div>

        <div className="bg-muted inline-flex w-fit flex-wrap rounded-md p-0.5">
          {INSIGHTS_RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => handlePeriodClick(option.value)}
              className={cn(
                "h-7 rounded-md px-2.5 text-xs",
                range === option.value
                  ? "bg-background text-foreground shadow-sm hover:bg-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom period</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="insights-from" required>
                From
              </FieldLabel>
              <Input
                id="insights-from"
                type="date"
                value={draftFrom}
                max={draftTo || today}
                onChange={(event) => {
                  const next = event.target.value;
                  setDraftFrom(next);
                  if (draftTo && next > draftTo) setDraftTo(next);
                }}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="insights-to" required>
                To
              </FieldLabel>
              <Input
                id="insights-to"
                type="date"
                value={draftTo}
                min={draftFrom || undefined}
                max={today}
                onChange={(event) => {
                  const next = event.target.value;
                  setDraftTo(next);
                  if (draftFrom && next < draftFrom) setDraftFrom(next);
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyCustom} disabled={!draftValid}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
