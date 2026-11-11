<script lang="ts">
  import LogLines from '#/lib/components/LogLines';
  import type { Snapshot } from '#/lib/models/snapshot';
  import Pager from '#/lib/components/Pager';
  import { SAVE_PAGE_SIZE } from '#/lib/models/pages';
  import { linesAt, serverSource } from '#/lib/sources';
  import { whenLabel } from '#/lib/time';

  /** The snapshot the saves come from, the viewer's time zone, and the page clock. */
  let { snapshot, timeZone, nowMs }: { snapshot: Snapshot; timeZone: string; nowMs: number } = $props();

  /** Saves, newest first. */
  const saves = $derived(snapshot.saves.toReversed());

  /** Backups, newest first. */
  const backups = $derived(snapshot.backups.toReversed());
</script>

<div class="columns">
  <section class="panel" aria-labelledby="saves-title">
    <h2 id="saves-title" class="panel-title">SAVES</h2>
    <p class="muted">The server saves the world every 10 minutes.</p>
    <Pager items={saves} size={SAVE_PAGE_SIZE}>
      {#snippet children(items)}
        <div>
          {#each items as save (save.timeUtc)}
            <LogLines title="Save at {whenLabel(save.timeUtc, timeZone, nowMs)}" source={linesAt(serverSource(snapshot, 'saves').lines, save.timeUtc)}>
              <span class="line">
                <span>{whenLabel(save.timeUtc, timeZone, nowMs)}</span>
                <span class="mono muted">{save.saveNumber === null ? '' : `save ${save.saveNumber} · `}{save.durationMs} ms</span>
              </span>
            </LogLines>
          {:else}
            <p class="muted">No save yet in this log.</p>
          {/each}
        </div>
      {/snippet}
    </Pager>
  </section>

  <section class="panel" aria-labelledby="backups-title">
    <h2 id="backups-title" class="panel-title">AUTO BACKUPS</h2>
    <p class="muted">The game keeps a few older copies of the world.</p>
    <Pager items={backups} size={SAVE_PAGE_SIZE}>
      {#snippet children(items)}
        <div>
          {#each items as backup (backup.timeUtc)}
            <LogLines title="Backup {backup.backup}" source={linesAt(serverSource(snapshot, 'backups').lines, backup.timeUtc)}>
              <span class="line">
                <span>{whenLabel(backup.timeUtc, timeZone, nowMs)}</span>
                <code class="mono muted">{backup.backup}</code>
              </span>
            </LogLines>
          {:else}
            <p class="muted">No backup yet in this log.</p>
          {/each}
        </div>
      {/snippet}
    </Pager>
  </section>
</div>

<style>
  /* Saves and backups side by side, stacking when there is no room */
  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
    gap: 22px;
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
