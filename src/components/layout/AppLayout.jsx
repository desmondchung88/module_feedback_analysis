import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { CardSkeleton, LoadingRegion } from '../ui/Skeleton.jsx';

export default function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer after navigating.
  useEffect(() => setNavOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-h-screen flex-col">
        <Header onMenuClick={() => setNavOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<LoadingRegion label="Loading page"><CardSkeleton lines={4} /></LoadingRegion>}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-400 sm:px-6">
          Module Feedback Insight · Prototype running on mock data · Feedback is anonymous and shown in aggregate
        </footer>
      </div>
    </div>
  );
}
