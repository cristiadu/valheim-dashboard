import { describe, expect, it } from 'vitest';

import { MS_PER_MINUTE } from '#/lib/models';
import { gigabytesLabel, isServerOnline, onlinePlayers, serverWarnings, statusLine, upStretches } from '#/lib/status';
import { sessionWith, snapshotWith, TEST_NOON_MS, TEST_TIME_ZONE } from '#/lib/test-common';

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
    // GIVEN a run checked 5 minutes after its last line, by a viewer in Los Angeles (UTC−7 in October)
    // WHEN the line is made
    const line = statusLine(RUNNING, minutesAfterLastLine(5), TEST_TIME_ZONE);

    // THEN it has the uptime from the first line, one player and the zone
    expect(line).toBe('Up 2h 22m · 1 online · times in UTC−7');
  });

  it('shows the last line time in the viewer zone while offline', () => {
    // GIVEN a quiet run seen by a viewer in São Paulo (UTC−3)
    // WHEN the line is made
    const line = statusLine(RUNNING, minutesAfterLastLine(60), 'America/Sao_Paulo');

    // THEN the last line time is 12:00Z moved to UTC−3
    expect(line).toBe('Last log line 09:00 · times in UTC−3');
  });

  it('says when no log was read yet', () => {
    // GIVEN an empty snapshot
    // WHEN / THEN the line says so
    expect(statusLine(snapshotWith({}), 0, 'UTC')).toBe('No server log yet · times in UTC');
  });
});

describe('gigabytesLabel', () => {
  it('rounds free bytes to whole gigabytes', () => {
    // GIVEN the free space from a real disk check
    // WHEN / THEN it reads in whole gigabytes
    expect(gigabytesLabel(278647042048)).toBe('279 GB');
  });
});

describe('serverWarnings', () => {
  it('lists crashes, Steam drops and low disk, newest first', () => {
    // GIVEN a crashed run, a Steam drop and a disk under the warning size
    const snapshot = snapshotWith({
      runs: [{ startUtc: '2026-10-29T01:00:00.000Z', lastLineUtc: '2026-10-29T03:00:00.000Z', endReason: 'crashed' }],
      steamDropsUtc: ['2026-10-29T05:00:00.000Z'],
      diskSpace: { timeUtc: '2026-10-29T06:00:00.000Z', availableBytes: 20e6, warnBelowBytes: 29e6, blockedBelowBytes: 15e6 },
    });

    // WHEN warnings are listed
    const warnings = serverWarnings(snapshot).map((warning) => [warning.kind, warning.text]);

    // THEN each problem has its kind and reads plainly, newest first
    expect(warnings).toEqual([
      ['disk', 'Disk almost full: 0.0 GB free'],
      ['steam', 'Server lost its Steam connection'],
      ['crash', 'Server went down without a clean stop'],
    ]);
  });
});

describe('upStretches', () => {
  it('keeps the last 24 hours of each run and runs the live one to now', () => {
    // GIVEN a run that stopped yesterday morning and a live run since 08:00
    const snapshot = snapshotWith({
      lastLineUtc: '2026-10-29T11:59:00.000Z',
      runs: [
        { startUtc: '2026-10-28T06:00:00.000Z', lastLineUtc: '2026-10-28T14:00:00.000Z', endReason: 'stopped' },
        { startUtc: '2026-10-29T08:00:00.000Z', lastLineUtc: '2026-10-29T11:59:00.000Z', endReason: null },
      ],
    });

    // WHEN the stretches are found at noon
    const stretches = upStretches(snapshot, TEST_NOON_MS);

    // THEN the old run starts at the window edge and the live run ends now
    expect(stretches).toEqual([
      { startMs: Date.parse('2026-10-28T12:00:00.000Z'), endMs: Date.parse('2026-10-28T14:00:00.000Z') },
      { startMs: Date.parse('2026-10-29T08:00:00.000Z'), endMs: TEST_NOON_MS },
    ]);
  });
});
