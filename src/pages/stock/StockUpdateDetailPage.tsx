import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import { PageAlerts } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PRODUCT_UNIT_LABELS, normalizeProductUnit } from "@/constants/catalog";
import { getBusinessDisplayName } from "@/lib/business";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { StockUpdateBatchRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.STOCK;

function formatWhen(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatNum(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function unitLabel(unit: string) {
  const key = normalizeProductUnit(unit || "piece");
  return PRODUCT_UNIT_LABELS[key] || unit || "piece";
}

export default function StockUpdateDetailPage() {
  const { batchId = "" } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<StockUpdateBatchRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .getStockUpdateBatch(batchId)
      .then((data) => {
        if (!cancelled) setBatch(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setBatch(null);
          setError(err instanceof Error ? err.message : "Unable to load stock update.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  const lines = batch?.lines || [];
  const totals = useMemo(
    () => ({
      quantity: lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
      sale: lines.reduce((sum, line) => sum + (Number(line.unitPrice) || 0), 0),
      cost: lines.reduce((sum, line) => sum + (Number(line.costPrice) || 0), 0),
      saleAmount: lines.reduce((sum, line) => sum + (Number(line.saleAmount) || 0), 0),
      costAmount: lines.reduce((sum, line) => sum + (Number(line.costAmount) || 0), 0),
    }),
    [lines]
  );

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell
        description={
          batch
            ? `${batch.batchNumber} · ${batch.mode === "set" ? "Set quantity" : "Add stock"} · ${formatWhen(batch.createdAt)}`
            : undefined
        }
        action={
          <Button type="button" variant="outline" onClick={() => navigate("/stock/updates")}>
            <ArrowLeft className="size-4" />
            Back to history
          </Button>
        }
      >
        <PageAlerts error={error} />

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading post…</p>
        ) : !batch ? (
          <p className="text-muted-foreground text-sm">Stock update not found.</p>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Post summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-xs">Business</p>
                  <p className="font-medium">{getBusinessDisplayName(batch.business)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Posted by</p>
                  <p className="font-medium">{batch.postedByName || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Lines</p>
                  <p className="font-medium">{batch.lineCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Mode</p>
                  <p className="font-medium">
                    {batch.mode === "set" ? "Set quantity" : "Add stock"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>Lines</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Sal</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Sale amount</TableHead>
                      <TableHead className="text-right">Cost amount</TableHead>
                      <TableHead className="text-right">On hand</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, index) => (
                      <TableRow key={`${line.stock || "line"}-${index}`}>
                        <TableCell>
                          <div className="font-medium">
                            {[line.productName, line.variationName].filter(Boolean).join(" · ") ||
                              "Product"}
                          </div>
                          {line.sku ? (
                            <div className="text-muted-foreground text-xs">{line.sku}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>{unitLabel(line.packagingUnit)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNum(line.quantity)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(line.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(line.costPrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(line.saleAmount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(line.costAmount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatNum(line.beforeQty)} → {formatNum(line.afterQty)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-medium">
                        Totals
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatNum(totals.quantity)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(totals.sale)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(totals.cost)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(totals.saleAmount)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(totals.costAmount)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </PageShell>
    </RequirePermission>
  );
}
