# Valheim dashboard

[![CI](https://github.com/cristiadu/valheim-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/cristiadu/valheim-dashboard/actions/workflows/ci.yml)

A little web page for our Valheim server. It runs on the PC that hosts the game, reads the server's log as
it's written, and shows friends who's online, who played when, who died, what got built, and when the
world last saved. It also has a recipe planner for working out what you still need to gather.

![The Hall tab](docs/screenshots/hall.png)

## Run it

You need [Node.js](https://nodejs.org) 26 or newer on the server PC.

**Whenever anything is down, double-click `scripts\start-valheim.cmd`.** It starts whatever is not running
and leaves the rest alone, so it is always safe to run:

| Part | Window | What it does |
| --- | --- | --- |
| Game server | `Valheim server` | `start_headless_server.bat` |
| Dashboard | `Valheim dashboard` | Builds the dashboard the first time, runs it on http://localhost:3000, and starts it again 5 seconds after it stops |
| Link | `Valheim dashboard link (zrok)` | Shares the dashboard with friends, and starts again 30 seconds after zrok stops |
| Updater | `Valheim dashboard updater` | Checks `main` every 5 minutes. It pulls, rebuilds and restarts the dashboard, and installs a changed event log plugin when nobody is online. It only takes a commit once CI passed on it |

It also makes Windows run it at every logon, and installs the pnpm version in `package.json` and zrok when
they are missing. Closing a window stops that part until the next run. `start-valheim.cmd -Remove` stops
starting at logon. Logs go next to the server's `C:\Valheim Server\logs.txt`.

Only this PC can open http://localhost:3000. Friends use the shared link.

## Share it with friends

Friends open one link and type a password. They install nothing. The first time, make a free account at
[myzrok.io](https://myzrok.io), copy your account token, and run in PowerShell:

```powershell
.\scripts\start-valheim.ps1 -ZrokToken "<your token>"
```

Friends open `https://cotil-longhouse.shares.zrok.io`, click past zrok's notice the first time, and type the
Valheim server's password on the dashboard's password page. The dashboard reads it from
`start_headless_server.bat`, so change it there and restart the dashboard. The page remembers them for 30
days. Pass `-LinkName` for another name in the link. Other settings are in
[apps/dashboard/README.md](apps/dashboard/README.md).

## Work on it

```powershell
pnpm install
$env:LOG_FILE = "C:\Valheim Server\logs.txt"
pnpm --filter dashboard dev   # live reload at http://localhost:5173
pnpm check                    # types
pnpm test                     # tests
pnpm coverage                 # tests, with unit and integration coverage
pnpm build                    # what CI runs last
```

## Learn more

- [How it works](docs/architecture.md)
- [Log lines it reads](docs/log-events.md), including the optional event log plugin
