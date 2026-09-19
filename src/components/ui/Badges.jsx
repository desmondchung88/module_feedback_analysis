import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { SENTIMENT_META } from '../../utils/constants.js';

const TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-brand-50 text-brand-700 ring-brand-100',
  green: 'bg-positive-soft text-positive-ink ring-positive/20',
  amber: 'bg-neutral-soft text-neutral-ink ring-neutral/25',
  red: 'bg-negative-soft text-negative-ink ring-negative/20',
  navy: 'bg-navy-900 text-white ring-navy-900',
};

export function Badge({ tone = 'slate', icon: Icon, children, className = '', title }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}>
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}

const SENTIMENT_TONE = { positive: 'green', neutral: 'amber', negative: 'red' };

export function SentimentBadge({ sentiment }) {
  return <Badge tone={SENTIMENT_TONE[sentiment]}>{SENTIMENT_META[sentiment].label}</Badge>;
}

// "Increasing" refers to NEGATIVE sentiment, so it is shown as a warning.
const TREND = {
  increasing: { tone: 'red', icon: ArrowUpRight, label: 'Increasing', title: 'Negative feedback is increasing' },
  improving: { tone: 'green', icon: ArrowDownRight, label: 'Improving', title: 'Negative feedback is decreasing' },
  stable: { tone: 'slate', icon: Minus, label: 'Stable', title: 'No significant change' },
};

export function TrendBadge({ direction }) {
  const t = TREND[direction] ?? TREND.stable;
  return <Badge tone={t.tone} icon={t.icon} title={t.title}>{t.label}</Badge>;
}

const FEEDBACK_STATUS = {
  available: { tone: 'blue', label: 'Feedback Available' },
  submitted: { tone: 'green', label: 'Submitted' },
  closed: { tone: 'slate', label: 'Closed' },
  upcoming: { tone: 'amber', label: 'Opens Soon' },
  none: { tone: 'slate', label: 'No Feedback Period' },
};

export function FeedbackStatusBadge({ status }) {
  const s = FEEDBACK_STATUS[status] ?? FEEDBACK_STATUS.none;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const PERIOD_STATUS = {
  open: { tone: 'green', label: 'Open' },
  closed: { tone: 'slate', label: 'Closed' },
  upcoming: { tone: 'amber', label: 'Upcoming' },
  none: { tone: 'slate', label: 'Not scheduled' },
};

export function PeriodStatusBadge({ status }) {
  const s = PERIOD_STATUS[status] ?? PERIOD_STATUS.none;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
