<script lang="ts">
  import { tick } from 'svelte';

  import ChestContents from '#/lib/components/ChestContents';
  import ItemIcon from '#/lib/components/ItemIcon';
  import NoData from '#/lib/components/NoData';
  import { chestName, containerGrid, slotsUsed, stockOf } from '#/lib/items';
  import { live, useSnapshot } from '#/lib/live.svelte';
  import { chestSpotsOf, mapOf, spotLabelOf } from '#/lib/map';
  import {
    MAP_CHEST_MIN_PX,
    MAP_CHEST_MOVED_STEP,
    MAP_CHEST_PX,
    MAP_CHEST_SMALL_PX,
    MAP_DEATH_PX,
    MAP_LEVIATHAN_PX,
    MAP_DRAG_PX,
    MAP_PLAYER_PX,
    MAP_SQUARE_METERS,
    MAP_TRAIL_METERS,
    MAP_WORLD_BOX,
    MAP_ZOOM_STEP,
    type MapBox,
    TERRAIN_STYLES,
    WORLD_EDGE_METERS,
  } from '#/lib/models';
  import { playersOf } from '#/lib/players';
  import { viewerTimeZone, whenLabel } from '#/lib/status';
  import { count } from '#/lib/story';
  import { pannedBox, scaleBarOf, squareBoxOf, zoomedBox, zoomOf } from '#/lib/zoom';

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
  const snapshot = $derived(getSnapshot());

  /** Viewer's time zone from the browser. */
  const timeZone = viewerTimeZone();

  /** Text that narrows the stored items by item or chest name. */
  let stockQuery = $state('');

  /** Chest drawings in the legend, with what each stands for. */
  const CHEST_LEGEND: [string, string][] = [
    ['chest', 'Chest'],
    ['treasure', 'Chest the world came with'],
    ['cart', 'Cart'],
    ['ship', 'Ship'],
  ];

  /** Players at the page clock. */
  const players = $derived(live.nowMs === null ? [] : playersOf(snapshot, live.nowMs));

  /** What the map draws. */
  const map = $derived(mapOf(snapshot, players));

  /** Part of the map in view after zooming or moving, or null before the viewer touched it. */
  let zoomBox = $state<MapBox | null>(null);

  /** Part of the map in view: the explored land until the viewer zooms or moves, out to the whole world at most. */
  const box = $derived(zoomBox ?? (map === null ? MAP_WORLD_BOX : squareBoxOf(map.box)));

  /** How many times the view zooms into the explored land, below 1 when it shows more of the world. */
  const zoom = $derived(map === null ? 1 : zoomOf(box, map.box));

  /** True when the view already shows the whole world, so it cannot zoom out or move. */
  const isWholeWorld = $derived(box.width >= MAP_WORLD_BOX.width && box.height >= MAP_WORLD_BOX.height);

  /** Width and height of the drawn map, in pixels. */
  let mapWidthPx = $state(1);
  let mapHeightPx = $state(1);

  /** Meters in one screen pixel, so marks keep the same size on screen at any zoom and map shape. */
  const metersPerPixel = $derived(Math.max(box.width / mapWidthPx, box.height / mapHeightPx));

  /** Size of a chest mark, in meters at this zoom: small zoomed out, so a base keeps its shape, and bigger zoomed in. */
  const chestMeters = $derived(
    Math.min(MAP_CHEST_PX, Math.max(MAP_CHEST_MIN_PX, MAP_CHEST_SMALL_PX * Math.sqrt(zoom))) * metersPerPixel,
  );

  /**
   * Where each chest's mark sits at this zoom: marks keep their size on screen, so they spread less when zoomed.
   * When the view shows more than the explored land, each mark stays on its real spot, as spreading them would
   * push them far from where they stand.
   */
  const chestSpots = $derived(
    map === null
      ? []
      : zoom < 1
        ? map.chests.map(({ id, x, y }) => ({ id, x, y }))
        : chestSpotsOf(map.chests, chestMeters),
  );

  /** Scale bar under the map. */
  const scaleBar = $derived(scaleBarOf(metersPerPixel));

  /** Game coordinates of the spot under the pointer, or null when the pointer is off the map. */
  let pointerLabel = $state<string | null>(null);

  /** Chest under the pointer or focused, and where its hover box sits over the map, in pixels. */
  let hovered = $state<{ id: string; left: number; top: number; isLeftOfMark: boolean } | null>(null);

  /** Chest the hover box describes, while it still exists. */
  const hoveredChest = $derived(hovered === null ? undefined : map?.chests.find((chest) => chest.id === hovered!.id));

  /** The drawn map, to turn pointer spots into map spots. */
  let mapSvg = $state<SVGSVGElement>();

  /** Where a press on the map started, in pixels, and whether it has moved far enough to be a drag. */
  let press: { x: number; y: number; isDrag: boolean } | null = null;

  /** Returns the map spot under the pointer at [clientX], [clientY]. */
  const mapSpotAt = (clientX: number, clientY: number): { x: number; y: number } => {
    const point = new DOMPoint(clientX, clientY).matrixTransform(mapSvg!.getScreenCTM()!.inverse());
    return { x: point.x, y: point.y };
  };

  /** Zooms the map [factor] times around the map spot [x], [y]. */
  const zoomBy = (factor: number, x = box.x + box.width / 2, y = box.y + box.height / 2): void => {
    zoomBox = zoomedBox(box, MAP_WORLD_BOX, factor, x, y);
  };

  /** Zooms in or out with the mouse wheel, around the spot under the pointer. */
  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const spot = mapSpotAt(event.clientX, event.clientY);
    zoomBy(event.deltaY < 0 ? MAP_ZOOM_STEP : 1 / MAP_ZOOM_STEP, spot.x, spot.y);
  };

  /** Zooms in on the spot that was double clicked or double tapped. */
  const onDoubleClick = (event: MouseEvent): void => {
    const spot = mapSpotAt(event.clientX, event.clientY);
    zoomBy(MAP_ZOOM_STEP * MAP_ZOOM_STEP, spot.x, spot.y);
  };

  /** Starts a possible drag where the map was pressed. */
  const onPointerDown = (event: PointerEvent): void => {
    press = { x: event.clientX, y: event.clientY, isDrag: false };
  };

  /** Shows the game coordinates under the pointer, and moves the map with a press once it is far enough to be a drag. */
  const onPointerMove = (event: PointerEvent): void => {
    const spot = mapSpotAt(event.clientX, event.clientY);
    pointerLabel = spotLabelOf(spot.x, spot.y);
    if (press === null || isWholeWorld) {
      return;
    }
    if (!press.isDrag && Math.hypot(event.clientX - press.x, event.clientY - press.y) > MAP_DRAG_PX) {
      press.isDrag = true;
      mapSvg!.setPointerCapture(event.pointerId);
    }
    if (press.isDrag) {
      zoomBox = pannedBox(box, MAP_WORLD_BOX, -event.movementX * metersPerPixel, -event.movementY * metersPerPixel);
    }
  };

  /** Shows the hover box of the chest with [id] beside its mark [target]. */
  const showHover = (id: string, target: Element): void => {
    const mark = target.getBoundingClientRect();
    const frame = mapSvg!.getBoundingClientRect();
    const isLeftOfMark = mark.right - frame.left > frame.width / 2;
    const left = isLeftOfMark ? frame.right - mark.left : mark.right - frame.left;
    hovered = { id, left, top: mark.top + mark.height / 2 - frame.top, isLeftOfMark };
  };

  /** Hides the hover box of the chest with [id], unless another chest's box took its place. */
  const hideHover = (id: string): void => {
    if (hovered?.id === id) {
      hovered = null;
    }
  };

  /** Ends a press, so the next tap on a chest opens it. */
  const onPointerUp = (): void => {
    press = null;
  };

  /** ID of the chest tapped on the map or picked in a list, or null when none is open. */
  let pickedId = $state<string | null>(null);

  /** Chest picked on the map or in a list, while it still exists. */
  const picked = $derived((map?.chests ?? []).find((chest) => chest.id === pickedId));

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

  /** Opens the chest with [id] and brings its panel into view. */
  const pick = async (id: string): Promise<void> => {
    pickedId = id;
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
        was there. North is up, and spots match the game's own coordinates. Point at a chest to see what it is, and
        tap it to look inside. Zoom with the wheel, the buttons or a double tap, and drag to move around.
      </p>
      <div class="legend">
        {#each players as player (player.key)}
          <span><span class="swatch" style:background={player.color}></span>{player.character}</span>
        {/each}
        {#each CHEST_LEGEND as [kind, name] (kind)}
          <span>
            <svg class="legend-chest {kind}" viewBox="-0.5 -0.5 1 1" aria-hidden="true"><use href="#{kind}-icon" /></svg>{name}
          </span>
        {/each}
        <span><span class="edge-swatch" aria-hidden="true"></span>Edge of the world</span>
        <span><span class="death-swatch" aria-hidden="true">✕</span>Last death</span>
        <span>
          <svg class="legend-chest" viewBox="-0.5 -0.5 1 1" aria-hidden="true"><use href="#leviathan-icon" /></svg>Leviathan
        </span>
        {#each terrainKinds as [letter, style] (letter)}
          <span><span class="swatch" style:background={style.color}></span>{style.name}</span>
        {/each}
      </div>
      <div class="zoom-tools">
        <button type="button" onclick={() => zoomBy(MAP_ZOOM_STEP)} aria-label="Zoom in">+</button>
        <button type="button" onclick={() => zoomBy(1 / MAP_ZOOM_STEP)} aria-label="Zoom out" disabled={isWholeWorld}>−</button>
      </div>
      <div class="map-frame" bind:clientWidth={mapWidthPx} bind:clientHeight={mapHeightPx}>
        <svg
          class="map"
          class:movable={!isWholeWorld}
          viewBox="{box.x} {box.y} {box.width} {box.height}"
          role="img"
          aria-label="Map of explored land, chests and players"
          bind:this={mapSvg}
          onwheel={onWheel}
          ondblclick={onDoubleClick}
          onpointerdown={onPointerDown}
          onpointermove={onPointerMove}
          onpointerup={onPointerUp}
          onpointercancel={onPointerUp}
          onpointerleave={() => (pointerLabel = null)}
        >
          <defs>
            <g id="chest-icon">
              <path class="chest-lid" d="M -0.46 -0.08 L -0.46 -0.22 Q -0.46 -0.42 -0.26 -0.42 L 0.26 -0.42 Q 0.46 -0.42 0.46 -0.22 L 0.46 -0.08 Z" />
              <rect class="chest-body" x="-0.46" y="-0.08" width="0.92" height="0.5" />
              <rect class="chest-band" x="-0.46" y="-0.11" width="0.92" height="0.07" />
              <rect class="chest-latch" x="-0.07" y="-0.13" width="0.14" height="0.18" />
            </g>
            <g id="treasure-icon">
              <use href="#chest-icon" />
              <circle class="chest-gem" cx="0" cy="0.17" r="0.1" />
            </g>
            <g id="cart-icon">
              <rect class="chest-body" x="-0.46" y="-0.36" width="0.92" height="0.42" />
              <rect class="chest-band" x="-0.46" y="-0.2" width="0.92" height="0.06" />
              <circle class="chest-wheel" cx="-0.24" cy="0.2" r="0.17" />
              <circle class="chest-wheel" cx="0.24" cy="0.2" r="0.17" />
            </g>
            <g id="leviathan-icon">
              <path class="leviathan-shell" d="M -0.48 0.2 Q -0.4 -0.4 0 -0.42 Q 0.4 -0.4 0.48 0.2 Z" />
              <path class="leviathan-ridge" d="M -0.24 0.12 L -0.18 -0.22 M 0 0.12 L 0 -0.3 M 0.24 0.12 L 0.18 -0.22" />
              <path class="leviathan-water" d="M -0.5 0.3 Q -0.25 0.18 0 0.3 Q 0.25 0.42 0.5 0.3" />
            </g>
            <g id="ship-icon">
              <path class="chest-sail" d="M -0.04 -0.46 L -0.04 0.04 L -0.34 0.04 Z" />
              <path class="chest-sail" d="M 0.04 -0.46 L 0.04 0.04 L 0.34 0.04 Z" />
              <path class="chest-body" d="M -0.48 0.1 L 0.48 0.1 L 0.3 0.4 L -0.3 0.4 Z" />
            </g>
          </defs>
          <circle class="world" cx="0" cy="0" r={WORLD_EDGE_METERS} />
          {#each map.land as square (square.key)}
            <rect x={square.x} y={square.y} width={MAP_SQUARE_METERS} height={MAP_SQUARE_METERS} fill={square.color} />
          {/each}
          {#each map.trails as trail (trail.key)}
            {@const size = MAP_TRAIL_METERS / Math.sqrt(Math.max(zoom, 1))}
            {@const inset = (MAP_TRAIL_METERS - size) / 2}
            <rect
              class="trail"
              x={trail.x + inset}
              y={trail.y + inset}
              width={size}
              height={size}
              fill={trail.color}
              stroke-width={2 / Math.max(zoom, 1)}
            />
          {/each}
          {#each chestSpots as spot (spot.id)}
            {@const chest = map.chests.find((each) => each.id === spot.id)!}
            {#if Math.hypot(spot.x - chest.x, spot.y - chest.y) > chestMeters * MAP_CHEST_MOVED_STEP}
              <line class="chest-leader" x1={chest.x} y1={chest.y} x2={spot.x} y2={spot.y} />
              <circle class="chest-spot" cx={chest.x} cy={chest.y} r={chestMeters / 8} />
            {/if}
          {/each}
          {#each chestSpots as spot (spot.id)}
            {@const chest = map.chests.find((each) => each.id === spot.id)!}
            <g
              class="chest {chest.kind}"
              class:picked={spot.id === pickedId}
              class:hovered={spot.id === hovered?.id}
              transform="translate({spot.x} {spot.y}) scale({chestMeters})"
              role="button"
              tabindex="0"
              aria-label={chestName(chest.record.chest)}
              onclick={() => pick(spot.id)}
              onkeydown={(event) => (event.key === 'Enter' ? pick(spot.id) : undefined)}
              onpointerenter={(event) => showHover(spot.id, event.currentTarget)}
              onpointerleave={() => hideHover(spot.id)}
              onfocus={(event) => showHover(spot.id, event.currentTarget)}
              onblur={() => hideHover(spot.id)}
            >
              <rect class="chest-hit" x="-0.5" y="-0.5" width="1" height="1" />
              <g class="chest-mark"><use href="#{chest.kind}-icon" /></g>
            </g>
          {/each}
          {#if hovered !== null && hoveredChest !== undefined}
          {@const spot = chestSpots.find((each) => each.id === hovered!.id)}
          {#if spot !== undefined}
            <g class="chest hovered {hoveredChest.kind}" transform="translate({spot.x} {spot.y}) scale({chestMeters})" aria-hidden="true">
              <g class="chest-mark"><use href="#{hoveredChest.kind}-icon" /></g>
            </g>
          {/if}
        {/if}
        {#each map.marks as mark (mark.key)}
            {#if mark.kind === 'player'}
              {@const size = MAP_PLAYER_PX * metersPerPixel}
              <rect
                class="player"
                x={mark.x - size / 2}
                y={mark.y - size / 2}
                width={size}
                height={size}
                fill={mark.color}
                stroke-width={3 * metersPerPixel}
                transform={`rotate(45 ${mark.x} ${mark.y})`}
              >
                <title>{mark.label}</title>
              </rect>
            {:else if mark.kind === 'leviathan'}
              <g class="leviathan" transform="translate({mark.x} {mark.y}) scale({MAP_LEVIATHAN_PX * metersPerPixel})">
                <title>{mark.label}</title>
                <use href="#leviathan-icon" />
              </g>
            {:else}
              <text class="death" x={mark.x} y={mark.y} fill={mark.color} font-size={MAP_DEATH_PX * metersPerPixel}>✕<title>{mark.label}</title></text>
            {/if}
          {/each}
        </svg>
        {#if hovered !== null && hoveredChest !== undefined}
          {@const record = hoveredChest.record}
          {@const used = slotsUsed(record.items, snapshot.itemStacks)}
          <div
            class="chest-hover"
            style:left={hovered.isLeftOfMark ? null : `${hovered.left}px`}
            style:right={hovered.isLeftOfMark ? `${hovered.left}px` : null}
            style:top="{hovered.top}px"
            role="tooltip"
          >
            <strong>{chestName(record.chest)}</strong>
            <span class="muted">{record.builder === null ? 'Came with the world' : `Built by ${record.builder}`}</span>
            <span>{used === 0 ? 'Empty' : `${used} of ${containerGrid(record.chest, used).capacity} slots full`}</span>
            <span class="muted">Tap to look inside</span>
          </div>
        {/if}
      </div>
      <div class="map-foot">
        <span class="scale" aria-label="Scale">
          <span class="scale-bar" style:width="{scaleBar.px}px"></span>{scaleBar.label}
        </span>
        <span class="muted">{pointerLabel ?? 'Point at the map to see its spot in game coordinates'}</span>
      </div>
    </section>

    {#if picked !== undefined}
      <section class="panel" aria-labelledby="picked-title" bind:this={pickedPanel}>
        <div class="picked-head">
          <svg class="picked-icon" viewBox="-0.5 -0.5 1 1" aria-hidden="true"><use href="#chest-icon" /></svg>
          <div>
            <h2 id="picked-title" class="panel-title">{chestName(picked.record.chest).toUpperCase()}</h2>
            <p class="muted">
              {picked.record.builder === null ? 'Came with the world' : `Built by ${picked.record.builder}`} · last looked at {whenLabel(picked.record.timeUtc, timeZone, nowMs)}
            </p>
          </div>
          <button type="button" onclick={() => (pickedId = null)}>Close</button>
        </div>
        <ChestContents chest={picked.record.chest} items={picked.record.items} stacks={snapshot.itemStacks} />
      </section>
    {/if}

    <section class="panel" aria-labelledby="chests-title">
      <h2 id="chests-title" class="panel-title">CHESTS</h2>
      {#each chestList as chest (chest.id)}
        {@const kinds = Object.keys(chest.record.items).length}
        <button type="button" class="line" class:picked={chest.id === pickedId} onclick={() => pick(chest.id)}>
          <span><strong>{chestName(chest.record.chest)}</strong> <span class="muted">{chest.record.builder === null ? 'from the world' : `by ${chest.record.builder}`}</span></span>
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
                <button type="button" class="link" onclick={() => pick(chest.id)}>
                  <span class="amount">{amount.toLocaleString()}</span>
                  {chestName(chest.record.chest)}
                  <span class="muted">{chest.record.builder === null ? 'from the world' : `by ${chest.record.builder}`}</span>
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
    max-width: var(--page-width);
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

  /* Treasure chest in the legend uses the darker wood, as on the map */
  .legend-chest.treasure {
    --chest-wood: #5a3d22;
  }

  /* Chest legend uses the same drawing as the map */
  .legend-chest {
    width: 16px;
    height: 16px;
    margin-right: 6px;
    vertical-align: middle;
  }

  /* Edge of the world legend matches the dashed ring on the map */
  .edge-swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 6px;
    vertical-align: middle;
    border: 1px dashed var(--muted);
    border-radius: 50%;
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
    touch-action: pan-y;
    user-select: none;
  }

  /* Holds the map and the chest hover box drawn over it */
  .map-frame {
    position: relative;
  }

  /* A map showing less than the whole world moves with a drag, so the finger moves the map instead of the page */
  .map.movable {
    cursor: grab;
    touch-action: none;
  }

  /* Zoom buttons in one row above the map */
  .zoom-tools {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  /* The round world, slightly lighter than the space around it, with a dashed edge where the game's ocean ends */
  .world {
    fill: var(--panel);
    stroke: var(--muted);
    stroke-dasharray: 6 6;
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  /* Thin line from a chest set aside to the spot it really stands on */
  .chest-leader {
    stroke: var(--text);
    stroke-width: 1;
    opacity: 0.5;
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }

  /* Small dot on the real spot of a chest set aside */
  .chest-spot {
    fill: var(--text);
    pointer-events: none;
  }

  /* Map scale on the left and the spot under the pointer on the right, under the map */
  .map-foot {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 6px 16px;
    margin-top: 8px;
    font-size: 13px;
  }

  /* Scale bar with its distance beside it */
  .scale {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  /* The bar itself, as long as the distance it names */
  .scale-bar {
    height: 6px;
    border: 1px solid var(--text);
    border-top: 0;
  }

  /* Box beside a pointed chest with its name, who built it and how full it is */
  .chest-hover {
    position: absolute;
    z-index: 1;
    display: grid;
    gap: 2px;
    min-width: 170px;
    margin: 0 10px;
    padding: 8px 12px;
    font-size: 13px;
    background: var(--panel);
    border: 1px solid var(--line);
    box-shadow: 0 4px 14px rgb(0 0 0 / 45%);
    transform: translateY(-50%);
    pointer-events: none;
  }

  /* Player dots sit on the terrain with a dark edge so they read on light land */
  .trail {
    stroke: var(--background);
  }

  /* Chest wood is brown, or gold on the picked chest */
  .chest-lid,
  .chest-body {
    fill: var(--chest-wood, #8a5a2b);
    stroke: #2a1a0e;
    stroke-width: 0.05;
  }

  /* Chests the world came with are darker, with a gold gem */
  .chest.treasure {
    --chest-wood: #5a3d22;
  }

  /* Gem on a chest the world came with */
  .chest-gem {
    fill: var(--gold);
    stroke: #2a1a0e;
    stroke-width: 0.03;
  }

  /* Cart wheels and ship sails in iron and cloth colors */
  .chest-wheel,
  .chest-sail {
    fill: #c9c2b2;
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

  /* Each chest grows from its middle when pointed at, focused or picked, and leaves pointing to its fixed square */
  .chest-mark {
    pointer-events: none;
    transform-box: fill-box;
    transform-origin: center;
    transition: transform 0.15s ease-out;
  }

  /* The pointed chest drawn again on top of its neighbors, letting the pointer through to the real mark */
  .chest[aria-hidden='true'] {
    pointer-events: none;
  }

  /* Chests look tappable */
  .chest {
    cursor: pointer;
    outline: none;
  }

  /* Pointing at or focusing a chest makes it a bit bigger, with its hover box beside it */
  .chest.hovered .chest-mark {
    transform: scale(1.4);
  }

  /* The picked chest turns gold */
  .chest.picked {
    --chest-wood: var(--gold);
  }

  /* The picked chest stays big */
  .chest.picked .chest-mark {
    transform: scale(1.4);
  }

  /* Online players as turned squares with a dark edge */
  .player {
    stroke: var(--background);
  }

  /* Leviathan shell in sea-green with dark ridges, above a frost-blue wave */
  .leviathan-shell {
    fill: #4f7a6a;
    stroke: #1d2b26;
    stroke-width: 0.05;
  }

  /* Ridges on the Leviathan's shell */
  .leviathan-ridge {
    fill: none;
    stroke: #1d2b26;
    stroke-width: 0.05;
  }

  /* Wave under the Leviathan */
  .leviathan-water {
    fill: none;
    stroke: var(--frost);
    stroke-width: 0.07;
  }

  /* Death marks centered on the spot */
  .death {
    text-anchor: middle;
    dominant-baseline: central;
  }

  /* Invisible square that catches the pointer, so a grown chest never takes the pointer from its neighbor */
  .chest-hit {
    fill: transparent;
  }

  /* The picked chest drawn big beside its name, then who built it, and the close button at the end */
  .picked-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    margin-bottom: 12px;
  }

  /* Big chest drawing in the panel head */
  .picked-icon {
    width: 44px;
    height: 44px;
  }

  /* No gap under the title and builder line in the head */
  .picked-head h2,
  .picked-head p {
    margin: 0;
  }

  /* Buttons share the Longhouse look */
  button {
    font: inherit;
    color: var(--text);
    background: none;
    cursor: pointer;
  }

  /* A zoom button that can't zoom further is dimmed */
  .zoom-tools button:disabled {
    cursor: default;
    opacity: 0.4;
  }

  /* Close and zoom buttons look like the Saga filters */
  .picked-head button,
  .zoom-tools button {
    min-width: 36px;
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
