<script lang="ts">
  import type { Snippet } from 'svelte';

  import { ITEM_ICON_PX } from '#/lib/models';
  import { iconUrl } from '#/lib/recipes';

  /** Item to show the icon of, the icon size in pixels, and what to show instead when there is no icon. */
  let { item, size = ITEM_ICON_PX, fallback }: { item: string; size?: number; fallback?: Snippet } = $props();

  /** Whether the icon failed to load, so the fallback or the name beside it shows alone. */
  let isBroken = $state(false);
</script>

{#if !isBroken}
  <img src={iconUrl(item)} alt="" width={size} height={size} loading="lazy" onerror={() => (isBroken = true)} />
{:else}
  {@render fallback?.()}
{/if}

<style>
  /* Icon keeps its shape and lines up with the text beside it */
  img {
    flex: none;
    object-fit: contain;
    vertical-align: middle;
  }
</style>
