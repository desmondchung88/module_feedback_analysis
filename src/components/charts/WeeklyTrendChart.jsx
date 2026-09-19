import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { SENTIMENTS, SENTIMENT_META } from '../../utils/constants.js';
import ChartTooltip from './ChartTooltip.jsx';

// Comments per teaching week, one line per sentiment (or just the selected one).
export default function WeeklyTrendChart({ data, sentiment, highlightWeek, currentWeek }) {
  const series = sentiment ? [sentiment] : SENTIMENTS;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 22, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false}
            label={{ value: 'Comments', angle: -90, position: 'insideLeft', offset: 24, style: { fontSize: 12, fill: '#64748b' } }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend itemSorter={null} formatter={(key) => SENTIMENT_META[key]?.label ?? key} wrapperStyle={{ fontSize: 12 }} />
          {currentWeek && (
            <ReferenceLine x={`W${currentWeek}`} stroke="#94a3b8" strokeDasharray="4 4"
              label={{ value: 'Now', position: 'top', fontSize: 11, fill: '#64748b' }} />
          )}
          {highlightWeek && (
            <ReferenceLine x={`W${highlightWeek}`} stroke="#2657c1" strokeWidth={2}
              label={{ value: 'Selected', position: 'insideTopRight', fontSize: 11, fill: '#2657c1' }} />
          )}
          {series.map((s) => (
            <Line key={s} type="linear" dataKey={s} stroke={SENTIMENT_META[s].color} strokeWidth={2.5}
              dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
