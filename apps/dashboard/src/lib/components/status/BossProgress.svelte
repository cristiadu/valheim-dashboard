<script lang="ts">
  import { seenBosses } from '#/lib/bosses';
  import LogLines from '#/lib/components/LogLines';
  import Pill from '#/lib/components/Pill';
  import type { Snapshot } from '#/lib/models/snapshot';
  import { bossPill } from '#/lib/pills';
  import { serverSource } from '#/lib/sources';

  /** The snapshot the bosses come from. */
  let { snapshot }: { snapshot: Snapshot } = $props();
</script>

<section class="panel" aria-labelledby="bosses-title">
  <h2 id="bosses-title" class="panel-title">BOSSES</h2>
  <ol class="bosses">
    {#each seenBosses(snapshot) as boss (boss)}
      {@const isDefeated = snapshot.defeatedBosses.includes(boss)}
      <li class:defeated={isDefeated}>
        {#if isDefeated}
          <LogLines title="{boss} defeated" source={serverSource(snapshot, 'boss', boss)} emptyText="Read from the world save. The log has no line for it, since it happened before the log was kept.">
            <span class="boss">
              <span>{boss}</span>
              <span><Pill pill={bossPill(isDefeated)} /></span>
            </span>
          </LogLines>
        {:else}
          <span>{boss}</span>
          <span><Pill pill={bossPill(isDefeated)} /></span>
        {/if}
      </li>
    {:else}
      <li class="muted">Nobody has met a boss yet.</li>
    {/each}
  </ol>
</section>

<style>
  /* Bosses in a row that wraps on narrow screens */
  .bosses {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 130px), 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* One boss: name above its state */
  .bosses li {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--line);
  }

  /* A defeated boss opens its log lines, with the same name-above-state layout */
  .boss {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  /* A defeated boss stands out in gold */
  .bosses li.defeated {
    border-color: var(--gold);
    color: var(--gold);
  }
</style>
