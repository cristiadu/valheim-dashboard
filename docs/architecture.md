# How the dashboard works

The dashboard runs on the Valheim server PC. It reads the server's `logs.txt` and shows friends what
happens in the game, live, in their browser.

```mermaid
flowchart LR
  subgraph pc[Server PC]
    game[Valheim server] -->|writes| log[logs.txt]
    plugin[Build log plugin] -->|adds building lines| log
    log --> dash[Dashboard]
    dash -->|copies each run| hist[log-history folder]
    hist -->|read on start| dash
  end
  dash -->|live page| friends[Friends' browsers]
```

## Parts

| Folder | What it is |
| --- | --- |
| `packages/valheim-log` | Turns log lines into game events and player sessions. No files, no network. |
| `apps/dashboard` | SvelteKit app on Node. Follows `logs.txt` and serves the page. |
| `plugins/build-log` | BepInEx plugin on the server only. Friends install nothing. |
| `scripts` | Start the dashboard and keep it running on Windows. |
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

## Tabs

| Tab | Shows | Data from |
| --- | --- | --- |
| Hall | Who is online, the last 24 hours on a day wheel, the latest events | Snapshot |
| Vikings | Each player and when they were online | Snapshot |
| Saga | Joins, leaves, deaths, raids, building | Snapshot |
| World | Saves, backups, disk space | Snapshot |
| Recipes | Crafting plans and what is still missing | The viewer's browser |
| Server | Up or down, uptime in the last 24 hours, warnings | Snapshot |

Recipe plans are saved in each viewer's browser (`localStorage`). The server stores nothing for them.

## Build log plugin

```mermaid
flowchart LR
  build[Player builds or removes a piece] --> world[Server world objects]
  world -->|scan every 5 s| plugin[Build log plugin]
  plugin -->|"Piece built: wood_floor_1x1 by Ragnar"| log[logs.txt]
  bep[BepInEx messages] --> plugin
  log --> saga[Saga: building lines]
```

Pieces built within 10 minutes of each other show as one Saga line. BepInEx's own log file is turned off,
so its messages land in `logs.txt` too.

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

`install-startup.cmd` adds the logon task once. Every window stays hidden when it starts at logon.

## Files on the server PC

Every log lives in `C:\Valheim Server`.

| File | Written by |
| --- | --- |
| `logs.txt` | The Valheim server, the build log plugin and BepInEx |
| `log-history\*.txt` | The dashboard, one file per server run |
| `dashboard.log` | The start script, with the dashboard's output |

## CI

```mermaid
flowchart LR
  pr[Pull request or push to main] --> install[pnpm install] --> check[pnpm check] --> test[pnpm test] --> build[pnpm build]
```

Dependabot opens weekly upgrade PRs for npm packages and GitHub Actions. The plugin is built on the
server PC, not in CI.
