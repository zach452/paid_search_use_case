/** All dates are plain ISO "yyyy-mm-dd" strings, compared as whole days in UTC
 * so there's no timezone drift between the browser and the stored data. */

export function parseISO(d: string): number {
  // Returns a day-index (days since epoch), not a Date, so subtraction is exact.
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day) / 86400000;
}

export function addDays(d: string, days: number): string {
  const dayIndex = parseISO(d) + days;
  const dt = new Date(dayIndex * 86400000);
  return toISO(dt);
}

export function toISO(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetween(from: string, to: string): number {
  return parseISO(to) - parseISO(from);
}

export function isAfter(a: string, b: string): boolean {
  return parseISO(a) > parseISO(b);
}

export function todayISO(): string {
  return toISO(new Date());
}
