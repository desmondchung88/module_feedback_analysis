import { useParams } from 'react-router';
import { ArrowDownRight, ArrowUpRight, MessagesSquare, Minus, Search } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync.js';
import { getThemeDetail } from '../../services/analyticsService.js';
import { formatPct } from '../../utils/format.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import KpiCard from '../../components/ui/KpiCard.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { TrendBadge } from '../../components/ui/Badges.jsx';
import { ChartSkeleton, KpiSkeletonRow, LoadingRegion } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/States.jsx';
import { ApiErrorView } from '../../components/ui/StatusViews.jsx';
import WeeklySentimentBars from '../../components/charts/WeeklySentimentBars.jsx';
import FeedbackCard from '../../components/feedback/FeedbackCard.jsx';
import PrivacyNotice from '../../components/feedback/PrivacyNotice.jsx';

const TREND_ICON = { increasing: ArrowUpRight, improving: ArrowDownRight, stable: Minus };
const TREND_ACCENT = { increasing: 'red', improving: 'green', stable: 'navy' };

export default function ThemeDetailPage() {
  const { moduleId, themeId } = useParams();
  const { data, error, isInitialLoading, retry } = useAsync(() => getThemeDetail(moduleId, themeId), [moduleId, themeId]);

  const crumbs = (d) => [
    { label: 'My Modules', to: '/lecturer' },
    { label: d?.module.code ?? moduleId, to: `/lecturer/modules/${moduleId}` },
    { label: d?.theme.name ?? 'Theme' },
  ];

  if (error) {
    return (
      <>
        <PageHeader breadcrumbs={crumbs(null)} title="Theme detail" />
        <ApiErrorView error={error} onRetry={retry} title="Unable to load feedback." />
      </>
    );
  }

  if (isInitialLoading) {
    return (
      <>
        <PageHeader breadcrumbs={crumbs(null)} title="Theme detail" subtitle="Loading…" />
        <LoadingRegion label="Loading theme analytics">
          <div className="space-y-6">
            <KpiSkeletonRow count={3} />
            <ChartSkeleton />
          </div>
        </LoadingRegion>
      </>
    );
  }

  const header = (
    <PageHeader
      breadcrumbs={crumbs(data)}
      title={data.theme.name}
      subtitle={`${data.module.code} – ${data.module.name}`}
      actions={!data.suppressed && !data.empty && (
        <Button variant="secondary" icon={Search} to={`/lecturer/explorer?module=${moduleId}&theme=${themeId}`}>View all comments</Button>
      )}
    />
  );

  if (data.empty) {
    return (
      <>
        {header}
        <Card><EmptyState title="No feedback for this theme" message="No feedback has been submitted about this theme for this module yet." /></Card>
      </>
    );
  }

  if (data.suppressed) {
    return (
      <>
        {header}
        <PrivacyNotice count={data.responseCount} threshold={data.threshold} />
      </>
    );
  }

  const { sentiment, trend } = data;

  return (
    <>
      {header}
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Total feedback" value={`${data.count} comments`} icon={MessagesSquare}
            detail={`${sentiment.counts.positive} positive · ${sentiment.counts.neutral} neutral · ${sentiment.counts.negative} negative`} />
          <KpiCard label="Negative sentiment" value={`${formatPct(sentiment.pcts.negative)} Negative`} accent="red"
            detail={`${formatPct(sentiment.pcts.positive)} positive, ${formatPct(sentiment.pcts.neutral)} neutral`}
            tooltip="Share of comments on this theme that the sentiment model classified as negative." />
          <KpiCard label="Trend" value={<span className="flex items-center gap-2"><TrendBadge direction={trend.direction} /></span>}
            accent={TREND_ACCENT[trend.direction]} icon={TREND_ICON[trend.direction]} detail={trend.description}
            tooltip="Finds the week where negative sentiment changed most, and reports it only if the change is large and unlikely to be noise." />
        </div>

        {trend.direction !== 'stable' && (
          <p className={`rounded-lg px-4 py-3 text-sm font-medium ${trend.direction === 'increasing' ? 'bg-negative-soft text-negative-ink' : 'bg-positive-soft text-positive-ink'}`}>
            {trend.description}.
            {trend.direction === 'increasing' && ' Review the comments below to see what changed.'}
          </p>
        )}

        <Card>
          <CardHeader
            title="Weekly sentiment trend"
            description={`Positive, neutral and negative comments per teaching week, up to Week ${data.currentWeek}`}
            tooltip="Each bar is one teaching week. The dashed line marks the week where the trend change was detected."
          />
          <div className="p-4 sm:p-5">
            <WeeklySentimentBars data={data.weekly} markWeek={trend.sinceWeek} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Representative feedback"
            description="The most confidently classified comments, in proportion to sentiment. Student identities are never shown."
          />
          <div className="grid gap-3 p-5 md:grid-cols-2">
            {data.comments.map((c) => <FeedbackCard key={c.feedbackId} item={c} />)}
          </div>
        </Card>
      </div>
    </>
  );
}
