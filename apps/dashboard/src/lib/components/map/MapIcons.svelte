<svelte:options namespace="svg" />

<!-- Drawings of chests, carts, ships and the Leviathan, drawn once and placed on the map and in its legend with <use>. -->
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

<style>
  /* Chest wood is brown, or gold on the picked chest */
  .chest-lid,
  .chest-body {
    fill: var(--chest-wood, #8a5a2b);
    stroke: #2a1a0e;
    stroke-width: 0.05;
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
</style>
