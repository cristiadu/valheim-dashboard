import { describe, expect, it } from 'vitest';

import { areaLabel, daySummary, storyOf } from '#/lib/story';
import { sessionWith, snapshotWith } from '#/lib/test-common';

describe('storyOf', () => {
  it('mixes joins, leaves and game events, newest first', () => {
    // GIVEN a session that timed out, a death and a raid
    const snapshot = snapshotWith({
      sessions: [sessionWith({ endUtc: '2026-10-29T11:00:00.000Z', endReason: 'timedOut' })],
      events: [
        { type: 'playerDied', timeUtc: '2026-10-29T10:10:00.000Z', character: 'Ragnar' },
        { type: 'raidStarted', timeUtc: '2026-10-29T10:20:00.000Z', raid: 'army_eikthyr' },
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
        },
        {
          player: 'Ragnar',
          kind: 'destroyed',
          startUtc: '2026-10-29T10:06:00.000Z',
          endUtc: '2026-10-29T10:06:00.000Z',
          things: { wood_fence: 1 },
        },
        {
          player: null,
          kind: 'destroyed',
          startUtc: '2026-10-29T10:07:00.000Z',
          endUtc: '2026-10-29T10:07:00.000Z',
          things: { stake_wall: 2 },
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
        { type: 'playerDied', timeUtc: timeUtc(1), character: 'Ragnar' },
        { type: 'deathDetails', timeUtc: timeUtc(1), character: 'Ragnar', area: 'BlackForest', fighting: ['Troll', 'Bjorn'] },
        { type: 'bossSummoned', timeUtc: timeUtc(2), boss: 'gd_king', summoner: 'Ragnar' },
        { type: 'globalKey', timeUtc: timeUtc(3), key: 'defeated_gdking', isSet: true },
        { type: 'areaEntered', timeUtc: timeUtc(4), character: 'Ragnar', area: 'Swamp' },
        { type: 'teleported', timeUtc: timeUtc(5), character: 'Ragnar', portal: 'Home' },
        { type: 'gearSeen', timeUtc: timeUtc(6), character: 'Ragnar', item: 'SwordIron', quality: 2 },
        { type: 'tameChanged', timeUtc: timeUtc(7), creature: 'Wolf', change: 'tamed', name: null },
        { type: 'tameChanged', timeUtc: timeUtc(8), creature: 'Wolf', change: 'died', name: 'Fluffy' },
        { type: 'signWritten', timeUtc: timeUtc(9), author: 'Bjorn', text: 'Keep out' },
        { type: 'tombstoneEmptied', timeUtc: timeUtc(10), owner: 'Ragnar', player: 'Bjorn' },
      ],
      chat: [{ timeUtc: timeUtc(11), character: 'Bjorn', kind: 'said', text: 'sorry' }],
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
        { player: 'Ragnar', kind: 'killed', startUtc: '2026-10-29T10:00:00.000Z', endUtc: '2026-10-29T10:05:00.000Z', things: { Greydwarf: 3, Troll: 1 } },
        { player: 'Ragnar', kind: 'taken', startUtc: '2026-10-29T10:06:00.000Z', endUtc: '2026-10-29T10:06:00.000Z', things: { Wood: 20 } },
        { player: 'Ragnar', kind: 'gathered', startUtc: '2026-10-29T10:07:00.000Z', endUtc: '2026-10-29T10:07:00.000Z', things: { Turnip: 2 } },
        { player: 'Ragnar', kind: 'ate', startUtc: '2026-10-29T10:08:00.000Z', endUtc: '2026-10-29T10:08:00.000Z', things: { CookedMeat: 1 } },
        { player: 'Ragnar', kind: 'planted', startUtc: '2026-10-29T10:09:00.000Z', endUtc: '2026-10-29T10:09:00.000Z', things: { sapling_carrot: 3 } },
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

describe('daySummary', () => {
  it('counts players, deaths and raids in the last 24 hours only', () => {
    // GIVEN one player today, one two days ago, a death today and an old raid
    const snapshot = snapshotWith({
      sessions: [
        sessionWith({ steamId: 'Steam_1', endUtc: '2026-10-29T11:00:00.000Z' }),
        sessionWith({ character: 'Astrid', startUtc: '2026-10-27T09:00:00.000Z', endUtc: '2026-10-27T10:00:00.000Z' }),
      ],
      events: [
        { type: 'playerDied', timeUtc: '2026-10-29T10:10:00.000Z', character: 'Ragnar' },
        { type: 'raidStarted', timeUtc: '2026-10-27T09:30:00.000Z', raid: 'army_eikthyr' },
      ],
    });

    // WHEN the summary is made at noon
    const summary = daySummary(snapshot, Date.parse('2026-10-29T12:00:00.000Z'));

    // THEN only today counts
    expect(summary).toBe('1 player in the last 24 hours · 1 death · 0 raids');
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
        },
        {
          player: 'Ragnar',
          kind: 'destroyed',
          startUtc: '2026-10-29T10:06:00.000Z',
          endUtc: '2026-10-29T10:06:00.000Z',
          things: { wood_floor_1x1: 1 },
        },
      ],
    });

    // WHEN the summary is made at noon
    const summary = daySummary(snapshot, Date.parse('2026-10-29T12:00:00.000Z'));

    // THEN only built pieces count
    expect(summary).toBe('1 player in the last 24 hours · 0 deaths · 0 raids · 3 pieces built');
  });

  it('says when nobody played', () => {
    // GIVEN no sessions
    // WHEN / THEN the summary says so
    expect(daySummary(snapshotWith({}), 0)).toBe('Nobody played in the last 24 hours');
  });
});

describe('labels', () => {
  it('names areas the way the game shows them', () => {
    // WHEN / THEN plugin names read plainly
    expect(['BlackForest', 'Mountain', 'Ocean', 'Dungeon'].map(areaLabel)).toEqual(['Black Forest', 'Mountains', 'Ocean', 'Dungeon']);
  });
});
