<script lang="ts">
  import ItemIcon from '#/lib/components/ItemIcon';
  import { itemName } from '#/lib/gear';

  /** Item counts by the prefab the plugin logs, to show with their icons and game names, and the icon size in pixels. */
  let { items, size = 20 }: { items: Record<string, number>; size?: number } = $props();
</script>

<ul class="items">
  {#each Object.entries(items) as [item, count] (item)}
    {@const name = itemName(item)}
    <li><ItemIcon item={name} {size} /><span class="amount">{count.toLocaleString()}×</span>{name}</li>
  {/each}
</ul>

<style>
  /* Items in a row that wraps */
  .items {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* One item: icon, amount, then name */
  li {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 24px;
  }

  /* Amount in quiet, even-width digits */
  .amount {
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
</style>
