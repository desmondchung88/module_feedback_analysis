import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useAuth } from './auth/useAuth.js';
import RequireRole from './auth/RequireRole.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import { HOME_PATH_BY_ROLE } from './utils/constants.js';
import LoginPage from './pages/LoginPage.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Each portal is its own chunk: students never download the charting library.
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard.jsx'));
const FeedbackSubmissionPage = lazy(() => import('./pages/student/FeedbackSubmissionPage.jsx'));
const LecturerDashboard = lazy(() => import('./pages/lecturer/LecturerDashboard.jsx'));
const ModuleAnalyticsPage = lazy(() => import('./pages/lecturer/ModuleAnalyticsPage.jsx'));
const ThemeDetailPage = lazy(() => import('./pages/lecturer/ThemeDetailPage.jsx'));
const FeedbackExplorerPage = lazy(() => import('./pages/lecturer/FeedbackExplorerPage.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? HOME_PATH_BY_ROLE[user.role] : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<RequireRole />}>
        <Route element={<AppLayout />}>
          <Route element={<RequireRole roles={['student']} />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/modules/:moduleId/feedback" element={<FeedbackSubmissionPage />} />
          </Route>

          <Route element={<RequireRole roles={['lecturer']} />}>
            <Route path="/lecturer" element={<LecturerDashboard />} />
            <Route path="/lecturer/modules/:moduleId" element={<ModuleAnalyticsPage />} />
            <Route path="/lecturer/modules/:moduleId/themes/:themeId" element={<ThemeDetailPage />} />
            <Route path="/lecturer/explorer" element={<FeedbackExplorerPage />} />
          </Route>

          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
