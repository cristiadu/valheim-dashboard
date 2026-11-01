import { applyEvent, createLogReader, createSessionState, endAllSessions, onlineSessions, readLine } from 'valheim-log';

import type { LogEvent } from 'valheim-log';

import {
  type ActivityKind,
  type ActivityRecord,
  BOSS_NAMES,
  BOSS_ORDER,
  DEFEATED_KEY_PREFIX,
  DUNGEON_AREA,
  type Snapshot,
  STORY_EVENT_TYPES,
  type StoryEvent,
} from '#/lib/models';
import { keepSourceLines } from '#/lib/server/log-sources';
import {
  ACTIVITY_GAP_MS,
  MAX_ACTIVITIES,
  MAX_BACKUPS,
  MAX_CHAT,
  MAX_EVENTS,
  MAX_RUNS,
  MAX_SAVES,
  type ServerState,
} from '#/lib/server/models';

/** Adds [item] to the end of [list] and drops the oldest items past [max]. */
const pushCapped = <T>(list: T[], item: T, max: number): void => {
  list.push(item);
  list.splice(0, Math.max(0, list.length - max));
};

/**
 * Adds [count] of [thing] to the player's latest stretch of the same [kind], or starts a new stretch when the
 * player paused longer than [ACTIVITY_GAP_MS].
 */
const addActivity = (
  activities: ActivityRecord[],
  timeUtc: string,
  player: string | null,
  kind: ActivityKind,
  thing: string,
  count: number,
): void => {
  const stretch = activities.findLast((activity) => activity.player === player && activity.kind === kind);
  if (stretch && Date.parse(timeUtc) - Date.parse(stretch.endUtc) <= ACTIVITY_GAP_MS) {
    stretch.endUtc = timeUtc;
    stretch.things[thing] = (stretch.things[thing] ?? 0) + count;
    return;
  }
  pushCapped(activities, { player, kind, startUtc: timeUtc, endUtc: timeUtc, things: { [thing]: count } }, MAX_ACTIVITIES);
};

/** Adds [value] to the list of [key] in [lists] and returns true when it was not there yet. */
const addNew = (lists: Record<string, string[]>, key: string, value: string): boolean => {
  const list = lists[key] ?? [];
  if (list.includes(value)) {
    return false;
  }
  lists[key] = [...list, value];
  return true;
};

/**
 * Returns true when [event] belongs in the story. An area is news on a first visit or a trip into a dungeon,
 * gear when it is new, and a global key when it is a boss defeat.
 */
const isStoryNews = (snapshot: Snapshot, event: LogEvent): boolean => {
  switch (event.type) {
    case 'areaEntered':
      return addNew(snapshot.visitedAreas, event.character, event.area) || event.area === DUNGEON_AREA;
    case 'gearSeen':
      return addNew(snapshot.gear, event.character, event.quality > 1 ? `${event.item} quality ${event.quality}` : event.item);
    case 'globalKey':
      return event.isSet && event.key.startsWith(DEFEATED_KEY_PREFIX);
    default:
      return (STORY_EVENT_TYPES as readonly string[]).includes(event.type);
  }
};

/**
 * Adds the activity [event] stands for, such as a piece built or a creature killed, to [activities]. An item
 * counts as gathered only the first time anyone picks it up.
 */
const addActivityOf = (activities: ActivityRecord[], event: LogEvent): void => {
  const { timeUtc } = event;
  switch (event.type) {
    case 'pieceBuilt':
      addActivity(activities, timeUtc, event.builder, 'built', event.piece, 1);
      break;
    case 'pieceDestroyed':
      addActivity(activities, timeUtc, event.builder, 'destroyed', event.piece, 1);
      break;
    case 'creatureKilled':
      for (const attacker of event.attackers) {
        addActivity(activities, timeUtc, attacker, 'killed', event.creature, 1);
      }
      break;
    case 'itemPickedUp':
      if (event.isFirstPickup) {
        addActivity(activities, timeUtc, event.player, 'gathered', event.item, event.count);
      }
      break;
    case 'chestChanged':
      addActivity(activities, timeUtc, event.player, event.isStored ? 'stored' : 'taken', event.item, event.count);
      break;
    default:
      break;
  }
};

/** Creates empty state for a server whose clock is [serverUtcOffsetMinutes] from UTC. */
export const createServerState = (serverUtcOffsetMinutes: number): ServerState => {
  const sessionState = createSessionState();
  return {
    reader: createLogReader(serverUtcOffsetMinutes),
    sessionState,
    pendingSaveNumber: null,
    snapshot: {
      serverUtcOffsetMinutes,
      world: null,
      version: null,
      startedUtc: null,
      lastLineUtc: null,
      stoppedUtc: null,
      isGameServerConnected: null,
      sessions: sessionState.sessions,
      events: [],
      saves: [],
      backups: [],
      diskSpace: null,
      runs: [],
      steamDropsUtc: [],
      activities: [],
      chat: [],
      visitedAreas: {},
      gear: {},
      currentAreas: {},
      kills: {},
      day: null,
      defeatedBosses: [],
      sources: {},
    },
  };
};

