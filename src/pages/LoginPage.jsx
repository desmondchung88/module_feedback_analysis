import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff, FlaskConical, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/useAuth.js';
import { config } from '../config.js';
import { demoAccounts } from '../data/mockUsers.js';
import { HOME_PATH_BY_ROLE } from '../utils/constants.js';
import { isValidEmail } from '../utils/validation.js';
import Button from '../components/ui/Button.jsx';
import Logo from '../components/layout/Logo.jsx';

const ROLE_GROUPS = [
  { role: 'student', label: 'Student' },
  { role: 'lecturer', label: 'Lecturer' },
  { role: 'admin', label: 'Admin' },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [demoRole, setDemoRole] = useState('lecturer');

  if (user) return <Navigate to={HOME_PATH_BY_ROLE[user.role]} replace />;

  // The demo account picker exists only in development or mock mode.
  const showDemo = config.isDev || config.apiMode === 'mock';
  const sessionExpired = location.state?.expired;

  const signInWith = async (emailValue, passwordValue) => {
    const nextErrors = {};
    if (!isValidEmail(emailValue.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!passwordValue) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const signedIn = await login(emailValue.trim(), passwordValue);
      const from = location.state?.from;
      const home = HOME_PATH_BY_ROLE[signedIn.role];
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setErrors({ form: err.message });
      setSubmitting(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    signInWith(email, password);
  };

  const signInAsDemo = (account) => {
    setEmail(account.email);
    setPassword('demo-password');
    signInWith(account.email, 'demo-password');
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-navy-900 p-12 text-white lg:flex">
        <Logo inverted size="lg" />
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Turn module feedback into clear, actionable insight.</h2>
          <p className="mt-4 text-slate-300">
            Students share feedback anonymously. Lecturers see themes, sentiment and weekly trends, so issues surface while there is still time to fix them.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden /> Student identities are never shown to lecturers.</li>
            <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden /> Modules and themes with fewer than 5 responses stay hidden.</li>
            <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden /> Lecturers only see modules they teach.</li>
          </ul>
        </div>
        <p className="text-xs text-slate-400">Prototype · mock data only</p>
      </div>

      <div className="flex items-center justify-center bg-white px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden"><Logo size="lg" /></div>
          <h1 className="mt-8 text-2xl font-semibold text-slate-900 lg:mt-0">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Use your university account to continue.</p>

          {sessionExpired && (
            <p className="mt-4 rounded-lg bg-neutral-soft px-3 py-2 text-sm text-neutral-ink">Your session has expired. Please sign in again.</p>
          )}
          {errors.form && (
            <p role="alert" className="mt-4 rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative-ink">{errors.form}</p>
          )}

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                placeholder="name@example.edu"
                className="h-11 w-full rounded-lg px-3 text-sm ring-1 ring-slate-300 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 aria-invalid:ring-negative"
              />
              {errors.email && <p id="email-error" className="mt-1 text-xs text-negative-ink">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className="h-11 w-full rounded-lg pl-3 pr-11 text-sm ring-1 ring-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 aria-invalid:ring-negative"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
              {errors.password && <p id="password-error" className="mt-1 text-xs text-negative-ink">{errors.password}</p>}
            </div>

            <Button type="submit" size="lg" className="w-full" loading={submitting} icon={LockKeyhole}>
              Sign In
            </Button>
          </form>

          {showDemo && (
            <div className="mt-8 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <FlaskConical className="size-4" aria-hidden /> Development only: demo accounts
              </p>
              <p className="mt-1 text-xs text-amber-900/80">No real authentication yet. Any password works for these accounts.</p>

              <div role="tablist" aria-label="Demo role" className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-white p-1 ring-1 ring-amber-200">
                {ROLE_GROUPS.map((g) => (
                  <button
                    key={g.role}
                    type="button"
                    role="tab"
                    aria-selected={demoRole === g.role}
                    onClick={() => setDemoRole(g.role)}
                    className={`rounded-md py-1.5 text-sm font-medium ${demoRole === g.role ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <ul className="mt-3 space-y-2">
                {demoAccounts.filter((a) => a.role === demoRole).map((account) => (
                  <li key={account.email}>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => signInAsDemo(account)}
                      aria-label={`Sign in as ${account.label}, ${account.email}`}
                      className="flex w-full items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-left ring-1 ring-slate-200 hover:ring-navy-700 disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">{account.label}</span>
                        <span className="block truncate text-xs text-slate-500">{account.email} · {account.hint}</span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-brand-700">Sign in →</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
