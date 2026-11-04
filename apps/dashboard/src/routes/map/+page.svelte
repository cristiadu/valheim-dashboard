<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';

  import ChestView from '#/lib/components/ChestView';
  import ItemIcon from '#/lib/components/ItemIcon';
  import NoData from '#/lib/components/NoData';
  import { itemName } from '#/lib/gear';
  import { live, useSnapshot } from '#/lib/live.svelte';
  import { containerName, mapOf } from '#/lib/map';
  import { MAP_SQUARE_METERS, MAP_TRAIL_METERS, type MapChest, TERRAIN_STYLES } from '#/lib/models';
  import { playersOf } from '#/lib/players';
  import { viewerTimeZone, whenLabel } from '#/lib/status';

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
  const snapshot = $derived(getSnapshot());

  /** Viewer's time zone from the browser. */
  const timeZone = viewerTimeZone();

  /** Text used to narrow stored items by name or the container that holds them. */
  let stockQuery = $state('');

  /** Players at the page clock. */
  const players = $derived(live.nowMs === null ? [] : playersOf(snapshot, live.nowMs));

  /** What the map draws. */
  const map = $derived(mapOf(snapshot, players));

  /** Square of the chest icon picked on the map, if any. */
  let pickedKey = $state<string | null>(null);

  /** Chests under the icon picked on the map, while they still exist. */
  const picked = $derived(map?.chestSpots.find((spot) => spot.key === pickedKey) ?? null);

  /** Terrain kinds on the explored squares, in legend order. */
  const terrainKinds = $derived(
    Object.entries(TERRAIN_STYLES).filter(([letter]) => Object.values(snapshot.terrain).includes(letter)),
  );

  /** Orders chests with the most kinds of items first. */
  const byMostItems = (first: MapChest, second: MapChest): number =>
    Object.keys(second.record.items).length - Object.keys(first.record.items).length;

  /** Chests with the most items first. */
  const chestList = $derived((map?.chests ?? []).toSorted(byMostItems));

  /** Total each item across all known chest, cart and ship snapshots. */
  const stockRows = $derived.by(() => {
    const totals = new SvelteMap<string, {
      count: number;
      containers: { id: string; name: string; builder: string | null; x: number; z: number; count: number }[];
    }>();
    for (const [id, chest] of Object.entries(snapshot.chests)) {
      for (const [item, count] of Object.entries(chest.items)) {
        const total = totals.get(item) ?? { count: 0, containers: [] };
        total.count += count;
        total.containers.push({ id, name: chest.chest, builder: chest.builder, x: chest.x, z: chest.z, count });
        totals.set(item, total);
      }
    }
    return [...totals].map(([item, total]) => ({ item, ...total }))
      .sort((first, second) => second.count - first.count || first.item.localeCompare(second.item));
  });

  /** Stock rows matching the item's name or a container name. */
  const visibleStockRows = $derived(stockRows.filter((row) =>
    `${row.item} ${row.containers.map((container) => container.name).join(' ')}`
      .toLowerCase().includes(stockQuery.trim().toLowerCase()),
  ));

  /** Number of item instances in all known storage. */
  const storedItemCount = $derived(stockRows.reduce((sum, row) => sum + row.count, 0));

  /** Most recent container contents snapshot. */
  const latestStockUtc = $derived(Object.values(snapshot.chests).map((chest) => chest.timeUtc).toSorted().at(-1) ?? null);
</script>

