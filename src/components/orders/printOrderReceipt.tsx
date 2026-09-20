import QRCode from "qrcode";
import { escapeHtml, printHtmlDocument } from "@/lib/printHtml";

/** Printable order receipt — browser print dialog can Save as PDF. */
export async function printOrderReceipt(params: {
  orderNumber: string;
  customerName: string;
  paymentMethodLabel: string;
  currency: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  discountAmount?: number;
  discountType?: "fixed" | "percent";
  discountValue?: number;
  total: number;
  createdAt?: string;
  businessName?: string;
  /** Stripe checkout URL — when set, receipt includes a pay-by-card QR. */
  paymentUrl?: string | null;
}) {
  const {
    orderNumber,
    customerName,
    paymentMethodLabel,
    currency,
    items,
    subtotal,
    discountAmount = 0,
    discountType = "fixed",
    discountValue = 0,
    total,
    createdAt,
    businessName,
    paymentUrl,
  } = params;

  const money = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "PKR",
      minimumFractionDigits: 2,
    }).format(value);

  const when = createdAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(createdAt)
      )
    : "";

  const rows = items
    .map(
      (item) =>
        `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td style="text-align:right">${item.quantity}</td>
          <td style="text-align:right">${money(item.unitPrice)}</td>
          <td style="text-align:right">${money(item.lineTotal)}</td>
        </tr>`
    )
    .join("");

  let paymentBlock = "";
  if (paymentUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(paymentUrl, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      paymentBlock = `
        <div class="pay">
          <p class="pay-title">Pay with card</p>
          <p class="muted">Scan to pay ${money(total)}</p>
          <img src="${qrDataUrl}" alt="Payment QR" width="200" height="200" />
        </div>`;
    } catch {
      paymentBlock = `
        <div class="pay">
          <p class="pay-title">Pay with card</p>
          <p class="muted">Open this link to pay ${money(total)}</p>
          <p class="link">${escapeHtml(paymentUrl)}</p>
        </div>`;
    }
  }

  printHtmlDocument(`<!doctype html><html><head><title>Receipt ${escapeHtml(orderNumber)}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #111; max-width: 420px; margin: 0 auto; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      .muted { color: #555; font-size: 12px; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { padding: 6px 0; border-bottom: 1px solid #e5e5e5; }
      th { text-align: left; font-size: 11px; text-transform: uppercase; color: #666; }
      .totals { margin-top: 12px; font-size: 14px; }
      .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
      .total { font-weight: 700; font-size: 16px; border-top: 1px solid #111; margin-top: 6px; padding-top: 8px; }
      .pay { margin-top: 20px; padding-top: 16px; border-top: 1px dashed #ccc; text-align: center; }
      .pay-title { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
      .pay img { margin: 8px auto; display: block; }
      .link { font-size: 10px; word-break: break-all; color: #444; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>${escapeHtml(businessName || "Order receipt")}</h1>
    <p class="muted">${escapeHtml(orderNumber)}${when ? ` · ${escapeHtml(when)}` : ""}</p>
    <p class="muted">Customer: ${escapeHtml(customerName)} · Payment: ${escapeHtml(paymentMethodLabel)}</p>
    <table>
      <thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${money(subtotal)}</span></div>
      ${
        discountAmount > 0
          ? `<div><span>${
              discountType === "percent" && discountValue > 0
                ? `Discount (${discountValue}%)`
                : "Discount"
            }</span><span>−${money(discountAmount)}</span></div>`
          : ""
      }
      <div class="total"><span>Total</span><span>${money(total)}</span></div>
    </div>
    ${paymentBlock}
    </body></html>`);
}
