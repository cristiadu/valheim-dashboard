# Valheim server log events

How the Valheim dedicated server writes its log, which game events can be read from it, and the
patterns the dashboard uses to parse them.

Source: `logs.txt` from a Windows dedicated server, Valheim 1.0.21 (network version 41), crossplay
enabled (players connect through PlayFab). Example lines below are copied from that log with player
names, platform IDs, IP address and join code replaced.

## Terms

| Term | Meaning |
| --- | --- |
| Platform ID | The player's account ID with its platform prefix, for example `Steam_76561198000000001`. Stable across sessions. |
| Platform name | The account display name (Steam name) stored in the world's player history. Not the in-game character name. |
| PlayFab remote ID | 16-hex-digit ID of one crossplay network connection, for example `A1B2C3D4E5F60718`. Used in `playfab/<id>` client names. |
| Character name | The name of the in-game character, for example `Ragnar`. One account can own several characters. |
| ZDOID | Valheim's network object ID, written `<userId>:<objectId>`. The `userId` part identifies the peer for the whole connection; the character itself is the object. |
| World save | The periodic write of the world to disk, every 10 minutes by default. |
| Autobackup | A copy of the world folder (`Cotil_backup_auto-YYYYMMDD-HHMMSS`) taken during a world save. |

## Line format

Game lines start with a local timestamp. Lines without it are Unity engine output and can be ignored.

```
10/29/2026 02:43:13: Got character ZDOID from Ragnar : 549297305:1
```

| Part | Pattern | Notes |
| --- | --- | --- |
| Timestamp prefix | `^(?<month>\d{2})/(?<day>\d{2})/(?<year>\d{4}) (?<time>\d{2}:\d{2}:\d{2}): (?<message>.*)$` | Server local time, no time zone. Month comes first. |

All message patterns below match the `message` group, not the whole line. They use only syntax
Dart's `RegExp` supports (named groups, no lookbehind), so they work as raw strings:
`RegExp(r'^Got character ZDOID from (?<character>.+) : (?<userId>-?\d+):(?<objectId>\d+)$')`.

The server overwrites `logs.txt` on every start (`-logfile`), so parsed events must be stored by the
dashboard; the file only holds the current server run.

## Player events

These lines appear in this order for one player joining and leaving.

| Event | Example message | Pattern | Identity in line |
| --- | --- | --- | --- |
| Known player (startup roster) | `Player history entry with index 0:  Tony Example (Steam_76561198000000001, 3C9D07E1B2A4F856)` | `^Player history entry with index (?<index>\d+):\s+(?<platformName>.+) \((?<platformId>\w+_\d+), (?<playFabId>[0-9A-F]+)\)$` | Platform name, platform ID |
| Connection opened | `PlayFab listen socket child connected to remote player A1B2C3D4E5F60718` | `^PlayFab listen socket child connected to remote player (?<remoteId>[0-9A-F]+)$` | PlayFab remote ID |
| Player joined (count) | `Player joined server "FlanServer" that has join code 123456, now 1 player(s)` | `^Player joined server "(?<server>.+)" that has join code (?<joinCode>\d+), now (?<players>\d+) player\(s\)$` | None, count only |
| Platform ID received | `PlayFab socket with remote ID playfab/A1B2C3D4E5F60718 received local Platform ID Steam_76561198000000001` | `^PlayFab socket with remote ID playfab/(?<remoteId>[0-9A-F]+) received local Platform ID (?<platformId>\w+_\d+)$` | Remote ID and platform ID |
| Handshake | `Got handshake from client playfab/A1B2C3D4E5F60718` | `^Got handshake from client (?<client>\S+)$` | Remote ID |
| Version check | `Network version check, their:41, mine:41` | `^Network version check, their:(?<theirs>\d+), mine:(?<mine>\d+)$` | None |
| Peer accepted | `Server: New peer connected,sending global keys` | `^Server: New peer connected,sending global keys$` | None |
| Character spawned | `Got character ZDOID from Ragnar : 549297305:1` | `^Got character ZDOID from (?<character>.+) : (?<userId>-?\d+):(?<objectId>\d+)$` | Character name, ZDOID user ID |
| Disconnect requested | `RPC_Disconnect` | `^RPC_Disconnect$` | None |
| Player objects removed | `Destroying abandoned non persistent zdo 549297305:9175 owner 549297305` | `^Destroying abandoned non persistent zdo (?<userId>-?\d+):(?<objectId>\d+) owner (?<owner>-?\d+)$` | ZDOID user ID of the leaving player |
| Player left (count) | `Player connection lost server "FlanServer" that has join code 123456, now 0 player(s)` | `^Player connection lost server "(?<server>.+)" that has join code (?<joinCode>\d+), now (?<players>\d+) player\(s\)$` | None, count only |
| Online roster (every save) | `Sent to playfab/A1B2C3D4E5F60718` | `^Sent to (?<client>\S+)$` | Remote ID of each connected player |
| Connection count (every save) | ` Connections 1 ZDOS:140218  sent:0 recv:260` | `^ Connections (?<connections>\d+) ZDOS:(?<zdos>\d+)  sent:(?<sent>\d+) recv:(?<recv>\d+)$` | None, count only |

