import type { MapChest } from '#/lib/models/map';

/** Where a recipe is made in the game. `Hand` means the crafting menu, with no station. `None` means a piece placed with the hammer that needs nothing nearby. */
export type CraftingStation =
  | 'Hand'
  | 'None'
  | 'Workbench'
  | 'Forge'
  | 'Stonecutter'
  | 'Black forge'
  | 'Cauldron'
  | 'Mead ketill'
  | 'Artisan table'
  | 'Galdr table'
  | 'Smelter'
  | 'Blast furnace'
  | 'Charcoal kiln';

/** Biome a recipe belongs to, in the order players usually reach them. Groups the recipe list. */
export const RECIPE_BIOMES = ['Meadows', 'Black Forest', 'Swamp', 'Mountain', 'Plains', 'Mistlands', 'Ashlands', 'Deep North'] as const;

/** Picker group for wood, stone, bronze and the other materials. */
export const MATERIALS_GROUP = 'Materials';

/** Whether a tracked recipe is crafted, built with the hammer, gathered in the world, or a crafting station. */
export type RecipeKind = 'craft' | 'build' | 'gather' | 'station';

/** One biome from [RECIPE_BIOMES]. */
export type RecipeBiome = (typeof RECIPE_BIOMES)[number];

/** An item and how many of it. */
export type ItemAmount = {
  /** Item name as the game shows it, for example `Deer hide`. */
  item: string;
  /** How many. */
  amount: number;
};

/** One place a gathered material comes from, and how many one of them gives. */
export type ItemSource = {
  /** What you take it from, for example `Beech`. */
  name: string;
  /** How many of the material one of these gives, at the normal resource rate. */
  amount: number;
  /** Item whose icon stands for it, for example `Beech sapling` for a beech. */
  iconItem: string;
};

/** A Valheim recipe at quality level 1, a building piece, or a material gathered in the world. */
export type Recipe = {
  /** Stable key saved in plans, for example `bronze-axe`. */
  id: string;
  /** Name as the game shows it. */
  name: string;
  /** Biome where its materials come from. */
  biome: RecipeBiome;
  /** Where it is made. Gathered materials use `Hand` because they have no station. */
  station: CraftingStation;
  /** Crafted gear, a building piece, or a material gathered in the world. */
  kind: RecipeKind;
  /** How many items one craft gives, for example 20 arrows. A gathered material uses 1, and the plan's count is how many you want. */
  yields: number;
  /** Items used by one craft. Empty for a gathered material, which is tracked as itself. */
  ingredients: ItemAmount[];
  /** Picker group when it is not the biome, for example `Materials`. */
  group?: string;
  /** Where a gathered material comes from. Empty for anything you craft or build. */
  sources?: ItemSource[];
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

/** A place that holds some of an item: a chest found on the map, or the bag the server guesses for a character. */
export type ItemPlace = { kind: 'chest'; chest: MapChest; count: number } | { kind: 'bag'; character: string; count: number };

/** Places shown under a missing plan item before the rest fold away. */
export const PLACES_SHOWN = 3;
