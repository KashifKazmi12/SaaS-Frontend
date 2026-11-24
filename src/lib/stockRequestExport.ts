import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

export type StockRequestExportRow = {
  product: string;
  sku: string;
  variation: string;
  unit: string;
  quantity: number;
};

export type StockRequestExportMeta = {
  businessName: string;
  notes?: string;
  createdAt?: Date;
};

function fileStamp(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function downloadStockRequestExcel(
  rows: StockRequestExportRow[],
  meta: StockRequestExportMeta
) {
  const stamp = fileStamp(meta.createdAt);
  const sheetRows = [
    ["Stock request"],
    ["Business", meta.businessName || "—"],
    ["Date", (meta.createdAt || new Date()).toLocaleString()],
    ...(meta.notes?.trim() ? [["Notes", meta.notes.trim()]] : []),
    [],
    ["#", "Product", "SKU", "Variation", "Unit", "Qty requested"],
    ...rows.map((row, index) => [
      index + 1,
      row.product,
      row.sku,
      row.variation || "—",
      row.unit,
      row.quantity,
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(sheetRows);
  sheet["!cols"] = [
    { wch: 4 },
    { wch: 36 },
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Request");
  XLSX.writeFile(book, `stock-request-${stamp}.xlsx`);
}

/** Downloads a PDF file (same idea as Excel — no print dialog). */
export function downloadStockRequestPdf(
  rows: StockRequestExportRow[],
  meta: StockRequestExportMeta
) {
  const stamp = fileStamp(meta.createdAt);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const usableWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Stock request", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Business: ${meta.businessName || "—"}`, margin, y);
  y += 14;
  doc.text(`Date: ${(meta.createdAt || new Date()).toLocaleString()}`, margin, y);
  y += 14;
  if (meta.notes?.trim()) {
    const noteLines = doc.splitTextToSize(`Notes: ${meta.notes.trim()}`, usableWidth);
    ensureSpace(noteLines.length * 12 + 8);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 12 + 8;
  } else {
    y += 6;
  }

  const headers = ["#", "Product", "SKU", "Variation", "Unit", "Qty"];
  const colWidths = [24, usableWidth - 24 - 70 - 80 - 50 - 40, 70, 80, 50, 40];
  const rowHeight = 18;

  const drawHeader = () => {
    ensureSpace(rowHeight + 4);
    doc.setFillColor(243, 243, 243);
    doc.rect(margin, y - 11, usableWidth, rowHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let x = margin;
    headers.forEach((header, index) => {
      doc.text(header, x + 3, y);
      x += colWidths[index];
    });
    y += rowHeight;
    doc.setFont("helvetica", "normal");
  };

  drawHeader();

  rows.forEach((row, index) => {
    const cells = [
      String(index + 1),
      row.product || "—",
      row.sku || "—",
      row.variation || "—",
      row.unit || "—",
      String(row.quantity),
    ];
    const wrapped = cells.map((cell, cellIndex) =>
      doc.splitTextToSize(cell, Math.max(10, colWidths[cellIndex] - 6))
    );
    const linesUsed = Math.max(1, ...wrapped.map((parts) => parts.length));
    const height = Math.max(rowHeight, linesUsed * 11 + 6);
    ensureSpace(height + 2);

    // Repeat header after page break.
    if (y === margin) drawHeader();

    let x = margin;
    wrapped.forEach((parts, cellIndex) => {
      const textX =
        cellIndex === headers.length - 1
          ? x + colWidths[cellIndex] - 3
          : x + 3;
      doc.text(parts, textX, y, {
        align: cellIndex === headers.length - 1 ? "right" : "left",
      });
      x += colWidths[cellIndex];
    });
    y += height;
  });

  if (!rows.length) {
    ensureSpace(20);
    doc.text("No products", margin, y);
  }

  doc.save(`stock-request-${stamp}.pdf`);
}
