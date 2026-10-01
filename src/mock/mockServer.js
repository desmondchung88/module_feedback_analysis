// In-browser mock of the future REST API.
//
// Each handler implements one endpoint of the contract documented in README.md.
// The real backend (behind the ALB) replaces this file; nothing in the UI changes,
// because services call the same paths through services/apiClient.js.
import { config } from '../config.js';
import { MIN_RESPONSES, TOTAL_WEEKS } from '../utils/constants.js';
import { isValidEmail, validateFeedback } from '../utils/validation.js';
import { STUDENT_POPULATION } from '../data/mockUsers.js';
import { db, insertSubmission, nextFeedbackId } from './db.js';
import { mockNowIso, mockToday } from './clock.js';
import { getDevSettings } from './devSettings.js';
import { stubAnalyse } from './stubClassifier.js';
import {
  canSubmitFeedback, canViewFeedback, canViewModule, lecturerModuleIds, meetsPrivacyThreshold,
} from './policies.js';
import {
  applyFilters, detectTrend, joinFeedback, latestDate, representativeComments,
  sentimentSummary, themeBreakdown, toPublicComment, weeklySeries,
} from './analyticsEngine.js';

// ---------- response helpers ----------
const ok = (data) => ({ status: 200, data });
const created = (data) => ({ status: 201, data });
const fail = (status, message, extra = {}) => ({ status, data: { message, ...extra } });

// ---------- auth (mock tokens: NOT secure, for demo only) ----------
function issueToken(user) {
  return `mock.${btoa(JSON.stringify({ sub: user.userId, role: user.role, iat: Date.now() }))}`;
}

function authenticate(headers) {
  const header = headers.Authorization || '';
  if (!header.startsWith('Bearer mock.')) return null;
  try {
    const claims = JSON.parse(atob(header.slice('Bearer mock.'.length)));
    return db.users.find((u) => u.userId === claims.sub) || null;
  } catch {
    return null;
  }
}

const publicUser = ({ userId, name, email, role }) => ({ userId, name, email, role });

// ---------- lookups ----------
const moduleById = (moduleId) => db.modules.find((m) => m.moduleId === moduleId);
const periodFor = (moduleId) => db.feedbackPeriods.find((p) => p.moduleId === moduleId);
const lecturersFor = (moduleId) => db.moduleLecturers
  .filter((row) => row.moduleId === moduleId)
  .map((row) => db.users.find((u) => u.userId === row.userId).name);

function allItems() {
  return joinFeedback(db.feedback, db.feedbackAnalysis, db.themes);
}

function itemsForModule(moduleId) {
  return allItems().filter((i) => i.moduleId === moduleId);
}

function periodStatus(period) {
  if (!period) return 'none';
  if (period.status === 'closed') return 'closed';
  if (period.opensAt > mockToday()) return 'upcoming';
  return 'open';
}

function studentFeedbackStatus(user, moduleId) {
  const period = periodFor(moduleId);
  const submitted = db.submissionReceipts.some((r) => r.studentId === user.userId && r.periodId === period?.periodId);
  if (submitted) return 'submitted';
  const status = periodStatus(period);
  if (status === 'open') return 'available';
  return status; // closed | upcoming | none
}

function moduleHeader(module) {
  return {
    moduleId: module.moduleId,
    code: module.code,
    name: module.name,
    semester: module.semester,
    lecturers: lecturersFor(module.moduleId),
  };
}

// Theme IDs whose total count in this module is below the threshold.
function suppressedThemeIds(moduleItems) {
  const counts = new Map();
  for (const i of moduleItems) counts.set(i.themeId, (counts.get(i.themeId) || 0) + 1);
  return new Set([...counts].filter(([, n]) => !meetsPrivacyThreshold(n)).map(([id]) => id));
}

function privacyBlock(count) {
  return { suppressed: true, reason: 'BELOW_MIN_RESPONSES', threshold: MIN_RESPONSES, responseCount: count };
}

// ---------- handlers ----------
function login({ body }) {
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!isValidEmail(email) || !password) {
    return fail(400, 'Enter a valid email address and password.');
  }
  const user = db.users.find((u) => u.email === email);
  // Mock mode accepts any password for a known demo account.
  if (!user) return fail(401, 'Invalid email or password.');
  return ok({ token: issueToken(user), user: publicUser(user) });
}

