import type { PlayerSession } from 'valheim-log';

import {
  ACTIVITY_STORY_KINDS,
  type ActivityKind,
  MAP_SQUARE_METERS,
  OTHER_PLAYER_COLOR,
  PLAYER_ACTIVITY_STATS,
  PLAYER_COLORS,
  type Player,
  type PlayerStat,
  type Snapshot,
  SQUARE_METERS_PER_KM2,
} from '#/lib/models';
import { playerSource } from '#/lib/sources';
import { durationLabel, isServerOnline } from '#/lib/status';

/**
 * Returns the character of the latest of [sessions] whose Steam name is [name], since the plugin names a builder by
 * Steam name when they have not been online since the server started. Any other name is returned as it is.
 */
export const characterOfSteamName = (sessions: PlayerSession[], name: string | null): string | null =>
  sessions.findLast((session) => session.steamName !== null && session.steamName === name)?.character ?? name;

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

/**
 * What the event log plugin knows of a player: where [latest] is and what they wear, and the kills, areas,
 * activity totals and explored squares of all [characters].
 */
const pluginStatsOf = (
  snapshot: Snapshot,
  latest: string,
  characters: Set<string>,
): Pick<Player, 'area' | 'kills' | 'topKill' | 'areas' | 'gear' | 'worn' | 'activityTotals' | 'exploredSquares'> => {
  const killsByCreature = new Map<string, number>();
  for (const character of characters) {
    for (const [creature, amount] of Object.entries(snapshot.kills[character] ?? {})) {
      killsByCreature.set(creature, (killsByCreature.get(creature) ?? 0) + amount);
    }
  }
  const activityTotals: Player['activityTotals'] = {};
  for (const character of characters) {
    for (const [kind, amount] of Object.entries(snapshot.activityTotals[character] ?? {}) as [ActivityKind, number][]) {
      activityTotals[kind] = (activityTotals[kind] ?? 0) + amount;
    }
  }
  const byMostKills = [...killsByCreature].sort(([, firstAmount], [, secondAmount]) => secondAmount - firstAmount);
  return {
    area: snapshot.currentAreas[latest] ?? null,
    kills: byMostKills.reduce((sum, [, amount]) => sum + amount, 0),
    topKill: byMostKills[0]?.[0] ?? null,
    areas: [...new Set([...characters].flatMap((character) => snapshot.visitedAreas[character] ?? []))],
    gear: (snapshot.gear[latest] ?? []).toReversed(),
    worn: snapshot.worn[latest] ?? null,
    activityTotals,
    exploredSquares: new Set([...characters].flatMap((character) => snapshot.explored[character] ?? [])).size,
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

/**
 * Numbers on [player]'s card, each with the log lines in [snapshot] behind it: time played, visits, deaths, kills,
 * every activity they did at least once, and the land they explored.
 */
export const playerStats = (snapshot: Snapshot, player: Player): PlayerStat[] => [
  { label: 'Time played', value: durationLabel(player.totalMs), kind: 'night', source: playerSource(snapshot, player, 'visits') },
  { label: 'Visits', value: String(player.sessions.length), kind: 'joined', source: playerSource(snapshot, player, 'visits') },
  { label: 'Deaths', value: String(player.deaths), kind: 'died', source: playerSource(snapshot, player, 'deaths') },
  { label: 'Kills', value: String(player.kills), kind: 'fight', source: playerSource(snapshot, player, 'kills') },
  ...PLAYER_ACTIVITY_STATS.filter(({ kind }) => (player.activityTotals[kind] ?? 0) > 0).map(({ kind, label }) => ({
    label,
    value: player.activityTotals[kind]!.toLocaleString(),
    kind: ACTIVITY_STORY_KINDS[kind],
    source: playerSource(snapshot, player, 'activity', kind),
  })),
  {
    label: 'Land explored',
    value: `${((player.exploredSquares * MAP_SQUARE_METERS ** 2) / SQUARE_METERS_PER_KM2).toFixed(2)} km²`,
    kind: 'travel',
    source: null,
  },
];
