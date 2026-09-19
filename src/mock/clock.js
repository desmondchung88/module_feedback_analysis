// The mock world is fixed at Week 8 of the trimester so the demo data never
// drifts. New submissions take the mock date plus the real time of day.
const MOCK_DATE = '2026-10-15';

export function mockToday() {
  return MOCK_DATE;
}

export function mockNowIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return new Date(`${MOCK_DATE}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}+08:00`).toISOString();
}