function me({ user }) {
  return ok(publicUser(user));
}

function listModules({ user }) {
  if (user.role === 'student') {
    const rows = db.moduleStudents
      .filter((row) => row.userId === user.userId)
      .map((row) => {
        const module = moduleById(row.moduleId);
        const period = periodFor(row.moduleId);
        return {
          ...moduleHeader(module),
          currentWeek: db.term.currentWeek,
          feedbackStatus: studentFeedbackStatus(user, module.moduleId),
          deadline: period?.closesAt ?? null,
          periodName: period?.name ?? null,
        };
      });
    return ok(rows);
  }

  const visible = user.role === 'admin'
    ? db.modules
    : db.modules.filter((m) => lecturerModuleIds(user.userId).includes(m.moduleId));

  const rows = visible.map((module) => {
    const items = itemsForModule(module.moduleId);
    const aboveThreshold = meetsPrivacyThreshold(items.length);
    const summary = sentimentSummary(items);
    const topTheme = aboveThreshold ? themeBreakdown(items, db.themes)[0] : null;
    const period = periodFor(module.moduleId);
    const base = {
      ...moduleHeader(module),
      responseCount: items.length,
      // A precise date for a handful of responses could hint at who replied.
      lastUpdated: aboveThreshold ? latestDate(items) : null,
      periodStatus: periodStatus(period),
      deadline: period?.closesAt ?? null,
    };
    if (user.role === 'admin') {
      return { ...base, enrolmentCount: module.enrolmentCount };
    }
    return {
      ...base,
      belowThreshold: !aboveThreshold,
      negativePct: aboveThreshold ? summary.pcts.negative : null,
      positivePct: aboveThreshold ? summary.pcts.positive : null,
      topTheme: topTheme ? { themeId: topTheme.themeId, name: topTheme.name } : null,
    };
  });
  return ok(rows);
}

function getModule({ user, params }) {
  const module = moduleById(params.moduleId);
  if (!module) return fail(404, 'Module not found.');
  if (!canViewModule(user, module.moduleId)) return fail(403, 'You do not have permission to access this module.');
  const period = periodFor(module.moduleId);
  return ok({
    ...moduleHeader(module),
    currentWeek: db.term.currentWeek,
    totalWeeks: TOTAL_WEEKS,
    period: period ? { ...period, status: periodStatus(period) } : null,
    feedbackStatus: user.role === 'student' ? studentFeedbackStatus(user, module.moduleId) : undefined,
  });
}

function guardFeedbackAccess(user, moduleId) {
  const module = moduleById(moduleId);
  if (!module) return { error: fail(404, 'Module not found.') };
  if (!canViewFeedback(user, moduleId)) return { error: fail(403, 'You do not have permission to access this module.') };
  return { module };
}

function getAnalytics({ user, params, query }) {
  const { module, error } = guardFeedbackAccess(user, params.moduleId);
  if (error) return error;

  const items = itemsForModule(module.moduleId);
  const header = {
    module: moduleHeader(module),
    responseCount: items.length,
    lastUpdated: meetsPrivacyThreshold(items.length) ? latestDate(items) : null,
    currentWeek: db.term.currentWeek,
    totalWeeks: TOTAL_WEEKS,
    threshold: MIN_RESPONSES,
  };
  if (items.length === 0) return ok({ ...header, empty: true });
  if (!meetsPrivacyThreshold(items.length)) return ok({ ...header, ...privacyBlock(items.length) });

  const filters = { week: query.week ? Number(query.week) : null, themeId: query.theme || null, sentiment: query.sentiment || null };
  const hiddenThemes = suppressedThemeIds(items);

  if (filters.themeId && hiddenThemes.has(filters.themeId)) {
    return ok({ ...header, filters, ...privacyBlock(items.filter((i) => i.themeId === filters.themeId).length), scope: 'theme' });
  }

  // Week + theme drive the headline numbers; sentiment narrows trends and comments.
  // A dataset imported from a CSV may carry no teaching week. Reporting a
  // weekly chart of zeros would be misleading, so it is omitted instead.
  const hasWeeks = items.some((i) => Number.isFinite(i.week));
  const scoped = applyFilters(items, { week: filters.week, themeId: filters.themeId });
  const byWeek = applyFilters(items, { week: filters.week });
  const commentPool = applyFilters(scoped, { sentiment: filters.sentiment }).filter((i) => !hiddenThemes.has(i.themeId));
  const themes = themeBreakdown(byWeek, db.themes, { trendItems: items, withTrend: hasWeeks });

  return ok({
    ...header,
    suppressed: false,
    filters,
    filteredCount: scoped.length,
    sentiment: sentimentSummary(scoped),
    mostDiscussedTheme: themes.find((t) => !t.suppressed) ?? null,
    themes,
    hasWeeks,
    weekly: hasWeeks ? weeklySeries(applyFilters(items, { themeId: filters.themeId }), db.term.currentWeek) : null,
    comments: representativeComments(commentPool, 6).map(toPublicComment),
    commentCount: commentPool.length,
  });
}

