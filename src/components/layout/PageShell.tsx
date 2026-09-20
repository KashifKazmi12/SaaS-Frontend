import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageShell({
  title,
  description,
  children,
  action,
  compact = false,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? "space-y-3" : "space-y-6")}>
      {(title || description || action) && (
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between",
            compact ? "gap-2" : "gap-4 sm:items-start"
          )}
        >
          <div>
            {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
            {description && (
              <p className={title ? "mt-1 text-sm text-muted-foreground" : "text-sm text-muted-foreground"}>
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
