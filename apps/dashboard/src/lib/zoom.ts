import { MAP_MIN_VIEW_METERS, MAP_SCALE_BAR_PX, MAP_SCALE_STEPS_METERS, MAP_WORLD_BOX, type MapBox, METERS_PER_KM } from '#/lib/models';

/** Returns [value] kept between [low] and [high]. */
const clamp = (value: number, low: number, high: number): number => Math.min(Math.max(value, low), high);

/** Returns [box] moved so it stays inside [whole], the part of the map that fits everything. */
const keptInside = (box: MapBox, whole: MapBox): MapBox => ({
  ...box,
  x: clamp(box.x, whole.x, whole.x + whole.width - box.width),
  y: clamp(box.y, whole.y, whole.y + whole.height - box.height),
});

/** Returns how many times [box] zooms into [whole], 1 for the whole map. */
export const zoomOf = (box: MapBox, whole: MapBox): number => whole.width / box.width;

/**
 * Returns [box] zoomed in [factor] times around the map spot [x], [y], which stays under the pointer. A factor
 * below 1 zooms out. The view keeps its shape, fits inside [whole], and its short side stays at least
 * [MAP_MIN_VIEW_METERS].
 */
export const zoomedBox = (box: MapBox, whole: MapBox, factor: number, x: number, y: number): MapBox => {
  const largest = Math.min(whole.width / box.width, whole.height / box.height);
  const smallest = Math.min(1, largest, MAP_MIN_VIEW_METERS / Math.min(box.width, box.height));
  const scale = clamp(1 / factor, smallest, largest);
  const width = box.width * scale;
  const height = box.height * scale;
  return keptInside({ x: x - (x - box.x) * scale, y: y - (y - box.y) * scale, width, height }, whole);
};

/** Returns [box] moved [east] and [south] map units, kept inside [whole]. */
export const pannedBox = (box: MapBox, whole: MapBox, east: number, south: number): MapBox =>
  keptInside({ ...box, x: box.x + east, y: box.y + south }, whole);

/**
 * Returns the scale bar for a map drawn at [metersPerPixel]: the longest plain distance that fits in about
 * [MAP_SCALE_BAR_PX], how many pixels long it is, and its label, such as `500 m` or `2 km`.
 */
export const scaleBarOf = (metersPerPixel: number): { px: number; label: string } => {
  const target = MAP_SCALE_BAR_PX * metersPerPixel;
  const meters = MAP_SCALE_STEPS_METERS.findLast((step) => step <= target) ?? MAP_SCALE_STEPS_METERS[0]!;
  const label = meters >= METERS_PER_KM ? `${meters / METERS_PER_KM} km` : `${meters} m`;
  return { px: meters / metersPerPixel, label };
};

/**
 * Returns a square around the middle of [box], as wide as its longest side, kept inside the whole world. The map
 * opens on it, so zooming out keeps the world's square shape until it shows the whole world.
 */
export const squareBoxOf = (box: MapBox): MapBox => {
  const side = Math.min(Math.max(box.width, box.height), MAP_WORLD_BOX.width);
  const square = { x: box.x + (box.width - side) / 2, y: box.y + (box.height - side) / 2, width: side, height: side };
  return keptInside(square, MAP_WORLD_BOX);
};
