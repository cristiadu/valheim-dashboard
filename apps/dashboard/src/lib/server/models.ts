import type { LogReader, SessionState } from 'valheim-log';

import type { Snapshot } from '#/lib/models/snapshot';
import type { LogHistory } from '#/lib/server/log-history';
import type { LogTail } from '#/lib/server/log-tail';

/** Where the server writes its log when no `LOG_FILE` is set. */
export const DEFAULT_LOG_FILE = 'C:\\Valheim Server\\logs.txt';

/**
 * Folder next to the server's log that keeps a copy of every run's log, named by the run's first line, for
 * example `20261030-154344.txt`. The server writes a new `logs.txt` on every start, so this is the history.
 */
export const HISTORY_FOLDER_NAME = 'log-history';

/** File extension of a run's copy in the history folder. */
export const RUN_FILE_EXTENSION = '.txt';

/** Folder next to the server's log that holds one folder per world, for example `worlds_local\Cotil`. */
export const WORLDS_FOLDER_NAME = 'worlds_local';

/** Name of a world's main save file, with its save number, for example `_main.1561.db2`. */
export const WORLD_SAVE_FILE_PATTERN = /^_main\.(?<saveNumber>\d+)\.db2$/;

/** Where the length of the compressed zone data sits in a world save, in bytes: after the data version and the world time. */
export const ZONE_DATA_LENGTH_OFFSET = 12;

/** Size of a world save's header, in bytes: data version, world time and zone data length. */
export const WORLD_SAVE_HEADER_BYTES = 16;

/** Size of one 32-bit number in a world save, in bytes. */
export const INT_BYTES = 4;

/** Size of one generated zone in the zone data, in bytes: two 16-bit coordinates. */
export const GENERATED_ZONE_BYTES = 4;

/** Bits of a text's length each length byte holds in a world save. The game writes text as .NET's BinaryWriter does. */
export const LENGTH_BITS_PER_BYTE = 7;

/** Top bit of a length byte, set when another length byte follows. */
export const MORE_LENGTH_FLAG = 0x80;

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
  'Finewood bow': 'Finewood Bow.png',
  'Rag tunic': 'Rag Tunic.png',
  'Rag pants': 'Rag Pants.png',
  'Pulled bear': 'Pulled Bear.png',
  'Bear hide': 'Bear Hide.png',
  'Bear paw': 'Bear Paw.png',
  'Bear trophy': 'Bear Trophy.png',
  'Troll trophy': 'Troll Trophy.png',
  'Greydwarf shaman trophy': 'Greydwarf Shaman Trophy.png',
  'Greydwarf brute trophy': 'Greydwarf Brute Trophy.png',
};

/** How often the log file is checked for new lines. */
export const POLL_INTERVAL_MS = 2_000;

/** Start of the content types sent gzip-compressed: pages, and the data the page fetches on a tab change. */
export const COMPRESSED_TYPES = ['text/html', 'application/json'] as const;

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

/** Most log lines kept behind one number or item. */
export const MAX_SOURCE_LINES = 50;

/** Most chat messages and pings kept. */
export const MAX_CHAT = 300;

/** Host names that mean a request came from this PC, not through the tunnel. */
export const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];

/** Header a tunnel such as zrok adds to every request it passes on. */
export const FORWARDED_HEADER = 'x-forwarded-for';

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
  /** The world's terrain from the plugin's terrain file, once read. */
  terrain: Terrain | null;
  /** What building each piece takes, by piece prefab, from the plugin's piece costs file, for example `{ wood_floor: { Wood: 2 } }`. */
  pieceCosts: Record<string, Record<string, number>>;
  /** What crafting each item takes, by item prefab and level, from the plugin's craft costs file. */
  craftCosts: Record<string, Record<number, CraftCost>>;
  /** IDs of the items on the ground whose pickup already went into a bag this run, so each counts once. */
  pickedUpItemIds: Set<string>;
  /** Every item that is food, from the plugin's foods file, for example `CookedMeat`. */
  foods: Set<string>;
  /** The item each fire burns, by fire prefab, from the plugin's fire fuels file, for example `{ piece_groundtorch_wood: 'Resin' }`. */
  fireFuels: Record<string, string>;
  /** When each character last ate each food, as UTC ISO times, by character and food. */
  lastMeals: Record<string, Record<string, string>>;
};

/** What one craft of an item at one level makes and takes, for example 20 wood arrows from `{ Wood: 8 }`. */
export type CraftCost = {
  /** How many items one craft makes, or 1 for an upgrade. */
  yields: number;
  /** What one craft takes, by item prefab. */
  items: Record<string, number>;
};

/**
 * The world's terrain, one letter per map square, as the plugin writes it: `M` Meadows, `B` Black Forest, `S`
 * Swamp, `O` Mountains, `P` Plains, `I` Mistlands, `A` Ashlands, `N` Deep North, `~` water and `.` past the edge.
 */
