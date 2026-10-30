import { describe, expect, it } from 'vitest';

import {
  clockTime,
  durationLabel,
  isServerOnline,
  offsetLabel,
  onlinePlayers,
  statusLine,
  steamLabel,
  whenLabel,
} from '#/lib/status';
import { MS_PER_MINUTE } from '#/lib/models';
import { sessionWith, snapshotWith, TEST_NOON_MS } from '#/lib/test-common';

/** A run that started at 09:42Z with its last line at 12:00Z and one player inside. */
const RUNNING = snapshotWith({
  startedUtc: '2026-10-29T09:42:15.000Z',
  lastLineUtc: '2026-10-29T12:00:00.000Z',
  sessions: [sessionWith({})],
});

/** The last line time of [RUNNING] plus [minutes]. */
const minutesAfterLastLine = (minutes: number): number => TEST_NOON_MS + minutes * MS_PER_MINUTE;

describe('isServerOnline', () => {
  it('is online while the last line is recent', () => {
    // GIVEN a run whose last line is 14 minutes old
    // WHEN / THEN it is online
    expect(isServerOnline(RUNNING, minutesAfterLastLine(14))).toBe(true);
  });

  it('is offline when the log went quiet', () => {
    // GIVEN a run whose last line is 16 minutes old, past the 10 minute save
    // WHEN / THEN it is offline and nobody is online
    expect(isServerOnline(RUNNING, minutesAfterLastLine(16))).toBe(false);
    expect(onlinePlayers(RUNNING, minutesAfterLastLine(16))).toEqual([]);
  });

  it('is offline right after a clean stop', () => {
    // GIVEN a run that stopped a minute ago
    const stopped = { ...RUNNING, stoppedUtc: '2026-10-29T12:00:00.000Z' };

    // WHEN / THEN it is offline
    expect(isServerOnline(stopped, minutesAfterLastLine(1))).toBe(false);
  });
});

describe('statusLine', () => {
  it('shows uptime, players and the viewer zone while online', () => {
    // GIVEN a run checked 5 minutes after its last line, by a viewer in UTC−7
    // WHEN the line is made
    const line = statusLine(RUNNING, minutesAfterLastLine(5), -420);

    // THEN it has the uptime from the first line, one player and the zone
    expect(line).toBe('Online · up 2h 22m · 1 online · times in UTC−7');
  });

  it('shows the last line time in the viewer zone while offline', () => {
    // GIVEN a quiet run seen by a viewer in UTC−3
    // WHEN the line is made
    const line = statusLine(RUNNING, minutesAfterLastLine(60), -180);

    // THEN the last line time is 12:00Z moved to UTC−3
    expect(line).toBe('Offline · last log line 09:00 · times in UTC−3');
  });

  it('says when no log was read yet', () => {
    // GIVEN an empty snapshot
    // WHEN / THEN the line says so
    expect(statusLine(snapshotWith({}), 0, 0)).toBe('No server log yet · times in UTC');
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
    // WHEN / THEN it is the evening before in UTC−7
    expect(clockTime('2026-10-29T02:30:00.000Z', -420)).toBe('19:30');
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
    expect(whenLabel('2026-10-29T09:15:00.000Z', 0, nowMs)).toBe('09:15');
    expect(whenLabel('2026-10-28T23:05:00.000Z', 0, nowMs)).toBe('Oct 28 23:05');
  });
});

describe('steamLabel', () => {
  it('names the Steam link in a word, or a dash before the log says', () => {
    // GIVEN each state of the Steam link
    // WHEN / THEN each reads as one word
    expect([steamLabel(true), steamLabel(false), steamLabel(null)]).toEqual(['Connected', 'Disconnected', '–']);
  });
});
