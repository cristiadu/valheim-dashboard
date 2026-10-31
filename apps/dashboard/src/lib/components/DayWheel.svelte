<script lang="ts">
  import { arcPath, dayParts, hourOfDay, wedgePath, wheelPoint } from '#/lib/day';
  import {
    HOURS_PER_DAY,
    PLAYER_COLORS,
    type Player,
    type Snapshot,
    WHEEL_CENTER,
    WHEEL_DAY_LABEL_RADIUS,
    WHEEL_HAND_RADIUS,
    WHEEL_LONG_TICK_RADIUS,
    WHEEL_MIN_LABEL_HOURS,
    WHEEL_OUTER_RING_RADIUS,
    WHEEL_RIM_RADIUS,
    WHEEL_RING_STEP,
    WHEEL_SHORT_TICK_RADIUS,
    WHEEL_SIZE,
  } from '#/lib/models';
  import { sessionEndMs } from '#/lib/players';
  import { clockTime } from '#/lib/status';

  /** Players to draw, the snapshot, the clock and the viewer's time zone. */
  let { players, snapshot, nowMs, timeZone }: {
    players: Player[];
    snapshot: Snapshot;
    nowMs: number;
    timeZone: string;
  } = $props();

  /** Hour ticks around the edge, longer every 6 hours. */
  const ticks = Array.from({ length: HOURS_PER_DAY }, (_, hour) => {
    const [x1, y1] = wheelPoint(hour, WHEEL_RIM_RADIUS);
    const [x2, y2] = wheelPoint(hour, hour % 6 === 0 ? WHEEL_LONG_TICK_RADIUS : WHEEL_SHORT_TICK_RADIUS);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }).join(' ');

  /**
   * One ring per player, with an arc for each part of a session in the last 24 hours. A session that crosses
   * midnight is split so the part from yesterday can be drawn faded.
   */
  const rings = $derived(
    players.slice(0, PLAYER_COLORS.length).map((player, index) => ({
      player,
      arcs: player.sessions.flatMap((session) =>
        dayParts(Date.parse(session.startUtc), sessionEndMs(session, snapshot, nowMs), nowMs, timeZone).map((part) => {
          const range = `${clockTime(new Date(part.startMs).toISOString(), timeZone)} to ${clockTime(new Date(part.endMs).toISOString(), timeZone)}`;
          const label = `${player.character} ${range}${part.isYesterday ? ' yesterday' : ''}`;
          const path = arcPath(hourOfDay(part.startMs, timeZone), hourOfDay(part.endMs, timeZone), WHEEL_OUTER_RING_RADIUS - index * WHEEL_RING_STEP);
          return { path, label, isYesterday: part.isYesterday };
        }),
      ),
    })),
  );

  /** Hour the clock hand points at. */
  const nowHour = $derived(hourOfDay(nowMs, timeZone));

  /** Shaded wedge from now round to midnight: the part of the wheel that shows yesterday. */
  const yesterdayWedge = $derived(wedgePath(nowHour, HOURS_PER_DAY, WHEEL_RIM_RADIUS));

  /** "today" and "yesterday" words in the middle of their parts of the wheel, left out when a part is too thin. */
  const dayLabels = $derived(
    [
      { text: 'today', startHour: 0, endHour: nowHour },
      { text: 'yesterday', startHour: nowHour, endHour: HOURS_PER_DAY },
    ]
      .filter((part) => part.endHour - part.startHour >= WHEEL_MIN_LABEL_HOURS)
      .map((part) => {
        const [x, y] = wheelPoint((part.startHour + part.endHour) / 2, WHEEL_DAY_LABEL_RADIUS);
        return { text: part.text, x: x.toFixed(1), y: y.toFixed(1) };
      }),
  );

  /** Line from the center up to midnight, where yesterday ends and today starts. */
  const midnightLine = `M ${WHEEL_CENTER} ${WHEEL_CENTER} L ${WHEEL_CENTER} ${WHEEL_CENTER - WHEEL_RIM_RADIUS}`;

  /** Clock hand pointing at now. */
  const hand = $derived.by(() => {
    const [x, y] = wheelPoint(nowHour, WHEEL_HAND_RADIUS);
    return `M ${WHEEL_CENTER} ${WHEEL_CENTER} L ${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  /** Screen reader text listing every arc. */
  const description = $derived(
    rings.flatMap((ring) => ring.arcs.map((arc) => arc.label)).join(', ') || 'Nobody played in the last 24 hours',
  );
</script>

<svg viewBox="0 0 {WHEEL_SIZE} {WHEEL_SIZE}" role="img" aria-label="Who was online in the last 24 hours: {description}">
  <path d={yesterdayWedge} class="yesterday" />
  <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={WHEEL_RIM_RADIUS} class="rim" />
  <path d={ticks} class="tick" />
  <path d={midnightLine} class="midnight" />
  {#each dayLabels as label (label.text)}
    <text x={label.x} y={label.y} text-anchor="middle" dominant-baseline="middle" class="day">{label.text}</text>
  {/each}
  {#each rings as ring (ring.player.key)}
    {#each ring.arcs as arc (arc.path)}
      <path d={arc.path} class="arc" class:faded={arc.isYesterday} style:stroke={ring.player.color}><title>{arc.label}</title></path>
    {/each}
  {/each}
  <path d={hand} class="hand" />
  <text x="150" y="11" text-anchor="middle">00</text>
  <text x="294" y="154" text-anchor="end">06</text>
  <text x="150" y="298" text-anchor="middle">12</text>
  <text x="6" y="154">18</text>
  <text x="150" y="190" text-anchor="middle" class="now">{clockTime(new Date(nowMs).toISOString(), timeZone)}</text>
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

  /* Part of the wheel that shows yesterday, shaded so it does not read as later today */
  .yesterday {
    fill: var(--line-soft);
  }

  /* Divider at midnight, between yesterday and today */
  .midnight {
    stroke: var(--line);
    stroke-dasharray: 3 3;
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

  /* Sessions from yesterday, faded next to today's */
  .arc.faded {
    opacity: 0.45;
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

  /* "today" and "yesterday" inside the rings */
  .day {
    font-family: var(--font-body);
    font-size: 12px;
    font-style: italic;
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
