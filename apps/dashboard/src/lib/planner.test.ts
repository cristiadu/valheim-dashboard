import { describe, expect, it } from 'vitest';

import { clampCrafts, newPlan, planItems, readPlans, stillNeeded, withHave } from './planner';
import { planWith } from './test-common';

describe('clampCrafts', () => {
  it('keeps a whole number in range', () => {
    // GIVEN 3 crafts
    // WHEN it is clamped
    // THEN it stays 3
    expect(clampCrafts(3)).toBe(3);
  });

  it('rounds down and keeps at least 1', () => {
    // GIVEN 2.7, 0 and not-a-number
    // WHEN each is clamped
    const clamped = [clampCrafts(2.7), clampCrafts(0), clampCrafts(Number.NaN)];

    // THEN they become 2, 1 and 1
    expect(clamped).toEqual([2, 1, 1]);
  });

  it('caps at 999', () => {
    // GIVEN 5000 crafts
    // WHEN it is clamped
    // THEN it becomes 999
    expect(clampCrafts(5000)).toBe(999);
  });
});

describe('newPlan', () => {
  it('starts at id 1 with nothing set aside', () => {
    // GIVEN no plans
    // WHEN a plan for 2 Iron swords is made
    const plan = newPlan([], 'iron-sword', 2);

    // THEN it is plan 1 with nothing set aside
    expect(plan).toEqual({ id: 1, recipeId: 'iron-sword', crafts: 2, have: {} });
  });

  it('takes the id after the highest one', () => {
    // GIVEN plans 1 and 4
    const plans = [planWith({ id: 1 }), planWith({ id: 4 })];

    // WHEN another plan is made
    const plan = newPlan(plans, 'karve', 1);

    // THEN it is plan 5
    expect(plan.id).toBe(5);
  });
});

describe('withHave', () => {
  it('sets aside an amount of one item', () => {
    // GIVEN a Bronze axe plan
    // WHEN 3 Wood are set aside
    const plan = withHave(planWith({}), 'Wood', 3);

    // THEN the plan has 3 Wood
    expect(plan.have).toEqual({ Wood: 3 });
  });

  it('turns a negative or empty amount into 0', () => {
    // GIVEN a plan with 3 Wood
    const plan = planWith({ have: { Wood: 3 } });

    // WHEN Wood is set to -2, then Bronze to not-a-number
    const changed = withHave(withHave(plan, 'Wood', -2), 'Bronze', Number.NaN);

    // THEN both are 0
    expect(changed.have).toEqual({ Wood: 0, Bronze: 0 });
  });
});

describe('planItems', () => {
  it('multiplies the recipe by the crafts and subtracts what is set aside', () => {
    // GIVEN 2 Bronze axes with 10 Wood and 5 Bronze set aside
    const plan = planWith({ crafts: 2, have: { Wood: 10, Bronze: 5 } });

    // WHEN its items are listed
    const items = planItems(plan);

    // THEN Wood is covered (capped at what is needed) and 11 Bronze are missing
    expect(items).toEqual([
      { item: 'Wood', need: 8, have: 8, missing: 0 },
      { item: 'Bronze', need: 16, have: 5, missing: 11 },
    ]);
  });

  it('lists nothing for an unknown recipe', () => {
    // GIVEN a plan for a recipe that is not in the list
    // WHEN its items are listed
    // THEN there are none
    expect(planItems(planWith({ recipeId: 'golden-hammer' }))).toEqual([]);
  });
});

describe('stillNeeded', () => {
  it('adds up what is missing across plans, most first', () => {
    // GIVEN a Bronze axe with 2 Wood set aside and 2 Iron swords
    const plans = [planWith({ have: { Wood: 2 } }), planWith({ id: 2, recipeId: 'iron-sword', crafts: 2 })];

    // WHEN what is still needed is listed
    const needed = stillNeeded(plans);

    // THEN items from both plans are added up
    expect(needed).toEqual([
      { item: 'Iron', amount: 40 },
      { item: 'Bronze', amount: 8 },
      { item: 'Leather scraps', amount: 6 },
      { item: 'Wood', amount: 6 },
    ]);
  });

  it('leaves out items that are covered', () => {
    // GIVEN a Bronze axe with everything set aside
    const plans = [planWith({ have: { Wood: 4, Bronze: 8 } })];

    // WHEN what is still needed is listed
    // THEN nothing is
    expect(stillNeeded(plans)).toEqual([]);
  });
});

describe('readPlans', () => {
  it('reads saved plans', () => {
    // GIVEN one saved plan
    const saved = '[{"id":1,"recipeId":"bronze-axe","crafts":2,"have":{"Wood":3}}]';

    // WHEN it is read
    // THEN it comes back as it was
    expect(readPlans(saved)).toEqual([{ id: 1, recipeId: 'bronze-axe', crafts: 2, have: { Wood: 3 } }]);
  });

  it('returns no plans for nothing saved, broken JSON or a non-list', () => {
    // GIVEN nothing, broken JSON and an object
    // WHEN each is read
    const results = [readPlans(null), readPlans('[{'), readPlans('{"id":1}')];

    // THEN each gives no plans
    expect(results).toEqual([[], [], []]);
  });

  it('drops unknown recipes and fixes bad crafts', () => {
    // GIVEN a plan for an unknown recipe and one with 0 crafts and no items set aside
    const saved = '[{"id":1,"recipeId":"golden-hammer","crafts":1,"have":{}},{"id":2,"recipeId":"karve","crafts":0}]';

    // WHEN they are read
    // THEN only the Karve is kept, with 1 craft
    expect(readPlans(saved)).toEqual([{ id: 2, recipeId: 'karve', crafts: 1, have: {} }]);
  });
});
