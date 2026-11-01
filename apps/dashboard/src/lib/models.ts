import type { PageRouteId } from '$app/types';
import type { ChatKind, LogEvent, PlayerSession } from 'valheim-log';

/** One dashboard tab and the page it opens. */
export type Tab = {
  /** Page path, for example `/saga`. */
  path: PageRouteId;
  /** Name shown in the menu and as the page heading. */
  label: string;
  /** Short line under the label in the menu. */
  hint: string;
  /** Rune shown as the tab icon. */
  rune: string;
};

/** The dashboard tabs, in menu order. Hall is the first screen and stays short. */
export const TABS: readonly Tab[] = [
  { path: '/', label: 'Hall', hint: 'Today at a glance', rune: 'ᛟ' },
  { path: '/vikings', label: 'Vikings', hint: 'Who was online', rune: 'ᛗ' },
  { path: '/saga', label: 'Saga', hint: 'Every game event', rune: 'ᚱ' },
  { path: '/world', label: 'World', hint: 'Saves and backups', rune: 'ᛃ' },
  { path: '/recipes', label: 'Recipes', hint: 'Plan what to make', rune: 'ᚲ' },
  { path: '/server', label: 'Server', hint: 'Status and warnings', rune: 'ᚾ' },
];

/** Address of the page where friends type the password. */
export const PASSWORD_PATH = '/password';

/** Milliseconds in one second. */
export const MS_PER_SECOND = 1000;

/** Milliseconds in one minute. */
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** Minutes in one hour. */
export const MINUTES_PER_HOUR = 60;

/** Hours in one day. */
export const HOURS_PER_DAY = 24;

/** Milliseconds in one hour. */
export const MS_PER_HOUR = MINUTES_PER_HOUR * MS_PER_MINUTE;

/** Milliseconds in one day. */
export const DAY_MS = HOURS_PER_DAY * MS_PER_HOUR;

/** How long after the last log line the server still counts as online. Saves log a line every 10 minutes. */
export const ONLINE_WINDOW_MS = 15 * MS_PER_MINUTE;

/** Bytes in a gigabyte, as disks count them. */
export const BYTES_PER_GB = 1e9;

/** Date and 24-hour clock parts read in a time zone, to find its offset from UTC. */
export const ZONE_CLOCK_OPTIONS: Intl.DateTimeFormatOptions = {
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
};

/** Month names for dates. */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** How often the page clock moves, so ages like "up 3h 12m" stay current. */
export const CLOCK_TICK_MS = 30_000;

/** Context key for the snapshot getter that the layout shares with the pages. */
export const SNAPSHOT_KEY = Symbol('snapshot');

/** Width and height of the day wheel drawing. */
export const WHEEL_SIZE = 300;

/** Center of the day wheel in its drawing. */
export const WHEEL_CENTER = WHEEL_SIZE / 2;

/** Radius of the day wheel's outer circle. Hour ticks start here. */
export const WHEEL_RIM_RADIUS = 134;

/** Radius where the long hour ticks, every 6 hours, end. */
export const WHEEL_LONG_TICK_RADIUS = 124;

/** Radius where the short hour ticks end. */
export const WHEEL_SHORT_TICK_RADIUS = 129;

/** Length of the clock hand that points at now. */
export const WHEEL_HAND_RADIUS = 128;

/** Radius of the first player's ring. */
export const WHEEL_OUTER_RING_RADIUS = 118;

/** Space between two players' rings. */
export const WHEEL_RING_STEP = 14;

/** Longest arc on the wheel, in hours. A full 24-hour circle cannot be drawn as one SVG arc. */
export const WHEEL_MAX_ARC_HOURS = 23.99;

/** Shortest arc on the wheel, in hours, so a short session still shows. */
export const WHEEL_MIN_ARC_HOURS = 0.05;

/** Radius of the "today" and "yesterday" labels, inside the smallest player ring. */
export const WHEEL_DAY_LABEL_RADIUS = 58;

