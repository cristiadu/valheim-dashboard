<script lang="ts">
  import { resolve } from '$app/paths';

  import ChestContents from '#/lib/components/ChestContents';
  import GearSheet from '#/lib/components/GearSheet';
  import LogLines from '#/lib/components/LogLines';
  import NoData from '#/lib/components/NoData';
  import Pill from '#/lib/components/Pill';
  import TimeLanes from '#/lib/components/TimeLanes';
  import { live, useSnapshot } from '#/lib/live.svelte';
  import {
    ACTIVITY_STORY_KINDS,
    MAP_SQUARE_METERS,
    type Player,
    PLAYER_ACTIVITY_STATS,
    PLAYER_PREFAB,
    type SourceLines,
    SQUARE_METERS_PER_KM2,
    STORY_STYLES,
    type StoryKind,
  } from '#/lib/models';
  import { playerPill } from '#/lib/pills';
  import { playersOf } from '#/lib/players';
  import { playerSource } from '#/lib/sources';
  import { clockTime, durationLabel, viewerTimeZone } from '#/lib/status';
  import { areaLabel, thingName } from '#/lib/story';

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
  const snapshot = $derived(getSnapshot());

  /** Viewer's time zone from the browser. */
  const timeZone = viewerTimeZone();

  /** Players at the page clock. */
  const players = $derived(live.nowMs === null ? [] : playersOf(snapshot, live.nowMs));

  /**
   * Numbers on a player's card, each with the rune of the story kind it counts and the log lines behind it.
   * Activities nobody did yet are left out. Land explored has no lines and links to the Map tab instead.
   */
  const statsOf = (player: Player): { label: string; value: string; kind: StoryKind; source: SourceLines | null }[] => [
    { label: 'Time played', value: durationLabel(player.totalMs), kind: 'night', source: playerSource(snapshot, player, 'visits') },
    { label: 'Visits', value: String(player.sessions.length), kind: 'joined', source: playerSource(snapshot, player, 'visits') },
    { label: 'Deaths', value: String(player.deaths), kind: 'died', source: playerSource(snapshot, player, 'deaths') },
    { label: 'Kills', value: String(player.kills), kind: 'fight', source: playerSource(snapshot, player, 'kills') },
    ...PLAYER_ACTIVITY_STATS.filter(({ kind }) => (player.activityTotals[kind] ?? 0) > 0).map(({ kind, label }) => ({
      label,
      value: player.activityTotals[kind]!.toLocaleString(),
      kind: ACTIVITY_STORY_KINDS[kind],
      source: playerSource(snapshot, player, 'activity', kind),
    })),
    {
      label: 'Land explored',
      value: `${((player.exploredSquares * MAP_SQUARE_METERS ** 2) / SQUARE_METERS_PER_KM2).toFixed(2)} km²`,
      kind: 'travel',
      source: null,
    },
  ];
</script>

