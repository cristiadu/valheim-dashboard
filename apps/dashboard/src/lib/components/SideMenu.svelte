<script lang="ts">
  import { TABS, type Tab } from '#/lib/models';

  /** Tab shown now. */
  let { current }: { current: Tab } = $props();
</script>

<nav aria-label="Dashboard sections">
  {#each TABS as tab (tab.path)}
    <a href={tab.path} aria-current={tab.path === current.path ? 'page' : undefined}>
      <span class="rune" aria-hidden="true">{tab.rune}</span>
      <span class="text">
        <span class="label">{tab.label}</span>
        <span class="hint">{tab.hint}</span>
      </span>
    </a>
  {/each}
</nav>

<style>
  /* Column of menu items; it wraps into rows when the page puts it on top */
  nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* One menu item: rune, label and hint, at least 48px tall for touch */
  a {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 48px;
    padding: 8px 14px;
    border: 1px solid transparent;
    color: var(--text);
    text-decoration: none;
  }

  /* The selected item gets a raised background and a border */
  a[aria-current='page'] {
    background: var(--selected);
    border-color: var(--line);
  }

  /* Rune icon, muted until its tab is selected */
  .rune {
    width: 22px;
    font-family: var(--font-rune);
    font-size: 20px;
    color: var(--muted);
  }

  /* Selected tab's rune uses the main accent */
  a[aria-current='page'] .rune {
    color: var(--ember);
  }

  /* Label above hint */
  .text {
    display: flex;
    flex-direction: column;
  }

  /* Tab name in the heading font */
  .label {
    font-family: var(--font-heading);
    font-size: 15px;
    letter-spacing: 0.08em;
  }

  /* Short description under the tab name */
  .hint {
    font-size: 12px;
    color: var(--muted);
  }

  /* On phones the menu becomes a wrapping row above the page */
  @media (max-width: 720px) {
    nav {
      flex-direction: row;
      flex-wrap: wrap;
    }
  }
</style>