/**
 * Starts a new run when the server writes a new `logs.txt`. Sessions still open had no clean stop, so they
 * end at the old log's last line as a crash. History is kept.
 */
export const startNewLog = (state: ServerState): void => {
  const { snapshot } = state;
  const run = snapshot.runs.at(-1);
  if (run && run.endReason === null) {
    run.endReason = 'crashed';
  }
  if (snapshot.lastLineUtc !== null && onlineSessions(state.sessionState).length > 0) {
    endAllSessions(state.sessionState, snapshot.lastLineUtc, 'serverCrashed');
  }
  state.reader = createLogReader(snapshot.serverUtcOffsetMinutes);
  state.pendingSaveNumber = null;
  Object.assign(snapshot, {
    world: null,
    version: null,
    startedUtc: null,
    lastLineUtc: null,
    stoppedUtc: null,
    isGameServerConnected: null,
  });
};

/**
 * Adds the bosses that the world save's global [keys] mark as defeated to [snapshot], in the order players
 * meet them. This covers defeats from before the log was kept. Returns true when any boss was new.
 */
export const addSavedBosses = (snapshot: Snapshot, keys: string[]): boolean => {
  const savedBosses = new Set(keys.filter((key) => key.startsWith(DEFEATED_KEY_PREFIX)).map((key) => BOSS_NAMES[key]));
  const newBosses = BOSS_ORDER.filter((boss) => savedBosses.has(boss) && !snapshot.defeatedBosses.includes(boss));
  snapshot.defeatedBosses.push(...newBosses);
  return newBosses.length > 0;
};

/** Reads one log [line] into [state]. Lines the parser does not know only move the last line time. */
export const readLogLine = (state: ServerState, line: string): void => {
  const event = readLine(state.reader, line);
  if (event === null) {
    return;
  }
  const { snapshot } = state;
  if (snapshot.startedUtc === null) {
    snapshot.startedUtc = event.timeUtc;
    pushCapped(snapshot.runs, { startUtc: event.timeUtc, lastLineUtc: event.timeUtc, endReason: null }, MAX_RUNS);
  }
  snapshot.lastLineUtc = event.timeUtc;
  snapshot.runs.at(-1)!.lastLineUtc = event.timeUtc;
  const openSessions = onlineSessions(state.sessionState);
  const sessionCount = snapshot.sessions.length;
  applyEvent(state.sessionState, event);
  const endedSessions = openSessions.filter((session) => session.endUtc !== null);
  keepSourceLines(snapshot, event, line, [...endedSessions, ...snapshot.sessions.slice(sessionCount)]);
  if (isStoryNews(snapshot, event)) {
    pushCapped(snapshot.events, event as StoryEvent, MAX_EVENTS);
  }
  addActivityOf(snapshot.activities, event);
  switch (event.type) {
    case 'worldLoaded':
      snapshot.world = event.world;
      break;
    case 'serverVersion':
      snapshot.version = event.version;
      break;
    case 'gameServer':
      snapshot.isGameServerConnected = event.isConnected;
      if (!event.isConnected) {
        pushCapped(snapshot.steamDropsUtc, event.timeUtc, MAX_RUNS);
      }
      break;
    case 'serverStopped':
      snapshot.stoppedUtc = event.timeUtc;
      snapshot.runs.at(-1)!.endReason = 'stopped';
      break;
    case 'worldSaveStep':
      if (event.step === 1) {
        state.pendingSaveNumber = event.saveNumber;
      } else if (event.step === 5) {
        const save = { timeUtc: event.timeUtc, durationMs: event.durationMs, saveNumber: state.pendingSaveNumber };
        pushCapped(snapshot.saves, save, MAX_SAVES);
        state.pendingSaveNumber = null;
      }
      break;
    case 'chatMessage': {
      const { timeUtc, character, kind, text } = event;
      pushCapped(snapshot.chat, { timeUtc, character, kind, text }, MAX_CHAT);
      break;
    }
    case 'areaEntered':
      snapshot.currentAreas[event.character] = event.area;
      break;
    case 'creatureKilled':
      for (const attacker of event.attackers) {
        const kills = (snapshot.kills[attacker] ??= {});
        kills[event.creature] = (kills[event.creature] ?? 0) + 1;
      }
      break;
    case 'dayStarted':
      snapshot.day = event.day;
      break;
    case 'globalKey': {
      const boss = BOSS_NAMES[event.key];
      if (event.isSet && boss !== undefined && !snapshot.defeatedBosses.includes(boss)) {
        snapshot.defeatedBosses.push(boss);
      }
      break;
    }
    case 'ping':
      pushCapped(snapshot.chat, { timeUtc: event.timeUtc, character: event.character, kind: 'ping', text: '' }, MAX_CHAT);
      break;
    case 'backupCreated':
      pushCapped(snapshot.backups, { timeUtc: event.timeUtc, backup: event.backup }, MAX_BACKUPS);
      break;
    case 'diskSpace': {
      const { timeUtc, availableBytes, warnBelowBytes, blockedBelowBytes } = event;
      snapshot.diskSpace = { timeUtc, availableBytes, warnBelowBytes, blockedBelowBytes };
      break;
    }
    default:
      break;
  }
};
