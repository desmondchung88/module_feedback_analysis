import { BookOpen, CalendarClock, GraduationCap, MessagesSquare, ShieldCheck, Users } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync.js';
import { getAdminOverview } from '../../services/adminService.js';
import { formatDate } from '../../utils/format.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import KpiCard from '../../components/ui/KpiCard.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { PeriodStatusBadge } from '../../components/ui/Badges.jsx';
import { ChartSkeleton, KpiSkeletonRow, LoadingRegion } from '../../components/ui/Skeleton.jsx';
import { ApiErrorView } from '../../components/ui/StatusViews.jsx';

export default function AdminDashboard() {
  const { data, error, isInitialLoading, retry } = useAsync(getAdminOverview, []);

  return (
    <>
      <PageHeader title="Administration overview" subtitle="Feedback participation across all modules this trimester" />

      {isInitialLoading && (
        <LoadingRegion label="Loading overview">
          <div className="space-y-6"><KpiSkeletonRow count={5} /><ChartSkeleton height="h-72" /></div>
        </LoadingRegion>
      )}

      {error && <ApiErrorView error={error} onRetry={retry} title="Unable to load the overview." />}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <KpiCard label="Total Modules" value={data.totals.modules} icon={BookOpen} />
            <KpiCard label="Total Lecturers" value={data.totals.lecturers} icon={Users} accent="blue" />
            <KpiCard label="Total Students" value={data.totals.students} icon={GraduationCap} accent="blue" />
            <KpiCard label="Feedback Responses" value={data.totals.responses} icon={MessagesSquare} accent="green" />
            <KpiCard label="Active Feedback Periods" value={data.totals.activePeriods} icon={CalendarClock} accent="amber"
              tooltip="Feedback periods that are currently open for student submissions." />
          </div>

          <p className="flex items-start gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700 ring-1 ring-brand-100">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            Administrators see participation figures only. Comment text and sentiment are visible only to each module&rsquo;s own lecturers (least privilege).
          </p>

          <Card>
            <CardHeader title="Modules" description={`${data.modules.length} modules`} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">All modules with lecturer, enrolment, responses and feedback period status</caption>
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-5 py-3">Module Code</th>
                    <th scope="col" className="px-3 py-3">Module Name</th>
                    <th scope="col" className="px-3 py-3">Lecturer</th>
                    <th scope="col" className="px-3 py-3 text-right">Students</th>
                    <th scope="col" className="px-3 py-3 text-right">Feedback Responses</th>
                    <th scope="col" className="px-3 py-3 text-right">Response Rate</th>
                    <th scope="col" className="px-3 py-3">Status</th>
                    <th scope="col" className="px-5 py-3">Closes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.modules.map((m) => (
                    <tr key={m.moduleId} className="hover:bg-slate-50">
                      <th scope="row" className="px-5 py-3 font-semibold text-brand-700">{m.code}</th>
                      <td className="px-3 py-3 text-slate-900">{m.name}</td>
                      <td className="px-3 py-3 text-slate-600">{m.lecturers.join(', ')}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{m.enrolmentCount}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{m.responseCount}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                        {m.enrolmentCount ? `${Math.round((m.responseCount / m.enrolmentCount) * 100)}%` : '—'}
                      </td>
                      <td className="px-3 py-3"><PeriodStatusBadge status={m.periodStatus} /></td>
                      <td className="px-5 py-3 text-slate-600">{formatDate(m.deadline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
