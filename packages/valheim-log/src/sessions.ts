import type { LogEvent, PlayerSession, SessionEndReason, SessionState } from '#/models';

/** Creates empty session state. */
export const createSessionState = (): SessionState => ({
  sessions: [],
  steamNames: new Map(),
  connectionSteamIds: new Map(),
  lastHandshakeConnectionId: null,
  isTimeoutPending: false,
});

/** Returns the sessions of players who are online now. */
export const onlineSessions = (state: SessionState): PlayerSession[] =>
  state.sessions.filter((session) => session.endUtc === null);

/** Ends every online session that matches [isMatch] at [timeUtc] for [reason]. */
const endSessions = (
  state: SessionState,
  isMatch: (session: PlayerSession) => boolean,
  timeUtc: string,
  reason: SessionEndReason,
): void => {
  for (const session of onlineSessions(state).filter(isMatch)) {
    session.endUtc = timeUtc;
    session.endReason = reason;
  }
};

/** Returns the reason for a leave, using up a pending timeout. */
const takeLeaveReason = (state: SessionState): SessionEndReason => {
  const reason = state.isTimeoutPending ? 'timedOut' : 'left';
  state.isTimeoutPending = false;
  return reason;
};

/**
 * Ends every online session at [timeUtc] for [reason]. The server starts a new `logs.txt` on every run;
 * when a new one starts while sessions are open, call this with the old log's last time and `serverCrashed`.
 */
export const endAllSessions = (state: SessionState, timeUtc: string, reason: SessionEndReason): void =>
  endSessions(state, () => true, timeUtc, reason);

/**
 * Updates [state] with one [event], in log order. A session starts at a character's first spawn after a
 * handshake and ends when the server removes that connection's objects, a Steam socket closes, or the
 * server stops.
 */
export const applyEvent = (state: SessionState, event: LogEvent): void => {
  switch (event.type) {
    case 'knownPlayer':
      state.steamNames.set(event.steamId, event.steamName);
      break;
    case 'playerConnecting':
      if (event.steamId !== null) {
        state.connectionSteamIds.set(event.connectionId, event.steamId);
      }
      break;
    case 'steamLinked':
      state.connectionSteamIds.set(event.playFabId, event.steamId);
      break;
    case 'handshake':
      state.lastHandshakeConnectionId = event.connectionId;
      break;
    case 'characterSpawned': {
      if (onlineSessions(state).some((session) => session.peerId === event.peerId)) {
        break;
      }
      const steamId = state.connectionSteamIds.get(state.lastHandshakeConnectionId ?? '') ?? null;
      state.sessions.push({
        character: event.character,
        peerId: event.peerId,
        steamId,
        steamName: steamId === null ? null : (state.steamNames.get(steamId) ?? null),
        startUtc: event.timeUtc,
        endUtc: null,
        endReason: null,
        deaths: 0,
      });
      state.lastHandshakeConnectionId = null;
      break;
    }
    case 'playerDied':
      for (const session of onlineSessions(state).filter((s) => s.character === event.character)) {
        session.deaths += 1;
      }
      break;
    case 'playerDisconnecting':
      state.isTimeoutPending = event.isTimeout;
      break;
    case 'playerLeft':
      endSessions(state, (s) => s.peerId === event.peerId, event.timeUtc, takeLeaveReason(state));
      break;
    case 'socketClosed':
      endSessions(state, (s) => s.steamId === event.steamId, event.timeUtc, takeLeaveReason(state));
      break;
    case 'serverStopped':
      endAllSessions(state, event.timeUtc, 'serverStopped');
      break;
    default:
      break;
  }
};

/** Returns the player sessions found in [events]. */
export const buildSessions = (events: readonly LogEvent[]): PlayerSession[] => {
  const state = createSessionState();
  for (const event of events) {
    applyEvent(state, event);
  }
  return state.sessions;
};