/** Smallest part of the wheel, in hours, that gets a "today" or "yesterday" label. */
export const WHEEL_MIN_LABEL_HOURS = 2;

/** Hours between the time labels above the Vikings lanes. */
export const LANE_AXIS_STEP_HOURS = 4;

/**
 * Event types friends see in the story of the server. Joins and leaves come from the sessions, and building,
 * kills and items from the activities. Areas, gear and global keys are kept only when they are news.
 */
export const STORY_EVENT_TYPES = [
  'playerDied',
  'deathDetails',
  'raidStarted',
  'raidEnded',
  'nightSkipped',
  'wentToBed',
  'worldLoaded',
  'serverStopped',
  'bossSummoned',
  'globalKey',
  'areaEntered',
  'teleported',
  'pvpChanged',
  'gearSeen',
  'tameChanged',
  'petNamed',
  'signWritten',
  'itemHung',
  'tombstoneEmptied',
] as const;

/** A game event friends see, such as a death or a raid. */
export type StoryEvent = Extract<LogEvent, { type: (typeof STORY_EVENT_TYPES)[number] }>;

/** One finished world save. */
export type SaveRecord = {
  /** When the save finished, as a UTC ISO string. */
  timeUtc: string;
  /** How long the save took. */
  durationMs: number;
  /** Save number from the log, when it has one. */
  saveNumber: number | null;
};

/** One auto backup of the world. */
export type BackupRecord = {
  /** When the backup was written, as a UTC ISO string. */
  timeUtc: string;
  /** Backup folder name. */
  backup: string;
};

/** Free disk space at the last save. */
export type DiskSpace = {
  /** When it was logged, as a UTC ISO string. */
  timeUtc: string;
  /** Bytes free. */
  availableBytes: number;
  /** The game warns below this many bytes. */
  warnBelowBytes: number;
  /** The game stops saving below this many bytes. */
  blockedBelowBytes: number;
};

/** One server run: from the first line of a `logs.txt` to its last. */
export type RunRecord = {
  /** First line of the log, as a UTC ISO string. */
  startUtc: string;
  /** Last line of the log so far, as a UTC ISO string. */
  lastLineUtc: string;
  /** How it ended: a clean stop, a new log without a stop (a crash), or null while it is the latest run. */
  endReason: 'stopped' | 'crashed' | null;
};

/** Everything the page knows about the server, read from `logs.txt`. Times are UTC ISO strings. */
export type Snapshot = {
  /** Offset of the server's clock from UTC, in minutes. */
  serverUtcOffsetMinutes: number;
  /** World name of the current run. */
  world: string | null;
  /** Game version of the current run. */
  version: string | null;
  /** First line of the current log. */
  startedUtc: string | null;
  /** Last line of the current log. */
  lastLineUtc: string | null;
  /** Clean stop of the current run, if it stopped. */
  stoppedUtc: string | null;
  /** Whether the server is connected to Steam and PlayFab, when it said so. */
  isGameServerConnected: boolean | null;
  /** Every player session seen since the dashboard started, oldest first. */
  sessions: PlayerSession[];
  /** Latest game events, oldest first. */
  events: StoryEvent[];
  /** Latest world saves, oldest first. */
  saves: SaveRecord[];
  /** Latest backups, oldest first. */
  backups: BackupRecord[];
  /** Free disk space at the last save. */
  diskSpace: DiskSpace | null;
  /** Server runs seen since the dashboard started, oldest first. */
  runs: RunRecord[];
  /** Times the server lost its Steam connection, oldest first. */
  steamDropsUtc: string[];
  /** Latest stretches of building, kills and items, from the event log plugin, oldest first. */
  activities: ActivityRecord[];
  /** Latest chat messages and map pings, oldest first. */
  chat: ChatRecord[];
  /** Areas each character has been to, by character name, in the order they first went. */
  visitedAreas: Record<string, string[]>;
  /** Gear each character was seen with, by character name, for example `SwordIron quality 2`. */
  gear: Record<string, string[]>;
  /** Area each character was last in, by character name, for example `Swamp`. */
  currentAreas: Record<string, string>;
  /** Creatures each character helped kill, by character name, then how many of each creature. */
  kills: Record<string, Record<string, number>>;
  /** In-game day, as the game shows it, when the plugin has logged one. */
  day: number | null;
  /** Bosses defeated, by the name the game shows, in the order of their first defeat. */
  defeatedBosses: string[];
  /** Log lines behind each number and item, by [sourceKey], for example `deaths:Ragnar`. */
  sources: Record<string, SourceLines>;
};

