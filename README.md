# Valheim dashboard

[![CI](https://github.com/cristiadu/valheim-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/cristiadu/valheim-dashboard/actions/workflows/ci.yml)

A little web page for our Valheim server. It runs on the PC that hosts the game, reads the server's log as
it's written, and shows friends who's online, who played when, who died, what got built, and when the
world last saved. It also has a recipe planner for working out what you still need to gather.

![The Hall tab](docs/screenshots/hall.png)

## Run it

You need [Node.js](https://nodejs.org) 26 or newer on the server PC.

1. Double-click `scripts\start-dashboard.cmd`. The first time, it installs and builds everything.
2. Open http://localhost:3000. Friends use your PC's address on port 3000.

It reads `C:\Valheim Server\logs.txt` and writes its own output to `C:\Valheim Server\dashboard.log`. If it
stops, it starts again after 5 seconds.

To start it every time you log on to Windows, double-click `scripts\install-startup.cmd` once. It runs
hidden, with no window.

After a `git pull`, start it with `scripts\start-dashboard.cmd -Rebuild`. Other settings are in
[apps/dashboard/README.md](apps/dashboard/README.md).

## Work on it

```powershell
pnpm install
$env:LOG_FILE = "C:\Valheim Server\logs.txt"
pnpm --filter dashboard dev   # live reload at http://localhost:5173
pnpm check                    # types
pnpm test                     # tests
pnpm build                    # what CI runs last
```

## Learn more

- [How it works](docs/architecture.md)
- [Log lines it reads](docs/log-events.md), including the optional event log plugin
