import type { LogReader, SessionState } from 'valheim-log';

import type { Snapshot } from '../models';

/** Where the server writes its log when no `LOG_FILE` is set. */
export const DEFAULT_LOG_FILE = 'C:\\Valheim Server\\logs.txt';

/** How often the log file is checked for new lines. */
export const POLL_INTERVAL_MS = 2_000;

/** How often an idle live stream sends a comment, so proxies keep it open. */
export const KEEP_ALIVE_MS = 25_000;

/** Most game events kept. */
export const MAX_EVENTS = 1_000;

/** Most world saves kept. One every 10 minutes is 144 a day. */
export const MAX_SAVES = 300;

/** Most backups kept. */
export const MAX_BACKUPS = 50;

/** Dashboard settings, read from environment variables. */
export type Config = {
  /** Path of the server's `logs.txt`. From `LOG_FILE`. */
  logFile: string;
  /** Offset of the server's clock from UTC, in minutes. From `SERVER_UTC_OFFSET_MINUTES`. */
  serverUtcOffsetMinutes: number;
};

/** What a tail sends to its listener. */
export type TailListener = {
  /** Called with each new complete line, in order. */
  onLine: (line: string) => void;
  /** Called when the file was replaced by a new one, before its first line. */
  onNewFile: () => void;
};

/** What the server knows, built one log line at a time. */
export type ServerState = {
  /** Reads timestamps of the current log. */
  reader: LogReader;
  /** Turns events into player sessions. */
  sessionState: SessionState;
  /** Save number of the save in progress, from its first step. */
  pendingSaveNumber: number | null;
  /** What the page shows. Its `sessions` is the session state's list. */
  snapshot: Snapshot;
};
