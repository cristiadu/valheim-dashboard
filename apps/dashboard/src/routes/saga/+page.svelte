<script lang="ts">
  import ItemList from '#/lib/components/ItemList';
  import LogLines from '#/lib/components/LogLines';
  import NoData from '#/lib/components/NoData';
  import Pager from '#/lib/components/Pager';
  import { live, useSnapshot } from '#/lib/live.svelte';
  import { SAGA_PAGE_SIZE } from '#/lib/models/pages';
  import { SAGA_FILTERS, STORY_STYLES } from '#/lib/models/story';
  import { storyOf } from '#/lib/story';
  import { viewerTimeZone, whenLabel } from '#/lib/time';

  /** Getter for the snapshot the layout shares. */
  const getSnapshot = useSnapshot();

  /** Current snapshot. */
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
  {@const timeZone = viewerTimeZone()}
  <div class="saga">
    <div class="filters" role="group" aria-label="Filter events">
      {#each SAGA_FILTERS as option (option.label)}
        <button type="button" class="tap" aria-pressed={option === filter} onclick={() => (filter = option)}>
          {option.label}
          <span class="mono muted">{story.filter((item) => option.kinds.includes(item.kind)).length}</span>
        </button>
      {/each}
    </div>
    {#key filter}
      <Pager items={shown} size={SAGA_PAGE_SIZE}>
        {#snippet children(items)}
          <ol>
            {#each items as item, i (i)}
              <li>
                <span class="rune" aria-hidden="true" style:color={STORY_STYLES[item.kind].color} style:border-color={STORY_STYLES[item.kind].color}>{STORY_STYLES[item.kind].rune}</span>
                <LogLines title={item.text} source={item.source}>
                  <span class="row">
                    <span class="mono muted">{whenLabel(item.timeUtc, timeZone, nowMs)}</span>
                    <span class="what">{item.text}{#if item.things}<ItemList items={item.things} size={16} />{/if}</span>
                  </span>
                </LogLines>
              </li>
            {:else}
              <li class="muted">Nothing of this kind yet.</li>
            {/each}
          </ol>
        {/snippet}
      </Pager>
    {/key}
  </div>
{/if}

<style>
  /* Filters above the list */
  .saga {
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-width: var(--page-width);
  }

  /* Filter buttons wrap on narrow screens */
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* Selected filter */
  .tap[aria-pressed='true'] {
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

  /* One event, with its rune on the line */
  li {
    position: relative;
    padding: 12px 0 12px 24px;
  }

  /* Time, then the sentence */
  .row {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    gap: 12px;
    align-items: baseline;
  }

  /* Sentence with its items under it, both in the text column */
  .what {
    display: flex;
    flex-direction: column;
    gap: 6px;
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

