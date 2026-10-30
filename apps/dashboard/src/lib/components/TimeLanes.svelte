<script lang="ts">
  import { clip } from '#lib/day.ts';
  import { DAY_MS, type Player, type Snapshot } from '#lib/models.ts';
  import { sessionEndMs } from '#lib/players.ts';
  import { clockTime } from '#lib/status.ts';

  /** Players to draw, the snapshot, the clock and the viewer's offset from UTC in minutes. */
  let { players, snapshot, nowMs, offsetMinutes }: {
    players: Player[];
    snapshot: Snapshot;
    nowMs: number;
    offsetMinutes: number;
  } = $props();

  /** Hours between axis labels. */
  const AXIS_STEP_HOURS = 4;

  /** Start of the last 24 hours. */
  const startMs = $derived(nowMs - DAY_MS);

  /** Clock time of [ms] in the viewer's zone. */
  const clockAt = (ms: number): string => clockTime(new Date(ms).toISOString(), offsetMinutes);

  /** Axis labels from 24 hours ago to now. */
  const axis = $derived(
    Array.from({ length: 24 / AXIS_STEP_HOURS + 1 }, (_, i) => clockAt(startMs + (i * DAY_MS * AXIS_STEP_HOURS) / 24)),
  );

  /** One lane per player, with a bar for each part of a session in the last 24 hours. */
  const lanes = $derived(
    players.map((player) => ({
      player,
      bars: player.sessions.flatMap((session) => {
        const part = clip(Date.parse(session.startUtc), sessionEndMs(session, snapshot, nowMs), startMs, nowMs);
        return part === null
          ? []
          : [
              {
                left: `${((part.startMs - startMs) / DAY_MS) * 100}%`,
                width: `max(3px, ${((part.endMs - part.startMs) / DAY_MS) * 100}%)`,
                label: `${player.character}: ${clockAt(part.startMs)} to ${clockAt(part.endMs)}`,
              },
            ];
      }),
    })),
  );
</script>

<div class="scroll">
  <div class="chart">
    <div class="row">
      <span></span>
      <div class="axis mono">
        {#each axis as label, i (i)}<span>{label}</span>{/each}
      </div>
    </div>
    {#each lanes as lane (lane.player.key)}
      <div class="row lane">
        <span class="name">{lane.player.character}</span>
        <div class="track">
          {#each lane.bars as bar (bar.left)}
            <div class="bar" title={bar.label} aria-label={bar.label} role="img" style:left={bar.left} style:width={bar.width} style:background={lane.player.color}></div>
          {:else}
            <span class="muted empty">Not online in the last 24 hours</span>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  /* Scrolls sideways on phones instead of squeezing the lanes */
  .scroll {
    overflow-x: auto;
  }

  /* Lanes need room to read the times */
  .chart {
    min-width: 620px;
  }

  /* Name column, then the lane */
  .row {
    display: grid;
    grid-template-columns: 130px minmax(0, 1fr);
    gap: 12px;
    align-items: center;
  }

  /* Each lane gets a thin rule above it */
  .lane {
    padding: 6px 0;
    border-top: 1px solid var(--line-soft);
  }

  /* Times along the top */
  .axis {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    color: var(--muted);
    font-size: 11px;
  }

  /* Player name, cut with an ellipsis when long */
  .name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Lane with faint lines every 2 hours */
  .track {
    position: relative;
    height: 26px;
    background: repeating-linear-gradient(90deg, var(--selected) 0 1px, transparent 1px calc(100% / 12));
  }

  /* One session */
  .bar {
    position: absolute;
    top: 5px;
    height: 16px;
  }

  /* Text when the lane is empty */
  .empty {
    position: absolute;
    top: 4px;
    left: 6px;
  }
</style>
