import {
  DAY_MS,
  type DayPart,
  HOURS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  WHEEL_CENTER,
  WHEEL_MAX_ARC_HOURS,
  WHEEL_MIN_ARC_HOURS,
} from '#/lib/models';
import { offsetMinutesAt } from '#/lib/status';

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

/** Point on the wheel at [hour] and [radius]. Midnight is at the top and time runs clockwise. */
export const wheelPoint = (hour: number, radius: number): [number, number] => {
  const angle = (hour / HOURS_PER_DAY) * 2 * Math.PI - Math.PI / 2;
  return [WHEEL_CENTER + radius * Math.cos(angle), WHEEL_CENTER + radius * Math.sin(angle)];
};

/** SVG path of an arc on the wheel from [startHour] to [endHour], clockwise, at [radius]. */
export const arcPath = (startHour: number, endHour: number, radius: number): string => {
  const span = Math.min(endHour - startHour + (endHour < startHour ? HOURS_PER_DAY : 0), WHEEL_MAX_ARC_HOURS);
  const isLongArc = span > HOURS_PER_DAY / 2;
  const [x1, y1] = wheelPoint(startHour, radius);
  const [x2, y2] = wheelPoint(startHour + Math.max(span, WHEEL_MIN_ARC_HOURS), radius);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 ${isLongArc ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};

/** SVG path of a wedge of the wheel from [startHour] to [endHour], clockwise, from the center out to [radius]. */
export const wedgePath = (startHour: number, endHour: number, radius: number): string =>
  `M ${WHEEL_CENTER} ${WHEEL_CENTER} L${arcPath(startHour, endHour, radius).slice(1)} Z`;
