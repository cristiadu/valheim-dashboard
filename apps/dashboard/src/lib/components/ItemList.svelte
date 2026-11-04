<script lang="ts">
  import ItemIcon from '#/lib/components/ItemIcon';
  import { itemSlots } from '#/lib/items';

  /** How many of each thing, by the prefab the plugin logs, and the icon size in pixels. */
  let { items, size = 20 }: { items: Record<string, number>; size?: number } = $props();

  /** One entry per thing, most first, with the name the game shows. */
  const slots = $derived(itemSlots(items));
</script>

<ul class="items">
  {#each slots as slot (slot.prefab)}
    <li><ItemIcon item={slot.name} {size} /><span class="amount">{slot.count.toLocaleString()}×</span>{slot.name}</li>
  {/each}
</ul>

<style>
  /* Things in rows of at most five, fewer when the space is narrow */
  .items {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(max(110px, calc((100% - 4 * 12px) / 5)), 1fr));
    gap: 6px 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Icon, count and name of one thing in a row */
  li {
    display: flex;
    align-items: center;
    gap: 5px;
    min-height: 24px;
  }

  /* Count before each name */
  .amount {
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
</style>

