import type { SourceLines } from '#/lib/models/snapshot';
import type { StoryKind } from '#/lib/models/story';

/**
 * What a stretch of activity is: pieces built, a builder's pieces destroyed, creatures killed, items gathered
 * from the world, items stored in or taken from chests, crops planted, food eaten, items put into smelters, food
 * put on to cook, mead bases put into fermenters, ships steered, crafting stations opened, emotes, items made or
 * upgraded, tames ridden, forsaken powers used, carts pulled, fires fueled, pieces repaired, items obliterated,
 * trees cut down or rocks mined out.
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
  | 'cut'
  | 'mined';

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
  cut: 'items',
  mined: 'items',
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
  cut: { verb: 'cut down', one: 'tree', many: 'trees', ending: '' },
  mined: { verb: 'mined out', one: 'rock', many: 'rocks', ending: '' },
};

/** Activity totals on a player's card, in this order, with the label under each number. Kills have their own number. */
export const PLAYER_ACTIVITY_STATS: { kind: ActivityKind; label: string }[] = [
  { kind: 'built', label: 'Pieces built' },
  { kind: 'gathered', label: 'Items gathered' },
  { kind: 'cut', label: 'Trees cut' },
  { kind: 'mined', label: 'Rocks mined' },
  { kind: 'planted', label: 'Crops planted' },
  { kind: 'ate', label: 'Meals eaten' },
  { kind: 'smelted', label: 'Ores smelted' },
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
];

/** Thing a meal counts as when the server never learned what the player ate, left out of the item list. */
export const UNKNOWN_FOOD = 'something';

/** Fewest items one slot holds for an item to count as a stackable material, not a tool or piece of gear. */
export const MIN_STACKABLE = 2;

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
  [/^(Axe|Battleaxe|Sword|Mace|Club|Spear|Knife|Atgeir|Sledge|Bow|Crossbow|Staff|Fist)/, 'weapon'],
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
  BowFineWood: 'Finewood bow',
  AxeWood: 'Wooden axe',
  KnifeWood: 'Wooden knife',
  SpearWood: 'Wooden spear',
  SwordWood: 'Wooden sword',
  FistBjornClaw: 'Paws of the Bear',
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
  ShieldWoodTower: 'Wood tower shield',
  ShieldBoneTower: 'Bone tower shield',
  ShieldIronTower: 'Iron tower shield',
  SledgeStagbreaker: 'Stagbreaker',
  SpearElderbark: 'Ancient bark spear',
  ArmorRagsChest: 'Rag tunic',
  ArmorRagsLegs: 'Rag pants',
};

/**
 * Names the game shows for items that are not gear, by the prefab the plugin logs, for example `Boar meat` for
 * `RawMeat`. The names also pick the icon, and every item listed here gets its icon downloaded on start. Other
 * items get theirs the first time a page shows them.
 */
export const ITEM_NAMES: Record<string, string> = {
  RawMeat: 'Boar meat',
  CookedMeat: 'Cooked boar meat',
  RoundLog: 'Core wood',
  ElderBark: 'Ancient bark',
  Raspberry: 'Raspberries',
  MushroomYellow: 'Yellow mushroom',
  QueensJam: "Queen's jam",
  SerpentMeatCooked: 'Cooked serpent meat',
  YmirRemains: 'Ymir flesh',
  NeckTailGrilled: 'Grilled neck tail',
  Fish1: 'Perch',
  Fish2: 'Pike',
  ArrowWood: 'Wood arrow',
  ArrowFlint: 'Flint arrow',
  ArrowFire: 'Fire arrow',
  MeadBaseHealthMinor: 'Minor healing mead base',
  MeadHealthMinor: 'Minor healing mead',
  MeadBaseStaminaMinor: 'Minor stamina mead base',
  MeadStaminaMinor: 'Minor stamina mead',
  MeadBasePoisonResist: 'Poison resistance mead base',
  MeadPoisonResist: 'Poison resistance mead',
  MeadBaseFrostResist: 'Frost resistance mead base',
  MeadFrostResist: 'Frost resistance mead',
  CopperOre: 'Copper ore',
  TinOre: 'Tin ore',
  IronScrap: 'Scrap iron',
  SilverOre: 'Silver ore',
  Coins: 'Coins',
  Amber: 'Amber',
  AmberPearl: 'Amber pearl',
  Ruby: 'Ruby',
  SilverNecklace: 'Silver necklace',
  TrophyDeer: 'Deer trophy',
  TrophyBoar: 'Boar trophy',
  TrophyNeck: 'Neck trophy',
  TrophyEikthyr: 'Eikthyr trophy',
  TrophyGreydwarf: 'Greydwarf trophy',
  TrophyGreydwarfBrute: 'Greydwarf brute trophy',
  TrophyGreydwarfShaman: 'Greydwarf shaman trophy',
  TrophySkeleton: 'Skeleton trophy',
  TrophyGhost: 'Ghost trophy',
  TrophyFrostTroll: 'Troll trophy',
  TrophyTheElder: 'The Elder trophy',
  TrophyDraugr: 'Draugr trophy',
  TrophyBlob: 'Blob trophy',
  TrophyLeech: 'Leech trophy',
  TrophySurtling: 'Surtling trophy',
  TrophyWolf: 'Wolf trophy',
  TrophyHatchling: 'Drake trophy',
  TrophyBjorn: 'Bear trophy',
  BjornHide: 'Bear hide',
  BjornPaw: 'Bear paw',
  PulledBear: 'Pulled bear',
  AxeHead2: 'Mysterious axe head',
  KnifeButcher: 'Butcher knife',
  MinceMeatSauce: 'Minced meat sauce',
  Acorn: 'Acorn',
  PineCone: 'Pine cone',
  Upgrader0Weapon: 'Wooden battle idol',
  Upgrader0Armor: 'Wooden protection idol',
  Upgrader1Weapon: 'Bronze battle idol',
  Upgrader1Armor: 'Bronze protection idol',
  Upgrader2Weapon: 'Iron battle idol',
  Upgrader2Armor: 'Iron protection idol',
  Upgrader3Weapon: 'Silver battle idol',
  Upgrader3Armor: 'Silver protection idol',
  Upgrader4Weapon: 'Black metal battle idol',
  Upgrader4Armor: 'Black metal protection idol',
  Upgrader5Weapon: 'Black marble battle idol',
  Upgrader5Armor: 'Black marble protection idol',
  Upgrader6Weapon: 'Flametal battle idol',
  Upgrader6Armor: 'Flametal protection idol',
  Upgrader7Weapon: 'Bloodgold battle idol',
  Upgrader7Armor: 'Bloodgold protection idol',
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
  /** Piece worn in each slot. Empty slots are missing. */
  worn: Partial<Record<GearSlot, GearPiece>>;
  /** Tools and spare pieces held now that have no slot of their own, such as a torch or the hammer. */
  held: GearPiece[];
};

/** Size of a gear icon in its slot, in pixels. */
export const GEAR_ICON_PX = 38;

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

/** Start of a Recipes source value that picks one player's chests, followed by the player's key. */
export const CHESTS_SOURCE = 'chests:';

/** Start of a Recipes source value that picks one character's bag, followed by the character's name. */
export const BAG_SOURCE = 'bag:';

/** A recipe and how many times the items in stock can make it. */
export type Craftable = {
  /** The recipe. */
  recipe: Recipe;
  /** How many crafts the stock covers. */
  times: number;
};
