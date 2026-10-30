<script lang="ts">
  import DayWheel from '#lib/components/DayWheel.svelte';
  import NoData from '#lib/components/NoData.svelte';
  import { live, useSnapshot, viewerOffsetMinutes } from '#lib/live.svelte.ts';
  import { LATEST_EVENT_COUNT, STORY_STYLES } from '#lib/models.ts';
  import { playersOf } from '#lib/players.ts';
  import { clockTime, durationLabel, isServerOnline } from '#lib/status.ts';
  import { daySummary, storyOf } from '#lib/story.ts';

  /** Bytes in a gigabyte, as disks count them. */
  const BYTES_PER_GB = 1e9;

  /** Current snapshot from the layout. */
  const getSnapshot = useSnapshot();
  const snapshot = $derived(getSnapshot());

  /** Viewer's offset from UTC; only known in the browser. */
  const offset = $derived(live.nowMs === null ? 0 : viewerOffsetMinutes(live.nowMs));

  /** Players, newest story lines and whether the server is up, at the page clock. */
  const players = $derived(live.nowMs === null ? [] : playersOf(snapshot, live.nowMs));
  const online = $derived(players.filter((p) => p.isOnline));
  const latest = $derived(storyOf(snapshot).slice(0, LATEST_EVENT_COUNT));
  const isUp = $derived(live.nowMs !== null && isServerOnline(snapshot, live.nowMs));
  const lastOut = $derived(players.filter((p) => p.lastSeenUtc !== null).sort((a, b) => b.lastSeenUtc!.localeCompare(a.lastSeenUtc!))[0]);
  const lastSave = $derived(snapshot.saves.at(-1));

  /** Clock time of [timeUtc] in the viewer's zone. */
  const at = (timeUtc: string): string => clockTime(timeUtc, offset);
</script>

{#if snapshot.lastLineUtc === null}
  <NoData />
{:else if live.nowMs !== null}
  {@const nowMs = live.nowMs}
  <div class="hall">
    <p class="summary">{daySummary(snapshot, nowMs)}</p>

    <div class="grid">
      <section class="panel" aria-labelledby="wheel-title">
        <h2 id="wheel-title" class="panel-title">LAST 24 HOURS</h2>
        <p class="muted">Who was online around the clock. Midnight at the top.</p>
        <DayWheel {players} {snapshot} {nowMs} offsetMinutes={offset} />
      </section>

      <div class="column">
        <section class="panel" aria-labelledby="online-title">
          <h2 id="online-title" class="panel-title">ONLINE NOW</h2>
          {#each online as player (player.key)}
            <div class="line">
              <span class="diamond" aria-hidden="true" style:background={player.color}></span>
              <span class="grow">{player.character}</span>
              <span class="mono muted">since {at(player.sinceUtc!)} · {durationLabel(nowMs - Date.parse(player.sinceUtc!))}</span>
            </div>
          {:else}
            <p class="muted">
              Nobody is online.{#if lastOut} Last to leave: {lastOut.character} at {at(lastOut.lastSeenUtc!)}.{/if}
            </p>
          {/each}
        </section>

        <section class="panel" aria-labelledby="latest-title">
          <div class="heading">
            <h2 id="latest-title" class="panel-title">LATEST EVENTS</h2>
            <a href="/saga">See all events</a>
          </div>
          {#each latest as item, i (i)}
            <div class="line event">
              <span class="mono muted">{at(item.timeUtc)}</span>
              <span class="rune" aria-hidden="true" style:color={STORY_STYLES[item.kind].color}>{STORY_STYLES[item.kind].rune}</span>
              <span>{item.text}</span>
            </div>
          {:else}
            <p class="muted">Nothing happened yet.</p>
          {/each}
        </section>
      </div>
    </div>

    <a class="strip" href="/server">
      <strong>SERVER</strong>
      <span><span class="diamond small" aria-hidden="true" class:up={isUp}></span>{isUp ? 'Online' : 'Offline'}</span>
      {#if isUp && snapshot.startedUtc}<span>Up {durationLabel(nowMs - Date.parse(snapshot.startedUtc))}</span>{/if}
      {#if lastSave}<span>Last save {at(lastSave.timeUtc)}</span>{/if}
      <span>{online.length === 1 ? '1 player online' : `${online.length} players online`}</span>
      {#if snapshot.diskSpace}<span>{Math.round(snapshot.diskSpace.availableBytes / BYTES_PER_GB)} GB disk free</span>{/if}
      {#if snapshot.isGameServerConnected === false}<span class="warn">Steam connection lost</span>{/if}
      <span class="link">Server details</span>
    </a>
  </div>
{/if}

<style>
  /* Sections stacked with even space */
  .hall {
    display: flex;
    flex-direction: column;
    gap: 22px;
    max-width: 1120px;
  }

  /* The one line about the last 24 hours */
  .summary {
    margin: 0;
    font-family: var(--font-heading);
    font-size: 22px;
    line-height: 1.35;
  }

  /* Wheel beside the lists; stacks on narrow screens */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
    gap: 22px;
  }

  /* Online list above the latest events */
  .column {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  /* Panel title with a link on the right */
  .heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  /* One row in a list, with a rule above */
  .line {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-top: 1px solid var(--line-soft);
  }

  /* Event row: time, rune, sentence */
  .event {
    display: grid;
    grid-template-columns: 48px 22px minmax(0, 1fr);
    align-items: baseline;
  }

  /* Name takes the free space */
  .grow {
    flex: 1 1 auto;
    font-weight: 600;
  }

  /* Small turned square in the player's color */
  .diamond {
    display: inline-block;
    width: 10px;
    height: 10px;
    transform: rotate(45deg);
  }

  /* Smaller status square in the server strip, red when offline */
  .small {
    width: 7px;
    height: 7px;
    margin-right: 6px;
    background: var(--blood);
  }

  /* Green status square while online */
  .small.up {
    background: var(--good);
  }

  /* Event rune */
  .rune {
    font-family: var(--font-rune);
    font-size: 17px;
  }

  /* Server facts in one dashed row that opens the Server tab */
  .strip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 18px;
    min-height: 44px;
    padding: 8px 14px;
    border: 1px dashed var(--line);
    color: var(--muted);
    font-size: 13px;
    text-decoration: none;
  }

  /* Strip label */
  .strip strong {
    font-family: var(--font-heading);
    font-weight: 500;
    letter-spacing: 0.1em;
    color: var(--text);
  }

  /* Steam warning in the strip */
  .warn {
    color: var(--blood);
  }

  /* Looks like a link at the end of the strip */
  .link {
    color: var(--ember);
  }
</style>
