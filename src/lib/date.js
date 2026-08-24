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
