import { parseLog } from '#/src/logReader.ts';
import type { LogEvent } from '#/src/models.ts';

/** Offset of the sample server's clock from UTC, in minutes (UTC-7). */
export const SAMPLE_SERVER_UTC_OFFSET_MINUTES = -420;

/**
 * A crossplay server log with one play session, a death, a raid and a save. Names and IDs are replaced; the
 * rest is copied from a real 1.0.21 server log.
 */
export const CROSSPLAY_LOG = `Mono path[0] = 'C:/Program Files (x86)/Steam/steamapps/common/Valheim dedicated server/valheim_server_Data/Managed'
10/29/2026 02:42:15: Valheim version: 1.0.21 (network version 41)
10/29/2026 02:42:18: ZNet.LoadWorld: Cotil (Cotil), save number 1183
10/29/2026 02:42:19: Player history entry with index 0:  Tony Example (Steam_76561198000000001, 3C9D07E1B2A4F856)
10/29/2026 02:42:23: Game server connected
10/29/2026 02:42:45: PlayFab listen socket child connected to remote player A1B2C3D4E5F60718
10/29/2026 02:42:45: Player joined server "FlanServer" that has join code 123456, now 1 player(s)
10/29/2026 02:42:45: PlayFab socket with remote ID playfab/A1B2C3D4E5F60718 received local Platform ID Steam_76561198000000001
10/29/2026 02:42:45: Got handshake from client playfab/A1B2C3D4E5F60718
10/29/2026 02:43:13: Got character ZDOID from Ragnar : 549297305:1
10/29/2026 03:10:02: Got character ZDOID from Ragnar : 0:0
10/29/2026 03:10:20: Got character ZDOID from Ragnar : 549297305:2
10/29/2026 03:20:39: Possible events:1
10/29/2026 03:20:40: Random event set:army_eikthyr
10/29/2026 03:52:15: Available space to current user: 278647042048. Saving is blocked if below: 14961108 bytes. Warnings are given if below: 29922216
10/29/2026 03:52:15:  ### Save World Thread Started! ###
10/29/2026 03:52:15: World save (1/5) Cloud & Backup checks done [0ms] => Save number 1189
10/29/2026 03:52:15: World save (5/5) done. Total time [40ms]
10/29/2026 03:52:16: Backup created in Cotil_backup_auto-20261029-035216 [23.522ms]
10/29/2026 03:56:36: RPC_Disconnect
10/29/2026 03:56:36: Destroying abandoned non persistent zdo 549297305:9175 owner 549297305
10/29/2026 03:56:36: Destroying abandoned non persistent zdo 549297305:1 owner 549297305
ZPlayFabSocket::Dispose. State: CLOSED
10/29/2026 03:56:36: Player connection lost server "FlanServer" that has join code 123456, now 0 player(s)
10/29/2026 16:19:51: Game server disconnected

OnApplicationQuit
`;

/**
 * A Steam-only server log from before 1.0: a refused join, a session that times out, a night skip and a
 * save. Names and IDs are replaced. Only `day:N` of the night skip line is known; the rest is a stand-in.
 */
export const STEAM_ONLY_LOG = `05/20/2023 03:45:50: Load world: Midgard (Midgard)
05/20/2023 03:47:38: Got connection SteamID 76561198000000002
05/20/2023 03:47:40: Peer 76561198000000002 has wrong password
05/20/2023 03:47:40: Closing socket 76561198000000002
05/20/2023 03:48:07: Got connection SteamID 76561198000000002
05/20/2023 03:48:08: Got handshake from client 76561198000000002
05/20/2023 03:48:25: Got character ZDOID from Astrid : 1921561820:1
05/20/2023 04:01:10: Time 3600.5, day:2    nextm:3780  skipspeed:5
05/20/2023 04:05:00: World saved ( 120.4ms )
05/20/2023 04:10:00: ZRpc timeout detected
05/20/2023 04:10:00: Closing socket 76561198000000002
05/20/2023 04:10:01: Closing socket 0
`;

/** Returns the events of [log] read with the sample server's clock. */
export const parseSample = (log: string): LogEvent[] => parseLog(log, SAMPLE_SERVER_UTC_OFFSET_MINUTES);

/** Returns the events of [events] with type [type], narrowed to that type. */
export const ofType = <T extends LogEvent['type']>(events: readonly LogEvent[], type: T): Extract<LogEvent, { type: T }>[] =>
  events.filter((event): event is Extract<LogEvent, { type: T }> => event.type === type);
