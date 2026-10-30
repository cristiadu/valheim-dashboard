import { describe, expect, it } from 'vitest';

import { daySummary, storyOf } from './story';
import { sessionWith, snapshotWith } from './test-common';

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

  it('says when nobody played', () => {
    // GIVEN no sessions
    // WHEN / THEN the summary says so
    expect(daySummary(snapshotWith({}), 0)).toBe('Nobody played in the last 24 hours');
  });
});
