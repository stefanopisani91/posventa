/**
 * Calendar-date helpers. Legal deadlines are whole calendar days, so they are
 * handled as "YYYY-MM-DD" strings and computed in UTC to avoid DST surprises.
 */
export type IsoDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function parse(date: IsoDate): { y: number; m: number; d: number } {
  const match = ISO_DATE.exec(date);
  if (!match) throw new Error(`Invalid ISO date: ${date}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function format(y: number, m: number, d: number): IsoDate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toUtcMs(date: IsoDate): number {
  const { y, m, d } = parse(date);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): IsoDate {
  const dt = new Date(ms);
  return format(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const { y, m, d } = parse(value);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The calendar date of `instant` in the given IANA time zone. */
export function dateInTimeZone(instant: Date, timeZone: string): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/**
 * Same day and month `years` later. If that day does not exist (29 February
 * in a non-leap year) the period ends on the last day of the month, as in
 * Regulation (EEC, Euratom) 1182/71, art. 3.2.c.
 */
export function addYears(date: IsoDate, years: number): IsoDate {
  const { y, m, d } = parse(date);
  const targetYear = y + years;
  return format(targetYear, m, Math.min(d, daysInMonth(targetYear, m)));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: IsoDate): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

/** Moves a Saturday or Sunday forward to the following Monday. */
export function nextWorkingDayIfWeekend(date: IsoDate): IsoDate {
  const dow = dayOfWeek(date);
  if (dow === 6) return addDays(date, 2);
  if (dow === 0) return addDays(date, 1);
  return date;
}

export function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}
