<script lang="ts">
  import ItemIcon from '#/lib/components/ItemIcon';
  import { containerGrid, itemSlots } from '#/lib/items';
  import { CHEST_LIST_ICON_PX, CHEST_SLOT_ICON_PX } from '#/lib/models';

  /** Prefab of the chest, cart or ship, which picks its slot grid, and how many of each item it holds. */
  let { chest, items }: { chest: string; items: Record<string, number> } = $props();

  /** One slot per item, most first. */
  const slots = $derived(itemSlots(items));

  /** The game's slot grid for this chest, grown when the items need more slots. */
  const grid = $derived(containerGrid(chest, slots.length));

  /** Empty slots that fill the rest of the grid, as the game shows them. */
  const emptySlots = $derived(Array.from({ length: grid.slots - slots.length }, (_, index) => index));

  /** All the items in the chest, added up. */
  const total = $derived(slots.reduce((sum, slot) => sum + slot.count, 0));

  /** The biggest pile, so each list row's bar shows its pile next to it. */
  const biggest = $derived(slots[0]?.count ?? 1);
</script>

{#if slots.length === 0}
  <p class="muted">Nothing inside.</p>
{:else}
  <p class="facts">
    <span><strong>{total.toLocaleString()}</strong> {total === 1 ? 'item' : 'items'}</span>
    <span><strong>{slots.length}</strong> {slots.length === 1 ? 'kind' : 'kinds'}</span>
    <span><strong>{slots.length}</strong> of {grid.slots} slots used</span>
  </p>
  <div class="contents">
    <ul class="slots" style:--columns={grid.columns} aria-label="Slots as the game shows them">
      {#each slots as slot (slot.prefab)}
        <li class="slot" title="{slot.count.toLocaleString()} {slot.name}">
          <ItemIcon item={slot.name} size={CHEST_SLOT_ICON_PX} />
          <span class="count">{slot.count.toLocaleString()}</span>
        </li>
      {/each}
      {#each emptySlots as index (index)}
        <li class="slot empty" aria-hidden="true"></li>
      {/each}
    </ul>
    <ol class="list" aria-label="What is inside, most first">
      {#each slots as slot (slot.prefab)}
        <li style:--share="{(slot.count / biggest) * 100}%">
          <ItemIcon item={slot.name} size={CHEST_LIST_ICON_PX} />
          <span class="name">{slot.name}</span>
          <span class="amount">{slot.count.toLocaleString()}</span>
        </li>
      {/each}
    </ol>
  </div>
{/if}

<style>
  /* Totals in one wrapping row above the slots */
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 18px;
    margin: 0 0 12px;
    color: var(--muted);
  }

  /* Numbers in the totals stand out */
  .facts strong {
    font-family: var(--font-heading);
    font-weight: 500;
    color: var(--gold);
  }

  /* The game's grid on the left and the readable list on the right, stacked on a phone */
  .contents {
    display: grid;
    grid-template-columns: auto minmax(220px, 1fr);
    align-items: start;
    gap: 20px;
  }

  /* On a phone the list goes under the slots */
  @media (max-width: 720px) {
    .contents {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  /* Slots in the game's grid for this chest, on a dark wood backing like the game's chest window */
  .slots {
    display: grid;
    grid-template-columns: repeat(var(--columns), 60px);
    gap: 4px;
    margin: 0;
    padding: 8px;
    list-style: none;
    background: #120f0b;
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  /* On a phone the slots shrink so the game's grid still fits the width */
  @media (max-width: 720px) {
    .slots {
      grid-template-columns: repeat(var(--columns), minmax(0, 60px));
    }
  }

  /* One slot: a square with the item's picture in the middle */
  .slot {
    position: relative;
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    background: radial-gradient(circle, #3a3124 0%, #251f17 75%);
    border: 1px solid #4a3f2e;
    border-radius: 3px;
  }

  /* An empty slot is darker and plain, so filled slots stand out */
  .slot.empty {
    background: #1b1712;
    border-color: var(--line-soft);
  }

  /* Count in the bottom right corner of the slot, white with a dark edge as in the game */
  .count {
    position: absolute;
    right: 3px;
    bottom: 1px;
    font-family: var(--font-heading);
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    text-shadow:
      0 0 2px #000,
      0 0 2px #000;
  }

  /* Every item with its name and count, most first */
  .list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* One item: icon, name and count, with a faint bar behind that shows its pile next to the biggest one */
  .list li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 5px 8px;
    border-top: 1px solid var(--line-soft);
    background: linear-gradient(to right, rgb(216 178 76 / 12%) var(--share), transparent var(--share));
  }

  /* Long item names stay on one line */
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Count in the heading font and accent color */
  .amount {
    font-family: var(--font-heading);
    color: var(--ember);
  }
</style>
