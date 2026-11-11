<script lang="ts">
  import ChestContents from '#/lib/components/ChestContents';
  import { builtByLabel, chestName, chestTitle } from '#/lib/items';
  import type { MapChest } from '#/lib/models/map';
  import { whenLabel } from '#/lib/time';

  /**
   * The open chest, the most of each item one slot holds, the viewer's time zone and the page clock, what to do on
   * close, and the panel, so the page can scroll it into view.
   */
  let {
    chest,
    stacks,
    timeZone,
    nowMs,
    onclose,
    panel = $bindable(),
  }: {
    chest: MapChest;
    stacks: Record<string, number>;
    timeZone: string;
    nowMs: number;
    onclose: () => void;
    panel?: HTMLElement;
  } = $props();
</script>

<section class="panel" aria-labelledby="picked-title" bind:this={panel}>
  <div class="picked-head">
    <svg class="picked-icon" viewBox="-0.5 -0.5 1 1" aria-hidden="true"><use href="#chest-icon" /></svg>
    <div>
      <h2 id="picked-title" class="panel-title">{chestTitle(chest.record).toUpperCase()}</h2>
      <p class="muted">
        {chest.record.label === undefined ? '' : `${chestName(chest.record.chest)} · `}{builtByLabel(chest.record.builder)} · last looked at {whenLabel(chest.record.timeUtc, timeZone, nowMs)}
      </p>
    </div>
    <button type="button" onclick={onclose}>Close</button>
  </div>
  <ChestContents chest={chest.record.chest} items={chest.record.items} {stacks} />
</section>

<style>
  /* The picked chest drawn big beside its name, then who built it, and the close button at the end */
  .picked-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    margin-bottom: 12px;
  }

  /* Big chest drawing in the panel head */
  .picked-icon {
    width: 44px;
    height: 44px;
  }

  /* No gap under the title and builder line in the head */
  .picked-head h2,
  .picked-head p {
    margin: 0;
  }

  /* Close button in the Longhouse look, like the Saga filters */
  button {
    min-width: 36px;
    min-height: 36px;
    padding: 0 14px;
    font: inherit;
    color: var(--text);
    background: none;
    border: 1px solid var(--line);
    cursor: pointer;
  }
</style>
