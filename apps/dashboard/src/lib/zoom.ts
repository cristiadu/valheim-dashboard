import { MAP_MAX_ZOOM, type MapBox } from '#/lib/models';

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
 * below 1 zooms out. The zoom stays between the whole map and [MAP_MAX_ZOOM] times it, inside [whole].
 */
export const zoomedBox = (box: MapBox, whole: MapBox, factor: number, x: number, y: number): MapBox => {
  const width = whole.width / clamp(zoomOf(box, whole) * factor, 1, MAP_MAX_ZOOM);
  const scale = width / box.width;
  const height = box.height * scale;
  return keptInside({ x: x - (x - box.x) * scale, y: y - (y - box.y) * scale, width, height }, whole);
};

/** Returns [box] moved [east] and [south] map units, kept inside [whole]. */
export const pannedBox = (box: MapBox, whole: MapBox, east: number, south: number): MapBox =>
  keptInside({ ...box, x: box.x + east, y: box.y + south }, whole);
