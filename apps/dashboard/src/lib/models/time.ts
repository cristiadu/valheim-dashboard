/** Milliseconds in one second. */
export const MS_PER_SECOND = 1000;

/** Milliseconds in one minute. */
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** Minutes in one hour. */
export const MINUTES_PER_HOUR = 60;

/** Hours in one day. */
export const HOURS_PER_DAY = 24;

/** Milliseconds in one hour. */
export const MS_PER_HOUR = MINUTES_PER_HOUR * MS_PER_MINUTE;

/** Milliseconds in one day. */
export const DAY_MS = HOURS_PER_DAY * MS_PER_HOUR;

/** Date and 24-hour clock parts read in a time zone, to find its offset from UTC. */
export const ZONE_CLOCK_OPTIONS: Intl.DateTimeFormatOptions = {
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
};

/** Month names for dates. */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Part of a time range that falls on one day in the viewer's zone. */
export type DayPart = {
  startMs: number;
  endMs: number;
  /** True when the part is before the viewer's last midnight. */
  isYesterday: boolean;
};
