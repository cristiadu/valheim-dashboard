<script lang="ts">
  import '../app.css';

  import type { Snippet } from 'svelte';

  import { page } from '$app/state';
  import Header from '#lib/components/Header.svelte';
  import SideMenu from '#lib/components/SideMenu.svelte';
  import { tabFor } from '#lib/tabs.ts';

  /** The page for the current tab. */
  let { children }: { children: Snippet } = $props();

  /** Tab that matches the current address. */
  const current = $derived(tabFor(page.url.pathname));
</script>

<svelte:head>
  <title>{current.label} · Valheim Dashboard</title>
</svelte:head>

<Header />
<div class="frame">
  <aside><SideMenu {current} /></aside>
  <main>
    <h1>{current.label}</h1>
    {@render children()}
  </main>
</div>

<style>
  /* Menu beside the page; wraps so the menu sits on top on phones */
  .frame {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  /* Side menu column */
  aside {
    flex: 1 1 220px;
    max-width: 100%;
    box-sizing: border-box;
    padding: 22px 16px;
  }

  /* Page area takes the rest of the width */
  main {
    flex: 999 1 560px;
    min-width: 0;
    box-sizing: border-box;
    min-height: calc(100vh - 90px);
    padding: 22px 28px 40px;
    border-left: 1px solid var(--line);
  }

  /* Page heading in the heading font */
  h1 {
    margin: 0 0 18px;
    font-family: var(--font-heading);
    font-size: 26px;
    font-weight: 500;
    letter-spacing: 0.06em;
  }
</style>
