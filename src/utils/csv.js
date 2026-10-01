// Minimal RFC 4180 CSV parser.
//
// Written by hand rather than pulled from a dependency because the format we
// accept is narrow and the review column contains embedded commas, quotes and
// newlines, which naive split(',') parsing corrupts silently.
export function parseCsv(text, { maxRows = Infinity } = {}) {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // strip BOM
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let truncated = false;

  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      if (rows.length > maxRows) {
        truncated = true;
        break;
      }
    } else {
      field += c;
    }
  }

  if (!truncated && (field !== '' || row.length)) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) return { headers: [], rows: [], truncated };

  const headers = rows[0].map((h) => h.trim());
  const body = rows.slice(1, maxRows === Infinity ? undefined : maxRows + 1);
  return {
    headers,
    rows: body.map((cells) => Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))),
    truncated: truncated || body.length < rows.length - 1,
  };
}

// Best-effort matching of CSV headers to the fields the analyser needs, so the
// common case needs no manual mapping.
const CANDIDATES = {
  text: ['reviews', 'review', 'comment', 'comments', 'feedback', 'text', 'body', 'response'],
  group: ['course_code', 'module_code', 'course', 'module', 'code', 'subject'],
  title: ['course_title', 'module_name', 'title', 'name'],
  label: ['course_rating', 'sentiment', 'label', 'rating_label'],
  week: ['week', 'teaching_week', 'term_week'],
};

export function suggestMapping(headers) {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const pick = (options) => {
    for (const option of options) {
      const i = lower.indexOf(option);
      if (i !== -1) return headers[i];
    }
    // fall back to a partial match
    for (const option of options) {
      const i = lower.findIndex((h) => h.includes(option));
      if (i !== -1) return headers[i];
    }
    return '';
  };
  return Object.fromEntries(Object.entries(CANDIDATES).map(([field, options]) => [field, pick(options)]));
}
