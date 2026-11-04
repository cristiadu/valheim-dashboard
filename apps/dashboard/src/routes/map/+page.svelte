<script lang="ts">
  import { tick } from 'svelte';

  import ChestContents from '#/lib/components/ChestContents';
  import ItemIcon from '#/lib/components/ItemIcon';
  import NoData from '#/lib/components/NoData';
  import { chestName, stockOf } from '#/lib/items';
  import { live, useSnapshot } from '#/lib/live.svelte';
  import { mapOf } from '#/lib/map';
  import { MAP_SQUARE_METERS, MAP_TRAIL_METERS, TERRAIN_STYLES } from '#/lib/models';
  import { playersOf } from '#/lib/players';
  import { viewerTimeZone, whenLabel } from '#/lib/status';
  import { count } from '#/lib/story';

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
  const snapshot = $derived(getSnapshot());

  /** Viewer's time zone from the browser. */
  const timeZone = viewerTimeZone();

  /** Text that narrows the stored items by item or chest name. */
  let stockQuery = $state('');

  /** Players at the page clock. */
  const players = $derived(live.nowMs === null ? [] : playersOf(snapshot, live.nowMs));

  /** What the map draws. */
  const map = $derived(mapOf(snapshot, players));

  /** IDs of the picked chests: the ones under a mark tapped on the map, or one picked in the list. */
  let pickedIds = $state<string[]>([]);

  /** Chests picked on the map or in the list, while they still exist. */
  const picked = $derived((map?.chests ?? []).filter((chest) => pickedIds.includes(chest.id)));

  /** Panel that shows the picked chest. */
  let pickedPanel = $state<HTMLElement>();

  /** Terrain kinds on the explored squares, in legend order. */
  const terrainKinds = $derived(
    Object.entries(TERRAIN_STYLES).filter(([letter]) => Object.values(snapshot.terrain).includes(letter)),
  );

  /** Chests with the most kinds of items first. */
  const chestList = $derived(
    (map?.chests ?? []).toSorted(
      (first, second) => Object.keys(second.record.items).length - Object.keys(first.record.items).length,
    ),
  );

  /** Every stored item across the chests on the map. */
  const stock = $derived(stockOf(map?.chests ?? []));

  /** Stored items whose name or chest name has the search text. */
  const visibleStock = $derived.by(() => {
    const query = stockQuery.trim().toLowerCase();
    return stock.filter((row) =>
      [row.name, ...row.chests.map(({ chest }) => chestName(chest.record.chest))].some((name) => name.toLowerCase().includes(query)),
    );
  });

  /** Picks the chests with [ids] and brings their panel into view. */
  const pick = async (ids: string[]): Promise<void> => {
    pickedIds = ids;
    await tick();
    pickedPanel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
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
        was there. North is up. Point at a chest to make it bigger, and tap it to look inside. Chests close together
        share one mark, with how many there are on its corner.
      </p>
      <div class="legend">
        {#each players as player (player.key)}
          <span><span class="swatch" style:background={player.color}></span>{player.character}</span>
        {/each}
        <span>
          <svg class="legend-chest" viewBox="-0.5 -0.5 1 1" aria-hidden="true"><use href="#chest-icon" /></svg>Chest, cart or
          ship
        </span>
        <span><span class="death-swatch" aria-hidden="true">✕</span>Last death</span>
        {#each terrainKinds as [letter, style] (letter)}
          <span><span class="swatch" style:background={style.color}></span>{style.name}</span>
        {/each}
      </div>
      <svg class="map" viewBox={map.viewBox} role="img" aria-label="Map of explored land, chests and players">
        <defs>
          <g id="chest-icon">
            <path class="chest-lid" d="M -0.46 -0.08 L -0.46 -0.22 Q -0.46 -0.42 -0.26 -0.42 L 0.26 -0.42 Q 0.46 -0.42 0.46 -0.22 L 0.46 -0.08 Z" />
            <rect class="chest-body" x="-0.46" y="-0.08" width="0.92" height="0.5" />
            <rect class="chest-band" x="-0.46" y="-0.11" width="0.92" height="0.07" />
            <rect class="chest-latch" x="-0.07" y="-0.13" width="0.14" height="0.18" />
          </g>
        </defs>
        {#each map.land as square (square.key)}
          <rect x={square.x} y={square.y} width={MAP_SQUARE_METERS} height={MAP_SQUARE_METERS} fill={square.color} />
        {/each}
        {#each map.trails as trail (trail.key)}
          <rect class="trail" x={trail.x} y={trail.y} width={MAP_TRAIL_METERS} height={MAP_TRAIL_METERS} fill={trail.color} />
        {/each}
        {#each map.chestGroups as group (group.key)}
          {@const label = group.ids.length === 1 ? chestName(map.chests.find((chest) => chest.id === group.ids[0])!.record.chest) : count(group.ids.length, 'chest', 'chests')}
          <g
            class="chest"
            class:picked={group.ids.some((id) => pickedIds.includes(id))}
            transform="translate({group.x} {group.y}) scale({map.chestMeters})"
            role="button"
            tabindex="0"
            aria-label={label}
            onclick={() => pick(group.ids)}
            onkeydown={(event) => (event.key === 'Enter' ? pick(group.ids) : undefined)}
          >
            <title>{label}</title>
            <g class="chest-mark">
              <use href="#chest-icon" />
              {#if group.ids.length > 1}
                <circle class="chest-badge" cx="0.42" cy="-0.42" r="0.3" />
                <text class="chest-badge-count" x="0.42" y="-0.42">{group.ids.length}</text>
              {/if}
            </g>
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
    </section>

    {#if picked.length > 0}
      <section class="panel" aria-labelledby="picked-title" bind:this={pickedPanel}>
        <div class="picked-head">
          <h2 id="picked-title" class="panel-title">
            {picked.length === 1 ? chestName(picked[0]!.record.chest).toUpperCase() : `${picked.length} CHESTS HERE`}
          </h2>
          <button type="button" onclick={() => (pickedIds = [])}>Close</button>
        </div>
        {#each picked as chest (chest.id)}
          <div class="picked-chest">
            {#if picked.length > 1}<h3>{chestName(chest.record.chest)}</h3>{/if}
            <p class="muted">
              Built by {chest.record.builder ?? 'someone'} · last looked at {whenLabel(chest.record.timeUtc, timeZone, nowMs)}
            </p>
            <ChestContents items={chest.record.items} />
          </div>
        {/each}
      </section>
    {/if}

    <section class="panel" aria-labelledby="chests-title">
      <h2 id="chests-title" class="panel-title">CHESTS</h2>
      {#each chestList as chest (chest.id)}
        {@const kinds = Object.keys(chest.record.items).length}
        <button type="button" class="line" class:picked={pickedIds.includes(chest.id)} onclick={() => pick([chest.id])}>
          <span><strong>{chestName(chest.record.chest)}</strong> <span class="muted">by {chest.record.builder ?? 'someone'}</span></span>
          <span class="muted">
            {kinds === 0 ? 'Empty' : `${count(kinds, 'kind', 'kinds')} · ${Object.values(chest.record.items).reduce((sum, amount) => sum + amount, 0).toLocaleString()} items`}
          </span>
        </button>
      {:else}
        <p class="muted">No chest found yet.</p>
      {/each}
    </section>

    <section class="panel" aria-labelledby="stock-title">
      <h2 id="stock-title" class="panel-title">EVERYTHING STORED</h2>
      <p class="muted">Each item across all the chests above. Tap one to see which chests hold it.</p>
      <label class="stock-search">
        <span class="muted">Find an item or chest</span>
        <input bind:value={stockQuery} type="search" placeholder="Wood, cart…" />
      </label>
      {#each visibleStock as row (row.prefab)}
        <details class="stock-row">
          <summary>
            <span class="stock-item"><ItemIcon item={row.name} size={24} />{row.name}</span>
            <span class="amount">{row.count.toLocaleString()}</span>
            <span class="muted">in {count(row.chests.length, 'chest', 'chests')}</span>
          </summary>
          <ul>
            {#each row.chests as { chest, count: amount } (chest.id)}
              <li>
                <button type="button" class="link" onclick={() => pick([chest.id])}>
                  <span class="amount">{amount.toLocaleString()}</span>
                  {chestName(chest.record.chest)}
                  <span class="muted">by {chest.record.builder ?? 'someone'}</span>
                </button>
              </li>
            {/each}
          </ul>
        </details>
      {:else}
        <p class="muted">{stock.length === 0 ? 'Nothing stored in the chests found so far.' : 'No item or chest has that name.'}</p>
      {/each}
    </section>
  </div>
{/if}

<style>
  /* Map, picked chest, chest list and stock stacked with even space */
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
    align-items: center;
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

  /* Chest legend uses the same drawing as the map */
  .legend-chest {
    width: 16px;
    height: 16px;
    margin-right: 6px;
    vertical-align: middle;
  }

  /* Death legend matches the death marks */
  .death-swatch {
    margin-right: 6px;
    color: var(--blood);
  }

  /* Map fills the panel width and keeps its shape */
  .map {
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

  /* Chest wood is brown, or gold on the picked chest */
  .chest-lid,
  .chest-body {
    fill: var(--chest-wood, #8a5a2b);
    stroke: #2a1a0e;
    stroke-width: 0.05;
  }

  /* Iron band and latch across the chest */
  .chest-band,
  .chest-latch {
    fill: #c9c2b2;
    stroke: #2a1a0e;
    stroke-width: 0.03;
  }

  /* Each chest grows from its middle when pointed at, focused or picked */
  .chest-mark {
    transform-box: fill-box;
    transform-origin: center;
    transition: transform 0.15s ease-out;
  }

  /* Chests look tappable */
  .chest {
    cursor: pointer;
    outline: none;
  }

  /* Pointing at or focusing a chest makes it bigger */
  .chest:hover .chest-mark,
  .chest:focus-visible .chest-mark {
    transform: scale(1.8);
  }

  /* The picked chest turns gold */
  .chest.picked {
    --chest-wood: var(--gold);
  }

  /* The picked chest stays big */
  .chest.picked .chest-mark {
    transform: scale(1.8);
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

  /* Count of chests that share a mark, on its corner */
  .chest-badge {
    fill: var(--ember);
    stroke: #2a1a0e;
    stroke-width: 0.04;
  }

  /* Number inside the badge */
  .chest-badge-count {
    fill: #1a120a;
    font-size: 0.38px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
  }

  /* Each picked chest, with a hairline between chests */
  .picked-chest + .picked-chest {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid var(--line-soft);
  }

  /* Chest name when several chests share the panel */
  h3 {
    margin: 0 0 4px;
    font-family: var(--font-heading);
    font-size: 16px;
    font-weight: 500;
  }

  /* Picked chest's name and the close button in one row */
  .picked-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  /* Buttons share the Longhouse look */
  button {
    font: inherit;
    color: var(--text);
    background: none;
    cursor: pointer;
  }

  /* Close button looks like the Saga filters */
  .picked-head button {
    min-height: 36px;
    padding: 0 14px;
    border: 1px solid var(--line);
  }

  /* One chest in the list: name on the left, what it holds on the right, tappable as a whole */
  .line {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 16px;
    width: 100%;
    padding: 10px 0;
    border: 0;
    border-top: 1px solid var(--line-soft);
    text-align: left;
  }

  /* The chest shown above is marked in the list too */
  .line.picked strong {
    color: var(--gold);
  }

  /* Search box above the stored items */
  .stock-search {
    display: grid;
    gap: 6px;
    max-width: 420px;
    margin: 4px 0 8px;
  }

  /* Search field in the Longhouse look, tall enough for touch */
  .stock-search input {
    min-height: 44px;
    padding: 0 12px;
    color: inherit;
    font: inherit;
    background: var(--background);
    border: 1px solid var(--line);
  }

  /* One stored item with a hairline above */
  .stock-row {
    padding: 8px 0;
    border-top: 1px solid var(--line-soft);
  }

  /* Item, total and number of chests in one row */
  .stock-row summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(90px, auto);
    align-items: center;
    gap: 12px;
    cursor: pointer;
  }

  /* Icon beside the item name */
  .stock-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  /* Counts in the heading font and accent color */
  .amount {
    min-width: 28px;
    font-family: var(--font-heading);
    color: var(--ember);
  }

  /* Chests that hold the item, under it */
  .stock-row ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 8px 0 0;
    padding: 0 0 0 32px;
    list-style: none;
  }

  /* A chest that holds the item, tappable to open it */
  .link {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
    min-height: 32px;
    padding: 0;
    border: 0;
    text-align: left;
  }
</style>
