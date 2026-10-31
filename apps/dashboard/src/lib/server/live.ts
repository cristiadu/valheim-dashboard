import { dirname, join } from 'node:path';

import type { Snapshot } from '#/lib/models';
import { readConfig } from '#/lib/server/config';
import { firstRunKey, LogHistory, readHistory } from '#/lib/server/log-history';
import { LogTail } from '#/lib/server/log-tail';
import { logger } from '#/lib/server/logger';
import { HISTORY_FOLDER_NAME, POLL_INTERVAL_MS, WORLDS_FOLDER_NAME, type Follower, type ServerState } from '#/lib/server/models';
import { addSavedBosses, createServerState, readLogLine, startNewLog } from '#/lib/server/server-state';
import { readSavedGlobalKeys } from '#/lib/server/world-save';

/** Functions to call with the snapshot after new log lines. */
const listeners = new Set<(snapshot: Snapshot) => void>();

/** Resolves with the state once the log was read the first time. Null until the first request. */
let started: Promise<ServerState> | null = null;

/**
 * Reads the bosses defeated from the world's newest save once the world is known and after each save, so
 * defeats from before the log was kept show too.
 */
const readSavedBosses = async (follower: Follower): Promise<void> => {
  const { snapshot } = follower.state;
  const saveRead = `${snapshot.world} ${snapshot.saves.at(-1)?.timeUtc ?? 'before the first save'}`;
  if (snapshot.world === null || saveRead === follower.worldSaveRead) {
    return;
  }
  follower.worldSaveRead = saveRead;
  const worldFolder = join(dirname(follower.logFile), WORLDS_FOLDER_NAME, snapshot.world);
  try {
    if (addSavedBosses(snapshot, await readSavedGlobalKeys(worldFolder))) {
      follower.hasNewLines = true;
    }
  } catch (error) {
    logger.error(`Could not read the bosses defeated from the save in ${worldFolder}: ${String(error)}`);
  }
};

/** Reads the new lines once and copies them to the history, then gives the listeners the snapshot if any arrived. */
const poll = async (follower: Follower): Promise<void> => {
  try {
    await follower.tail.poll();
    await follower.history.flush();
  } catch (error) {
    logger.error(`Could not read or copy ${follower.logFile}: ${String(error)}`);
  }
  await readSavedBosses(follower);
  if (follower.hasNewLines) {
    follower.hasNewLines = false;
    listeners.forEach((listener) => listener(follower.state.snapshot));
  }
};

/** Polls again after the poll interval, and keeps doing so. */
const pollLater = (follower: Follower): void => {
  setTimeout(async () => {
    await poll(follower);
    pollLater(follower);
  }, POLL_INTERVAL_MS).unref();
};

/**
 * Starts following the log: reads the past runs in the history folder, then the live log once, then checks
 * it for new lines every few seconds.
 */
const start = async (): Promise<ServerState> => {
  const config = readConfig(process.env);
  const state = createServerState(config.serverUtcOffsetMinutes);
  const historyFolder = join(dirname(config.logFile), HISTORY_FOLDER_NAME);
  await readHistory(historyFolder, await firstRunKey(config.logFile), {
    onLine: (line) => readLogLine(state, line),
    onNewFile: () => startNewLog(state),
  });
  if (state.snapshot.startedUtc !== null) {
    startNewLog(state);
  }
  const history = new LogHistory(historyFolder);
  const follower: Follower = {
    logFile: config.logFile,
    state,
    history,
    hasNewLines: false,
    worldSaveRead: null,
    tail: new LogTail(config.logFile, {
      onLine: (line) => {
        readLogLine(state, line);
        history.record(line);
        follower.hasNewLines = true;
      },
      onNewFile: () => {
        startNewLog(state);
        history.startNewRun();
      },
    }),
  };
  await poll(follower);
  pollLater(follower);
  return state;
};

/** Returns what the server knows now. The first call starts following the log. */
export const currentSnapshot = async (): Promise<Snapshot> => {
  started ??= start();
  return (await started).snapshot;
};

/** Calls [listener] with the snapshot after each batch of new log lines. Returns a function that stops it. */
export const subscribe = (listener: (snapshot: Snapshot) => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
