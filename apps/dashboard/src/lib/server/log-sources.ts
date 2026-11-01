import type { LogEvent, PlayerSession } from 'valheim-log';

import { BOSS_NAMES, DEFEATED_KEY_PREFIX, type ServerSourceKind, type Snapshot, type SourceKind, type SourceLines, type StoryKind } from '#/lib/models';
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
  const key = thing === undefined ? sourceKey(kind, character) : sourceKey(kind, character, thing);
  addSourceLine((snapshot.sources[key] ??= { total: 0, lines: [] }), timeUtc, line, lineKind);
};

/** Keeps [line], written at [timeUtc] about [lineKind], behind the server number of [kind], about [thing] when given. */
export const keepServerLine = (snapshot: Snapshot, line: string, timeUtc: string, lineKind: StoryKind, kind: ServerSourceKind, thing?: string): void => {
  const key = thing === undefined ? sourceKey(kind) : sourceKey(kind, thing);
  addSourceLine((snapshot.sources[key] ??= { total: 0, lines: [] }), timeUtc, line, lineKind);
};

/** Keeps the log [line] behind [event] under the server numbers it changes, such as saves or the Steam connection. */
const keepServerLines = (snapshot: Snapshot, event: LogEvent, line: string): void => {
  const { timeUtc } = event;
  snapshot.sources[sourceKey('latest')] = { total: 1, lines: [{ timeUtc, line, kind: 'world' }] };
  switch (event.type) {
    case 'worldLoaded':
      keepServerLine(snapshot, line, timeUtc, 'world', 'runs');
      break;
    case 'serverStopped':
      keepServerLine(snapshot, line, timeUtc, 'stopped', 'runs');
      break;
    case 'serverVersion':
      keepServerLine(snapshot, line, timeUtc, 'world', 'version');
      break;
    case 'dayStarted':
    case 'nightSkipped':
      keepServerLine(snapshot, line, timeUtc, 'night', 'day');
      break;
    case 'worldSaveStep':
      if (event.step === 5) {
        keepServerLine(snapshot, line, timeUtc, 'world', 'saves');
      }
      break;
    case 'backupCreated':
      keepServerLine(snapshot, line, timeUtc, 'world', 'backups');
      break;
    case 'diskSpace':
      keepServerLine(snapshot, line, timeUtc, 'world', 'disk');
      break;
    case 'gameServer':
      keepServerLine(snapshot, line, timeUtc, event.isConnected ? 'world' : 'stopped', 'steam');
      break;
    case 'globalKey':
      if (event.isSet && event.key.startsWith(DEFEATED_KEY_PREFIX) && BOSS_NAMES[event.key] !== undefined) {
        keepServerLine(snapshot, line, timeUtc, 'boss', 'boss', BOSS_NAMES[event.key]);
      }
      break;
    default:
      break;
  }
};

/**
 * Keeps the log [line] behind [event] under each number or item it changes, so the page can show where the
 * number came from. [visitSessions] are the sessions the event started or ended, such as a player joining.
 */
export const keepSourceLines = (snapshot: Snapshot, event: LogEvent, line: string, visitSessions: PlayerSession[]): void => {
  const { timeUtc } = event;
  keepServerLines(snapshot, event, line);
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
