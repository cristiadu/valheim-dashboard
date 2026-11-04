<script lang="ts">
  import ItemIcon from '#/lib/components/ItemIcon';
  import { containerGrid, stackSlots } from '#/lib/items';
  import { CHEST_SLOT_ICON_PX } from '#/lib/models';

  /**
   * Prefab of the chest, cart, ship or player, which picks its slot grid, how many of each item it holds, the most of
   * each item one slot holds, and the prefabs worn now, which are marked as in the game.
   */
  let {
    chest,
    items,
    stacks,
    equipped = [],
  }: { chest: string; items: Record<string, number>; stacks: Record<string, number>; equipped?: string[] } = $props();

  /** One slot per stack, most first. */
  const slots = $derived(stackSlots(items, stacks));

  /** The game's slot grid for this chest, grown when the items need more slots. */
  const grid = $derived(containerGrid(chest, slots.length));

  /** Empty slots that fill the rest of the grid, as the game shows them. */
  const emptySlots = $derived(Array.from({ length: grid.slots - slots.length }, (_, index) => index));

  /** All the items in the chest, added up. */
  const total = $derived(slots.reduce((sum, slot) => sum + slot.count, 0));
</script>

{#if slots.length === 0}
  <p class="muted">Nothing inside.</p>
{:else}
  <p class="facts">
    <span><strong>{total.toLocaleString()}</strong> {total === 1 ? 'item' : 'items'}</span>
    <span><strong>{slots.length}</strong> of {grid.capacity} slots used</span>
  </p>
  {#if slots.length > grid.capacity}
    <p class="muted over">More than fits in {grid.capacity} slots, so some of it was probably used up crafting or building.</p>
  {/if}
  <ul class="slots" style:--columns={grid.columns} aria-label="What is inside, most first">
    {#each slots as slot, index (index)}
      {@const isEquipped = equipped.includes(slot.prefab)}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <li class="slot" class:equipped={isEquipped} tabindex="0" aria-label="{slot.count.toLocaleString()} {slot.name}{isEquipped ? ', worn' : ''}">
        <ItemIcon item={slot.name} size={CHEST_SLOT_ICON_PX} />
        <span class="count" aria-hidden="true">{slot.count.toLocaleString()}</span>
        <span class="tip" aria-hidden="true">{slot.name} <strong>{slot.count.toLocaleString()}</strong></span>
      </li>
    {/each}
    {#each emptySlots as index (index)}
      <li class="slot empty" aria-hidden="true"></li>
    {/each}
  </ul>
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

  /* Slots in the game's grid for this chest, on a dark wood backing like the game's chest window */
  .slots {
    display: grid;
    grid-template-columns: repeat(var(--columns), 60px);
    gap: 4px;
    width: fit-content;
    max-width: 100%;
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

    /* Icons shrink with their slot instead of spilling over its edge */
    .slot :global(img),
    .slot :global(svg) {
      width: 75%;
      height: auto;
    }

    /* A smaller count, so it fits a small slot */
    .count {
      font-size: 10px;
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

  /* A worn piece gets a blue slot, as the game marks it */
  .slot.equipped {
    background: radial-gradient(circle, #2c4a63 0%, #1c2f40 75%);
    border-color: #4f7ea3;
  }

  /* Why the bag shows more slots than it has, under the totals */
  .over {
    margin: -6px 0 12px;
    font-size: 12px;
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

  /* Pointing at or tapping a slot lights its edge */
  .slot:hover,
  .slot:focus-visible {
    border-color: var(--gold);
    outline: none;
  }

  /* Item name and count in a small box above the slot, shown only while pointed at or tapped */
  .tip {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    z-index: 1;
    display: none;
    padding: 4px 8px;
    white-space: nowrap;
    background: var(--panel);
    border: 1px solid var(--gold);
    border-radius: 3px;
    transform: translateX(-50%);
    pointer-events: none;
  }

  /* The box appears on hover or focus */
  .slot:hover .tip,
  .slot:focus .tip {
    display: block;
  }

  /* Count in the box stands out */
  .tip strong {
    margin-left: 6px;
    font-family: var(--font-heading);
    color: var(--ember);
  }
</style>
