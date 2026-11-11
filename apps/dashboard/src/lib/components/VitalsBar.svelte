<script lang="ts">
  import type { Vitals } from '#/lib/models/snapshot';

  /** Numbers to show, and whether the player is online, so offline numbers say they are from when last seen. */
  let { vitals, isOnline }: { vitals: Vitals; isOnline: boolean } = $props();

  /** Part of the health bar that is full, from 0 to 100 percent. */
  const healthPercent = $derived(vitals.maxHealth > 0 ? Math.min(100, (vitals.health / vitals.maxHealth) * 100) : 0);
</script>

<div class="vitals" aria-label={isOnline ? 'Health now' : 'Health when last seen'}>
  <div class="health">
    <span class="muted">Health</span>
    <span class="mono">{vitals.health} / {vitals.maxHealth}</span>
  </div>
  <div class="bar" role="meter" aria-valuemin={0} aria-valuemax={vitals.maxHealth} aria-valuenow={vitals.health} aria-label="Health">
    <div class="fill" style:width="{healthPercent}%"></div>
  </div>
  <p class="numbers">
    <span><span class="muted">Stamina</span> <span class="mono stamina">{vitals.stamina}</span></span>
    {#if vitals.eitr > 0}
      <span><span class="muted">Eitr</span> <span class="mono eitr">{vitals.eitr}</span></span>
    {/if}
    {#if !isOnline}<span class="muted when">when last seen</span>{/if}
  </p>
</div>

<style>
  /* Health line, bar and the other numbers stacked tight */
  .vitals {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
  }

  /* Health label on the left, points on the right */
  .health {
    display: flex;
    justify-content: space-between;
  }

  /* Empty part of the health bar */
  .bar {
    height: 6px;
    border: 1px solid var(--line);
    background: var(--background);
  }

  /* Health left, in the color the game uses for it */
  .fill {
    height: 100%;
    background: var(--blood);
  }

  /* Stamina, eitr and the last seen note on one line */
  .numbers {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin: 0;
  }

  /* Stamina in the yellow the game uses */
  .stamina {
    color: var(--gold);
  }

  /* Eitr in the blue the game uses */
  .eitr {
    color: var(--frost);
  }

  /* Note that the numbers are old, pushed to the right */
  .when {
    margin-left: auto;
    font-size: 11px;
  }
</style>
