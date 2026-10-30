<script lang="ts">
  import NoData from '#/src/lib/components/NoData.svelte';
  import TimeLanes from '#/src/lib/components/TimeLanes.svelte';
  import { live, useSnapshot, viewerOffsetMinutes } from '#/src/lib/live.svelte.ts';
  import { playersOf } from '#/src/lib/players.ts';
  import { clockTime, durationLabel } from '#/src/lib/status.ts';

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
  const snapshot = $derived(getSnapshot());

  /** Viewer's offset from UTC; only known in the browser. */
  const offset = $derived(live.nowMs === null ? 0 : viewerOffsetMinutes(live.nowMs));

  /** Players at the page clock. */
  const players = $derived(live.nowMs === null ? [] : playersOf(snapshot, live.nowMs));
</script>

{#if snapshot.sessions.length === 0}
  <NoData />
{:else if live.nowMs !== null}
  <div class="vikings">
    <section class="panel" aria-labelledby="lanes-title">
      <h2 id="lanes-title" class="panel-title">ONLINE IN THE LAST 24 HOURS</h2>
      <TimeLanes {players} {snapshot} nowMs={live.nowMs} offsetMinutes={offset} />
    </section>

    <div class="cards">
      {#each players as player (player.key)}
        <article class="panel card">
          <h3><span class="diamond" aria-hidden="true" style:background={player.color}></span>{player.character}</h3>
          <p class="muted">
            {#if player.steamName}Steam: {player.steamName} ·{/if}
            {player.isOnline ? `Online since ${clockTime(player.sinceUtc!, offset)}` : `Last seen ${clockTime(player.lastSeenUtc!, offset)}`}
          </p>
          <dl>
            <div><dt>TIME</dt><dd class="mono">{durationLabel(player.totalMs)}</dd></div>
            <div><dt>VISITS</dt><dd class="mono">{player.sessions.length}</dd></div>
            <div><dt>DEATHS</dt><dd class="mono">{player.deaths}</dd></div>
          </dl>
        </article>
      {/each}
    </div>
  </div>
{/if}

<style>
  /* Lanes above the cards */
  .vikings {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 1120px;
  }

  /* As many cards per row as fit */
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
    gap: 16px;
  }

  /* Card content stacked */
  .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Player name with their color */
  h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: 17px;
    font-weight: 600;
  }

  /* Small turned square in the player's color */
  .diamond {
    width: 10px;
    height: 10px;
    transform: rotate(45deg);
  }

  /* Steam name and status */
  p {
    margin: 0;
  }

  /* Three numbers side by side */
  dl {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 0;
  }

  /* Number label */
  dt {
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--muted);
  }

  /* Number value */
  dd {
    margin: 0;
    font-size: 14px;
  }
</style>
