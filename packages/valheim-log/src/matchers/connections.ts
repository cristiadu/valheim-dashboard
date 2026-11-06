import type { Matcher } from '#/models';
import {
  CHARACTER_PATTERN,
  DISCONNECT_PATTERN,
  HANDSHAKE_PATTERN,
  KNOWN_PLAYER_PATTERN,
  OBJECTS_REMOVED_PATTERN,
  PLAYER_COUNT_PATTERN,
  PLAYFAB_CONNECTED_PATTERN,
  SOCKET_CLOSED_PATTERN,
  STEAM_CONNECTED_PATTERN,
  STEAM_ID_PREFIX,
  STEAM_LINKED_PATTERN,
} from '#/patterns';

/** Messages about players connecting, joining with a character and leaving. */
export const CONNECTION_MATCHERS: readonly Matcher[] = [
  {
    pattern: KNOWN_PLAYER_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'knownPlayer', timeUtc, steamName: groups.steamName!, steamId: groups.steamId! }),
  },
  {
    pattern: PLAYFAB_CONNECTED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'playerConnecting', timeUtc, connectionId: groups.playFabId!, steamId: null }),
  },
  {
    pattern: STEAM_CONNECTED_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'playerConnecting',
      timeUtc,
      connectionId: groups.steamId!,
      steamId: `${STEAM_ID_PREFIX}${groups.steamId}`,
    }),
  },
  {
    pattern: STEAM_LINKED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'steamLinked', timeUtc, playFabId: groups.playFabId!, steamId: groups.steamId! }),
  },
  {
    pattern: HANDSHAKE_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'handshake', timeUtc, connectionId: groups.connectionId! }),
  },
  {
    pattern: CHARACTER_PATTERN,
    toEvent: (groups, timeUtc) =>
      groups.peerId === '0' && groups.objectId === '0'
        ? { type: 'playerDied', timeUtc, character: groups.character! }
        : { type: 'characterSpawned', timeUtc, character: groups.character!, peerId: groups.peerId! },
  },
  {
    pattern: OBJECTS_REMOVED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'playerLeft', timeUtc, peerId: groups.peerId! }),
  },
  {
    pattern: PLAYER_COUNT_PATTERN,
    toEvent: (groups, timeUtc) => ({
      type: 'playerCount',
      timeUtc,
      players: Number(groups.players),
      isJoin: groups.change === 'joined',
    }),
  },
  {
    pattern: DISCONNECT_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'playerDisconnecting', timeUtc, isTimeout: groups.timeout !== undefined }),
  },
  {
    pattern: SOCKET_CLOSED_PATTERN,
    toEvent: (groups, timeUtc) => ({ type: 'socketClosed', timeUtc, steamId: `${STEAM_ID_PREFIX}${groups.steamId}` }),
  },
];
