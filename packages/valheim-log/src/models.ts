/** Why the server refused a join. */
export type JoinRefusedReason =
  | 'wrongPassword'
  | 'incompatibleVersion'
  | 'notPermitted'
  | 'invalidSessionTicket'
  | 'serverFull'
  | 'blockedByHost'
  | 'notAuthenticated'
  | 'crossplayNotAllowed';

/**
 * How a player session ended: the player left, their connection timed out, the server stopped cleanly,
 * or a new log started without a clean stop (a crash).
 */
export type SessionEndReason = 'left' | 'timedOut' | 'serverStopped' | 'serverCrashed';

/** How a chat message was sent: normal talk, a shout or a whisper. */
export type ChatKind = 'said' | 'shouted' | 'whispered';

/** How a tame changed: a creature was tamed, a young tame was born, a young tame grew up, or a tame died. */
export type TameChange = 'tamed' | 'born' | 'grewUp' | 'died';

/** One event read from `logs.txt`. `timeUtc` is the log time moved to UTC, as an ISO string. */
export type LogEvent = { timeUtc: string } & (
  | { type: 'knownPlayer'; steamName: string; steamId: string }
  | { type: 'playerConnecting'; connectionId: string; steamId: string | null }
  | { type: 'steamLinked'; playFabId: string; steamId: string }
  | { type: 'handshake'; connectionId: string }
  | { type: 'characterSpawned'; character: string; peerId: string }
  | { type: 'playerDied'; character: string }
  | { type: 'playerLeft'; peerId: string }
  | { type: 'playerCount'; players: number; isJoin: boolean }
  | { type: 'playerDisconnecting'; isTimeout: boolean }
  | { type: 'socketClosed'; steamId: string }
  | { type: 'joinRefused'; reason: JoinRefusedReason; message: string }
  | { type: 'raidCheck'; possibleRaids: number }
  | { type: 'raidStarted'; raid: string }
  | { type: 'pieceBuilt'; piece: string; builder: string | null }
  | { type: 'pieceDestroyed'; piece: string; builder: string | null }
  | { type: 'nightSkipped'; day: number }
  | { type: 'chatMessage'; character: string; kind: ChatKind; text: string }
  | { type: 'ping'; character: string; x: number; z: number }
  | { type: 'globalKey'; key: string; isSet: boolean }
  | { type: 'raidEnded'; raid: string }
  | { type: 'bossSummoned'; boss: string; summoner: string | null }
  | { type: 'dayStarted'; day: number }
  | { type: 'deathDetails'; character: string; area: string; fighting: string[] }
  | { type: 'areaEntered'; character: string; area: string }
  | { type: 'teleported'; character: string; portal: string | null }
  | { type: 'pvpChanged'; character: string; isOn: boolean }
  | { type: 'wentToBed'; character: string }
  | { type: 'gearSeen'; character: string; item: string; quality: number }
  | { type: 'creatureKilled'; creature: string; level: number; attackers: string[] }
  | { type: 'tameChanged'; creature: string; change: TameChange; name: string | null }
  | { type: 'petNamed'; creature: string; name: string }
  | { type: 'signWritten'; author: string | null; text: string }
  | { type: 'itemHung'; item: string; player: string | null }
  | { type: 'itemPickedUp'; item: string; count: number; player: string | null; isFirstPickup: boolean }
  | { type: 'chestChanged'; item: string; count: number; chest: string; player: string | null; isStored: boolean }
  | { type: 'harvested'; plant: string; player: string | null }
  | { type: 'tombstoneEmptied'; owner: string | null; player: string | null }
  | { type: 'position'; character: string; x: number; z: number }
  | {
      type: 'chestContents';
      id: string;
      chest: string;
      x: number;
      z: number;
      builder: string | null;
      items: Record<string, number>;
    }
  | { type: 'chestRemoved'; id: string }
  | { type: 'tombstoneContents'; owner: string | null; x: number; z: number; items: Record<string, number> }
  | { type: 'worldSaveStep'; step: number; durationMs: number; saveNumber: number | null }
  | { type: 'backupCreated'; backup: string }
  | { type: 'diskSpace'; availableBytes: number; blockedBelowBytes: number; warnBelowBytes: number }
  | { type: 'serverVersion'; version: string; networkVersion: number }
  | { type: 'worldLoaded'; world: string; saveNumber: number | null }
  | { type: 'gameServer'; isConnected: boolean }
  | { type: 'serverStopped' }
  | { type: 'otherLine'; message: string; isEngineLine: boolean }
);

/** Named groups of a pattern match. Optional groups that did not match are `undefined` at runtime. */
export type Groups = Record<string, string | undefined>;

/** One pattern and how to turn its match into an event. Checked in order; the first match wins. */
export type Matcher = {
  pattern: RegExp;
  toEvent: (groups: Groups, timeUtc: string, message: string) => LogEvent;
};

/** Name of an event type, for example `characterSpawned`. */
export type LogEventType = LogEvent['type'];

/** One stay of a player on the server, from character spawn to leave. Times are UTC ISO strings. */
export type PlayerSession = {
  /** In-game character name, for example `Ragnar`. */
  character: string;
  /** ID of the connection in the world, used to match the leave. */
  peerId: string;
  /** Steam ID, for example `Steam_76561198000000001`, when the log linked the connection to one. */
  steamId: string | null;
  /** Steam profile name, when the player is in the server's player history. */
  steamName: string | null;
  /** When the character spawned. */
  startUtc: string;
  /** When the session ended. Null while the player is online. */
  endUtc: string | null;
  /** Why the session ended. Null while the player is online. */
  endReason: SessionEndReason | null;
  /** Deaths during this session. */
  deaths: number;
};

/** State of a reader that reads `logs.txt` one line at a time. */
export type LogReader = {
  /** Offset of the server's clock from UTC, in minutes, for example `-420` for UTC-7. */
  serverUtcOffsetMinutes: number;
  /** Time of the last timestamped line, as a UTC ISO string. Lines without a timestamp take it. */
  lastTimeUtc: string | null;
};

/** State that turns events into player sessions, one event at a time. */
export type SessionState = {
  /** Every session seen so far, oldest first. */
  sessions: PlayerSession[];
  /** Steam name by Steam ID, from the player history at startup. */
  steamNames: Map<string, string>;
  /** Steam ID by connection ID. */
  connectionSteamIds: Map<string, string>;
  /** Connection of the last handshake. The next character spawn belongs to it. */
  lastHandshakeConnectionId: string | null;
  /** True after a timeout line, until the leave it explains. */
  isTimeoutPending: boolean;
};
