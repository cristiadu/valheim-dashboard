<script lang="ts">
  import ItemIcon from '#/lib/components/ItemIcon';
  import { GEAR_ICON_PX, GEAR_SLOT_NAMES, GEAR_SLOTS, type GearPiece } from '#/lib/models';
  import { gearLabel, gearSheet } from '#/lib/gear';

  /** Gear a character was seen with, newest first, as the snapshot keeps it. */
  let { gear }: { gear: string[] } = $props();

  /** Gear laid out in slots, plus what is carried. */
  const sheet = $derived(gearSheet(gear));
</script>

{#snippet pieceIcon(piece: GearPiece)}
  <ItemIcon item={piece.name} size={GEAR_ICON_PX}>
    {#snippet fallback()}<span class="initials" aria-hidden="true">{piece.name.slice(0, 2)}</span>{/snippet}
  </ItemIcon>
  {#if piece.quality > 1}<span class="level" aria-hidden="true">{piece.quality}</span>{/if}
{/snippet}

<div class="sheet">
  <ul class="doll" aria-label="Gear worn">
    {#each GEAR_SLOTS as slot (slot)}
      {@const piece = sheet.worn[slot]}
      {@const label = `${GEAR_SLOT_NAMES[slot]}: ${piece ? gearLabel(piece) : 'nothing seen yet'}`}
      <li class="slot" class:empty={piece === undefined} style:grid-area={slot} role="img" aria-label={label} title={label}>
        {#if piece}
          {@render pieceIcon(piece)}
        {:else}
          <span class="slot-name" aria-hidden="true">{GEAR_SLOT_NAMES[slot]}</span>
        {/if}
      </li>
    {/each}
  </ul>
  {#if sheet.carried.length > 0}
    <div>
      <p class="muted carried-title">Also carries</p>
      <ul class="carried">
        {#each sheet.carried as piece (piece.prefab)}
          <li class="slot" role="img" aria-label={gearLabel(piece)} title={gearLabel(piece)}>{@render pieceIcon(piece)}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  /* Worn gear on top, carried gear below */
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

  /* First letters of an item when the wiki has no icon for it */
  .initials {
    font-family: var(--font-heading);
    font-size: 16px;
    color: var(--muted);
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

  /* Label above the carried row */
  .carried-title {
    margin: 0 0 6px;
    font-size: 12px;
  }

  /* Carried gear in a row that wraps */
  .carried {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
