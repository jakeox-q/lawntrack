/**
 * Calendar dates for lawn work are local dates ("2026-10-12"), not instants.
 * A due date of 12 October means 12 October where the lawn is, regardless of UTC.
 * All arithmetic here is calendar-day arithmetic on those strings.
 */

export type LocalDate = string; // YYYY-MM-DD
export type LocalTime = string; // HH:MM, 24-hour

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isLocalTime(value: unknown): value is LocalTime {
  return typeof value === 'string' && TIME_RE.test(value);
}

function parts(date: LocalDate): [number, number, number] {
  if (!isLocalDate(date)) throw new Error(`Invalid local date: ${date}`);
  const [y, m, d] = date.split('-').map(Number);
  return [y, m, d];
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

export function toDayNumber(date: LocalDate): number {
  const [y, m, d] = parts(date);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayNumber(day: number): LocalDate {
  const dt = new Date(day * DAY_MS);
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromDayNumber(toDayNumber(date) + days);
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: LocalDate, to: LocalDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

export function compareDates(a: LocalDate, b: LocalDate): number {
  return toDayNumber(a) - toDayNumber(b);
}

export function maxDate(...dates: (LocalDate | null | undefined)[]): LocalDate | null {
  let best: LocalDate | null = null;
  for (const d of dates) {
    if (d && (best === null || compareDates(d, best) > 0)) best = d;
  }
  return best;
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(date: LocalDate): number {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** The next given weekday strictly after `date` (or `date` itself if `includeToday`). */
export function nextWeekday(date: LocalDate, target: number, includeToday = false): LocalDate {
  const current = weekday(date);
  let delta = (target - current + 7) % 7;
  if (delta === 0 && !includeToday) delta = 7;
  return addDays(date, delta);
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function zonedParts(instantMs: number, timeZone: string): ZonedParts {
  let fmt = formatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, fmt);
  }
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(new Date(instantMs))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

function offsetMs(instantMs: number, timeZone: string): number {
  const p = zonedParts(instantMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

/** Today's calendar date in the given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  try {
    const p = zonedParts(now.getTime(), timeZone);
    return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
  } catch {
    return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
}

/**
 * The instant at which the wall-clock time `time` occurs on `date` in `timeZone`.
 * Times that fall inside a daylight-saving gap move forward by the size of the gap
 * (02:30 on a 02:00→03:00 change becomes 03:30). Ambiguous times resolve consistently.
 */
export function zonedDateTimeToInstant(date: LocalDate, time: LocalTime, timeZone: string): number {
  const [y, m, d] = parts(date);
  if (!isLocalTime(time)) throw new Error(`Invalid local time: ${time}`);
  const [hh, mm] = time.split(':').map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  try {
    const first = offsetMs(wallAsUtc, timeZone);
    let candidate = wallAsUtc - first;
    const second = offsetMs(candidate, timeZone);
    if (second !== first) candidate = wallAsUtc - second;
    return candidate;
  } catch {
    // Intl time zone support missing: fall back to the device's own zone.
    return new Date(y, m - 1, d, hh, mm).getTime();
  }
}

/** The local calendar date of an instant in `timeZone`. */
export function instantToLocalDate(instantMs: number, timeZone: string): LocalDate {
  return todayIn(timeZone, new Date(instantMs));
}

export function instantToLocalTime(instantMs: number, timeZone: string): LocalTime {
  try {
    const p = zonedParts(instantMs, timeZone);
    return `${pad(p.hour)}:${pad(p.minute)}`;
  } catch {
    const dt = new Date(instantMs);
    return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }
}

export function dateToLocalDate(dt: Date): LocalDate {
  return `${pad(dt.getFullYear(), 4)}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function localDateToDate(date: LocalDate): Date {
  const [y, m, d] = parts(date);
  return new Date(y, m - 1, d, 12, 0, 0);
}