/**
 * What a group of log lines counts, for a character: `visits` are joins and leaves, `deaths` are deaths,
 * `kills` are all kills, `killed` are kills of one creature, `area` is going into one area, and `gear` is one
 * piece of gear first seen, at each level.
 */
export type SourceKind = 'visits' | 'deaths' | 'kills' | 'killed' | 'area' | 'gear';

/** One line of `logs.txt`, as written. */
export type LogLineRecord = {
  /** When it was written, as a UTC ISO string. */
  timeUtc: string;
  /** The whole line, for example `10/29/2026 02:43:13: Got character ZDOID from Ragnar : 549297305:1`. */
  line: string;
  /** What happened in it, which picks its rune, color and label as on the Saga tab. */
  kind: StoryKind;
};

/** Log lines behind one number or item. */
export type SourceLines = {
  /** How many lines there were in all, also counting the old ones no longer kept. */
  total: number;
  /** Latest lines, oldest first. */
  lines: LogLineRecord[];
};

/**
 * What a stretch of activity is: pieces built, a builder's pieces destroyed, creatures killed, items gathered
 * from the world, or items stored in or taken from chests.
 */
export type ActivityKind = 'built' | 'destroyed' | 'killed' | 'gathered' | 'stored' | 'taken';

/** One player's activity of one kind, with pauses under a few minutes, told as one story line. */
export type ActivityRecord = {
  /** Character who did it, or for destroyed pieces who built them. Null when the plugin did not know. */
  player: string | null;
  /** What kind of activity it is. */
  kind: ActivityKind;
  /** First action of the stretch, as a UTC ISO string. */
  startUtc: string;
  /** Last action of the stretch, as a UTC ISO string. */
  endUtc: string;
  /** How many of each thing, by prefab name, for example `{ wood_floor_1x1: 14 }` or `{ Troll: 2 }`. */
  things: Record<string, number>;
};

/**
 * Words for what a player did in each activity kind: the verb, the thing in singular and plural, and an
 * ending. Destroyed pieces are told from the builder's side, with their own words.
 */
export const ACTIVITY_WORDS: Record<Exclude<ActivityKind, 'destroyed'>, { verb: string; one: string; many: string; ending: string }> = {
  built: { verb: 'built', one: 'piece', many: 'pieces', ending: '' },
  killed: { verb: 'killed', one: 'creature', many: 'creatures', ending: '' },
  gathered: { verb: 'gathered', one: 'item', many: 'items', ending: '' },
  stored: { verb: 'stored', one: 'item', many: 'items', ending: ' in chests' },
  taken: { verb: 'took', one: 'item', many: 'items', ending: ' from chests' },
};

/** One chat message or map ping. */
export type ChatRecord = {
  /** When it was sent, as a UTC ISO string. */
  timeUtc: string;
  /** Character who sent it. */
  character: string;
  /** How it was sent, or `ping` for a map ping. */
  kind: ChatKind | 'ping';
  /** What they wrote. Empty for a ping. */
  text: string;
};

/** Boss names as the game shows them, by the prefab a summon logs and by the key a defeat sets. */
export const BOSS_NAMES: Record<string, string> = {
  Eikthyr: 'Eikthyr',
  gd_king: 'The Elder',
  Bonemass: 'Bonemass',
  Dragon: 'Moder',
  GoblinKing: 'Yagluth',
  SeekerQueen: 'The Queen',
  Fader: 'Fader',
  defeated_eikthyr: 'Eikthyr',
  defeated_gdking: 'The Elder',
  defeated_bonemass: 'Bonemass',
  defeated_dragon: 'Moder',
  defeated_goblinking: 'Yagluth',
  defeated_queen: 'The Queen',
  defeated_fader: 'Fader',
};