export type Terrain = {
  /** Number of the westmost square, and of the southmost one, for example `-329`. */
  first: number;
  /** Rows of letters from west to east, northmost row first. */
  rows: string[];
};

/** Start of the terrain file's name, followed by the world name and `.txt`, for example `terrain-Cotil.txt`. */
export const TERRAIN_FILE_PREFIX = 'terrain-';

/** First line of the terrain file, with the number of the westmost and southmost square. */
export const TERRAIN_HEADER_PATTERN = /^squareMeters (?<squareMeters>\d+) first (?<first>-?\d+)$/;

/** Name of the plugin's file next to the log with how many of each item fit in one slot. */
export const ITEM_STACKS_FILE_NAME = 'item-stacks.txt';

/** One line of the item stacks file, for example `Wood 50`. */
export const ITEM_STACK_LINE_PATTERN = /^(?<item>\S+) (?<stack>\d+)$/;

/** Name of the plugin's file next to the log with what each buildable piece costs. */
export const PIECE_COSTS_FILE_NAME = 'piece-costs.txt';

/** One line of the piece costs file, for example `wood_floor Wood x2`. */
export const PIECE_COST_LINE_PATTERN = /^(?<piece>\S+) (?<items>.+)$/;

/** Name of the plugin's file next to the log with what crafting and upgrading each item takes. */
export const CRAFT_COSTS_FILE_NAME = 'craft-costs.txt';

/** One line of the craft costs file, for example `ArrowWood 1 20 Wood x8`: item, level, how many one craft makes, cost. */
export const CRAFT_COST_LINE_PATTERN = /^(?<item>\S+) (?<level>\d+) (?<yields>\d+) (?<items>.+)$/;

/** Name of the plugin's file next to the log with every food, one per line. */
export const FOODS_FILE_NAME = 'foods.txt';

/** One line of the foods file, for example `CookedMeat`. */
export const FOOD_LINE_PATTERN = /^(?<item>\S+)$/;

/** Name of the plugin's file next to the log with the item each fire burns. */
export const FIRE_FUELS_FILE_NAME = 'fire-fuels.txt';

/** One line of the fire fuels file, for example `piece_groundtorch_wood Resin`. */
export const FIRE_FUEL_LINE_PATTERN = /^(?<fire>\S+) (?<item>\S+)$/;

/** Name of the plugin's file next to the log with the English name the game shows for each item, piece, creature and raid. */
export const GAME_NAMES_FILE_NAME = 'game-names.txt';

/** One line of the game names file, for example `AtgeirIron Iron atgeir` or `army_theelder The ground is shaking`. */
export const GAME_NAME_LINE_PATTERN = /^(?<id>\S+) (?<name>.+)$/;

/**
 * How long a food stays in effect after it is eaten, in minutes, about the shortest any food lasts. A player can not
 * eat the same food again while it is in effect.
 */
export const MEAL_MINUTES = 20;

/** Name of the plugin's file next to the log with each player's health, stamina and eitr now. */
export const PLAYER_VITALS_FILE_NAME = 'player-vitals.txt';

/** One line of the player vitals file, tab separated, for example `Ragnar\t45\t110\t60\t0`. */
export const PLAYER_VITALS_LINE_PATTERN = /^(?<character>[^\t]+)\t(?<health>\d+)\t(?<maxHealth>\d+)\t(?<stamina>\d+)\t(?<eitr>\d+)$/;

/** A log being followed and what was read from it. */
export type Follower = {
  /** Path of the log, for error messages. */
  logFile: string;
  /** Folder of the log, where the plugin writes its files and the history is kept. */
  folder: string;
  /** Reads the new lines. */
  tail: LogTail;
  /** Keeps a copy of the run in the history folder. */
  history: LogHistory;
  /** What the lines built so far. */
  state: ServerState;
  /** True when lines arrived since the listeners were last told. */
  hasNewLines: boolean;
  /** Copy of the snapshot as the listeners were last told, which a new live stream starts from. */
  sentSnapshot: Snapshot;
  /** World and time of the save whose global keys were read last, for example `Cotil 2026-10-31T23:30:45.000Z`. */
  worldSaveRead: string | null;
  /** World and run start whose terrain file was read, for example `Cotil 2026-11-01T10:43:52.000Z`. */
  terrainRead: string | null;
  /** Run start whose item stacks, piece costs and craft costs files were read, for example `2026-11-01T10:43:52.000Z`. */
  gameDataRead: string | null;
  /** Time the player vitals file was last changed when it was read, in milliseconds, or null before a read or while it is missing. */
  vitalsChangedMs: number | null;
  /** Missing files already reported, by a key such as `terrain Cotil 2026-11-01T10:43:52.000Z`, so each is reported once. */
  reportedMissing: Set<string>;
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
