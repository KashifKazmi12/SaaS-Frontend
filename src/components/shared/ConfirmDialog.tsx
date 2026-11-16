import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { OrderStaffCodeField } from "@/components/orders/OrderStaffCodeField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { validateOrderStaffCode } from "@/hooks/useOrderStaffGate";
import { cn } from "@/lib/utils";

export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  /** When set, show a staff-code field and require a valid code before confirm. */
  staffCodeBusinessId?: string;
}

export type ConfirmResult = {
  confirmed: boolean;
  staffCode?: string;
  staffName?: string;
};

interface ConfirmDialogProps extends ConfirmDialogOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (result: { staffCode?: string; staffName?: string }) => void;
  confirming?: boolean;
  staffError?: string;
  staffCode?: string;
  onStaffCodeChange?: (value: string) => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  staffCodeBusinessId,
  onConfirm,
  confirming = false,
  staffError = "",
  staffCode = "",
  onStaffCodeChange,
}: ConfirmDialogProps) {
  const needsStaff = Boolean(staffCodeBusinessId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {needsStaff ? (
          <OrderStaffCodeField
            id="confirm-staff-code"
            value={staffCode}
            onChange={(value) => onStaffCodeChange?.(value)}
            error={staffError}
            disabled={confirming}
            autoFocus
          />
        ) : null}
        <DialogFooter className={cn(description || needsStaff ? undefined : "mt-2")}>
          <Button
            type="button"
            variant="outline"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={confirming || (needsStaff && !staffCode.trim())}
            onClick={() => onConfirm({ staffCode: staffCode.trim() || undefined })}
          >
            {confirming ? "Checking…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmRequest extends ConfirmDialogOptions {
  resolve: (result: ConfirmResult) => void;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmDialogOptions | string) => Promise<ConfirmResult>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(undefined);

function normalizeConfirmOptions(options: ConfirmDialogOptions | string): ConfirmDialogOptions {
  return typeof options === "string" ? { title: options } : options;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [staffCode, setStaffCode] = useState("");
  const [staffError, setStaffError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!request) return;
    setStaffCode("");
    setStaffError("");
    setConfirming(false);
  }, [request]);

  const confirm = useCallback((options: ConfirmDialogOptions | string) => {
    return new Promise<ConfirmResult>((resolve) => {
      setRequest({
        ...normalizeConfirmOptions(options),
        resolve,
      });
    });
  }, []);

  const close = useCallback((result: ConfirmResult) => {
    setRequest((current) => {
      current?.resolve(result);
      return null;
    });
    setConfirming(false);
    setStaffCode("");
    setStaffError("");
  }, []);

  const handleConfirm = useCallback(
    async (draft: { staffCode?: string }) => {
      if (!request) return;
      const businessId = String(request.staffCodeBusinessId || "").trim();
      if (!businessId) {
        close({ confirmed: true });
        return;
      }

      setConfirming(true);
      setStaffError("");
      try {
        const staff = await validateOrderStaffCode(businessId, draft.staffCode || "");
        close({
          confirmed: true,
          staffCode: staff.staffCode,
          staffName: staff.staffName,
        });
      } catch (err) {
        setStaffError(err instanceof Error ? err.message : "Invalid staff code.");
        setConfirming(false);
      }
    },
    [close, request]
  );

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {request ? (
        <ConfirmDialog
          open
          title={request.title}
          description={request.description}
          confirmLabel={request.confirmLabel}
          cancelLabel={request.cancelLabel}
          variant={request.variant}
          staffCodeBusinessId={request.staffCodeBusinessId}
          staffCode={staffCode}
          onStaffCodeChange={(value) => {
            setStaffCode(value);
            setStaffError("");
          }}
          staffError={staffError}
          confirming={confirming}
          onOpenChange={(open) => {
            if (!open && !confirming) close({ confirmed: false });
          }}
          onConfirm={(draft) => {
            void handleConfirm(draft);
          }}
        />
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("Confirm dialog context is unavailable.");
  }
  return context;
}
