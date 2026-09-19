// UI-level route guard. This only decides what to RENDER; it is not security.
// Every protected endpoint independently checks the caller's role and module
// access on the server (see src/mock/policies.js), and the UI shows the 403
// view when the server refuses.
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './useAuth.js';
import ForbiddenPage from '../pages/ForbiddenPage.jsx';

export default function RequireRole({ roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) {
    return <ForbiddenPage title="403 – You do not have permission to access this page." message="Your account role does not have access to this area." />;
  }
  return <Outlet />;
}
