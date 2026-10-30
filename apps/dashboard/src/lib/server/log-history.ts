import { appendFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { runKeyOf } from 'valheim-log';

import type { TailListener } from '#/lib/server/models';

/** File extension of a run's copy in the history folder. */
const RUN_FILE_EXTENSION = '.txt';

/**
 * Keeps a copy of the current run's log in the history folder, so the run survives the server writing a new
 * `logs.txt`. Lines wait in memory until the run's first timestamped line names the file.
 */
export class LogHistory {
  /** Copy of the current run, once its first timestamped line arrived. */
  private runFile: string | null = null;
  /** True until the first write to [runFile], which replaces any older copy of the same run. */
  private isRunFileNew = true;
  /** Lines not written yet. */
  private pendingLines: string[] = [];

  /**
   * Creates a history in [folder].
   * @param folder History folder, created on the first write.
   */
  constructor(private readonly folder: string) {}

  /** Remembers [line] of the current run for the next [flush]. */
  record(line: string): void {
    const runKey = this.runFile === null ? runKeyOf(line) : null;
    if (runKey !== null) {
      this.runFile = join(this.folder, `${runKey}${RUN_FILE_EXTENSION}`);
    }
    this.pendingLines.push(line);
  }

  /** Starts a new run: the server replaced `logs.txt`. */
  startNewRun(): void {
    this.runFile = null;
    this.isRunFileNew = true;
    this.pendingLines = [];
  }

  /** Writes the remembered lines to the run's copy. Waits while the run has no name yet. */
  async flush(): Promise<void> {
    if (this.runFile === null || this.pendingLines.length === 0) {
      return;
    }
    const text = `${this.pendingLines.join('\n')}\n`;
    this.pendingLines = [];
    await mkdir(this.folder, { recursive: true });
    if (this.isRunFileNew) {
      this.isRunFileNew = false;
      await writeFile(this.runFile, text);
    } else {
      await appendFile(this.runFile, text);
    }
  }
}

/** Returns the first run key in the log at [logFile], or null when it is missing or has no timestamp yet. */
export const firstRunKey = async (logFile: string): Promise<string | null> => {
  const text = await readFile(logFile, 'utf8').catch(() => '');
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
  const names = await readdir(folder).catch(() => []);
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
