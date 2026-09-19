import { CalendarClock, CircleCheckBig, MessageSquarePlus, UserRound } from 'lucide-react';
import { useAuth } from '../../auth/useAuth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { getModules } from '../../services/moduleService.js';
import { formatDate } from '../../utils/format.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { FeedbackStatusBadge } from '../../components/ui/Badges.jsx';
import { CardSkeleton, LoadingRegion } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/States.jsx';
import { ApiErrorView } from '../../components/ui/StatusViews.jsx';

function ModuleCard({ module }) {
  const status = module.feedbackStatus;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-700">{module.code}</p>
          <h2 className="mt-0.5 text-lg font-semibold text-slate-900">{module.name}</h2>
        </div>
        <FeedbackStatusBadge status={status} />
      </div>

      <dl className="mt-4 space-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <dt><UserRound className="size-4 text-slate-400" aria-label="Lecturer" /></dt>
          <dd>{module.lecturers.join(', ')}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt><CalendarClock className="size-4 text-slate-400" aria-label="Deadline" /></dt>
          <dd>{status === 'closed' ? 'Closed on' : 'Submit by'} {formatDate(module.deadline)}</dd>
        </div>
      </dl>

      <div className="mt-5 flex-1 border-t border-slate-100 pt-4">
        {status === 'available' && (
          <Button to={`/student/modules/${module.moduleId}/feedback`} icon={MessageSquarePlus} className="w-full sm:w-auto">
            Give Feedback
          </Button>
        )}
        {status === 'submitted' && (
          <p className="flex items-center gap-2 text-sm text-positive-ink">
            <CircleCheckBig className="size-4" aria-hidden /> Thanks, your feedback has been received.
          </p>
        )}
        {status === 'closed' && <p className="text-sm text-slate-500">The feedback period for this module has ended.</p>}
        {status === 'upcoming' && <p className="text-sm text-slate-500">Feedback for this module opens soon.</p>}
      </div>
    </Card>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, error, isInitialLoading, retry } = useAsync(getModules, []);
  const pending = data?.filter((m) => m.feedbackStatus === 'available').length ?? 0;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(' ')[0]}`}
        subtitle={data?.[0] ? `${data[0].periodName ?? 'Module feedback'} · Week ${data[0].currentWeek} of the trimester` : 'Your enrolled modules'}
      />

      {data && pending > 0 && (
        <div className="mb-6 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700 ring-1 ring-brand-100">
          You have <strong>{pending}</strong> module{pending === 1 ? '' : 's'} waiting for your feedback. It takes about two minutes, and lecturers only ever see it anonymously.
        </div>
      )}

      {isInitialLoading && (
        <LoadingRegion label="Loading your modules">
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} lines={3} />)}
          </div>
        </LoadingRegion>
      )}

      {error && <ApiErrorView error={error} onRetry={retry} title="Unable to load your modules." />}

      {data && data.length === 0 && (
        <Card><EmptyState title="No enrolled modules" message="You are not enrolled in any modules with feedback this trimester." /></Card>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((m) => <ModuleCard key={m.moduleId} module={m} />)}
        </div>
      )}
    </>
  );
}
