import { EnumSelect, FieldLabel, FormCheckboxField, FormField } from "@/components/shared";
import { Textarea } from "@/components/ui/textarea";
import { emptyFieldValue, detailEntityFields, visibleAdminFields } from "@/constants/entityFields";
import type { EntityFieldDefinition } from "@/types";
import { cn } from "@/lib/utils";

interface DynamicEntityFieldsProps {
  fields: EntityFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  idPrefix?: string;
  disabled?: boolean;
  /** admin = Show on admin fields; detail = all visible fields (ignores Show in list). */
  surface?: "admin" | "detail";
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function DynamicEntityFields({
  fields,
  values,
  onChange,
  idPrefix = "entity",
  disabled = false,
  surface = "admin",
}: DynamicEntityFieldsProps) {
  const visible =
    surface === "detail" ? detailEntityFields(fields) : visibleAdminFields(fields);

  return (
    <>
      {visible.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const wide = field.type === "textarea" || field.key === "address" || field.key === "notes";
        const value = values[field.key] ?? emptyFieldValue(field);

        return (
          <div key={field.key} className={cn(wide && "sm:col-span-2")}>
            {field.type === "textarea" ? (
              <div className="space-y-2">
                <FieldLabel htmlFor={id} required={field.required}>
                  {field.label}
                </FieldLabel>
                <Textarea
                  id={id}
                  value={stringValue(value)}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  required={field.required}
                  rows={3}
                  disabled={disabled}
                />
              </div>
            ) : field.type === "boolean" ? (
              <FormCheckboxField
                id={id}
                label={field.label}
                checked={Boolean(value)}
                onCheckedChange={(checked) => onChange(field.key, checked)}
                required={field.required}
                disabled={disabled}
              />
            ) : field.type === "select" ? (
              <EnumSelect
                id={id}
                label={field.label}
                value={stringValue(value)}
                onValueChange={(next) => onChange(field.key, next)}
                options={field.options.map((option) => ({ value: option, label: option }))}
                required={field.required}
                placeholder={`Select ${field.label.toLowerCase()}`}
                disabled={disabled}
              />
            ) : (
              <FormField
                id={id}
                label={field.label}
                type={
                  field.type === "number"
                    ? "number"
                    : field.type === "email"
                      ? "email"
                      : field.type === "phone"
                        ? "tel"
                        : field.type === "date"
                          ? "date"
                          : "text"
                }
                min={field.type === "number" ? 0 : undefined}
                step={field.type === "number" ? "any" : undefined}
                value={stringValue(value)}
                onChange={(event) => onChange(field.key, event.target.value)}
                required={field.required}
                disabled={disabled}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
