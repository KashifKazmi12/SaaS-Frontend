import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { escapeHtml, printHtmlDocument } from "@/lib/printHtml";
import { cn } from "@/lib/utils";

interface StripePaymentLinkPanelProps {
  checkoutUrl: string;
  orderNumber?: string;
  amountLabel?: string;
  /** Card on detail page; plain block inside success modal. */
  variant?: "card" | "plain";
  className?: string;
}

/** Desktop Windows Web Share often shows a broken system dialog — prefer WhatsApp there. */
function canUseNativeShare() {
  if (typeof navigator.share !== "function") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

export function StripePaymentLinkPanel({
  checkoutUrl,
  orderNumber,
  amountLabel,
  variant = "card",
  className,
}: StripePaymentLinkPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [notice, setNotice] = useState("");
  const shareText = orderNumber
    ? `Pay for order ${orderNumber}`
    : "Pay for your order";

  useEffect(() => {
    if (!checkoutUrl) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(checkoutUrl, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [checkoutUrl]);

  async function handleCopy() {
    setNotice("");
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setNotice("Payment link copied.");
      return true;
    } catch {
      setNotice("Could not copy link.");
      return false;
    }
  }

  async function shareViaWhatsApp() {
    await handleCopy();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${checkoutUrl}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setNotice("Opened WhatsApp. Payment link copied to clipboard.");
  }

  async function handleShare() {
    setNotice("");
    if (canUseNativeShare()) {
      try {
        await navigator.share({
          title: shareText,
          text: `${shareText}\n${checkoutUrl}`,
          url: checkoutUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    await shareViaWhatsApp();
  }

  function handleSave() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `order-${orderNumber || "payment"}-qr.png`;
    link.click();
  }

  function handlePrintQr() {
    if (!qrDataUrl) return;
    printHtmlDocument(`<!doctype html><html><head><title>${escapeHtml(shareText)}</title>
      <style>
        body { font-family: system-ui, sans-serif; text-align: center; padding: 24px; color: #111; }
        img { width: 240px; height: 240px; }
        h1 { font-size: 18px; }
        p { font-size: 13px; color: #444; }
        a { color: #111; }
      </style></head><body>
      <h1>${escapeHtml(shareText)}</h1>
      ${amountLabel ? `<p>${escapeHtml(amountLabel)}</p>` : ""}
      <img src="${qrDataUrl}" alt="Payment QR" />
      <p><a href="${escapeHtml(checkoutUrl)}">Open payment link</a></p>
      </body></html>`);
  }

  const body = (
    <div className={cn("space-y-4", className)}>
      <p className="text-muted-foreground text-sm">
        Share this Stripe link or QR with the customer. Payment updates when they pay. You can
        reopen this from the order until it is paid.
      </p>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Stripe payment QR code"
            className="size-52 shrink-0 rounded-lg border bg-white p-2"
          />
        ) : (
          <div className="text-muted-foreground flex size-52 shrink-0 items-center justify-center rounded-lg border text-sm">
            Generating QR…
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-3">
          {amountLabel ? <p className="text-sm font-medium">{amountLabel}</p> : null}
          <p className="text-sm">
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium underline underline-offset-2"
            >
              Open Stripe payment link
            </a>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="size-4" />
              Copy link
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="size-4" />
              Share
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!qrDataUrl}
            >
              <Download className="size-4" />
              Save QR
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintQr}
              disabled={!qrDataUrl}
            >
              <Printer className="size-4" />
              Print QR
            </Button>
          </div>
          {notice ? <p className="text-muted-foreground text-xs">{notice}</p> : null}
        </div>
      </div>
    </div>
  );

  if (variant === "plain") return body;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Collect card payment</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">{body}</CardContent>
    </Card>
  );
}
