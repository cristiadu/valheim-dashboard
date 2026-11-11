<script lang="ts">
  import { ITEM_ICON_PX } from '#/lib/models/items';
  import { iconUrl } from '#/lib/recipes';

  /** Item to show the icon of, and the icon size in pixels. */
  let { item, size = ITEM_ICON_PX }: { item: string; size?: number } = $props();

  /** Whether the icon failed to load, so a plain sack shows instead. */
  let isBroken = $state(false);
</script>

{#if !isBroken}
  <img src={iconUrl(item)} alt="" width={size} height={size} loading="lazy" onerror={() => (isBroken = true)} />
{:else}
  <svg class="fallback" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="M9 4h6l-1.5 3.5C17 9 19 12.5 19 16c0 3-2.5 4-7 4s-7-1-7-4c0-3.5 2-7 5.5-8.5Z" />
    <path class="tie" d="M9.5 7.5h5" />
  </svg>
{/if}

<style>
  /* Icon keeps its shape and lines up with the text beside it */
  img {
    flex: none;
    object-fit: contain;
    vertical-align: middle;
  }

  /* A plain sack when the wiki has no icon for an item, so no slot is left blank */
  .fallback {
    flex: none;
    vertical-align: middle;
    fill: #5a4a35;
    stroke: var(--muted);
    stroke-width: 1.2;
    stroke-linejoin: round;
  }

  /* Cord tied around the sack's neck */
  .fallback .tie {
    fill: none;
    stroke-linecap: round;
  }
</style>

