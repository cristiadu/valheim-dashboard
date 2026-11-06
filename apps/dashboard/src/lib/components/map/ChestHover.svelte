<script lang="ts">
  import { builtByLabel, chestName, chestTitle, containerGrid, slotsUsed } from '#/lib/items';
  import type { ChestHoverSpot, MapChest } from '#/lib/models';

  /** The pointed chest, where its box sits over the map, and the most of each item one slot holds. */
  let { chest, spot, stacks }: { chest: MapChest; spot: ChestHoverSpot; stacks: Record<string, number> } = $props();

  /** Slots the chest's items fill. */
  const used = $derived(slotsUsed(chest.record.items, stacks));
</script>

<div
  class="chest-hover"
  style:left={spot.isLeftOfMark ? null : `${spot.left}px`}
  style:right={spot.isLeftOfMark ? `${spot.left}px` : null}
  style:top="{spot.top}px"
  role="tooltip"
>
  <strong>{chestTitle(chest.record)}</strong>
  {#if chest.record.label !== undefined}
    <span>{chestName(chest.record.chest)}</span>
  {/if}
  <span class="muted">{builtByLabel(chest.record.builder)}</span>
  <span>{used === 0 ? 'Empty' : `${used} of ${containerGrid(chest.record.chest, used).capacity} slots full`}</span>
  <span class="muted">Tap to look inside</span>
</div>

<style>
  /* Box beside a pointed chest with its name, who built it and how full it is */
  .chest-hover {
    position: absolute;
    z-index: 1;
    display: grid;
    gap: 2px;
    min-width: 170px;
    max-width: 200px;
    margin: 0 10px;
    overflow-wrap: anywhere;
    padding: 8px 12px;
    font-size: 13px;
    background: var(--panel);
    border: 1px solid var(--line);
    box-shadow: 0 4px 14px rgb(0 0 0 / 45%);
    transform: translateY(-50%);
    pointer-events: none;
  }
</style>
