import type { PlayerSession } from 'valheim-log';

import { OTHER_PLAYER_COLOR, PLAYER_COLORS, type Player, type Snapshot } from '#/lib/models';
import { isServerOnline } from '#/lib/status';

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

/** What the event log plugin knows of a player: where [latest] is, and kills and areas of all [characters]. */
const pluginStatsOf = (
  snapshot: Snapshot,
  latest: string,
  characters: Set<string>,
): Pick<Player, 'area' | 'kills' | 'topKill' | 'areas' | 'gear'> => {
  const killsByCreature = new Map<string, number>();
  for (const character of characters) {
    for (const [creature, amount] of Object.entries(snapshot.kills[character] ?? {})) {
      killsByCreature.set(creature, (killsByCreature.get(creature) ?? 0) + amount);
    }
  }
  const byMostKills = [...killsByCreature].sort(([, firstAmount], [, secondAmount]) => secondAmount - firstAmount);
  return {
    area: snapshot.currentAreas[latest] ?? null,
    kills: byMostKills.reduce((sum, [, amount]) => sum + amount, 0),
    topKill: byMostKills[0]?.[0] ?? null,
    areas: [...new Set([...characters].flatMap((character) => snapshot.visitedAreas[character] ?? []))],
    gear: (snapshot.gear[latest] ?? []).toReversed(),
  };
};

/** Groups the sessions into players, in the order they were first seen. One Steam ID is one player. */
export const playersOf = (snapshot: Snapshot, nowMs: number): Player[] => {
  const groups = new Map<string, PlayerSession[]>();
  for (const session of snapshot.sessions) {
    const key = session.steamId ?? session.character;
    groups.set(key, [...(groups.get(key) ?? []), session]);
  }
  const isServerUp = isServerOnline(snapshot, nowMs);
  return [...groups].map(([key, sessions], index) => {
    const last = sessions.at(-1)!;
    const isOnline = isServerUp && last.endUtc === null;
    return {
      key,
      character: last.character,
      steamName: sessions.findLast((session) => session.steamName !== null)?.steamName ?? null,
      color: PLAYER_COLORS[index] ?? OTHER_PLAYER_COLOR,
      sessions,
      isOnline,
      sinceUtc: isOnline ? last.startUtc : null,
      lastSeenUtc: isOnline ? null : new Date(sessionEndMs(last, snapshot, nowMs)).toISOString(),
      totalMs: sessions.reduce(
        (sum, session) => sum + sessionEndMs(session, snapshot, nowMs) - Date.parse(session.startUtc),
        0,
      ),
      deaths: sessions.reduce((sum, session) => sum + session.deaths, 0),
      ...pluginStatsOf(snapshot, last.character, new Set(sessions.map((session) => session.character))),
    };
  });
};
