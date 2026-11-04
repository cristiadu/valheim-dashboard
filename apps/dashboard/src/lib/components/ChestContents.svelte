<script lang="ts">
  import ItemIcon from '#/lib/components/ItemIcon';
  import { itemSlots } from '#/lib/items';
  import { CHEST_SLOT_ICON_PX } from '#/lib/models';

  /** How many of each item the chest holds, by the prefab the plugin logs. */
  let { items }: { items: Record<string, number> } = $props();

  /** One slot per item, most first. */
  const slots = $derived(itemSlots(items));
</script>

{#if slots.length === 0}
  <p class="muted">Empty</p>
{:else}
  <ul class="slots">
    {#each slots as slot (slot.prefab)}
      <li class="slot" title="{slot.count.toLocaleString()} {slot.name}">
        <span class="picture">
          <ItemIcon item={slot.name} size={CHEST_SLOT_ICON_PX} />
          <span class="count">{slot.count.toLocaleString()}</span>
        </span>
        <span class="name">{slot.name}</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  /* Slots in rows like a chest in the game, as many per row as fit */
  .slots {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* One slot: the item's picture on top and its name under it */
  .slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px 6px;
    background: var(--background);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  /* Picture box holds the icon with the count in its corner, as the game shows it */
  .picture {
    position: relative;
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
  }

  /* Count in the bottom right corner of the picture, readable over any icon */
  .count {
    position: absolute;
    right: -4px;
    bottom: -4px;
    padding: 0 4px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 3px;
    font-family: var(--font-heading);
    font-size: 13px;
    color: var(--gold);
  }

  /* Item name under the picture, kept to two lines */
  .name {
    display: -webkit-box;
    overflow: hidden;
    font-size: 12px;
    line-height: 1.25;
    text-align: center;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
</style>
