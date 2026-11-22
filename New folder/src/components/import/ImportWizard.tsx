import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { BusinessGroupSelect, BusinessSelect } from "@/components/business";
import { FieldLabel } from "@/components/shared/FormField";
import { EnumSelect } from "@/components/shared/EnumSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBusinessGroupOptions } from "@/hooks/useBusinessGroupOptions";
import { useBusinessOptions, type BusinessOptionScope } from "@/hooks/useBusinessOptions";
import { cn } from "@/lib/utils";
import {
  applyColumnMap,
  applyPackPriceToBaseUnit,
  autoMapColumns,
  parseExcelFile,
  type ImportTargetField,
  type ParsedSheet,
  type SheetRow,
} from "@/lib/excelImport";
import type { ImportResultSummary, StockQuantityMode } from "./importFields";
import {
  defaultStockImportUnit,
  resolveStockImportProduct,
  StockImportProductCell,
  stockImportSellUnitOptions,
} from "./StockImportProductCell";
import {
  PRODUCT_UNIT_OPTIONS,
  normalizeProductUnit,
  type ProductUnit,
} from "@/constants/catalog";
import type { ProductRecord } from "@/types";

type Step = "scope" | "file" | "map" | "preview" | "done";

const STEP_LABEL: Record<Step, string> = {
  scope: "Business",
  file: "File",
  map: "Map",
  preview: "Preview",
  done: "Done",
};

export interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: ImportTargetField[];
  businessScope?: BusinessOptionScope;
  /** Stock import only: preview shows every row as editable. Product import stays read-only sample. */
  editablePreview?: boolean;
  onImport: (payload: {
    businessId: string;
    rows: Record<string, string>[];
    quantityMode: StockQuantityMode;
  }) => Promise<ImportResultSummary>;
  onFinished?: () => void;
}

