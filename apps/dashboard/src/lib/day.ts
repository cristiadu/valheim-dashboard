import { DAY_MS, MS_PER_MINUTE } from './models';

/** Center of the day wheel in its 300 by 300 drawing. */
export const WHEEL_CENTER = 150;

/** Milliseconds in one hour. */
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

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

/** Hour of the day, 0 to 24 with fractions, of [ms] in the zone at [offsetMinutes] from UTC. */
export const hourOfDay = (ms: number, offsetMinutes: number): number =>
  ((((ms + offsetMinutes * MS_PER_MINUTE) % DAY_MS) + DAY_MS) % DAY_MS) / MS_PER_HOUR;

/** Point on the wheel at [hour] and [radius]. Midnight is at the top and time runs clockwise. */
export const wheelPoint = (hour: number, radius: number): [number, number] => {
  const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2;
  return [WHEEL_CENTER + radius * Math.cos(angle), WHEEL_CENTER + radius * Math.sin(angle)];
};

/** SVG path of an arc on the wheel from [startHour] to [endHour], clockwise, at [radius]. */
export const arcPath = (startHour: number, endHour: number, radius: number): string => {
  const span = Math.min(endHour - startHour + (endHour < startHour ? 24 : 0), 23.99);
  const [x1, y1] = wheelPoint(startHour, radius);
  const [x2, y2] = wheelPoint(startHour + Math.max(span, 0.05), radius);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 ${span > 12 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};
