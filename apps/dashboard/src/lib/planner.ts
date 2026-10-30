import { MAX_CRAFTS, type ItemAmount, type Plan, type PlanItem } from './models';
import { recipeById } from './recipes';

/** Returns [crafts] as a whole number from 1 to [MAX_CRAFTS]. Anything that is not a number becomes 1. */
export const clampCrafts = (crafts: number): number => {
  if (!Number.isFinite(crafts)) {
    return 1;
  }
  return Math.min(MAX_CRAFTS, Math.max(1, Math.floor(crafts)));
};

/** Returns a new plan to craft [recipeId] [crafts] times, with an id one above the highest in [plans]. */
export const newPlan = (plans: readonly Plan[], recipeId: string, crafts: number): Plan => ({
  id: Math.max(0, ...plans.map((plan) => plan.id)) + 1,
  recipeId,
  crafts: clampCrafts(crafts),
  have: {},
});

/** Returns [plan] with [amount] of [item] set aside. Amounts below 0 or not whole become whole numbers from 0. */
export const withHave = (plan: Plan, item: string, amount: number): Plan => ({
  ...plan,
  have: { ...plan.have, [item]: Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0 },
});

/** Returns what [plan] needs, item by item, in recipe order. Empty when its recipe is unknown. */
export const planItems = (plan: Plan): PlanItem[] => {
  const recipe = recipeById(plan.recipeId);
  if (recipe === undefined) {
    return [];
  }
  return recipe.ingredients.map(({ item, amount }) => {
    const need = amount * plan.crafts;
    const have = Math.min(need, plan.have[item] ?? 0);
    return { item, need, have, missing: need - have };
  });
};

/** Returns how many of each item are still missing across all [plans], most missing first. Items not missing are left out. */
export const stillNeeded = (plans: readonly Plan[]): ItemAmount[] => {
  const missing = new Map<string, number>();
  for (const plan of plans) {
    for (const line of planItems(plan)) {
      if (line.missing > 0) {
        missing.set(line.item, (missing.get(line.item) ?? 0) + line.missing);
      }
    }
  }
  return [...missing.entries()]
    .map(([item, amount]) => ({ item, amount }))
    .sort((a, b) => b.amount - a.amount || a.item.localeCompare(b.item));
};

/** Reads plans saved as JSON in [saved]. Returns no plans for empty or broken data, and drops plans for unknown recipes. */
export const readPlans = (saved: string | null): Plan[] => {
  if (saved === null) {
    return [];
  }
  let plans: Plan[];
  try {
    plans = JSON.parse(saved);
  } catch {
    return [];
  }
  if (!Array.isArray(plans)) {
    return [];
  }
  return plans
    .filter((plan) => Number.isInteger(plan?.id) && recipeById(plan.recipeId) !== undefined)
    .map((plan) => ({ ...plan, crafts: clampCrafts(plan.crafts), have: plan.have ?? {} }));
};
