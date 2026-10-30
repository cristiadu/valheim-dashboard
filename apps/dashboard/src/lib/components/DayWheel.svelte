<script lang="ts">
  import { arcPath, clip, hourOfDay, wheelPoint } from '#/src/lib/day.ts';
  import {
    DAY_MS,
    HOURS_PER_DAY,
    PLAYER_COLORS,
    type Player,
    type Snapshot,
    WHEEL_CENTER,
    WHEEL_HAND_RADIUS,
    WHEEL_LONG_TICK_RADIUS,
    WHEEL_OUTER_RING_RADIUS,
    WHEEL_RIM_RADIUS,
    WHEEL_RING_STEP,
    WHEEL_SHORT_TICK_RADIUS,
    WHEEL_SIZE,
  } from '#/src/lib/models.ts';
  import { sessionEndMs } from '#/src/lib/players.ts';
  import { clockTime } from '#/src/lib/status.ts';

  /** Players to draw, the snapshot, the clock and the viewer's offset from UTC in minutes. */
  let { players, snapshot, nowMs, offsetMinutes }: {
    players: Player[];
    snapshot: Snapshot;
    nowMs: number;
    offsetMinutes: number;
  } = $props();

  /** Hour ticks around the edge, longer every 6 hours. */
  const ticks = Array.from({ length: HOURS_PER_DAY }, (_, hour) => {
    const [x1, y1] = wheelPoint(hour, WHEEL_RIM_RADIUS);
    const [x2, y2] = wheelPoint(hour, hour % 6 === 0 ? WHEEL_LONG_TICK_RADIUS : WHEEL_SHORT_TICK_RADIUS);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }).join(' ');

  /** One ring per player, with an arc for each part of a session in the last 24 hours. */
  const rings = $derived(
    players.slice(0, PLAYER_COLORS.length).map((player, index) => ({
      player,
      arcs: player.sessions.flatMap((session) => {
        const part = clip(Date.parse(session.startUtc), sessionEndMs(session, snapshot, nowMs), nowMs - DAY_MS, nowMs);
        if (part === null) {
          return [];
        }
        const label = `${player.character} ${clockTime(new Date(part.startMs).toISOString(), offsetMinutes)} to ${clockTime(new Date(part.endMs).toISOString(), offsetMinutes)}`;
        const path = arcPath(hourOfDay(part.startMs, offsetMinutes), hourOfDay(part.endMs, offsetMinutes), WHEEL_OUTER_RING_RADIUS - index * WHEEL_RING_STEP);
        return [{ path, label }];
      }),
    })),
  );

  /** Clock hand pointing at now. */
  const hand = $derived.by(() => {
    const [x, y] = wheelPoint(hourOfDay(nowMs, offsetMinutes), WHEEL_HAND_RADIUS);
    return `M ${WHEEL_CENTER} ${WHEEL_CENTER} L ${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  /** Screen reader text listing every arc. */
  const description = $derived(
    rings.flatMap((ring) => ring.arcs.map((arc) => arc.label)).join(', ') || 'Nobody played in the last 24 hours',
  );
</script>

<svg viewBox="0 0 {WHEEL_SIZE} {WHEEL_SIZE}" role="img" aria-label="Who was online in the last 24 hours: {description}">
  <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={WHEEL_RIM_RADIUS} class="rim" />
  <path d={ticks} class="tick" />
  {#each rings as ring (ring.player.key)}
    {#each ring.arcs as arc (arc.path)}
      <path d={arc.path} class="arc" style:stroke={ring.player.color}><title>{arc.label}</title></path>
    {/each}
  {/each}
  <path d={hand} class="hand" />
  <text x="150" y="11" text-anchor="middle">00</text>
  <text x="294" y="154" text-anchor="end">06</text>
  <text x="150" y="298" text-anchor="middle">12</text>
  <text x="6" y="154">18</text>
  <text x="150" y="190" text-anchor="middle" class="now">{clockTime(new Date(nowMs).toISOString(), offsetMinutes)}</text>
</svg>
<ul class="legend">
  {#each players as player (player.key)}
    <li><span aria-hidden="true" style:background={player.color}></span>{player.character}</li>
  {/each}
</ul>

<style>
  /* Wheel fills its panel up to 300px */
  svg {
    display: block;
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
  }

  /* Outer circle */
  .rim {
    fill: none;
    stroke: var(--line);
  }

  /* Hour marks */
  .tick {
    stroke: #5a4e3c;
  }

  /* Session arcs: thin, colored by player */
  .arc {
    fill: none;
    stroke-width: 10;
  }

  /* Hover target feedback on an arc */
  .arc:hover {
    stroke-width: 13;
  }

  /* Hand pointing at now */
  .hand {
    stroke: var(--text);
    stroke-width: 1.5;
  }

  /* Hour labels */
  text {
    fill: var(--muted);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  /* Time now, under the center */
  .now {
    fill: var(--text);
    font-family: var(--font-heading);
    font-size: 20px;
  }

  /* Player names with their colors */
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
  }

  /* Color swatch beside each name */
  .legend span {
    display: inline-block;
    width: 14px;
    height: 4px;
    margin-right: 6px;
    vertical-align: middle;
  }
</style>
