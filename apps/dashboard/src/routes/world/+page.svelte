<script lang="ts">
  import NoData from '#lib/components/NoData.svelte';
  import StatGrid from '#lib/components/StatGrid.svelte';
  import { live, useSnapshot, viewerOffsetMinutes } from '#lib/live.svelte.ts';
  import { LATEST_SAVE_COUNT } from '#lib/models.ts';
  import { whenLabel } from '#lib/status.ts';

  /** Current snapshot from the layout. */
  const getSnapshot = useSnapshot();
  const snapshot = $derived(getSnapshot());

  /** Latest saves and backups, newest first. */
  const saves = $derived(snapshot.saves.slice(-LATEST_SAVE_COUNT).reverse());
  const backups = $derived(snapshot.backups.toReversed());

  /** Average save time in milliseconds, or null without saves. */
  const averageMs = $derived(
    snapshot.saves.length === 0 ? null : snapshot.saves.reduce((sum, s) => sum + s.durationMs, 0) / snapshot.saves.length,
  );
</script>

{#if snapshot.lastLineUtc === null}
  <NoData />
{:else if live.nowMs !== null}
  {@const nowMs = live.nowMs}
  {@const offset = viewerOffsetMinutes(nowMs)}
  <div class="world">
    <StatGrid
      stats={[
        { label: 'World', value: snapshot.world ?? 'Not in this log' },
        { label: 'Saves seen', value: String(snapshot.saves.length) },
        { label: 'Average save time', value: averageMs === null ? '–' : `${Math.round(averageMs)} ms` },
        { label: 'Backups seen', value: String(snapshot.backups.length) },
      ]}
    />

    <section class="panel" aria-labelledby="saves-title">
      <h2 id="saves-title" class="panel-title">LATEST SAVES</h2>
      <p class="muted">The server saves the world every 10 minutes.</p>
      {#each saves as save (save.timeUtc)}
        <div class="line">
          <span>{whenLabel(save.timeUtc, offset, nowMs)}</span>
          <span class="mono muted">{save.saveNumber === null ? '' : `save ${save.saveNumber} · `}{save.durationMs} ms</span>
        </div>
      {:else}
        <p class="muted">No save yet in this log.</p>
      {/each}
    </section>

    <section class="panel" aria-labelledby="backups-title">
      <h2 id="backups-title" class="panel-title">AUTO BACKUPS</h2>
      {#each backups as backup (backup.timeUtc)}
        <div class="line">
          <span>{whenLabel(backup.timeUtc, offset, nowMs)}</span>
          <code class="mono muted">{backup.backup}</code>
        </div>
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
