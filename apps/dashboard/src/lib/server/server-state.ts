import { applyEvent, createLogReader, createSessionState, endAllSessions, onlineSessions, readLine } from 'valheim-log';

import { STORY_EVENT_TYPES, type StoryEvent } from '../models';
import { MAX_BACKUPS, MAX_EVENTS, MAX_SAVES, type ServerState } from './models';

/** Adds [item] to the end of [list] and drops the oldest items past [max]. */
const pushCapped = <T>(list: T[], item: T, max: number): void => {
  list.push(item);
  list.splice(0, Math.max(0, list.length - max));
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
    },
  };
};

/**
 * Starts a new run when the server writes a new `logs.txt`. Sessions still open had no clean stop, so they
 * end at the old log's last line as a crash. History is kept.
 */
export const startNewLog = (state: ServerState): void => {
  const { snapshot } = state;
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

/** Reads one log [line] into [state]. Lines the parser does not know only move the last line time. */
export const readLogLine = (state: ServerState, line: string): void => {
  const event = readLine(state.reader, line);
  if (event === null) {
    return;
  }
  const { snapshot } = state;
  snapshot.startedUtc ??= event.timeUtc;
  snapshot.lastLineUtc = event.timeUtc;
  applyEvent(state.sessionState, event);
  if ((STORY_EVENT_TYPES as readonly string[]).includes(event.type)) {
    pushCapped(snapshot.events, event as StoryEvent, MAX_EVENTS);
  }
  switch (event.type) {
    case 'worldLoaded':
      snapshot.world = event.world;
      break;
    case 'serverVersion':
      snapshot.version = event.version;
      break;
    case 'gameServer':
      snapshot.isGameServerConnected = event.isConnected;
      break;
    case 'serverStopped':
      snapshot.stoppedUtc = event.timeUtc;
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