{#if map === null}
  <NoData />
{:else if live.nowMs !== null}
  {@const nowMs = live.nowMs}
  <div class="map-page">
    <section class="panel" aria-labelledby="map-title">
      <h2 id="map-title" class="panel-title">WHERE EVERYONE HAS BEEN</h2>
      <p class="muted">
        Each square is {MAP_SQUARE_METERS} m of land someone walked, in its terrain color, with a dot for each player who
        was there. North is up. Point at a chest to make it bigger, and tap it to open it. A number on a chest means that many chests stand close together.
      </p>
      <div class="legend">
        {#each players as player (player.key)}
          <span><span class="swatch" style:background={player.color}></span>{player.character}</span>
        {/each}
        <span><svg class="chest-swatch" viewBox="0 0 24 24" aria-hidden="true"><use href="#chest-glyph" /></svg>Chests, carts and ships</span>
        <span><span class="death-swatch" aria-hidden="true">✕</span>Last death</span>
        {#each terrainKinds as [letter, style] (letter)}
          <span><span class="swatch" style:background={style.color}></span>{style.name}</span>
        {/each}
      </div>
      <svg viewBox={map.viewBox} role="img" aria-label="Map of explored land, chests and players">
        <defs>
          <symbol id="chest-glyph" viewBox="0 0 24 24">
            <path class="chest-lid" d="M2 11V8a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v3z" />
            <rect class="chest-body" x="2" y="11" width="20" height="10" rx="1" />
            <rect class="chest-band" x="2" y="10" width="20" height="2.5" />
            <rect class="chest-lock" x="10" y="9.5" width="4" height="5" rx="0.8" />
          </symbol>
        </defs>
        {#each map.land as square (square.key)}
          <rect x={square.x} y={square.y} width={MAP_SQUARE_METERS} height={MAP_SQUARE_METERS} fill={square.color} />
        {/each}
        {#each map.trails as trail (trail.key)}
          <rect class="trail" x={trail.x} y={trail.y} width={MAP_TRAIL_METERS} height={MAP_TRAIL_METERS} fill={trail.color} />
        {/each}
        {#each map.chestSpots as spot (spot.key)}
          {@const size = map.chestIconMeters}
          {@const label = spot.chests.length === 1 ? containerName(spot.chests[0]!.record.chest) : `${spot.chests.length} chests`}
          <g
            class="chest-spot"
            class:picked={spot.key === pickedKey}
            role="button"
            tabindex="0"
            aria-label="{label}. Show what is inside"
            onclick={() => (pickedKey = spot.key)}
            onkeydown={(event) => (event.key === 'Enter' || event.key === ' ' ? (pickedKey = spot.key) : undefined)}
          >
            <title>{label}</title>
            <use href="#chest-glyph" x={spot.x - size / 2} y={spot.y - size / 2} width={size} height={size} />
            {#if spot.chests.length > 1}
              <circle class="count" cx={spot.x + size / 2} cy={spot.y - size / 2} r={size / 3} />
              <text class="count-text" x={spot.x + size / 2} y={spot.y - size / 2} font-size={size / 2.4}>{spot.chests.length}</text>
            {/if}
          </g>
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
        <div class="picked-chests">
          <div class="picked-head">
            <strong>{picked.chests.length === 1 ? 'This chest holds' : `These ${picked.chests.length} chests hold`}</strong>
            <button type="button" class="close" onclick={() => (pickedKey = null)}>Close</button>
          </div>
          <div class="chest-grid">
            {#each picked.chests.toSorted(byMostItems) as chest (chest.id)}
              <ChestView chest={chest.record} {nowMs} {timeZone} />
            {/each}
          </div>
        </div>
      {/if}
    </section>

    <section class="panel" aria-labelledby="chests-title">
      <h2 id="chests-title" class="panel-title">CHESTS</h2>
      <div class="chest-grid">
        {#each chestList as chest (chest.id)}
          <ChestView chest={chest.record} {nowMs} {timeZone} />
        {:else}
          <p class="muted">No chest seen since the server started.</p>
        {/each}
      </div>
    </section>

    <section class="panel" aria-labelledby="stock-title">
      <h2 id="stock-title" class="panel-title">STORED STOCK</h2>
      <p class="muted">
        Current known contents · {Object.keys(snapshot.chests).length} containers · {stockRows.length} item types · {storedItemCount.toLocaleString()} items
        {#if latestStockUtc}· scanned {whenLabel(latestStockUtc, timeZone, nowMs)}{/if}
      </p>
      <label class="stock-search">
        <span class="muted">Find an item or container</span>
        <input bind:value={stockQuery} type="search" placeholder="Wood, chest, cart…" />
      </label>
      {#each visibleStockRows as row (row.item)}
        <details class="stock-row">
          <summary>
            <strong class="stock-item"><ItemIcon item={itemName(row.item)} size={20} />{itemName(row.item)}</strong>
            <span class="mono">{row.count.toLocaleString()}</span>
            <span class="muted">{row.containers.length} {row.containers.length === 1 ? 'container' : 'containers'}</span>
          </summary>
          <ul>
            {#each row.containers.toSorted((first, second) => second.count - first.count) as container (`${container.id}:${container.name}`)}
              <li>
                <strong class="mono">{container.count.toLocaleString()}</strong>
                {containerName(container.name)}
                <span class="muted">by {container.builder ?? 'unknown'} · {container.x}, {container.z}</span>
              </li>
            {/each}
          </ul>
        </details>
      {:else}
        <p class="muted">{stockRows.length === 0 ? 'No stored items have been seen this run.' : 'No items or containers match that search.'}</p>
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

  /* Chest legend is the same little chest the map draws */
  .chest-swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 6px;
    vertical-align: -2px;
    border: none;
    background: none;
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

  /* Player dots sit on the terrain with a dark edge so they read on light land */
  .trail {
    stroke: var(--background);
    stroke-width: 2;
  }

  /* Chest icon grows from its middle when pointed at, focused or picked, so it is easy to aim at */
  .chest-spot {
    cursor: pointer;
    transform-box: fill-box;
    transform-origin: center;
    transition: transform 0.15s ease-out;
    outline: none;
  }

  /* Bigger chest under the pointer or keyboard focus */
  .chest-spot:hover,
  .chest-spot:focus-visible,
  .chest-spot.picked {
    transform: scale(1.8);
  }

  /* Chest lid, a little lighter than the body */
  .chest-lid {
    fill: var(--wood);
    stroke: var(--background);
    stroke-width: 1;
  }

  /* Chest body */
  .chest-body {
    fill: var(--wood-dark);
    stroke: var(--background);
    stroke-width: 1;
  }

  /* Iron band and lock in gold, like the game's chests */
  .chest-band,
  .chest-lock {
    fill: var(--gold);
  }

  /* How many chests share one icon, in a dark dot on its corner */
  .count {
    fill: var(--background);
    stroke: var(--gold);
    stroke-width: 1;
  }

  /* Number inside the dot */
  .count-text {
    fill: var(--gold);
    font-family: var(--font-mono);
    text-anchor: middle;
    dominant-baseline: central;
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

  /* The picked chests' windows under the map */
  .picked-chests {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--line-soft);
  }

  /* What the picked icon holds, with a way to close it */
  .picked-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  /* Close button, at least 44px tall for touch */
  .close {
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }

  /* Chest windows side by side, one per row on a phone */
  .chest-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: 12px;
    align-items: start;
  }

  /* One item total and the number of containers that currently hold it. */
  .stock-row {
    border-top: 1px solid var(--line-soft);
    padding: 9px 0;
  }

  .stock-row summary {
    display: grid;
    grid-template-columns: minmax(140px, 1fr) auto minmax(120px, auto);
    align-items: baseline;
    gap: 12px;
    cursor: pointer;
  }

  .stock-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .stock-row ul {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 0 0 20px;
  }

  .stock-row li {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
  }

  .stock-search {
    display: grid;
    gap: 6px;
    max-width: 420px;
    margin: 14px 0 4px;
  }

  .stock-search input {
    min-height: 38px;
    padding: 8px 10px;
    color: inherit;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  @media (max-width: 600px) {
    .stock-row summary {
      grid-template-columns: 1fr auto;
    }

    .stock-row summary > :last-child {
      grid-column: 1 / -1;
    }
  }
</style>

