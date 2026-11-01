<script lang="ts">
  import NoData from '#/lib/components/NoData';
  import { live, useSnapshot } from '#/lib/live.svelte';
  import { mapOf } from '#/lib/map';
  import { MAP_CHEST_METERS, MAP_SQUARE_METERS } from '#/lib/models';
  import { playersOf } from '#/lib/players';
  import { viewerTimeZone, whenLabel } from '#/lib/status';
  import { thingList, thingName } from '#/lib/story';

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
  const snapshot = $derived(getSnapshot());

  /** Viewer's time zone from the browser. */
  const timeZone = viewerTimeZone();

  /** Players at the page clock. */
  const players = $derived(live.nowMs === null ? [] : playersOf(snapshot, live.nowMs));

  /** What the map draws. */
  const map = $derived(mapOf(snapshot, players));

  /** ID of the chest picked on the map, if any. */
  let pickedId = $state<string | null>(null);

  /** Chest picked on the map, while it still exists. */
  const picked = $derived(map?.chests.find((chest) => chest.id === pickedId) ?? null);

  /** Chests with the most items first. */
  const chestList = $derived(
    (map?.chests ?? []).toSorted(
      (first, second) => Object.keys(second.record.items).length - Object.keys(first.record.items).length,
    ),
  );
</script>

{#if map === null}
  <NoData />
{:else if live.nowMs !== null}
  {@const nowMs = live.nowMs}
  <div class="map-page">
    <section class="panel" aria-labelledby="map-title">
      <h2 id="map-title" class="panel-title">WHERE EVERYONE HAS BEEN</h2>
      <p class="muted">Each square is {MAP_SQUARE_METERS} m, colored by who walked there. North is up. Tap a chest to see what it holds.</p>
      <div class="legend">
        {#each players as player (player.key)}
          <span><span class="swatch" style:background={player.color}></span>{player.character}</span>
        {/each}
        <span><span class="swatch chest-swatch"></span>Chest, cart or ship</span>
        <span><span class="death-swatch" aria-hidden="true">✕</span>Last death</span>
      </div>
      <svg viewBox={map.viewBox} role="img" aria-label="Map of explored land, chests and players">
        {#each map.squares as square (square.key)}
          <rect class="square" x={square.x} y={square.y} width={MAP_SQUARE_METERS} height={MAP_SQUARE_METERS} fill={square.color} />
        {/each}
        {#each map.chests as chest (chest.id)}
          <rect
            class="chest"
            class:picked={chest.id === pickedId}
            x={chest.x - MAP_CHEST_METERS / 2}
            y={chest.y - MAP_CHEST_METERS / 2}
            width={MAP_CHEST_METERS}
            height={MAP_CHEST_METERS}
            role="button"
            tabindex="0"
            aria-label={`${thingName(chest.record.chest)} built by ${chest.record.builder ?? 'someone'}`}
            onclick={() => (pickedId = chest.id)}
            onkeydown={(event) => (event.key === 'Enter' ? (pickedId = chest.id) : undefined)}
          />
        {/each}
        {#each map.marks as mark (mark.key)}
          {#if mark.kind === 'player'}
            <rect class="player" x={mark.x - 8} y={mark.y - 8} width="16" height="16" fill={mark.color} transform={`rotate(45 ${mark.x} ${mark.y})`}>
              <title>{mark.label}</title>
            </rect>
          {:else}
            <text class="death" x={mark.x} y={mark.y} fill={mark.color}>✕<title>{mark.label}</title></text>
          {/if}
        {/each}
      </svg>
      {#if picked}
        <div class="picked-chest">
          <strong>{thingName(picked.record.chest)}</strong>
          <span class="muted">built by {picked.record.builder ?? 'someone'} · {whenLabel(picked.record.timeUtc, timeZone, nowMs)}</span>
          <p>{Object.keys(picked.record.items).length === 0 ? 'Empty' : thingList(picked.record.items)}</p>
        </div>
      {/if}
    </section>

    <section class="panel" aria-labelledby="chests-title">
      <h2 id="chests-title" class="panel-title">CHESTS</h2>
      {#each chestList as chest (chest.id)}
        <div class="line">
          <span><strong>{thingName(chest.record.chest)}</strong> <span class="muted">by {chest.record.builder ?? 'someone'}</span></span>
          <span>{Object.keys(chest.record.items).length === 0 ? 'Empty' : thingList(chest.record.items)}</span>
        </div>
      {:else}
        <p class="muted">No chest seen since the server started.</p>
      {/each}
    </section>
  </div>
{/if}

<style>
  /* Map above the chest list */
  .map-page {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 1000px;
  }

  /* Text under a panel title */
  p {
    margin: 0 0 10px;
  }

  /* Player colors and mark meanings in one wrapping row */
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin-bottom: 12px;
    font-size: 13px;
  }

  /* Color square before each legend name */
  .swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 6px;
  }

  /* Chest legend matches the chest marks */
  .chest-swatch {
    border: 1px solid var(--text);
  }

  /* Death legend matches the death marks */
  .death-swatch {
    margin-right: 6px;
    color: var(--blood);
  }

  /* Map fills the panel width and keeps its shape */
  svg {
    display: block;
    width: 100%;
    max-height: 70vh;
    background: var(--background);
    border: 1px solid var(--line);
  }

  /* Explored squares stay see-through so overlapping players both show */
  .square {
    opacity: 0.45;
  }

  /* Chest marks stand out from the squares and look tappable */
  .chest {
    fill: var(--panel);
    stroke: var(--text);
    stroke-width: 2;
    cursor: pointer;
  }

  /* The picked chest turns gold */
  .chest.picked {
    fill: var(--gold);
  }

  /* Online players as turned squares with a dark edge */
  .player {
    stroke: var(--background);
    stroke-width: 3;
  }

  /* Death marks centered on the spot */
  .death {
    font-size: 24px;
    text-anchor: middle;
    dominant-baseline: central;
  }

  /* Picked chest details under the map */
  .picked-chest {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--line-soft);
  }

  /* One chest: name on the left, contents on the right */
  .line {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 16px;
    padding: 9px 0;
    border-top: 1px solid var(--line-soft);
  }
</style>
