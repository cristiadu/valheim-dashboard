<script lang="ts">
  import { tick } from 'svelte';

  import NoData from '#/lib/components/NoData';
  import ChestList from '#/lib/components/map/ChestList';
  import MapLegend from '#/lib/components/map/MapLegend';
  import PickedChest from '#/lib/components/map/PickedChest';
  import StoredItems from '#/lib/components/map/StoredItems';
  import WorldMap from '#/lib/components/map/WorldMap';
  import { live, useSnapshot } from '#/lib/live.svelte';
  import { mapOf } from '#/lib/map';
  import { MAP_SQUARE_METERS } from '#/lib/models/map';
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

  /** What the map draws. */
  const map = $derived(mapOf(snapshot, players));

  /** ID of the chest tapped on the map or picked in a list, or null when none is open. */
  let pickedId = $state<string | null>(null);

  /** Chest picked on the map or in a list, while it still exists. */
  const picked = $derived(map?.chests.find((chest) => chest.id === pickedId));

  /** Panel that shows the picked chest. */
  let pickedPanel = $state<HTMLElement>();

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
  <div class="map-page">
    <section class="panel" aria-labelledby="map-title">
      <h2 id="map-title" class="panel-title">WHERE EVERYONE HAS BEEN</h2>
      <p class="muted">
        Each square is {MAP_SQUARE_METERS} m of land someone walked, in its terrain color, with a dot for each player who
        was there. North is up, and spots match the game's own coordinates. Point at a chest to see what it is, and
        tap it to look inside. Zoom with the wheel, the buttons or a double tap, and drag to move around.
      </p>
      <MapLegend {players} terrain={snapshot.terrain} />
      <WorldMap {map} stacks={snapshot.itemStacks} {pickedId} onpick={pick} />
    </section>
    {#if picked !== undefined}
      <PickedChest
        bind:panel={pickedPanel}
        chest={picked}
        stacks={snapshot.itemStacks}
        {timeZone}
        nowMs={live.nowMs}
        onclose={() => (pickedId = null)}
      />
    {/if}
    <ChestList chests={map.chests} {pickedId} onpick={pick} />
    <StoredItems chests={map.chests} onpick={pick} />
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

  /* Text under the panel title */
  p {
    margin: 0 0 10px;
  }
</style>
