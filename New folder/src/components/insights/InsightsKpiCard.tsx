import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const accentStyles = {
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  amber: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  slate: "bg-muted text-muted-foreground",
} as const;

export function InsightsKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "slate",
  to,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: keyof typeof accentStyles;
  /** When set, the whole card navigates to this path (with optional query). */
  to?: string;
}) {
  const className = cn(
    "rounded-lg border border-border/45 bg-muted/20 px-3 py-2.5 text-left dark:bg-muted/15",
    to &&
      "hover:bg-muted/35 focus-visible:ring-ring/40 block transition-colors outline-none focus-visible:ring-2 dark:hover:bg-muted/25"
  );

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground truncate text-xs">{label}</p>
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md",
            accentStyles[accent]
          )}
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </div>
      </div>
      <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{hint}</p> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className} aria-label={`Open ${label}`}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