/** Start of the global key a boss defeat sets, for example `defeated_eikthyr`. */
export const DEFEATED_KEY_PREFIX = 'defeated_';

/** Area names for a sentence, by the biome name the plugin logs. */
export const AREA_NAMES: Record<string, string> = {
  Meadows: 'the Meadows',
  BlackForest: 'the Black Forest',
  Swamp: 'the Swamp',
  Mountain: 'the Mountains',
  Plains: 'the Plains',
  Mistlands: 'the Mistlands',
  AshLands: 'the Ashlands',
  DeepNorth: 'the Deep North',
  Ocean: 'the ocean',
  Dungeon: 'a dungeon',
};

/** Bosses in the order players usually meet them, by the name the game shows. */
export const BOSS_ORDER = ['Eikthyr', 'The Elder', 'Bonemass', 'Moder', 'Yagluth', 'The Queen', 'Fader'] as const;

/** Quality at the end of a piece of gear the snapshot keeps, for example ` quality 2` in `SwordIron quality 2`. */
export const GEAR_QUALITY_PATTERN = / quality (\d+)$/;

/** Slots on a Vikings character sheet, in the order the sheet draws them. */
export const GEAR_SLOTS = ['head', 'weapon', 'chest', 'shield', 'cape', 'legs', 'utility'] as const;

/** One slot on the character sheet, for example `head`. */
export type GearSlot = (typeof GEAR_SLOTS)[number];

/** Name of each slot, shown in an empty slot and read out by screen readers. */
export const GEAR_SLOT_NAMES: Record<GearSlot, string> = {
  head: 'Head',
  weapon: 'Weapon',
  chest: 'Chest',
  shield: 'Shield',
  cape: 'Cape',
  legs: 'Legs',
  utility: 'Belt',
};

/**
 * Slot of a piece of gear by its prefab name, checked in order. Gear that matches none, such as the hammer,
 * the hoe or a torch, is carried and not worn.
 */
export const GEAR_SLOT_PATTERNS: readonly (readonly [RegExp, GearSlot])[] = [
  [/^Helmet/, 'head'],
  [/^Armor\w*(Chest|Cuirass)$/, 'chest'],
  [/^Armor\w*(Legs|Greaves)$/, 'legs'],
  [/^Cape/, 'cape'],
  [/^Shield/, 'shield'],
  [/^(Belt|Wishbone|Demister)/, 'utility'],
  [/^(Axe|Battleaxe|Sword|Mace|Club|Spear|Knife|Atgeir|Sledge|Bow|Crossbow|Staff)/, 'weapon'],
];

/**
 * Item names as the game shows them, by the prefab the plugin logs, for example `Flint spear` for `SpearFlint`.
 * The names also pick the icon. Gear missing here shows its prefab in plain words and no icon.
 */