{#snippet statBody(stat: { label: string; value: string; kind: StoryKind })}
  <span class="stat">
    <span class="rune" aria-hidden="true" style:color={STORY_STYLES[stat.kind].color} style:border-color={STORY_STYLES[stat.kind].color}>{STORY_STYLES[stat.kind].rune}</span>
    <span class="value mono">{stat.value}</span>
    <span class="label muted">{stat.label}</span>
  </span>
{/snippet}

{#if snapshot.sessions.length === 0}
  <NoData />
{:else if live.nowMs !== null}
  <div class="vikings">
    <section class="panel" aria-labelledby="lanes-title">
      <h2 id="lanes-title" class="panel-title">ONLINE IN THE LAST 24 HOURS</h2>
      <TimeLanes {players} {snapshot} nowMs={live.nowMs} {timeZone} />
    </section>

    {#each players as player (player.key)}
      <article class="panel card">
        <div class="parts">
          <div class="about">
            <div class="name">
              <h3><span class="diamond" aria-hidden="true" style:background={player.color}></span>{player.character}</h3>
              <Pill pill={playerPill(player.isOnline)} />
            </div>
            <p class="muted">
              {#if player.steamName}Steam: {player.steamName} ·{/if}
              {player.isOnline ? `Since ${clockTime(player.sinceUtc!, timeZone)}` : `Last seen ${clockTime(player.lastSeenUtc!, timeZone)}`}
            </p>
            <ul class="stats">
              {#each statsOf(player) as stat (stat.label)}
                <li>
                  {#if stat.source}
                    <LogLines title="{player.character}: {stat.label.toLowerCase()}" source={stat.source}>{@render statBody(stat)}</LogLines>
                  {:else}
                    <a class="plain" href={resolve('/map')} title="See it on the Map">{@render statBody(stat)}</a>
                  {/if}
                </li>
              {/each}
            </ul>
            {#if player.topKill}
              <LogLines title="{player.character} killed {thingName(player.topKill)}" source={playerSource(snapshot, player, 'killed', player.topKill)}>
                <p><span class="muted">Most killed:</span> {thingName(player.topKill)}</p>
              </LogLines>
            {/if}
            {#if player.areas.length > 0}
              <ul class="areas" aria-label="Been to">
                {#each player.areas as area (area)}
                  <li class:here={player.isOnline && player.area === area}>
                    <LogLines title="{player.character} in {areaLabel(area)}" source={playerSource(snapshot, player, 'area', area)}>
                      <span class="area-rune" aria-hidden="true">{STORY_STYLES.travel.rune}</span>{areaLabel(area)}{#if player.isOnline && player.area === area}<span class="muted">&nbsp;· here now</span>{/if}
                    </LogLines>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>

          <div class="gear">
            <p class="muted part-title">Gear</p>
            {#if player.gear.length > 0}
              <GearSheet gear={player.gear} worn={player.worn} sourceOf={(prefab) => playerSource(snapshot, player, 'gear', prefab)} />
            {:else}
              <p class="muted">No gear seen yet.</p>
            {/if}
          </div>

          <div class="bag">
            <p class="muted part-title">In the bag now <span class="hint">(a guess from gear, pickups, chests and meals)</span></p>
            <ChestContents chest={PLAYER_PREFAB} items={snapshot.bags[player.character] ?? {}} stacks={snapshot.itemStacks} equipped={player.worn ?? []} />
          </div>
        </div>
      </article>
    {/each}
  </div>
{/if}

<style>
  /* Lanes above the cards */
  .vikings {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: var(--page-width);
  }

  /* One wide card per player, sized by the page so its parts can sit side by side */
  .card {
    container-type: inline-size;
  }

  /* About, gear and bag stacked on a narrow card */
  .parts {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  /* About, gear and bag side by side once the card is wide enough */
  @container (min-width: 900px) {
    .parts {
      grid-template-columns: minmax(280px, 1fr) auto minmax(0, 1.4fr);
      align-items: start;
    }
  }

  /* Name, numbers and places stacked */
  .about {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Gear and bag start under a small title */
  .gear,
  .bag {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Carried gear wraps at six slots, so it stays a short block beside the numbers */
  .gear {
    max-width: calc(6 * 56px + 5 * 6px);
  }

  /* Small title over gear and bag */
  .part-title {
    font-size: 12px;
    letter-spacing: 0.04em;
  }

  /* Why the bag is only a guess, quieter than the title */
  .hint {
    font-size: 11px;
    opacity: 0.8;
  }

  /* Name on the left, online pill on the right */
  .name {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 10px;
  }

  /* Player name with their color */
  h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: 17px;
    font-weight: 600;
  }

  /* Small turned square in the player's color */
  .diamond {
    width: 10px;
    height: 10px;
    transform: rotate(45deg);
  }

  /* Steam name and status */
  p {
    margin: 0;
  }

  /* Lists drop their bullets and indent */
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Numbers in as many columns as fit, at least two */
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(50% - 4px, 130px), 1fr));
    gap: 10px 8px;
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

  /* Areas as small tags that wrap */
  .areas {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  /* One area tag */
  .areas li {
    padding: 2px 8px 2px 4px;
    border: 1px solid var(--line);
    font-size: 13px;
  }

  /* The area the player is in right now */
  .areas li.here {
    border-color: var(--frost);
  }

  /* Travel rune before an area name */
  .area-rune {
    margin-right: 5px;
    font-family: var(--font-rune);
    color: var(--frost);
  }
</style>
