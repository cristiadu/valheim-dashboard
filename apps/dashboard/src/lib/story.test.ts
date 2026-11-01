import { describe, expect, it } from 'vitest';

import { areaLabel, daySummaryParts, storyOf } from '#/lib/story';
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
      ['raid', 'A raid started: army eikthyr'],
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

  it('tells kills and items in one line per stretch', () => {
    // GIVEN Ragnar killed creatures, took items from chests and gathered turnips
    const snapshot = snapshotWith({
      activities: [
        { player: 'Ragnar', kind: 'killed', startUtc: '2026-10-29T10:00:00.000Z', endUtc: '2026-10-29T10:05:00.000Z', things: { Greydwarf: 3, Troll: 1 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'taken', startUtc: '2026-10-29T10:06:00.000Z', endUtc: '2026-10-29T10:06:00.000Z', things: { Wood: 20 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'gathered', startUtc: '2026-10-29T10:07:00.000Z', endUtc: '2026-10-29T10:07:00.000Z', things: { Turnip: 2 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'ate', startUtc: '2026-10-29T10:08:00.000Z', endUtc: '2026-10-29T10:08:00.000Z', things: { CookedMeat: 1 }, source: NO_LINES },
        { player: 'Ragnar', kind: 'planted', startUtc: '2026-10-29T10:09:00.000Z', endUtc: '2026-10-29T10:09:00.000Z', things: { sapling_carrot: 3 }, source: NO_LINES },
      ],
    });

    // WHEN the story is made
    const story = storyOf(snapshot);

    // THEN each stretch reads plainly
    expect(story.map((item) => [item.kind, item.text])).toEqual([
      ['built', 'Ragnar planted 3 plants: 3 sapling carrot'],
      ['items', 'Ragnar ate or drank 1 thing: 1 cooked meat'],
      ['items', 'Ragnar gathered 2 items: 2 turnip'],
      ['items', 'Ragnar took 20 items from chests: 20 wood'],
      ['fight', 'Ragnar killed 4 creatures: 3 greydwarf, 1 troll'],
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

describe('labels', () => {
  it('names areas the way the game shows them', () => {
    // WHEN / THEN plugin names read plainly
    expect(['BlackForest', 'Mountain', 'Ocean', 'Dungeon'].map(areaLabel)).toEqual(['Black Forest', 'Mountains', 'Ocean', 'Dungeon']);
  });
});
