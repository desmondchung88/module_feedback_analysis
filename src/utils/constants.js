export const ROLES = { STUDENT: 'student', LECTURER: 'lecturer', ADMIN: 'admin' };

export const SENTIMENTS = ['positive', 'neutral', 'negative'];

export const SENTIMENT_META = {
  positive: { label: 'Positive', color: '#2f9e6e', soft: 'bg-positive-soft', ink: 'text-positive-ink' },
  neutral: { label: 'Neutral', color: '#d99a1e', soft: 'bg-neutral-soft', ink: 'text-neutral-ink' },
  negative: { label: 'Negative', color: '#d64545', soft: 'bg-negative-soft', ink: 'text-negative-ink' },
};

// Minimum number of responses before comments or breakdowns are shown.
// Enforced by the (mock) backend; the UI only renders the notice.
export const MIN_RESPONSES = 5;

export const TOTAL_WEEKS = 13;

export const FEEDBACK_CATEGORIES = [
  'Lecture', 'Tutorial', 'Lab', 'Assessment', 'Learning Materials', 'Workload', 'Teaching', 'Technical Issues',
];

export const COMMENT_MIN_LENGTH = 10;
export const COMMENT_MAX_LENGTH = 2000;

export const HOME_PATH_BY_ROLE = {
  student: '/student',
  lecturer: '/lecturer',
  admin: '/admin',
};
