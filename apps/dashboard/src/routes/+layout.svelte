<script lang="ts">
  import '#/app.css';

  import { onMount, type Snippet } from 'svelte';

  import { page } from '$app/state';
  import Header from '#/lib/components/Header';
  import SideMenu from '#/lib/components/SideMenu';
  import { connectLive, live, provideSnapshot } from '#/lib/live.svelte';
  import { PASSWORD_PATH, type Snapshot } from '#/lib/models';
  import { serverPill } from '#/lib/pills';
  import { isServerOnline, statusLine, viewerOffsetMinutes } from '#/lib/status';
  import { tabFor } from '#/lib/tabs';

  /** Snapshot from the server render, and the page for the current tab. */
  let { data, children }: { data: { snapshot: Snapshot }; children: Snippet } = $props();

  /** Latest snapshot: live once the stream connects, the server render's until then. */
  const snapshot = $derived(live.snapshot ?? data.snapshot);

  /** Header pill and line, made in the browser only, because they depend on the viewer's clock and time zone. */
  const status = $derived(
    live.nowMs === null
      ? null
      : {
          text: statusLine(snapshot, live.nowMs, viewerOffsetMinutes(live.nowMs)),
          pill: snapshot.lastLineUtc === null ? null : serverPill(isServerOnline(snapshot, live.nowMs)),
        },
  );

  /** True on the password page, which shows no tabs and no live data. */
  const isPasswordPage = $derived(page.url.pathname === PASSWORD_PATH);

  provideSnapshot(() => snapshot);
  onMount(() => (isPasswordPage ? undefined : connectLive()));

  /** Tab that matches the current address. */
  const current = $derived(tabFor(page.url.pathname));
</script>

<svelte:head>
  <title>{isPasswordPage ? 'Password' : current.label} · Valheim Dashboard</title>
</svelte:head>

<Header {status} />
{#if isPasswordPage}
  {@render children()}
{:else}
  <div class="frame">
    <aside><SideMenu {current} /></aside>
    <main>
      <h1>{current.label}</h1>
      {@render children()}
    </main>
  </div>
{/if}

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

  /* On phones the menu sits on top, so the page gets a top rule instead */
  @media (max-width: 720px) {
    main {
      border-left: 0;
      border-top: 1px solid var(--line);
    }
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
