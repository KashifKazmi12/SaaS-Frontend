import type { KeyboardEvent } from "react";
import { useEffect, useId, useState } from "react";
import { Printer } from "lucide-react";
import { StripePaymentLinkPanel } from "@/components/orders/StripePaymentLinkPanel";
import { printOrderReceipt } from "@/components/orders/printOrderReceipt";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CHECKOUT_PAYMENT_METHOD_OPTIONS } from "@/constants/commerce";
import { currencyFromGroup, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { OrderRecord } from "@/types";

type SuccessTab = "summary" | "card";

interface OrderCreateSuccessDialogProps {
  open: boolean;
  order: OrderRecord | null;
  checkoutUrl?: string | null;
  businessName?: string;
  onAddNew: () => void;
  onViewDetail: () => void;
  onOpenChange: (open: boolean) => void;
}

function paymentMethodLabel(method: string) {
  return (
    CHECKOUT_PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ||
    method
  );
}

function customerNameFromOrder(order: OrderRecord) {
  if (typeof order.customer === "object" && order.customer) return order.customer.name;
  return "Customer";
}

export function OrderCreateSuccessDialog({
  open,
  order,
  checkoutUrl,
  businessName,
  onAddNew,
  onViewDetail,
  onOpenChange,
}: OrderCreateSuccessDialogProps) {
  const hasCard =
    Boolean(checkoutUrl) &&
    order?.paymentMethod === "stripe" &&
    order.paymentStatus === "unpaid" &&
    order.total > 0;

  const [tab, setTab] = useState<SuccessTab>("summary");
  const tabListId = useId();

  useEffect(() => {
    if (!open || !order) return;
    setTab(hasCard ? "card" : "summary");
  }, [open, hasCard, order?._id]);

  if (!order) return null;

  const currency = currencyFromGroup(order.businessGroup);
  const customerName = customerNameFromOrder(order);
  const payLabel = paymentMethodLabel(order.paymentMethod);

  function handlePrintReceipt() {
    void printOrderReceipt({
      orderNumber: order.orderNumber,
      customerName,
      paymentMethodLabel: payLabel,
      currency,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      subtotal: order.subtotal,
      discountAmount: order.discountAmount || 0,
      discountType: order.discountType,
      discountValue: order.discountValue,
      total: order.total,
      createdAt: order.createdAt,
      businessName,
      paymentUrl: hasCard ? checkoutUrl : null,
    });
  }

  function onTabListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!hasCard) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      setTab((current) => (current === "summary" ? "card" : "summary"));
      return;
    }
    if (event.key === "1") {
      event.preventDefault();
      setTab("summary");
    }
    if (event.key === "2" && hasCard) {
      event.preventDefault();
      setTab("card");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Order created</DialogTitle>
          <DialogDescription>
            {order.orderNumber}
            {hasCard
              ? " · Card payment ready. Tab between actions, or use 1 / 2 for tabs."
              : " · Add another order, or open this one."}
          </DialogDescription>
        </DialogHeader>

        {hasCard ? (
          <div
            id={tabListId}
            role="tablist"
            aria-label="Order success sections"
            className="bg-muted inline-flex rounded-lg p-1"
            onKeyDown={onTabListKeyDown}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "summary"}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "summary"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab("summary")}
            >
              Summary
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "card"}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "card"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab("card")}
            >
              Card payment
            </button>
          </div>
        ) : null}

        {tab === "summary" || !hasCard ? (
          <div className="space-y-3 rounded-xl border p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium text-right">{customerName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Payment</span>
              <span className="font-medium text-right">{payLabel}</span>
            </div>
            {(order.discountAmount || 0) > 0 ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {order.discountType === "percent" && (order.discountValue || 0) > 0
                    ? `Discount (${order.discountValue}%)`
                    : "Discount"}
                </span>
                <span className="font-medium text-right">
                  −{formatMoney(order.discountAmount || 0, currency)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t pt-3">
              <span className="font-medium">Total</span>
              <span className="font-semibold">{formatMoney(order.total, currency)}</span>
            </div>
            <p className="text-muted-foreground text-xs">
              {order.items.length} item{order.items.length === 1 ? "" : "s"}
              {businessName ? ` · ${businessName}` : ""}
            </p>
          </div>
        ) : (
          <StripePaymentLinkPanel
            variant="plain"
            checkoutUrl={checkoutUrl!}
            orderNumber={order.orderNumber}
            amountLabel={`Amount due: ${formatMoney(order.total, currency)}`}
          />
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={handlePrintReceipt}>
            <Printer className="size-4" />
            Print receipt
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onViewDetail}>
              View detail
            </Button>
            <Button type="button" autoFocus onClick={onAddNew}>
              Add new order
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
