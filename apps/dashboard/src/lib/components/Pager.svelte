<script lang="ts" generics="T">
  import type { Page } from '#/lib/models/pages';

  /**
   * The page shown, how many things the whole list has, the list the pager moves through, what to do with a new
   * page number, and the words on its buttons.
   */
  let {
    page,
    total,
    list,
    onpage,
    backText = 'Newer',
    nextText = 'Older',
  }: { page: Page<T>; total: number; list?: HTMLElement; onpage: (index: number) => void; backText?: string; nextText?: string } = $props();

  /** Moves to page [to] and brings the top of the list back into sight when it scrolled away. */
  const goTo = (to: number): void => {
    onpage(to);
    if (list !== undefined && list.getBoundingClientRect().top < 0) {
      list.scrollIntoView({ block: 'start' });
    }
  };
</script>

{#if page.count > 1}
  <nav class="pager" aria-label="Pages">
    <button type="button" disabled={page.index === 0} onclick={() => goTo(page.index - 1)}>{backText}</button>
    <span class="mono muted">{page.first}–{page.last} of {total.toLocaleString()}</span>
    <button type="button" disabled={page.index === page.count - 1} onclick={() => goTo(page.index + 1)}>{nextText}</button>
  </nav>
{/if}

<style>
  /* Buttons on each side of where the page sits in the list */
  .pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  /* One button, at least 44px tall for touch, like the Saga filters */
  button {
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  /* No page that way */
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
