import { CalendarDays, Tag } from 'lucide-react';
import { SentimentBadge } from '../ui/Badges.jsx';

const BORDER = { positive: 'border-l-positive', neutral: 'border-l-neutral', negative: 'border-l-negative' };

// A single anonymous comment. The API never returns who wrote it, so there is
// nothing identifying to render even by accident.
export default function FeedbackCard({ item, showModule = false }) {
  return (
    <article className={`rounded-lg border-l-4 bg-white p-4 ring-1 ring-slate-200 ${BORDER[item.sentiment]}`}>
      <p className="text-sm leading-relaxed text-slate-800">&ldquo;{item.comment}&rdquo;</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        <SentimentBadge sentiment={item.sentiment} />
        <span className="flex items-center gap-1">
          <Tag className="size-3.5" aria-hidden />
          {item.theme}
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="size-3.5" aria-hidden />
          Week {item.week}
        </span>
        {showModule && item.moduleCode && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{item.moduleCode}</span>
        )}
      </div>
    </article>
  );
}
