import { describe, expect, it } from 'vitest';

import { daySummaryParts, storyOf } from '#/lib/story';
import { NO_LINES, sessionWith, snapshotWith } from '#/lib/test-common';

describe('storyOf', () => {
  it('mixes joins, leaves and game events, newest first', () => {
    // GIVEN a session that timed out, a death and a raid
    const snapshot = snapshotWith({
      sessions: [sessionWith({ endUtc: '2026-10-29T11:00:00.000Z', endReason: 'timedOut' })],
      events: [
        { type: 'playerDied', timeUtc: '2026-10-29T10:10:00.000Z', character: 'Ragnar', line: 'test line' },
        { type: 'raidStarted', timeUtc: '2026-10-29T10:20:00.000Z', raid: 'army_eikthyr', line: 'test line' },
      ],
    });

    // WHEN the story is made
    const story = storyOf(snapshot);

    // THEN every line reads plainly, newest first
    expect(story.map((item) => [item.kind, item.text])).toEqual([
      ['left', 'Ragnar lost connection'],
      ['raid', 'A raid started: "army eikthyr"'],
      ['died', 'Ragnar died'],
      ['joined', 'Ragnar joined'],
    ]);
  });

  it('tells building in one line per stretch, naming every piece, most first', () => {
    // GIVEN Ragnar built five kinds of pieces, then one of his pieces and one of an unknown builder were destroyed
    const snapshot = snapshotWith({
      activities: [
        {
          player: 'Ragnar',
          kind: 'built',
          startUtc: '2026-10-29T10:00:00.000Z',
          endUtc: '2026-10-29T10:05:00.000Z',
          things: { wood_fence: 8, wood_floor_1x1: 14, piece_groundtorch_wood: 3, stake_wall: 2, wood_stair: 1 },
          source: NO_LINES,
        },
        {
          player: 'Ragnar',
          kind: 'destroyed',
          startUtc: '2026-10-29T10:06:00.000Z',
          endUtc: '2026-10-29T10:06:00.000Z',
          things: { wood_fence: 1 },
          source: NO_LINES,
        },
        {
          player: null,
          kind: 'destroyed',
          startUtc: '2026-10-29T10:07:00.000Z',
          endUtc: '2026-10-29T10:07:00.000Z',
          things: { stake_wall: 2 },
          source: NO_LINES,
        },
      ],
    });

    // WHEN the story is made
    const story = storyOf(snapshot);

    // THEN each stretch reads plainly, newest first
    expect(story.map((item) => [item.kind, item.text])).toEqual([
      ['wrecked', '2 pieces were destroyed: 2 stake wall'],
      ['wrecked', '1 piece Ragnar built was destroyed: 1 wood fence'],
      ['built', 'Ragnar built 28 pieces: 14 wood floor 1x1, 8 wood fence, 3 groundtorch wood, 2 stake wall, 1 wood stair'],
    ]);
  });

  it('tells plugin events in plain sentences and replaces the plain death line with its details', () => {
    // GIVEN Ragnar died fighting a troll and Bjorn, then a few things happened in the world
    const timeUtc = (minute: number): string => `2026-10-29T10:${String(minute).padStart(2, '0')}:00.000Z`;
    const snapshot = snapshotWith({
      sessions: [sessionWith({}), sessionWith({ character: 'Bjorn' })],
      events: [
        { type: 'playerDied', timeUtc: timeUtc(1), character: 'Ragnar', line: 'test line' },
        { type: 'deathDetails', timeUtc: timeUtc(1), character: 'Ragnar', area: 'BlackForest', fighting: ['Troll', 'Bjorn'], line: 'test line' },
        { type: 'bossSummoned', timeUtc: timeUtc(2), boss: 'gd_king', summoner: 'Ragnar', line: 'test line' },
        { type: 'globalKey', timeUtc: timeUtc(3), key: 'defeated_gdking', isSet: true, line: 'test line' },
        { type: 'areaEntered', timeUtc: timeUtc(4), character: 'Ragnar', area: 'Swamp', line: 'test line' },
        { type: 'teleported', timeUtc: timeUtc(5), character: 'Ragnar', portal: 'Home', line: 'test line' },
        { type: 'gearSeen', timeUtc: timeUtc(6), character: 'Ragnar', item: 'SwordIron', quality: 2, line: 'test line' },
        { type: 'tameChanged', timeUtc: timeUtc(7), creature: 'Wolf', change: 'tamed', name: null, line: 'test line' },
        { type: 'tameChanged', timeUtc: timeUtc(8), creature: 'Wolf', change: 'died', name: 'Fluffy', line: 'test line' },
        { type: 'signWritten', timeUtc: timeUtc(9), author: 'Bjorn', text: 'Keep out', line: 'test line' },
        { type: 'tombstoneEmptied', timeUtc: timeUtc(10), owner: 'Ragnar', player: 'Bjorn', line: 'test line' },
      ],
      chat: [{ timeUtc: timeUtc(11), character: 'Bjorn', kind: 'said', text: 'sorry', line: 'test line' }],
    });

    // WHEN the story is made
    const story = storyOf(snapshot).filter((item) => item.kind !== 'joined');

    // THEN each event reads as a sentence, newest first, with one death line
    expect(story.map((item) => [item.kind, item.text])).toEqual([
      ['chat', 'Bjorn: sorry'],
      ['items', "Bjorn emptied Ragnar's tombstone"],
      ['chat', 'Bjorn wrote on a sign: "Keep out"'],
      ['tame', 'Fluffy the wolf died'],
      ['tame', 'A wolf was tamed'],
      ['items', 'Ragnar has new gear: sword iron (level 2)'],
      ['travel', 'Ragnar took the portal to Home'],
      ['travel', 'Ragnar reached the Swamp for the first time'],
      ['boss', 'The Elder was defeated'],
      ['boss', 'Ragnar summoned The Elder'],
      ['died', 'Ragnar died in the Black Forest fighting a troll and Bjorn'],
    ]);
  });

  it('tells beds, portals and wards in plain sentences', () => {
    // GIVEN Inge Dragonchow claims a bed, names a portal and turns her ward off
    const snapshot = snapshotWith({
      events: [
        { type: 'bedClaimed', timeUtc: '2026-10-29T10:01:00.000Z', character: 'Inge Dragonchow', line: 'test line' },
        { type: 'portalNamed', timeUtc: '2026-10-29T10:02:00.000Z', portal: 'Swamp camp', player: 'Inge Dragonchow', line: 'test line' },
        { type: 'wardChanged', timeUtc: '2026-10-29T10:03:00.000Z', ward: 'guard_stone', builder: 'Inge Dragonchow', isOn: false, line: 'test line' },
      ],
    });

    // WHEN the story is made
    const story = storyOf(snapshot);

    // THEN each reads as a sentence, newest first
    expect(story.map((item) => [item.kind, item.text])).toEqual([
      ['built', 'Inge Dragonchow turned their ward off'],
      ['travel', 'Inge Dragonchow named a portal "Swamp camp"'],
      ['night', 'Inge Dragonchow claimed a bed'],
    ]);
  });

  it('tells stones, saddles, tames following, ward access, maps, powers, carts and rides in plain sentences', () => {
    // GIVEN Inge Dragonchow reads a stone, saddles a lox, a wolf follows her, she joins Yan's ward, shares her map and rides
    const snapshot = snapshotWith({
      events: [
        { type: 'locationRevealed', timeUtc: '2026-10-29T10:01:00.000Z', location: 'Eikthyrnir', player: 'Inge Dragonchow', line: 'test line' },
        { type: 'saddled', timeUtc: '2026-10-29T10:02:00.000Z', creature: 'Lox', player: 'Inge Dragonchow', line: 'test line' },
        { type: 'tameFollowing', timeUtc: '2026-10-29T10:03:00.000Z', creature: 'Wolf', player: 'Inge Dragonchow', line: 'test line' },
        { type: 'wardAccess', timeUtc: '2026-10-29T10:04:00.000Z', player: 'Inge Dragonchow', ward: 'guard_stone', builder: 'Yan', isGiven: true, line: 'test line' },
        { type: 'mapShared', timeUtc: '2026-10-29T10:04:30.000Z', player: 'Inge Dragonchow', table: 'piece_cartographertable', line: 'test line' },
      ],
      activities: [
        { player: 'Inge Dragonchow', kind: 'powered', startUtc: '2026-10-29T10:05:00.000Z', endUtc: '2026-10-29T10:05:00.000Z', things: { power: 2 }, source: NO_LINES },
        { player: 'Inge Dragonchow', kind: 'pulled', startUtc: '2026-10-29T10:06:00.000Z', endUtc: '2026-10-29T10:06:00.000Z', things: { Cart: 1 }, source: NO_LINES },
        { player: 'Inge Dragonchow', kind: 'rode', startUtc: '2026-10-29T10:07:00.000Z', endUtc: '2026-10-29T10:17:00.000Z', things: { Lox: 2 }, source: NO_LINES },
        { player: 'Inge Dragonchow', kind: 'ate', startUtc: '2026-10-29T10:18:00.000Z', endUtc: '2026-10-29T10:18:00.000Z', things: { something: 1, CookedMeat: 1 }, source: NO_LINES },
      ],
    });

    // WHEN the story is made
    const story = storyOf(snapshot);

    // THEN each reads as a sentence, newest first, and food the server never learned stays out of the item list
    expect(story.map((item) => [item.kind, item.text, item.things])).toEqual([
      ['items', 'Inge Dragonchow ate or drank 2 things', { CookedMeat: 1 }],
      ['travel', 'Inge Dragonchow rode the lox for 10m', undefined],
      ['travel', 'Inge Dragonchow pulled a cart', undefined],
      ['boss', 'Inge Dragonchow used a forsaken power 2 times', undefined],
      ['travel', 'Inge Dragonchow added what they explored to a map table', undefined],
      ['built', "Inge Dragonchow got access to Yan's ward", undefined],
      ['tame', 'A wolf started following Inge Dragonchow', undefined],
      ['tame', 'Inge Dragonchow put a saddle on a lox', undefined],
      ['travel', 'Inge Dragonchow read a stone that shows where Eikthyr is', undefined],
    ]);
  });

  it('tells crafting by station, most visits first, and leaves a station not known unnamed', () => {
    // GIVEN Ragnar opened the workbench 3 times, the forge once and a station the plugin could not tell once
    const snapshot = snapshotWith({
      activities: [
        { player: 'Ragnar', kind: 'crafted', startUtc: '2026-10-29T10:00:00.000Z', endUtc: '2026-10-29T10:05:00.000Z', things: { forge: 1, piece_workbench: 3, crafting_station: 1 }, source: NO_LINES },
      ],
    });

    // WHEN the story is made
    const story = storyOf(snapshot);

    // THEN the line names each station with its visits
    expect(story.map((item) => item.text)).toEqual(['Ragnar worked at the workbench 3 times, the forge and a crafting station']);
  });

  it('tells swings with their weapons, and dodge rolls and staggers without a list', () => {
    // GIVEN Ragnar swung an axe and a club, rolled 4 times and was staggered once
    const at = { startUtc: '2026-10-29T10:00:00.000Z', source: NO_LINES };
    const snapshot = snapshotWith({
      activities: [
        { player: 'Ragnar', kind: 'swung', endUtc: '2026-10-29T10:03:00.000Z', things: { AxeBronze: 42, Club: 3 }, ...at },
        { player: 'Ragnar', kind: 'dodged', endUtc: '2026-10-29T10:02:00.000Z', things: { dodged: 4 }, ...at },
        { player: 'Ragnar', kind: 'staggered', endUtc: '2026-10-29T10:01:00.000Z', things: { staggered: 1 }, ...at },
      ],
    });

    // WHEN the story is made
    const story = storyOf(snapshot);

    // THEN each reads as a sentence, newest first
    expect(story.map((item) => [item.kind, item.text])).toEqual([
      ['fight', 'Ragnar swung a weapon 45 times: 42 axe bronze, 3 club'],
      ['fight', 'Ragnar rolled out of the way 4 times'],
      ['fight', 'Ragnar was staggered'],
    ]);
  });

  it('leaves the time out when a player took the wheel only once', () => {
    // GIVEN Ragnar took the wheel of a longship once
    const snapshot = snapshotWith({
      activities: [
        { player: 'Ragnar', kind: 'sailed', startUtc: '2026-10-29T10:12:00.000Z', endUtc: '2026-10-29T10:12:00.000Z', things: { VikingShip: 1 }, source: NO_LINES },
      ],
    });

    // WHEN the story is made
    const story = storyOf(snapshot);

    // THEN it says only which ship he steered
    expect(story.map((item) => item.text)).toEqual(['Ragnar steered the viking ship']);
  });

  it('tells kills and items in one line per stretch', () => {
    // GIVEN Ragnar killed creatures, moved items, cooked, brewed, steered a karve for 25 minutes and dropped coins Bjorn picked up
    const snapshot = snapshotWith({
      activities: [
        { player: 'Ragnar', kind: 'killed', startUtc: '2026-10-29T10:00:00.000Z', endUtc: '2026-10-29T10:05:00.000Z', things: { Greydwarf: 3, Troll: 1 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'taken', startUtc: '2026-10-29T10:06:00.000Z', endUtc: '2026-10-29T10:06:00.000Z', things: { Wood: 20 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'gathered', startUtc: '2026-10-29T10:07:00.000Z', endUtc: '2026-10-29T10:07:00.000Z', things: { Turnip: 2 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'ate', startUtc: '2026-10-29T10:08:00.000Z', endUtc: '2026-10-29T10:08:00.000Z', things: { CookedMeat: 1 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'planted', startUtc: '2026-10-29T10:09:00.000Z', endUtc: '2026-10-29T10:09:00.000Z', things: { sapling_carrot: 3 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'cooked', startUtc: '2026-10-29T10:10:00.000Z', endUtc: '2026-10-29T10:10:00.000Z', things: { RawMeat: 2 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'brewed', startUtc: '2026-10-29T10:11:00.000Z', endUtc: '2026-10-29T10:11:00.000Z', things: { MeadBaseTasty: 1 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'sailed', startUtc: '2026-10-29T09:47:00.000Z', endUtc: '2026-10-29T10:12:00.000Z', things: { Karve: 3 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'made', startUtc: '2026-10-29T10:13:00.000Z', endUtc: '2026-10-29T10:13:00.000Z', things: { ArrowFlint: 20 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'foodCooked', startUtc: '2026-10-29T10:13:10.000Z', endUtc: '2026-10-29T10:13:10.000Z', things: { CookedMeat: 2 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'burnt', startUtc: '2026-10-29T10:13:20.000Z', endUtc: '2026-10-29T10:13:20.000Z', things: { RawMeat: 1 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'tapped', startUtc: '2026-10-29T10:13:30.000Z', endUtc: '2026-10-29T10:13:30.000Z', things: { MeadTasty: 6 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'dropped', startUtc: '2026-10-29T10:14:00.000Z', endUtc: '2026-10-29T10:14:00.000Z', things: { Coins: 115 }, source: NO_LINES },
        { player: 'Bjorn', kind: 'received', startUtc: '2026-10-29T10:15:00.000Z', endUtc: '2026-10-29T10:15:00.000Z', things: { Coins: 115 }, from: 'Ragnar', source: NO_LINES },
      ],
    });

    // WHEN the story is made
    const story = storyOf(snapshot);

    // THEN each stretch reads plainly, and item lines leave the list to their item icons
    expect(story.map((item) => [item.kind, item.text, item.things])).toEqual([
      ['items', 'Bjorn picked up 115 items that Ragnar dropped', { Coins: 115 }],
      ['items', 'Ragnar dropped 115 items', { Coins: 115 }],
      ['items', 'Ragnar tapped 6 meads from fermenters', { MeadTasty: 6 }],
      ['items', 'Ragnar burnt 1 thing on the fire', { RawMeat: 1 }],
      ['items', 'Ragnar finished cooking 2 things', { CookedMeat: 2 }],
      ['items', 'Ragnar made 20 items', { ArrowFlint: 20 }],
      ['travel', 'Ragnar steered the karve for 25m', undefined],
      ['items', 'Ragnar started brewing 1 mead', { MeadBaseTasty: 1 }],
      ['items', 'Ragnar started cooking 2 things', { RawMeat: 2 }],
      ['built', 'Ragnar planted 3 plants: 3 sapling carrot', undefined],
      ['items', 'Ragnar ate or drank 1 thing', { CookedMeat: 1 }],
      ['items', 'Ragnar gathered 2 items', { Turnip: 2 }],
      ['items', 'Ragnar took 20 items from chests', { Wood: 20 }],
      ['fight', 'Ragnar killed 4 creatures: 3 greydwarf, 1 troll', undefined],
    ]);
  });
});

describe('daySummaryParts', () => {
  it('counts players, deaths and raids in the last 24 hours only', () => {
    // GIVEN one player today, one two days ago, a death today and an old raid
    const snapshot = snapshotWith({
      sessions: [
        sessionWith({ steamId: 'Steam_1', endUtc: '2026-10-29T11:00:00.000Z' }),
        sessionWith({ character: 'Astrid', startUtc: '2026-10-27T09:00:00.000Z', endUtc: '2026-10-27T10:00:00.000Z' }),
      ],
      events: [
        { type: 'playerDied', timeUtc: '2026-10-29T10:10:00.000Z', character: 'Ragnar', line: 'death line' },
        { type: 'raidStarted', timeUtc: '2026-10-27T09:30:00.000Z', raid: 'army_eikthyr', line: 'raid line' },
      ],
      sources: {
        'visits:Ragnar': { total: 1, lines: [{ timeUtc: '2026-10-29T09:43:13.000Z', line: 'join line', kind: 'joined' }] },
      },
    });

    // WHEN the summary is made at noon
    const parts = daySummaryParts(snapshot, Date.parse('2026-10-29T12:00:00.000Z'));

    // THEN only today counts, each part with its lines
    expect(parts.map((part) => [part.text, part.source.lines.map((record) => record.line)])).toEqual([
      ['1 player in the last 24 hours', ['join line']],
      ['1 death', ['death line']],
      ['0 raids', []],
    ]);
  });

  it('adds the pieces built in the last 24 hours when there are any', () => {
    // GIVEN Ragnar played and built three pieces today, and a piece of his was destroyed
    const snapshot = snapshotWith({
      sessions: [sessionWith({ endUtc: '2026-10-29T11:00:00.000Z' })],
      activities: [
        {
          player: 'Ragnar',
          kind: 'built',
          startUtc: '2026-10-29T10:00:00.000Z',
          endUtc: '2026-10-29T10:05:00.000Z',
          things: { wood_floor_1x1: 3 },
          source: NO_LINES,
        },
        {
          player: 'Ragnar',
          kind: 'destroyed',
          startUtc: '2026-10-29T10:06:00.000Z',
          endUtc: '2026-10-29T10:06:00.000Z',
          things: { wood_floor_1x1: 1 },
          source: NO_LINES,
        },
      ],
    });

    // WHEN the summary is made at noon
    const parts = daySummaryParts(snapshot, Date.parse('2026-10-29T12:00:00.000Z'));

    // THEN only built pieces count
    expect(parts.map((part) => part.text)).toEqual(['1 player in the last 24 hours', '0 deaths', '0 raids', '3 pieces built']);
  });

  it('has no parts when nobody played', () => {
    // GIVEN no sessions
    // WHEN / THEN there is nothing to count
    expect(daySummaryParts(snapshotWith({}), 0)).toEqual([]);
  });
});

describe('story sources', () => {
  it('backs each line with the log lines it was told from', () => {
    // GIVEN Ragnar joined, and the game and the plugin both logged his death
    const joinLine = { timeUtc: '2026-10-29T09:43:13.000Z', line: 'join line', kind: 'joined' as const };
    const snapshot = snapshotWith({
      sessions: [sessionWith({})],
      sources: { 'visits:Ragnar': { total: 1, lines: [joinLine] } },
      events: [
        { type: 'playerDied', timeUtc: '2026-10-29T10:10:00.000Z', character: 'Ragnar', line: 'game death line' },
        { type: 'deathDetails', timeUtc: '2026-10-29T10:10:01.000Z', character: 'Ragnar', area: 'Swamp', fighting: [], line: 'plugin death line' },
      ],
    });

    // WHEN the story is made
    const story = storyOf(snapshot);

    // THEN the death shows both lines and the join shows its own
    expect(story.map((item) => [item.text, item.source.lines.map((record) => record.line)])).toEqual([
      ['Ragnar died in the Swamp', ['game death line', 'plugin death line']],
      ['Ragnar joined', ['join line']],
    ]);
    expect(story[0]!.source.lines.map((record) => record.kind)).toEqual(['died', 'died']);
  });
});
