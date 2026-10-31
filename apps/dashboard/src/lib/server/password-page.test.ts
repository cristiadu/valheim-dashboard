import { describe, expect, it } from 'vitest';

import { passwordPage } from '#/lib/server/password-page';

describe('passwordPage', () => {
  it('asks for the password only, with no name field', () => {
    // GIVEN / WHEN a first visit's page is made
    const html = passwordPage(false);

    // THEN it has one password field and no try-again line
    expect(html).toContain('<input id="password" name="password" type="password"');
    expect(html).not.toContain('type="text"');
    expect(html).not.toContain("That's not it.");
  });

  it('says to try again after a wrong password', () => {
    // GIVEN / WHEN the page after a wrong password is made
    const html = passwordPage(true);

    // THEN it shows the try-again line
    expect(html).toContain("That's not it. Try again, or ask whoever runs the server.");
  });

});
