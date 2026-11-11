<script lang="ts">
  import { builtByShortLabel, chestName, chestTitle, itemTotal } from '#/lib/items';
  import type { MapChest } from '#/lib/models/map';
  import { count } from '#/lib/text';

  /** Chests on the map, the open one's ID, and what to do when one is tapped. */
  let {
    chests,
    pickedId,
    onpick,
  }: { chests: MapChest[]; pickedId: string | null; onpick: (id: string) => void } = $props();

  /** Chests with the most kinds of items first. */
  const byMostKinds = $derived(
    chests.toSorted((first, second) => Object.keys(second.record.items).length - Object.keys(first.record.items).length),
  );
</script>

<section class="panel" aria-labelledby="chests-title">
  <h2 id="chests-title" class="panel-title">CHESTS</h2>
  {#each byMostKinds as chest (chest.id)}
    {@const kinds = Object.keys(chest.record.items).length}
    <button type="button" class="line" class:picked={chest.id === pickedId} onclick={() => onpick(chest.id)}>
      <span><strong>{chestTitle(chest.record)}</strong> <span class="muted">{chest.record.label === undefined ? '' : `${chestName(chest.record.chest)} `}{builtByShortLabel(chest.record.builder)}</span></span>
      <span class="muted">
        {kinds === 0 ? 'Empty' : `${count(kinds, 'kind', 'kinds')} · ${itemTotal(chest.record.items).toLocaleString()} items`}
      </span>
    </button>
  {:else}
    <p class="muted">No chest found yet.</p>
  {/each}
</section>

<style>
  /* Text under the panel title */
  p {
    margin: 0 0 10px;
  }

  /* One chest in the list: name on the left, what it holds on the right, tappable as a whole */
  .line {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 16px;
    width: 100%;
    padding: 10px 0;
    font: inherit;
    color: var(--text);
    background: none;
    border: 0;
    border-top: 1px solid var(--line-soft);
    text-align: left;
    cursor: pointer;
  }

  /* The chest shown above is marked in the list too */
  .line.picked strong {
    color: var(--gold);
  }
</style>
