<script lang="ts">
  import ItemIcon from '#/lib/components/ItemIcon';
  import LogLines from '#/lib/components/LogLines';
  import { gearLabel, gearSheet } from '#/lib/gear';
  import { GEAR_ICON_PX, GEAR_SLOT_NAMES, GEAR_SLOTS, type GearPiece } from '#/lib/models/gear';
  import type { SourceLines } from '#/lib/models/snapshot';

  /**
   * Gear a character was seen with, newest first, as the snapshot keeps it, what they wear now once the plugin logged
   * it, and the log lines behind a piece by its prefab.
   */
  let { gear, worn, sourceOf }: { gear: string[]; worn: string[] | null; sourceOf: (prefab: string) => SourceLines } = $props();

  /** Gear laid out in slots, plus what else is held. */
  const sheet = $derived(gearSheet(gear, worn));

  /** What an empty slot says: nothing is worn there, or nothing was seen there yet before the plugin logged it. */
  const emptyText = $derived(worn === null ? 'nothing seen yet' : 'nothing worn');
</script>

{#snippet pieceSlot(piece: GearPiece, label: string)}
  <LogLines title={gearLabel(piece)} source={sourceOf(piece.prefab)}>
    <span class="slot" role="img" aria-label={label} title={label}>
      <ItemIcon item={piece.name} size={GEAR_ICON_PX} />
      {#if piece.quality > 1}<span class="level" aria-hidden="true">{piece.quality}</span>{/if}
    </span>
  </LogLines>
{/snippet}

<div class="sheet">
  <ul class="doll" aria-label="Gear worn">
    {#each GEAR_SLOTS as slot (slot)}
      {@const piece = sheet.worn[slot]}
      {@const label = `${GEAR_SLOT_NAMES[slot]}: ${piece ? gearLabel(piece) : emptyText}`}
      <li style:grid-area={slot}>
        {#if piece}
          {@render pieceSlot(piece, label)}
        {:else}
          <span class="slot empty" role="img" aria-label={label} title={label}><span class="slot-name" aria-hidden="true">{GEAR_SLOT_NAMES[slot]}</span></span>
        {/if}
      </li>
    {/each}
  </ul>
  {#if sheet.held.length > 0}
    <div>
      <p class="muted held-title">Also in hand</p>
      <ul class="held">
        {#each sheet.held as piece (piece.prefab)}
          <li>{@render pieceSlot(piece, gearLabel(piece))}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  /* Worn gear on top, other held gear below */
  .sheet {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Slots placed like a character: head on top, hands at the sides, legs below */
  .doll {
    display: grid;
    grid-template-areas:
      '. head .'
      'weapon chest shield'
      'cape legs utility';
    grid-template-columns: repeat(3, 56px);
    gap: 6px;
    justify-content: center;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* One square slot with a hairline frame, like an inventory cell */
  .slot {
    position: relative;
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    box-sizing: border-box;
    border: 1px solid var(--line);
    background: var(--background);
  }

  /* Empty slot is dashed and quiet, so worn gear stands out */
  .slot.empty {
    border-style: dashed;
    border-color: var(--line-soft);
  }

  /* Slot name in an empty slot */
  .slot-name {
    font-size: 10px;
    letter-spacing: 0.06em;
    color: var(--muted);
    text-transform: uppercase;
  }

  /* Upgrade level in the corner, like an item stack count */
  .level {
    position: absolute;
    right: 3px;
    bottom: 1px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--gold);
  }

  /* Label above the held row */
  .held-title {
    margin: 0 0 6px;
    font-size: 12px;
  }

  /* Held gear in a row that wraps */
  .held {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
