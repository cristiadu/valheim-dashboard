<script lang="ts">
  /** Server status line and whether it is online. Null until the page runs in the browser. */
  let { status }: { status: { text: string; isOnline: boolean } | null } = $props();
</script>

<header>
  <div class="mark" aria-hidden="true"><span>ᛟ</span></div>
  <div>
    <div class="name">VALHEIM DASHBOARD</div>
    <div class="muted">Server status and who was online</div>
  </div>
  {#if status}
    <p class="status" class:online={status.isOnline} role="status">
      <span class="dot" aria-hidden="true"></span>{status.text}
    </p>
  {/if}
</header>

<style>
  /* Top bar: mark and name on one line, with a rule under it */
  header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    padding: 18px 28px;
    border-bottom: 1px solid var(--line);
  }

  /* Diamond around the rune mark */
  .mark {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 1px solid var(--ember);
    transform: rotate(45deg);
  }

  /* Rune inside the diamond, turned back upright */
  .mark span {
    transform: rotate(-45deg);
    font-family: var(--font-rune);
    font-size: 20px;
    color: var(--ember);
  }

  /* App name in the heading font */
  .name {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 22px;
    letter-spacing: 0.14em;
  }

  /* Status line on the right; drops under the name on narrow screens */
  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 0 auto;
    color: var(--muted);
    font-size: 14px;
  }

  /* Square status light: red when offline */
  .dot {
    width: 8px;
    height: 8px;
    background: var(--blood);
  }

  /* Green light while the server is online */
  .online .dot {
    background: var(--good);
  }
</style>
