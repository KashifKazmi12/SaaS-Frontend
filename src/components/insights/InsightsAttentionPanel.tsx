import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function InsightsAttentionPanel({
  title,
  icon: Icon,
  count,
  empty,
  footer,
  tone = "default",
  loading = false,
  children,
}: {
  title: string;
  icon: LucideIcon;
  count: number;
  empty: string;
  footer?: ReactNode;
  tone?: "default" | "warning" | "danger";
  loading?: boolean;
  children: ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-primary";

  return (
    <Card size="sm" className="h-full overflow-hidden">
      <CardHeader className="border-b py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className={cn("size-3.5 shrink-0", toneClass)} />
            <CardTitle className="truncate text-sm">{title}</CardTitle>
          </div>
          <Badge variant={count > 0 ? "secondary" : "outline"} className="h-5 px-1.5 text-[10px]">
            {loading ? "…" : count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="h-72 overflow-y-auto py-1">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="sm" />
          </div>
        ) : count > 0 ? (
          children
        ) : (
          <p className="text-muted-foreground flex h-full items-center justify-center text-center text-xs">
            {empty}
          </p>
        )}
      </CardContent>
      {footer ? <CardFooter className="mt-auto py-2">{footer}</CardFooter> : null}
    </Card>
  );
}

export function InsightsPanelPager({
  page,
  totalPages,
  disabled,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="ml-auto flex items-center gap-1">
      <Button
        type="button"
        size="icon-xs"
        variant="outline"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft />
      </Button>
      <span className="text-muted-foreground min-w-8 text-center text-[11px] tabular-nums">
        {page}/{totalPages}
      </span>
      <Button
        type="button"
        size="icon-xs"
        variant="outline"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

export function AttentionOrderRow({
  title,
  subtitle,
  amount,
  onClick,
}: {
  title: string;
  subtitle: string;
  amount: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-muted/70 group flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block truncate text-[11px]">{subtitle}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className="text-sm font-medium tabular-nums">{amount}</span>
        <ChevronRight className="text-muted-foreground size-3.5 opacity-0 group-hover:opacity-100" />
      </span>
    </button>
  );
}

export function AttentionStockRow({
  title,
  subtitle,
  quantity,
  level,
}: {
  title: string;
  subtitle: string;
  quantity: number;
  level: "low" | "out";
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block truncate text-[11px]">{subtitle}</span>
      </span>
      <Badge variant={level === "out" ? "destructive" : "secondary"} className="h-5 tabular-nums">
        {quantity}
      </Badge>
    </div>
  );
}

export function InsightsRankedList({
  rows,
  empty,
}: {
  rows: Array<{ key: string; title: string; subtitle?: string; amount: string }>;
  empty: string;
}) {
  if (!rows.length) {
    return (
      <p className="text-muted-foreground flex h-72 items-center justify-center text-center text-xs">
        {empty}
      </p>
    );
  }

  return (
    <div className="h-72 overflow-y-auto py-0.5">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1.5">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{row.title}</span>
            {row.subtitle ? (
              <span className="text-muted-foreground block truncate text-[11px]">{row.subtitle}</span>
            ) : null}
          </span>
          <span className="shrink-0 text-sm font-medium tabular-nums">{row.amount}</span>
        </div>
      ))}
    </div>
  );
}
