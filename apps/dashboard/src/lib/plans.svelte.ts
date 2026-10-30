import { PLANS_STORAGE_KEY, type Plan } from '#/src/lib/models.ts';
import { readPlans } from '#/src/lib/planner.ts';

/** The viewer's recipe plans. Empty until [loadPlans] runs in the browser. */
export const planner = $state<{ plans: Plan[]; isLoaded: boolean }>({ plans: [], isLoaded: false });

/** Loads the viewer's plans from browser storage. Runs in the browser. */
export const loadPlans = (): void => {
  try {
    planner.plans = readPlans(localStorage.getItem(PLANS_STORAGE_KEY));
  } catch {
    // Storage is blocked, for example in a private window: plans live only until the page closes.
    planner.plans = [];
  }
  planner.isLoaded = true;
};

/** Shows [plans] and saves them in browser storage. */
export const savePlans = (plans: Plan[]): void => {
  planner.plans = plans;
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // Storage is blocked: the plans still show until the page closes.
  }
};
