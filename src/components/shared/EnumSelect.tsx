import { useEffect, useRef, useState } from "react";
import { FieldLabel } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface EnumOption<T extends string = string> {
  value: T;
  label: string;
}

export interface EnumSelectProps<T extends string = string> {
  value: T;
  onValueChange?: (value: T) => void;
  options: EnumOption<T>[];
  label?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  hint?: string;
  /** Open the menu on focus only when the field has no value yet. */
  autoOpenOnFocus?: boolean;
  /** After choosing an option, move focus to the next field (like Tab). */
  advanceFocusOnSelect?: boolean;
  /**
   * When this value changes to a new non-null token, focus the trigger and open.
   * Use a unique string (e.g. row key + counter) for each request.
   */
  focusOpenToken?: string | null;
  /** Enter while the menu is closed — not while choosing an option. */
  onEnterWhenClosed?: () => void;
  onOpenChange?: (open: boolean) => void;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusNextTabbable(from: HTMLElement | null) {
  if (!from) return;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => {
      if (el.getAttribute("tabindex") === "-1") return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      if (el.closest("[aria-hidden='true']")) return false;
      if (el.getClientRects().length === 0) return false;
      return true;
    }
  );
  const index = nodes.indexOf(from);
  if (index < 0) return;
  nodes[index + 1]?.focus();
}

export function EnumSelect<T extends string = string>({
  value,
  onValueChange,
  options,
  label,
  placeholder = "Select option",
  id,
  required = false,
  disabled = false,
  readOnly = false,
  className,
  hint,
  autoOpenOnFocus = false,
  advanceFocusOnSelect = autoOpenOnFocus,
  focusOpenToken = null,
  onEnterWhenClosed,
  onOpenChange,
}: EnumSelectProps<T>) {
  const fieldId = id ?? "enum-select";
  const selected = options.find((option) => option.value === value);
  const displayName = selected?.label ?? value;
  const selectItems = options.map((option) => ({ value: option.value, label: option.label }));
  const [open, setOpen] = useState(false);
  const skipFocusOpenRef = useRef(false);

  useEffect(() => {
    if (focusOpenToken == null || focusOpenToken === "") return;
    skipFocusOpenRef.current = false;
    // Frame so the new row trigger exists before we focus/open.
    const frame = requestAnimationFrame(() => {
      const trigger = document.getElementById(fieldId);
      if (!trigger) return;
      trigger.focus();
      // Only auto-open empty fields (new row / first visit).
      if (!value) setOpen(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusOpenToken, fieldId, value]);

  function setOpenState(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
    // Any dismiss (Escape, outside click, select) — don't immediately reopen on the
    // focus bounce back to the trigger. Next intentional focus can still auto-open.
    if (!next) {
      skipFocusOpenRef.current = true;
    }
  }

  return (
    <div className={cn(className)}>
      <div className="space-y-2">
        {label && (
          <FieldLabel htmlFor={fieldId} required={required}>
            {label}
          </FieldLabel>
        )}

        {readOnly || disabled ? (
          <Input id={fieldId} value={displayName || "—"} disabled />
        ) : (
          <Select
            value={value}
            open={open}
            onOpenChange={(next) => {
              setOpenState(next);
            }}
            onValueChange={(nextValue) => {
              if (!nextValue) return;
              onValueChange?.(nextValue as T);
              if (!advanceFocusOnSelect) return;
              // Wait a tick so React can swap fields (e.g. price → variation).
              window.setTimeout(() => {
                focusNextTabbable(document.getElementById(fieldId));
              }, 20);
            }}
            items={selectItems}
          >
            <SelectTrigger
              id={fieldId}
              className="w-full"
              onFocus={() => {
                if (!autoOpenOnFocus) return;
                if (skipFocusOpenRef.current) {
                  skipFocusOpenRef.current = false;
                  return;
                }
                // First visit only — don't reopen when a value is already chosen.
                if (value) return;
                setOpenState(true);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || open) return;
                if (!onEnterWhenClosed) return;
                event.preventDefault();
                event.stopPropagation();
                onEnterWhenClosed();
              }}
            >
              <SelectValue placeholder={placeholder}>
                {displayName || null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
