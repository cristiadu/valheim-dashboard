import { applyEvent, createLogReader, createSessionState, endAllSessions, onlineSessions, readLine } from 'valheim-log';

import type { LogEvent } from 'valheim-log';

import { gearEntryOf } from '#/lib/gear';
import { squareKeyOf } from '#/lib/map';
import { type Snapshot, STORY_EVENT_TYPES, type StoryEvent } from '#/lib/models/snapshot';
import { BOSS_NAMES, BOSS_ORDER, DEFEATED_KEY_PREFIX, DUNGEON_AREA, PLACE_NAMES } from '#/lib/models/world';
import { characterOfSteamName } from '#/lib/players';
import { addActivityOf } from '#/lib/server/activities';
import { updateBags } from '#/lib/server/bags';
import { pushCapped } from '#/lib/server/lists';
import { keepServerLine, keepSourceLines } from '#/lib/server/log-sources';
import { MAX_BACKUPS, MAX_CHAT, MAX_EVENTS, MAX_RUNS, MAX_SAVES, type ServerState } from '#/lib/server/models';
import { addTerrainOf } from '#/lib/server/terrain';
import { sourceKey } from '#/lib/sources';

/** Adds [value] to the list of [key] in [lists] and returns true when it was not there yet. */
const addNew = (lists: Record<string, string[]>, key: string, value: string): boolean => {
  const list = lists[key] ?? [];
  if (list.includes(value)) {
    return false;
  }
  lists[key] = [...list, value];
  return true;
};

/** Game item names [event] shows a player has found, such as what they picked up, stored, wore or ate. */
const itemsSeenIn = (event: LogEvent): string[] => {
  switch (event.type) {
    case 'itemPickedUp':
    case 'chestChanged':
    case 'gearSeen':
    case 'smelting':
      return [event.item];
    case 'ate':
      return event.item === null ? [] : [event.item];
    case 'tombstoneContents':
      return Object.keys(event.items);
    case 'wearing':
      return event.items;
    default:
      return [];
  }
};

/** Adds the area [event] enters, the gear it shows or the place it finds to what its character has seen, and returns true when it was new. */
const addFirstSeen = (snapshot: Snapshot, event: LogEvent): boolean => {
  switch (event.type) {
    case 'areaEntered':
      return addNew(snapshot.visitedAreas, event.character, event.area);
    case 'gearSeen':
      return addNew(snapshot.gear, event.character, gearEntryOf(event.item, event.quality));
    case 'placeFound':
      return addNew(snapshot.foundPlaces, event.character, `${event.place}:${event.x}:${event.z}`);
    default:
      return false;
  }
};

/**
 * Returns true when [event] belongs in the story, where [isFirstSeen] tells whether its area or gear is new. An area
 * is news on a first visit or a trip into a dungeon, gear when it is new, a place when it is new and worth telling, and
 * a global key when it is a boss defeat.
 * Other `defeated_` keys, such as `defeated_serpent`, are not bosses.
 */
const isStoryNews = (event: LogEvent, isFirstSeen: boolean): boolean => {
  switch (event.type) {
    case 'areaEntered':
      return isFirstSeen || event.area === DUNGEON_AREA;
    case 'gearSeen':
      return isFirstSeen;
    case 'placeFound':
      return isFirstSeen && PLACE_NAMES[event.place] !== undefined;
    case 'globalKey':
      return event.isSet && event.key.startsWith(DEFEATED_KEY_PREFIX) && BOSS_NAMES[event.key] !== undefined;
    default:
      return (STORY_EVENT_TYPES as readonly string[]).includes(event.type);
  }
};

/** Creates empty state for a server whose clock is [serverUtcOffsetMinutes] from UTC. */
export const createServerState = (serverUtcOffsetMinutes: number): ServerState => {
  const sessionState = createSessionState();
  return {
    reader: createLogReader(serverUtcOffsetMinutes),
    sessionState,
    pendingSaveNumber: null,
    terrain: null,
    pieceCosts: {},
    craftCosts: {},
    pickedUpItemIds: new Set(),
    droppers: new Map(),
    foods: {},
    fireFuels: {},
    lastMeals: {},
    sureItems: {},
    unseenCrafts: {},
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
      crossplayDropsUtc: [],
      refusedJoins: [],
      activities: [],
      chat: [],
      visitedAreas: {},
      foundPlaces: {},
      gear: {},
      worn: {},
      currentAreas: {},
      kills: {},
      activityTotals: {},
      day: null,
      defeatedBosses: [],
      sources: {},
      explored: {},
      positions: {},
      chests: {},
      deathItems: {},
      leviathans: {},
      seenItems: [],
      bags: {},
      itemStacks: {},
      gameNames: {},
      terrain: {},
      vitals: {},
    },
  };
};

