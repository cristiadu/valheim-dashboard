<script lang="ts">
  import Pill from '#/lib/components/Pill';
  import type { Pill as PillModel } from '#/lib/models';

  /** Facts to show, each a label and a value. A status or state value shows as a pill. */
  let { stats }: { stats: { label: string; value: string | PillModel }[] } = $props();
</script>

<dl>
  {#each stats as stat (stat.label)}
    <div>
      <dt>{stat.label}</dt>
      <dd>{#if typeof stat.value === 'string'}{stat.value}{:else}<Pill pill={stat.value} />{/if}</dd>
    </div>
  {/each}
</dl>

<style>
  /* Grid of cells sharing hairline borders */
  dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
    margin: 0;
    border-top: 1px solid var(--line);
    border-left: 1px solid var(--line);
  }

  /* One fact */
  div {
    padding: 14px 16px;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }

  /* Fact name */
  dt {
    font-size: 12px;
    color: var(--muted);
  }

  /* Fact value in the heading font */
  dd {
    margin: 4px 0 0;
    font-family: var(--font-heading);
    font-size: 19px;
    overflow-wrap: anywhere;
  }
</style>
