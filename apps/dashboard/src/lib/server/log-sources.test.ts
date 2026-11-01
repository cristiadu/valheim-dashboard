import { beforeEach, describe, expect, it } from 'vitest';

import { logLine, readLines, RUN_START, TEST_OFFSET_MINUTES } from '#/lib/test-common';
import type { ServerState } from '#/lib/server/models';
import { createServerState, startNewLog } from '#/lib/server/server-state';

describe('keepSourceLines', () => {
  let state: ServerState;

  beforeEach(() => {
    state = createServerState(TEST_OFFSET_MINUTES);
  });

  it('keeps the line behind each number and item of a player', () => {
    // GIVEN Ragnar joins, gets gear, goes to the Swamp, kills a Draugr with Bjorn, dies and leaves
    readLines(state, [
      ...RUN_START,
      logLine('02:50:00', 'Gear: Ragnar SpearFlint quality 2'),
      logLine('02:51:00', 'Gear: Ragnar SpearFlint quality 3'),
      logLine('02:52:00', 'Area entered: Ragnar Swamp'),
      logLine('02:53:00', 'Creature killed: Draugr level 1 by Ragnar, Bjorn'),
      logLine('02:54:00', 'Got character ZDOID from Ragnar : 0:0'),
      logLine('02:54:01', 'Player died: Ragnar in Swamp while fighting Draugr'),
      logLine('02:59:00', 'Destroying abandoned non persistent zdo 549297305:7 owner 549297305'),
    ]);

    // WHEN the lines are read back
    const lines = (key: string): string[] => state.snapshot.sources[key]!.lines.map((record) => record.line);

    // THEN each line sits behind what it counts
    expect(lines('visits:Ragnar')).toEqual([
      '10/29/2026 02:43:13: Got character ZDOID from Ragnar : 549297305:1',
      '10/29/2026 02:59:00: Destroying abandoned non persistent zdo 549297305:7 owner 549297305',
    ]);
    expect(lines('gear:Ragnar:SpearFlint')).toEqual([
      '10/29/2026 02:50:00: Gear: Ragnar SpearFlint quality 2',
      '10/29/2026 02:51:00: Gear: Ragnar SpearFlint quality 3',
    ]);
    expect(lines('area:Ragnar:Swamp')).toEqual(['10/29/2026 02:52:00: Area entered: Ragnar Swamp']);
    expect(lines('kills:Bjorn')).toEqual(['10/29/2026 02:53:00: Creature killed: Draugr level 1 by Ragnar, Bjorn']);
    expect(lines('killed:Ragnar:Draugr')).toEqual(['10/29/2026 02:53:00: Creature killed: Draugr level 1 by Ragnar, Bjorn']);
    expect(lines('deaths:Ragnar')).toEqual([
      '10/29/2026 02:54:00: Got character ZDOID from Ragnar : 0:0',
      '10/29/2026 02:54:01: Player died: Ragnar in Swamp while fighting Draugr',
    ]);
    expect(state.snapshot.sources['visits:Ragnar']!.lines.map(({ timeUtc, kind }) => [timeUtc, kind])).toEqual([
      ['2026-10-29T09:43:13.000Z', 'joined'],
      ['2026-10-29T09:59:00.000Z', 'left'],
    ]);
    expect(state.snapshot.sources['gear:Ragnar:SpearFlint']!.lines[0]!.kind).toBe('items');
  });

  it('keeps only the latest 50 lines but counts them all', () => {
    // GIVEN Ragnar kills 60 greydwarfs
    const kills = Array.from({ length: 60 }, (_, i) => logLine(`03:${String(i).padStart(2, '0')}:00`, 'Creature killed: Greydwarf level 1 by Ragnar'));
    readLines(state, [...RUN_START, ...kills]);

    // WHEN the kill lines are read back
    const source = state.snapshot.sources['kills:Ragnar']!;

    // THEN the 50 newest are kept and all 60 are counted
    expect(source.total).toBe(60);
    expect(source.lines).toHaveLength(50);
    expect(source.lines[0]!.line).toBe('10/29/2026 03:10:00: Creature killed: Greydwarf level 1 by Ragnar');
  });

  it('keeps the lines behind the server numbers', () => {
    // GIVEN a run with a save, a backup, a lost Steam connection and Eikthyr defeated
    readLines(state, [
      ...RUN_START,
      logLine('03:52:15', 'World save (5/5) done. Total time [40ms]'),
      logLine('03:52:16', 'Backup created in Cotil_backup_auto-20261029-035216 [23.522ms]'),
      logLine('03:53:00', 'Game server disconnected'),
      logLine('03:54:00', 'Global key set: defeated_eikthyr'),
    ]);

    // WHEN the lines are read back
    const lines = (key: string): string[] => state.snapshot.sources[key]!.lines.map((record) => `${record.kind} ${record.line}`);

    // THEN each server number has its line, and the newest line is kept on its own
    expect(lines('runs')).toEqual(['world 10/29/2026 02:42:18: ZNet.LoadWorld: Cotil (Cotil), save number 1183']);
    expect(lines('saves')).toEqual(['world 10/29/2026 03:52:15: World save (5/5) done. Total time [40ms]']);
    expect(lines('backups')).toEqual(['world 10/29/2026 03:52:16: Backup created in Cotil_backup_auto-20261029-035216 [23.522ms]']);
    expect(lines('steam')).toEqual([
      'world 10/29/2026 02:42:23: Game server connected',
      'stopped 10/29/2026 03:53:00: Game server disconnected',
    ]);
    expect(lines('boss:Eikthyr')).toEqual(['boss 10/29/2026 03:54:00: Global key set: defeated_eikthyr']);
    expect(lines('latest')).toEqual(['world 10/29/2026 03:54:00: Global key set: defeated_eikthyr']);
  });

  it('keeps the last line before a crash', () => {
    // GIVEN a run that ends without a clean stop
    readLines(state, RUN_START);

    // WHEN a new log starts
    startNewLog(state);

    // THEN its last line is kept as the crash line
    expect(state.snapshot.sources.crashes!.lines).toEqual([
      { timeUtc: '2026-10-29T09:43:13.000Z', line: '10/29/2026 02:43:13: Got character ZDOID from Ragnar : 549297305:1', kind: 'stopped' },
    ]);
  });
});
