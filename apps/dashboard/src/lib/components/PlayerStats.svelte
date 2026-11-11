<script lang="ts">
  import { resolve } from '$app/paths';

  import LogLines from '#/lib/components/LogLines';
  import type { PlayerStat } from '#/lib/models/players';
  import { STORY_STYLES } from '#/lib/models/story';

  /** Numbers to show and the character they are about, which names each list of log lines. */
  let { stats, character }: { stats: PlayerStat[]; character: string } = $props();
</script>

{#snippet statBody(stat: PlayerStat)}
  <span class="stat">
    <span class="rune" aria-hidden="true" style:color={STORY_STYLES[stat.kind].color} style:border-color={STORY_STYLES[stat.kind].color}>{STORY_STYLES[stat.kind].rune}</span>
    <span class="value mono">{stat.value}</span>
    <span class="label muted">{stat.label}</span>
  </span>
{/snippet}

<ul class="stats">
  {#each stats as stat (stat.label)}
    <li>
      {#if stat.source}
        <LogLines title="{character}: {stat.label.toLowerCase()}" source={stat.source}>{@render statBody(stat)}</LogLines>
      {:else}
        <a class="plain" href={resolve('/map')} title="See it on the Map">{@render statBody(stat)}</a>
      {/if}
    </li>
  {/each}
</ul>

<style>
  /* Numbers in as many columns as fit, at least two, without bullets */
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(50% - 4px, 130px), 1fr));
    gap: 10px 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Land explored link looks like the other numbers */
  .plain {
    color: inherit;
    text-decoration: none;
  }

  /* One number: rune on the left, value above its label */
  .stat {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr);
    column-gap: 8px;
    align-items: center;
  }

  /* Rune box in the color of what it counts, as on the Saga tab */
  .rune {
    grid-row: span 2;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border: 1px solid;
    font-family: var(--font-rune);
    font-size: 13px;
  }

  /* Number value */
  .value {
    font-size: 15px;
    line-height: 1.2;
  }

  /* Number label */
  .label {
    font-size: 11px;
    letter-spacing: 0.04em;
  }
</style>
