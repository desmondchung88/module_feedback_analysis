import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Search } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync.js';
import { useQueryFilters } from '../../hooks/useQueryFilters.js';
import { searchFeedback } from '../../services/feedbackService.js';
import { getModules, getThemes } from '../../services/moduleService.js';
import { TOTAL_WEEKS } from '../../utils/constants.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { CardSkeleton, LoadingRegion } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/States.jsx';
import { ApiErrorView } from '../../components/ui/StatusViews.jsx';
import FeedbackCard from '../../components/feedback/FeedbackCard.jsx';
import PrivacyNotice from '../../components/feedback/PrivacyNotice.jsx';
import AnalyticsFilterBar from '../../components/feedback/AnalyticsFilterBar.jsx';

const KEYS = ['module', 'theme', 'sentiment', 'week', 'q', 'page'];
const WEEKS = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1);

function SearchBox({ value, onChange }) {
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);
  // Debounce so the API is not called on every keystroke.
  useEffect(() => {
    if (text === value) return undefined;
    const timer = setTimeout(() => onChange(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <div className="col-span-2 lg:col-span-4">
      <label htmlFor="feedback-search" className="mb-1 block text-xs font-medium text-slate-500">Search keyword</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id="feedback-search"
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={100}
          placeholder="e.g. lab guide, screenshots, deadline"
          className="h-10 w-full rounded-lg pl-9 pr-3 text-sm ring-1 ring-slate-300 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      </div>
    </div>
  );
}

export default function FeedbackExplorerPage() {
  const { filters, setFilter, clearFilters, activeCount } = useQueryFilters(KEYS);
  const modules = useAsync(getModules, []);
  const themes = useAsync(getThemes, []);
  const results = useAsync(
    () => searchFeedback({ ...filters }),
    [filters.module, filters.theme, filters.sentiment, filters.week, filters.q, filters.page],
  );

  const page = Number(filters.page) || 1;
  const data = results.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader
        title="Feedback Explorer"
        subtitle="Browse anonymous comments across your modules. Student names are never collected with comments."
      />

      <AnalyticsFilterBar
        search={<SearchBox value={filters.q} onChange={(v) => setFilter('q', v)} />}
        modules={modules.data}
        moduleValue={filters.module}
        onModuleChange={(v) => setFilter('module', v)}
        moduleAllLabel="All my modules"
        themes={themes.data ?? []}
        filters={filters}
        setFilter={setFilter}
        weeks={WEEKS}
        activeCount={activeCount}
        onClear={clearFilters}
      />

      {results.isInitialLoading && (
        <LoadingRegion label="Loading feedback">
          <div className="grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <CardSkeleton key={i} lines={2} />)}</div>
        </LoadingRegion>
      )}

      {results.error && <ApiErrorView error={results.error} onRetry={results.retry} title="Unable to load feedback." />}

      {data?.suppressed && <PrivacyNotice count={data.responseCount} threshold={data.threshold} />}

      {data && !data.suppressed && (
        <div className={`transition-opacity ${results.isRefreshing ? 'opacity-60' : ''}`} aria-busy={results.isRefreshing}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <p aria-live="polite">
              <strong className="text-slate-900">{data.total}</strong> comment{data.total === 1 ? '' : 's'} found
            </p>
            {(data.hidden.comments > 0 || data.hidden.modules.length > 0) && (
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Lock className="size-3.5" aria-hidden />
                {data.hidden.modules.length > 0 && `${data.hidden.modules.join(', ')} hidden (fewer than 5 responses). `}
                {data.hidden.comments > 0 && `${data.hidden.comments} comments in small themes hidden.`}
              </p>
            )}
          </div>

          {data.items.length === 0 ? (
            <Card>
              <EmptyState
                title="No results"
                message="No feedback matches the selected filters."
                action={activeCount > 0 && <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
              />
            </Card>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {data.items.map((item) => <FeedbackCard key={item.feedbackId} item={item} showModule={!filters.module} />)}
              </div>

              {totalPages > 1 && (
                <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
                  <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setFilter('page', String(page + 1))}>
                    Next <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
