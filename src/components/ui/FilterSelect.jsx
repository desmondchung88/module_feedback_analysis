import { useId } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FilterSelect({ label, value, onChange, options, allLabel, className = '' }) {
  const id = useId();
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none truncate rounded-lg bg-white pl-3 pr-9 text-sm text-slate-800 ring-1 ring-slate-300 hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {allLabel && <option value="">{allLabel}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      </div>
    </div>
  );
}
