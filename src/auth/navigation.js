// Which navigation items each role sees. Hiding a link is a UX choice only;
// the server still rejects requests a role is not allowed to make.
import { BookOpen, LayoutDashboard, MessageSquareText, Search, Upload } from 'lucide-react';

export const NAV_BY_ROLE = {
  student: [
    { to: '/student', label: 'My Modules', icon: BookOpen, end: true },
  ],
  lecturer: [
    { to: '/lecturer', label: 'My Modules', icon: LayoutDashboard, end: true },
    { to: '/lecturer/explorer', label: 'Feedback Explorer', icon: Search },
    { to: '/lecturer/import', label: 'Import & Analyse', icon: Upload },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  ],
};

export const ROLE_LABEL = { student: 'Student', lecturer: 'Lecturer', admin: 'Administrator' };

export const PORTAL_ICON = MessageSquareText;