export const GEAR_NAMES: Record<string, string> = {
  Club: 'Club',
  Torch: 'Torch',
  Hammer: 'Hammer',
  Hoe: 'Hoe',
  Cultivator: 'Cultivator',
  AxeStone: 'Stone axe',
  AxeFlint: 'Flint axe',
  AxeBronze: 'Bronze axe',
  AxeIron: 'Iron axe',
  AxeBlackMetal: 'Blackmetal axe',
  PickaxeAntler: 'Antler pickaxe',
  PickaxeBronze: 'Bronze pickaxe',
  PickaxeIron: 'Iron pickaxe',
  KnifeFlint: 'Flint knife',
  SpearFlint: 'Flint spear',
  SpearBronze: 'Bronze spear',
  SwordBronze: 'Bronze sword',
  SwordIron: 'Iron sword',
  SwordBlackmetal: 'Blackmetal sword',
  MaceBronze: 'Bronze mace',
  MaceIron: 'Iron mace',
  MaceSilver: 'Frostner',
  MaceNeedle: 'Porcupine',
  AtgeirBronze: 'Bronze atgeir',
  SledgeIron: 'Iron sledge',
  Bow: 'Crude bow',
  BowFineWood: 'Fine bow',
  BowHuntsman: 'Huntsman bow',
  BowDraugrFang: 'Draugr fang',
  ShieldWood: 'Wood shield',
  ShieldBronzeBuckler: 'Bronze buckler',
  ShieldBanded: 'Banded shield',
  ShieldBlackmetal: 'Blackmetal shield',
  HelmetLeather: 'Leather helmet',
  HelmetTrollLeather: 'Troll leather helmet',
  HelmetBronze: 'Bronze helmet',
  HelmetIron: 'Iron helmet',
  HelmetDrake: 'Drake helmet',
  HelmetPadded: 'Padded helmet',
  ArmorLeatherChest: 'Leather tunic',
  ArmorLeatherLegs: 'Leather pants',
  ArmorTrollLeatherChest: 'Troll leather tunic',
  ArmorTrollLeatherLegs: 'Troll leather pants',
  ArmorBronzeChest: 'Bronze plate cuirass',
  ArmorBronzeLegs: 'Bronze plate leggings',
  ArmorIronChest: 'Iron scale mail',
  ArmorIronLegs: 'Iron greaves',
  ArmorWolfChest: 'Wolf armor chest',
  ArmorWolfLegs: 'Wolf armor legs',
  ArmorPaddedCuirass: 'Padded cuirass',
  ArmorPaddedGreaves: 'Padded greaves',
  CapeDeerHide: 'Deer hide cape',
  CapeTrollHide: 'Troll hide cape',
  CapeWolf: 'Wolf fur cape',
  CapeLox: 'Lox cape',
  CapeLinen: 'Linen cape',
  BeltStrength: 'Megingjord',
  Wishbone: 'Wishbone',
};

/** Where a piece of gear goes on the character sheet: a slot, or `carried` for tools and spare gear. */
export type GearPlace = GearSlot | 'carried';

/** One piece of gear the plugin logged. */
export type GearPiece = {
  /** Prefab the plugin logged, for example `SpearFlint`. */
  prefab: string;
  /** Name as the game shows it, for example `Flint spear`. */
  name: string;
  /** Upgrade level, 1 when never upgraded. */
  quality: number;
  /** Where it goes on the character sheet. */
  place: GearPlace;
};

/** A character's gear laid out like a character sheet. */
export type GearSheet = {
  /** Newest piece seen in each slot. Empty slots are missing. */
  worn: Partial<Record<GearSlot, GearPiece>>;
  /** Tools, and older gear the newer pieces replaced, newest first. */
  carried: GearPiece[];
};

/** Size of a gear icon in its slot, in pixels. */
export const GEAR_ICON_PX = 38;

/** Area name the plugin logs inside a dungeon. Every trip into one is news. */
export const DUNGEON_AREA = 'Dungeon';

/** Longest time between the game's death line and the plugin's details of the same death. */
export const DEATH_DETAILS_WINDOW_MS = 60_000;

/** How many events the Hall shows. */
export const LATEST_EVENT_COUNT = 5;

/**
 * Player colors, in the order players were first seen. Gold, frost, ember, green keeps neighbors apart for
 * color-blind viewers. Names always sit next to the color, so color is never the only clue.
 */
export const PLAYER_COLORS = ['var(--gold)', 'var(--frost)', 'var(--ember)', 'var(--good)'] as const;

/** Color for players past the fourth. */
export const OTHER_PLAYER_COLOR = 'var(--muted)';

/** Part of a time range that falls on one day in the viewer's zone. */
export type DayPart = {
  startMs: number;
  endMs: number;
  /** True when the part is before the viewer's last midnight. */
  isYesterday: boolean;
};

