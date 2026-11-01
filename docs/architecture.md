# How the dashboard works

The dashboard runs on the Valheim server PC. It reads the server's `logs.txt` and shows friends what
happens in the game, live, in their browser.

```mermaid
flowchart LR
  subgraph pc[Server PC]
    game[Valheim server] -->|writes| log[logs.txt]
    plugin[Event log plugin] -->|adds game event lines| log
    log --> dash[Dashboard]
    dash -->|copies each run| hist[log-history folder]
    hist -->|read on start| dash
    game -->|saves| save[World save]
    save -->|bosses defeated| dash
    ngrok[ngrok] -->|forwards| dash
  end
  friends[Friends' browsers] -->|shared link and password| ngrok
```

## Parts

| Folder | What it is |
| --- | --- |
| `packages/valheim-log` | Turns log lines into game events and player sessions. No files, no network. |
| `apps/dashboard` | SvelteKit app on Node. Follows `logs.txt` and serves the page. |
| `plugins/event-log` | BepInEx plugin on the server only. Logs what the game does not. Friends install nothing. |
| `scripts` | Start the dashboard, keep it running and update it from `main` on Windows, and share it through ngrok. |
| `docs/log-events.md` | Every log line the dashboard reads, with its regex. |

## Reading a log line

```mermaid
flowchart LR
  line["10/29/2026 02:43:13: Got character ZDOID from Ragnar : 549297305:1"] --> read[readLine]
  read -->|no timestamp| skip[Skipped]
  read -->|server time to UTC| event[Event: characterSpawned]
  event --> sessions[applyEvent]
  sessions --> players[Player sessions]
```

Server times are local (UTC−7 on this PC) and are stored as UTC. One Steam ID is one player.

## Showing times

```mermaid
flowchart LR
  utc["Stored time: 2026-11-01T02:30Z"] --> zone[Viewer's browser time zone]
  zone --> la["Los Angeles: Oct 31 19:30"]
  zone --> sp["São Paulo: Oct 31 23:30"]
```

Every time on the dashboard is shown in the time zone of the browser looking at it. Each time uses the offset its zone had on that day, so times stay right after daylight saving changes.

## Following logs.txt

```mermaid
sequenceDiagram
  participant T as Log reader
  participant L as logs.txt
  participant S as Server state
  participant H as log-history
  loop every 2 s
    T->>L: Read new bytes only
    L-->>T: New lines
    T->>S: Each line
    T->>H: Same lines, to this run's copy
  end
  Note over T,L: File got shorter: the server restarted
  T->>S: End the run, close open sessions
  T->>H: Start a new copy
```

| A run ends as | When |
| --- | --- |
| `stopped` | The log has a clean stop line. |
| `crashed` | A new `logs.txt` started without a clean stop. |

## Starting the dashboard

```mermaid
flowchart TD
  start[Dashboard starts] --> past[Read each run in log-history, oldest first]
  past --> skip{Same run as logs.txt?}
  skip -->|yes| live[Skip it]
  skip -->|no| state[Add it to the server state]
  live --> follow[Read logs.txt and keep following it]
  state --> follow
```

The server overwrites `logs.txt` on each start, so `log-history` keeps every run. Copies are named by the
run's first line, for example `20261030-154346.txt`.

## Live updates to the page

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as /api/stream
  participant S as Server state
  B->>A: Open the stream
  A-->>B: Snapshot now
  S-->>A: New lines arrived
  A-->>B: New snapshot
  A-->>B: Keep-alive every 25 s
```

A snapshot is everything the page shows, as JSON. `/api/status` returns the same snapshot once.

## Sharing with friends

The dashboard listens only on the server PC (`127.0.0.1`). ngrok connects out from the PC and passes the
shared link's requests in, so no router port is open.

```mermaid
sequenceDiagram
  participant F as Friend's browser
  participant N as ngrok
  participant D as Dashboard
  F->>N: https://longhouse.ngrok-free.app
  N->>D: Same request, with X-Forwarded-For
  D-->>F: No cookie: go to /password
  F->>D: Types the password (through ngrok)
  D-->>F: Cookie, then back to the page they wanted
  F->>D: Page and live stream, with the cookie
