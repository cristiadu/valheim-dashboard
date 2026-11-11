import { HOURS_PER_DAY } from '#/lib/models/time';
import { WHEEL_CENTER, WHEEL_MAX_ARC_HOURS, WHEEL_MIN_ARC_HOURS } from '#/lib/models/wheel';

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
