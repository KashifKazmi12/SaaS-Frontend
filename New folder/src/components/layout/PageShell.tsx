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
            "flex flex-col sm:flex-row sm:justify-between",
            compact ? "gap-2 sm:items-center" : "gap-3 sm:items-start sm:gap-4"
          )}
        >
          <div className="min-w-0">
            {title && (
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
            )}
            {description && (
              <p
                className={
                  title
                    ? "mt-1 text-sm text-muted-foreground"
                    : "text-sm text-muted-foreground"
                }
              >
                {description}
              </p>
            )}
          </div>
          {action ? (
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {action}
            </div>
          ) : null}
        </div>
      )}
      {children}
    </div>
  );
}
