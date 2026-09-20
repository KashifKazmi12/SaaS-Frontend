function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className || ""}`} />;
}

export function InsightsFiltersSkeleton() {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <Pulse className="h-4 w-40" />
        <Pulse className="h-7 w-64" />
      </div>
    </div>
  );
}

export function InsightsKpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-7">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card px-3 py-2.5">
          <Pulse className="h-3 w-16" />
          <Pulse className="mt-2 h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function InsightsChartsSkeleton() {
  return (
    <div className="grid gap-2 lg:grid-cols-3">
      <div className="rounded-lg border bg-card p-3 lg:col-span-2">
        <Pulse className="h-4 w-24" />
        <Pulse className="mt-3 h-[180px] w-full" />
      </div>
      <div className="rounded-lg border bg-card p-3">
        <Pulse className="h-4 w-24" />
        <Pulse className="mt-3 h-[180px] w-full" />
      </div>
    </div>
  );
}

export function InsightsAttentionRowsSkeleton() {
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-2 px-1.5 py-1">
          <div className="min-w-0 flex-1">
            <Pulse className="h-3.5 w-28" />
            <Pulse className="mt-1.5 h-3 w-20" />
          </div>
          <Pulse className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

export function InsightsDashboardSkeleton() {
  return (
    <div className="space-y-3">
      <InsightsKpiSkeleton />
      <InsightsChartsSkeleton />
      <div className="grid gap-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border bg-card p-3">
            <Pulse className="h-4 w-28" />
            <Pulse className="mt-3 h-8 w-full" />
            <Pulse className="mt-2 h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsBreakdownsSkeleton() {
  return (
    <div className="grid gap-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card p-3">
          <Pulse className="h-4 w-28" />
          <Pulse className="mt-3 h-[180px] w-full" />
        </div>
      ))}
    </div>
  );
}
