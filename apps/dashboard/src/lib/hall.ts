import { ACTIVITY_STORY_KINDS, PLAYER_ACTIVITY_STATS } from '#/lib/models/activities';
import { DAY_ACTIVITY_COUNT, type PlayerDay, type WorldFact } from '#/lib/models/hall';
import type { Player, PlayerStat } from '#/lib/models/players';
import type { Snapshot } from '#/lib/models/snapshot';
import { DAY_MS } from '#/lib/models/time';
import { seenBosses } from '#/lib/bosses';
import { landLabel, sessionEndMs } from '#/lib/players';
import { mergedSource, serverSource, sourceKey } from '#/lib/sources';
import { activityTotal } from '#/lib/story';
import { clip } from '#/lib/time';

/**
 * Facts about the whole world for the Hall: the in-game day, bosses defeated, how many players came, the areas
 * they found and the land they walked. Only what players saw counts, so unfound areas and unmet bosses stay hidden.
 */
export const worldFacts = (snapshot: Snapshot, players: Player[]): WorldFact[] => {
  const defeated = seenBosses(snapshot).filter((boss) => snapshot.defeatedBosses.includes(boss));
  const characters = Object.keys(snapshot.visitedAreas);
  const areaSources = characters.flatMap((character) =>
    snapshot.visitedAreas[character].flatMap((area) => snapshot.sources[sourceKey('area', character, area)] ?? []),
  );
  const areas = new Set(characters.flatMap((character) => snapshot.visitedAreas[character]));
  const squares = new Set(Object.values(snapshot.explored).flat());
  return [
    { label: 'In-game day', value: snapshot.day === null ? '–' : String(snapshot.day), source: serverSource(snapshot, 'day') },
    {
      label: 'Bosses defeated',
      value: defeated.length === 0 ? 'None yet' : `${defeated.length} · ${defeated.at(-1)}`,
      source: mergedSource(defeated.map((boss) => serverSource(snapshot, 'boss', boss))),
    },
    { label: 'Vikings so far', value: String(players.length) },
    { label: 'Areas found', value: String(areas.size), source: mergedSource(areaSources) },
    { label: 'Land explored', value: landLabel(squares.size) },
  ];
};

/**
 * What each player who was online in the last 24 hours did: time online, deaths, kills and their
 * [DAY_ACTIVITY_COUNT] most done activities. Players who did not come are left out. Most time online first.
 */
export const playerDays = (snapshot: Snapshot, players: Player[], nowMs: number): PlayerDay[] => {
  const sinceMs = nowMs - DAY_MS;
  return players
    .map((player) => {
      const names = new Set(player.sessions.map((session) => session.character));
      if (player.steamName !== null) {
        names.add(player.steamName);
      }
      const playedMs = player.sessions.reduce((sum, session) => {
        const part = clip(Date.parse(session.startUtc), sessionEndMs(session, snapshot, nowMs), sinceMs, nowMs);
        return sum + (part === null ? 0 : part.endMs - part.startMs);
      }, 0);
      const deaths = snapshot.events.filter(
        (event) => event.type === 'playerDied' && names.has(event.character) && Date.parse(event.timeUtc) > sinceMs,
      );
      const activities = snapshot.activities.filter(
        (activity) => activity.player !== null && names.has(activity.player) && Date.parse(activity.endUtc) > sinceMs,
      );
      const kills = activities.filter((activity) => activity.kind === 'killed');
      const done = PLAYER_ACTIVITY_STATS.map(({ kind, label }) => {
        const ofKind = activities.filter((activity) => activity.kind === kind);
        return { kind, label, amount: ofKind.reduce((sum, activity) => sum + activityTotal(activity), 0), ofKind };
      })
        .filter(({ amount }) => amount > 0)
        .sort((first, second) => second.amount - first.amount)
        .slice(0, DAY_ACTIVITY_COUNT);
      const stats: PlayerStat[] = [
        {
          label: 'Deaths',
          value: String(deaths.length),
          kind: 'died',
          source: { total: deaths.length, lines: deaths.map(({ timeUtc, line }) => ({ timeUtc, line, kind: 'died' })) },
        },
        {
          label: 'Kills',
          value: String(kills.reduce((sum, activity) => sum + activityTotal(activity), 0)),
          kind: 'fight',
          source: mergedSource(kills.map((activity) => activity.source)),
        },
        ...done.map(({ kind, label, amount, ofKind }) => ({
          label,
          value: amount.toLocaleString(),
          kind: ACTIVITY_STORY_KINDS[kind],
          source: mergedSource(ofKind.map((activity) => activity.source)),
        })),
      ];
      return { player, playedMs, stats };
    })
    .filter((day) => day.playedMs > 0)
    .sort((first, second) => second.playedMs - first.playedMs);
};
