<script lang="ts">
  import LogLines from '#/lib/components/LogLines';
  import NoData from '#/lib/components/NoData';
  import Pill from '#/lib/components/Pill';
  import StatGrid from '#/lib/components/StatGrid';
  import { live, useSnapshot } from '#/lib/live.svelte';
  import { BOSS_ORDER, LATEST_SAVE_COUNT } from '#/lib/models';
  import { bossPill } from '#/lib/pills';
  import { linesAt, serverSource } from '#/lib/sources';
  import { viewerTimeZone, whenLabel } from '#/lib/status';

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
  const snapshot = $derived(getSnapshot());

  /** Latest saves, newest first. */
  const saves = $derived(snapshot.saves.slice(-LATEST_SAVE_COUNT).reverse());

  /** Backups, newest first. */
  const backups = $derived(snapshot.backups.toReversed());

  /** Average save time in milliseconds, or null without saves. */
  const averageMs = $derived(
    snapshot.saves.length === 0 ? null : snapshot.saves.reduce((sum, save) => sum + save.durationMs, 0) / snapshot.saves.length,
  );
</script>

{#if snapshot.lastLineUtc === null}
  <NoData />
{:else if live.nowMs !== null}
  {@const nowMs = live.nowMs}
  {@const timeZone = viewerTimeZone()}
  <div class="world">
    <StatGrid
      stats={[
        { label: 'World', value: snapshot.world ?? 'Not in this log', source: serverSource(snapshot, 'runs') },
        { label: 'In-game day', value: snapshot.day === null ? '–' : String(snapshot.day), source: serverSource(snapshot, 'day') },
        { label: 'Saves seen', value: String(snapshot.saves.length), source: serverSource(snapshot, 'saves') },
        { label: 'Average save time', value: averageMs === null ? '–' : `${Math.round(averageMs)} ms`, source: serverSource(snapshot, 'saves') },
        { label: 'Backups seen', value: String(snapshot.backups.length), source: serverSource(snapshot, 'backups') },
      ]}
    />

    <section class="panel" aria-labelledby="bosses-title">
      <h2 id="bosses-title" class="panel-title">BOSSES</h2>
      <ol class="bosses">
        {#each BOSS_ORDER as boss (boss)}
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
        {/each}
      </ol>
    </section>

    <section class="panel" aria-labelledby="saves-title">
      <h2 id="saves-title" class="panel-title">LATEST SAVES</h2>
      <p class="muted">The server saves the world every 10 minutes.</p>
      {#each saves as save (save.timeUtc)}
        <LogLines title="Save at {whenLabel(save.timeUtc, timeZone, nowMs)}" source={linesAt(serverSource(snapshot, 'saves').lines, save.timeUtc)}>
          <span class="line">
            <span>{whenLabel(save.timeUtc, timeZone, nowMs)}</span>
            <span class="mono muted">{save.saveNumber === null ? '' : `save ${save.saveNumber} · `}{save.durationMs} ms</span>
          </span>
        </LogLines>
      {:else}
        <p class="muted">No save yet in this log.</p>
      {/each}
    </section>

    <section class="panel" aria-labelledby="backups-title">
      <h2 id="backups-title" class="panel-title">AUTO BACKUPS</h2>
      {#each backups as backup (backup.timeUtc)}
        <LogLines title="Backup {backup.backup}" source={linesAt(serverSource(snapshot, 'backups').lines, backup.timeUtc)}>
          <span class="line">
            <span>{whenLabel(backup.timeUtc, timeZone, nowMs)}</span>
            <code class="mono muted">{backup.backup}</code>
          </span>
        </LogLines>
      {:else}
        <p class="muted">No backup yet in this log.</p>
      {/each}
    </section>
  </div>
{/if}

<style>
  /* Sections stacked with even space */
  .world {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 1000px;
  }

  /* Text under a panel title */
  p {
    margin: 0 0 10px;
  }

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

  /* One save or backup: time on the left, details on the right */
  .line {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 16px;
    padding: 9px 0;
    border-top: 1px solid var(--line-soft);
  }
</style>
