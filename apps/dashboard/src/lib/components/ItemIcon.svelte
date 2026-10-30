<script lang="ts">
  import { ITEM_ICON_PX } from '#lib/models.ts';
  import { iconUrl } from '#lib/recipes.ts';

  /** Item to show the icon of, and the icon size in pixels. */
  let { item, size = ITEM_ICON_PX }: { item: string; size?: number } = $props();

  /** Whether the icon failed to load, so the name shows alone. */
  let isBroken = $state(false);
</script>

{#if !isBroken}
  <img src={iconUrl(item)} alt="" width={size} height={size} loading="lazy" onerror={() => (isBroken = true)} />
{/if}

<style>
  /* Icon keeps its shape and lines up with the text beside it */
  img {
    flex: none;
    object-fit: contain;
    vertical-align: middle;
  }
</style>
