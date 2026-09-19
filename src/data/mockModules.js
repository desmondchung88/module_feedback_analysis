// Mirrors the future `modules`, `module_lecturers`, `module_students`
// and `feedback_periods` tables. Module codes and names are fictional examples.
export const TERM = { name: 'Trimester 1, AY2026/27', startDate: '2026-08-24', currentWeek: 8 };

export const modules = [
  { moduleId: 'INF2001', code: 'INF2001', name: 'Software Engineering', semester: TERM.name, enrolmentCount: 142, topics: ['UML diagrams', 'sprint planning', 'unit testing', 'design patterns'] },
  { moduleId: 'INF2003', code: 'INF2003', name: 'Database Systems', semester: TERM.name, enrolmentCount: 156, topics: ['SQL joins', 'normalisation', 'indexing', 'transactions', 'stored procedures'] },
  { moduleId: 'BAC2005', code: 'BAC2005', name: 'Finance', semester: TERM.name, enrolmentCount: 118, topics: ['discounted cash flow', 'ratio analysis', 'capital budgeting', 'bond valuation'] },
  { moduleId: 'INF2006', code: 'INF2006', name: 'Cloud Computing & Big Data', semester: TERM.name, enrolmentCount: 134, topics: ['EC2', 'load balancing', 'auto scaling', 'Docker containers'] },
  { moduleId: 'INF2002', code: 'INF2002', name: 'Human-Computer Interaction', semester: TERM.name, enrolmentCount: 96, topics: ['usability testing', 'personas', 'prototyping', 'heuristic evaluation'] },
  { moduleId: 'MAT1001', code: 'MAT1001', name: 'Engineering Mathematics', semester: TERM.name, enrolmentCount: 210, topics: ['matrices', 'differential equations', 'vector calculus', 'Laplace transforms'] },
  { moduleId: 'CSC3005', code: 'CSC3005', name: 'Cyber Security Fundamentals', semester: TERM.name, enrolmentCount: 24, topics: ['threat modelling', 'cryptography', 'CTF challenges'] },
  { moduleId: 'ENG2002', code: 'ENG2002', name: 'Technical Communication', semester: TERM.name, enrolmentCount: 88, topics: ['report writing', 'presentations'] },
];

export const moduleLecturers = [
  { moduleId: 'INF2001', userId: 'U-LEC-A' },
  { moduleId: 'INF2003', userId: 'U-LEC-A' },
  { moduleId: 'BAC2005', userId: 'U-LEC-B' },
  { moduleId: 'INF2006', userId: 'U-LEC-C' },
  { moduleId: 'INF2002', userId: 'U-LEC-C' },
  { moduleId: 'MAT1001', userId: 'U-LEC-D' },
  { moduleId: 'ENG2002', userId: 'U-LEC-D' },
  { moduleId: 'CSC3005', userId: 'U-LEC-E' },
];

// Only the demo student's enrolments are modelled individually.
export const moduleStudents = [
  { moduleId: 'INF2001', userId: 'U-STU-001' },
  { moduleId: 'INF2003', userId: 'U-STU-001' },
  { moduleId: 'BAC2005', userId: 'U-STU-001' },
  { moduleId: 'INF2006', userId: 'U-STU-001' },
];

export const feedbackPeriods = [
  { periodId: 'FP-INF2001', moduleId: 'INF2001', name: 'Mid-trimester feedback', opensAt: '2026-08-24', closesAt: '2026-10-25', status: 'open' },
  { periodId: 'FP-INF2003', moduleId: 'INF2003', name: 'Mid-trimester feedback', opensAt: '2026-08-24', closesAt: '2026-10-25', status: 'open' },
  { periodId: 'FP-BAC2005', moduleId: 'BAC2005', name: 'Mid-trimester feedback', opensAt: '2026-08-24', closesAt: '2026-10-11', status: 'closed' },
  { periodId: 'FP-INF2006', moduleId: 'INF2006', name: 'Mid-trimester feedback', opensAt: '2026-08-24', closesAt: '2026-10-25', status: 'open' },
  { periodId: 'FP-INF2002', moduleId: 'INF2002', name: 'Mid-trimester feedback', opensAt: '2026-08-24', closesAt: '2026-10-25', status: 'open' },
  { periodId: 'FP-MAT1001', moduleId: 'MAT1001', name: 'Mid-trimester feedback', opensAt: '2026-08-24', closesAt: '2026-10-18', status: 'open' },
  { periodId: 'FP-CSC3005', moduleId: 'CSC3005', name: 'Mid-trimester feedback', opensAt: '2026-08-24', closesAt: '2026-10-25', status: 'open' },
  { periodId: 'FP-ENG2002', moduleId: 'ENG2002', name: 'Mid-trimester feedback', opensAt: '2026-09-28', closesAt: '2026-11-08', status: 'open' },
];

// Records THAT a student submitted, never WHAT they wrote. Kept in a separate
// table with no link to `feedback`, so comments cannot be traced to a student.
export const submissionReceipts = [
  { studentId: 'U-STU-001', periodId: 'FP-INF2003', submittedOn: '2026-10-06' },
];
