const dateFormatter = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatDate(value) {
  if (!value) return '—';
  return dateFormatter.format(new Date(value));
}

export function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

export function pluralise(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function capitalise(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}