Note the leading space in the connection count line and the double space before `sent`.

### Player identity

A player is recorded under three different IDs, each in a different line:

| ID | Where it appears | Links to |
| --- | --- | --- |
| PlayFab remote ID | Connection opened, platform ID received, handshake, online roster | Platform ID (same line in "Platform ID received") |
| Platform ID | Platform ID received, startup roster | Platform name (startup roster) |
| ZDOID user ID | Character spawned, player objects removed | Character name (character spawned) |

There is no single line that holds both the remote ID and the character name. The dashboard joins
them by order: the first "Character spawned" after a "Handshake" belongs to that handshake's client.
In the sample log, account `Tony Example` (Steam) joined with character `Ragnar`, which shows the
platform name and character name are different values.

### Matching a join to its leave

| Step | Line | Key carried forward |
| --- | --- | --- |
| 1 | Connection opened | remote ID |
| 2 | Platform ID received | remote ID → platform ID |
| 3 | Handshake, then Character spawned | remote ID → character name and ZDOID user ID |
| 4 | Player objects removed (`owner`) | ZDOID user ID → session ends |
| 5 | Player left (count) | confirms the count dropped |

The session ends at the "Player objects removed" lines whose `owner` equals the ZDOID user ID from
step 3; "RPC_Disconnect" and "Player left" carry no identity. When several players are online, the
online roster (`Sent to playfab/<id>`) written at every world save is a fallback: a remote ID missing
from the roster has left at some point since the previous save.

Sample session: remote ID `A1B2C3D4E5F60718` connected at 02:42:45, spawned `Ragnar` with user ID
`549297305` at 02:43:13, and objects owned by `549297305` were removed at 03:56:36, followed by
`now 0 player(s)`.

### Deaths

Not present in the sample log. When a character dies, the server logs a new "Character spawned"
line with ZDOID `0:0`, then another with a new ZDOID when the player respawns. Count a death as a
"Character spawned" line whose `userId` and `objectId` are both `0`.

## World and server events

