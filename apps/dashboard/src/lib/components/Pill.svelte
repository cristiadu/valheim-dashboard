<script lang="ts">
  import type { Pill } from '#/lib/models';

  /** Status or state to show. */
  let { pill }: { pill: Pill } = $props();
</script>

<span class="pill {pill.tone}">{pill.text}</span>

<style>
  /* Rounded label with a tinted fill, so a status reads at a glance and not as plain text */
  .pill {
    --tone: var(--muted);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px;
    border: 1px solid color-mix(in srgb, var(--tone) 55%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--tone) 14%, transparent);
    color: var(--tone);
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.5;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  /* Small dot before the word, in the same color */
  .pill::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  /* Green: online, connected, ready */
  .good {
    --tone: var(--good);
  }

  /* Red: offline, disconnected, crashed */
  .bad {
    --tone: var(--blood);
  }

  /* Gold: a boss down, or something to keep an eye on */
  .gold {
    --tone: var(--gold);
  }
</style>
