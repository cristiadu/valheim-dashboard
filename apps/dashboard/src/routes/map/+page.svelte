<script lang="ts">
  import ItemIcon from '#/lib/components/ItemIcon';
  import ItemList from '#/lib/components/ItemList';
  import { SvelteMap } from 'svelte/reactivity';
  import NoData from '#/lib/components/NoData';
  import { live, useSnapshot } from '#/lib/live.svelte';
  import { mapOf } from '#/lib/map';
  import { MAP_CHEST_METERS, MAP_SQUARE_METERS, MAP_TRAIL_METERS, TERRAIN_STYLES } from '#/lib/models';
  import { playersOf } from '#/lib/players';
  import { viewerTimeZone, whenLabel } from '#/lib/status';
  import { thingName } from '#/lib/story';

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
  const snapshot = $derived(getSnapshot());

  /** Viewer's time zone from the browser. */
  const timeZone = viewerTimeZone();

  /** Text used to narrow stored items by name or the container that holds them. */
  let stockQuery = $state('');

  /** Whether to browse observed storage by container or by item. */
  let inventoryView = $state<'container' | 'item'>('container');

  /** Players at the page clock. */
  const players = $derived(live.nowMs === null ? [] : playersOf(snapshot, live.nowMs));

  /** What the map draws. */
  const map = $derived(mapOf(snapshot, players));

  /** ID of the chest picked on the map, if any. */
  let pickedId = $state<string | null>(null);

  /** Chest picked on the map, while it still exists. */
  const picked = $derived(map?.chests.find((chest) => chest.id === pickedId) ?? null);

  /** Terrain kinds on the explored squares, in legend order. */
  const terrainKinds = $derived(
    Object.entries(TERRAIN_STYLES).filter(([letter]) => Object.values(snapshot.terrain).includes(letter)),
  );

  /** Chests with the most items first. */
  const chestList = $derived(
    (map?.chests ?? []).toSorted(
      (first, second) => Object.keys(second.record.items).length - Object.keys(first.record.items).length,
    ),
  );

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
        was there. North is up. Tap a chest to see what it holds.
      </p>
      <div class="legend">
        {#each players as player (player.key)}
          <span><span class="swatch" style:background={player.color}></span>{player.character}</span>
        {/each}
        <span><span class="swatch chest-swatch"></span>Chest, cart or ship</span>
        <span><span class="death-swatch" aria-hidden="true">✕</span>Last death</span>
        {#each terrainKinds as [letter, style] (letter)}
          <span><span class="swatch" style:background={style.color}></span>{style.name}</span>
        {/each}
      </div>
      <svg viewBox={map.viewBox} role="img" aria-label="Map of explored land, chests and players">
        {#each map.land as square (square.key)}
          <rect x={square.x} y={square.y} width={MAP_SQUARE_METERS} height={MAP_SQUARE_METERS} fill={square.color} />
        {/each}
        {#each map.trails as trail (trail.key)}
          <rect class="trail" x={trail.x} y={trail.y} width={MAP_TRAIL_METERS} height={MAP_TRAIL_METERS} fill={trail.color} />
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
          {#if Object.keys(picked.record.items).length === 0}<p>Empty</p>{:else}<ItemList items={picked.record.items} size={16} />{/if}
        </div>
      {/if}
    </section>

    <section class="panel" aria-labelledby="inventory-title">
      <div class="inventory-heading">
        <div>
      <h2 id="inventory-title" class="panel-title">STORAGE INVENTORY</h2>
          <p class="muted">
            {Object.keys(snapshot.chests).length} observed containers · {stockRows.length} item types · {storedItemCount.toLocaleString()} items
            {#if latestStockUtc}· scanned {whenLabel(latestStockUtc, timeZone, nowMs)}{/if}
          </p>
        </div>
        <div class="view-switch" role="group" aria-label="Inventory view">
          <button type="button" aria-pressed={inventoryView === 'container'} onclick={() => (inventoryView = 'container')}>By container</button>
          <button type="button" aria-pressed={inventoryView === 'item'} onclick={() => (inventoryView = 'item')}>By item</button>
        </div>
      </div>

      {#if inventoryView === 'container'}
        <div class="container-list">
          {#each chestList as chest (chest.id)}
            <div class="line">
              <span><strong>{thingName(chest.record.chest)}</strong> <span class="muted">by {chest.record.builder ?? 'someone'}</span></span>
              {#if Object.keys(chest.record.items).length === 0}<span>Empty</span>{:else}<div class="chest-items"><ItemList items={chest.record.items} size={16} /></div>{/if}
            </div>
          {:else}
            <p class="muted">No container seen since the server started.</p>
          {/each}
        </div>
      {:else}
        <label class="stock-search">
          <span class="visually-hidden">Find an item or container</span>
          <input bind:value={stockQuery} type="search" placeholder="Find an item…" />
        </label>
        <div class="stock-list">
          {#each visibleStockRows as row (row.item)}
            <details class="stock-row">
              <summary>
                <strong class="stock-item"><ItemIcon item={row.item} size={20} />{thingName(row.item)}</strong>
                <span class="mono">{row.count.toLocaleString()}</span>
                <span class="muted">{row.containers.length} {row.containers.length === 1 ? 'container' : 'containers'}</span>
              </summary>
              <ul>
                {#each row.containers.toSorted((first, second) => second.count - first.count) as container (`${container.id}:${container.name}`)}
                  <li>
                    <strong class="mono">{container.count.toLocaleString()}</strong>
                    {thingName(container.name)}
                    <span class="muted">by {container.builder ?? 'unknown'} · {container.x}, {container.z}</span>
                  </li>
                {/each}
              </ul>
            </details>
          {:else}
            <p class="muted">{stockRows.length === 0 ? 'No stored items have been seen this run.' : 'No items match that search.'}</p>
          {/each}
        </div>
      {/if}
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

  /* Player dots sit on the terrain with a dark edge so they read on light land */
  .trail {
    stroke: var(--background);
    stroke-width: 2;
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

  .inventory-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px 20px;
    margin-bottom: 12px;
  }

  .inventory-heading .panel-title,
  .inventory-heading p {
    margin: 0;
  }

  .view-switch {
    display: inline-flex;
    padding: 3px;
    border: 1px solid var(--line);
    gap: 2px;
  }

  .view-switch button {
    min-height: 34px;
    padding: 0 12px;
    border: 0;
    background: transparent;
    color: var(--muted);
    font: inherit;
    cursor: pointer;
  }

  .view-switch button[aria-pressed='true'] {
    background: var(--selected);
    color: var(--text);
  }

  /* One item total and the number of containers that currently hold it. */
  .stock-list {
    max-height: 540px;
    overflow: auto;
    padding-right: 6px;
  }

  .container-list {
    max-height: 540px;
    overflow: auto;
    padding-right: 6px;
  }

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

  .chest-items {
    max-width: 520px;
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
    display: block;
    max-width: 360px;
    margin: 0 0 10px;
  }

  .stock-search input {
    min-height: 38px;
    padding: 8px 10px;
    color: inherit;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 4px;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
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