function getThemeDetail({ user, params }) {
  const { module, error } = guardFeedbackAccess(user, params.moduleId);
  if (error) return error;
  const theme = db.themes.find((t) => t.themeId === params.themeId);
  if (!theme) return fail(404, 'Theme not found.');

  const moduleItems = itemsForModule(module.moduleId);
  const items = moduleItems.filter((i) => i.themeId === theme.themeId);
  const header = { module: moduleHeader(module), theme, count: items.length, currentWeek: db.term.currentWeek, threshold: MIN_RESPONSES };

  if (!meetsPrivacyThreshold(moduleItems.length)) return ok({ ...header, ...privacyBlock(moduleItems.length), scope: 'module' });
  if (items.length === 0) return ok({ ...header, empty: true });
  if (!meetsPrivacyThreshold(items.length)) return ok({ ...header, ...privacyBlock(items.length), scope: 'theme' });

  const themeHasWeeks = items.some((i) => Number.isFinite(i.week));
  return ok({
    ...header,
    suppressed: false,
    hasWeeks: themeHasWeeks,
    sentiment: sentimentSummary(items),
    trend: themeHasWeeks ? detectTrend(items) : null,
    weekly: themeHasWeeks ? weeklySeries(items, db.term.currentWeek) : null,
    comments: representativeComments(items, 6).map(toPublicComment),
  });
}

