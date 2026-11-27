import { jsPDF } from "jspdf";
import {
  formatInsightDateRange,
  insightsRangeLabel,
  paymentLabel,
  statusLabel,
} from "@/components/insights/insightsUtils";
import { ORDER_PAYMENT_METHOD_OPTIONS } from "@/lib/listFilters";
import { formatMoney } from "@/lib/money";
import type { DashboardKpis, DashboardReportOrder, InsightsRange } from "@/types";

export type DashboardReportMeta = {
  groupName: string;
  businessName: string;
  range: InsightsRange;
  rangeFrom: string;
  rangeTo: string;
  currency?: string;
  truncated?: boolean;
  totalOrders: number;
};

function fileStamp(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function methodLabel(method: string) {
  return ORDER_PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label || method || "—";
}

function formatOrderDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

type KpiLine = { label: string; value: string; hint?: string };

function buildKpiLines(kpis: DashboardKpis, money: (n: number) => string): KpiLine[] {
  const refundsTotal = (kpis.refunded || 0) + (kpis.refundPending || 0);
  const followUp = (kpis.refundPending || 0) + (kpis.lowStock || 0) + (kpis.outOfStock || 0);
  return [
    {
      label: "Completed sales",
      value: money(kpis.sales),
      hint: `${kpis.completedOrders} completed`,
    },
    {
      label: "Orders placed",
      value: String(kpis.ordersPlaced),
      hint: `${kpis.cancelledOrders} cancelled`,
    },
    {
      label: "Open now",
      value: String(kpis.openOrders),
      hint: kpis.unpaidOpen
        ? `${kpis.unpaidOpen} unpaid · ${money(kpis.unpaidAmount)}`
        : "All paid",
    },
    {
      label: "Follow-up",
      value: String(followUp),
      hint: `${kpis.refundPending} refund · ${kpis.outOfStock} out`,
    },
    {
      label: "Refunds",
      value: String(refundsTotal),
      hint: `${kpis.refunded || 0} refunded · ${kpis.refundPending || 0} pending`,
    },
    { label: "Low stock", value: String(kpis.lowStock) },
    { label: "Out of stock", value: String(kpis.outOfStock) },
  ];
}

/** Downloads a dashboard PDF for the active filters (KPIs + order list). */
export function downloadDashboardReportPdf(
  kpis: DashboardKpis,
  orders: DashboardReportOrder[],
  meta: DashboardReportMeta
) {
  const stamp = fileStamp();
  const money = (amount: number) => formatMoney(amount, meta.currency);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const usableWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  const rangeText =
    formatInsightDateRange(meta.rangeFrom, meta.rangeTo) || insightsRangeLabel(meta.range);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Dashboard report", margin, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Group: ${meta.groupName || "—"}`, margin, y);
  y += 14;
  doc.text(`Branch: ${meta.businessName || "All branches"}`, margin, y);
  y += 14;
  doc.text(`Period: ${rangeText}`, margin, y);
  y += 14;
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Summary", margin, y);
  y += 14;

  const kpiLines = buildKpiLines(kpis, money);
  const kpiCols = 3;
  const kpiColWidth = usableWidth / kpiCols;
  const kpiRowHeight = 34;

  doc.setFontSize(9);
  for (let i = 0; i < kpiLines.length; i += kpiCols) {
    ensureSpace(kpiRowHeight + 4);
    const row = kpiLines.slice(i, i + kpiCols);
    row.forEach((line, col) => {
      const x = margin + col * kpiColWidth;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(line.label, x, y);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(line.value, x, y + 12);
      if (line.hint) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(110);
        doc.text(line.hint, x, y + 24);
        doc.setTextColor(0);
      }
    });
    y += kpiRowHeight;
  }

  y += 8;
  ensureSpace(28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0);
  const orderTitle =
    meta.truncated && meta.totalOrders > orders.length
      ? `Orders (${orders.length} of ${meta.totalOrders})`
      : `Orders (${meta.totalOrders})`;
  doc.text(orderTitle, margin, y);
  y += 16;

  if (meta.truncated) {
    ensureSpace(16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Showing the most recent orders in this period (export capped).", margin, y);
    doc.setTextColor(0);
    y += 14;
  }

  const headers = ["Order #", "Date", "Customer", "Items", "Status", "Payment", "Total"];
  const colWidths = [78, 70, 100, usableWidth - 78 - 70 - 100 - 70 - 90 - 70, 70, 90, 70];
  const rowHeight = 16;

  const drawHeader = () => {
    ensureSpace(rowHeight + 4);
    doc.setFillColor(243, 243, 243);
    doc.rect(margin, y - 11, usableWidth, rowHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    let x = margin;
    headers.forEach((header, index) => {
      doc.text(header, x + 3, y);
      x += colWidths[index];
    });
    y += rowHeight;
    doc.setFont("helvetica", "normal");
  };

  drawHeader();

  orders.forEach((order) => {
    const payment = `${paymentLabel(order.paymentStatus)}${
      order.paymentMethod ? ` · ${methodLabel(order.paymentMethod)}` : ""
    }`;
    const cells = [
      order.orderNumber || "—",
      formatOrderDate(order.createdAt),
      order.customer || "—",
      order.itemsSummary || "—",
      statusLabel(order.status),
      payment,
      money(order.total),
    ];
    const wrapped = cells.map((cell, cellIndex) =>
      doc.splitTextToSize(cell, Math.max(10, colWidths[cellIndex] - 6))
    );
    const linesUsed = Math.max(1, ...wrapped.map((parts) => parts.length));
    const height = Math.max(rowHeight, linesUsed * 10 + 4);
    ensureSpace(height + 2);
    if (y === margin) drawHeader();

    let x = margin;
    wrapped.forEach((parts, cellIndex) => {
      const isTotal = cellIndex === headers.length - 1;
      doc.text(parts, isTotal ? x + colWidths[cellIndex] - 3 : x + 3, y, {
        align: isTotal ? "right" : "left",
      });
      x += colWidths[cellIndex];
    });
    y += height;
  });

  if (!orders.length) {
    ensureSpace(20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("No orders in this period.", margin, y);
  }

  doc.save(`dashboard-report-${stamp}.pdf`);
}
