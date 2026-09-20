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
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: keyof typeof accentStyles;
}) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground truncate text-xs">{label}</p>
        <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", accentStyles[accent])}>
          <Icon className="size-3.5" strokeWidth={2} />
        </div>
      </div>
      <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{hint}</p> : null}
    </div>
  );
}
