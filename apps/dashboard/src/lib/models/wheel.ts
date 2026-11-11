/** Width and height of the day wheel drawing. */
export const WHEEL_SIZE = 300;

/** Center of the day wheel in its drawing. */
export const WHEEL_CENTER = WHEEL_SIZE / 2;

/** Radius of the day wheel's outer circle. Hour ticks start here. */
export const WHEEL_RIM_RADIUS = 134;

/** Radius where the long hour ticks, every 6 hours, end. */
export const WHEEL_LONG_TICK_RADIUS = 124;

/** Radius where the short hour ticks end. */
export const WHEEL_SHORT_TICK_RADIUS = 129;

/** Length of the clock hand that points at now. */
export const WHEEL_HAND_RADIUS = 128;

/** Radius of the first player's ring. */
export const WHEEL_OUTER_RING_RADIUS = 118;

/** Space between two players' rings. */
export const WHEEL_RING_STEP = 14;

/** Longest arc on the wheel, in hours. A full 24-hour circle cannot be drawn as one SVG arc. */
export const WHEEL_MAX_ARC_HOURS = 23.99;

/** Shortest arc on the wheel, in hours, so a short session still shows. */
export const WHEEL_MIN_ARC_HOURS = 0.05;

/** Radius of the "today" and "yesterday" labels, inside the smallest player ring. */
export const WHEEL_DAY_LABEL_RADIUS = 58;

/** Smallest part of the wheel, in hours, that gets a "today" or "yesterday" label. */
export const WHEEL_MIN_LABEL_HOURS = 2;

/** Hours between the time labels above the Vikings lanes. */
export const LANE_AXIS_STEP_HOURS = 4;
