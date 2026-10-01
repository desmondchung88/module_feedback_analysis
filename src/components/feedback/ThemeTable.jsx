import { Link } from 'react-router';
import { ChevronRight, Lock } from 'lucide-react';
import { TrendBadge } from '../ui/Badges.jsx';
import { SENTIMENTS, SENTIMENT_META } from '../../utils/constants.js';
import { formatPct } from '../../utils/format.js';

function MixBar({ pcts }) {
  return (
    <div className="flex h-2 w-24 overflow-hidden rounded-full bg-slate-100" aria-hidden>
      {SENTIMENTS.map((s) => (
        <span key={s} style={{ width: `${pcts[s]}%`, background: SENTIMENT_META[s].color }} />
      ))}
    </div>
  );
}

export default function ThemeTable({ rows, moduleId, selectedThemeId }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">Feedback themes with comment counts, sentiment split and trend</caption>
        <thead>
          <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
            <th scope="col" className="px-5 py-3">Theme</th>
            <th scope="col" className="px-3 py-3 text-right">Comments</th>
            <th scope="col" className="px-3 py-3 text-right text-positive-ink">Positive</th>
            <th scope="col" className="px-3 py-3 text-right text-neutral-ink">Neutral</th>
            <th scope="col" className="px-3 py-3 text-right text-negative-ink">Negative</th>
            <th scope="col" className="px-3 py-3">Mix</th>
            <th scope="col" className="px-3 py-3">Trend</th>
            <th scope="col" className="px-3 py-3"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const selected = row.themeId === selectedThemeId;
            return (
              <tr key={row.themeId} className={`${selected ? 'bg-brand-50/60' : 'hover:bg-slate-50'}`}>
                <th scope="row" className="px-5 py-3 font-medium text-slate-900">
                  {row.suppressed ? (
                    row.name
                  ) : (
                    <Link to={`/lecturer/modules/${moduleId}/themes/${row.themeId}`} className="hover:text-brand-700 hover:underline">
                      {row.name}
                    </Link>
                  )}
                </th>
                <td className="px-3 py-3 text-right tabular-nums">{row.count}</td>
                {row.suppressed ? (
                  <td colSpan={5} className="px-3 py-3 text-slate-500">
                    <span className="inline-flex items-center gap-1.5 text-xs" title="Fewer than 5 comments: hidden to protect anonymity">
                      <Lock className="size-3.5" aria-hidden /> Fewer than 5 comments, breakdown hidden
                    </span>
                  </td>
                ) : (
                  <>
                    <td className="px-3 py-3 text-right tabular-nums">{formatPct(row.pcts.positive)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatPct(row.pcts.neutral)}</td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">{formatPct(row.pcts.negative)}</td>
                    <td className="px-3 py-3"><MixBar pcts={row.pcts} /></td>
                    <td className="px-3 py-3">{row.trend ? <TrendBadge direction={row.trend.direction} /> : <span className="text-xs text-slate-400">no week data</span>}</td>
                  </>
                )}
                <td className="px-3 py-3 text-right">
                  {!row.suppressed && (
                    <Link to={`/lecturer/modules/${moduleId}/themes/${row.themeId}`} className="inline-flex rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Open ${row.name} details`}>
                      <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
