import { RECIPE_BIOMES, type Recipe } from '#/lib/models';
import { RECIPES } from '#/lib/recipes';

/** Every recipe in the order the picker lists them: by biome, then as typed in [RECIPES]. */
export const PICKER_RECIPES: readonly Recipe[] = RECIPE_BIOMES.flatMap((biome) => RECIPES.filter((recipe) => recipe.biome === biome));

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
