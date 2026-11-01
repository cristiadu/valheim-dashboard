import { beforeEach, describe, expect, it } from 'vitest';

import { logLine, readLines, RUN_START, TEST_OFFSET_MINUTES } from '#/lib/test-common';
import type { ServerState } from '#/lib/server/models';
import { addSavedBosses, createServerState, startNewLog } from '#/lib/server/server-state';

describe('server state', () => {
  let state: ServerState;

  beforeEach(() => {
    state = createServerState(TEST_OFFSET_MINUTES);
  });

  it('groups pieces into stretches per builder, split by long pauses and by destroyed pieces', () => {
    // GIVEN Ragnar builds three pieces, a piece of his is destroyed, and he builds again 20 minutes later
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Piece built: wood_floor_1x1 by Ragnar'),
      logLine('03:01:00', 'Piece built: wood_floor_1x1 by Ragnar'),
      logLine('03:05:00', 'Piece built: wood_fence by Ragnar'),
      logLine('03:06:00', 'Piece destroyed: wood_fence built by Ragnar'),
      logLine('03:25:00', 'Piece built: piece_chest_wood by Ragnar'),
    ]);

    // WHEN the activities are listed
    const { activities } = state.snapshot;

    // THEN pieces within 10 minutes share a stretch and the late chest starts a new one
    expect(activities).toEqual([
      {
        player: 'Ragnar',
        kind: 'built',
        startUtc: '2026-10-29T10:00:00.000Z',
        endUtc: '2026-10-29T10:05:00.000Z',
        things: { wood_floor_1x1: 2, wood_fence: 1 },
      },
      {
        player: 'Ragnar',
        kind: 'destroyed',
        startUtc: '2026-10-29T10:06:00.000Z',
        endUtc: '2026-10-29T10:06:00.000Z',
        things: { wood_fence: 1 },
      },
      {
        player: 'Ragnar',
        kind: 'built',
        startUtc: '2026-10-29T10:25:00.000Z',
        endUtc: '2026-10-29T10:25:00.000Z',
        things: { piece_chest_wood: 1 },
      },
    ]);
  });

  it('counts kills for every player who fought, and items per player', () => {
    // GIVEN a troll Ragnar and Bjorn fought, then Ragnar picks up wood and stores it
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Creature killed: Troll level 1 by Ragnar, Bjorn'),
      logLine('03:01:00', 'Picked up: Wood x20 by Ragnar'),
      logLine('03:02:00', 'Stored: Wood x15 in piece_chest_wood by Ragnar'),
    ]);

    // WHEN the activities are listed
    const kinds = state.snapshot.activities.map((activity) => [activity.player, activity.kind, activity.things]);

    // THEN the kill counts for both players and each item kind has its own stretch
    expect(kinds).toEqual([
      ['Ragnar', 'killed', { Troll: 1 }],
      ['Bjorn', 'killed', { Troll: 1 }],
      ['Ragnar', 'gathered', { Wood: 20 }],
      ['Ragnar', 'stored', { Wood: 15 }],
    ]);
  });

  it('counts an item as gathered only the first time anyone picks it up', () => {
    // GIVEN Ragnar harvests a dandelion and picks it up, then drops wood he carried and picks it up again
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Picked up: Dandelion x1 by Ragnar'),
      logLine('03:00:01', 'Harvested: Pickable_Dandelion by Ragnar'),
      logLine('03:01:00', 'Picked up again: Wood x20 by Ragnar'),
    ]);

    // WHEN the activities are listed
    const kinds = state.snapshot.activities.map((activity) => [activity.player, activity.kind, activity.things]);

    // THEN only the dandelion counts, once
    expect(kinds).toEqual([['Ragnar', 'gathered', { Dandelion: 1 }]]);
  });

  it('keeps areas, gear and global keys in the story only when they are news', () => {
    // GIVEN two visits to the Swamp, two trips into a dungeon, the same gear twice, a boss defeat and another key
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Area entered: Ragnar Swamp'),
      logLine('03:10:00', 'Area entered: Ragnar Dungeon'),
      logLine('03:20:00', 'Area entered: Ragnar Swamp'),
      logLine('03:30:00', 'Area entered: Ragnar Dungeon'),
      logLine('03:40:00', 'Gear: Ragnar SwordIron'),
      logLine('03:50:00', 'Gear: Ragnar SwordIron'),
      logLine('04:00:00', 'Global key set: defeated_eikthyr'),
      logLine('04:10:00', 'Global key set: nomap'),
    ]);

    // WHEN the story events are listed
    const events = state.snapshot.events.map((event) => event.type);

    // THEN only the first Swamp visit, both dungeon trips, the gear once and the boss defeat are kept
    expect(events).toEqual(['worldLoaded', 'areaEntered', 'areaEntered', 'areaEntered', 'gearSeen', 'globalKey']);
    expect(state.snapshot.visitedAreas).toEqual({ Ragnar: ['Swamp', 'Dungeon'] });
    expect(state.snapshot.gear).toEqual({ Ragnar: ['SwordIron'] });
  });

  it('tracks where players are, their kills, the day and the bosses defeated', () => {
    // GIVEN Ragnar moves to the Swamp, kills with Bjorn, a day starts and Eikthyr falls twice
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Area entered: Ragnar Meadows'),
      logLine('03:10:00', 'Area entered: Ragnar Swamp'),
      logLine('03:20:00', 'Creature killed: Draugr level 1 by Ragnar, Bjorn'),
      logLine('03:21:00', 'Creature killed: Draugr level 2 by Ragnar'),
      logLine('03:30:00', 'Day started: 42'),
      logLine('03:40:00', 'Global key set: defeated_eikthyr'),
      logLine('03:50:00', 'Global key set: defeated_eikthyr'),
    ]);

    // WHEN / THEN the snapshot knows each
    expect(state.snapshot.currentAreas).toEqual({ Ragnar: 'Swamp' });
    expect(state.snapshot.kills).toEqual({ Ragnar: { Draugr: 2 }, Bjorn: { Draugr: 1 } });
    expect(state.snapshot.day).toBe(42);
    expect(state.snapshot.defeatedBosses).toEqual(['Eikthyr']);
  });

  it('adds the bosses a world save marks as defeated, without a Saga line', () => {
    // GIVEN the log saw The Elder fall, and the save also knows Eikthyr and Bonemass from before the log was kept
    readLines(state, [...RUN_START, logLine('03:40:00', 'Global key set: defeated_gdking')]);
    const keys = ['activebosses 0', 'defeated_bonemass', 'defeated_eikthyr', 'defeated_gdking', 'killedtroll'];

    // WHEN the save's keys are added
    const isChanged = addSavedBosses(state.snapshot, keys);

    // THEN the older defeats follow the logged one in the order players meet them, and the Saga is unchanged
    expect(isChanged).toBe(true);
    expect(state.snapshot.defeatedBosses).toEqual(['The Elder', 'Eikthyr', 'Bonemass']);
    expect(state.snapshot.events.map((event) => event.type)).toEqual(['worldLoaded', 'globalKey']);
  });

  it('changes nothing when the save knows no new boss', () => {
    // GIVEN Eikthyr's defeat is in the log
    readLines(state, [...RUN_START, logLine('03:40:00', 'Global key set: defeated_eikthyr')]);

    // WHEN a save with the same defeat is added
    const isChanged = addSavedBosses(state.snapshot, ['defeated_eikthyr', 'killedtroll']);

    // THEN nothing changed
    expect(isChanged).toBe(false);
    expect(state.snapshot.defeatedBosses).toEqual(['Eikthyr']);
  });

  it('keeps chat and pings apart from the game events', () => {
    // GIVEN a shout and a ping
    readLines(state, [...RUN_START, logLine('03:00:00', 'Chat: Ragnar shouted: Troll!'), logLine('03:00:05', 'Ping: Ragnar at 1 2')]);

    // WHEN / THEN both are in the chat list
    expect(state.snapshot.chat).toEqual([
      { timeUtc: '2026-10-29T10:00:00.000Z', character: 'Ragnar', kind: 'shouted', text: 'Troll!' },
      { timeUtc: '2026-10-29T10:00:05.000Z', character: 'Ragnar', kind: 'ping', text: '' },
    ]);
  });

  it('reads the run details with times in UTC', () => {
    // GIVEN the start of a run
    // WHEN it is read
    readLines(state, RUN_START);

    // THEN the world, version, start, last line and the open session are known
    expect(state.snapshot).toMatchObject({
      world: 'Cotil',
      version: '1.0.21',
      startedUtc: '2026-10-29T09:42:15.000Z',
      lastLineUtc: '2026-10-29T09:43:13.000Z',
      stoppedUtc: null,
      isGameServerConnected: true,
    });
    expect(state.snapshot.sessions).toMatchObject([{ character: 'Ragnar', steamName: 'Tony Example', endUtc: null }]);
  });

  it('keeps game events and leaves out lines friends do not need', () => {
    // GIVEN a run with a death, a raid and an unknown line
    readLines(state, [
      ...RUN_START,
      logLine('03:10:02', 'Got character ZDOID from Ragnar : 0:0'),
      logLine('03:20:40', 'Random event set:army_eikthyr'),
      logLine('03:21:00', 'Some engine detail nobody needs'),
    ]);

    // WHEN the events are listed
    const types = state.snapshot.events.map((event) => event.type);

    // THEN the world load, death and raid are kept, the unknown line only moved the last line time
    expect(types).toEqual(['worldLoaded', 'playerDied', 'raidStarted']);
    expect(state.snapshot.lastLineUtc).toBe('2026-10-29T10:21:00.000Z');
  });

  it('records a finished save with its number, the backup and disk space', () => {
    // GIVEN a save, its backup and the disk check
    readLines(state, [
      logLine('03:52:15', 'Available space to current user: 278647042048. Saving is blocked if below: 14961108 bytes. Warnings are given if below: 29922216'),
      logLine('03:52:15', 'World save (1/5) Cloud & Backup checks done [0ms] => Save number 1189'),
      logLine('03:52:15', 'World save (5/5) done. Total time [40ms]'),
      logLine('03:52:16', 'Backup created in Cotil_backup_auto-20261029-035216 [23.522ms]'),
    ]);

    // WHEN / THEN each is recorded once
    expect(state.snapshot.saves).toEqual([{ timeUtc: '2026-10-29T10:52:15.000Z', durationMs: 40, saveNumber: 1189 }]);
    expect(state.snapshot.backups).toEqual([
      { timeUtc: '2026-10-29T10:52:16.000Z', backup: 'Cotil_backup_auto-20261029-035216' },
    ]);
    expect(state.snapshot.diskSpace).toMatchObject({ availableBytes: 278647042048, warnBelowBytes: 29922216 });
  });

  it('notes a clean stop and ends the sessions', () => {
    // GIVEN a run with a player inside
    readLines(state, RUN_START);

    // WHEN the server quits
    readLines(state, [logLine('16:19:51', 'Game server disconnected'), 'OnApplicationQuit']);

    // THEN the stop time is known and the session ended with it
    expect(state.snapshot.stoppedUtc).toBe('2026-10-29T23:19:51.000Z');
    expect(state.snapshot.runs).toMatchObject([{ startUtc: '2026-10-29T09:42:15.000Z', endReason: 'stopped' }]);
    expect(state.snapshot.steamDropsUtc).toEqual(['2026-10-29T23:19:51.000Z']);
    expect(state.snapshot.sessions[0]).toMatchObject({ endReason: 'serverStopped' });
  });

  it('ends open sessions as a crash when a new log starts, and keeps history', () => {
    // GIVEN a run with a player inside and no clean stop
    readLines(state, RUN_START);

    // WHEN the server writes a new log
    startNewLog(state);
    readLines(state, [logLine('05:00:00', 'Valheim version: 1.0.21 (network version 41)')]);

    // THEN the old session ended at the old log's last line, and the new run starts fresh
    expect(state.snapshot.sessions).toMatchObject([
      { character: 'Ragnar', endUtc: '2026-10-29T09:43:13.000Z', endReason: 'serverCrashed' },
    ]);
    expect(state.snapshot).toMatchObject({ world: null, startedUtc: '2026-10-29T12:00:00.000Z' });
    expect(state.snapshot.runs.map((run) => run.endReason)).toEqual(['crashed', null]);
    expect(state.snapshot.events.map((event) => event.type)).toEqual(['worldLoaded']);
  });
});
