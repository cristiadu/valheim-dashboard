import { describe, expect, it } from 'vitest';

import { pannedBox, scaleBarOf, zoomedBox } from '#/lib/zoom';

/** The whole map in these tests: 1000 by 1000 units from the origin. */
const WHOLE = { x: 0, y: 0, width: 1000, height: 1000 };

describe('zoomedBox', () => {
  it('zooms around the pointed spot, and never past the whole map or the narrowest view', () => {
    // GIVEN the whole map, a 1000 by 500 map, and a tall view of a wide map
    // WHEN the whole map zooms in twice around 200, 400 and back out past it, the 1000 by 500 map zooms in far,
    // and the tall view zooms far out
    const zoomedIn = zoomedBox(WHOLE, WHOLE, 2, 200, 400);
    const zoomedOut = zoomedBox(zoomedIn, WHOLE, 0.1, 200, 400);
    const big = { x: 0, y: 0, width: 1000, height: 500 };
    const closest = zoomedBox(big, big, 1000, 500, 250);
    const tall = zoomedBox({ x: 0, y: 0, width: 500, height: 1000 }, { x: 0, y: 0, width: 4000, height: 2000 }, 0.1, 250, 500);

    // THEN the spot stays put, zooming out stops at the whole map, zooming in stops when the short side is 128,
    // and a tall view zooms out only until it is as tall as the whole map
    expect(zoomedIn).toEqual({ x: 100, y: 200, width: 500, height: 500 });
    expect(zoomedOut).toEqual(WHOLE);
    expect(closest).toEqual({ x: 372, y: 186, width: 256, height: 128 });
    expect(tall).toEqual({ x: 0, y: 0, width: 1000, height: 2000 });
  });
});

describe('pannedBox', () => {
  it('moves a zoomed map and stops at its edges', () => {
    // GIVEN a map zoomed in twice on its top left quarter
    const box = { x: 0, y: 0, width: 500, height: 500 };

    // WHEN it moves 200 east, then far south and west
    const moved = pannedBox(box, WHOLE, 200, 0);
    const pushed = pannedBox(box, WHOLE, -5000, 5000);

    // THEN it moves 200 east, and stops at the left and bottom edges
    expect(moved).toEqual({ x: 200, y: 0, width: 500, height: 500 });
    expect(pushed).toEqual({ x: 0, y: 500, width: 500, height: 500 });
  });
});

describe('scaleBarOf', () => {
  it('picks the longest plain distance that fits the bar', () => {
    // GIVEN a map at 2 m per pixel, and one at 30 m per pixel
    // WHEN their scale bars are made
    const close = scaleBarOf(2);
    const far = scaleBarOf(30);

    // THEN the close one shows 200 m in 100 px, and the far one 2 km in about 67 px
    expect(close).toEqual({ px: 100, label: '200 m' });
    expect(far.label).toBe('2 km');
    expect(far.px).toBeCloseTo(66.67, 2);
  });
});
