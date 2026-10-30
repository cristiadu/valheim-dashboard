import type { Snapshot } from '../models';
import { readConfig } from './config';
import { LogTail } from './log-tail';
import { logger } from './logger';
import { POLL_INTERVAL_MS, type Follower, type ServerState } from './models';
import { createServerState, readLogLine, startNewLog } from './server-state';

/** Functions to call with the snapshot after new log lines. */
const listeners = new Set<(snapshot: Snapshot) => void>();

/** Resolves with the state once the log was read the first time. Null until the first request. */
let started: Promise<ServerState> | null = null;

/** Reads the new lines once, then gives the listeners the snapshot if any arrived. */
const poll = async (follower: Follower): Promise<void> => {
  try {
    await follower.tail.poll();
  } catch (error) {
    logger.error(`Could not read ${follower.logFile}: ${String(error)}`);
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

/** Starts following the log: reads it once now, then checks it for new lines every few seconds. */
const start = async (): Promise<ServerState> => {
  const config = readConfig(process.env);
  const state = createServerState(config.serverUtcOffsetMinutes);
  const follower: Follower = {
    logFile: config.logFile,
    state,
    hasNewLines: false,
    tail: new LogTail(config.logFile, {
      onLine: (line) => {
        readLogLine(state, line);
        follower.hasNewLines = true;
      },
      onNewFile: () => startNewLog(state),
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
