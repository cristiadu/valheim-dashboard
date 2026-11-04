import { dirname, join } from 'node:path';

import type { Snapshot, SnapshotChange } from '#/lib/models';
import { readConfig } from '#/lib/server/config';
import { firstRunKey, LogHistory, readHistory } from '#/lib/server/log-history';
import { LogTail } from '#/lib/server/log-tail';
import { logger } from '#/lib/server/logger';
import {
  HISTORY_FOLDER_NAME,
  ITEM_STACKS_FILE_NAME,
  MISSING_FILE_MS,
  PLAYER_VITALS_FILE_NAME,
  POLL_INTERVAL_MS,
  TERRAIN_FILE_PREFIX,
  WORLDS_FOLDER_NAME,
  type Follower,
} from '#/lib/server/models';
import { addSavedBosses, createServerState, readLogLine, setTerrain, startNewLog } from '#/lib/server/server-state';
import { readItemStacks } from '#/lib/server/item-stacks';
import { readVitals } from '#/lib/server/player-vitals';
import { readTerrain } from '#/lib/server/terrain';
import { readSavedGlobalKeys } from '#/lib/server/world-save';
import { changeBetween } from '#/lib/snapshot-change';

/** Functions to call with what changed in the snapshot after new log lines. */
const listeners = new Set<(change: SnapshotChange) => void>();

/** Resolves with the follower once the log was read the first time. Null until the first request. */
let started: Promise<Follower> | null = null;

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

/**
 * Reads the terrain file the plugin writes next to the log on each server start, once per world and run. A
 * missing file is reported once, since the plugin writes it a few seconds after the start.
 */
const readWorldTerrain = async (follower: Follower): Promise<void> => {
  const { world, startedUtc } = follower.state.snapshot;
  const terrainKey = `${world} ${startedUtc}`;
  if (world === null || terrainKey === follower.terrainRead) {
    return;
  }
  const path = join(dirname(follower.logFile), `${TERRAIN_FILE_PREFIX}${world}.txt`);
  try {
    setTerrain(follower.state, await readTerrain(path));
    follower.terrainRead = terrainKey;
    follower.hasNewLines = true;
  } catch (error) {
    if (follower.state.terrain === null && follower.terrainRead !== `missing ${terrainKey}`) {
      follower.terrainRead = `missing ${terrainKey}`;
      logger.warn(`No terrain in ${path} yet: ${String(error)}`);
    }
  }
};

/**
 * Reads the item stacks file the plugin writes next to the log on each server start, once per run. A missing file
 * is reported once, since the plugin writes it a few seconds after the start.
 */
const readStacks = async (follower: Follower): Promise<void> => {
  const { startedUtc } = follower.state.snapshot;
  if (startedUtc === null || startedUtc === follower.itemStacksRead) {
    return;
  }
  const path = join(dirname(follower.logFile), ITEM_STACKS_FILE_NAME);
  try {
    follower.state.snapshot.itemStacks = await readItemStacks(path);
    follower.itemStacksRead = startedUtc;
    follower.hasNewLines = true;
  } catch (error) {
    if (follower.itemStacksRead !== `missing ${startedUtc}`) {
      follower.itemStacksRead = `missing ${startedUtc}`;
      logger.warn(`No item stacks in ${path} yet: ${String(error)}`);
    }
  }
};

/**
 * Reads the player vitals file the plugin rewrites next to the log when a player's health, stamina or eitr changes.
 * Players missing from it keep the numbers they had when last seen. A missing file is reported once.
 */
const readPlayerVitals = async (follower: Follower): Promise<void> => {
  const path = join(dirname(follower.logFile), PLAYER_VITALS_FILE_NAME);
  try {
    const read = await readVitals(path, follower.vitalsChangedMs);
    if (read !== null) {
      Object.assign(follower.state.snapshot.vitals, read.vitals);
      follower.vitalsChangedMs = read.changedMs;
      follower.hasNewLines = true;
    }
  } catch (error) {
    if (follower.vitalsChangedMs !== MISSING_FILE_MS) {
      follower.vitalsChangedMs = MISSING_FILE_MS;
      logger.warn(`No player vitals in ${path} yet: ${String(error)}`);
    }
  }
};

/** Reads the new lines once and copies them to the history, then tells the listeners what changed if any arrived. */
const poll = async (follower: Follower): Promise<void> => {
  try {
    await follower.tail.poll();
    await follower.history.flush();
  } catch (error) {
    logger.error(`Could not read or copy ${follower.logFile}: ${String(error)}`);
  }
  await readSavedBosses(follower);
  await readWorldTerrain(follower);
  await readStacks(follower);
  await readPlayerVitals(follower);
  if (follower.hasNewLines) {
    follower.hasNewLines = false;
    const { snapshot } = follower.state;
    const change = changeBetween(follower.sentSnapshot, snapshot);
    follower.sentSnapshot = structuredClone(snapshot);
    if (change !== null) {
      listeners.forEach((listener) => listener(change));
    }
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
const start = async (): Promise<Follower> => {
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
    sentSnapshot: structuredClone(state.snapshot),
    worldSaveRead: null,
    terrainRead: null,
    itemStacksRead: null,
    vitalsChangedMs: null,
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
  return follower;
};

/** Returns what the server knows now. The first call starts following the log. */
export const currentSnapshot = async (): Promise<Snapshot> => {
  started ??= start();
  return (await started).state.snapshot;
};

/** Returns the snapshot as the live stream last sent it, which a new stream starts from before any change. */
export const sentSnapshot = async (): Promise<Snapshot> => {
  started ??= start();
  return (await started).sentSnapshot;
};

/** Calls [listener] with what changed in the snapshot after each batch of new log lines. Returns a function that stops it. */
export const subscribe = (listener: (change: SnapshotChange) => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
