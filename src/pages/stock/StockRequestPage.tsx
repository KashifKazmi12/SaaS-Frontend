import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet, FileText, Plus, Trash2 } from "lucide-react";
import { BusinessSelect } from "@/components/business";
import { StockItemSelect } from "@/components/stock/StockItemSelect";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  EnumSelect,
  FieldLabel,
  FormField,
  PageAlerts,
  PermissionIconButton,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  PRODUCT_UNIT_LABELS,
  normalizeProductUnit,
} from "@/constants/catalog";
import { useBusinessOptions, useBusinessVisibility } from "@/hooks/useBusinessOptions";
import { MODULE_PATHS } from "@/lib/modulePaths";
import { formatStockBreakdown } from "@/lib/stockDisplay";
import {
  downloadStockRequestExcel,
  downloadStockRequestPdf,
  type StockRequestExportRow,
} from "@/lib/stockRequestExport";
import type { StockRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.STOCK;
const PREFILL_STORAGE_KEY = "stock-request-prefill";

type PrefillState = {
  businessId?: string;
  items?: StockRecord[];
};

type DraftLine = {
  key: string;
  stockId: string;
  stock: StockRecord | null;
  packagingUnit: string;
  quantity: string;
};

function uid() {
  return crypto.randomUUID();
}

function newDraftLine(): DraftLine {
  return {
    key: uid(),
    stockId: "",
    stock: null,
    packagingUnit: "",
    quantity: "1",
  };
}

function unitFactor(stock: StockRecord | null, packagingUnit: string) {
  if (!stock) return 1;
  const base = normalizeProductUnit(stock.unit || "piece");
  const wanted = normalizeProductUnit(packagingUnit || base, base);
  if (wanted === base) return 1;
  const units = stock.sellUnits?.length
    ? stock.sellUnits
    : [{ unit: base, factorToBase: 1, isBase: true }];
  const match = units.find((row) => normalizeProductUnit(row.unit) === wanted);
  const factor = Number(match?.factorToBase) || 0;
  return factor > 0 ? factor : 1;
}

function unitOptions(stock: StockRecord | null) {
  const base = normalizeProductUnit(stock?.unit || "piece");
  const units = stock?.sellUnits?.length
    ? stock.sellUnits
    : [{ unit: base, factorToBase: 1, isBase: true }];
  return units
    .filter((row) => row.unit && Number(row.factorToBase) > 0)
    .map((row) => ({
      value: normalizeProductUnit(row.unit),
      label:
        PRODUCT_UNIT_LABELS[normalizeProductUnit(row.unit)] ||
        row.unit +
          (row.isBase || normalizeProductUnit(row.unit) === base
            ? ""
            : ` (×${Number(row.factorToBase) || 1})`),
    }));
}

function productName(stock: StockRecord) {
  return typeof stock.product === "object" && stock.product ? stock.product.name : "Product";
}

function variationName(stock: StockRecord) {
  return stock.variation?.name || "";
}

function lineFromStock(stock: StockRecord): DraftLine {
  const base = normalizeProductUnit(stock.unit || "piece");
  const packs = (stock.packagings || []).filter(
    (row) =>
      normalizeProductUnit(row.unit || "") &&
      normalizeProductUnit(row.unit || "") !== base &&
      Number(row.factorToBase) > 0
  );
  const preferredUnit = packs[0]?.unit
    ? normalizeProductUnit(packs[0].unit)
    : base;
  return {
    key: uid(),
    stockId: stock._id,
    stock,
    packagingUnit: preferredUnit,
    quantity: "1",
  };
}

function readPrefill(locationState: unknown): PrefillState {
  const fromNav = locationState as PrefillState | null;
  if (Array.isArray(fromNav?.items) && fromNav.items.length > 0) {
    try {
      sessionStorage.removeItem(PREFILL_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return {
      businessId: String(fromNav.businessId || ""),
      items: fromNav.items,
    };
  }
  try {
    const raw = sessionStorage.getItem(PREFILL_STORAGE_KEY);
    if (!raw) return {};
    sessionStorage.removeItem(PREFILL_STORAGE_KEY);
    const parsed = JSON.parse(raw) as PrefillState;
    if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
      return {
        businessId: String(parsed.businessId || ""),
        items: parsed.items,
      };
    }
  } catch {
    /* ignore */
  }
  return {};
}

export default function StockRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSuperAdmin, singleAssignedBusiness } = useBusinessVisibility();
  const { options: businessOptions } = useBusinessOptions(isSuperAdmin ? "all" : "assigned");
  const prefillRef = useRef<PrefillState | null>(null);
  if (prefillRef.current === null) {
    prefillRef.current = readPrefill(location.state);
  }
  const prefill = prefillRef.current;
  const prefillItems = Array.isArray(prefill.items) ? prefill.items : [];
  const initialBusinessId = prefill.businessId || singleAssignedBusiness?.id || "";
  const lockedBusinessRef = useRef<string | null>(
    prefillItems.length > 0 ? initialBusinessId : null
  );

  const [businessId, setBusinessId] = useState(initialBusinessId);
  const [lines, setLines] = useState<DraftLine[]>(() =>
    prefillItems.length ? prefillItems.map(lineFromStock) : [newDraftLine()]
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (singleAssignedBusiness?.id && !businessId) {
      setBusinessId(singleAssignedBusiness.id);
    }
  }, [singleAssignedBusiness?.id, businessId]);

  useEffect(() => {
    if (lockedBusinessRef.current !== null) {
      if (businessId === lockedBusinessRef.current) return;
      lockedBusinessRef.current = null;
    }
    setLines([newDraftLine()]);
    setError("");
    setMessage("");
  }, [businessId]);

  const selectedIds = useMemo(
    () => lines.map((line) => line.stockId).filter(Boolean),
    [lines]
  );

  const businessName = useMemo(() => {
    const match = businessOptions.find((row) => row.id === businessId);
    return match?.name || "";
  }, [businessOptions, businessId]);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  }

  function selectStock(key: string, stock: StockRecord | null) {
    if (!stock) {
      updateLine(key, {
        stockId: "",
        stock: null,
        packagingUnit: "",
        quantity: "1",
      });
      return;
    }
    const next = lineFromStock(stock);
    updateLine(key, {
      stockId: next.stockId,
      stock: next.stock,
      packagingUnit: next.packagingUnit,
      quantity: next.quantity,
    });
  }

  function focusAndRevealProduct(lineKey: string) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`stock-request-product-${lineKey}`);
        if (!el) return;
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
        el.focus({ preventScroll: true });
      });
    });
  }

  function insertLineAfter(afterKey: string) {
    if (!businessId) return;
    const draft = newDraftLine();
    setLines((current) => {
      const index = current.findIndex((row) => row.key === afterKey);
      if (index < 0) return [...current, draft];
      const next = [...current];
      next.splice(index + 1, 0, draft);
      return next;
    });
    focusAndRevealProduct(draft.key);
  }

  function removeLine(key: string) {
    setLines((current) => {
      if (current.length <= 1) return [newDraftLine()];
      return current.filter((row) => row.key !== key);
    });
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>, lineKey: string) {
    if (event.key !== "Delete") return;
    event.preventDefault();
    event.stopPropagation();
    removeLine(lineKey);
  }

  function handleFieldEnter(event: KeyboardEvent<HTMLInputElement>, lineKey: string) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    insertLineAfter(lineKey);
  }

  function buildExportRows(): StockRequestExportRow[] | null {
    setError("");
    setMessage("");
    if (!businessId) {
      setError("Select a business first.");
      return null;
    }
    const ready = lines.filter((line) => line.stockId && line.stock);
    if (!ready.length) {
      setError("Add at least one product.");
      return null;
    }
    const rows: StockRequestExportRow[] = [];
    for (const line of ready) {
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError("Enter a request quantity greater than zero for each product.");
        return null;
      }
      const unit = line.packagingUnit || line.stock?.unit || "piece";
      rows.push({
        product: productName(line.stock!),
        sku: line.stock!.sku || "",
        variation: variationName(line.stock!),
        unit: PRODUCT_UNIT_LABELS[normalizeProductUnit(unit)] || unit,
        quantity: qty,
      });
    }
    return rows;
  }

  function handleDownloadExcel() {
    const rows = buildExportRows();
    if (!rows) return;
    downloadStockRequestExcel(rows, {
      businessName: businessName || "Business",
      notes,
    });
    setMessage("Excel downloaded. Share it with your supplier.");
  }

  function handleDownloadPdf() {
    const rows = buildExportRows();
    if (!rows) return;
    downloadStockRequestPdf(rows, {
      businessName: businessName || "Business",
      notes,
    });
    setMessage("PDF downloaded. Share it with your supplier.");
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell
        description="Build a product list and download Excel or PDF to send to your supplier."
        action={
          <Button type="button" variant="outline" onClick={() => navigate(MODULE_PATH)}>
            <ArrowLeft className="size-4" />
            Back to stock
          </Button>
        }
      >
        <PageAlerts error={error} message={message} />

        <div className="space-y-4">
              {businessOptions.length > 1 || isSuperAdmin ? (
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle>Business</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <BusinessSelect
                      id="stock-request-business"
                      label="Business"
                      scope={isSuperAdmin ? "all" : "assigned"}
                      value={businessId}
                      onValueChange={setBusinessId}
                      options={businessOptions}
                      required
                      visibility="always"
                    />
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>
                      Products <span className="text-destructive">*</span>
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!businessId}
                      tabIndex={-1}
                      onClick={() => {
                        const draft = newDraftLine();
                        setLines((current) => [...current, draft]);
                        focusAndRevealProduct(draft.key);
                      }}
                    >
                      <Plus className="size-4" />
                      Add line
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {!businessId ? (
                    <p className="text-muted-foreground text-sm">
                      Select a business to choose products.
                    </p>
                  ) : (
                    lines.map((line) => {
                      const onHand = line.stock
                        ? formatStockBreakdown(
                            Number(line.stock.quantity) || 0,
                            line.stock.unit || "piece",
                            line.stock.packagings
                          )
                        : "";
                      const factor = unitFactor(line.stock, line.packagingUnit);
                      return (
                        <div
                          key={line.key}
                          className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[minmax(0,1.4fr)_110px_100px_auto]"
                          onKeyDown={(event) => handleRowKeyDown(event, line.key)}
                        >
                          <div className="min-w-0">
                            <StockItemSelect
                              id={`stock-request-product-${line.key}`}
                              businessId={businessId}
                              value={line.stockId}
                              selectedStock={line.stock}
                              excludeIds={selectedIds}
                              onSelect={(stock) => selectStock(line.key, stock)}
                              required
                              onEnterWhenClosed={() => insertLineAfter(line.key)}
                            />
                            {onHand ? (
                              <p className="text-muted-foreground mt-1 text-xs">
                                On hand: {onHand}
                              </p>
                            ) : null}
                          </div>

                          <EnumSelect
                            id={`stock-request-unit-${line.key}`}
                            label="Unit"
                            value={
                              line.packagingUnit ||
                              normalizeProductUnit(line.stock?.unit || "piece")
                            }
                            onValueChange={(nextUnit) =>
                              updateLine(line.key, { packagingUnit: nextUnit })
                            }
                            options={unitOptions(line.stock)}
                            disabled={!line.stock}
                            required={Boolean(line.stock)}
                            onEnterWhenClosed={() => insertLineAfter(line.key)}
                          />

                          <FormField
                            id={`stock-request-qty-${line.key}`}
                            label="Request qty"
                            type="number"
                            min={0.000001}
                            step="any"
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(line.key, { quantity: event.target.value })
                            }
                            onKeyDown={(event) => handleFieldEnter(event, line.key)}
                            disabled={!line.stock}
                            placeholder="1"
                            required={Boolean(line.stock)}
                          />

                          <div className="flex items-end">
                            <PermissionIconButton
                              modulePath={MODULE_PATH}
                              action="view"
                              label="Remove line"
                              variant="destructive"
                              icon={<Trash2 />}
                              tabIndex={-1}
                              onClick={() => removeLine(line.key)}
                            />
                          </div>

                          {line.stock && factor > 1 ? (
                            <p className="text-muted-foreground sm:col-span-4 text-xs">
                              Requesting in{" "}
                              {PRODUCT_UNIT_LABELS[
                                normalizeProductUnit(line.packagingUnit)
                              ] || line.packagingUnit}
                              .
                            </p>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  <FieldLabel htmlFor="stock-request-notes">Notes for supplier</FieldLabel>
                  <Textarea
                    id="stock-request-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Delivery timing, brand preference, etc."
                    rows={3}
                  />
                </CardContent>
              </Card>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  className="w-full"
                  disabled={!businessId}
                  onClick={handleDownloadExcel}
                >
                  <FileSpreadsheet className="size-4" />
                  Download Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={!businessId}
                  onClick={handleDownloadPdf}
                >
                  <FileText className="size-4" />
                  Download PDF
                </Button>
              </div>
        </div>
      </PageShell>
    </RequirePermission>
  );
}
