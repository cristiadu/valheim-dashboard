<script lang="ts">
  import ChestHover from '#/lib/components/map/ChestHover';
  import MapIcons from '#/lib/components/map/MapIcons';
  import { chestName } from '#/lib/items';
  import { chestSpotsOf, spotLabelOf } from '#/lib/map';
  import {
    type ChestHoverSpot,
    MAP_CHEST_MIN_PX,
    MAP_CHEST_MOVED_STEP,
    MAP_CHEST_PX,
    MAP_CHEST_SMALL_PX,
    MAP_DEATH_PX,
    MAP_DRAG_PX,
    MAP_LEVIATHAN_PX,
    MAP_PLAYER_PX,
    MAP_SQUARE_METERS,
    MAP_TRAIL_METERS,
    MAP_WORLD_BOX,
    MAP_ZOOM_STEP,
    type MapBox,
    type MapView,
    WORLD_EDGE_METERS,
  } from '#/lib/models';
  import { pannedBox, scaleBarOf, squareBoxOf, zoomedBox, zoomOf } from '#/lib/zoom';

  /** What the map draws, the most of each item one slot holds, the open chest's ID, and what to do when one is tapped. */
  let {
    map,
    stacks,
    pickedId,
    onpick,
  }: { map: MapView; stacks: Record<string, number>; pickedId: string | null; onpick: (id: string) => void } = $props();

  /** Part of the map in view after zooming or moving, or null before the viewer touched it. */
  let zoomBox = $state<MapBox | null>(null);

  /** Part of the map in view: the explored land until the viewer zooms or moves, out to the whole world at most. */
  const box = $derived(zoomBox ?? squareBoxOf(map.box));

  /** How many times the view zooms into the explored land, below 1 when it shows more of the world. */
  const zoom = $derived(zoomOf(box, map.box));

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

  /** Size of a trail mark, in meters: it shrinks as the map zooms in, so close trails stay apart. */
  const trailMeters = $derived(MAP_TRAIL_METERS / Math.sqrt(Math.max(zoom, 1)));

  /**
   * Each chest with where its mark sits at this zoom: marks keep their size on screen, so they spread less when
   * zoomed. When the view shows more than the explored land, each mark stays on its real spot, as spreading them
   * would push them far from where they stand.
   */
  const placed = $derived.by(() => {
    const spots = zoom < 1 ? map.chests.map(({ id, x, y }) => ({ id, x, y })) : chestSpotsOf(map.chests, chestMeters);
    const chests = new Map(map.chests.map((chest) => [chest.id, chest]));
    return spots.map((spot) => ({ spot, chest: chests.get(spot.id)! }));
  });

  /** Scale bar under the map. */
  const scaleBar = $derived(scaleBarOf(metersPerPixel));

  /** Game coordinates of the spot under the pointer, or null when the pointer is off the map. */
  let pointerLabel = $state<string | null>(null);

  /** Chest under the pointer or focused, and where its hover box sits over the map. */
  let hovered = $state<ChestHoverSpot | null>(null);

  /** The hovered chest and its mark, while the chest still exists. */
  const hoveredPlace = $derived(hovered === null ? undefined : placed.find(({ spot }) => spot.id === hovered!.id));

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

  /** Ends a press, so the next tap on a chest opens it. */
  const onPointerUp = (): void => {
    press = null;
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
</script>

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
    <MapIcons />
    <circle class="world" cx="0" cy="0" r={WORLD_EDGE_METERS} />
    {#each map.land as square (square.key)}
      <rect x={square.x} y={square.y} width={MAP_SQUARE_METERS} height={MAP_SQUARE_METERS} fill={square.color} />
    {/each}
    {#each map.trails as trail (trail.key)}
      {@const inset = (MAP_TRAIL_METERS - trailMeters) / 2}
      <rect
        class="trail"
        x={trail.x + inset}
        y={trail.y + inset}
        width={trailMeters}
        height={trailMeters}
        fill={trail.color}
        stroke-width={2 / Math.max(zoom, 1)}
      />
    {/each}
    {#each placed as { spot, chest } (spot.id)}
      {#if Math.hypot(spot.x - chest.x, spot.y - chest.y) > chestMeters * MAP_CHEST_MOVED_STEP}
        <line class="chest-leader" x1={chest.x} y1={chest.y} x2={spot.x} y2={spot.y} />
        <circle class="chest-spot" cx={chest.x} cy={chest.y} r={chestMeters / 8} />
      {/if}
    {/each}
    {#each placed as { spot, chest } (spot.id)}
      <g
        class="chest {chest.kind}"
        class:picked={spot.id === pickedId}
        class:hovered={spot.id === hovered?.id}
        transform="translate({spot.x} {spot.y}) scale({chestMeters})"
        role="button"
        tabindex="0"
        aria-label={chestName(chest.record.chest)}
        onclick={() => onpick(spot.id)}
        onkeydown={(event) => (event.key === 'Enter' ? onpick(spot.id) : undefined)}
        onpointerenter={(event) => showHover(spot.id, event.currentTarget)}
        onpointerleave={() => hideHover(spot.id)}
        onfocus={(event) => showHover(spot.id, event.currentTarget)}
        onblur={() => hideHover(spot.id)}
      >
        <rect class="chest-hit" x="-0.5" y="-0.5" width="1" height="1" />
        <g class="chest-mark"><use href="#{chest.kind}-icon" /></g>
      </g>
    {/each}
    {#if hoveredPlace !== undefined}
      {@const { spot, chest } = hoveredPlace}
      <g class="chest hovered {chest.kind}" transform="translate({spot.x} {spot.y}) scale({chestMeters})" aria-hidden="true">
        <g class="chest-mark"><use href="#{chest.kind}-icon" /></g>
      </g>
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
  {#if hovered !== null && hoveredPlace !== undefined}
    <ChestHover chest={hoveredPlace.chest} spot={hovered} {stacks} />
  {/if}
</div>
<div class="map-foot">
  <span class="scale" aria-label="Scale">
    <span class="scale-bar" style:width="{scaleBar.px}px"></span>{scaleBar.label}
  </span>
  <span class="muted">{pointerLabel ?? 'Point at the map to see its spot in game coordinates'}</span>
</div>

<style>
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

  /* Player dots sit on the terrain with a dark edge so they read on light land */
  .trail {
    stroke: var(--background);
  }

  /* Chests the world came with are darker, with a gold gem */
  .chest.treasure {
    --chest-wood: #5a3d22;
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

  /* Death marks centered on the spot */
  .death {
    text-anchor: middle;
    dominant-baseline: central;
  }

  /* Invisible square that catches the pointer, so a grown chest never takes the pointer from its neighbor */
  .chest-hit {
    fill: transparent;
  }

  /* Zoom buttons in the Longhouse look, like the Saga filters */
  .zoom-tools button {
    min-width: 36px;
    min-height: 36px;
    padding: 0 14px;
    font: inherit;
    color: var(--text);
    background: none;
    border: 1px solid var(--line);
    cursor: pointer;
  }

  /* A zoom button that can't zoom further is dimmed */
  .zoom-tools button:disabled {
    cursor: default;
    opacity: 0.4;
  }
</style>
