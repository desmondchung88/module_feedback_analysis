import { FilterX, SlidersHorizontal } from 'lucide-react';
import FilterSelect from '../ui/FilterSelect.jsx';
import Button from '../ui/Button.jsx';
import { SENTIMENTS, SENTIMENT_META } from '../../utils/constants.js';

// Reusable filter bar. Pass only the controls a page needs; each is optional.
export default function AnalyticsFilterBar({
  modules, moduleValue, onModuleChange, moduleAllLabel,
  themes, filters, setFilter, weeks, activeCount, onClear, hint, search,
}) {
  return (
    <div className="mb-6 rounded-xl bg-white p-4 ring-1 ring-slate-200 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <SlidersHorizontal className="size-4 text-slate-500" aria-hidden />
          Filters
          {activeCount > 0 && <span className="rounded-full bg-navy-900 px-2 py-0.5 text-xs font-medium text-white">{activeCount}</span>}
        </p>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" icon={FilterX} onClick={onClear}>Clear filters</Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {search}
        {modules && (
          <FilterSelect
            label="Module"
            className="col-span-2 lg:col-span-1"
            value={moduleValue}
            onChange={onModuleChange}
            allLabel={moduleAllLabel}
            options={modules.map((m) => ({ value: m.moduleId, label: `${m.code} – ${m.name}` }))}
          />
        )}
        <FilterSelect
          label="Teaching week"
          value={filters.week}
          onChange={(v) => setFilter('week', v)}
          allLabel="All weeks"
          options={weeks.map((w) => ({ value: String(w), label: `Week ${w}` }))}
        />
        <FilterSelect
          label="Theme"
          value={filters.theme}
          onChange={(v) => setFilter('theme', v)}
          allLabel="All themes"
          options={themes.map((t) => ({ value: t.themeId, label: t.name }))}
        />
        <FilterSelect
          label="Sentiment"
          className={modules ? 'col-span-2 lg:col-span-1' : ''}
          value={filters.sentiment}
          onChange={(v) => setFilter('sentiment', v)}
          allLabel="All sentiment"
          options={SENTIMENTS.map((s) => ({ value: s, label: SENTIMENT_META[s].label }))}
        />
      </div>
      {hint && <p className="mt-3 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
