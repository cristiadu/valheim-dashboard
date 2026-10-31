import type { LogReader, SessionState } from 'valheim-log';

import type { Snapshot } from '#/lib/models';
import type { LogHistory } from '#/lib/server/log-history';
import type { LogTail } from '#/lib/server/log-tail';

/** Where the server writes its log when no `LOG_FILE` is set. */
export const DEFAULT_LOG_FILE = 'C:\\Valheim Server\\logs.txt';

/**
 * Folder next to the server's log that keeps a copy of every run's log, named by the run's first line, for
 * example `20261030-154344.txt`. The server writes a new `logs.txt` on every start, so this is the history.
 */
export const HISTORY_FOLDER_NAME = 'log-history';

/** Folder next to the server's log that keeps the item icons downloaded from the wiki, for example `deer-hide.png`. */
export const ICON_FOLDER_NAME = 'item-icons';

/** Valheim wiki API, which gives the image address of an uploaded file. */
export const WIKI_API_URL = 'https://valheim.fandom.com/api.php';

/** Most file titles one wiki API request may ask about. */
export const WIKI_TITLES_PER_REQUEST = 50;

/** How long browsers may keep an icon before asking again, in seconds. */
export const ICON_CACHE_SECONDS = 86_400;

/** Shape of an icon file name the icon route serves, so a request cannot reach other files. */
export const ICON_FILE_PATTERN = /^[a-z0-9-]+\.png$/;

/** Wiki icon files whose name is not the item name, by item name. */
export const WIKI_ICON_FILES: Record<string, string> = {
  'Flint arrow': 'Flinthead Arrow.png',
  'Fine wood': 'Finewood.png',
  'Core wood': 'Corewood.png',
  'Wolf armor chest': 'Wolf Hide Chestpiece.png',
  'Wolf armor legs': 'Wolf Hide Trousers.png',
  'Minor healing mead base': 'Mead Base - Minor Healing.png',
  'Minor stamina mead base': 'Mead Base - Minor Stamina.png',
  'Poison resistance mead base': 'Mead Base - Poison Resistance.png',
  'Frost resistance mead base': 'Mead Base - Frost Resistance.png',
  'Blackmetal sword': 'Black Metal Sword.png',
  'Blackmetal axe': 'Black Metal Axe.png',
  'Blackmetal shield': 'Black Metal Shield.png',
};

/** How often the log file is checked for new lines. */
export const POLL_INTERVAL_MS = 2_000;

/** How often an idle live stream sends a comment, so proxies keep it open. */
export const KEEP_ALIVE_MS = 25_000;

/** Most game events kept. */
export const MAX_EVENTS = 1_000;

/** Most world saves kept. One every 10 minutes is 144 a day. */
export const MAX_SAVES = 300;

/** Most backups kept. */
export const MAX_BACKUPS = 50;

/** Most server runs and Steam drops kept. */
export const MAX_RUNS = 50;

/** Most stretches of activity kept, such as building or kills. */
export const MAX_ACTIVITIES = 500;

/** Longest pause between two actions of one stretch of activity. */
export const ACTIVITY_GAP_MS = 10 * 60_000;

/** Most chat messages and pings kept. */
export const MAX_CHAT = 300;

/** Host names that mean a request came from this PC, not through the tunnel. */
export const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];

/** Header a tunnel such as ngrok adds to every request it passes on. */
export const FORWARDED_HEADER = 'x-forwarded-for';

/** Address of the page where friends type the password. */
export const PASSWORD_PATH = '/password';

/** Cookie that remembers a friend typed the right password. */
export const PASSWORD_COOKIE = 'dashboard_pass';

/** How long a friend stays in after typing the password, in seconds (30 days). */
export const PASSWORD_COOKIE_SECONDS = 30 * 86_400;

/** Pause before answering a wrong password, in milliseconds, so guessing many is slow. */
export const WRONG_PASSWORD_DELAY_MS = 1_000;

/** Text for live data requests without the password. */
export const PASSWORD_NEEDED_TEXT = 'Type the password on the dashboard page first.';

/** Page text when the dashboard is reached from outside but has no password set. */
export const NO_PASSWORD_SET_TEXT = 'This page only opens on the server PC until the host sets a password.';

/** Dashboard settings, read from environment variables. */
export type Config = {
  /** Path of the server's `logs.txt`. From `LOG_FILE`. */
  logFile: string;
  /** Offset of the server's clock from UTC, in minutes. From `SERVER_UTC_OFFSET_MINUTES`. */
  serverUtcOffsetMinutes: number;
  /** Password friends type to open the page from outside this PC, or null when none is set. From `DASHBOARD_PASSWORD`. */
  password: string | null;
};

/**
 * What happens to a request: `allowed` serves it, `needsPassword` sends it to the password page and
 * `refused` turns it away because it came from outside and no password is set.
 */
export type AccessDecision = 'allowed' | 'needsPassword' | 'refused';

/** What a tail sends to its listener. */
export type TailListener = {
  /** Called with each new complete line, in order. */
  onLine: (line: string) => void;
  /** Called when the file was replaced by a new one, before its first line. */
  onNewFile: () => void;
};

/** What the server knows, built one log line at a time. */
export type ServerState = {
  /** Reads timestamps of the current log. */
  reader: LogReader;
  /** Turns events into player sessions. */
  sessionState: SessionState;
  /** Save number of the save in progress, from its first step. */
  pendingSaveNumber: number | null;
  /** What the page shows. Its `sessions` is the session state's list. */
  snapshot: Snapshot;
};

/** A log being followed and what was read from it. */
export type Follower = {
  /** Path of the log, for error messages. */
  logFile: string;
  /** Reads the new lines. */
  tail: LogTail;
  /** Keeps a copy of the run in the history folder. */
  history: LogHistory;
  /** What the lines built so far. */
  state: ServerState;
  /** True when lines arrived since the listeners were last told. */
  hasNewLines: boolean;
};

/** Part of the wiki API's answer to an image address query, for example for `File:Deer_hide.png`. */
export type WikiImageResponse = {
  query: {
    /** Titles the wiki rewrote, such as `File:Deer_hide.png` to `File:Deer hide.png`. */
    normalized?: { from: string; to: string }[];
    /** Files by page id, with `imageinfo` only when the file exists. */
    pages: Record<string, { title: string; imageinfo?: { url: string }[] }>;
  };
};
