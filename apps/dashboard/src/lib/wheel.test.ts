import { describe, expect, it } from 'vitest';

import { arcPath, wedgePath, wheelPoint } from '#/lib/wheel';

describe('wheel', () => {
  it('puts midnight at the top and 6 on the right', () => {
    // GIVEN radius 100
    // WHEN points are placed
    const [topX, topY] = wheelPoint(0, 100);
    const [rightX, rightY] = wheelPoint(6, 100);

    // THEN they sit at the top and right of the center
    expect([Math.round(topX), Math.round(topY), Math.round(rightX), Math.round(rightY)]).toEqual([150, 50, 250, 150]);
  });

  it('draws the long way round only for arcs over 12 hours', () => {
    // GIVEN an arc from 22:00 to 02:00 and one from 01:00 to 23:00
    // WHEN paths are made
    // THEN only the second uses the large arc flag
    expect(arcPath(22, 2, 100)).toContain(' 0 0 1 ');
    expect(arcPath(1, 23, 100)).toContain(' 0 1 1 ');
  });

  it('draws a wedge from the center out to the rim', () => {
    // GIVEN the wedge from 18:00 to midnight at radius 100
    // WHEN its path is made
    // THEN it starts at the center, goes out to 18:00 and arcs round to the top
    expect(wedgePath(18, 24, 100)).toBe('M 150 150 L 50.0 150.0 A 100 100 0 0 1 150.0 50.0 Z');
  });
});
