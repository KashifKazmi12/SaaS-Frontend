import type { FormEvent, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CircleHelp, Eye, Plus, Trash2 } from "lucide-react";
import { BusinessSelect } from "@/components/business";
import { StockItemSelect } from "@/components/stock/StockItemSelect";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  EnumSelect,
  FormField,
  PageAlerts,
  PermissionButton,
  PermissionIconButton,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PRODUCT_UNIT_LABELS,
  normalizeProductUnit,
} from "@/constants/catalog";
import { useBusinessOptions, useBusinessVisibility } from "@/hooks/useBusinessOptions";
import { api } from "@/lib/api";
import { MODULE_PATHS } from "@/lib/modulePaths";
import { formatStockBreakdown } from "@/lib/stockDisplay";
import type { StockRecord, StockUpdateBatchRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.STOCK;

type QtyMode = "add" | "set";

type DraftLine = {
  key: string;
  stockId: string;
  stock: StockRecord | null;
  packagingUnit: string;
  quantity: string;
  unitPrice: string;
  costPrice: string;
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
    quantity: "",
    unitPrice: "",
    costPrice: "",
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

function displayPriceForUnit(stock: StockRecord | null, packagingUnit: string) {
  const basePrice = Number(stock?.price) || 0;
  return basePrice * unitFactor(stock, packagingUnit);
}

function displayCostForUnit(stock: StockRecord | null, packagingUnit: string) {
  const baseCost = Number(stock?.costPrice) || 0;
  return baseCost * unitFactor(stock, packagingUnit);
}

function scalePackValue(value: string, factorPrev: number, factorNext: number, fallback: number) {
  const prev = Number(value);
  const next =
    Number.isFinite(prev) && factorPrev > 0
      ? (prev / factorPrev) * factorNext
      : fallback;
  return Number.isFinite(next) ? String(Math.round(next * 10000) / 10000) : value;
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

type PrefillState = {
  businessId?: string;
  items?: StockRecord[];
};

const PREFILL_STORAGE_KEY = "stock-update-prefill";

function lineFromStock(stock: StockRecord, qtyMode: QtyMode): DraftLine {
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
    quantity: qtyMode === "add" ? "1" : "",
    unitPrice: String(displayPriceForUnit(stock, preferredUnit) || ""),
    costPrice: String(displayCostForUnit(stock, preferredUnit) || ""),
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

export default function StockUpdatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<HTMLFormElement>(null);
  const { isSuperAdmin, singleAssignedBusiness } = useBusinessVisibility();
  const { options: businessOptions } = useBusinessOptions(isSuperAdmin ? "all" : "assigned");
  const prefillRef = useRef<PrefillState | null>(null);
  if (prefillRef.current === null) {
    prefillRef.current = readPrefill(location.state);
  }
  const prefill = prefillRef.current;
  const prefillItems = Array.isArray(prefill.items) ? prefill.items : [];
  const initialBusinessId =
    prefill.businessId || singleAssignedBusiness?.id || "";
  // Keep prefilled rows until the user actually changes business (Strict Mode safe).
  const lockedBusinessRef = useRef<string | null>(
    prefillItems.length > 0 ? initialBusinessId : null
  );
  const [businessId, setBusinessId] = useState(initialBusinessId);
  const [mode, setMode] = useState<QtyMode>("add");
  const [lines, setLines] = useState<DraftLine[]>(() =>
    prefillItems.length ? prefillItems.map((row) => lineFromStock(row, "add")) : [newDraftLine()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [recent, setRecent] = useState<StockUpdateBatchRecord[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState("");

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

  const loadRecent = useCallback(async (nextBusinessId: string) => {
    if (!nextBusinessId) {
      setRecent([]);
      setRecentError("");
      return;
    }
    setRecentLoading(true);
    setRecentError("");
    try {
      const data = await api.getStockUpdateBatches({
        businessId: nextBusinessId,
        page: 1,
        limit: 5,
      });
      setRecent(data.items);
    } catch (err) {
      setRecent([]);
      setRecentError(err instanceof Error ? err.message : "Unable to load recent updates.");
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecent(businessId);
  }, [businessId, loadRecent]);

  const selectedIds = useMemo(
    () => lines.map((line) => line.stockId).filter(Boolean),
    [lines]
  );

  const draftTotals = useMemo(() => {
    let quantity = 0;
    let sale = 0;
    let cost = 0;
    let saleAmount = 0;
    let costAmount = 0;
    for (const line of lines) {
      if (!line.stockId) continue;
      const qty =
        line.quantity.trim() !== "" && Number.isFinite(Number(line.quantity))
          ? Number(line.quantity)
          : null;
      const unitPrice =
        line.unitPrice.trim() !== "" && Number.isFinite(Number(line.unitPrice))
          ? Number(line.unitPrice)
          : null;
      const costPrice =
        line.costPrice.trim() !== "" && Number.isFinite(Number(line.costPrice))
          ? Number(line.costPrice)
          : null;
      if (qty !== null) quantity += qty;
      if (unitPrice !== null) sale += unitPrice;
      if (costPrice !== null) cost += costPrice;
      if (qty !== null && unitPrice !== null) saleAmount += qty * unitPrice;
      if (qty !== null && costPrice !== null) costAmount += qty * costPrice;
    }
    return { quantity, sale, cost, saleAmount, costAmount };
  }, [lines]);

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
        quantity: "",
        unitPrice: "",
        costPrice: "",
      });
      return;
    }
    const next = lineFromStock(stock, mode);
    updateLine(key, {
      stockId: next.stockId,
      stock: next.stock,
      packagingUnit: next.packagingUnit,
      quantity: next.quantity,
      unitPrice: next.unitPrice,
      costPrice: next.costPrice,
    });
  }

  function focusAndRevealProduct(lineKey: string) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`stock-product-${lineKey}`);
        if (!el) return;
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
        el.focus({ preventScroll: true });
      });
    });
  }

  function focusLinePrice(lineKey: string) {
    window.setTimeout(() => {
      const price = document.getElementById(
        `stock-price-${lineKey}`
      ) as HTMLInputElement | null;
      if (price && !price.disabled) {
        price.focus();
        price.select?.();
        return;
      }
      document.getElementById(`stock-product-${lineKey}`)?.focus();
    }, 0);
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
      const index = current.findIndex((row) => row.key === key);
      if (index < 0) return current;

      let focusKey = "";
      let next: DraftLine[];

      if (current.length <= 1) {
        const draft = newDraftLine();
        next = [draft];
        focusKey = draft.key;
      } else if (index > 0) {
        focusKey = current[index - 1].key;
        next = current.filter((row) => row.key !== key);
      } else {
        focusKey = current[index + 1].key;
        next = current.filter((row) => row.key !== key);
      }

      focusLinePrice(focusKey);
      return next;
    });
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>, lineKey: string) {
    if (event.key !== "Delete") return;
    // Delete removes the whole line from any field in the row.
    // Backspace still edits text normally.
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

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (saving) return;
      formRef.current?.requestSubmit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saving]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!businessId) {
      setError("Select a business first.");
      return;
    }

    const payloadLines = lines
      .filter((line) => line.stockId)
      .map((line) => ({
        stockId: line.stockId,
        packagingUnit: line.packagingUnit || line.stock?.unit || "piece",
        quantity: line.quantity.trim() === "" ? null : line.quantity,
        unitPrice: line.unitPrice.trim() === "" ? null : line.unitPrice,
        costPrice: line.costPrice.trim() === "" ? null : line.costPrice,
      }));

    if (!payloadLines.length) {
      setError("Add at least one product.");
      return;
    }

    for (const line of payloadLines) {
      const hasQty = line.quantity !== null && String(line.quantity).trim() !== "";
      const hasPrice = line.unitPrice !== null && String(line.unitPrice).trim() !== "";
      const hasCost = line.costPrice !== null && String(line.costPrice).trim() !== "";
      if (!hasQty && !hasPrice && !hasCost) {
        setError("Enter a quantity, sale price, and/or cost for each selected product.");
        return;
      }
      if (hasQty) {
        const qty = Number(line.quantity);
        if (!Number.isFinite(qty) || qty < 0 || (mode === "add" && qty <= 0)) {
          setError(
            mode === "add"
              ? "Add quantity must be greater than zero."
              : "Enter a valid quantity (0 or more)."
          );
          return;
        }
      }
      if (hasPrice) {
        const price = Number(line.unitPrice);
        if (!Number.isFinite(price) || price < 0) {
          setError("Enter a valid sale price (0 or more).");
          return;
        }
      }
      if (hasCost) {
        const cost = Number(line.costPrice);
        if (!Number.isFinite(cost) || cost < 0) {
          setError("Enter a valid cost price (0 or more).");
          return;
        }
      }
    }

    setSaving(true);
    try {
      const result = await api.quickUpdateStock({
        businessId,
        mode,
        lines: payloadLines,
      });
      const extra =
        result.failed > 0
          ? ` ${result.failed} line(s) failed: ${result.errors
              .map((row) => row.message)
              .join("; ")}`
          : "";
      const batchNote = result.batchNumber ? ` Post ${result.batchNumber}.` : "";
      setMessage(
        `Updated ${result.updated} item${result.updated === 1 ? "" : "s"}.${batchNote}${extra}`
      );
      setLines([newDraftLine()]);
      await loadRecent(businessId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update stock.");
    } finally {
      setSaving(false);
    }
  }

  function formatNum(value: number) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  function formatMoney(value: number) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  function formatWhen(value?: string) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  }

  return (
    <RequirePermission path={MODULE_PATH} action="update">
      <PageShell
        description="Add or set quantities and prices for several products in one pass."
        action={
          <Button type="button" variant="outline" onClick={() => navigate(MODULE_PATH)}>
            <ArrowLeft className="size-4" />
            Back to stock
          </Button>
        }
      >
        <PageAlerts error={error} message={message} />

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {businessOptions.length > 1 || isSuperAdmin ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Business</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <BusinessSelect
                  id="stock-update-business"
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

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="border-input bg-muted/40 inline-flex h-9 min-w-[16rem] flex-1 rounded-lg border p-0.5 sm:max-w-sm sm:flex-none"
              role="group"
              aria-label="Quantity mode"
            >
              <button
                type="button"
                className={`flex-1 rounded-md px-2 text-sm font-medium transition-colors ${
                  mode === "add"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMode("add")}
              >
                Add stock
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md px-2 text-sm font-medium transition-colors ${
                  mode === "set"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMode("set")}
              >
                Set quantity
              </button>
            </div>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="How to update stock"
                  />
                }
              >
                <CircleHelp className="size-4" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 gap-3 p-3">
                <PopoverHeader>
                  <PopoverTitle>How to update</PopoverTitle>
                  <PopoverDescription>
                    {mode === "add"
                      ? "Add stock increases current on-hand quantity."
                      : "Set quantity replaces current on-hand quantity."}
                  </PopoverDescription>
                </PopoverHeader>
                <div className="text-muted-foreground space-y-2 text-xs leading-relaxed">
                  <p>
                    Pick a product, choose its unit (piece, pack, box…), then enter quantity,
                    sale price (Sal), and/or cost for that unit.
                  </p>
                  <p>
                    Pack Sal/Cost are converted to per-piece automatically — same idea as product
                    import.
                  </p>
                  <p>Leave quantity, Sal, or Cost blank on a line to skip that part.</p>
                  <p>
                    Shortcuts: <span className="text-foreground">Enter</span> new line ·{" "}
                    <span className="text-foreground">Delete</span> remove line ·{" "}
                    <span className="text-foreground">Ctrl+S</span> save
                  </p>
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-muted-foreground w-full text-xs sm:w-auto">
              {mode === "add"
                ? "Adds the entered quantity to current on-hand stock."
                : "Replaces on-hand stock with the entered quantity."}
            </p>
          </div>

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
                  const qty =
                    line.quantity.trim() !== "" && Number.isFinite(Number(line.quantity))
                      ? Number(line.quantity)
                      : null;
                  const unitPrice =
                    line.unitPrice.trim() !== "" && Number.isFinite(Number(line.unitPrice))
                      ? Number(line.unitPrice)
                      : null;
                  const costPrice =
                    line.costPrice.trim() !== "" && Number.isFinite(Number(line.costPrice))
                      ? Number(line.costPrice)
                      : null;
                  const saleAmount =
                    qty !== null && unitPrice !== null ? qty * unitPrice : null;
                  const costAmount =
                    qty !== null && costPrice !== null ? qty * costPrice : null;
                  const qtyPreview = qty !== null ? qty * factor : null;
                  return (
                    <div
                      key={line.key}
                      className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1.15fr)_88px_68px_80px_80px_100px_100px_auto] sm:items-start"
                      onKeyDown={(event) => handleRowKeyDown(event, line.key)}
                    >
                      <div className="min-w-0">
                        <StockItemSelect
                          id={`stock-product-${line.key}`}
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
                        id={`stock-unit-${line.key}`}
                        label="Unit"
                        value={
                          line.packagingUnit ||
                          normalizeProductUnit(line.stock?.unit || "piece")
                        }
                        onValueChange={(nextUnit) => {
                          const factorNext = unitFactor(line.stock, nextUnit);
                          const factorPrev = unitFactor(line.stock, line.packagingUnit);
                          updateLine(line.key, {
                            packagingUnit: nextUnit,
                            unitPrice: scalePackValue(
                              line.unitPrice,
                              factorPrev,
                              factorNext,
                              displayPriceForUnit(line.stock, nextUnit)
                            ),
                            costPrice: scalePackValue(
                              line.costPrice,
                              factorPrev,
                              factorNext,
                              displayCostForUnit(line.stock, nextUnit)
                            ),
                          });
                        }}
                        options={unitOptions(line.stock)}
                        disabled={!line.stock}
                        required={Boolean(line.stock)}
                        onEnterWhenClosed={() => insertLineAfter(line.key)}
                      />

                      <FormField
                        id={`stock-qty-${line.key}`}
                        label={mode === "add" ? "Add qty" : "Set qty"}
                        type="number"
                        min={mode === "add" ? 0.000001 : 0}
                        step="any"
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(line.key, { quantity: event.target.value })
                        }
                        onKeyDown={(event) => handleFieldEnter(event, line.key)}
                        disabled={!line.stock}
                        placeholder="0"
                      />

                      <FormField
                        id={`stock-price-${line.key}`}
                        label="Sal"
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(event) =>
                          updateLine(line.key, { unitPrice: event.target.value })
                        }
                        onKeyDown={(event) => handleFieldEnter(event, line.key)}
                        disabled={!line.stock}
                        placeholder="0"
                      />

                      <FormField
                        id={`stock-cost-${line.key}`}
                        label="Cost"
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.costPrice}
                        onChange={(event) =>
                          updateLine(line.key, { costPrice: event.target.value })
                        }
                        onKeyDown={(event) => handleFieldEnter(event, line.key)}
                        disabled={!line.stock}
                        placeholder="0"
                      />

                      <FormField
                        id={`stock-sale-amt-${line.key}`}
                        label="Sale amt"
                        value={saleAmount === null ? "" : formatMoney(saleAmount)}
                        placeholder="—"
                        readOnly
                        tabIndex={-1}
                      />

                      <FormField
                        id={`stock-cost-amt-${line.key}`}
                        label="Cost amt"
                        value={costAmount === null ? "" : formatMoney(costAmount)}
                        placeholder="—"
                        readOnly
                        tabIndex={-1}
                      />

                      <div className="flex items-end">
                        <PermissionIconButton
                          modulePath={MODULE_PATH}
                          action="update"
                          label="Remove line"
                          variant="destructive"
                          icon={<Trash2 />}
                          tabIndex={-1}
                          onClick={() => removeLine(line.key)}
                        />
                      </div>

                      {line.stock && (qtyPreview !== null || factor > 1) ? (
                        <p className="text-muted-foreground sm:col-span-8 text-xs">
                          {qtyPreview !== null
                            ? `${mode === "add" ? "Will add" : "Will set"} ${qtyPreview} ${
                                line.stock.unit || "piece"
                              } in base units.`
                            : null}
                          {factor > 1
                            ? ` Sal/Cost are for 1 ${
                                PRODUCT_UNIT_LABELS[
                                  normalizeProductUnit(line.packagingUnit)
                                ] || line.packagingUnit
                              } (saved as per ${line.stock.unit || "piece"}).`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                  );
                })
              )}

              {businessId && lines.some((line) => line.stockId) ? (
                <div className="bg-muted/30 grid gap-2 rounded-xl border px-3 py-2.5 text-sm sm:grid-cols-5">
                  <div>
                    <p className="text-muted-foreground text-xs">Qty total</p>
                    <p className="font-medium tabular-nums">{formatNum(draftTotals.quantity)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Sal total</p>
                    <p className="font-medium tabular-nums">{formatMoney(draftTotals.sale)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Cost total</p>
                    <p className="font-medium tabular-nums">{formatMoney(draftTotals.cost)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Sale amount</p>
                    <p className="font-medium tabular-nums">
                      {formatMoney(draftTotals.saleAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Cost amount</p>
                    <p className="font-medium tabular-nums">
                      {formatMoney(draftTotals.costAmount)}
                    </p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <PermissionButton
            modulePath={MODULE_PATH}
            action="update"
            type="submit"
            className="w-full"
            disabled={saving || !businessId}
          >
            {saving ? "Saving…" : mode === "add" ? "Add stock & save prices" : "Set stock & save prices"}
          </PermissionButton>
        </form>

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Recent stock updates</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!businessId}
                onClick={() =>
                  navigate(
                    businessId
                      ? `/stock/updates?businessId=${encodeURIComponent(businessId)}`
                      : "/stock/updates"
                  )
                }
              >
                View all
                <ArrowUpRight className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {!businessId ? (
              <p className="text-muted-foreground text-sm">
                Select a business to see recent posts for that location.
              </p>
            ) : recentLoading ? (
              <p className="text-muted-foreground text-sm">Loading recent posts…</p>
            ) : recentError ? (
              <p className="text-destructive text-sm">{recentError}</p>
            ) : recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No stock updates posted for this business yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recent.map((row) => (
                  <div
                    key={row._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {row.batchNumber} · {row.mode === "set" ? "Set" : "Add"} ·{" "}
                        {row.lineCount} line{row.lineCount === 1 ? "" : "s"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatWhen(row.createdAt)} · Qty {formatNum(row.totalQuantity)} · Sal{" "}
                        {formatMoney(row.totalSale)} · Cost {formatMoney(row.totalCost)}
                        {row.postedByName ? ` · ${row.postedByName}` : ""}
                      </p>
                    </div>
                    <PermissionIconButton
                      modulePath={MODULE_PATH}
                      action="view"
                      label="View post"
                      icon={<Eye />}
                      onClick={() => navigate(`/stock/updates/${row._id}`)}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </RequirePermission>
  );
}
