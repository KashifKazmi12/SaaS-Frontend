import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Compact help icon — use only for fields that need a short explanation. */
export function FieldHelp({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={label}
          />
        }
      >
        <CircleHelp className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-pretty leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

export function FieldLabelWithHelp({
  htmlFor,
  required,
  label,
  helpLabel,
  help,
}: {
  htmlFor?: string;
  required?: boolean;
  label: string;
  helpLabel?: string;
  help?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {help ? <FieldHelp label={helpLabel || `About ${label}`}>{help}</FieldHelp> : null}
    </div>
  );
}
