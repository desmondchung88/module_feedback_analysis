import { NavLink } from 'react-router';
import { ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../auth/useAuth.js';
import { NAV_BY_ROLE, ROLE_LABEL } from '../../auth/navigation.js';
import Logo from './Logo.jsx';

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const items = NAV_BY_ROLE[user.role] ?? [];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-navy-950/50 lg:hidden ${open ? 'block' : 'hidden'}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 text-slate-200 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo inverted />
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-300 hover:bg-navy-800 lg:hidden" aria-label="Close navigation">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <p className="px-5 pb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {ROLE_LABEL[user.role]} portal
        </p>
        <nav className="flex-1 space-y-1 px-3">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-slate-300">
          <p className="flex items-center gap-1.5 font-medium text-white">
            <ShieldCheck className="size-4 text-positive" aria-hidden />
            Anonymous by design
          </p>
          <p className="mt-1">Student identities are never shown. Modules or themes with fewer than 5 responses stay hidden.</p>
        </div>
      </aside>
    </>
  );
}
