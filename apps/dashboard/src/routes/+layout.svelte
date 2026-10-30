<script lang="ts">
  import '../app.css';

  import { onMount, type Snippet } from 'svelte';

  import { page } from '$app/state';
  import Header from '#lib/components/Header.svelte';
  import SideMenu from '#lib/components/SideMenu.svelte';
  import { connectLive, live, provideSnapshot } from '#lib/live.svelte.ts';
  import type { Snapshot } from '#lib/models.ts';
  import { isServerOnline, statusLine } from '#lib/status.ts';
  import { tabFor } from '#lib/tabs.ts';

  /** Snapshot from the server render, and the page for the current tab. */
  let { data, children }: { data: { snapshot: Snapshot }; children: Snippet } = $props();

  /** Latest snapshot: live once the stream connects, the server render's until then. */
  const snapshot = $derived(live.snapshot ?? data.snapshot);

  /** Header line, made in the browser only, because it depends on the viewer's clock and time zone. */
  const status = $derived(
    live.nowMs === null
      ? null
      : {
          text: statusLine(snapshot, live.nowMs, -new Date(live.nowMs).getTimezoneOffset()),
          isOnline: isServerOnline(snapshot, live.nowMs),
        },
  );

  provideSnapshot(() => snapshot);
  onMount(connectLive);

  /** Tab that matches the current address. */
  const current = $derived(tabFor(page.url.pathname));
</script>

<svelte:head>
  <title>{current.label} · Valheim Dashboard</title>
</svelte:head>

<Header {status} />
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
