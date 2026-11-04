<script lang="ts">
  import ItemIcon from '#/lib/components/ItemIcon';
  import { containerGrid, itemSlots } from '#/lib/items';
  import { CHEST_SLOT_ICON_PX } from '#/lib/models';

  /** Prefab of the chest, cart or ship, which picks its slot grid, and how many of each item it holds. */
  let { chest, items }: { chest: string; items: Record<string, number> } = $props();

  /** One slot per item, most first. */
  const slots = $derived(itemSlots(items));

  /** The game's slot grid for this chest, grown when the items need more slots. */
  const grid = $derived(containerGrid(chest, slots.length));

  /** Empty slots that fill the rest of the grid, as the game shows them. */
  const emptySlots = $derived(Array.from({ length: grid.slots - slots.length }, (_, index) => index));
</script>

{#if slots.length === 0}
  <p class="muted">Empty</p>
{:else}
  <ul class="slots" style:--columns={grid.columns}>
    {#each slots as slot (slot.prefab)}
      <li class="slot" title="{slot.count.toLocaleString()} {slot.name}">
        <span class="picture">
          <ItemIcon item={slot.name} size={CHEST_SLOT_ICON_PX} />
          <span class="count">{slot.count.toLocaleString()}</span>
        </span>
        <span class="name">{slot.name}</span>
      </li>
    {/each}
    {#each emptySlots as index (index)}
      <li class="slot empty" aria-hidden="true"></li>
    {/each}
  </ul>
{/if}

<style>
  /* Slots in the game's grid for this chest, one item per slot */
  .slots {
    display: grid;
    grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
    gap: 8px;
    max-width: calc(var(--columns) * 112px);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* On a phone the game's grid does not fit, so slots flow as many per row as fit and empty ones hide */
  @media (max-width: 720px) {
    .slots {
      grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
      max-width: none;
    }

    .slot.empty {
      display: none;
    }
  }

  /* An empty slot is dashed and quiet, so filled slots stand out */
  .slot.empty {
    min-height: 100px;
    border-style: dashed;
    border-color: var(--line-soft);
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
