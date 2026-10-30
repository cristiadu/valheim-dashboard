/** One dashboard tab and the page it opens. */
export type Tab = {
  /** Page path, for example `/saga`. */
  path: string;
  /** Name shown in the menu and as the page heading. */
  label: string;
  /** Short line under the label in the menu. */
  hint: string;
  /** Rune shown as the tab icon. */
  rune: string;
};

/** The dashboard tabs, in menu order. Hall is the first screen and stays short. */
export const TABS: readonly Tab[] = [
  { path: '/', label: 'Hall', hint: 'Today at a glance', rune: 'ᛟ' },
  { path: '/vikings', label: 'Vikings', hint: 'Who was online', rune: 'ᛗ' },
  { path: '/saga', label: 'Saga', hint: 'Every game event', rune: 'ᚱ' },
  { path: '/world', label: 'World', hint: 'Saves and bosses', rune: 'ᛃ' },
  { path: '/server', label: 'Server', hint: 'Status and warnings', rune: 'ᚾ' },
];

/** Returns the tab for [pathname], ignoring a trailing slash. Unknown paths fall back to Hall. */
export const tabFor = (pathname: string): Tab => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return TABS.find((tab) => tab.path === path) ?? TABS[0];
};
