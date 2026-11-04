<script lang="ts">
  import ItemSlot from '#/lib/components/ItemSlot';
  import { itemName } from '#/lib/gear';
  import { containerGrid, containerName } from '#/lib/map';
  import { CHEST_ICON_PX, type ChestRecord } from '#/lib/models';
  import { whenLabel } from '#/lib/status';

  /** Chest to show, the page clock in milliseconds, and the viewer's time zone. */
  let { chest, nowMs, timeZone }: { chest: ChestRecord; nowMs: number; timeZone: string } = $props();

  /** Items with the most first, as the game would stack them in a tidy chest. */
  const items = $derived(Object.entries(chest.items).toSorted(([, first], [, second]) => second - first));

  /** The chest's slots: how many per row, and in all. */
  const grid = $derived(containerGrid(chest.chest, items.length));
</script>

<article class="chest" aria-label={containerName(chest.chest)}>
  <header>
    <strong>{containerName(chest.chest)}</strong>
    <span class="muted">{chest.builder === null ? 'Found in the world' : `Built by ${chest.builder}`} · looked at {whenLabel(chest.timeUtc, timeZone, nowMs)}</span>
  </header>
  <ul class="slots" style:--columns={grid.columns}>
    {#each items as [prefab, count] (prefab)}
      <li><ItemSlot name={itemName(prefab)} size={CHEST_ICON_PX} badge={count.toLocaleString()} label="{itemName(prefab)} ×{count.toLocaleString()}" /></li>
    {/each}
    {#each { length: grid.slots - items.length }, index (index)}
      <li><ItemSlot name={null} label="Empty slot" /></li>
    {/each}
  </ul>
</article>

<style>
  /* A chest window: name on top, its grid of slots below */
  .chest {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--line);
    background: var(--panel);
  }

  /* Chest name above who built it and when it was last looked at */
  header {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 14px;
  }

  /* Slots in the chest's own number of columns, shrinking to fit a phone */
  .slots {
    display: grid;
    grid-template-columns: repeat(var(--columns), minmax(0, 48px));
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
    --slot-size: 100%;
  }
</style>
