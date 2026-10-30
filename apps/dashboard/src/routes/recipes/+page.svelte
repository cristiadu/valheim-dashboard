<script lang="ts">
  import { onMount } from 'svelte';

  import { MAX_CRAFTS, RECIPE_BIOMES, type Plan } from '#lib/models.ts';
  import { clampCrafts, newPlan, planItems, stillNeeded, withHave } from '#lib/planner.ts';
  import { loadPlans, planner, savePlans } from '#lib/plans.svelte.ts';
  import { RECIPES, recipeById } from '#lib/recipes.ts';

  onMount(loadPlans);

  /** Recipe and crafts picked in the new plan form. */
  let pickedId = $state(RECIPES[0]!.id);
  let pickedCrafts = $state(1);

  /** Recipe picked in the form. */
  const picked = $derived(recipeById(pickedId)!);

  /** Items still missing across every plan. */
  const needed = $derived(stillNeeded(planner.plans));

  /** Adds a plan for the picked recipe. */
  const addPlan = (event: SubmitEvent): void => {
    event.preventDefault();
    savePlans([...planner.plans, newPlan(planner.plans, pickedId, pickedCrafts)]);
  };

  /** Replaces [plan] with [changed]. */
  const updatePlan = (plan: Plan, changed: Plan): void => {
    savePlans(planner.plans.map((candidate) => (candidate.id === plan.id ? changed : candidate)));
  };

  /** Removes [plan]. */
  const removePlan = (plan: Plan): void => {
    savePlans(planner.plans.filter((candidate) => candidate.id !== plan.id));
  };
</script>

