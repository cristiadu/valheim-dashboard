import { TABS, type Tab } from './models';

/** Returns the tab for [pathname], ignoring a trailing slash. Unknown paths fall back to Hall. */
export const tabFor = (pathname: string): Tab => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return TABS.find((tab) => tab.path === path) ?? TABS[0];
};
