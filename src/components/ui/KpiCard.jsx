import InfoTooltip from './InfoTooltip.jsx';

const ACCENTS = {
  navy: 'bg-navy-900',
  green: 'bg-positive',
  amber: 'bg-neutral',
  red: 'bg-negative',
  blue: 'bg-brand-500',
};

export default function KpiCard({ label, value, detail, accent = 'navy', tooltip, icon: Icon }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-white p-4 ring-1 ring-slate-200 shadow-sm">
      <span className={`absolute inset-y-0 left-0 w-1 ${ACCENTS[accent]}`} aria-hidden />
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
          {label}
          {tooltip && <InfoTooltip text={tooltip} align="left" />}
        </p>
        {Icon && <Icon className="size-4 text-slate-400" aria-hidden />}
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900" title={typeof value === 'string' ? value : undefined}>
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}
