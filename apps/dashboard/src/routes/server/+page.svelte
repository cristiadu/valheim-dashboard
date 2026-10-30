<script lang="ts">
  import NoData from '#lib/components/NoData.svelte';
  import StatGrid from '#lib/components/StatGrid.svelte';
  import { live, useSnapshot, viewerOffsetMinutes } from '#lib/live.svelte.ts';
  import { dayPercent } from '#lib/day.ts';
  import { gigabytesLabel, serverWarnings, upStretches } from '#lib/health.ts';
  import { DAY_MS } from '#lib/models.ts';
  import { clockTime, durationLabel, isServerOnline, onlinePlayers, steamLabel, whenLabel } from '#lib/status.ts';

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
  const snapshot = $derived(getSnapshot());

  /** Problems worth a look, newest first. */
  const warnings = $derived(serverWarnings(snapshot));
</script>

{#if snapshot.lastLineUtc === null}
  <NoData />
{:else if live.nowMs !== null}
  {@const nowMs = live.nowMs}
  {@const offset = viewerOffsetMinutes(nowMs)}
  {@const isUp = isServerOnline(snapshot, nowMs)}
  {@const lastSave = snapshot.saves.at(-1)}
  {@const startMs = nowMs - DAY_MS}
  {@const upParts = upStretches(snapshot, nowMs)}
  <div class="server">
    <StatGrid
      stats={[
        { label: 'Status', value: isUp ? 'Online' : 'Offline' },
        { label: 'Up for', value: isUp && snapshot.startedUtc ? durationLabel(nowMs - Date.parse(snapshot.startedUtc)) : '–' },
        { label: 'Players online', value: String(onlinePlayers(snapshot, nowMs).length) },
        { label: 'Last log line', value: whenLabel(snapshot.lastLineUtc, offset, nowMs) },
        { label: 'Last save', value: lastSave ? `${whenLabel(lastSave.timeUtc, offset, nowMs)} · ${lastSave.durationMs} ms` : '–' },
        { label: 'Disk free', value: snapshot.diskSpace ? gigabytesLabel(snapshot.diskSpace.availableBytes) : '–' },
        { label: 'Game version', value: snapshot.version ?? '–' },
        { label: 'Steam', value: steamLabel(snapshot.isGameServerConnected) },
      ]}
    />

    <section class="panel" aria-labelledby="uptime-title">
      <h2 id="uptime-title" class="panel-title">UPTIME, LAST 24 HOURS</h2>
      <div class="bar" role="img" aria-label="Server up {upParts.map((part) => `${clockTime(new Date(part.startMs).toISOString(), offset)} to ${clockTime(new Date(part.endMs).toISOString(), offset)}`).join(', ') || 'never in the last 24 hours'}">
        {#each upParts as part (part.startMs)}
          <div class="up" style:left={dayPercent(part.startMs, startMs)} style:width="max(2px, {dayPercent(part.endMs, part.startMs)})"></div>
        {/each}
      </div>
      <div class="axis mono muted">
        <span>{clockTime(new Date(startMs).toISOString(), offset)} yesterday</span>
        <span>now</span>
      </div>
      <p class="muted"><span class="swatch" aria-hidden="true"></span>Up. Gaps mean no log lines, or before the dashboard started.</p>
    </section>

    <section class="panel" aria-labelledby="warnings-title">
      <h2 id="warnings-title" class="panel-title">WARNINGS</h2>
      {#each warnings as warning (warning.timeUtc + warning.text)}
        <div class="line">
          <span class="mono muted">{whenLabel(warning.timeUtc, offset, nowMs)}</span>
          <span>{warning.text}</span>
        </div>
      {:else}
        <p class="muted">No warnings.</p>
      {/each}
    </section>
  </div>
{/if}

<style>
  /* Sections stacked with even space */
  .server {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 1000px;
  }

  /* Uptime track */
  .bar {
    position: relative;
    height: 22px;
    border: 1px solid var(--line);
    background: var(--background);
  }

  /* A stretch of time the server was up */
  .up,
  .swatch {
    background: var(--good);
  }

  /* Up stretch placed on the track */
  .up {
    position: absolute;
    top: 0;
    bottom: 0;
  }

  /* Start and end times under the track */
  .axis {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
  }

  /* Legend under the track */
  p {
    margin: 10px 0 0;
  }

  /* Legend color */
  .swatch {
    display: inline-block;
    width: 14px;
    height: 8px;
    margin-right: 6px;
  }

  /* One warning: time, then the sentence */
  .line {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    gap: 12px;
    padding: 9px 0;
    border-top: 1px solid var(--line-soft);
  }
</style>
