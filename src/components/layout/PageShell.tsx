import type { ReactNode } from "react";

export function PageShell({
  title,
  description,
  children,
  action,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      {(title || description || action) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
