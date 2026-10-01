import { useEffect, useRef, useState } from 'react';
import { Bug, ChevronDown, LogOut, Menu, RotateCcw } from 'lucide-react';
import { useAuth } from '../../auth/useAuth.js';
import { ROLE_LABEL } from '../../auth/navigation.js';
import { config } from '../../config.js';
import { getDevSettings, setDevSettings } from '../../mock/devSettings.js';
import { isSeedEnabled, setSeedEnabled } from '../../mock/db.js';

function initials(name) {
  return name.split(' ').filter(Boolean).slice(-2).map((p) => p[0]).join('').toUpperCase();
}

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [simulateErrors, setSimulateErrors] = useState(() => getDevSettings().simulateErrors);
  const [seedOn, setSeedOn] = useState(() => isSeedEnabled());
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (e.key === 'Escape' || (e.type === 'mousedown' && !menuRef.current?.contains(e.target))) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  const toggleErrors = () => {
    const next = setDevSettings({ simulateErrors: !simulateErrors });
    setSimulateErrors(next.simulateErrors);
  };

  // Loaded on demand so mock data never ships in a build that talks to a real API.
  const resetData = async () => {
    const { resetMockDb } = await import('../../mock/db.js');
    resetMockDb();
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button type="button" onClick={onMenuClick} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation">
        <Menu className="size-5" aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        {simulateErrors && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-negative-soft px-2.5 py-1 text-xs font-medium text-negative-ink">
            <Bug className="size-3.5" aria-hidden /> Simulating API errors
          </span>
        )}
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2 hover:bg-slate-100"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Account menu for ${user.name}`}
        >
          <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700" aria-hidden>
            {initials(user.name)}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-medium text-slate-900">{user.name}</span>
            <span className="block text-xs text-slate-500">{ROLE_LABEL[user.role]}</span>
          </span>
          <ChevronDown className="size-4 text-slate-400" aria-hidden />
        </button>

        {menuOpen && (
          <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>

            {config.apiMode === 'mock' && (
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Developer tools</p>
                <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-700">
                  Synthetic demo data
                  <input
                    type="checkbox"
                    checked={seedOn}
                    onChange={() => { setSeedEnabled(!seedOn); setSeedOn(!seedOn); window.location.reload(); }}
                    className="size-4 accent-navy-900"
                  />
                </label>
                <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-700">
                  Simulate API errors
                  <input type="checkbox" checked={simulateErrors} onChange={toggleErrors} className="size-4 accent-navy-900" />
                </label>
                <button type="button" role="menuitem" onClick={resetData} className="mt-2 flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900">
                  <RotateCcw className="size-4" aria-hidden /> Reset demo submissions
                </button>
              </div>
            )}

            <button type="button" role="menuitem" onClick={logout} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
