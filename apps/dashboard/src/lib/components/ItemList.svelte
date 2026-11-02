<script lang="ts">
  import ItemIcon from '#/lib/components/ItemIcon';

  /** Item counts to show with their icons. */
  let { items, size = 20 }: { items: Record<string, number>; size?: number } = $props();
</script>

<ul class="items">
  {#each Object.entries(items) as [item, count] (item)}
    <li><ItemIcon {item} {size} /><span class="amount">{count.toLocaleString()}×</span>{item}</li>
  {/each}
</ul>

<style>
  .items {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 24px;
  }

  .amount {
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
</style>

