import { BUILDING_RECIPES } from '#/lib/building';
import { MATERIALS_GROUP, type Recipe, RECIPE_BIOMES } from '#/lib/models/recipes';
import { RECIPES } from '#/lib/recipes';
import { STATION_RECIPES } from '#/lib/stations';
import { recipeItemName } from '#/lib/stock';

/** Which list a plan is chosen from. */
export type PlanCatalog = 'tool' | 'station' | 'building' | 'material' | 'gear';

/** Handheld tools: the hammer, the hoe, axes and pickaxes. */
const TOOL_IDS = new Set([
  'hammer',
  'hoe',
  'stone-axe',
  'flint-axe',
  'antler-pickaxe',
  'bronze-axe',
  'bronze-pickaxe',
  'iron-axe',
  'iron-pickaxe',
  'blackmetal-axe',
]);

/** Bronze and nails. They live with the other crafted recipes and are shown with the materials. */
const MATERIAL_IDS = new Set(['bronze', 'bronze-nails', 'iron-nails']);

/** Recipes of [biome], in the order they are listed. */
const byBiome = (recipes: readonly Recipe[], biome: (typeof RECIPE_BIOMES)[number]): Recipe[] =>
  recipes.filter((recipe) => recipe.biome === biome);

/** Every tool, weapon, armor, food and ship recipe, by biome. The forge is a crafting station, so it is not here. */
export const PICKER_RECIPES: readonly Recipe[] = RECIPE_BIOMES.flatMap((biome) => byBiome(RECIPES, biome));

/** Axes and the other handheld tools, by biome. */
export const TOOL_PICKER: readonly Recipe[] = RECIPE_BIOMES.flatMap((biome) => byBiome(RECIPES, biome).filter((recipe) => TOOL_IDS.has(recipe.id)));

/** Weapons, armor, arrows, food, mead and ships, by biome. */
export const GEAR_PICKER: readonly Recipe[] = RECIPE_BIOMES.flatMap((biome) =>
  byBiome(RECIPES, biome).filter((recipe) => !TOOL_IDS.has(recipe.id) && !MATERIAL_IDS.has(recipe.id)),
);

/** Floors, walls and the other building pieces, by biome. */
export const BUILDING_PICKER: readonly Recipe[] = RECIPE_BIOMES.flatMap((biome) =>
  BUILDING_RECIPES.filter((recipe) => recipe.kind === 'build' && recipe.biome === biome),
);

/**
 * Wood, stone, bronze and the other materials, by biome.
 * Within a biome, what you gather comes before what you smelt or forge.
 */
export const MATERIAL_PICKER: readonly Recipe[] = RECIPE_BIOMES.flatMap((biome) => [
  ...BUILDING_RECIPES.filter((recipe) => recipe.group === MATERIALS_GROUP && recipe.kind === 'gather' && recipe.biome === biome),
  ...BUILDING_RECIPES.filter((recipe) => recipe.group === MATERIALS_GROUP && recipe.kind === 'craft' && recipe.biome === biome),
  ...byBiome(RECIPES, biome).filter((recipe) => MATERIAL_IDS.has(recipe.id)),
]);

/** Workbench, forge and the other crafting stations, by biome. */
export const STATION_PICKER: readonly Recipe[] = RECIPE_BIOMES.flatMap((biome) => byBiome(STATION_RECIPES, biome));

/** The five plan lists, in the order the page shows them. */
export const PLAN_CATALOGS: readonly {
  id: PlanCatalog;
  label: string;
  question: string;
  empty: string;
  make: string;
  recipes: readonly Recipe[];
}[] = [
  {
    id: 'tool',
    label: 'Tools',
    question: 'What do you want to make?',
    empty: 'No tools yet. They show up once someone has found what they take.',
    make: 'TOOLS',
    recipes: TOOL_PICKER,
  },
  {
    id: 'station',
    label: 'Crafting tools',
    question: 'What do you want to set up?',
    empty: 'No crafting tools yet. They show up once someone has found what they take.',
    make: 'CRAFTING TOOLS',
    recipes: STATION_PICKER,
  },
  {
    id: 'building',
    label: 'Building',
    question: 'What do you want to build?',
    empty: 'No building pieces yet. They show up once someone has found what they take.',
    make: 'BUILDING',
    recipes: BUILDING_PICKER,
  },
  {
    id: 'material',
    label: 'Materials',
    question: 'Which material?',
    empty: 'No materials yet. They show up once someone has found them, or found what a crafted one takes.',
    make: 'MATERIALS',
    recipes: MATERIAL_PICKER,
  },
  {
    id: 'gear',
    label: 'Gear and food',
    question: 'What do you want to make?',
    empty: 'No recipes yet. They show up once someone has found everything a recipe takes.',
    make: 'GEAR AND FOOD',
    recipes: GEAR_PICKER,
  },
];

/** The picker's group for [recipe]: its own group, or its biome. */
export const recipeGroup = (recipe: Recipe): string => recipe.group ?? recipe.biome;

/** Groups that have one of [recipes], materials first and then biomes in the order players reach them. */
export const groupsIn = (recipes: readonly Recipe[]): string[] => {
  const present = new Set(recipes.map(recipeGroup));
  return [MATERIALS_GROUP, ...RECIPE_BIOMES].filter((group) => present.has(group));
};

/**
 * Returns the recipes, in picker order, that someone can see. A crafted or built recipe shows once every
 * ingredient is among [seenItems]. A gathered material shows once that material itself has been found.
 * Like the game, nobody sees a recipe before they have found what it takes.
 */
export const knownOf = (recipes: readonly Recipe[], seenItems: string[]): Recipe[] => {
  const seen = new Set(seenItems.map(recipeItemName));
  return recipes.filter((recipe) =>
    recipe.kind === 'gather' ? seen.has(recipeItemName(recipe.name)) : recipe.ingredients.every(({ item }) => seen.has(item)),
  );
};

/** [knownOf] for the tools and food. */
export const knownRecipes = (seenItems: string[]): Recipe[] => knownOf(PICKER_RECIPES, seenItems);

/**
 * Returns where the highlight moves in a list of [count] options when [key] is pressed at [index],
 * or `undefined` when the key does not move it. Arrows stop at the ends; Home and End jump there.
 */
export const movedIndex = (index: number, key: string, count: number): number | undefined => {
  switch (key) {
    case 'ArrowDown':
      return Math.min(index + 1, count - 1);
    case 'ArrowUp':
      return Math.max(index - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return undefined;
  }
};
