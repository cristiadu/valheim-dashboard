# Valheim dashboard

A small web server that runs on the Valheim server PC. It reads `logs.txt` as the game writes it and shows friends who is online, what happened and how the server is doing.

```mermaid
flowchart LR
  game[Valheim server] -->|writes| log[logs.txt]
  log -->|new lines every 2 s| tail[Log reader]
  tail --> state[Server state]
  state -->|/api/stream| page[Dashboard page]
  state -->|/api/status| json[JSON]
```

## Run it

In PowerShell, from the repo folder:

```powershell
pnpm install
pnpm --filter dashboard build
$env:LOG_FILE = "C:\Valheim Server\logs.txt"
node apps/dashboard/build
```

Then open `http://localhost:3000`.

### Keep it running

`scripts/start-dashboard.ps1` builds the dashboard if there is no build yet, starts it, and starts it again 5 seconds after it stops. Its output goes to `dashboard.log`, in the same folder as the server's `logs.txt`.

```powershell
.\scripts\start-dashboard.ps1
.\scripts\start-dashboard.ps1 -Rebuild   # after a git pull
```

To start it each time you log on to Windows, run this once:

```powershell
.\scripts\install-startup.ps1
.\scripts\install-startup.ps1 -Remove   # to stop that
```

Both scripts take `-LogFile` and `-Port`. If Windows blocks scripts, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

| Setting | Default | What it is |
| --- | --- | --- |
| `LOG_FILE` | `C:\Valheim Server\logs.txt` | The server's log file |
| `SERVER_UTC_OFFSET_MINUTES` | This PC's offset | The server clock's offset from UTC, for example `-420` for UTC−7 |
| `PORT` | `3000` | Port the dashboard listens on |
| `HOST` | `0.0.0.0` | Address it listens on. The start script sets `127.0.0.1`, so only this PC reaches it directly |
| `DASHBOARD_PASSWORD` | None | Password friends type on the password page when they come in through the shared link. The start script reads it from `dashboard-password.txt` next to `logs.txt` |

## How it decides what is true

```mermaid
flowchart TD
  line[New log line] --> online{Last line under 15 min old<br/>and no clean stop?}
  online -->|yes| up[Online]
  online -->|no| down[Offline: nobody is shown online]
  newlog[New logs.txt while players are inside] --> crash[Their sessions end as a crash]
```

- Log times are the server PC's clock. They are stored in UTC and shown in each viewer's time zone.
- History stays in memory while the dashboard runs. It survives server restarts, not dashboard restarts.

## Recipes tab

Each viewer plans what they want to make. A plan is a recipe and how many to make. For each item you tick it off or type how much you have. "Still to gather" adds up what every plan is missing.

```mermaid
flowchart LR
  pick[Pick a recipe and how many] --> plan[Plan]
  plan -->|tick or type what you have| left[Missing per item]
  left --> total[Still to gather, all plans]
```

- Plans are saved in the viewer's browser, so each friend has their own and the server stores nothing.
- When the dashboard starts, it downloads any missing item icons from the Valheim wiki into `item-icons` next to `logs.txt`, and serves them at `/icons/deer-hide.png`. The wiki blocks loading them from other sites. Until an icon is downloaded, the name shows alone.
- Recipes are a fixed list of common Valheim recipes at quality level 1, in `src/lib/recipes.ts`.
