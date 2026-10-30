import { beforeAll, describe, expect, it } from 'vitest';

import type { PlayerSession } from '../src/models';
import { applyEvent, buildSessions, createSessionState, endAllSessions, onlineSessions } from '../src/sessions';
import { CROSSPLAY_LOG, parseSample, STEAM_ONLY_LOG } from './common';

describe('buildSessions', () => {
  let crossplaySessions: PlayerSession[];
  let steamOnlySessions: PlayerSession[];

  beforeAll(() => {
    // GIVEN the parsed sample logs
    // WHEN sessions are built from them
    crossplaySessions = buildSessions(parseSample(CROSSPLAY_LOG));
    steamOnlySessions = buildSessions(parseSample(STEAM_ONLY_LOG));
  });

  it('links the Steam name and the character into one crossplay session', () => {
    // THEN one session holds both names, the times and the death, and the respawn adds none
    expect(crossplaySessions).toEqual([
      {
        character: 'Ragnar',
        peerId: '549297305',
        steamId: 'Steam_76561198000000001',
        steamName: 'Tony Example',
        startUtc: '2026-10-29T09:43:13.000Z',
        endUtc: '2026-10-29T10:56:36.000Z',
        endReason: 'left',
        deaths: 1,
      },
    ]);
  });

  it('ends a Steam-only session at the socket close after a timeout', () => {
    // THEN the refused attempt opens no session and the timeout is the end reason
    expect(steamOnlySessions).toEqual([
      {
        character: 'Astrid',
        peerId: '1921561820',
        steamId: 'Steam_76561198000000002',
        steamName: null,
        startUtc: '2023-05-20T10:48:25.000Z',
        endUtc: '2023-05-20T11:10:00.000Z',
        endReason: 'timedOut',
        deaths: 0,
      },
    ]);
  });

  it('ends open sessions when the server stops', () => {
    // GIVEN the crossplay log without its leave lines
    const events = parseSample(CROSSPLAY_LOG).filter((e) => e.type !== 'playerLeft');

    // WHEN sessions are built from it
    const [session] = buildSessions(events);

    // THEN the stop ends the session at the stop time
    expect(session).toMatchObject({ endUtc: '2026-10-29T23:19:51.000Z', endReason: 'serverStopped' });
  });
});

describe('applyEvent', () => {
  it('keeps a session open while the player is online, then ends it as a crash on request', () => {
    // GIVEN the crossplay log up to the character spawn, fed one event at a time
    const state = createSessionState();
    const events = parseSample(CROSSPLAY_LOG);
    for (const event of events.slice(0, events.findIndex((e) => e.type === 'playerDied'))) {
      applyEvent(state, event);
    }
    const onlineBefore = onlineSessions(state).map((s) => [s.character, s.endUtc, s.endReason]);

    // WHEN the caller ends the run as a crash because a new log started
    endAllSessions(state, '2026-10-29T12:00:00.000Z', 'serverCrashed');

    // THEN the player was online and the session then ended as a crash
    expect(onlineBefore).toEqual([['Ragnar', null, null]]);
    expect(onlineSessions(state)).toEqual([]);
    expect(state.sessions[0]).toMatchObject({ endUtc: '2026-10-29T12:00:00.000Z', endReason: 'serverCrashed' });
  });
});
