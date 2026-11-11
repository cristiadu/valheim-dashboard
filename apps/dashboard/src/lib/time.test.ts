import { describe, expect, it } from 'vitest';

import { MS_PER_MINUTE } from '#/lib/models/time';
import { TEST_NOON_MS, TEST_TIME_ZONE } from '#/lib/test-common';
import {
  clip,
  clockTime,
  dayParts,
  dayPercent,
  durationLabel,
  hourOfDay,
  midnightBeforeMs,
  offsetLabel,
  offsetMinutesAt,
  whenLabel,
} from '#/lib/time';

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
});

describe('formatting', () => {
  it('names offsets with hours and minutes', () => {
    // GIVEN offsets west, east and half-hour
    // WHEN / THEN they read like zone names
    expect([offsetLabel(-420), offsetLabel(60), offsetLabel(330)]).toEqual(['UTC−7', 'UTC+1', 'UTC+5:30']);
  });

  it('moves a UTC time to a zone clock', () => {
    // GIVEN 02:30Z
    // WHEN / THEN it is the evening before in Los Angeles
    expect(clockTime('2026-10-29T02:30:00.000Z', TEST_TIME_ZONE)).toBe('19:30');
  });

  it('shows hours only past an hour', () => {
    // GIVEN 12 minutes and 3h 5m
    // WHEN / THEN they read short
    expect([durationLabel(12 * MS_PER_MINUTE), durationLabel(185 * MS_PER_MINUTE)]).toEqual(['12m', '3h 5m']);
  });
});

describe('whenLabel', () => {
  it('shows only the time today and adds the date for other days', () => {
    // GIVEN noon on Oct 29 in UTC
    const nowMs = Date.parse('2026-10-29T12:00:00.000Z');

    // WHEN a time today and one the day before are labeled
    // THEN only the older one has a date
    expect(whenLabel('2026-10-29T09:15:00.000Z', 'UTC', nowMs)).toBe('09:15');
    expect(whenLabel('2026-10-28T23:05:00.000Z', 'UTC', nowMs)).toBe('Oct 28 23:05');
  });

  it('keeps the clock a time had before daylight saving ended', () => {
    // GIVEN Nov 2 in Los Angeles, after clocks went back on Nov 1
    const nowMs = Date.parse('2026-11-02T20:00:00.000Z');

    // WHEN an evening on Oct 31 and one on Nov 1 are labeled
    // THEN each shows the clock of its own day: 19:30 both times
    expect(whenLabel('2026-11-01T02:30:00.000Z', TEST_TIME_ZONE, nowMs)).toBe('Oct 31 19:30');
    expect(whenLabel('2026-11-02T03:30:00.000Z', TEST_TIME_ZONE, nowMs)).toBe('Nov 1 19:30');
  });
});

describe('offsetMinutesAt', () => {
  it('follows daylight saving time', () => {
    // GIVEN the moments just before and after clocks went back in Los Angeles
    // WHEN / THEN the offset moves from UTC−7 to UTC−8
    expect(offsetMinutesAt(Date.parse('2026-11-01T08:59:59.000Z'), TEST_TIME_ZONE)).toBe(-420);
    expect(offsetMinutesAt(Date.parse('2026-11-01T09:00:00.000Z'), TEST_TIME_ZONE)).toBe(-480);
  });

  it('reads half-hour zones and UTC', () => {
    // GIVEN noon on the test day
    // WHEN / THEN Kolkata is UTC+5:30 and UTC is 0
    expect(offsetMinutesAt(TEST_NOON_MS, 'Asia/Kolkata')).toBe(330);
    expect(offsetMinutesAt(TEST_NOON_MS, 'UTC')).toBe(0);
  });
});
