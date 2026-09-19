// University logo placeholder: swap the mark and name for the institution's own.
export default function Logo({ inverted = false, size = 'md' }) {
  const mark = size === 'lg' ? 'size-11 text-lg' : 'size-9 text-sm';
  return (
    <div className="flex items-center gap-2.5">
      <div className={`grid place-items-center rounded-lg font-bold ${mark} ${inverted ? 'bg-white text-navy-900' : 'bg-navy-900 text-white'}`} aria-hidden>
        MF
      </div>
      <div className="leading-tight">
        <p className={`text-sm font-semibold ${inverted ? 'text-white' : 'text-slate-900'}`}>Feedback Insight</p>
        <p className={`text-xs ${inverted ? 'text-slate-400' : 'text-slate-500'}`}>University Portal</p>
      </div>
    </div>
  );
}
