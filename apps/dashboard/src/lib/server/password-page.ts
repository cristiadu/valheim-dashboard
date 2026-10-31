import appCss from '#/app.css?raw';

/** Styles for the password page only, on top of the shared Longhouse colors and fonts. */
const PAGE_CSS = `
  /* Card centered under the top bar */
  main { display: grid; place-items: start center; padding: 64px 16px; }
  /* Top bar like the dashboard's */
  header { display: flex; align-items: center; gap: 14px; padding: 18px 28px; border-bottom: 1px solid var(--line); }
  /* Diamond around the rune mark */
  .mark { display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid var(--ember); transform: rotate(45deg); }
  /* Rune inside the diamond, turned back upright */
  .mark span { transform: rotate(-45deg); font-family: var(--font-rune); font-size: 20px; color: var(--ember); }
  /* App name in the heading font */
  .name { font-family: var(--font-heading); font-weight: 700; font-size: 22px; letter-spacing: 0.14em; }
  /* Narrow card so the form reads as one short step */
  form { width: 100%; max-width: 360px; box-sizing: border-box; }
  /* Greeting in the heading font */
  h1 { margin: 0 0 6px; font-family: var(--font-heading); font-size: 22px; font-weight: 500; letter-spacing: 0.06em; }
  /* Label above the field */
  label { display: block; margin: 18px 0 6px; color: var(--muted); font-size: 13px; }
  /* Full-width field on the dark panel */
  input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--line); background: var(--background); color: var(--text); font: inherit; }
  /* Wrong password message in the warning color */
  .wrong { margin: 10px 0 0; color: var(--blood); font-size: 13px; }
  /* Main action in the accent color */
  button { width: 100%; margin-top: 18px; padding: 10px 12px; border: 1px solid var(--ember); background: var(--ember); color: var(--background); font: inherit; font-weight: 600; cursor: pointer; }
`;

/** Fonts the dashboard uses, from Google Fonts like app.html. */
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Barlow:wght@400;600&family=Cinzel:wght@500;700&family=Noto+Sans+Runic&display=swap';

/** Returns the password page, with a "try again" line when [isWrong]. It posts back to its own address. */
export const passwordPage = (isWrong: boolean): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Password · Valheim Dashboard</title>
    <link rel="stylesheet" href="${FONTS_URL}" />
    <style>${appCss}${PAGE_CSS}</style>
  </head>
  <body>
    <header>
      <div class="mark" aria-hidden="true"><span>ᛟ</span></div>
      <div>
        <div class="name">VALHEIM DASHBOARD</div>
        <div class="muted">Server status and who was online</div>
      </div>
    </header>
    <main>
      <form method="POST" class="panel">
        <h1>Welcome, Viking</h1>
        <p class="muted">This is our server's page. Type the password to come in.</p>
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required autofocus />
        ${isWrong ? `<p class="wrong" role="alert">That's not it. Try again, or ask whoever runs the server.</p>` : ''}
        <button type="submit">Come in</button>
      </form>
    </main>
  </body>
</html>`;