function StepRail({ steps, current }: { steps: Step[]; current: Step }) {
  const index = steps.indexOf(current);
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, i) => {
        const active = current === "done" || (index >= 0 && i <= index);
        return (
          <div key={step} className="flex min-w-0 flex-1 flex-col gap-1">
            <div
              className={cn(
                "h-1 rounded-full transition-colors",
                active ? "bg-primary" : "bg-muted"
              )}
            />
            <span
              className={cn(
                "truncate text-[11px]",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {STEP_LABEL[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MultiColumnPicker({
  columns,
  value,
  onChange,
}: {
  columns: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2">
      {columns.map((col) => {
        const checked = value.includes(col);
        return (
          <button
            key={col}
            type="button"
            onClick={() =>
              onChange(
                checked ? value.filter((item) => item !== col) : [...value, col]
              )
            }
            className={cn(
              "rounded-md border px-2 py-1 text-xs transition-colors",
              checked
                ? "border-primary bg-primary/10 text-foreground"
                : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            {col}
          </button>
        );
      })}
    </div>
  );
}

function resolveScopeState(
  groups: Array<{ id: string }>,
  businesses: Array<{ id: string; businessGroupId?: string }>,
  groupId: string
) {
  const showGroupPicker = groups.length > 1;
  const effectiveGroupId =
    groupId || (groups.length === 1 ? groups[0].id : "");

  const businessesInScope = effectiveGroupId
    ? businesses.filter((row) => row.businessGroupId === effectiveGroupId)
    : showGroupPicker
      ? []
      : businesses;

  const showBusinessPicker = businessesInScope.length > 1;
  const autoBusinessId =
    businessesInScope.length === 1 ? businessesInScope[0].id : "";
  const needsScopeStep = showGroupPicker || showBusinessPicker;

  return {
    showGroupPicker,
    showBusinessPicker,
    effectiveGroupId,
    businessesInScope,
    autoBusinessId,
    needsScopeStep,
  };
}

export function ImportWizard({
  open,
  onOpenChange,
  title,
  fields,
  businessScope = "assigned",
  editablePreview = false,
  onImport,
  onFinished,
}: ImportWizardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { options: groupOptions } = useBusinessGroupOptions();
  const { options: businessOptions } = useBusinessOptions(businessScope);

  const [step, setStep] = useState<Step>("file");
  const [groupId, setGroupId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, string[]>>({});
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [result, setResult] = useState<ImportResultSummary | null>(null);
  const [quantityMode, setQuantityMode] = useState<StockQuantityMode>("add");
  /** Pack unit for optional packaging map (same for the whole file). */
  const [packagingUnit, setPackagingUnit] = useState<ProductUnit>("pack");
  /** Editable copy of mapped rows — corrected on the preview step before import. */
  const [editableRows, setEditableRows] = useState<Record<string, string>[]>([]);
  /** Stock preview: sku/name → whether a catalog product matches. */
  const [skuMatchByValue, setSkuMatchByValue] = useState<Record<string, boolean>>(
    {}
  );
  const [skuProductByValue, setSkuProductByValue] = useState<
    Record<string, ProductRecord>
  >({});
  const [skuMatchChecking, setSkuMatchChecking] = useState(false);

  const supportsQuantity = fields.some((field) => field.key === "quantity");
  const quantityMapped = (mapping.quantity || []).length > 0;
  const hasPackagingField = fields.some((field) => field.packaging);

  const scope = useMemo(
    () => resolveScopeState(groupOptions, businessOptions, groupId),
    [groupOptions, businessOptions, groupId]
  );

  const railSteps = useMemo<Step[]>(() => {
    const steps: Step[] = [];
    if (scope.needsScopeStep) steps.push("scope");
    steps.push("file", "map", "preview");
    return steps;
  }, [scope.needsScopeStep]);

  /** When dialog opens, seed group/business and land on the right first step. */
  useEffect(() => {
    if (!open) return;

    const initialGroupId = groupOptions.length === 1 ? groupOptions[0].id : "";
    const initial = resolveScopeState(groupOptions, businessOptions, initialGroupId);
    const nextBusinessId = initial.autoBusinessId;

    setGroupId(initial.effectiveGroupId);
    setBusinessId(nextBusinessId);
    setSheet(null);
    setMapping({});
    setDragOver(false);
    setError("");
    setSaving(false);
    setResult(null);
    setQuantityMode("add");
    setPackagingUnit("pack");
    setEditableRows([]);
    setSkuMatchByValue({});
    setSkuProductByValue({});
    setSkuMatchChecking(false);
    setStep(initial.needsScopeStep ? "scope" : "file");
  }, [open, groupOptions, businessOptions]);

  /** Keep business in sync when group changes or single-business auto-select applies. */
  useEffect(() => {
    if (!open || step === "done") return;

    if (scope.autoBusinessId) {
      if (businessId !== scope.autoBusinessId) {
        setBusinessId(scope.autoBusinessId);
      }
      return;
    }

    if (
      businessId &&
      !scope.businessesInScope.some((row) => row.id === businessId)
    ) {
      setBusinessId("");
    }
  }, [open, step, scope.autoBusinessId, scope.businessesInScope, businessId]);

  const packagingMapped = Boolean((mapping.packagingFactor || [])[0]);

  const mappedRows = useMemo(() => {
    if (!sheet) return [] as Record<string, string>[];
    let rows = applyColumnMap(sheet.rows, mapping, fields);
    if (!hasPackagingField || !packagingMapped || !packagingUnit) return rows;
    rows = rows.map((row) => ({
      ...row,
      packagingUnit,
    }));
    // Pack-level sheet prices → per base unit (piece).
    return applyPackPriceToBaseUnit(rows);
  }, [sheet, mapping, fields, hasPackagingField, packagingMapped, packagingUnit]);

  const importRows =
    editablePreview && editableRows.length ? editableRows : mappedRows;
  const previewSampleRows = mappedRows.slice(0, 8);
  const stockSkuCodesKey = useMemo(() => {
    if (!editablePreview) return "";
    return importRows.map((row) => String(row.sku || "").trim()).join("\n");
  }, [editablePreview, importRows]);

  /** Validate stock preview SKU/name cells against the catalog (exact sku or name). */
  useEffect(() => {
    if (!open || step !== "preview" || !editablePreview || !businessId) {
      return;
    }

    const codes = [
      ...new Set(
        stockSkuCodesKey
          .split("\n")
          .map((code) => code.trim())
          .filter(Boolean)
      ),
    ];

    if (!codes.length) {
      setSkuMatchByValue({});
      setSkuProductByValue({});
      setSkuMatchChecking(false);
      return;
    }

    let cancelled = false;
    setSkuMatchChecking(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const entries = await Promise.all(
          codes.map(async (code) => {
            try {
              const product = await resolveStockImportProduct(businessId, code);
              return [code, product] as const;
            } catch {
              return [code, null] as const;
            }
          })
        );
        if (cancelled) return;
        const matchMap: Record<string, boolean> = {};
        const productMap: Record<string, ProductRecord> = {};
        for (const [code, product] of entries) {
          matchMap[code] = Boolean(product);
          if (product) productMap[code] = product;
        }
        setSkuMatchByValue(matchMap);
        setSkuProductByValue(productMap);
        setSkuMatchChecking(false);
      })();
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, step, editablePreview, businessId, stockSkuCodesKey]);

  /** Seed / repair packaging unit once the matched product is known. */
  useEffect(() => {
    if (!open || step !== "preview" || !editablePreview || skuMatchChecking) return;

    setEditableRows((current) => {
      let changed = false;
      const next = current.map((row) => {
        const code = String(row.sku || "").trim();
        const product = skuProductByValue[code];
        if (!product) return row;
        const options = stockImportSellUnitOptions(product);
        const rawUnit = String(row.packagingUnit || "").trim();
        const currentUnit = rawUnit ? normalizeProductUnit(rawUnit) : "";
        if (currentUnit && options.some((option) => option.unit === currentUnit)) {
          return row;
        }
        const fallback = defaultStockImportUnit(product);
        changed = true;
        return { ...row, packagingUnit: fallback };
      });
      return changed ? next : current;
    });
  }, [open, step, editablePreview, skuMatchChecking, skuProductByValue]);

  const requiredReady = fields
    .filter((field) => field.required)
    .every((field) => (mapping[field.key] || []).length > 0);

  const scopeReady =
    Boolean(businessId) &&
    (!scope.showGroupPicker || Boolean(scope.effectiveGroupId));

  const stockPreviewMismatchCount = useMemo(() => {
    if (!editablePreview) return 0;
    return importRows.reduce((count, row) => {
      const code = String(row.sku || "").trim();
      if (!code || skuMatchByValue[code] !== true) return count + 1;
      return count;
    }, 0);
  }, [editablePreview, importRows, skuMatchByValue]);

  const stockPreviewImportReady =
    !editablePreview ||
    (!skuMatchChecking &&
      importRows.length > 0 &&
      stockPreviewMismatchCount === 0);

  function reset() {
    setStep("file");
    setGroupId("");
    setBusinessId("");
    setSheet(null);
    setMapping({});
    setDragOver(false);
    setError("");
    setSaving(false);
    setResult(null);
    setQuantityMode("add");
    setPackagingUnit("pack");
    setEditableRows([]);
    setSkuMatchByValue({});
    setSkuProductByValue({});
    setSkuMatchChecking(false);
  }

  function goToPreview() {
    if (editablePreview) {
      setEditableRows(mappedRows.map((row) => ({ ...row })));
      setSkuMatchByValue({});
      setSkuProductByValue({});
    } else {
      setEditableRows([]);
    }
    setStep("preview");
  }

  function rememberStockProduct(code: string, product: ProductRecord) {
    const key = code.trim();
    if (!key) return;
    setSkuMatchByValue((current) => ({ ...current, [key]: true }));
    setSkuProductByValue((current) => ({ ...current, [key]: product }));
  }

  function updateEditableCell(rowIndex: number, fieldKey: string, value: string) {
    setEditableRows((current) =>
      current.map((row, index) =>
        index === rowIndex ? { ...row, [fieldKey]: value } : row
      )
    );
  }

  function removeEditableRow(rowIndex: number) {
    setEditableRows((current) => current.filter((_, index) => index !== rowIndex));
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      if (result) onFinished?.();
      reset();
    }
    onOpenChange(next);
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setError("");
    try {
      const parsed = await parseExcelFile(file);
      setSheet(parsed);
      setMapping(autoMapColumns(parsed.columns, fields));
      setStep("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read file.");
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    void handleFile(file);
  }

  async function runImport() {
    if (!businessId || !requiredReady || importRows.length === 0) return;
    if (!stockPreviewImportReady) return;
    setSaving(true);
    setError("");
    setImportProgress("");
    const chunkSize = 1000;
    const combined: ImportResultSummary = {
      created: 0,
      updated: 0,
      skipped: 0,
      errorCount: 0,
      errors: [],
    };
    try {
      for (let start = 0; start < importRows.length; start += chunkSize) {
        const end = Math.min(start + chunkSize, importRows.length);
        setImportProgress(
          `Importing ${end.toLocaleString()} of ${importRows.length.toLocaleString()}…`
        );
        const summary = await onImport({
          businessId,
          rows: importRows.slice(start, end).map((row, index) => ({
            ...row,
            _row: String(start + index + 2),
          })),
          quantityMode,
        });
        combined.created += summary.created;
        combined.updated += summary.updated;
        combined.skipped += summary.skipped;
        combined.errorCount =
          (combined.errorCount || 0) + (summary.errorCount ?? summary.errors.length);
        for (const item of summary.errors) {
          if (combined.errors.length >= 40) break;
          combined.errors.push(item);
        }
      }
      setResult(combined);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSaving(false);
      setImportProgress("");
    }
  }

  const ignoreOptions = useMemo(
    () => [
      { value: "", label: "Ignore" },
      ...(sheet?.columns.map((col) => ({ value: col, label: col })) || []),
    ],
    [sheet]
  );

  const branchOptions = useMemo(
    () =>
      scope.businessesInScope.map((row) => ({
        id: row.id,
        name: businessOptions.find((item) => item.id === row.id)?.name || row.id,
        businessGroupId: row.businessGroupId,
      })),
    [scope.businessesInScope, businessOptions]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] flex-col gap-4 overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <StepRail
            steps={railSteps}
            current={step === "done" ? railSteps[railSteps.length - 1] : step}
          />
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {step === "scope" ? (
            <div className="space-y-4">
              {scope.showGroupPicker ? (
                <BusinessGroupSelect
                  value={groupId}
                  onValueChange={(value) => {
                    setGroupId(value);
                    setBusinessId("");
                  }}
                  options={groupOptions.map((group) => ({
                    id: group.id,
                    name: group.name,
                  }))}
                  allowEmpty={false}
                  visibility="always"
                  required
                />
              ) : null}

              {scope.showBusinessPicker &&
              (!scope.showGroupPicker || Boolean(groupId)) ? (
                <BusinessSelect
                  scope={businessScope}
                  value={businessId}
                  onValueChange={setBusinessId}
                  options={branchOptions}
                  visibility="always"
                  required
                />
              ) : null}

              {!scope.showGroupPicker && !scope.showBusinessPicker ? (
                <p className="text-muted-foreground text-sm">No business available.</p>
              ) : null}
            </div>
          ) : null}

          {step === "file" ? (
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <Upload className="text-muted-foreground size-5" />
              </div>
              <div className="text-center">
                <p className="font-medium">Drop Excel here</p>
                <p className="text-muted-foreground text-xs">.xlsx or .xls</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            </div>
          ) : null}

          {step === "map" && sheet ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="size-4 opacity-70" />
                <span className="truncate font-medium">{sheet.fileName}</span>
                <span className="text-muted-foreground">
                  · {sheet.rows.length} rows · {sheet.columns.length} columns
                </span>
              </div>

              <div className="space-y-3">
                {fields.map((field) => {
                  // Pack mode: hide piece Price/Cost — pack price/cost sit under Packaging.
                  if (
                    packagingMapped &&
                    (field.key === "price" || field.key === "costPrice")
                  ) {
                    return null;
                  }

                  return (
                  <div
                    key={field.key}
                    className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-start"
                  >
                    <FieldLabel required={field.required} className="pt-2">
                      {field.label}
                    </FieldLabel>
                    {field.packaging ? (
                      <div className="space-y-1.5">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <EnumSelect
                            value={packagingUnit}
                            onValueChange={(value) =>
                              setPackagingUnit(normalizeProductUnit(value))
                            }
                            options={PRODUCT_UNIT_OPTIONS}
                            placeholder="Pack unit"
                          />
                          <EnumSelect
                            value={(mapping[field.key] || [])[0] || ""}
                            onValueChange={(value) =>
                              setMapping((current) => ({
                                ...current,
                                [field.key]: value ? [value] : [],
                              }))
                            }
                            options={ignoreOptions}
                            placeholder="Excel column"
                          />
                        </div>
                        {packagingMapped ? (
                          <>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <p className="text-xs font-medium">Pack price</p>
                                <EnumSelect
                                  value={(mapping.price || [])[0] || ""}
                                  onValueChange={(value) =>
                                    setMapping((current) => ({
                                      ...current,
                                      price: value ? [value] : [],
                                    }))
                                  }
                                  options={ignoreOptions}
                                  placeholder="Ignore"
                                />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium">Pack cost</p>
                                <EnumSelect
                                  value={(mapping.costPrice || [])[0] || ""}
                                  onValueChange={(value) =>
                                    setMapping((current) => ({
                                      ...current,
                                      costPrice: value ? [value] : [],
                                    }))
                                  }
                                  options={ignoreOptions}
                                  placeholder="Ignore"
                                />
                              </div>
                            </div>
                            <p className="text-muted-foreground text-xs">
                              Piece price/cost are calculated automatically (pack value ÷ units
                              in pack). Example: 600 ÷ 100 = 6.
                            </p>
                          </>
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            Optional. Pack unit + sheet column for how many base units are in
                            one pack (e.g. Pack + PackUnits).
                          </p>
                        )}
                      </div>
                    ) : field.multi ? (
                      <MultiColumnPicker
                        columns={sheet.columns}
                        value={mapping[field.key] || []}
                        onChange={(next) =>
                          setMapping((current) => ({ ...current, [field.key]: next }))
                        }
                      />
                    ) : (
                      <EnumSelect
                        value={(mapping[field.key] || [])[0] || ""}
                        onValueChange={(value) =>
                          setMapping((current) => ({
                            ...current,
                            [field.key]: value ? [value] : [],
                          }))
                        }
                        options={ignoreOptions}
                        placeholder="Ignore"
                      />
                    )}
                  </div>
                  );
                })}
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {sheet.columns.slice(0, 6).map((col) => (
                        <th key={col} className="px-2 py-1.5 font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.rows.slice(0, 4).map((row: SheetRow, index) => (
                      <tr key={index} className="border-t">
                        {sheet.columns.slice(0, 6).map((col) => (
                          <td key={col} className="max-w-[140px] truncate px-2 py-1.5">
                            {row[col] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {step === "preview" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">
                    {editablePreview
                      ? `${importRows.length} rows ready — edit any cell before importing`
                      : `${mappedRows.length} rows ready${
                          mappedRows.length > previewSampleRows.length
                            ? ` (showing first ${previewSampleRows.length})`
                            : ""
                        }`}
                  </p>
                  {editablePreview && supportsQuantity ? (
                    <p className="text-muted-foreground text-xs">
                      {skuMatchChecking
                        ? "Checking products…"
                        : stockPreviewMismatchCount > 0
                          ? `${stockPreviewMismatchCount} row${
                              stockPreviewMismatchCount === 1 ? "" : "s"
                            } need a matching product — fix or remove them to enable Import.`
                          : "All products matched. Qty uses the Unit column (defaults to first packaging, or base)."}
                    </p>
                  ) : null}
                </div>
                {supportsQuantity && quantityMapped ? (
                  <div className="flex items-center gap-1 rounded-lg border p-1">
                    {(
                      [
                        { value: "add", label: "Add to stock" },
                        { value: "set", label: "Set stock" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setQuantityMode(option.value)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          quantityMode === option.value
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {editablePreview ? (
                <div className="max-h-[min(50vh,420px)] overflow-auto rounded-lg border">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">#</th>
                        {fields.map((field) => (
                          <Fragment key={field.key}>
                            <th className="px-2 py-1.5 font-medium">
                              {field.label}
                              {field.required ? (
                                <span className="text-destructive"> *</span>
                              ) : null}
                            </th>
                            {field.key === "quantity" ? (
                              <th className="px-2 py-1.5 font-medium">Unit</th>
                            ) : null}
                          </Fragment>
                        ))}
                        <th className="px-2 py-1.5 font-medium"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((row, index) => {
                        const code = String(row.sku || "").trim();
                        const matchedProduct = skuProductByValue[code];
                        const unitOptions = stockImportSellUnitOptions(matchedProduct);
                        return (
                          <tr key={index} className="border-t">
                            <td className="px-2 py-1 tabular-nums text-muted-foreground">
                              {index + 1}
                            </td>
                            {fields.map((field) => (
                              <Fragment key={field.key}>
                                <td className="px-1.5 py-1">
                                  {field.key === "sku" ? (
                                    <StockImportProductCell
                                      businessId={businessId}
                                      value={row[field.key] || ""}
                                      onChange={(next) =>
                                        updateEditableCell(index, field.key, next)
                                      }
                                      onProductResolved={(product) => {
                                        const matchValue =
                                          String(product.sku || "").trim() ||
                                          String(product.name || "").trim();
                                        rememberStockProduct(matchValue, product);
                                        updateEditableCell(
                                          index,
                                          "packagingUnit",
                                          defaultStockImportUnit(product)
                                        );
                                      }}
                                      invalid={
                                        !skuMatchChecking &&
                                        (!code || skuMatchByValue[code] === false)
                                      }
                                      aria-label={`${field.label} row ${index + 1}`}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      className="h-7 w-full min-w-[88px] rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                                      value={row[field.key] || ""}
                                      onChange={(event) =>
                                        updateEditableCell(
                                          index,
                                          field.key,
                                          event.target.value
                                        )
                                      }
                                      aria-label={`${field.label} row ${index + 1}`}
                                    />
                                  )}
                                </td>
                                {field.key === "quantity" ? (
                                  <td className="px-1.5 py-1">
                                    <select
                                      className="h-7 min-w-[110px] rounded-md border border-border bg-background px-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                                      value={
                                        row.packagingUnit ||
                                        defaultStockImportUnit(matchedProduct)
                                      }
                                      disabled={!matchedProduct || unitOptions.length === 0}
                                      onChange={(event) =>
                                        updateEditableCell(
                                          index,
                                          "packagingUnit",
                                          event.target.value
                                        )
                                      }
                                      aria-label={`Unit row ${index + 1}`}
                                    >
                                      {unitOptions.length ? (
                                        unitOptions.map((option) => (
                                          <option key={option.unit} value={option.unit}>
                                            {option.label}
                                          </option>
                                        ))
                                      ) : (
                                        <option value="">—</option>
                                      )}
                                    </select>
                                  </td>
                                ) : null}
                              </Fragment>
                            ))}
                            <td className="px-1.5 py-1">
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive text-xs"
                                onClick={() => removeEditableRow(index)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {fields.map((field) => (
                          <th key={field.key} className="px-2 py-1.5 font-medium">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewSampleRows.map((row, index) => (
                        <tr key={index} className="border-t">
                          {fields.map((field) => (
                            <td
                              key={field.key}
                              className="max-w-[160px] truncate px-2 py-1.5"
                            >
                              {field.packaging
                                ? [row.packagingUnit, row[field.key]].filter(Boolean).join(" · ") ||
                                  "—"
                                : row[field.key] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {step === "done" && result ? (
            <div className="space-y-4 py-2">
              <p className="text-muted-foreground text-sm">
                Counts are unique SKUs after import (duplicate SKUs in the sheet are
                merged). Check the Map step: SKU must be the item code column (e.g.{" "}
                <span className="font-medium text-foreground">aliasname</span>), not
                manufacturer <span className="font-medium text-foreground">name</span>.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-2xl font-semibold tabular-nums">{result.created}</p>
                  <p className="text-muted-foreground text-xs">Created</p>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-2xl font-semibold tabular-nums">{result.updated}</p>
                  <p className="text-muted-foreground text-xs">Updated</p>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-2xl font-semibold tabular-nums">{result.skipped}</p>
                  <p className="text-muted-foreground text-xs">Skipped</p>
                </div>
              </div>
              {result.errors.length > 0 ? (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-3 text-xs">
                  {result.errors.slice(0, 40).map((item) => (
                    <p key={`${item.row}-${item.message}`}>
                      Row {item.row}: {item.message}
                    </p>
                  ))}
                  {(result.errorCount || result.errors.length) > result.errors.length ? (
                    <p className="text-muted-foreground">
                      Showing {result.errors.length} of {result.errorCount} issues.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
          >
            {step === "done" ? "Close" : "Cancel"}
          </Button>
          <div className="flex gap-2">
            {step !== "scope" &&
            step !== "done" &&
            !(step === "file" && !scope.needsScopeStep) ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (step === "file") setStep("scope");
                  else if (step === "map") setStep("file");
                  else if (step === "preview") setStep("map");
                }}
              >
                Back
              </Button>
            ) : null}
            {step === "scope" ? (
              <Button
                type="button"
                disabled={!scopeReady}
                onClick={() => setStep("file")}
              >
                Continue
              </Button>
            ) : null}
            {step === "map" ? (
              <Button
                type="button"
                disabled={!requiredReady}
                onClick={goToPreview}
              >
                Continue
              </Button>
            ) : null}
            {step === "preview" ? (
              <Button
                type="button"
                disabled={
                  saving ||
                  !businessId ||
                  importRows.length === 0 ||
                  !stockPreviewImportReady
                }
                onClick={() => void runImport()}
              >
                {saving
                  ? importProgress || "Importing..."
                  : `Import ${importRows.length.toLocaleString()}`}
              </Button>
            ) : null}
            {step === "done" ? (
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
