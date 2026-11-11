<script lang="ts">
  import ChestContents from '#/lib/components/ChestContents';
  import GearSheet from '#/lib/components/GearSheet';
  import LogLines from '#/lib/components/LogLines';
  import Pill from '#/lib/components/Pill';
  import PlayerStats from '#/lib/components/PlayerStats';
  import VitalsBar from '#/lib/components/VitalsBar';
  import { PLAYER_PREFAB } from '#/lib/models/chests';
  import type { Player } from '#/lib/models/players';
  import type { Snapshot } from '#/lib/models/snapshot';
  import { STORY_STYLES } from '#/lib/models/story';
  import { playerPill } from '#/lib/pills';
  import { playerStats } from '#/lib/players';
  import { playerSource } from '#/lib/sources';
  import { areaLabel, thingName } from '#/lib/text';
  import { clockTime } from '#/lib/time';

  /** The player the card is about, the snapshot their numbers come from, and the viewer's time zone. */
  let { player, snapshot, timeZone }: { player: Player; snapshot: Snapshot; timeZone: string } = $props();

  /** Numbers on the card, each with the log lines behind it. */
  const stats = $derived(playerStats(snapshot, player));
</script>

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
      {#if snapshot.vitals[player.character]}
        <VitalsBar vitals={snapshot.vitals[player.character]!} isOnline={player.isOnline} />
      {/if}
      <PlayerStats {stats} character={player.character} />
      {#if player.topKill}
        <LogLines title="{player.character} killed {thingName(player.topKill)}" source={playerSource(snapshot, player, 'killed', player.topKill)}>
          <p><span class="muted">Most killed:</span> {thingName(player.topKill)}</p>
        </LogLines>
      {/if}
      {#if player.areas.length > 0}
        <ul class="areas" aria-label="Been to">
          {#each player.areas as area (area)}
            {@const isHere = player.isOnline && player.area === area}
            <li class:here={isHere}>
              <LogLines title="{player.character} in {areaLabel(area)}" source={playerSource(snapshot, player, 'area', area)}>
                <span class="area-rune" aria-hidden="true">{STORY_STYLES.travel.rune}</span>{areaLabel(area)}{#if isHere}<span class="muted">&nbsp;· here now</span>{/if}
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

<style>
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