| Event | Example message | Pattern |
| --- | --- | --- |
| Server version | `Valheim version: 1.0.21 (network version 41)` | `^Valheim version: (?<version>[\d.]+) \(network version (?<network>\d+)\)$` |
| Modded flag | `isModded: False` | `^isModded: (?<isModded>True\|False)$` |
| World loaded | `ZNet.LoadWorld: Cotil (Cotil), save number 1183` | `^ZNet\.LoadWorld: (?<world>.+?) \((?<file>.+?)\), save number (?<saveNumber>\d+)$` |
| Session registered | `Session "FlanServer" registered with join code 123456` | `^Session "(?<server>.+)" registered with join code (?<joinCode>\d+)$` |
| Session active | `Session "FlanServer" with join code 123456 and IP 203.0.113.10:2456 is active with 0 player(s)` | `^Session "(?<server>.+)" with join code (?<joinCode>\d+) and IP (?<ip>[\d.]+):(?<port>\d+) is active with (?<players>\d+) player\(s\)$` |
| Game server state | `Game server connected` | `^Game server (?<state>connected\|disconnected)$` |
| Disk space check (every save) | `Available space to current user: 278588960768. Saving is blocked if below: 14960956 bytes. Warnings are given if below: 29921912` | `^Available space to current user: (?<available>\d+)\. Saving is blocked if below: (?<blockedBelow>\d+) bytes\. Warnings are given if below: (?<warnBelow>\d+)$` |
| World save started | ` ### Save World Thread Started! ### ` | `^ ### Save World Thread Started! ### $` |
| World save step | `World save (1/5) Cloud & Backup checks done [2ms] => Save number 1184` | `^World save \((?<step>\d)/5\) (?:(?<stepName>.+?) )?done(?:\. Total time)? \[(?<ms>\d+)ms\](?: => Save number (?<saveNumber>\d+))?$` |
| Autobackup considered | `Considering autobackup for World. World time: 590.7997, short time: 7200, long time: 43200, backup count: 4` | `^Considering autobackup for World\. World time: (?<worldTime>[\d.]+), short time: (?<shortTime>\d+), long time: (?<longTime>\d+), backup count: (?<backupCount>\d+)$` |
| Autobackup skipped | `No autobackup needed yet...` | `^(?:Skipping backup\. World session not long enough\.\|No autobackup needed yet\.\.\.)$` |
| Autobackup replaced | `Replacing backup file: Cotil_backup_auto-20261029-031214` | `^Replacing backup file: (?<backup>\S+)$` |
| Autobackup created | `Backup created in Cotil_backup_auto-20261029-051215 [23.522ms]` | `^Backup created in (?<backup>\S+) \[(?<ms>[\d.]+)ms\]$` |

In the `\|` cells, the backslash only escapes the table; the pattern itself uses a plain `|`.

A world save is five steps: 1 cloud and backup checks (carries the save number), 2 chunks writing,
3 DB2 writing, 4 FWL writing, 5 done with the total time. Step 5 has no step name. Saves happen
every 10 minutes whether or not players are online, so they are the server's heartbeat: a gap
longer than about 10 minutes means the server was down or stalled.

`World time` in "Autobackup considered" is in-game seconds since the world was created. A Valheim
day lasts 1800 seconds, so the in-game day is `floor(worldTime / 1800) + 1`.

## Raids and bosses

Neither appears in the sample log.

| Event | What the server writes | Pattern |
| --- | --- | --- |
| Raid started | `Random event set:army_eikthyr` (event names such as `army_theelder`, `foresttrolls`, `skeletons`, `wolves`) | `^Random event set:(?<event>\w+)$` |
| Boss defeated | No log line. The server stores a global key such as `defeated_eikthyr` in the compressed world file. | Not parseable from the log |

The raid line is taken from Valheim's server behavior, not from this sample, and needs checking
against a log that contains a raid.

## Noise, errors and warnings

These lines carry no game event. Keep them out of the event timeline; count them only for a server
health view.

| Kind | Example | Notes |
| --- | --- | --- |
| Unity startup warnings | `The referenced script on this Behaviour (Game Object '<null>') is missing!`, `Shader 'Custom/Water': fallback shader 'Diffuse' not found`, `AsyncResourceUpload failed.` | Normal for a headless server, only at startup |
| PlayFab housekeeping | `Update PlayFab entity token`, `Lobby <id> for world 'FlanServer' and network <id> refreshed` | Every 10 to 15 minutes |
| Save internals | `Sending message to save player profiles`, `GetSaveClonePerChunk. ...`, `PrepareSave: ...`, `SaveSystem.Reload for World is done [15ms]` | Part of every world save |
| Asset unloading | `Unloading unused assets`, `Unloading 2 unused Assets ...` | Memory housekeeping |
| Retries | `Sending PlayFab login request (attempt 2)`, `Retry join-code check 99` | Only a problem if repeated many times |
| Low disk space | Disk space check with `available` below `warnBelow` | Saving stops below `blockedBelow` |