// GET /api/feedback and GET /api/modules/:moduleId/feedback
function listFeedback({ user, params, query }) {
  if (user.role !== 'lecturer') return fail(403, 'Only lecturers can browse feedback.');

  const moduleId = params.moduleId || query.module || null;
  let moduleIds = lecturerModuleIds(user.userId);
  if (moduleId) {
    const { error } = guardFeedbackAccess(user, moduleId);
    if (error) return error;
    moduleIds = [moduleId];
  }

  const hiddenModules = [];
  let hiddenComments = 0;
  let visible = [];
  for (const id of moduleIds) {
    const items = itemsForModule(id);
    if (!items.length) continue;
    if (!meetsPrivacyThreshold(items.length)) {
      hiddenModules.push(moduleById(id).code);
      continue;
    }
    const hiddenThemes = suppressedThemeIds(items);
    hiddenComments += items.filter((i) => hiddenThemes.has(i.themeId)).length;
    visible = visible.concat(items.filter((i) => !hiddenThemes.has(i.themeId)));
  }

  if (moduleId && hiddenModules.length) {
    return ok({ ...privacyBlock(itemsForModule(moduleId).length), scope: 'module', items: [], total: 0 });
  }

  const filtered = applyFilters(visible, {
    week: query.week ? Number(query.week) : null,
    themeId: query.theme || null,
    sentiment: query.sentiment || null,
    q: query.q || '',
  }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const pageSize = Math.min(Number(query.pageSize) || 12, 50);
  const page = Math.max(Number(query.page) || 1, 1);
  const codeById = Object.fromEntries(db.modules.map((m) => [m.moduleId, m.code]));

  return ok({
    items: filtered.slice((page - 1) * pageSize, page * pageSize)
      .map((i) => ({ ...toPublicComment(i), moduleCode: codeById[i.moduleId] })),
    total: filtered.length,
    page,
    pageSize,
    hidden: { modules: hiddenModules, comments: hiddenComments },
  });
}

function createFeedback({ user, body }) {
  if (user.role !== 'student') return fail(403, 'Only students can submit feedback.');
  const module = moduleById(body?.moduleId);
  if (!module) return fail(404, 'Module not found.');
  if (!canSubmitFeedback(user, module.moduleId)) return fail(403, 'You are not enrolled in this module.');

  const period = periodFor(module.moduleId);
  const status = studentFeedbackStatus(user, module.moduleId);
  if (status === 'submitted') return fail(409, 'You have already submitted feedback for this module.');
  if (status !== 'available') return fail(409, 'The feedback period for this module is not open.');

  const { valid, errors, cleaned } = validateFeedback({
    comment: body.comment,
    categories: body.categories ?? [],
    rating: body.rating ?? null,
  });
  if (!valid) return fail(422, 'Please fix the highlighted fields.', { errors });

  const submittedAt = mockNowIso();
  const feedbackId = nextFeedbackId();
  // Note: no student identifier is stored on the feedback row.
  const feedback = {
    feedbackId,
    moduleId: module.moduleId,
    periodId: period.periodId,
    week: db.term.currentWeek,
    comment: cleaned.comment,
    rating: cleaned.rating,
    categories: cleaned.categories,
    submittedAt,
  };
  const analysis = stubAnalyse({ ...feedback, analysedAt: submittedAt });
  // The receipt records only the date, so it cannot be matched to a timestamp.
  const receipt = { studentId: user.userId, periodId: period.periodId, submittedOn: mockToday() };
  insertSubmission({ feedback, analysis, receipt });

  return created({ feedbackId, submittedAt, moduleId: module.moduleId });
}

function listThemes() {
  return ok(db.themes);
}

function adminOverview({ user }) {
  if (user.role !== 'admin') return fail(403, 'Admin access required.');
  const items = allItems();
  const rows = db.modules.map((module) => {
    const period = periodFor(module.moduleId);
    return {
      ...moduleHeader(module),
      enrolmentCount: module.enrolmentCount,
      responseCount: items.filter((i) => i.moduleId === module.moduleId).length,
      periodStatus: periodStatus(period),
      deadline: period?.closesAt ?? null,
    };
  });
  return ok({
    totals: {
      modules: db.modules.length,
      lecturers: db.users.filter((u) => u.role === 'lecturer').length,
      students: STUDENT_POPULATION,
      responses: items.length,
      activePeriods: rows.filter((r) => r.periodStatus === 'open').length,
    },
    modules: rows,
  });
}

// ---------- router ----------
const routes = [
  { method: 'POST', pattern: /^\/api\/auth\/login$/, handler: login, public: true },
  { method: 'GET', pattern: /^\/api\/auth\/me$/, handler: me },
  { method: 'GET', pattern: /^\/api\/themes$/, handler: listThemes },
  { method: 'GET', pattern: /^\/api\/modules$/, handler: listModules },
  { method: 'GET', pattern: /^\/api\/modules\/(?<moduleId>[^/]+)$/, handler: getModule },
  { method: 'GET', pattern: /^\/api\/modules\/(?<moduleId>[^/]+)\/analytics$/, handler: getAnalytics },
  { method: 'GET', pattern: /^\/api\/modules\/(?<moduleId>[^/]+)\/themes\/(?<themeId>[^/]+)$/, handler: getThemeDetail },
  { method: 'GET', pattern: /^\/api\/modules\/(?<moduleId>[^/]+)\/feedback$/, handler: listFeedback },
  { method: 'GET', pattern: /^\/api\/feedback$/, handler: listFeedback },
  { method: 'POST', pattern: /^\/api\/feedback$/, handler: createFeedback },
  { method: 'GET', pattern: /^\/api\/admin\/overview$/, handler: adminOverview },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function handleMockRequest({ method, path, query, headers, body }) {
  await sleep(config.mockLatencyMs * (0.6 + Math.random() * 0.8));

  const route = routes.find((r) => r.method === method && r.pattern.test(path));
  if (!route) return fail(404, `No mock route for ${method} ${path}`);

  if (getDevSettings().simulateErrors && !path.startsWith('/api/auth')) {
    return fail(503, 'The feedback service is temporarily unavailable (simulated).');
  }

  const user = route.public ? null : authenticate(headers);
  if (!route.public && !user) return fail(401, 'Your session has expired. Please sign in again.');

  const params = { ...(path.match(route.pattern).groups || {}) };
  for (const key of Object.keys(params)) params[key] = decodeURIComponent(params[key]);

  try {
    return route.handler({ user, params, query, body });
  } catch (err) {
    console.error('[mock server]', err);
    return fail(500, 'Unexpected server error.');
  }
}
