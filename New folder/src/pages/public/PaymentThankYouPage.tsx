import { useSearchParams } from "react-router-dom";

/** Public Stripe return page — no login, no portal chrome. */
export default function PaymentThankYouPage() {
  const [params] = useSearchParams();
  const orderNumber = String(params.get("order") || "").trim();

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          ✓
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Thank you for your purchase</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your payment was received successfully
          {orderNumber ? (
            <>
              {" "}
              for order <span className="text-foreground font-medium">{orderNumber}</span>
            </>
          ) : null}
          . You can close this page.
        </p>
      </div>
    </div>
  );
}
