import { useSearchParams } from "react-router-dom";

/** Public Stripe cancel return — no login, no portal chrome. */
export default function PaymentCancelledPage() {
  const [params] = useSearchParams();
  const orderNumber = String(params.get("order") || "").trim();

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted text-2xl">
          !
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment not completed</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The card payment was cancelled or not finished
          {orderNumber ? (
            <>
              {" "}
              for order <span className="text-foreground font-medium">{orderNumber}</span>
            </>
          ) : null}
          . You can close this page and ask staff for a new payment link if needed.
        </p>
      </div>
    </div>
  );
}
