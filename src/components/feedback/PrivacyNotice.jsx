import { Lock } from 'lucide-react';

// Shown whenever the server withholds detail because too few students responded.
export default function PrivacyNotice({ count, threshold = 5, compact = false }) {
  const message = `Detailed feedback is unavailable because there are fewer than ${threshold} responses. This threshold helps protect student anonymity.`;

  if (compact) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
        <Lock className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
        Detailed feedback is hidden to protect student anonymity.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-xl bg-white px-6 py-12 text-center ring-1 ring-slate-200">
      <div className="rounded-full bg-brand-50 p-3">
        <Lock className="size-6 text-brand-700" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">Detailed feedback is hidden to protect student anonymity</h3>
      <p className="mt-1 max-w-lg text-sm text-slate-600">{message}</p>
      {count != null && (
        <p className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {count} of {threshold} minimum responses received
        </p>
      )}
    </div>
  );
}
