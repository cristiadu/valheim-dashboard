import { beforeEach, describe, expect, it } from 'vitest';

import { logLine, readLines, RUN_START, TEST_OFFSET_MINUTES } from '#/lib/test-common';
import type { ServerState } from '#/lib/server/models';
import { addSavedBosses, createServerState, startNewLog } from '#/lib/server/server-state';
import { setTerrain } from '#/lib/server/terrain';

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
    const activities = state.snapshot.activities.map(({ source, ...activity }) => ({ ...activity, lines: source.lines.length }));

    // THEN pieces within 10 minutes share a stretch and the late chest starts a new one, each with its log lines
    expect(activities).toEqual([
      {
        player: 'Ragnar',
        kind: 'built',
        startUtc: '2026-10-29T10:00:00.000Z',
        endUtc: '2026-10-29T10:05:00.000Z',
        things: { wood_floor_1x1: 2, wood_fence: 1 },
        lines: 3,
      },
      {
        player: 'Ragnar',
        kind: 'destroyed',
        startUtc: '2026-10-29T10:06:00.000Z',
        endUtc: '2026-10-29T10:06:00.000Z',
        things: { wood_fence: 1 },
        lines: 1,
      },
      {
        player: 'Ragnar',
        kind: 'built',
        startUtc: '2026-10-29T10:25:00.000Z',
        endUtc: '2026-10-29T10:25:00.000Z',
        things: { piece_chest_wood: 1 },
        lines: 1,
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

  it('keeps each player\'s activity totals and their log lines, past the stretches kept', () => {
    // GIVEN Ragnar builds twice an hour apart and picks up wood
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Piece built: wood_floor_1x1 by Ragnar'),
      logLine('04:00:00', 'Piece built: wood_fence by Ragnar'),
      logLine('04:01:00', 'Picked up: Wood x20 by Ragnar'),
    ]);

    // WHEN the totals and the building lines are read
    const { activityTotals, sources } = state.snapshot;

    // THEN both stretches count, items count by amount, and each built line is behind the number
    expect(activityTotals).toEqual({ Ragnar: { built: 2, gathered: 20 } });
    expect(sources['activity:Ragnar:built']?.total).toBe(2);
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

  it('keeps planting, eating, smelting, trees and rocks as activities per player', () => {
    // GIVEN Ragnar plants, eats, fills a smelter, cuts a tree and mines a rock
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Planted: sapling_carrot by Ragnar'),
      logLine('03:01:00', 'Ate: Ragnar CookedMeat'),
      logLine('03:02:00', 'Smelting: CopperOre x3 in smelter by Ragnar'),
      logLine('03:03:00', 'Tree cut: Beech1 by Ragnar'),
      logLine('03:04:00', 'Rock mined: rock4_copper by Ragnar'),
    ]);

    // WHEN the activities are listed
    const kinds = state.snapshot.activities.map((activity) => [activity.player, activity.kind, activity.things]);

    // THEN each has its own kind
    expect(kinds).toEqual([
      ['Ragnar', 'planted', { sapling_carrot: 1 }],
      ['Ragnar', 'ate', { CookedMeat: 1 }],
      ['Ragnar', 'smelted', { CopperOre: 3 }],
      ['Ragnar', 'cut', { Beech1: 1 }],
      ['Ragnar', 'mined', { rock4_copper: 1 }],
    ]);
  });

  it('keeps cooking, brewing and steering ships as activities per player', () => {
    // GIVEN Inge Dragonchow cooks twice, starts a mead and steers a karve
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Cooking: RawMeat on piece_cookingstation by Inge Dragonchow'),
      logLine('03:00:30', 'Cooking: RawMeat on piece_cookingstation by Inge Dragonchow'),
      logLine('03:01:00', 'Fermenting: MeadBaseTasty in fermenter by Inge Dragonchow'),
      logLine('03:02:00', 'Sailing: Inge Dragonchow on Karve'),
    ]);

    // WHEN the activities are listed
    const kinds = state.snapshot.activities.map((activity) => [activity.player, activity.kind, activity.things]);

    // THEN each has its own kind, and the two cooking lines count as one stretch
    expect(kinds).toEqual([
      ['Inge Dragonchow', 'cooked', { RawMeat: 2 }],
      ['Inge Dragonchow', 'brewed', { MeadBaseTasty: 1 }],
      ['Inge Dragonchow', 'sailed', { Karve: 1 }],
    ]);
  });

  it('keeps crafting station visits and emotes as activities per player', () => {
    // GIVEN Yan opens the forge and the workbench, and waves twice
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Crafting: Yan at forge'),
      logLine('03:00:30', 'Crafting: Yan at piece_workbench'),
      logLine('03:01:00', 'Emote: Yan wave'),
      logLine('03:01:10', 'Emote: Yan wave'),
    ]);

    // WHEN the activities are listed
    const kinds = state.snapshot.activities.map((activity) => [activity.player, activity.kind, activity.things]);

    // THEN each kind is one stretch
    expect(kinds).toEqual([
      ['Yan', 'crafted', { forge: 1, piece_workbench: 1 }],
      ['Yan', 'emoted', { wave: 2 }],
    ]);
  });

  it('keeps items made, upgrades, powers, rides, carts, meals, fuel, repairs and obliterating as activities per player', () => {
    // GIVEN Yan makes arrows, upgrades a sword, uses his power twice, rides, pulls a cart, eats, fuels, repairs and obliterates
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Made: ArrowFlint x20 by Yan'),
      logLine('03:00:30', 'Made: ArrowFlint x10 by Yan'),
      logLine('03:01:00', 'Upgraded: SwordBronze to level 2 by Yan'),
      logLine('03:01:10', 'Power used: Yan'),
      logLine('03:01:20', 'Power used: Yan'),
      logLine('03:01:30', 'Riding: Yan on Lox'),
      logLine('03:01:40', 'Pulling cart: Yan with Cart'),
      logLine('03:01:50', 'Ate something: Yan'),
      logLine('03:02:00', 'Fueled: fire_pit by Yan'),
      logLine('03:02:10', 'Repaired: wood_wall by Yan'),
      logLine('03:02:20', 'Repaired: wood_wall by Yan'),
      logLine('03:02:30', 'Obliterated: Resin x20 in incinerator by Yan'),
    ]);

    // WHEN the activities are listed
    const kinds = state.snapshot.activities.map((activity) => [activity.player, activity.kind, activity.things]);

    // THEN each kind is one stretch
    expect(kinds).toEqual([
      ['Yan', 'made', { ArrowFlint: 30 }],
      ['Yan', 'upgraded', { SwordBronze: 1 }],
      ['Yan', 'powered', { power: 2 }],
      ['Yan', 'rode', { Lox: 1 }],
      ['Yan', 'pulled', { Cart: 1 }],
      ['Yan', 'ate', { something: 1 }],
      ['Yan', 'fueled', { fire_pit: 1 }],
      ['Yan', 'repaired', { wood_wall: 2 }],
      ['Yan', 'obliterated', { Resin: 20 }],
    ]);
  });

  it('names builders the plugin gave by Steam name by their character instead', () => {
    // GIVEN Tony Example plays Ragnar, and the plugin names a chest and pieces by his Steam name
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Chest: 1:10 piece_chest_wood at 12 18 built by Tony Example holds Wood x20'),
      logLine('03:01:00', 'Piece built: wood_floor_1x1 by Tony Example'),
      logLine('03:02:00', 'Piece destroyed: wood_fence built by Tony Example'),
    ]);

    // WHEN the snapshot is read
    const { chests, activities } = state.snapshot;

    // THEN the chest and both activities belong to Ragnar
    expect(chests['1:10']?.builder).toBe('Ragnar');
    expect(activities.map((activity) => activity.player)).toEqual(['Ragnar', 'Ragnar']);
  });

  it('keeps who built a chest when a later line does not know them', () => {
    // GIVEN Ragnar's chest is listed, then listed again while the plugin does not know who built it
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Chest: 1:10 piece_chest_wood at 12 18 built by Ragnar holds Wood x20'),
      logLine('03:00:05', 'Chest: 1:10 piece_chest_wood at 12 18 built by an unknown player holds Wood x5'),
    ]);

    // WHEN the snapshot is read
    const chest = state.snapshot.chests['1:10'];

    // THEN the chest still belongs to Ragnar and holds what the newest line says
    expect(chest?.builder).toBe('Ragnar');
    expect(chest?.items).toEqual({ Wood: 5 });
  });

  it('remembers every item players handled, once each, but not what a chest holds', () => {
    // GIVEN Ragnar picks up wood twice, stores it, a chest with stone is listed, and he wears an axe and eats meat
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Picked up: Wood x1 by Ragnar'),
      logLine('03:00:01', 'Picked up again: Wood x1 by Ragnar'),
      logLine('03:00:02', 'Stored: Wood x2 in piece_chest_wood by Ragnar'),
      logLine('03:00:03', 'Chest: 1:10 piece_chest_wood at 12 18 built by Ragnar holds Wood x2, Stone x3'),
      logLine('03:00:04', 'Gear: Ragnar AxeStone'),
      logLine('03:00:05', 'Ate: Ragnar CookedMeat'),
    ]);

    // WHEN the found items are read
    const { seenItems } = state.snapshot;

    // THEN each item he handled is there once, in the order he first handled it, and the chest's stone is left to
    // the page, which counts only chests someone found
    expect(seenItems).toEqual(['Wood', 'AxeStone', 'CookedMeat']);
  });

  it('keeps explored squares, last positions, chests and what a player carried at death', () => {
    // GIVEN Ragnar walks three spots, two in one 32 m square, two chests are listed and one goes, then he dies
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Position: Ragnar 10 20'),
      logLine('03:00:05', 'Position: Ragnar 30 -5'),
      logLine('03:00:10', 'Position: Ragnar 70 20'),
      logLine('03:01:00', 'Chest: 1:10 piece_chest_wood at 12 18 built by Ragnar holds Wood x20'),
      logLine('03:01:00', 'Chest: 1:11 Cart at 40 0 built by Tony Example holds nothing'),
      logLine('03:02:00', 'Chest removed: 1:11'),
      logLine('03:03:00', 'Tombstone: Ragnar at 70 20 holds SwordBronze x1, Coins x55'),
    ]);

    // WHEN the snapshot is read
    const { explored, positions, chests, deathItems } = state.snapshot;

    // THEN each square counts once, the last spot is kept, the removed cart is gone and the death is kept
    expect(explored).toEqual({ Ragnar: ['0,0', '0,-1', '2,0'] });
    expect(positions).toEqual({ Ragnar: { x: 70, z: 20, timeUtc: '2026-10-29T10:00:10.000Z' } });
    expect(chests).toEqual({
      '1:10': { chest: 'piece_chest_wood', x: 12, z: 18, builder: 'Ragnar', items: { Wood: 20 }, timeUtc: '2026-10-29T10:01:00.000Z' },
    });
    expect(deathItems).toEqual({
      Ragnar: { x: 70, z: 20, items: { SwordBronze: 1, Coins: 55 }, timeUtc: '2026-10-29T10:03:00.000Z' },
    });
  });

  it('names a chest by the sign on it until the sign is gone, through changes to what it holds', () => {
    // GIVEN two chests get signs, one is filled and then loses its sign, and a sign names a chest never listed
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Chest: 1:10 piece_chest_wood at 12 18 built by Ragnar holds nothing'),
      logLine('03:00:00', 'Chest: 1:11 piece_chest_wood at 14 18 built by Ragnar holds nothing'),
      logLine('03:00:00', 'Chest label: 1:10 Ores'),
      logLine('03:00:00', 'Chest label: 1:11 Food'),
      logLine('03:00:00', 'Chest label: 1:99 Lost'),
      logLine('03:01:00', 'Chest: 1:10 piece_chest_wood at 12 18 built by Ragnar holds CopperOre x5'),
      logLine('03:02:00', 'Chest unlabeled: 1:11'),
    ]);

    // WHEN the snapshot is read
    const { chests } = state.snapshot;

    // THEN the filled chest keeps its label, the other has none now, and the unknown chest is not made up
    expect(chests['1:10']?.label).toBe('Ores');
    expect(chests['1:10']?.items).toEqual({ CopperOre: 5 });
    expect(chests['1:11']).toEqual({ chest: 'piece_chest_wood', x: 14, z: 18, builder: 'Ragnar', items: {}, timeUtc: '2026-10-29T10:00:00.000Z' });
    expect(Object.keys(chests)).toEqual(['1:10', '1:11']);
  });

  it('keeps each Leviathan of the run until it dives away', () => {
    // GIVEN two Leviathans are listed, then one dives away
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Leviathan: 1:20 at -1520 2210'),
      logLine('03:00:00', 'Leviathan: 1:21 at 800 -400'),
      logLine('03:05:00', 'Leviathan gone: 1:21'),
    ]);

    // WHEN the snapshot is read
    const { leviathans } = state.snapshot;

    // THEN only the one still there is kept, where it floats
    expect(leviathans).toEqual({ '1:20': { x: -1520, z: 2210, timeUtc: '2026-10-29T10:00:00.000Z' } });
  });

  it('adds the terrain of squares explored before and after the terrain file was read', () => {
    // GIVEN Ragnar explored square 0,0, then the terrain of four squares around the center is read
    readLines(state, [...RUN_START, logLine('03:00:00', 'Position: Ragnar 10 20')]);
    setTerrain(state, { first: -1, rows: ['MB', '~S'] });

    // WHEN he walks into square -1,-1
    readLines(state, [logLine('03:00:05', 'Position: Ragnar -10 -20')]);

    // THEN both squares have their letter: 0,0 is northeast, -1,-1 southwest
    expect(state.snapshot.terrain).toEqual({ '0,0': 'B', '-1,-1': '~' });
  });

  it("forgets the old run's chests when a new log starts, since their IDs change", () => {
    // GIVEN a chest in the first run
    readLines(state, [...RUN_START, logLine('03:01:00', 'Chest: 1:10 piece_chest_wood at 12 18 built by Ragnar holds Wood x20')]);

    // WHEN a new log starts
    startNewLog(state);

    // THEN no chest is left
    expect(state.snapshot.chests).toEqual({});
  });

  it('keeps areas, gear and global keys in the story only when they are news', () => {
    // GIVEN two visits to the Swamp, two trips into a dungeon, the same gear twice, a boss defeat, a Serpent kill and another key
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Area entered: Ragnar Swamp'),
      logLine('03:10:00', 'Area entered: Ragnar Dungeon'),
      logLine('03:20:00', 'Area entered: Ragnar Swamp'),
      logLine('03:30:00', 'Area entered: Ragnar Dungeon'),
      logLine('03:40:00', 'Gear: Ragnar SwordIron'),
      logLine('03:50:00', 'Gear: Ragnar SwordIron'),
      logLine('04:00:00', 'Global key set: defeated_eikthyr'),
      logLine('04:05:00', 'Global key set: defeated_serpent'),
      logLine('04:10:00', 'Global key set: nomap'),
    ]);

    // WHEN the story events are listed
    const events = state.snapshot.events.map((event) => event.type);

    // THEN only the first Swamp visit, both dungeon trips, the gear once and the boss defeat are kept, since a Serpent is no boss
    expect(events).toEqual(['worldLoaded', 'areaEntered', 'areaEntered', 'areaEntered', 'gearSeen', 'globalKey']);
    expect(state.snapshot.visitedAreas).toEqual({ Ragnar: ['Swamp', 'Dungeon'] });
    expect(state.snapshot.gear).toEqual({ Ragnar: ['SwordIron'] });
  });

  it('tracks where players are, what they wear, their kills, the day and the bosses defeated', () => {
    // GIVEN Ragnar moves to the Swamp, changes what he wears, kills with Bjorn, a day starts and Eikthyr falls twice
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'Wearing: Ragnar has HelmetLeather, SpearFlint'),
      logLine('03:05:00', 'Wearing: Ragnar has SpearFlint'),
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
    expect(state.snapshot.worn).toEqual({ Ragnar: ['SpearFlint'] });
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
      {
        timeUtc: '2026-10-29T10:00:00.000Z',
        character: 'Ragnar',
        kind: 'shouted',
        text: 'Troll!',
        line: '10/29/2026 03:00:00: Chat: Ragnar shouted: Troll!',
      },
      { timeUtc: '2026-10-29T10:00:05.000Z', character: 'Ragnar', kind: 'ping', text: '', line: '10/29/2026 03:00:05: Ping: Ragnar at 1 2' },
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

  it('drops a handshake without a character spawn when a new log starts', () => {
    // GIVEN a prior run that ended after a handshake but before its character spawned
    readLines(state, [
      logLine('02:42:15', 'Valheim version: 1.0.21 (network version 41)'),
      logLine('02:42:18', 'ZNet.LoadWorld: Cotil (Cotil), save number 1183'),
      logLine('02:42:19', 'Player history entry with index 0:  Old Player (Steam_76561198000000001, 3C9D07E1B2A4F856)'),
      logLine('02:42:45', 'PlayFab listen socket child connected to remote player A1B2C3D4E5F60718'),
      logLine(
        '02:42:45',
        'PlayFab socket with remote ID playfab/A1B2C3D4E5F60718 received local Platform ID Steam_76561198000000001',
      ),
      logLine('02:42:45', 'Got handshake from client playfab/A1B2C3D4E5F60718'),
    ]);

    // WHEN a new run starts and a different player connects and spawns
    startNewLog(state);
    readLines(state, [
      logLine('05:00:00', 'Valheim version: 1.0.21 (network version 41)'),
      logLine('05:00:01', 'Player history entry with index 0:  New Player (Steam_76561198000000002, 3C9D07E1B2A4F857)'),
      logLine('05:00:02', 'PlayFab listen socket child connected to remote player B1B2C3D4E5F60718'),
      logLine(
        '05:00:03',
        'PlayFab socket with remote ID playfab/B1B2C3D4E5F60718 received local Platform ID Steam_76561198000000002',
      ),
      logLine('05:00:04', 'Got handshake from client playfab/B1B2C3D4E5F60718'),
      logLine('05:00:10', 'Got character ZDOID from New Player : 123:1'),
    ]);

    // THEN the new character uses the Steam ID linked in the new run
    expect(state.snapshot.sessions.at(-1)).toMatchObject({
      character: 'New Player',
      steamId: 'Steam_76561198000000002',
      steamName: 'New Player',
    });
  });

  it('names who a join was refused for and keeps crossplay drops', () => {
    // GIVEN Ragnar plays, then his connection comes back with a wrong password, a stranger is refused, and crossplay drops
    readLines(state, [
      ...RUN_START,
      logLine('03:00:00', 'PlayFab socket with remote ID playfab/B1B2C3D4E5F60718 received local Platform ID Steam_76561198000000001'),
      logLine('03:00:04', 'Peer playfab/B1B2C3D4E5F60718 has wrong password'),
      logLine('03:01:00', 'Peer playfab/C1B2C3D4E5F60718 has incompatible version, mine:41 remote 40'),
      logLine('03:02:00', "PlayFab network error in session 'Cotil' and network 1a03782b-bae3"),
    ]);

    // WHEN the snapshot is read
    const { refusedJoins, crossplayDropsUtc } = state.snapshot;

    // THEN Ragnar's refusal names him, the stranger's names nobody, and the drop has its time
    expect(refusedJoins).toEqual([
      { timeUtc: '2026-10-29T10:00:04.000Z', player: 'Ragnar', reason: 'wrongPassword' },
      { timeUtc: '2026-10-29T10:01:00.000Z', player: null, reason: 'incompatibleVersion' },
    ]);
    expect(crossplayDropsUtc).toEqual(['2026-10-29T10:02:00.000Z']);
  });
});