/** One person: every session with the same Steam ID, or the same character when there is no Steam ID. */
export type Player = {
  /** Steam ID, or the character name when the log never linked one. */
  key: string;
  /** Latest character name. */
  character: string;
  /** Steam profile name, when known. */
  steamName: string | null;
  /** Color that marks this player on charts. */
  color: string;
  /** Sessions, oldest first. */
  sessions: PlayerSession[];
  /** Whether the player is online now. */
  isOnline: boolean;
  /** Start of the session in progress, when online. */
  sinceUtc: string | null;
  /** End of the last session, when offline. */
  lastSeenUtc: string | null;
  /** Total time in all sessions. */
  totalMs: number;
  /** Deaths in all sessions. */
  deaths: number;
  /** Area the latest character was last in, for example `Swamp`, when the plugin logged one. */
  area: string | null;
  /** Creatures killed by all of the player's characters, counting kills shared with others. */
  kills: number;
  /** Creature the player killed most, when they killed any. */
  topKill: string | null;
  /** Areas any of the player's characters has been to. */
  areas: string[];
  /** Gear the latest character was seen with, newest first. */
  gear: string[];
};

/** What kind of thing happened, which picks its rune and color. */
export type StoryKind =
  | 'joined'
  | 'left'
  | 'died'
  | 'raid'
  | 'night'
  | 'world'
  | 'stopped'
  | 'built'
  | 'wrecked'
  | 'boss'
  | 'fight'
  | 'travel'
  | 'items'
  | 'tame'
  | 'chat';

/** One line in the story of the server. */
export type StoryItem = {
  /** When it happened, as a UTC ISO string. */
  timeUtc: string;
  /** What kind of thing it is. */
  kind: StoryKind;
  /** Plain sentence, for example `Ragnar died`. */
  text: string;
};

/** Rune, color and pill label for each story kind. */
export const STORY_STYLES: Record<StoryKind, { rune: string; color: string; label: string }> = {
  joined: { rune: 'ᛖ', color: 'var(--good)', label: 'Joined' },
  left: { rune: 'ᛚ', color: 'var(--muted)', label: 'Left' },
  died: { rune: 'ᛞ', color: 'var(--blood)', label: 'Death' },
  raid: { rune: 'ᚦ', color: 'var(--ember)', label: 'Raid' },
  night: { rune: 'ᛜ', color: 'var(--frost)', label: 'Night' },
  world: { rune: 'ᛃ', color: 'var(--gold)', label: 'World' },
  stopped: { rune: 'ᚾ', color: 'var(--muted)', label: 'Stopped' },
  built: { rune: 'ᛒ', color: 'var(--good)', label: 'Built' },
  wrecked: { rune: 'ᚺ', color: 'var(--ember)', label: 'Wrecked' },
  boss: { rune: 'ᛏ', color: 'var(--gold)', label: 'Boss' },
  fight: { rune: 'ᛉ', color: 'var(--blood)', label: 'Fight' },
  travel: { rune: 'ᚱ', color: 'var(--frost)', label: 'Travel' },
  items: { rune: 'ᚷ', color: 'var(--gold)', label: 'Gear and items' },
  tame: { rune: 'ᚠ', color: 'var(--good)', label: 'Tame' },
  chat: { rune: 'ᚨ', color: 'var(--frost)', label: 'Chat' },
};

/** Filters on the Saga tab and the story kinds each one shows. */
export const SAGA_FILTERS: readonly { label: string; kinds: readonly StoryKind[] }[] = [
  {
    label: 'All',
    kinds: ['joined', 'left', 'died', 'raid', 'night', 'world', 'stopped', 'built', 'wrecked', 'boss', 'fight', 'travel', 'items', 'tame', 'chat'],
  },
  { label: 'Joins and leaves', kinds: ['joined', 'left'] },
  { label: 'Deaths', kinds: ['died'] },
  { label: 'Fights and raids', kinds: ['fight', 'boss', 'raid'] },
  { label: 'Travel', kinds: ['travel'] },
  { label: 'Building', kinds: ['built', 'wrecked'] },
  { label: 'Items', kinds: ['items'] },
  { label: 'Tames', kinds: ['tame'] },
  { label: 'Chat and signs', kinds: ['chat'] },
  { label: 'Nights and server', kinds: ['night', 'world', 'stopped'] },
];

