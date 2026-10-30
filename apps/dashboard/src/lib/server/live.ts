import { dirname, join } from 'node:path';

import type { Snapshot } from '#/src/lib/models.ts';
import { readConfig } from '#/src/lib/server/config.ts';
import { firstRunKey, LogHistory, readHistory } from '#/src/lib/server/log-history.ts';
import { LogTail } from '#/src/lib/server/log-tail.ts';
import { logger } from '#/src/lib/server/logger.ts';
import { HISTORY_FOLDER_NAME, POLL_INTERVAL_MS, type Follower, type ServerState } from '#/src/lib/server/models.ts';
import { createServerState, readLogLine, startNewLog } from '#/src/lib/server/server-state.ts';

/** Functions to call with the snapshot after new log lines. */
const listeners = new Set<(snapshot: Snapshot) => void>();

/** Resolves with the state once the log was read the first time. Null until the first request. */
let started: Promise<ServerState> | null = null;

/** Reads the new lines once and copies them to the history, then gives the listeners the snapshot if any arrived. */
const poll = async (follower: Follower): Promise<void> => {
  try {
    await follower.tail.poll();
    await follower.history.flush();
  } catch (error) {
    logger.error(`Could not read or copy ${follower.logFile}: ${String(error)}`);
  }
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
