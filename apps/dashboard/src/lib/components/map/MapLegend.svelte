<script lang="ts">
  import { MAP_CHEST_LEGEND, TERRAIN_STYLES } from '#/lib/models/map';
  import type { Player } from '#/lib/models/players';

  /** Players with their map colors, and the terrain letters of the explored squares. */
  let { players, terrain }: { players: Player[]; terrain: Record<string, string> } = $props();

  /** Terrain kinds on the explored squares, in legend order. */
  const terrainKinds = $derived(
    Object.entries(TERRAIN_STYLES).filter(([letter]) => Object.values(terrain).includes(letter)),
  );
</script>

<div class="legend">
  {#each players as player (player.key)}
    <span><span class="swatch" style:background={player.color}></span>{player.character}</span>
  {/each}
  {#each MAP_CHEST_LEGEND as [kind, name] (kind)}
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

<style>
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
</style>
