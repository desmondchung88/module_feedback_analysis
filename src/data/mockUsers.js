// Mirrors the future `users` table. All people here are fictional.
// Students never appear in lecturer-facing data; only their own portal uses them.
export const users = [
  { userId: 'U-STU-001', email: 'student@example.edu', name: 'Jamie Ong', role: 'student' },
  { userId: 'U-LEC-A', email: 'lecturer@example.edu', name: 'Dr Alicia Tan', role: 'lecturer' },
  { userId: 'U-LEC-B', email: 'lecturer.b@example.edu', name: 'Dr Marcus Lim', role: 'lecturer' },
  { userId: 'U-LEC-C', email: 'lecturer.c@example.edu', name: 'Dr Priya Nair', role: 'lecturer' },
  { userId: 'U-LEC-D', email: 'lecturer.d@example.edu', name: 'Mr Daniel Wong', role: 'lecturer' },
  { userId: 'U-LEC-E', email: 'lecturer.e@example.edu', name: 'Dr Sarah Koh', role: 'lecturer' },
  { userId: 'U-ADM-001', email: 'admin@example.edu', name: 'Faculty Admin', role: 'admin' },
];

// Shown on the login page's development-only account picker.
export const demoAccounts = [
  { email: 'student@example.edu', role: 'student', label: 'Student', hint: 'Jamie Ong · 4 enrolled modules' },
  { email: 'lecturer@example.edu', role: 'lecturer', label: 'Lecturer A', hint: 'Dr Alicia Tan · INF2001, INF2003' },
  { email: 'lecturer.b@example.edu', role: 'lecturer', label: 'Lecturer B', hint: 'Dr Marcus Lim · BAC2005' },
  { email: 'lecturer.c@example.edu', role: 'lecturer', label: 'Lecturer C', hint: 'Dr Priya Nair · INF2006, INF2002' },
  { email: 'lecturer.d@example.edu', role: 'lecturer', label: 'Lecturer D', hint: 'Mr Daniel Wong · MAT1001, ENG2002' },
  { email: 'lecturer.e@example.edu', role: 'lecturer', label: 'Lecturer E', hint: 'Dr Sarah Koh · CSC3005 (3 responses)' },
  { email: 'admin@example.edu', role: 'admin', label: 'Admin', hint: 'Faculty Admin · all modules' },
];

// Institution-wide student headcount (future: SELECT COUNT(*) FROM users WHERE role = 'student').
export const STUDENT_POPULATION = 612;
