import { describe, expect, it } from 'vitest';

import { pannedBox, zoomedBox, zoomOf } from '#/lib/zoom';

/** The whole map in these tests: 100 by 100 units from the origin. */
const WHOLE = { x: 0, y: 0, width: 100, height: 100 };

describe('zoomedBox', () => {
  it('zooms around the pointed spot, and never past the whole map or the closest zoom', () => {
    // GIVEN the whole map
    // WHEN it zooms in twice around 20, 40, out past the whole map, and in far past the closest zoom
    const zoomedIn = zoomedBox(WHOLE, WHOLE, 2, 20, 40);
    const zoomedOut = zoomedBox(zoomedIn, WHOLE, 0.1, 20, 40);
    const closest = zoomedBox(WHOLE, WHOLE, 1000, 50, 50);

    // THEN the spot stays put, zooming out stops at the whole map, and zooming in stops at 16 times
    expect(zoomedIn).toEqual({ x: 10, y: 20, width: 50, height: 50 });
    expect(zoomedOut).toEqual(WHOLE);
    expect(zoomOf(closest, WHOLE)).toBe(16);
  });
});

describe('pannedBox', () => {
  it('moves a zoomed map and stops at its edges', () => {
    // GIVEN a map zoomed in twice on its top left quarter
    const box = { x: 0, y: 0, width: 50, height: 50 };

    // WHEN it moves 20 east, then far south and west
    const moved = pannedBox(box, WHOLE, 20, 0);
    const pushed = pannedBox(box, WHOLE, -500, 500);

    // THEN it moves 20 east, and stops at the left and bottom edges
    expect(moved).toEqual({ x: 20, y: 0, width: 50, height: 50 });
    expect(pushed).toEqual({ x: 0, y: 50, width: 50, height: 50 });
  });
});
