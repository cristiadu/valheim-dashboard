import type { Snapshot } from '../models';
import { readConfig } from './config';
import { LogTail } from './log-tail';
import { POLL_INTERVAL_MS, type ServerState } from './models';
import { createServerState, readLogLine, startNewLog } from './server-state';

/** Functions to call with the snapshot after new log lines. */
const listeners = new Set<(snapshot: Snapshot) => void>();

/** Resolves with the state once the log was read the first time. Null until the first request. */
let started: Promise<ServerState> | null = null;

/** Starts following the log: reads it once now, then checks it for new lines every few seconds. */
const start = async (): Promise<ServerState> => {
  const config = readConfig(process.env);
  const state = createServerState(config.serverUtcOffsetMinutes);
  let hasNewLines = false;
  const tail = new LogTail(config.logFile, {
    onLine: (line) => {
      readLogLine(state, line);
      hasNewLines = true;
    },
    onNewFile: () => startNewLog(state),
  });
  const poll = async (): Promise<void> => {
    await tail.poll().catch((error: unknown) => console.error(`Could not read ${config.logFile}:`, error));
    if (hasNewLines) {
      hasNewLines = false;
      listeners.forEach((listener) => listener(state.snapshot));
    }
  };
  await poll();
  const loop = (): void => {
    setTimeout(() => poll().then(loop), POLL_INTERVAL_MS).unref();
  };
  loop();
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
