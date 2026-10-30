import { describe, expect, it } from 'vitest';

import { arcPath, clip, dayPercent, hourOfDay, wheelPoint } from '#/src/lib/day.ts';

describe('day helpers', () => {
  it('keeps only the part of a range inside the window', () => {
    // GIVEN a window from 10 to 20
    // WHEN ranges are clipped
    // THEN the overlap is kept and a range outside is dropped
    expect(clip(5, 15, 10, 20)).toEqual({ startMs: 10, endMs: 15 });
    expect(clip(1, 5, 10, 20)).toBeNull();
  });

  it('places a time as a share of the day', () => {
    // GIVEN a day that starts at 00:00Z
    const dayStartMs = Date.parse('2026-10-29T00:00:00.000Z');

    // WHEN noon and 06:00 are placed
    // THEN they sit at half and a quarter of the day
    expect(dayPercent(Date.parse('2026-10-29T12:00:00.000Z'), dayStartMs)).toBe('50%');
    expect(dayPercent(Date.parse('2026-10-29T06:00:00.000Z'), dayStartMs)).toBe('25%');
  });

  it('finds the hour of the day in the viewer zone', () => {
    // GIVEN 02:30Z
    // WHEN it is read in UTC−7
    // THEN it is 19:30 the day before
    expect(hourOfDay(Date.parse('2026-10-29T02:30:00.000Z'), -420)).toBe(19.5);
  });

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
});