/**
 * Starts a new run when the server writes a new `logs.txt`. Sessions still open had no clean stop, so they
 * end at the old log's last line as a crash. History is kept, except chests and Leviathans: the new run lists
 * them again with new IDs. Item IDs start over too.
 */
export const startNewLog = (state: ServerState): void => {
  const { snapshot } = state;
  const run = snapshot.runs.at(-1);
  if (run && run.endReason === null) {
    run.endReason = 'crashed';
    const latest = snapshot.sources[sourceKey('latest')]?.lines[0];
    if (latest) {
      keepServerLine(snapshot, latest.line, latest.timeUtc, 'stopped', 'crashes');
    }
  }
  if (snapshot.lastLineUtc !== null) {
    endAllSessions(state.sessionState, snapshot.lastLineUtc, 'serverCrashed');
  }
  state.reader = createLogReader(snapshot.serverUtcOffsetMinutes);
  state.pendingSaveNumber = null;
  state.pickedUpItemIds.clear();
  state.droppers.clear();
  Object.assign(snapshot, {
    world: null,
    version: null,
    startedUtc: null,
    lastLineUtc: null,
    stoppedUtc: null,
    isGameServerConnected: null,
    chests: {},
    leviathans: {},
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
  if (isStoryNews(event, addFirstSeen(snapshot, event))) {
    pushCapped(snapshot.events, { ...event, line } as StoryEvent, MAX_EVENTS);
  }
  addActivityOf(state, event, line);
  updateBags(state, event);
  for (const item of itemsSeenIn(event)) {
    if (!snapshot.seenItems.includes(item)) {
      snapshot.seenItems.push(item);
    }
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
      if (!event.isConnected) {
        pushCapped(snapshot.steamDropsUtc, event.timeUtc, MAX_RUNS);
      }
      break;
    case 'crossplayError':
      pushCapped(snapshot.crossplayDropsUtc, event.timeUtc, MAX_RUNS);
      break;
    case 'joinRefused': {
      const steamId = event.connectionId === null ? undefined : state.sessionState.connectionSteamIds.get(event.connectionId);
      const character = snapshot.sessions.findLast((session) => steamId !== undefined && session.steamId === steamId)?.character;
      const player = character ?? (steamId === undefined ? undefined : state.sessionState.steamNames.get(steamId)) ?? null;
      pushCapped(snapshot.refusedJoins, { timeUtc: event.timeUtc, player, reason: event.reason }, MAX_RUNS);
      break;
    }
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
      pushCapped(snapshot.chat, { timeUtc, character, kind, text, line }, MAX_CHAT);
      break;
    }
    case 'areaEntered':
      snapshot.currentAreas[event.character] = event.area;
      break;
    case 'wearing':
      snapshot.worn[event.character] = event.items;
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
      pushCapped(snapshot.chat, { timeUtc: event.timeUtc, character: event.character, kind: 'ping', text: '', line }, MAX_CHAT);
      break;
    case 'position': {
      const { character, x, z, timeUtc } = event;
      snapshot.positions[character] = { x, z, timeUtc };
      const key = squareKeyOf(x, z);
      addNew(snapshot.explored, character, key);
      addTerrainOf(snapshot, state.terrain, key);
      break;
    }
    case 'chestContents': {
      const { id, chest, x, z, builder, items, timeUtc } = event;
      const label = snapshot.chests[id]?.label;
      const knownBuilder = characterOfSteamName(snapshot.sessions, builder) ?? snapshot.chests[id]?.builder ?? null;
      snapshot.chests[id] = { chest, x, z, builder: knownBuilder, items, timeUtc };
      if (label !== undefined) {
        snapshot.chests[id].label = label;
      }
      break;
    }
    case 'chestRemoved':
      delete snapshot.chests[event.id];
      break;
    case 'chestLabeled': {
      const record = snapshot.chests[event.id];
      if (record !== undefined) {
        record.label = event.label;
      }
      break;
    }
    case 'chestUnlabeled':
      delete snapshot.chests[event.id]?.label;
      break;
    case 'leviathan': {
      const { id, x, z, timeUtc } = event;
      snapshot.leviathans[id] = { x, z, timeUtc };
      break;
    }
    case 'leviathanGone':
      delete snapshot.leviathans[event.id];
      break;
    case 'tombstoneContents':
      if (event.owner !== null) {
        const { x, z, items, timeUtc } = event;
        snapshot.deathItems[event.owner] = { x, z, items, timeUtc };
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

