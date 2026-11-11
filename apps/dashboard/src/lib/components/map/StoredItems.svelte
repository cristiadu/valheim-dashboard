<script lang="ts">
  import ItemIcon from '#/lib/components/ItemIcon';
  import Pager from '#/lib/components/Pager';
  import { builtByShortLabel, chestName, chestTitle, stockOf } from '#/lib/items';
  import type { MapChest } from '#/lib/models/map';
  import { PANEL_PAGE_SIZE } from '#/lib/models/pages';
  import { count } from '#/lib/text';

  /** Chests on the map, and what to do when one is tapped. */
  let { chests, onpick }: { chests: MapChest[]; onpick: (id: string) => void } = $props();

  /** Text that narrows the stored items by item or chest name. */
  let query = $state('');

  /** Every stored item across the chests. */
  const stock = $derived(stockOf(chests));

  /** Stored items whose name or chest name has the search text. */
  const visibleStock = $derived.by(() => {
    const text = query.trim().toLowerCase();
    return stock.filter((row) =>
      [row.name, ...row.chests.flatMap(({ chest }) => [chestName(chest.record.chest), chestTitle(chest.record)])].some((name) => name.toLowerCase().includes(text)),
    );
  });
</script>

<section class="panel" aria-labelledby="stock-title">
  <h2 id="stock-title" class="panel-title">EVERYTHING STORED</h2>
  <p class="muted">Each item across all the chests above. Tap one to see which chests hold it.</p>
  <label class="stock-search">
    <span class="muted">Find an item or chest</span>
    <input bind:value={query} type="search" placeholder="Wood, cart…" />
  </label>
  {#key query}
    <Pager items={visibleStock} size={PANEL_PAGE_SIZE} backText="Previous" nextText="Next">
      {#snippet children(items)}
        <div>
          {#each items as row (row.prefab)}
            <details class="stock-row">
              <summary>
                <span class="stock-item"><ItemIcon item={row.name} size={24} />{row.name}</span>
                <span class="amount">{row.count.toLocaleString()}</span>
                <span class="muted">in {count(row.chests.length, 'chest', 'chests')}</span>
              </summary>
              <ul>
                {#each row.chests as { chest, count: amount } (chest.id)}
                  <li>
                    <button type="button" class="link" onclick={() => onpick(chest.id)}>
                      <span class="amount">{amount.toLocaleString()}</span>
                      {chestTitle(chest.record)}
                      <span class="muted">{builtByShortLabel(chest.record.builder)}</span>
                    </button>
                  </li>
                {/each}
              </ul>
            </details>
          {:else}
            <p class="muted">{stock.length === 0 ? 'Nothing stored in the chests found so far.' : 'No item or chest has that name.'}</p>
          {/each}
        </div>
      {/snippet}
    </Pager>
  {/key}
</section>

<style>
  /* Text under the panel title */
  p {
    margin: 0 0 10px;
  }

  /* Search box above the stored items */
  .stock-search {
    display: grid;
    gap: 6px;
    max-width: 420px;
    margin: 4px 0 8px;
  }

  /* Search field in the Longhouse look, tall enough for touch */
  .stock-search input {
    min-height: 44px;
    padding: 0 12px;
    color: inherit;
    font: inherit;
    background: var(--background);
    border: 1px solid var(--line);
  }

  /* One stored item with a hairline above */
  .stock-row {
    padding: 8px 0;
    border-top: 1px solid var(--line-soft);
  }

  /* Item, total and number of chests in one row */
  .stock-row summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(90px, auto);
    align-items: center;
    gap: 12px;
    cursor: pointer;
  }

  /* Icon beside the item name */
  .stock-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  /* Counts in the heading font and accent color */
  .amount {
    min-width: 28px;
    font-family: var(--font-heading);
    color: var(--ember);
  }

  /* Chests that hold the item, under it */
  .stock-row ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 8px 0 0;
    padding: 0 0 0 32px;
    list-style: none;
  }

  /* A chest that holds the item, tappable to open it, in the Longhouse look */
  .link {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
    min-height: 32px;
    padding: 0;
    font: inherit;
    color: var(--text);
    background: none;
    border: 0;
    text-align: left;
    cursor: pointer;
  }
</style>
