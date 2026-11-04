<script lang="ts">
  import ItemSlot from '#/lib/components/ItemSlot';
  import LogLines from '#/lib/components/LogLines';
  import { GEAR_SLOT_NAMES, GEAR_SLOTS, type GearPiece, type SourceLines } from '#/lib/models';
  import { gearLabel, gearSheet } from '#/lib/gear';

  /** Gear a character was seen with, newest first, as the snapshot keeps it, and the log lines behind a piece by its prefab. */
  let { gear, sourceOf }: { gear: string[]; sourceOf: (prefab: string) => SourceLines } = $props();

  /** Gear laid out in slots, plus what is carried. */
  const sheet = $derived(gearSheet(gear));
</script>

{#snippet pieceSlot(piece: GearPiece, label: string)}
  <LogLines title={gearLabel(piece)} source={sourceOf(piece.prefab)}>
    <ItemSlot name={piece.name} badge={piece.quality > 1 ? String(piece.quality) : null} {label} />
  </LogLines>
{/snippet}

<div class="sheet">
  <ul class="doll" aria-label="Gear worn">
    {#each GEAR_SLOTS as slot (slot)}
      {@const piece = sheet.worn[slot]}
      {@const label = `${GEAR_SLOT_NAMES[slot]}: ${piece ? gearLabel(piece) : 'nothing seen yet'}`}
      <li style:grid-area={slot}>
        {#if piece}
          {@render pieceSlot(piece, label)}
        {:else}
          <ItemSlot name={null} {label} emptyText={GEAR_SLOT_NAMES[slot]} />
        {/if}
      </li>
    {/each}
  </ul>
  {#if sheet.carried.length > 0}
    <div>
      <p class="muted carried-title">Also carries</p>
      <ul class="carried">
        {#each sheet.carried as piece (piece.prefab)}
          <li>{@render pieceSlot(piece, gearLabel(piece))}</li>
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