<div class="recipes">
  <section class="panel" aria-labelledby="new-title">
    <h2 id="new-title" class="panel-title">NEW PLAN</h2>
    <form onsubmit={addPlan}>
      <label>
        <span class="muted">Recipe</span>
        <select bind:value={pickedId}>
          {#each RECIPE_BIOMES as biome (biome)}
            <optgroup label={biome}>
              {#each RECIPES.filter((recipe) => recipe.biome === biome) as recipe (recipe.id)}
                <option value={recipe.id}>{recipe.name}</option>
              {/each}
            </optgroup>
          {/each}
        </select>
      </label>
      <label>
        <span class="muted">Times to craft</span>
        <input type="number" min="1" max={MAX_CRAFTS} bind:value={pickedCrafts} />
      </label>
      <button type="submit">Add plan</button>
    </form>
    <p class="muted">
      {picked.station}{picked.yields > 1 ? `, makes ${picked.yields} each time` : ''}:
      {picked.ingredients.map((line) => `${line.amount} ${line.item}`).join(', ')}
    </p>
  </section>

  {#if planner.isLoaded}
    <section class="panel" aria-labelledby="needed-title">
      <h2 id="needed-title" class="panel-title">STILL NEEDED</h2>
      {#if planner.plans.length === 0}
        <p class="muted">No plans yet. Plans are saved in this browser only.</p>
      {:else if needed.length === 0}
        <p class="ready">Every plan has what it needs.</p>
      {:else}
        <ul class="needed">
          {#each needed as line (line.item)}
            <li><span class="amount">{line.amount}</span> {line.item}</li>
          {/each}
        </ul>
      {/if}
    </section>

    {#each planner.plans as plan (plan.id)}
      {@const recipe = recipeById(plan.recipeId)!}
      {@const items = planItems(plan)}
      {@const isReady = items.every((line) => line.missing === 0)}
      <section class="panel" aria-label={recipe.name}>
        <div class="plan-head">
          <h2 class="plan-title">{recipe.name}</h2>
          {#if isReady}<span class="ready mono">READY</span>{/if}
          <label class="crafts">
            <span class="muted">Times</span>
            <input
              type="number"
              min="1"
              max={MAX_CRAFTS}
              value={plan.crafts}
              onchange={(event) => updatePlan(plan, { ...plan, crafts: clampCrafts(event.currentTarget.valueAsNumber) })}
            />
          </label>
          <button type="button" onclick={() => removePlan(plan)}>Remove</button>
        </div>
        <p class="muted">{recipe.station} · makes {recipe.yields * plan.crafts}</p>
        <table>
          <thead>
            <tr><th>Got it</th><th>Item</th><th>Have</th><th>Missing</th></tr>
          </thead>
          <tbody>
            {#each items as line (line.item)}
              <tr class:done={line.missing === 0}>
                <td>
                  <input
                    type="checkbox"
                    aria-label="Have all {line.item}"
                    checked={line.missing === 0}
                    onchange={(event) => updatePlan(plan, withHave(plan, line.item, event.currentTarget.checked ? line.need : 0))}
                  />
                </td>
                <td>{line.item}</td>
                <td class="have">
                  <input
                    type="number"
                    min="0"
                    max={line.need}
                    aria-label="How many {line.item} you have"
                    value={line.have}
                    onchange={(event) => updatePlan(plan, withHave(plan, line.item, event.currentTarget.valueAsNumber))}
                  />
                  <span class="muted">of {line.need}</span>
                </td>
                <td class="mono">{line.missing === 0 ? '–' : line.missing}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/each}
  {/if}
</div>

<style>
  /* Sections stacked with even space */
  .recipes {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 900px;
  }

  /* Text under a panel title */
  p {
    margin: 10px 0 0;
  }

  /* Form fields in a row that wraps on phones */
  form {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 12px;
  }

  /* Field label above its control */
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* Inputs and buttons share the Longhouse look and stay 44px tall for touch */
  select,
  input[type='number'],
  button {
    min-height: 44px;
    box-sizing: border-box;
    padding: 0 12px;
    border: 1px solid var(--line);
    background: var(--background);
    color: var(--text);
    font: inherit;
    font-size: 14px;
  }

  /* Recipe list gets room for long names */
  select {
    min-width: 220px;
    max-width: 100%;
  }

  /* Number fields only need a few digits */
  input[type='number'] {
    width: 84px;
  }

  /* Buttons look like the Saga filters */
  button {
    padding: 0 16px;
    cursor: pointer;
  }

  /* Add plan is the main action, so it uses the accent */
  button[type='submit'] {
    border-color: var(--ember);
    color: var(--ember);
  }

  /* Missing items flow in columns */
  .needed {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 6px 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Count before each missing item */
  .amount {
    display: inline-block;
    min-width: 36px;
    font-family: var(--font-heading);
    color: var(--ember);
  }

  /* Ready plans and an empty shopping list */
  .ready {
    color: var(--good);
  }

  /* Plan name, ready mark, times and remove in one row */
  .plan-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
  }

  /* Plan name in the heading font */
  .plan-title {
    margin: 0;
    flex: 1 1 auto;
    font-family: var(--font-heading);
    font-size: 18px;
    font-weight: 500;
  }

  /* Times field sits beside its label in the plan row */
  .crafts {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  /* Ingredient table fills the panel */
  table {
    width: 100%;
    margin-top: 12px;
    border-collapse: collapse;
  }

  /* Column names */
  th {
    padding: 0 8px 6px 0;
    font-size: 12px;
    font-weight: 400;
    text-align: left;
    color: var(--muted);
  }

  /* One ingredient row with a hairline above */
  td {
    padding: 6px 8px 6px 0;
    border-top: 1px solid var(--line-soft);
  }

  /* Ticked rows fade so the missing ones stand out */
  tr.done td {
    color: var(--muted);
  }

  /* Have field and its "of 30" stay on one line */
  .have {
    white-space: nowrap;
  }

  /* Have fields are narrower so rows fit on phones */
  .have input {
    width: 68px;
  }

  /* Bigger checkbox for touch */
  input[type='checkbox'] {
    width: 22px;
    height: 22px;
    accent-color: var(--good);
  }
</style>
