import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { runKeyOf } from 'valheim-log';

import { logger } from '#/lib/server/logger';
import { RUN_FILE_EXTENSION, type TailListener } from '#/lib/server/models';

/** Returns [fallback] for a [path] that does not exist yet, after logging any other [error] that kept it from being read. */
const missingOr = <T>(path: string, error: NodeJS.ErrnoException, fallback: T): T => {
  if (error.code !== 'ENOENT') {
    logger.error(`Could not read ${path}: ${String(error)}`);
  }
  return fallback;
};

/** Returns the first run key in the log at [logFile], or null when it is missing or has no timestamp yet. */
export const firstRunKey = async (logFile: string): Promise<string | null> => {
  let text: string;
  try {
    text = await readFile(logFile, 'utf8');
  } catch (error) {
    text = missingOr(logFile, error as NodeJS.ErrnoException, '');
  }
  for (const line of text.split(/\r?\n/)) {
    const runKey = runKeyOf(line);
    if (runKey !== null) {
      return runKey;
    }
  }
  return null;
};

/**
 * Reads every past run in [folder], oldest first, into [listener], skipping the run named [currentRunKey]
 * because the live `logs.txt` has it. Each run after the first starts with `onNewFile`, like a server restart.
 */
export const readHistory = async (folder: string, currentRunKey: string | null, listener: TailListener): Promise<void> => {
  let names: string[];
  try {
    names = await readdir(folder);
  } catch (error) {
    names = missingOr<string[]>(folder, error as NodeJS.ErrnoException, []);
  }
  const runFiles = names
    .filter((name) => name.endsWith(RUN_FILE_EXTENSION) && name !== `${currentRunKey}${RUN_FILE_EXTENSION}`)
    .sort();
  for (const [index, name] of runFiles.entries()) {
    if (index > 0) {
      listener.onNewFile();
    }
    const text = await readFile(join(folder, name), 'utf8');
    text.split(/\r?\n/).forEach((line) => listener.onLine(line));
  }
};
