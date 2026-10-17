import { useEffect, useMemo, useRef, useState } from "react";
import { FieldLabel } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
  /** Applied to the searchable input (e.g. compact filter width). */
  inputClassName?: string;
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

/** Combobox items cannot use "" reliably — map empty option values through this. */
const EMPTY_ITEM = "__enum_select_empty__";

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

function toItemValue<T extends string>(value: T): string {
  return value === ("" as T) ? EMPTY_ITEM : String(value);
}

function fromItemValue<T extends string>(itemValue: string | null): T {
  if (itemValue == null || itemValue === EMPTY_ITEM) return "" as T;
  return itemValue as T;
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
  inputClassName,
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
  const [open, setOpen] = useState(false);
  const skipFocusOpenRef = useRef(false);

  const labelByItem = useMemo(() => {
    const map: Record<string, string> = {};
    for (const option of options) {
      map[toItemValue(option.value)] = option.label;
    }
    return map;
  }, [options]);

  const items = useMemo(
    () => options.map((option) => toItemValue(option.value)),
    [options]
  );

  const comboboxValue = value === ("" as T) && !options.some((o) => o.value === ("" as T))
    ? null
    : toItemValue(value);

  useEffect(() => {
    if (focusOpenToken == null || focusOpenToken === "") return;
    skipFocusOpenRef.current = false;
    const frame = requestAnimationFrame(() => {
      const trigger = document.getElementById(fieldId);
      if (!trigger) return;
      trigger.focus();
      if (!value) setOpen(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusOpenToken, fieldId, value]);

  function setOpenState(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
    if (!next) {
      skipFocusOpenRef.current = true;
    }
  }

  return (
    <div className={cn(className)}>
      <div className={cn((label || hint) && "space-y-2")}>
        {label ? (
          <FieldLabel htmlFor={fieldId} required={required}>
            {label}
          </FieldLabel>
        ) : null}

        {readOnly || disabled ? (
          <Input id={fieldId} value={displayName || "—"} disabled />
        ) : (
          <Combobox
            items={items}
            value={comboboxValue}
            open={open}
            onOpenChange={(next) => {
              setOpenState(next);
            }}
            onValueChange={(nextValue) => {
              const resolved = fromItemValue<T>(nextValue);
              onValueChange?.(resolved);
              if (!advanceFocusOnSelect) return;
              window.setTimeout(() => {
                focusNextTabbable(document.getElementById(fieldId));
              }, 20);
            }}
            itemToStringLabel={(itemValue) => labelByItem[itemValue] ?? itemValue}
            required={required}
          >
            <ComboboxInput
              id={fieldId}
              placeholder={placeholder}
              className={cn("w-full", inputClassName)}
              onFocus={() => {
                if (!autoOpenOnFocus) return;
                if (skipFocusOpenRef.current) {
                  skipFocusOpenRef.current = false;
                  return;
                }
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
            />
            <ComboboxContent>
              <ComboboxEmpty>No results.</ComboboxEmpty>
              <ComboboxList>
                {(itemValue) => (
                  <ComboboxItem key={itemValue} value={itemValue}>
                    {labelByItem[itemValue] ?? itemValue}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        )}

        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
