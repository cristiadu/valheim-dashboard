<script lang="ts">
  import { onMount } from 'svelte';

  import { resolve } from '$app/paths';

  import ItemIcon from '#/lib/components/ItemIcon';
  import Pill from '#/lib/components/Pill';
  import RecipePicker from '#/lib/components/RecipePicker';
  import { live, useSnapshot } from '#/lib/live.svelte';
  import { builtByShortLabel, chestTitle } from '#/lib/items';
  import { foundChests, mapOf } from '#/lib/map';
  import { CHEST_QUERY } from '#/lib/models/map';
  import {
    BAG_SOURCE,
    CHESTS_SOURCE,
    type ItemPlace,
    MAX_CRAFTS,
    PLACES_SHOWN,
    type Plan,
    RECIPE_ICON_PX,
  } from '#/lib/models/recipes';
  import { knownRecipes } from '#/lib/picker';
  import { planPill } from '#/lib/pills';
  import { clampCrafts, newPlan, planItems, stillNeeded, withHave } from '#/lib/planner';
  import { loadPlans, planner, savePlans } from '#/lib/plans.svelte';
  import { playersOf } from '#/lib/players';
  import { madeAt, recipeById } from '#/lib/recipes';
  import { bagStock, builderNames, chestStock, craftables, itemPlacesOf } from '#/lib/stock';

  onMount(loadPlans);

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
  const snapshot = $derived(getSnapshot());

  /** Players at the page clock, whose chests the viewer can pick. */
  const players = $derived(live.nowMs === null ? [] : playersOf(snapshot, live.nowMs));

  /** What the recipes are made from: empty for every chest, `chests:` and a player key, or `bag:` and a character. */
  let source = $state('');

  /** Characters whose bag the server has a guess for, by name. */
  const bagOwners = $derived(Object.keys(snapshot.bags).toSorted());

  /** Items in the picked chests or bag, by recipe item name. */
  const stock = $derived.by(() => {
    if (source.startsWith(BAG_SOURCE)) {
      return bagStock(snapshot.bags[source.slice(BAG_SOURCE.length)] ?? {});
    }
    const owner = players.find((player) => `${CHESTS_SOURCE}${player.key}` === source);
    return chestStock(snapshot, owner === undefined ? null : builderNames(owner));
  });

  /** Where each item sits: chests found on the map and the bags the server guesses, most first. */
  const places = $derived(itemPlacesOf(mapOf(snapshot, players)?.chests ?? [], snapshot.bags));

  /** Recipes the picked chests or bag have enough for. */
  const canMake = $derived(craftables(stock));

  /** Recipes whose every ingredient someone has handled or seen in a found chest, so nobody sees what is ahead. */
  const known = $derived(
    knownRecipes([...snapshot.seenItems, ...foundChests(snapshot).flatMap(([, chest]) => Object.keys(chest.items))]),
  );

  /** Recipe chosen in the new plan form, if any yet. */
  let chosenId = $state<string | null>(null);

  /** Recipe picked in the new plan form: the chosen one while it is known, else the first known one. */
  const picked = $derived(known.find((recipe) => recipe.id === chosenId) ?? known[0] ?? null);

  /** How many crafts the new plan form asks for. */
  let pickedCrafts = $state(1);

  /** Items still missing across every plan. */
  const needed = $derived(stillNeeded(planner.plans));

  /** Adds a plan for the picked recipe. */
  const addPlan = (event: SubmitEvent): void => {
    event.preventDefault();
    savePlans([...planner.plans, newPlan(planner.plans, picked!.id, pickedCrafts)]);
  };

  /** Replaces [plan] with [changed]. */
  const updatePlan = (plan: Plan, changed: Plan): void => {
    savePlans(planner.plans.map((candidate) => (candidate.id === plan.id ? changed : candidate)));
  };

  /** Returns a key for [place] that no other place of the same item has. */
  const placeKey = (place: ItemPlace): string => (place.kind === 'bag' ? `bag:${place.character}` : place.chest.id);

  /** Removes [plan]. */
  const removePlan = (plan: Plan): void => {
    savePlans(planner.plans.filter((candidate) => candidate.id !== plan.id));
  };
</script>

