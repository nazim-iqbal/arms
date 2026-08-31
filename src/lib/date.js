/**
 * Date helpers.
 *
 * `new Date().toISOString()` gives the UTC day. Bangladesh is UTC+6, so between
 * midnight and 6 AM local time that is still *yesterday* — which would put an
 * early-morning জমা entry on the wrong day and make the dashboard's "আজকের"
 * totals read from the wrong date. These helpers always use the device's local day.
 */

/** Today in the device's own timezone, as YYYY-MM-DD. */
export function today() {
  return toDateInput(new Date());
}

/** The local day N days before today, as YYYY-MM-DD. daysAgo(0) === today(). */
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateInput(d);
}

/** Format a Date as YYYY-MM-DD (the value format <input type="date"> expects). */
export function toDateInput(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** First day of the month a YYYY-MM-DD belongs to. */
export function monthStart(value) {
  return `${String(value).slice(0, 7)}-01`;
}

/** Last day of the month a YYYY-MM-DD belongs to. */
export function monthEnd(value) {
  const [y, m] = String(value).split('-').map(Number);
  // Day 0 of the next month is the last day of this one.
  return toDateInput(new Date(y, m, 0));
}

/** Shift a YYYY-MM-DD by n whole months, landing on the 1st. */
export function addMonths(value, n) {
  const [y, m] = String(value).split('-').map(Number);
  return toDateInput(new Date(y, m - 1 + n, 1));
}

/** Every local day from `from` to `to` inclusive, as YYYY-MM-DD. */
export function eachDay(from, to) {
  const [y, m, d] = String(from).split('-').map(Number);
  const cursor = new Date(y, m - 1, d);
  const out = [];
  // A month view can never need more than this; the guard keeps a bad
  // argument from spinning forever.
  for (let i = 0; i < 400; i++) {
    const day = toDateInput(cursor);
    if (day > to) break;
    out.push(day);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** "সেপ্টেম্বর ২০২৬" — the month a YYYY-MM-DD belongs to. */
export function monthLabel(value) {
  const [y, m] = String(value).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
}

/** "শুক্র" — the short Bengali weekday of a YYYY-MM-DD. */
export function weekdayShort(value) {
  const [y, m, d] = String(value).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('bn-BD', { weekday: 'short' });
}

/** YYYY-MM-DD -> DD/MM/YYYY, easier to scan on a narrow screen. */
export function formatDate(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

/** Bengali-numeral money formatting, e.g. ৳ ১,২৫০ */
export function bn(n) {
  return Number(n || 0).toLocaleString('bn-BD');
}
