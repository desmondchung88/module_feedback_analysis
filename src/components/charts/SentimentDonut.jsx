import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { SENTIMENTS, SENTIMENT_META } from '../../utils/constants.js';
import { formatPct } from '../../utils/format.js';

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: row } = payload[0];
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200">
      <p className="font-semibold text-slate-900">{name}</p>
      <p className="text-slate-600">{value} comments · {formatPct(row.pct)}</p>
    </div>
  );
}

export default function SentimentDonut({ summary }) {
  const data = SENTIMENTS.map((s) => ({
    key: s,
    name: SENTIMENT_META[s].label,
    value: summary.counts[s],
    pct: summary.pcts[s],
  }));

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none" isAnimationActive={false}>
              {data.map((d) => <Cell key={d.key} fill={SENTIMENT_META[d.key].color} />)}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-slate-900">{summary.total}</span>
          <span className="text-xs text-slate-500">responses</span>
        </div>
      </div>

      <ul className="w-full max-w-56 space-y-3" aria-label="Sentiment breakdown">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-slate-700">
              <span className="size-3 rounded-sm" style={{ background: SENTIMENT_META[d.key].color }} aria-hidden />
              {d.name}
            </span>
            <span className="tabular-nums text-slate-900">
              <span className="font-semibold">{formatPct(d.pct)}</span>
              <span className="ml-2 text-slate-400">({d.value})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
