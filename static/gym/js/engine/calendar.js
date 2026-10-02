// Local-time calendar helpers. Weeks start on Monday or Sunday depending on settings.

export const HOUR = 3600e3;
export const DAY = 24 * HOUR;

export function startOfDay(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Same time of day, `days` calendar days later (safe across DST changes). */
export function addDays(date, days) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}

export function isSameDay(a, b) {
  return +startOfDay(a) === +startOfDay(b);
}

/** Whole calendar days from a to b. */
export function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY);
}

export function weekStart(date, mondayFirst = true) {
  const day = startOfDay(date);
  const offset = mondayFirst ? (day.getDay() + 6) % 7 : day.getDay();
  return addDays(day, -offset);
}

/** "YYYY-MM-DD" in local time. */
export function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
