/**
 * Toolbar popup — quick switches plus per-site overrides for whatever tab is
 * in front. Everything writes through patchState, so the new tab page and the
 * content scripts pick changes up through the storage listener.
 */

import { GRADIENTS, LIVE_ENGINES, loadState, patchState } from '../lib/state.js';
import { gradientCss } from '../lib/paint.js';

const ACCENTS = [
  '#7c5cff', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#f472b6', '#a3e635', '#60a5fa',
  '#f97316', '#e879f9', '#2dd4bf', '#f43f5e', '#94a3b8', '#eab308', '#8b5cf6', '#06b6d4'
];

const $ = (s) => document.querySelector(s);
let state = null;
let host = '';

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

async function patch(patches) {
  state = await patchState(patches);
  render();
}

/* ---------------------------------------------------------------- render */

function render() {
  document.documentElement.style.setProperty('--accent', state.theme.accent);

  // accents
  const sw = $('#swatches');
  sw.textContent = '';
  for (const c of ACCENTS) {
    const b = el('button', 'swatch');
    b.style.background = c;
    b.title = c;
    b.setAttribute('aria-pressed', c.toLowerCase() === state.theme.accent.toLowerCase() ? 'true' : 'false');
    b.addEventListener('click', () => patch({ 'theme.accent': c }));
    sw.appendChild(b);
  }

  // mode
  const modes = $('#mode-chips');
  modes.textContent = '';
  for (const [v, l] of [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto']]) {
    const b = el('button', 'chip', l);
    b.setAttribute('aria-pressed', state.theme.mode === v ? 'true' : 'false');
    b.addEventListener('click', () => patch({ 'theme.mode': v }));
    modes.appendChild(b);
  }

  // wallpaper type
  const types = $('#bg-type');
  types.textContent = '';
  for (const [v, l] of [['live', 'Live'], ['gradient', 'Gradient'], ['image', 'Image'], ['video', 'Video'], ['solid', 'Solid']]) {
    const b = el('button', 'chip', l);
    b.setAttribute('aria-pressed', state.background.type === v ? 'true' : 'false');
    b.addEventListener('click', () => patch({ 'background.type': v }));
    types.appendChild(b);
  }

  // wallpaper choice
  const choice = $('#bg-choice');
  choice.textContent = '';
  if (state.background.type === 'live') {
    for (const [v, l] of Object.entries(LIVE_ENGINES)) {
      const b = el('button', 'chip', l);
      b.setAttribute('aria-pressed', state.background.live.engine === v ? 'true' : 'false');
      b.addEventListener('click', () => patch({ 'background.live.engine': v }));
      choice.appendChild(b);
    }
  } else if (state.background.type === 'gradient') {
    for (const name of Object.keys(GRADIENTS)) {
      const b = el('button', 'grad-chip');
      b.title = name;
      b.style.backgroundImage = gradientCss(name, 135);
      b.setAttribute('aria-pressed', state.background.gradient.preset === name ? 'true' : 'false');
      b.addEventListener('click', () => patch({ 'background.gradient.preset': name }));
      choice.appendChild(b);
    }
  } else {
    choice.appendChild(el('p', 'hint', 'Pick files in Customize → Background.'));
  }

  // site section
  $('#host').textContent = host || '—';
  const enabled = state.siteTheme.enabled;
  $('#site-enabled').checked = enabled;
  $('#site-controls').classList.toggle('off', !enabled || !host);

  const per = state.siteTheme.perSite[host] || {};
  $('#site-disabled').checked = !!per.disabled;
  $('#site-dark').checked = per.darkMode !== undefined ? !!per.darkMode : !!state.siteTheme.global.darkMode;
  $('#site-scrollbar').checked = per.customScrollbar !== undefined ? !!per.customScrollbar : !!state.siteTheme.global.customScrollbar;

  const width = per.readingWidth ?? state.siteTheme.global.readingWidth ?? 0;
  $('#site-width').value = width;
  $('#site-width-val').textContent = width > 0 ? `${width}px centred column` : 'Reading width off';
}

/* ---------------------------------------------------------- per-site set */

function setPerSite(key, value) {
  if (!host) return;
  const perSite = { ...state.siteTheme.perSite };
  const entry = { ...(perSite[host] || {}) };
  // Drop keys set back to their "unset" value so the global default wins again.
  if (value === false || value === 0 || value === '') delete entry[key];
  else entry[key] = value;
  if (Object.keys(entry).length) perSite[host] = entry;
  else delete perSite[host];
  patch({ 'siteTheme.perSite': perSite });
}

/* ------------------------------------------------------------------ wire */

$('#site-enabled').addEventListener('change', (e) => patch({ 'siteTheme.enabled': e.target.checked }));
$('#site-disabled').addEventListener('change', (e) => setPerSite('disabled', e.target.checked));
$('#site-dark').addEventListener('change', (e) => setPerSite('darkMode', e.target.checked));
$('#site-scrollbar').addEventListener('change', (e) => setPerSite('customScrollbar', e.target.checked));

$('#site-width').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  $('#site-width-val').textContent = v > 0 ? `${v}px centred column` : 'Reading width off';
});
$('#site-width').addEventListener('change', (e) => setPerSite('readingWidth', Number(e.target.value)));

$('#shuffle').addEventListener('click', async () => {
  const bg = state.background;
  const rnd = (arr) => arr[(Math.random() * arr.length) | 0];
  if (bg.type === 'live') {
    const keys = Object.keys(LIVE_ENGINES).filter((k) => k !== bg.live.engine);
    await patch({ 'background.live.engine': rnd(keys) });
  } else {
    const keys = Object.keys(GRADIENTS).filter((k) => k !== bg.gradient.preset);
    await patch({ 'background.type': 'gradient', 'background.gradient.preset': rnd(keys) });
  }
});

$('#open-full').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/newtab/newtab.html?settings=1') });
  window.close();
});

/* ------------------------------------------------------------------ boot */

(async () => {
  state = await loadState();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && /^https?:/.test(tab.url)) {
      host = new URL(tab.url).hostname.replace(/^www\./, '');
    }
  } catch {
    /* no accessible tab — the per-site block stays disabled */
  }
  render();
})();
