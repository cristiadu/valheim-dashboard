<header>
  <div class="mark" aria-hidden="true"><span>ᛟ</span></div>
  <div>
    <div class="name">VALHEIM DASHBOARD</div>
    <div class="muted">Server status and who was online</div>
  </div>
</header>

<style>
  /* Top bar: mark and name on one line, with a rule under it */
  header {
    display: flex;
    align-items: center;
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
</style>
