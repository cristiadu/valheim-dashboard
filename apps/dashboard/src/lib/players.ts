import type { PlayerSession } from 'valheim-log';

import { OTHER_PLAYER_COLOR, PLAYER_COLORS, type Player, type Snapshot } from './models';
import { isServerOnline } from './status';

/**
 * End of [session] in milliseconds. An open session ends now while the server is online, or at the last
 * log line when the server went quiet, so offline time is never counted as play time.
 */
export const sessionEndMs = (session: PlayerSession, snapshot: Snapshot, nowMs: number): number => {
  if (session.endUtc !== null) {
    return Date.parse(session.endUtc);
  }
  return isServerOnline(snapshot, nowMs) ? nowMs : Date.parse(snapshot.lastLineUtc ?? session.startUtc);
};

/** Groups the sessions into players, in the order they were first seen. One Steam ID is one player. */
export const playersOf = (snapshot: Snapshot, nowMs: number): Player[] => {
  const groups = new Map<string, PlayerSession[]>();
  for (const session of snapshot.sessions) {
    const key = session.steamId ?? session.character;
    groups.set(key, [...(groups.get(key) ?? []), session]);
  }
  const serverOnline = isServerOnline(snapshot, nowMs);
  return [...groups].map(([key, sessions], index) => {
    const last = sessions.at(-1)!;
    const isOnline = serverOnline && last.endUtc === null;
    return {
      key,
      character: last.character,
      steamName: sessions.findLast((s) => s.steamName !== null)?.steamName ?? null,
      color: PLAYER_COLORS[index] ?? OTHER_PLAYER_COLOR,
      sessions,
      isOnline,
      sinceUtc: isOnline ? last.startUtc : null,
      lastSeenUtc: isOnline ? null : new Date(sessionEndMs(last, snapshot, nowMs)).toISOString(),
      totalMs: sessions.reduce((sum, s) => sum + sessionEndMs(s, snapshot, nowMs) - Date.parse(s.startUtc), 0),
      deaths: sessions.reduce((sum, s) => sum + s.deaths, 0),
    };
  });
};