/** How many saves the World tab lists. */
export const LATEST_SAVE_COUNT = 10;

/** Kind of problem on the Server tab: the server crashed, lost Steam, or is low on disk. */
export type WarningKind = 'crash' | 'steam' | 'disk';

/** One problem on the Server tab. */
export type ServerWarning = {
  /** What went wrong, shown as a pill. */
  kind: WarningKind;
  /** When it happened, as a UTC ISO string. */
  timeUtc: string;
  /** Plain sentence, for example `Server went down without a clean stop`. */
  text: string;
};

/**
 * Color of a pill. `good` is green (online, ready), `bad` is red (offline, crashed),
 * `gold` marks a win or something to watch (boss defeated, low disk), `quiet` is grey (not yet, unknown).
 */
export type PillTone = 'good' | 'bad' | 'gold' | 'quiet';

/** A status or state in a word or two, shown as a rounded pill, for example `Online` in green. */
export type Pill = {
  /** Word or two on the pill. */
  text: string;
  /** Color of the pill. */
  tone: PillTone;
};

/** Where a recipe is made in the game. `Hand` means the crafting menu, with no station. */
export type CraftingStation = 'Hand' | 'Workbench' | 'Forge' | 'Cauldron' | 'Mead ketill';

/** Biome a recipe belongs to, in the order players usually reach them. Groups the recipe list. */
export const RECIPE_BIOMES = ['Meadows', 'Black Forest', 'Swamp', 'Mountain', 'Plains'] as const;

/** One biome from [RECIPE_BIOMES]. */
export type RecipeBiome = (typeof RECIPE_BIOMES)[number];

/** An item and how many of it. */
export type ItemAmount = {
  /** Item name as the game shows it, for example `Deer hide`. */
  item: string;
  /** How many. */
  amount: number;
};

/** A Valheim recipe at quality level 1. */
export type Recipe = {
  /** Stable key saved in plans, for example `bronze-axe`. */
  id: string;
  /** Name as the game shows it. */
  name: string;
  /** Biome where its materials come from. */
  biome: RecipeBiome;
  /** Where it is made. */
  station: CraftingStation;
  /** How many items one craft gives, for example 20 arrows. */
  yields: number;
  /** Items used by one craft. */
  ingredients: ItemAmount[];
};

/** A recipe the viewer is working toward, saved in their browser. */
export type Plan = {
  /** Unique number for this plan. */
  id: number;
  /** Recipe being planned. */
  recipeId: string;
  /** How many times to craft it. */
  crafts: number;
  /** How many of each ingredient the viewer has set aside, by item name. Missing items count as 0. */
  have: Record<string, number>;
};

/** One ingredient line of a plan. */
export type PlanItem = {
  /** Item name. */
  item: string;
  /** How many the plan needs in total. */
  need: number;
  /** How many the viewer has, capped at [need]. */
  have: number;
  /** How many are still missing. */
  missing: number;
};

/** Browser storage key for the viewer's plans. */
export const PLANS_STORAGE_KEY = 'valheim-dashboard.plans';

/** Most crafts one plan can hold, so a typo like 5000 does not flood the list. */
export const MAX_CRAFTS = 999;

/** Address the dashboard serves item icons from, for example `/icons/deer-hide.png`. */
export const ICON_PATH = '/icons/';

/** Size of an item icon next to its name, in pixels. */
export const ITEM_ICON_PX = 28;

/** Size of a recipe's icon beside its name or preview, in pixels. */
export const RECIPE_ICON_PX = 40;

/** The browser's live stream and page clock, while the page is open. */
export type LiveConnection = {
  /** Server-sent events from `/api/stream`. */
  source: EventSource;
  /** Timer that moves the page clock. */
  clock: ReturnType<typeof setInterval>;
};
