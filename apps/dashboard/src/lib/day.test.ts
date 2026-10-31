import { describe, expect, it } from 'vitest';

import { arcPath, clip, dayParts, dayPercent, hourOfDay, midnightBeforeMs, wedgePath, wheelPoint } from '#/lib/day';
import { TEST_TIME_ZONE } from '#/lib/test-common';

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
    // WHEN it is read in Los Angeles
    // THEN it is 19:30 the day before
    expect(hourOfDay(Date.parse('2026-10-29T02:30:00.000Z'), TEST_TIME_ZONE)).toBe(19.5);
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

  it('finds the last midnight in the viewer zone', () => {
    // GIVEN 02:30Z on Oct 29, which is 19:30 on Oct 28 in Los Angeles
    // WHEN the last midnight is found
    // THEN it is Oct 28 00:00 in Los Angeles, which is 07:00Z
    expect(midnightBeforeMs(Date.parse('2026-10-29T02:30:00.000Z'), TEST_TIME_ZONE)).toBe(Date.parse('2026-10-28T07:00:00.000Z'));
  });

  it('keeps midnight in place on the day the clocks go back', () => {
    // GIVEN noon on Nov 1 in Los Angeles, after the clocks went back from UTC−7 to UTC−8 at 02:00
    // WHEN the last midnight is found
    // THEN it is still the midnight in UTC−7, which is 07:00Z
    expect(midnightBeforeMs(Date.parse('2026-11-01T20:00:00.000Z'), TEST_TIME_ZONE)).toBe(Date.parse('2026-11-01T07:00:00.000Z'));
  });

  it('splits a session that crosses midnight into yesterday and today', () => {
    // GIVEN 10:00Z now and a session from 22:00Z to 01:00Z the night before, in UTC
    const nowMs = Date.parse('2026-10-29T10:00:00.000Z');

    // WHEN it is split into days
    const parts = dayParts(Date.parse('2026-10-28T22:00:00.000Z'), Date.parse('2026-10-29T01:00:00.000Z'), nowMs, 'UTC');

    // THEN the part before midnight is yesterday and the rest is today
    expect(parts).toEqual([
      { startMs: Date.parse('2026-10-28T22:00:00.000Z'), endMs: Date.parse('2026-10-29T00:00:00.000Z'), isYesterday: true },
      { startMs: Date.parse('2026-10-29T00:00:00.000Z'), endMs: Date.parse('2026-10-29T01:00:00.000Z'), isYesterday: false },
    ]);
  });

  it('uses the viewer midnight, not the UTC one, to tell yesterday from today', () => {
    // GIVEN 03:00Z now (20:00 in Los Angeles) and a session from 01:00Z to 02:00Z (18:00 to 19:00 there)
    const nowMs = Date.parse('2026-10-29T03:00:00.000Z');

    // WHEN it is split into days in Los Angeles
    const parts = dayParts(Date.parse('2026-10-29T01:00:00.000Z'), Date.parse('2026-10-29T02:00:00.000Z'), nowMs, TEST_TIME_ZONE);

    // THEN all of it is today for that viewer
    expect(parts).toEqual([
      { startMs: Date.parse('2026-10-29T01:00:00.000Z'), endMs: Date.parse('2026-10-29T02:00:00.000Z'), isYesterday: false },
    ]);
  });

  it('keeps only the last 24 hours of a long session', () => {
    // GIVEN 10:00Z now and a session from two days ago that is still going, in UTC
    const nowMs = Date.parse('2026-10-29T10:00:00.000Z');

    // WHEN it is split into days
    const parts = dayParts(Date.parse('2026-10-27T08:00:00.000Z'), nowMs, nowMs, 'UTC');

    // THEN yesterday starts 24 hours ago and today ends now
    expect(parts).toEqual([
      { startMs: Date.parse('2026-10-28T10:00:00.000Z'), endMs: Date.parse('2026-10-29T00:00:00.000Z'), isYesterday: true },
      { startMs: Date.parse('2026-10-29T00:00:00.000Z'), endMs: nowMs, isYesterday: false },
    ]);
  });

  it('draws a wedge from the center out to the rim', () => {
    // GIVEN the wedge from 18:00 to midnight at radius 100
    // WHEN its path is made
    // THEN it starts at the center, goes out to 18:00 and arcs round to the top
    expect(wedgePath(18, 24, 100)).toBe('M 150 150 L 50.0 150.0 A 100 100 0 0 1 150.0 50.0 Z');
  });
});
