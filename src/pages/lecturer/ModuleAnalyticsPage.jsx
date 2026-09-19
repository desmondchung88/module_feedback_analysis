import { useNavigate, useParams } from 'react-router';
import { CalendarDays, MessagesSquare, Search } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync.js';
import { useQueryFilters } from '../../hooks/useQueryFilters.js';
import { getModuleAnalytics } from '../../services/analyticsService.js';
import { getModules, getThemes } from '../../services/moduleService.js';
import { formatDate, formatPct, pluralise } from '../../utils/format.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import KpiCard from '../../components/ui/KpiCard.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { ChartSkeleton, KpiSkeletonRow, LoadingRegion } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/States.jsx';
import { ApiErrorView } from '../../components/ui/StatusViews.jsx';
import SentimentDonut from '../../components/charts/SentimentDonut.jsx';
import WeeklyTrendChart from '../../components/charts/WeeklyTrendChart.jsx';
import ThemeTable from '../../components/feedback/ThemeTable.jsx';
import FeedbackCard from '../../components/feedback/FeedbackCard.jsx';
import PrivacyNotice from '../../components/feedback/PrivacyNotice.jsx';
import AnalyticsFilterBar from '../../components/feedback/AnalyticsFilterBar.jsx';

const FILTER_KEYS = ['week', 'theme', 'sentiment'];

function AnalyticsSkeleton() {
  return (
    <LoadingRegion label="Loading analytics">
      <div className="space-y-6">
        <KpiSkeletonRow count={5} />
        <div className="grid gap-6 lg:grid-cols-3">
          <ChartSkeleton height="h-52" />
          <div className="lg:col-span-2"><ChartSkeleton height="h-52" /></div>
        </div>
        <ChartSkeleton height="h-40" />
      </div>
    </LoadingRegion>
  );
}

function explorerLink(moduleId, filters) {
  const params = new URLSearchParams({ module: moduleId });
  for (const key of FILTER_KEYS) if (filters[key]) params.set(key, filters[key]);
  return `/lecturer/explorer?${params}`;
}

