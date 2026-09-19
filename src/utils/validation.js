// Feedback submission rules, shared by the form (for instant hints) and the
// mock server (for enforcement). The real backend must re-validate server-side;
// client-side checks are a convenience, never a security control.
import { COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH, FEEDBACK_CATEGORIES } from './constants.js';

export function validateFeedback({ comment, categories = [], rating = null }) {
  const errors = {};
  const text = typeof comment === 'string' ? comment.trim() : '';

  if (!text) {
    errors.comment = 'Please write your feedback before submitting.';
  } else if (text.length < COMMENT_MIN_LENGTH) {
    errors.comment = `Feedback must be at least ${COMMENT_MIN_LENGTH} characters.`;
  } else if (text.length > COMMENT_MAX_LENGTH) {
    errors.comment = `Feedback must be ${COMMENT_MAX_LENGTH} characters or fewer.`;
  }

  if (!Array.isArray(categories) || categories.some((c) => !FEEDBACK_CATEGORIES.includes(c))) {
    errors.categories = 'One or more selected categories are not recognised.';
  }

  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
    errors.rating = 'Rating must be a whole number from 1 to 5.';
  }

  return { valid: Object.keys(errors).length === 0, errors, cleaned: { comment: text, categories, rating } };
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
