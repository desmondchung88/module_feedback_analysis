import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CircleCheckBig, EyeOff, Send, Star } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync.js';
import { getModule } from '../../services/moduleService.js';
import { submitFeedback } from '../../services/feedbackService.js';
import { COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH, FEEDBACK_CATEGORIES } from '../../utils/constants.js';
import { validateFeedback } from '../../utils/validation.js';
import { formatDate } from '../../utils/format.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { FeedbackStatusBadge } from '../../components/ui/Badges.jsx';
import { CardSkeleton, LoadingRegion } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/States.jsx';
import { ApiErrorView } from '../../components/ui/StatusViews.jsx';

const RATING_LABELS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent'];

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <div>
      <div role="radiogroup" aria-label="Overall rating" className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}: ${RATING_LABELS[n]}`}
            onClick={() => onChange(value === n ? null : n)}
            onMouseEnter={() => setHover(n)}
            className="rounded p-0.5"
          >
            <Star className={`size-7 ${n <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} aria-hidden />
          </button>
        ))}
        <span className="ml-2 text-sm text-slate-500">{shown ? RATING_LABELS[shown] : 'No rating'}</span>
      </div>
      {value && (
        <button type="button" onClick={() => onChange(null)} className="mt-1 text-xs text-slate-500 underline hover:text-slate-700">
          Clear rating
        </button>
      )}
    </div>
  );
}

function SuccessView({ module }) {
  return (
    <Card className="mx-auto max-w-xl">
      <EmptyState
        icon={CircleCheckBig}
        title="Thank you, your feedback has been submitted"
        message={`Your comments on ${module.code} ${module.name} will be shared with the teaching team in aggregated form. Your identity will not be displayed.`}
        action={<Button to="/student">Back to my modules</Button>}
      />
    </Card>
  );
}

export default function FeedbackSubmissionPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { data: module, error, isInitialLoading, retry } = useAsync(() => getModule(moduleId), [moduleId]);

  const [comment, setComment] = useState('');
  const [categories, setCategories] = useState([]);
  const [rating, setRating] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleCategory = (c) => setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const onSubmit = async (e) => {
    e.preventDefault();
    const check = validateFeedback({ comment, categories, rating });
    setErrors(check.errors);
    if (!check.valid) return;

    setSubmitting(true);
    try {
      await submitFeedback({ moduleId, ...check.cleaned });
      setSubmitted(true);
    } catch (err) {
      setErrors(err.details?.errors ?? { form: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [{ label: 'My Modules', to: '/student' }, { label: 'Give Feedback' }];

  if (isInitialLoading) {
    return (
      <LoadingRegion label="Loading module">
        <CardSkeleton lines={6} className="max-w-3xl" />
      </LoadingRegion>
    );
  }
  if (error) return <ApiErrorView error={error} onRetry={retry} title="Unable to load this module." />;
  if (submitted) return <SuccessView module={module} />;

  const header = (
    <PageHeader
      breadcrumbs={breadcrumbs}
      title={`${module.code} – ${module.name}`}
      subtitle={module.period?.name}
      meta={(
        <>
          <span><span className="text-slate-400">Lecturer:</span> {module.lecturers.join(', ')}</span>
          <span><span className="text-slate-400">Current teaching week:</span> Week {module.currentWeek}</span>
          <span><span className="text-slate-400">Deadline:</span> {formatDate(module.period?.closesAt)}</span>
        </>
      )}
    />
  );

  if (module.feedbackStatus !== 'available') {
    return (
      <>
        {header}
        <Card className="max-w-3xl">
          <EmptyState
            title={module.feedbackStatus === 'submitted' ? 'You have already submitted feedback' : 'Feedback is not open for this module'}
            message={module.feedbackStatus === 'submitted'
              ? 'Each student can submit once per feedback period. Thank you for taking part.'
              : 'You can submit feedback when the next feedback period opens.'}
            action={<div className="flex flex-col items-center gap-3"><FeedbackStatusBadge status={module.feedbackStatus} /><Button to="/student" variant="secondary">Back to my modules</Button></div>}
          />
        </Card>
      </>
    );
  }

  const length = comment.trim().length;

  return (
    <>
      {header}
      <Card className="max-w-3xl">
        <form onSubmit={onSubmit} noValidate className="space-y-7 p-5 sm:p-6">
          {errors.form && <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative-ink">{errors.form}</p>}

          <div>
            <label htmlFor="comment" className="block text-base font-semibold text-slate-900">Share your feedback about this module</label>
            <p className="mt-0.5 text-sm text-slate-500">Be specific. Examples help the teaching team act on your feedback.</p>
            <textarea
              id="comment"
              rows={7}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={COMMENT_MAX_LENGTH}
              placeholder="What is working well? What could be improved?"
              aria-invalid={Boolean(errors.comment)}
              aria-describedby="comment-help"
              className="mt-3 w-full resize-y rounded-lg p-3 text-sm leading-relaxed ring-1 ring-slate-300 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 aria-invalid:ring-negative"
            />
            <div id="comment-help" className="mt-1 flex justify-between gap-4 text-xs">
              <span className={errors.comment ? 'text-negative-ink' : 'text-slate-500'}>
                {errors.comment || `At least ${COMMENT_MIN_LENGTH} characters.`}
              </span>
              <span className="tabular-nums text-slate-400">{length}/{COMMENT_MAX_LENGTH}</span>
            </div>
          </div>

          <fieldset>
            <legend className="text-base font-semibold text-slate-900">What is your feedback about? <span className="font-normal text-slate-400">(optional)</span></legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {FEEDBACK_CATEGORIES.map((c) => {
                const selected = categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleCategory(c)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors ${
                      selected ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white text-slate-700 ring-slate-300 hover:ring-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            {errors.categories && <p className="mt-1 text-xs text-negative-ink">{errors.categories}</p>}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-base font-semibold text-slate-900">Overall rating <span className="font-normal text-slate-400">(optional)</span></legend>
            <StarRating value={rating} onChange={setRating} />
            {errors.rating && <p className="mt-1 text-xs text-negative-ink">{errors.rating}</p>}
          </fieldset>

          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            <EyeOff className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
            <p>Your feedback will be shown to lecturers in aggregated form. Your identity will not be displayed.</p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => navigate('/student')} disabled={submitting}>Cancel</Button>
            <Button type="submit" icon={Send} loading={submitting}>Submit Feedback</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