{#snippet placeLink(place: ItemPlace)}
  {#if place.kind === 'bag'}
    <span class="amount">{place.count.toLocaleString()}</span>in {place.character}'s bag
  {:else}
    <span class="amount">{place.count.toLocaleString()}</span>in
    <a href="{resolve('/map')}?{CHEST_QUERY}={encodeURIComponent(place.chest.id)}">{chestTitle(place.chest.record)}</a>
    <span class="muted">{builtByShortLabel(place.chest.record.builder)}</span>
  {/if}
{/snippet}

<div class="recipes">
  <section class="panel" aria-labelledby="new-title">
    <h2 id="new-title" class="panel-title">START A PLAN</h2>
    {#if picked === null}
      <p class="muted">No recipes yet. They show up once someone has found everything a recipe takes.</p>
    {:else}
      <form onsubmit={addPlan}>
        <RecipePicker
          bind:value={() => picked.id, (id) => (chosenId = id)}
          label="What do you want to make?"
          recipes={known}
        />
        <label>
          <span class="muted">{picked.yields > 1 ? 'How many batches?' : 'How many?'}</span>
          <input type="number" min="1" max={MAX_CRAFTS} bind:value={pickedCrafts} />
        </label>
        <button type="submit">Start tracking</button>
      </form>
      <div class="preview">
        <ItemIcon item={picked.name} size={RECIPE_ICON_PX} />
        <div>
          <p class="muted">
            {madeAt(picked.station)} {picked.yields > 1 ? `Each batch makes ${picked.yields} and takes:` : 'Takes:'}
          </p>
          <ul class="items">
            {#each picked.ingredients as line (line.item)}
              <li><ItemIcon item={line.item} /><span class="amount">{line.amount}</span>{line.item}</li>
            {/each}
          </ul>
        </div>
      </div>
    {/if}
  </section>

  <section class="panel" aria-labelledby="chests-title">
    <h2 id="chests-title" class="panel-title">WHAT YOU CAN MAKE</h2>
    <label>
      <span class="muted">Made from</span>
      <select bind:value={source}>
        <optgroup label="Chests">
          <option value="">Every chest</option>
          {#each players as player (player.key)}
            <option value="{CHESTS_SOURCE}{player.key}">Chests built by {player.character}</option>
          {/each}
        </optgroup>
        {#if bagOwners.length > 0}
          <optgroup label="What someone carries">
            {#each bagOwners as character (character)}
              <option value="{BAG_SOURCE}{character}">{character}'s bag</option>
            {/each}
          </optgroup>
        {/if}
      </select>
    </label>
    {#if source.startsWith(BAG_SOURCE)}
      <p class="muted">
        The bag is a guess from what the server sees: pickups, chest moves, smelting, eating and tombstones. Crafting,
        building and dropping things aren't in the log, so it can be off.
      </p>
    {/if}
    {#if canMake.length === 0}
      <p class="muted">Not enough here for any recipe yet.</p>
    {:else}
      <p class="muted">How many of each you could make from these items.</p>
      <ul class="items">
        {#each canMake as craftable (craftable.recipe.id)}
          <li>
            <ItemIcon item={craftable.recipe.name} />
            <span class="amount">{craftable.times * craftable.recipe.yields}</span>{craftable.recipe.name}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  {#if planner.isLoaded}
    <section class="panel" aria-labelledby="needed-title">
      <h2 id="needed-title" class="panel-title">STILL TO GATHER</h2>
      {#if planner.plans.length === 0}
        <p class="muted">Nothing planned yet. Your plans stay in this browser, so only you see them.</p>
      {:else if needed.length === 0}
        <p class="ready">You have everything. Time to craft!</p>
      {:else}
        <ul class="items">
          {#each needed as line (line.item)}
            <li><ItemIcon item={line.item} /><span class="amount">{line.amount}</span>{line.item}</li>
          {/each}
        </ul>
      {/if}
    </section>

    {#each planner.plans as plan (plan.id)}
      {@const recipe = recipeById(plan.recipeId)!}
      {@const items = planItems(plan)}
      {@const missingItems = items.filter((line) => line.missing > 0).length}
      <section class="panel" aria-label={recipe.name}>
        <div class="plan-head">
          <ItemIcon item={recipe.name} size={RECIPE_ICON_PX} />
          <h2 class="plan-title">{recipe.name}</h2>
          <Pill pill={planPill(missingItems)} />
          <label class="crafts">
            <span class="muted">{recipe.yields > 1 ? 'Batches' : 'How many'}</span>
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
        <p class="muted">{madeAt(recipe.station)}{recipe.yields > 1 ? ` You'll get ${recipe.yields * plan.crafts}.` : ''}</p>
        <table>
          <thead>
            <tr><th>Got it</th><th>Item</th><th>You have</th><th>Still need</th></tr>
          </thead>
          <tbody>
            {#each items as line (line.item)}
              <tr class:done={line.missing === 0}>
                <td>
                  <input
                    type="checkbox"
                    aria-label="I have all the {line.item}"
                    checked={line.missing === 0}
                    onchange={(event) => updatePlan(plan, withHave(plan, line.item, event.currentTarget.checked ? line.need : 0))}
                  />
                </td>
                <td><span class="item"><ItemIcon item={line.item} />{line.item}</span></td>
                <td class="have">
                  <input
                    type="number"
                    min="0"
                    max={line.need}
                    aria-label="How much {line.item} you have"
                    value={line.have}
                    onchange={(event) => updatePlan(plan, withHave(plan, line.item, event.currentTarget.valueAsNumber))}
                  />
                  <span class="muted">of {line.need}{#if stock[line.item]}&nbsp;· {stock[line.item]} on hand{/if}</span>
                </td>
                <td class="mono">{line.missing === 0 ? '–' : line.missing}</td>
              </tr>
              {#if line.missing > 0}
                {@const itemPlaces = places[line.item] ?? []}
                <tr class="where-row">
                  <td></td>
                  <td colspan="3">
                    {#if itemPlaces.length === 0}
                      <p class="muted where">Not in any chest or bag yet.</p>
                    {:else}
                      <ul class="places" aria-label="Where to find {line.item}">
                        {#each itemPlaces.slice(0, PLACES_SHOWN) as place (placeKey(place))}
                          <li>{@render placeLink(place)}</li>
                        {/each}
                      </ul>
                      {#if itemPlaces.length > PLACES_SHOWN}
                        <details class="more">
                          <summary class="muted">{itemPlaces.length - PLACES_SHOWN} more</summary>
                          <ul class="places">
                            {#each itemPlaces.slice(PLACES_SHOWN) as place (placeKey(place))}
                              <li>{@render placeLink(place)}</li>
                            {/each}
                          </ul>
                        </details>
                      {/if}
                    {/if}
                  </td>
                </tr>
              {/if}
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
    max-width: var(--page-width);
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

  /* Inputs, lists and buttons share the Longhouse look and stay 44px tall for touch */
  input[type='number'],
  select,
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

  /* Owner list fits the longest player name */
  select {
    align-self: flex-start;
    min-width: 200px;
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

  /* Picked recipe's icon beside what it takes */
  .preview {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    margin-top: 14px;
  }

  /* Text beside the picked recipe's icon starts level with it */
  .preview p {
    margin: 0;
  }

  /* Text beside the icon takes the rest of the row */
  .preview > div {
    flex: 1;
  }

  /* Icon lists of items flow in columns */
  .items {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 8px 16px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
  }

  /* One item: icon, count and name in a row */
  .items li,
  .item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Count before each item name */
  .amount {
    min-width: 28px;
    font-family: var(--font-heading);
    color: var(--ember);
  }

  /* Empty shopping list */
  .ready {
    color: var(--good);
  }

  /* Plan name, state pill, how many and remove in one row */
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

  /* How many field sits beside its label in the plan row */
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

  /* Places sit in their own row under the item, so they get the width of the row */
  .where-row td {
    padding-top: 0;
    border-top: 0;
  }

  /* Places that hold a missing item sit under its name, one per line */
  .places {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 6px 0 0;
    padding: 0 0 0 32px;
    list-style: none;
    font-size: 13px;
  }

  /* A place reads as count, where, and who built it */
  .places li {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 6px;
  }

  /* Chest links keep the text color and show they open the map */
  .places a {
    color: var(--text);
  }

  /* Missing item that nobody has stored or carried */
  .where {
    margin: 6px 0 0 32px;
    font-size: 13px;
  }

  /* The rest of the places fold away under a short toggle */
  .more summary {
    margin: 2px 0 0 32px;
    font-size: 13px;
    cursor: pointer;
  }

  /* Bigger checkbox for touch */
  input[type='checkbox'] {
    width: 22px;
    height: 22px;
    accent-color: var(--good);
  }
</style>
