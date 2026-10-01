import { Link } from 'react-router';
import { ArrowRight, Inbox, Lock, MessagesSquare } from 'lucide-react';
import { useAuth } from '../../auth/useAuth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { getModules } from '../../services/moduleService.js';
import { formatDate, formatPct } from '../../utils/format.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge, PeriodStatusBadge } from '../../components/ui/Badges.jsx';
import { CardSkeleton, LoadingRegion } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/States.jsx';
import { ApiErrorView } from '../../components/ui/StatusViews.jsx';

function ModuleSummary({ module }) {
  if (module.responseCount === 0) {
    return <p className="flex items-center gap-2 text-sm text-slate-500"><Inbox className="size-4" aria-hidden /> No feedback has been submitted for this module yet.</p>;
  }
  if (module.belowThreshold) {
    return <p className="flex items-center gap-2 text-sm text-slate-500"><Lock className="size-4" aria-hidden /> Fewer than 5 responses: details hidden to protect anonymity.</p>;
  }
  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Positive {formatPct(module.positivePct)}</span>
          <span>Negative {formatPct(module.negativePct)}</span>
        </div>
        <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-neutral" aria-hidden>
          <span className="bg-positive" style={{ width: `${module.positivePct}%` }} />
          <span className="ml-auto bg-negative" style={{ width: `${module.negativePct}%` }} />
        </div>
      </div>
      {module.topTheme && (
        <p className="text-sm text-slate-600">
          Most discussed: <span className="font-medium text-slate-900">{module.topTheme.name}</span>
        </p>
      )}
    </div>
  );
}

export default function LecturerDashboard() {
  const { user } = useAuth();
  const { data, error, isInitialLoading, retry } = useAsync(getModules, []);
  const totalResponses = data?.reduce((sum, m) => sum + m.responseCount, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="My Modules"
        subtitle={data ? `${user.name} · ${data.length} module${data.length === 1 ? '' : 's'} · ${totalResponses} feedback responses this trimester` : `${user.name}`}
      />

      {isInitialLoading && (
        <LoadingRegion label="Loading your modules">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => <CardSkeleton key={i} lines={4} />)}
          </div>
        </LoadingRegion>
      )}

      {error && <ApiErrorView error={error} onRetry={retry} title="Unable to load your modules." />}

      {data && data.length === 0 && (
        <Card>
          <EmptyState
            title="No feedback data loaded"
            message="Import a CSV of student comments to populate these dashboards, or switch on the synthetic demo data from the account menu."
            action={<Button to="/lecturer/import">Import a CSV</Button>}
          />
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((m) => (
            <Link
              key={m.moduleId}
              to={`/lecturer/modules/${m.moduleId}`}
              className="group flex flex-col rounded-xl bg-white p-5 ring-1 ring-slate-200 shadow-sm transition-shadow hover:shadow-md hover:ring-brand-500/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-700">{m.code}</p>
                  <h2 className="mt-0.5 text-lg font-semibold text-slate-900">{m.name}</h2>
                </div>
                <PeriodStatusBadge status={m.periodStatus} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <Badge tone="slate" icon={MessagesSquare}>{m.responseCount} responses</Badge>
                {m.lastUpdated && <span className="text-xs text-slate-500">Updated {formatDate(m.lastUpdated)}</span>}
              </div>

              <div className="mt-4 flex-1">
                <ModuleSummary module={m} />
              </div>

              <p className="mt-5 flex items-center gap-1 border-t border-slate-100 pt-4 text-sm font-medium text-brand-700">
                Open analytics
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
