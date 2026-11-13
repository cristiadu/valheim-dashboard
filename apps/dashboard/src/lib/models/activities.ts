import type { SourceLines } from '#/lib/models/snapshot';
import type { StoryKind } from '#/lib/models/story';

/**
 * What a stretch of activity is: pieces built, a builder's pieces destroyed, creatures killed, items gathered
 * from the world, items stored in or taken from chests, crops planted, food eaten, items put into smelters, food
 * put on to cook, mead bases put into fermenters, ships steered, crafting stations opened, emotes, items made or
 * upgraded, tames ridden, forsaken powers used, carts pulled, fires fueled, pieces repaired, items obliterated,
 * arrows and bolts shot, trees cut down or rocks mined out, items dropped on the ground, or items picked up that
 * another player dropped.
 */
export type ActivityKind =
  | 'built'
  | 'destroyed'
  | 'killed'
  | 'gathered'
  | 'stored'
  | 'taken'
  | 'planted'
  | 'ate'
  | 'smelted'
  | 'cooked'
  | 'brewed'
  | 'sailed'
  | 'crafted'
  | 'emoted'
  | 'made'
  | 'upgraded'
  | 'rode'
  | 'powered'
  | 'pulled'
  | 'fueled'
  | 'repaired'
  | 'obliterated'
  | 'shot'
  | 'cut'
  | 'mined'
  | 'dropped'
  | 'received';

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
  /** Player who dropped the items, for items picked up that another player dropped. */
  from?: string;
  /** Log lines of the stretch. */
  source: SourceLines;
};

/** Story kind of each activity kind, which picks its rune, color and label. */
export const ACTIVITY_STORY_KINDS: Record<ActivityKind, StoryKind> = {
  built: 'built',
  destroyed: 'wrecked',
  killed: 'fight',
  gathered: 'items',
  stored: 'items',
  taken: 'items',
  planted: 'built',
  ate: 'items',
  smelted: 'items',
  cooked: 'items',
  brewed: 'items',
  sailed: 'travel',
  crafted: 'built',
  emoted: 'chat',
  made: 'items',
  upgraded: 'items',
  rode: 'travel',
  powered: 'boss',
  pulled: 'travel',
  fueled: 'built',
  repaired: 'built',
  obliterated: 'items',
  shot: 'items',
  cut: 'items',
  mined: 'items',
  dropped: 'items',
  received: 'items',
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
  planted: { verb: 'planted', one: 'plant', many: 'plants', ending: '' },
  ate: { verb: 'ate or drank', one: 'thing', many: 'things', ending: '' },
  smelted: { verb: 'put', one: 'item', many: 'items', ending: ' into smelters and kilns' },
  cooked: { verb: 'started cooking', one: 'thing', many: 'things', ending: '' },
  brewed: { verb: 'started brewing', one: 'mead', many: 'meads', ending: '' },
  sailed: { verb: 'steered', one: 'ship', many: 'ships', ending: '' },
  crafted: { verb: 'worked at', one: 'crafting station', many: 'crafting stations', ending: '' },
  emoted: { verb: 'did', one: 'emote', many: 'emotes', ending: '' },
  made: { verb: 'made', one: 'item', many: 'items', ending: '' },
  upgraded: { verb: 'upgraded', one: 'item', many: 'items', ending: '' },
  rode: { verb: 'rode', one: 'tame', many: 'tames', ending: '' },
  powered: { verb: 'used a forsaken power', one: 'time', many: 'times', ending: '' },
  pulled: { verb: 'pulled a cart', one: 'time', many: 'times', ending: '' },
  fueled: { verb: 'fueled', one: 'fire', many: 'fires', ending: '' },
  repaired: { verb: 'repaired', one: 'piece', many: 'pieces', ending: '' },
  obliterated: { verb: 'obliterated', one: 'item', many: 'items', ending: '' },
  shot: { verb: 'shot', one: 'arrow or bolt', many: 'arrows and bolts', ending: '' },
  cut: { verb: 'cut down', one: 'tree', many: 'trees', ending: '' },
  mined: { verb: 'mined out', one: 'rock', many: 'rocks', ending: '' },
  dropped: { verb: 'dropped', one: 'item', many: 'items', ending: '' },
  received: { verb: 'picked up', one: 'item', many: 'items', ending: '' },
};

/** Activity totals on a player's card, in this order, with the label under each number. Kills have their own number. */
export const PLAYER_ACTIVITY_STATS: { kind: ActivityKind; label: string }[] = [
  { kind: 'built', label: 'Pieces built' },
  { kind: 'gathered', label: 'Items gathered' },
  { kind: 'cut', label: 'Trees cut' },
  { kind: 'mined', label: 'Rocks mined' },
  { kind: 'planted', label: 'Crops planted' },
  { kind: 'ate', label: 'Meals eaten' },
  { kind: 'smelted', label: 'Put in smelters' },
  { kind: 'cooked', label: 'Food cooked' },
  { kind: 'brewed', label: 'Meads brewed' },
  { kind: 'crafted', label: 'Crafting visits' },
  { kind: 'emoted', label: 'Emotes' },
  { kind: 'made', label: 'Items made' },
  { kind: 'upgraded', label: 'Items upgraded' },
  { kind: 'rode', label: 'Rides' },
  { kind: 'powered', label: 'Powers used' },
  { kind: 'pulled', label: 'Carts pulled' },
  { kind: 'fueled', label: 'Fires fueled' },
  { kind: 'repaired', label: 'Pieces repaired' },
  { kind: 'obliterated', label: 'Items obliterated' },
  { kind: 'shot', label: 'Arrows shot' },
  { kind: 'dropped', label: 'Items dropped' },
];

/** Thing a meal counts as when the server never learned what the player ate, left out of the item list. */
export const UNKNOWN_FOOD = 'something';
