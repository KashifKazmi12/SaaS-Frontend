import type { FormEvent } from "react";
import { useState } from "react";
import { ChevronDown, ChevronUp, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import {
  CrudDialog,
  EnumSelect,
  FieldLabel,
  FormCheckboxField,
  FormField,
  PermissionIconButton,
  useConfirm,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { FIELD_TYPE_OPTIONS, fieldTypeLabel, toFieldKey } from "@/constants/entityFields";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { EntityFieldDefinition, EntityFieldType } from "@/types";

interface EntityFieldSchemaEditorProps {
  fields: EntityFieldDefinition[];
  presets: EntityFieldDefinition[];
  onChange: (fields: EntityFieldDefinition[]) => void;
  canUpdate: boolean;
}

function moveField(fields: EntityFieldDefinition[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= fields.length) return fields;
  const next = [...fields];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function patchField(
  fields: EntityFieldDefinition[],
  key: string,
  patch: Partial<EntityFieldDefinition>
) {
  return fields.map((item) => (item.key === key ? { ...item, ...patch } : item));
}

export function EntityFieldSchemaEditor({
  fields,
  presets,
  onChange,
  canUpdate,
}: EntityFieldSchemaEditorProps) {
  const { confirm } = useConfirm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [type, setType] = useState<EntityFieldType>("text");
  const [required, setRequired] = useState(false);
  const [showInList, setShowInList] = useState(false);
  const [showOnCustomerApp, setShowOnCustomerApp] = useState(false);
  const [optionsText, setOptionsText] = useState("");
  const [dialogError, setDialogError] = useState("");

  const unusedPresets = presets.filter(
    (preset) => !fields.some((field) => field.key === preset.key)
  );

  function resetDialog() {
    setLabel("");
    setKey("");
    setKeyTouched(false);
    setType("text");
    setRequired(false);
    setShowInList(false);
    setShowOnCustomerApp(false);
    setOptionsText("");
    setDialogError("");
    setShowMore(false);
  }

  function handleLabelChange(value: string) {
    setLabel(value);
    if (!keyTouched) setKey(toFieldKey(value));
  }

  function handleAddField(event: FormEvent) {
    event.preventDefault();
    const nextKey = toFieldKey(key || label);
    if (!label.trim()) {
      setDialogError("Enter a label.");
      return;
    }
    if (!nextKey) {
      setDialogError("Enter a field key.");
      return;
    }
    if (fields.some((field) => field.key === nextKey)) {
      setDialogError("That key is already used.");
      return;
    }

    const options = optionsText
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);

    if (type === "select" && options.length === 0) {
      setDialogError("Add one option per line.");
      return;
    }

    onChange([
      ...fields,
      {
        key: nextKey,
        label: label.trim(),
        type,
        required,
        locked: false,
        hideable: true,
        visible: true,
        showOnAdmin: true,
        showOnCustomerApp,
        showInList,
        options,
      },
    ]);
    setDialogOpen(false);
    resetDialog();
  }

  async function handleRemove(field: EntityFieldDefinition) {
    const confirmed = await confirm({
      title: `Remove ${field.label}?`,
      description: "Saved values for this field will also be removed.",
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!confirmed) return;
    onChange(fields.filter((item) => item.key !== field.key));
  }

  return (
    <div className="space-y-4">
      <div className="divide-y rounded-xl border">
        {fields.map((field, index) => (
          <div
            key={field.key}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{field.label}</p>
                <Badge variant={field.locked ? "secondary" : "outline"}>
                  {field.locked ? "System" : "Custom"}
                </Badge>
                <span className="text-muted-foreground text-xs">{fieldTypeLabel(field.type)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {field.hideable ? (
                <FormCheckboxField
                  id={`visible-${field.key}`}
                  label="Visible"
                  checked={field.visible}
                  onCheckedChange={(checked) => onChange(patchField(fields, field.key, { visible: checked }))}
                />
              ) : (
                <span className="text-muted-foreground text-xs">Always visible</span>
              )}

              {!field.locked && (
                <FormCheckboxField
                  id={`required-${field.key}`}
                  label="Required"
                  checked={field.required}
                  onCheckedChange={(checked) =>
                    onChange(patchField(fields, field.key, { required: checked }))
                  }
                />
              )}

              {canUpdate && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => onChange(moveField(fields, index, -1))}
                  >
                    <ChevronUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Move down"
                    disabled={index === fields.length - 1}
                    onClick={() => onChange(moveField(fields, index, 1))}
                  >
                    <ChevronDown className="size-3.5" />
                  </Button>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="More options"
                        />
                      }
                    >
                      <MoreHorizontal className="size-3.5" />
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64">
                      <PopoverHeader>
                        <PopoverTitle>More options</PopoverTitle>
                      </PopoverHeader>
                      <p className="text-muted-foreground text-xs">Key: {field.key}</p>
                      {!field.locked && (
                        <FormCheckboxField
                          id={`list-${field.key}`}
                          label="Show in list"
                          checked={field.showInList}
                          onCheckedChange={(checked) =>
                            onChange(patchField(fields, field.key, { showInList: checked }))
                          }
                        />
                      )}
                      <FormCheckboxField
                        id={`app-${field.key}`}
                        label="Show on customer app"
                        checked={field.showOnCustomerApp}
                        onCheckedChange={(checked) =>
                          onChange(patchField(fields, field.key, { showOnCustomerApp: checked }))
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  {!field.locked && (
                    <PermissionIconButton
                      modulePath={MODULE_PATHS.BUSINESSES_LIST}
                      action="update"
                      variant="destructive"
                      size="icon-sm"
                      label="Remove field"
                      icon={<Trash2 className="size-3.5" />}
                      onClick={() => handleRemove(field)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {canUpdate && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              resetDialog();
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add field
          </Button>
          {unusedPresets.map((preset) => (
            <Button
              key={preset.key}
              type="button"
              variant="outline"
              onClick={() => onChange([...fields, preset])}
            >
              Add {preset.label.toLowerCase()}
            </Button>
          ))}
        </div>
      )}

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={false}
        createTitle="Add field"
        editTitle="Add field"
        createSubmitLabel="Add field"
        onSubmit={handleAddField}
      >
        {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
        <FormField
          id="new-field-label"
          label="Label"
          value={label}
          onChange={(event) => handleLabelChange(event.target.value)}
          required
        />
        <EnumSelect
          id="new-field-type"
          label="Type"
          value={type}
          onValueChange={setType}
          options={FIELD_TYPE_OPTIONS}
          required
        />
        {type === "select" && (
          <div className="space-y-2">
            <FieldLabel htmlFor="new-field-options" required>
              Options
            </FieldLabel>
            <Textarea
              id="new-field-options"
              value={optionsText}
              onChange={(event) => setOptionsText(event.target.value)}
              rows={4}
              required
            />
            <p className="text-muted-foreground text-xs">Enter one option per line.</p>
          </div>
        )}
        <FormCheckboxField
          id="new-field-required"
          label="Required"
          checked={required}
          onCheckedChange={setRequired}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-0"
          onClick={() => setShowMore((current) => !current)}
        >
          {showMore ? "Hide extra options" : "More options"}
        </Button>
        {showMore && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <FormField
              id="new-field-key"
              label="Key"
              value={key}
              onChange={(event) => {
                setKeyTouched(true);
                setKey(toFieldKey(event.target.value) || event.target.value);
              }}
            />
            <FormCheckboxField
              id="new-field-list"
              label="Show in list"
              checked={showInList}
              onCheckedChange={setShowInList}
            />
            <FormCheckboxField
              id="new-field-app"
              label="Show on customer app"
              checked={showOnCustomerApp}
              onCheckedChange={setShowOnCustomerApp}
            />
          </div>
        )}
      </CrudDialog>
    </div>
  );
}
