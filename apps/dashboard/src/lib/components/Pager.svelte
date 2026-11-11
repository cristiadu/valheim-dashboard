<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  import { pageOf } from '#/lib/pages';

  /**
   * The whole list, how many to show at a time, and how to draw the things on one page.
   * Page one keeps showing new things as a live update adds them.
   */
  let { items, size, children }: { items: T[]; size: number; children: Snippet<[T[]]> } = $props();

  /** Page asked for, counted from 0. */
  let index = $state(0);

  /** Page shown. */
  const page = $derived(pageOf(items, index, size));

  /** The list and its buttons, so changing page can scroll back to its top. */
  let box = $state<HTMLElement>();

  /** Moves to page [to] and brings the top of the list back into sight when it scrolled away. */
  const goTo = (to: number): void => {
    index = to;
    if (box !== undefined && box.getBoundingClientRect().top < 0) {
      box.scrollIntoView({ block: 'start' });
    }
  };
</script>

<div class="paged" bind:this={box}>
  {@render children(page.items)}
  {#if page.count > 1}
    <nav aria-label="Pages">
      <button type="button" class="tap" disabled={page.index === 0} onclick={() => goTo(page.index - 1)}>Newer</button>
      <span class="mono muted">{page.first}–{page.last} of {items.length.toLocaleString()}</span>
      <button type="button" class="tap" disabled={page.index === page.count - 1} onclick={() => goTo(page.index + 1)}>Older</button>
    </nav>
  {/if}
</div>

<style>
  /* The page, with its buttons under it */
  .paged {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* Buttons on each side of where the page sits in the list */
  nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  /* No page that way */
  .tap:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
