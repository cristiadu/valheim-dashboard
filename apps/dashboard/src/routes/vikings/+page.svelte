<script lang="ts">
  import NoData from '#/lib/components/NoData';
  import TimeLanes from '#/lib/components/TimeLanes';
  import VikingCard from '#/lib/components/vikings/VikingCard';
  import { live, useSnapshot } from '#/lib/live.svelte';
  import { playersOf } from '#/lib/players';
  import { viewerTimeZone } from '#/lib/time';

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
  const snapshot = $derived(getSnapshot());

  /** Viewer's time zone from the browser. */
  const timeZone = viewerTimeZone();

  /** Players at the page clock. */
  const players = $derived(live.nowMs === null ? [] : playersOf(snapshot, live.nowMs));
</script>

{#if snapshot.sessions.length === 0}
  <NoData />
{:else if live.nowMs !== null}
  <div class="vikings">
    <section class="panel" aria-labelledby="lanes-title">
      <h2 id="lanes-title" class="panel-title">ONLINE IN THE LAST 24 HOURS</h2>
      <TimeLanes {players} {snapshot} nowMs={live.nowMs} {timeZone} />
    </section>
    {#each players as player (player.key)}
      <VikingCard {player} {snapshot} {timeZone} />
    {/each}
  </div>
{/if}

<style>
  /* Lanes above the cards */
  .vikings {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: var(--page-width);
  }
</style>
