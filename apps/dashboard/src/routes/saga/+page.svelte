<script lang="ts">
  import NoData from '#lib/components/NoData.svelte';
  import { live, useSnapshot, viewerOffsetMinutes } from '#lib/live.svelte.ts';
  import { SAGA_FILTERS, STORY_STYLES } from '#lib/models.ts';
  import { whenLabel } from '#lib/status.ts';
  import { storyOf } from '#lib/story.ts';

  /** Current snapshot from the layout. */
  const getSnapshot = useSnapshot();
  const snapshot = $derived(getSnapshot());

  /** Every story line, newest first. */
  const story = $derived(storyOf(snapshot));

  /** Selected filter. */
  let filter = $state(SAGA_FILTERS[0]!);

  /** Lines the filter lets through. */
  const shown = $derived(story.filter((item) => filter.kinds.includes(item.kind)));
</script>

{#if story.length === 0}
  <NoData />
{:else if live.nowMs !== null}
  {@const nowMs = live.nowMs}
  {@const offset = viewerOffsetMinutes(nowMs)}
  <div class="saga">
    <div class="filters" role="group" aria-label="Filter events">
      {#each SAGA_FILTERS as option (option.label)}
        <button type="button" aria-pressed={option === filter} onclick={() => (filter = option)}>
          {option.label}
          <span class="mono muted">{story.filter((item) => option.kinds.includes(item.kind)).length}</span>
        </button>
      {/each}
    </div>
    <ol>
      {#each shown as item, i (i)}
        <li>
          <span class="rune" aria-hidden="true" style:color={STORY_STYLES[item.kind].color} style:border-color={STORY_STYLES[item.kind].color}>{STORY_STYLES[item.kind].rune}</span>
          <span class="mono muted">{whenLabel(item.timeUtc, offset, nowMs)}</span>
          <span>{item.text}</span>
        </li>
      {:else}
        <li class="muted">Nothing of this kind yet.</li>
      {/each}
    </ol>
  </div>
{/if}

<style>
  /* Filters above the list */
  .saga {
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-width: 900px;
  }

  /* Filter buttons wrap on narrow screens */
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* One filter, at least 44px tall for touch */
  button {
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  /* Selected filter */
  button[aria-pressed='true'] {
    background: var(--selected);
    border-color: var(--ember);
  }

  /* Time line with a rule on the left */
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
    border-left: 1px solid var(--line);
  }

  /* One event: rune on the line, time, sentence */
  li {
    position: relative;
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    gap: 12px;
    align-items: baseline;
    padding: 12px 0 12px 24px;
  }

  /* Rune box sitting on the line */
  .rune {
    position: absolute;
    left: -12px;
    top: 10px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 1px solid;
    background: var(--background);
    font-family: var(--font-rune);
    font-size: 13px;
  }
</style>
