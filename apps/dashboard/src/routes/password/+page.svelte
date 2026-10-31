<script lang="ts">
  /** Set after a wrong password. */
  let { form }: { form: { isWrong: boolean } | null } = $props();
</script>

<main>
  <form method="POST" class="panel">
    <h1 class="panel-title">WELCOME, VIKING</h1>
    <p class="muted">This is our server's page. Type the server password to come in.</p>
    <label class="muted" for="password">Password</label>
    <!-- svelte-ignore a11y_autofocus -->
    <input id="password" name="password" type="password" autocomplete="current-password" required autofocus />
    {#if form?.isWrong}
      <p class="wrong" role="alert">That's not it. Try again, or ask whoever runs the server.</p>
    {/if}
    <button type="submit">Come in</button>
  </form>
</main>

<style>
  /* Form sits in the middle, under the header */
  main {
    display: flex;
    justify-content: center;
    padding: 64px 16px;
  }

  /* Narrow panel so the form reads as one short step */
  form {
    width: 100%;
    max-width: 360px;
    box-sizing: border-box;
  }

  /* Label above the field */
  label {
    display: block;
    margin: 18px 0 6px;
  }

  /* Field and button match the Recipes form, 44px tall for touch */
  input,
  button {
    width: 100%;
    min-height: 44px;
    box-sizing: border-box;
    padding: 0 12px;
    border: 1px solid var(--line);
    background: var(--background);
    color: var(--text);
    font: inherit;
    font-size: 14px;
  }

  /* Wrong password message in the warning color */
  .wrong {
    margin: 10px 0 0;
    color: var(--blood);
    font-size: 13px;
  }

  /* Come in is the main action, so it uses the accent like Add plan */
  button {
    margin-top: 18px;
    border-color: var(--ember);
    color: var(--ember);
    cursor: pointer;
  }
</style>
