import {
  DAY_MS,
  type DayPart,
  MINUTES_PER_HOUR,
  MONTHS,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  ZONE_CLOCK_OPTIONS,
} from '#/lib/models';

/** One clock reader per time zone, built on first use. */
const zoneClocks = new Map<string, Intl.DateTimeFormat>();

/** Time zone name for an offset in minutes, for example `UTC−7` or `UTC+5:30`. */
export const offsetLabel = (offsetMinutes: number): string => {
  if (offsetMinutes === 0) {
    return 'UTC';
  }
  const hours = Math.floor(Math.abs(offsetMinutes) / MINUTES_PER_HOUR);
  const minutes = Math.abs(offsetMinutes) % MINUTES_PER_HOUR;
  return `UTC${offsetMinutes < 0 ? '−' : '+'}${hours}${minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`}`;
};

/** The viewer's time zone from the browser, for example `America/Los_Angeles`. */
export const viewerTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Offset of [timeZone] from UTC in minutes at [ms], for example `-420` for `America/Los_Angeles` in October
 * and `-480` in December. Follows daylight saving time.
 */
export const offsetMinutesAt = (ms: number, timeZone: string): number => {
  const clock = zoneClocks.get(timeZone) ?? new Intl.DateTimeFormat('en-US', { ...ZONE_CLOCK_OPTIONS, timeZone });
  zoneClocks.set(timeZone, clock);
  const parts = Object.fromEntries(clock.formatToParts(ms).map((part) => [part.type, Number(part.value)]));
  const wallClockMs = Date.UTC(parts.year!, parts.month! - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((wallClockMs - Math.floor(ms / MS_PER_SECOND) * MS_PER_SECOND) / MS_PER_MINUTE);
};

/** [timeUtc] moved to the wall clock of [timeZone], as a date whose UTC fields read like that clock. */
const wallClock = (timeUtc: string, timeZone: string): Date => {
  const ms = Date.parse(timeUtc);
  return new Date(ms + offsetMinutesAt(ms, timeZone) * MS_PER_MINUTE);
};

/** Clock time `HH:MM` of [timeUtc] in [timeZone]. */
export const clockTime = (timeUtc: string, timeZone: string): string =>
  wallClock(timeUtc, timeZone).toISOString().slice(11, 16);

/** Length of time as `3h 12m`, or `12m` under an hour. */
export const durationLabel = (ms: number): string => {
  const totalMinutes = Math.floor(ms / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  return hours > 0 ? `${hours}h ${totalMinutes % MINUTES_PER_HOUR}m` : `${totalMinutes}m`;
};

/** Time of [timeUtc] in [timeZone]: `HH:MM` on the same day as [nowMs], else `Oct 29 HH:MM`. */
export const whenLabel = (timeUtc: string, timeZone: string, nowMs: number): string => {
  const local = wallClock(timeUtc, timeZone);
  const today = wallClock(new Date(nowMs).toISOString(), timeZone);
  const time = local.toISOString().slice(11, 16);
  return local.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)
    ? time
    : `${MONTHS[local.getUTCMonth()]} ${local.getUTCDate()} ${time}`;
};

/** Part of a time range inside a window, or null when they do not overlap. */
export const clip = (
  startMs: number,
  endMs: number,
  windowStartMs: number,
  windowEndMs: number,
): { startMs: number; endMs: number } | null =>
  endMs <= windowStartMs || startMs >= windowEndMs
    ? null
    : { startMs: Math.max(startMs, windowStartMs), endMs: Math.min(endMs, windowEndMs) };

/**
 * Last midnight before [nowMs] in [timeZone]. The offset is read again at that midnight, so a clock change
 * earlier in the day does not move it.
 */
export const midnightBeforeMs = (nowMs: number, timeZone: string): number => {
  const wallNowMs = nowMs + offsetMinutesAt(nowMs, timeZone) * MS_PER_MINUTE;
  const wallMidnightMs = wallNowMs - (((wallNowMs % DAY_MS) + DAY_MS) % DAY_MS);
  const guessMs = wallMidnightMs - offsetMinutesAt(nowMs, timeZone) * MS_PER_MINUTE;
  return wallMidnightMs - offsetMinutesAt(guessMs, timeZone) * MS_PER_MINUTE;
};

/**
 * Parts of a time range inside the 24 hours before [nowMs], split at the last midnight in [timeZone] so each
 * part is either today or yesterday.
 */
export const dayParts = (startMs: number, endMs: number, nowMs: number, timeZone: string): DayPart[] => {
  const midnightMs = midnightBeforeMs(nowMs, timeZone);
  const yesterday = clip(startMs, endMs, nowMs - DAY_MS, midnightMs);
  const today = clip(startMs, endMs, midnightMs, nowMs);
  const parts: DayPart[] = [];
  if (yesterday !== null) {
    parts.push({ ...yesterday, isYesterday: true });
  }
  if (today !== null) {
    parts.push({ ...today, isYesterday: false });
  }
  return parts;
};

/** Share of the day from [dayStartMs] to [ms], as a CSS percentage, for example `50%` at noon of that day. */
export const dayPercent = (ms: number, dayStartMs: number): string => `${((ms - dayStartMs) / DAY_MS) * 100}%`;

/** Hour of the day, 0 to 24 with fractions, of [ms] in [timeZone]. */
export const hourOfDay = (ms: number, timeZone: string): number =>
  ((((ms + offsetMinutesAt(ms, timeZone) * MS_PER_MINUTE) % DAY_MS) + DAY_MS) % DAY_MS) / MS_PER_HOUR;
