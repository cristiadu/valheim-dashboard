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
  {#if fallback}
    {@render fallback()}
  {:else}
    <span class="fallback" style:--icon-size="{size}px" aria-hidden="true">{item.slice(0, 2).toUpperCase()}</span>
  {/if}
{/if}

<style>
  /* Icon keeps its shape and lines up with the text beside it */
  img {
    flex: none;
    object-fit: contain;
    vertical-align: middle;
  }

  /* First letters in a small frame when the item has no icon */
  .fallback {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: var(--icon-size, 28px);
    height: var(--icon-size, 28px);
    border: 1px solid var(--line);
    border-radius: 3px;
    color: var(--muted);
    font-size: 9px;
    line-height: 1;
  }
</style>
