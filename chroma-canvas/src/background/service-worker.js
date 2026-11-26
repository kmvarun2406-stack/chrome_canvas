/**
 * Service worker.
 *
 * Deliberately thin: seed defaults on install, and handle the two keyboard
 * commands that have to work from any tab (where no new tab page is listening).
 */

import { DEFAULTS, GRADIENTS, LIVE_ENGINES, STORE_KEY, loadState, patchState } from '../lib/state.js';

chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.local.get(STORE_KEY);
  if (!existing[STORE_KEY]) {
    await chrome.storage.local.set({ [STORE_KEY]: DEFAULTS });
  }
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/newtab/newtab.html?settings=1') });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const state = await loadState();

  if (command === 'toggle-site-theme') {
    const next = !state.siteTheme.enabled;
    await patchState({ 'siteTheme.enabled': next });
    await flash(next ? 'Site theming on' : 'Site theming off');
    return;
  }

  if (command === 'next-wallpaper') {
    const bg = state.background;
    if (bg.type === 'live') {
      const keys = Object.keys(LIVE_ENGINES);
      const next = keys[(keys.indexOf(bg.live.engine) + 1) % keys.length];
      await patchState({ 'background.live.engine': next });
      await flash(LIVE_ENGINES[next]);
    } else {
      const keys = Object.keys(GRADIENTS);
      const next = keys[(keys.indexOf(bg.gradient.preset) + 1) % keys.length];
      await patchState({ 'background.type': 'gradient', 'background.gradient.preset': next });
      await flash(next);
    }
  }
});

/** Brief badge text so a command fired from an ordinary page still gives feedback. */
async function flash(text) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: '#7c5cff' });
    await chrome.action.setBadgeText({ text: text.slice(0, 4) });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1600);
  } catch {
    /* badge is cosmetic */
  }
}
