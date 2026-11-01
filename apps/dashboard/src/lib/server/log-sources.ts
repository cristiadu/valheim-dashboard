import type { LogEvent, PlayerSession } from 'valheim-log';

import type { Snapshot, SourceKind, SourceLines, StoryKind } from '#/lib/models';
import { MAX_SOURCE_LINES } from '#/lib/server/models';
import { sourceKey } from '#/lib/sources';

/** Adds [line], written at [timeUtc] about [kind], to [source], and drops the oldest lines past the limit. */
export const addSourceLine = (source: SourceLines, timeUtc: string, line: string, kind: StoryKind): void => {
  source.total += 1;
  source.lines.push({ timeUtc, line, kind });
  source.lines.splice(0, Math.max(0, source.lines.length - MAX_SOURCE_LINES));
};

/** Keeps [line], written at [timeUtc] about [lineKind], behind the number of [kind] for [character]. */
const keepLine = (
  snapshot: Snapshot,
  line: string,
  timeUtc: string,
  lineKind: StoryKind,
  kind: SourceKind,
  character: string,
  thing?: string,
): void => {
  addSourceLine((snapshot.sources[sourceKey(kind, character, thing)] ??= { total: 0, lines: [] }), timeUtc, line, lineKind);
};

/**
 * Keeps the log [line] behind [event] under each number or item it changes, so the page can show where the
 * number came from. [visitSessions] are the sessions the event started or ended, such as a player joining.
 */
export const keepSourceLines = (snapshot: Snapshot, event: LogEvent, line: string, visitSessions: PlayerSession[]): void => {
  const { timeUtc } = event;
  for (const session of visitSessions) {
    keepLine(snapshot, line, timeUtc, session.endUtc === timeUtc ? 'left' : 'joined', 'visits', session.character);
  }
  switch (event.type) {
    case 'playerDied':
    case 'deathDetails':
      keepLine(snapshot, line, timeUtc, 'died', 'deaths', event.character);
      break;
    case 'creatureKilled':
      for (const attacker of event.attackers) {
        keepLine(snapshot, line, timeUtc, 'fight', 'kills', attacker);
        keepLine(snapshot, line, timeUtc, 'fight', 'killed', attacker, event.creature);
      }
      break;
    case 'areaEntered':
      keepLine(snapshot, line, timeUtc, 'travel', 'area', event.character, event.area);
      break;
    case 'gearSeen':
      keepLine(snapshot, line, timeUtc, 'items', 'gear', event.character, event.item);
      break;
    default:
      break;
  }
};
