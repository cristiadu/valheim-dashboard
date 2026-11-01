<script lang="ts">
  import GearSheet from '#/lib/components/GearSheet';
  import NoData from '#/lib/components/NoData';
  import Pill from '#/lib/components/Pill';
  import TimeLanes from '#/lib/components/TimeLanes';
  import { live, useSnapshot } from '#/lib/live.svelte';
  import { type Player, STORY_STYLES, type StoryKind } from '#/lib/models';
  import { playerPill } from '#/lib/pills';
  import { playersOf } from '#/lib/players';
  import { clockTime, durationLabel, viewerTimeZone } from '#/lib/status';
  import { areaLabel, thingList, thingName } from '#/lib/story';

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
  const snapshot = $derived(getSnapshot());

  /** Viewer's time zone from the browser. */
  const timeZone = viewerTimeZone();

  /** Players at the page clock. */
  const players = $derived(live.nowMs === null ? [] : playersOf(snapshot, live.nowMs));

  /** Numbers on a player's card, each with the rune of the story kind it counts. */
  const statsOf = (player: Player): { label: string; value: string; kind: StoryKind }[] => [
    { label: 'Time played', value: durationLabel(player.totalMs), kind: 'night' },
    { label: 'Visits', value: String(player.sessions.length), kind: 'joined' },
    { label: 'Deaths', value: String(player.deaths), kind: 'died' },
    { label: 'Kills', value: String(player.kills), kind: 'fight' },
  ];
</script>

{#if snapshot.sessions.length === 0}
  <NoData />
{:else if live.nowMs !== null}
  <div class="vikings">
    <section class="panel" aria-labelledby="lanes-title">
      <h2 id="lanes-title" class="panel-title">ONLINE IN THE LAST 24 HOURS</h2>
      <TimeLanes {players} {snapshot} nowMs={live.nowMs} {timeZone} />
    </section>

    <div class="cards">
      {#each players as player (player.key)}
        <article class="panel card">
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
                <span class="rune" aria-hidden="true" style:color={STORY_STYLES[stat.kind].color} style:border-color={STORY_STYLES[stat.kind].color}>{STORY_STYLES[stat.kind].rune}</span>
                <span class="value mono">{stat.value}</span>
                <span class="label muted">{stat.label}</span>
              </li>
            {/each}
          </ul>
          {#if player.gear.length > 0}<GearSheet gear={player.gear} />{/if}
          {#if player.topKill}<p><span class="muted">Most killed:</span> {thingName(player.topKill)}</p>{/if}
          {#if player.areas.length > 0}
            <div>
              <p class="muted">Been to</p>
              <ul class="areas">
                {#each player.areas as area (area)}
                  <li class:here={player.isOnline && player.area === area}>
                    <span class="area-rune" aria-hidden="true">{STORY_STYLES.travel.rune}</span>{areaLabel(area)}{#if player.isOnline && player.area === area}<span class="muted">&nbsp;· here now</span>{/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
          {#if snapshot.deathItems[player.character]}
            {@const death = snapshot.deathItems[player.character]!}
            <p>
              <span class="muted">Carried at last death, {clockTime(death.timeUtc, timeZone)}:</span>
              {Object.keys(death.items).length === 0 ? 'nothing' : thingList(death.items)}
            </p>
          {/if}
        </article>
      {/each}
    </div>
  </div>
{/if}

<style>
  /* Lanes above the cards */
  .vikings {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 1120px;
  }

  /* As many cards per row as fit */
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
    gap: 16px;
  }

  /* Card content stacked */
  .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
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

  /* Numbers two by two, so they fit a narrow card */
  .stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  /* One number: rune on the left, value above its label */
  .stats li {
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
    margin-top: 4px;
  }

  /* One area tag */
  .areas li {
    padding: 2px 8px;
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
