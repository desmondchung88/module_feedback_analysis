export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} aria-hidden />;
}

export function KpiSkeletonRow({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 3, className = '' }) {
  return (
    <div className={`rounded-xl bg-white p-5 ring-1 ring-slate-200 ${className}`}>
      <Skeleton className="h-5 w-40" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className={`h-4 ${i % 2 ? 'w-3/4' : 'w-full'}`} />)}
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 'h-64' }) {
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <Skeleton className="h-5 w-48" />
      <Skeleton className={`mt-4 w-full ${height}`} />
    </div>
  );
}

// Screen readers get one announcement instead of many empty boxes.
export function LoadingRegion({ label = 'Loading', children }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}
