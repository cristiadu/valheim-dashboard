import type { PlayerSession } from 'valheim-log';

import type { Plan, Snapshot } from './models';
import type { ServerState } from './server/models';
import { createServerState, readLogLine } from './server/server-state';

/** Offset of the test server's clock from UTC, in minutes (UTC−7). */
export const TEST_OFFSET_MINUTES = -420;

/** 12:00Z on the test day, Oct 29 2026. */
export const TEST_NOON_MS = Date.parse('2026-10-29T12:00:00.000Z');

/** Returns a `logs.txt` line written at [time] (server clock, `HH:MM:SS`) on 10/29/2026. */
export const logLine = (time: string, message: string): string => `10/29/2026 ${time}: ${message}`;

/** Start of a run: version, world, player history and one player who joins and spawns. Names are made up. */
export const RUN_START = [
  logLine('02:42:15', 'Valheim version: 1.0.21 (network version 41)'),
  logLine('02:42:18', 'ZNet.LoadWorld: Cotil (Cotil), save number 1183'),
  logLine('02:42:19', 'Player history entry with index 0:  Tony Example (Steam_76561198000000001, 3C9D07E1B2A4F856)'),
  logLine('02:42:23', 'Game server connected'),
  logLine('02:42:45', 'PlayFab listen socket child connected to remote player A1B2C3D4E5F60718'),
  logLine('02:42:45', 'PlayFab socket with remote ID playfab/A1B2C3D4E5F60718 received local Platform ID Steam_76561198000000001'),
  logLine('02:42:45', 'Got handshake from client playfab/A1B2C3D4E5F60718'),
  logLine('02:43:13', 'Got character ZDOID from Ragnar : 549297305:1'),
];

/** Returns an empty snapshot changed by [changes]. */
export const snapshotWith = (changes: Partial<Snapshot>): Snapshot => ({
  ...createServerState(TEST_OFFSET_MINUTES).snapshot,
  ...changes,
});

/** Returns an open session for Ragnar changed by [changes]. */
export const sessionWith = (changes: Partial<PlayerSession>): PlayerSession => ({
  character: 'Ragnar',
  peerId: '1',
  steamId: null,
  steamName: null,
  startUtc: '2026-10-29T09:43:13.000Z',
  endUtc: null,
  endReason: null,
  deaths: 0,
  ...changes,
});

/** Returns a plan to craft one Bronze axe (4 Wood, 8 Bronze, 2 Leather scraps) changed by [changes]. */
export const planWith = (changes: Partial<Plan>): Plan => ({
  id: 1,
  recipeId: 'bronze-axe',
  crafts: 1,
  have: {},
  ...changes,
});

/** Reads [lines] into [state], in order. */
export const readLines = (state: ServerState, lines: readonly string[]): void => {
  for (const line of lines) {
    readLogLine(state, line);
  }
};
