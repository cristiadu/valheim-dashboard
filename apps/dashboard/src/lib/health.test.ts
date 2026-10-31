import { describe, expect, it } from 'vitest';

import { gigabytesLabel, serverWarnings, upStretches } from '#/lib/health';
import { snapshotWith, TEST_NOON_MS } from '#/lib/test-common';

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