export default function ModuleAnalyticsPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { filters, setFilter, clearFilters, activeCount } = useQueryFilters(FILTER_KEYS);

  const modules = useAsync(getModules, []);
  const themes = useAsync(getThemes, []);
  const analytics = useAsync(
    () => getModuleAnalytics(moduleId, filters),
    [moduleId, filters.week, filters.theme, filters.sentiment],
  );

  const data = analytics.data;
  const moduleName = data ? `${data.module.code} – ${data.module.name}` : moduleId;
  const breadcrumbs = [{ label: 'My Modules', to: '/lecturer' }, { label: data?.module.code ?? moduleId }];

  if (analytics.error) {
    return (
      <>
        <PageHeader breadcrumbs={breadcrumbs} title={moduleId} />
        <ApiErrorView error={analytics.error} onRetry={analytics.retry} title="Unable to load feedback." />
      </>
    );
  }

  if (analytics.isInitialLoading) {
    return (
      <>
        <PageHeader breadcrumbs={breadcrumbs} title={moduleId} subtitle="Loading module analytics…" />
        <AnalyticsSkeleton />
      </>
    );
  }

  const header = (
    <PageHeader
      breadcrumbs={breadcrumbs}
      title={moduleName}
      subtitle={data.module.semester}
      meta={(
        <>
          <span className="flex items-center gap-1.5"><MessagesSquare className="size-4 text-slate-400" aria-hidden /> {data.responseCount} feedback responses</span>
          {data.lastUpdated && <span className="flex items-center gap-1.5"><CalendarDays className="size-4 text-slate-400" aria-hidden /> Latest feedback {formatDate(data.lastUpdated)}</span>}
          <span className="text-slate-400">Week {data.currentWeek} of {data.totalWeeks}</span>
        </>
      )}
      actions={data.responseCount >= data.threshold && (
        <Button variant="secondary" icon={Search} to={explorerLink(moduleId, filters)}>Browse all feedback</Button>
      )}
    />
  );

  if (data.empty) {
    return (
      <>
        {header}
        <Card>
          <EmptyState title="No feedback yet" message="No feedback has been submitted for this module yet." />
        </Card>
      </>
    );
  }

  if (data.suppressed && data.scope !== 'theme') {
    return (
      <>
        {header}
        <PrivacyNotice count={data.responseCount} threshold={data.threshold} />
      </>
    );
  }

  const weeks = Array.from({ length: data.currentWeek }, (_, i) => i + 1);
  const filterBar = (
    <AnalyticsFilterBar
      modules={modules.data}
      moduleValue={moduleId}
      onModuleChange={(id) => id && navigate(`/lecturer/modules/${id}${window.location.search}`)}
      themes={themes.data ?? []}
      filters={filters}
      setFilter={setFilter}
      weeks={weeks}
      activeCount={activeCount}
      onClear={clearFilters}
      hint="Week and theme filters update every panel. The sentiment filter narrows the weekly trend and the comments."
    />
  );

  if (data.suppressed && data.scope === 'theme') {
    return (
      <>
        {header}
        {filterBar}
        <PrivacyNotice count={data.responseCount} threshold={data.threshold} />
      </>
    );
  }

  const { sentiment, mostDiscussedTheme } = data;
  const filtered = activeCount > 0;

  return (
    <>
      {header}
      {filterBar}

      <div className={`space-y-6 transition-opacity ${analytics.isRefreshing ? 'opacity-60' : ''}`} aria-busy={analytics.isRefreshing}>
        {data.filteredCount === 0 ? (
          <Card>
            <EmptyState
              title="No matching feedback"
              message="No feedback matches the selected filters."
              action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
            />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              <KpiCard
                label="Total Responses"
                value={data.filteredCount}
                detail={filtered && data.filteredCount !== data.responseCount ? `of ${data.responseCount} in total` : 'All weeks and themes'}
                icon={MessagesSquare}
                tooltip="Number of comments in the current week and theme selection."
              />
              <KpiCard label="Positive" value={formatPct(sentiment.pcts.positive)} detail={pluralise(sentiment.counts.positive, 'comment')} accent="green"
                tooltip="Share of comments classified as positive by the sentiment model." />
              <KpiCard label="Neutral" value={formatPct(sentiment.pcts.neutral)} detail={pluralise(sentiment.counts.neutral, 'comment')} accent="amber"
                tooltip="Comments that are mixed or factual rather than clearly positive or negative." />
              <KpiCard label="Negative" value={formatPct(sentiment.pcts.negative)} detail={pluralise(sentiment.counts.negative, 'comment')} accent="red"
                tooltip="Share of comments classified as negative. Check the theme table to see what is driving it." />
              <div className="col-span-2 md:col-span-1">
                <KpiCard
                  label="Most Discussed Theme"
                  value={mostDiscussedTheme?.name ?? '—'}
                  detail={mostDiscussedTheme ? pluralise(mostDiscussedTheme.count, 'comment') : 'Not enough data'}
                  accent="blue"
                  tooltip="The theme with the most comments in this selection. Themes come from the theme classification model."
                />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader title="Sentiment overview" tooltip="Sentiment is assigned per comment by the classification service. Percentages round to whole numbers." />
                <div className="p-5"><SentimentDonut summary={sentiment} /></div>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader
                  title="Weekly feedback trends"
                  description={`Comments per teaching week${filters.theme ? ' for the selected theme' : ''}`}
                  tooltip="Lines stop at the current teaching week. Use the sentiment filter to isolate one line."
                />
                <div className="p-4 sm:p-5">
                  <WeeklyTrendChart data={data.weekly} sentiment={filters.sentiment || null} highlightWeek={filters.week ? Number(filters.week) : null} currentWeek={data.currentWeek} />
                </div>
              </Card>
            </div>
          </>
        )}

        <Card>
          <CardHeader
            title="Theme analysis"
            description={filters.week ? `Week ${filters.week} only · select a theme for weekly detail` : 'All weeks · select a theme for weekly detail'}
            tooltip="Trend compares negative sentiment before and after the week with the biggest change, and only flags changes unlikely to be noise. Increasing means negative feedback is growing."
          />
          {data.themes.length ? (
            <ThemeTable rows={data.themes} moduleId={moduleId} selectedThemeId={filters.theme} />
          ) : (
            <EmptyState title="No themes" message="No feedback matches the selected filters." />
          )}
        </Card>

        {data.filteredCount > 0 && (
          <Card>
            <CardHeader
              title="Representative feedback"
              description={`${data.commentCount} matching comments · most confidently classified shown`}
              tooltip="Comments are chosen in proportion to sentiment. Student identities are never stored with comments."
              actions={<Button variant="subtle" size="sm" to={explorerLink(moduleId, filters)}>View all</Button>}
            />
            <div className="p-5">
              {data.comments.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {data.comments.map((c) => <FeedbackCard key={c.feedbackId} item={c} />)}
                </div>
              ) : (
                <EmptyState title="No comments to show" message="No feedback matches the selected filters." />
              )}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