```

| A request | Gets |
| --- | --- |
| Made on the PC (host `localhost` or `127.0.0.1`, no `X-Forwarded-For`), such as `/api/status` for the updater | Served, no password |
| Through ngrok with the cookie | Served |
| Through ngrok without it | Sent to `/password`; `/api/*` answers `401` |
| Through ngrok when no password is set | Turned away (`403`) |

The password is the Valheim server's own, which the start script reads from `-password` in
`start_headless_server.bat`. The cookie (`dashboard_pass`) lasts 30 days. It holds a hash made from the password, so changing the
password sends everyone back to the password page. A wrong password waits 1 second before the answer, so
guessing is slow.

## Bosses defeated

```mermaid
flowchart LR
  log["logs.txt: Global key set: defeated_eikthyr"] --> bosses[Bosses defeated]
  save["worlds_local\Cotil\_main.1561.db2"] -->|on start and after each save| bosses
  bosses --> world[World tab]
```

A boss defeat sets a global key, such as `defeated_eikthyr`, which the world save keeps. The log only has
defeats since the plugin was installed, so the dashboard also reads the keys from the newest save. A defeat
from the save shows on the World tab, but has no Saga line, since its time is not known.

## Tabs

| Tab | Shows | Data from |
| --- | --- | --- |
| Hall | Who is online and where, the last 24 hours on a day wheel, the latest events | Snapshot |
| Vikings | Each player, when they were online, kills, areas visited, and gear laid out like a character sheet | Snapshot |
| Saga | Every game event and chat, with filters | Snapshot |
| World | The in-game day, bosses defeated, saves, backups, disk space | Snapshot |
| Map | Land each player walked, chests with what they hold, who is where, last deaths | Snapshot |
| Recipes | Crafting plans and what is still missing | The viewer's browser |
| Server | Up or down, uptime in the last 24 hours, warnings | Snapshot |

Recipe plans are saved in each viewer's browser (`localStorage`). The server stores nothing for them.

The plugin logs gear the first time a player holds or wears it, not what they wear now. So the Vikings
character sheet puts the newest piece of each kind in its slot, for example the newest helmet on the head.
Tools, such as the hammer, and older pieces show under "Also carries".

```mermaid
flowchart LR
  wiki[Valheim wiki] -->|on start, missing icons only| icons["item-icons folder next to logs.txt"]
  icons -->|/icons/flint-spear.png| pages[Recipes and Vikings tabs]
```

Icons are downloaded for every recipe item and every piece of gear the dashboard knows by name.

## Where a number comes from

```mermaid
flowchart LR
  line["Creature killed: Troll level 1 by Ragnar"] --> reader[Log reader]
  reader --> count[Kills: 12]
  reader --> kept["Lines kept behind kills:Ragnar"]
  count --> card[Vikings card]
  kept -->|click the number| popup[List of log lines]
```

Each line that changes a number or an item on Vikings is kept with it, so a click shows the lines behind it,
newest first. Only the latest 50 lines per number are kept, but all of them are counted.

| Kept for | Lines |
| --- | --- |
| Time played, visits | Joins and leaves |
| Deaths | The game's death line and the plugin's death details |
| Kills, most killed | Creature killed |
| An area | Area entered |
| A piece of gear | Gear first seen, at each level |

Each Saga and Hall event keeps its lines too: a game event, chat message or ping has its own line, a death
has the game's line and the plugin's details, a join or leave has its line from the table above, and a
stretch of building, kills or items keeps its latest 50 lines. Every line in the list shows the rune, color
and label of its Saga kind.

## Event log plugin

The game logs joins, deaths and saves, but not building, chat or boss progress. The plugin watches what
already passes through the server and writes a line for each event.

```mermaid
flowchart LR
  world[Server world objects] -->|scan every 5 s| scan[World scan]
  calls[Calls players send through the server] --> rpc[Chat reader]
  keys[Global keys and raids] --> hooks[Game hooks]
  scan -->|"Piece built: wood_floor_1x1 by Ragnar"| log[logs.txt]
  rpc -->|"Chat: Ragnar shouted: Troll!"| log
  hooks -->|"Global key set: defeated_eikthyr"| log
  bep[BepInEx messages] --> log
```

| Source | What it finds |
| --- | --- |
| World scan | New objects (pieces, summoned bosses), the in-game day, each player's position, area, portal trips, death, PvP, bed and gear, what each chest, cart, ship and new tombstone holds, tames, signs, item stands, chests and harvested plants, and objects destroyed, such as creatures with every player who hit them, items picked up and emptied tombstones |
| Calls through the server | Chat and map pings, which the server passes from one player to the others, creature attack moves, to say what a player was fighting when they died, and who asked to harvest a plant |
| Game hooks | Global keys, such as a boss defeat, and the end of a raid |

Each line names a player only when the game data says who did it.

The server sends its own log only to `logs.txt`, so the plugin also shows each event line in the server's
console window, for example `[Info   :Game event] Chat: Ragnar shouted: Troll!`. Only `logs.txt` feeds the
dashboard. The plugin turns off click-to-select in that window: a selection pauses writes to the window, which
would freeze the server.

On the dashboard, plugin lines become:

| Kept as | Lines | Shown as |
| --- | --- | --- |
| Activities | Pieces built or destroyed, kills, items gathered, chests | One Saga line per player and kind, until a 10 minute pause, naming every thing |
| Story events | Deaths, bosses, raids, portals, tames, signs, item stands, tombstones | One Saga line each |
| News only | Areas, gear, global keys | A Saga line for a first visit or a dungeon trip, new gear, or a boss defeat |
| Stats | Areas, kills, the day, boss keys | Where each player is now and their kills, areas and gear on Vikings, the day and bosses on World |
| Chat | Chat and pings | The Saga's "Chat and signs" filter, kept apart so it never pushes out events |
| Map | Positions, chests, tombstones | Explored squares, chests and last deaths on Map, and what each player carried at their last death on Vikings |

### Gathering

```mermaid
flowchart LR
  tree[Tree falls, drops Wood] --> first["Picked up: Wood x1 by Ragnar"] --> gathered[Gathered]
  first --> chest[Stored and taken from chests] --> notgathered[Not gathered again]
  first --> drop[Dropped on the ground] --> again["Picked up again: Wood x1 by Ragnar"] --> notgathered
```

An item counts as gathered only the first time anyone picks it up. Harvest lines are not counted, since the
player then picks up what the plant drops, which is already counted.

### Map

```mermaid
flowchart LR
  pos["Position: Ragnar 120 -340"] --> square["Square 3,-11 explored by Ragnar"]
  chest["Chest: 5273:1203 piece_chest_wood at 118 -336 ... holds Wood x20"] --> chests[Chest by ID]
  removed["Chest removed: 5273:1203"] --> chests
  tomb["Tombstone: Ragnar at 410 -77 holds ..."] --> death[Ragnar's last death]
```

A position marks its whole 32 m square as explored. Chest IDs last until the server stops, and every run lists
all chests again, so a new run starts the chest list over.

BepInEx's own log file is turned off, so its messages land in
`logs.txt` too. Every line is listed in [log-events.md](log-events.md).

## Start scripts

```mermaid
flowchart TD
  click[Double-click start-dashboard.cmd] --> ps[start-dashboard.ps1]
  task[Windows logon task, hidden window] --> ps
  ps --> built{Build exists?}
  built -->|no| build[pnpm install and build]
  built -->|yes| run[node apps/dashboard/build]
  build --> run
  run -->|stopped| wait[Wait 5 s] --> run
```

`install-startup.cmd` adds the logon task and the update task once. `share-dashboard.ps1` adds one more
that starts ngrok with no window. Every window stays hidden when it
starts at logon.

## Updates from main

The update task runs `update-from-main.ps1` every 5 minutes in a console with no window.

```mermaid
flowchart TD
  run[Every 5 minutes] --> branch{Checkout on main, nothing uncommitted?}
  branch -->|no| skip[Skip and log why]
  branch -->|yes| url{Token in the origin URL?}
  url -->|yes| skip
  url -->|no| fetch[git fetch]
  fetch --> ci{CI passed on the newest main commit?}
  ci -->|yes| pull[Fast-forward to it]
  ci -->|no| stay[Stay on the current commit]
  pull --> dash{Dashboard built from this commit?}
  stay --> dash
  dash -->|no| build[pnpm install and build, stop node] --> loop[Start script starts node again]
  dash -->|yes| plugin
  loop --> plugin{Plugin files changed since the installed plugin?}
  plugin -->|no| done[Done]
  plugin -->|yes| online{Anyone online?}
  online -->|yes or dashboard not answering| wait[Wait for the next run]
  online -->|no| stop[Build the plugin, Ctrl+C the game server, copy the DLL, start the server]
  stop --> done
```

| Step | How |
| --- | --- |
| Who is online | Sessions without an end in `/api/status`. |
| Stopping the game server | Ctrl+C sent to its console, as in its window. The game saves the world and exits. |
| Starting the game server | `start_headless_server.bat` in its own console window, in the foreground. A server that was already stopped stays stopped. |
| Remembering what is installed | `updater-state.json` keeps the commit of the running dashboard and of the installed plugin. A step that fails or waits runs again on the next pass. |

The first run takes the installed plugin as current and builds the dashboard once.

### What it trusts

Whatever reaches `main` runs on the server PC as its Windows user, with nobody watching: the build scripts,
the plugin build and the plugin inside the game server. These keep that to reviewed code.

| Guard | What it stops |
| --- | --- |
| CI check | A commit runs only after the `ci` job passed on GitHub, read from GitHub's public check-runs API. |
| Fast-forward only | A rewritten `main` stops updates instead of being followed. |
| Installed pnpm | Builds use the pnpm `install-startup.cmd` installed, and stop if `package.json` asks for another version. Nothing downloads pnpm unattended. |
| `--frozen-lockfile` | Installs exactly the lockfile's packages, checked against their hashes. pnpm does not run packages' install scripts. |
| Dependabot cooldown | Upgrades are offered once a version has been out for 7 days. |
| Plain origin URL | A token in the URL could end up in `updater.log`, so the run skips. |
| Commit hashes only | Values from `updater-state.json` reach git only as full commit hashes. |

## Files on the server PC

Every log lives in `C:\Valheim Server`.

| File | Written by |
| --- | --- |
| `logs.txt` | The Valheim server, the event log plugin and BepInEx |
| `log-history\*.txt` | The dashboard, one file per server run |
| `dashboard.log` | The start script, with the dashboard's output |
| `updater.log` | The update script: what it updated, skipped or is waiting for |
| `updater-state.json` | The update script: commits of the running dashboard and the installed plugin |
| `ngrok.log` | ngrok, warnings and errors only |

The dashboard also reads the world save, `worlds_local\Cotil\_main.<save number>.db2`, and never writes to it.

## CI

```mermaid
flowchart LR
  pr[Pull request or push to main] --> install[pnpm install] --> check[pnpm check] --> lint[pnpm lint] --> test[pnpm test] --> build[pnpm build]
```

`pnpm lint` runs ESLint in each project. Besides the recommended TypeScript and Svelte rules, it rejects
relative imports (use `#/`), `function` declarations, `.then()`, `console` and `if` without braces.

The PowerShell scripts' tests run with Pester 5: `Invoke-Pester scripts`.

Dependabot opens weekly upgrade PRs for npm packages and GitHub Actions, for versions out for 7 days. The plugin is built on the
server PC, not in CI.
