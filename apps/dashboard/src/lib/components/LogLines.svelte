<script lang="ts">
  import type { Snippet } from 'svelte';

  import { live } from '#/lib/live.svelte';
  import type { SourceLines } from '#/lib/models';
  import { viewerTimeZone, whenLabel } from '#/lib/status';

  /** What the lines are about, the lines, and what to show as the button that opens them. */
  let { title, source, children }: { title: string; source: SourceLines; children: Snippet } = $props();

  /** Whether the list of lines is open. */
  let isOpen = $state(false);

  /** Lines newest first, so the latest change is on top. */
  const newestFirst = $derived(source.lines.toReversed());

  /** Closes the list when the dark area around it is clicked. */
  const closeOnBackdrop = (event: MouseEvent & { currentTarget: HTMLDialogElement }): void => {
    if (event.target === event.currentTarget) {
      event.currentTarget.close();
    }
  };
</script>

<button type="button" class="opener" aria-haspopup="dialog" title="See the log lines behind this" onclick={() => (isOpen = true)}>
  {@render children()}
</button>

{#if isOpen}
  <dialog aria-label={title} {@attach (dialog: HTMLDialogElement) => dialog.showModal()} onclose={() => (isOpen = false)} onclick={closeOnBackdrop}>
    <div class="head">
      <h2>{title}</h2>
      <form method="dialog"><button type="submit" class="close">Close</button></form>
    </div>
    {#if newestFirst.length === 0}
      <p class="muted">No log lines for this yet.</p>
    {:else}
      <p class="muted">
        {source.total === 1 ? 'From this line of the server log:' : `From these ${source.total} lines of the server log, newest first:`}
        {#if source.total > newestFirst.length}Only the latest {newestFirst.length} are kept.{/if}
      </p>
      <ol>
        {#each newestFirst as record, i (i)}
          <li>
            {#if live.nowMs !== null}<span class="mono muted">{whenLabel(record.timeUtc, viewerTimeZone(), live.nowMs)}</span>{/if}
            <code>{record.line}</code>
          </li>
        {/each}
      </ol>
    {/if}
  </dialog>
{/if}

<style>
  /* Opener looks like what it wraps, with a hint that it can be clicked */
  .opener {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: inherit;
    cursor: pointer;
  }

  /* Hover marks the thing as clickable */
  .opener:hover {
    outline: 1px solid var(--ember);
    outline-offset: 2px;
  }

  /* List of lines in a panel over the page */
  dialog {
    width: min(760px, calc(100vw - 32px));
    max-height: 80vh;
    box-sizing: border-box;
    padding: 20px;
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--text);
  }

  /* Page dimmed behind the panel */
  dialog::backdrop {
    background: rgb(0 0 0 / 60%);
  }

  /* Title on the left, close button on the right */
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  /* Title in the heading font */
  h2 {
    margin: 0;
    font-family: var(--font-heading);
    font-size: 18px;
  }

  /* Close button, at least 44px tall for touch */
  .close {
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }

  /* Lines stacked, with hairlines between them */
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* One log line under its time */
  li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 0;
    border-top: 1px solid var(--line-soft);
  }

  /* Log line as written, wrapped on narrow screens */
  code {
    font-family: var(--font-mono);
    font-size: 13px;
    overflow-wrap: anywhere;
  }
</style>
