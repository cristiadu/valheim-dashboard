<script lang="ts">
  import ItemIcon from '#/lib/components/ItemIcon';
  import { GEAR_ICON_PX } from '#/lib/models';

  /**
   * Item in the slot as the game names it, or null for an empty slot, its icon size in pixels, a number for the
   * corner such as a stack count or an upgrade level, what the slot says on hover and to screen readers, and a word
   * to print in an empty slot.
   */
  let {
    name,
    size = GEAR_ICON_PX,
    badge = null,
    label,
    emptyText = '',
  }: { name: string | null; size?: number; badge?: string | null; label: string; emptyText?: string } = $props();
</script>

{#if name === null}
  <span class="slot empty" role="img" aria-label={label} title={label}>
    {#if emptyText}<span class="slot-name" aria-hidden="true">{emptyText}</span>{/if}
  </span>
{:else}
  <span class="slot" role="img" aria-label={label} title={label}>
    <ItemIcon item={name} {size}>
      {#snippet fallback()}<span class="initials" aria-hidden="true">{name.slice(0, 2)}</span>{/snippet}
    </ItemIcon>
    {#if badge !== null}<span class="badge" aria-hidden="true">{badge}</span>{/if}
  </span>
{/if}

<style>
  /* One square slot with a hairline frame, like an inventory cell. A parent can set its size with --slot-size */
  .slot {
    position: relative;
    display: grid;
    place-items: center;
    width: var(--slot-size, 56px);
    aspect-ratio: 1;
    box-sizing: border-box;
    border: 1px solid var(--line);
    background: var(--background);
  }

  /* Empty slot is dashed and quiet, so filled slots stand out */
  .slot.empty {
    border-style: dashed;
    border-color: var(--line-soft);
  }

  /* Word in an empty slot, such as the gear slot's name */
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

  /* Stack count or upgrade level in the corner, as the game shows it */
  .badge {
    position: absolute;
    right: 3px;
    bottom: 1px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--gold);
    text-shadow: 0 0 2px var(--background);
  }
</style>
