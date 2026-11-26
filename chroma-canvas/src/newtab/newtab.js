/**
 * New tab entry point.
 *
 * Owns four things: the background stack, the widget stage, pointer/keyboard
 * interactions, and the command palette. Settings UI lives in settings.js and
 * talks back through the shared `ctx` object.
 */

import {
  GRADIENTS, LIVE_ENGINES, SEARCH_ENGINES,
  loadState, patchState, saveState, onStateChange, media
} from '../lib/state.js';
import { applyTheme, gradientCss } from '../lib/paint.js';
import { LiveWallpaper } from './wallpapers.js';
import { WIDGETS, WIDGET_LABELS, BARE_WIDGETS } from './widgets.js';
import { initDrawer } from './settings.js';

const $ = (sel) => document.querySelector(sel);
const stage = $('#stage');
const root = document.documentElement;

let state = null;
let drawer = null;
let lastSlices = {};
let selfPatchAt = 0;

/* ------------------------------------------------------------------- ctx */

const objectUrls = new Set();
function trackUrl(url) {
  if (url) objectUrls.add(url);
  return url;
}

const mediaUrlCache = new Map();
async function mediaUrl(id) {
  if (!id) return null;
  if (mediaUrlCache.has(id)) return mediaUrlCache.get(id);
  const url = trackUrl(await media.url(id));
  mediaUrlCache.set(id, url);
  return url;
}

let toastTimer = 0;
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 2200);
}

const ctx = {
  get state() { return state; },
  async patch(patches) {
    selfPatchAt = Date.now();
    state = await patchState(patches);
    apply();
    return state;
  },
  async replace(next) {
    selfPatchAt = Date.now();
    state = await saveState(next);
    apply();
    return state;
  },
  toast,
  mediaUrl,
  media,
  openDrawer: (tab) => drawer && drawer.open(tab),
  refresh: () => apply(true)
};

/* ------------------------------------------------------- background stack */

const live = new LiveWallpaper($('#bg-live'));
let liveStarted = false;
let videoUrlId = null;
let imageUrlId = null;

async function applyBackground() {
  const bg = state.background;
  const type = bg.type;
  root.dataset.bg = type;
  root.dataset.gradAnimate = bg.gradient.animate ? 'on' : 'off';

  const video = $('#bg-video');

  if (type !== 'live') {
    live.pause();
  }
  if (type !== 'video') {
    video.pause();
    video.removeAttribute('src');
    video.load();
    videoUrlId = null;
  }

  if (type === 'gradient') {
    root.style.setProperty('--grad', gradientCss(currentGradient(bg), bg.gradient.angle));
  } else if (type === 'solid') {
    root.style.setProperty('--base', bg.solid);
  } else if (type === 'image') {
    const id = currentImageId(bg);
    const url = id ? await mediaUrl(id) : bg.image.url;
    if (url && imageUrlId !== url) {
      $('#bg-image').style.backgroundImage = `url("${url}")`;
      imageUrlId = url;
    }
    $('#bg-image').style.backgroundSize = bg.image.fit;
    $('#bg-image').style.backgroundPosition = bg.image.position;
    if (!url) root.dataset.bg = 'gradient';
  } else if (type === 'video') {
    const url = bg.video.mediaId ? await mediaUrl(bg.video.mediaId) : bg.video.url;
    if (!url) {
      root.dataset.bg = 'gradient';
      root.style.setProperty('--grad', gradientCss(currentGradient(bg), bg.gradient.angle));
    } else {
      if (videoUrlId !== url) {
        video.src = url;
        videoUrlId = url;
      }
      video.muted = bg.video.muted;
      video.playbackRate = bg.video.rate;
      video.play().catch(() => {});
    }
  } else if (type === 'live') {
    live.configure({
      engine: currentEngine(bg),
      speed: bg.live.speed,
      density: bg.live.density,
      hueShift: bg.live.hueShift,
      accent: state.theme.accent,
      accent2: state.theme.accent2
    });
    if (!liveStarted) {
      live.start();
      liveStarted = true;
    } else {
      live.play();
    }
  }
}

/* Slideshow rotation is derived from the clock rather than a timer, so every
   tab lands on the same pick and a fresh tab advances it on schedule. */
function slideIndex(bg, length) {
  if (!bg.slideshow.enabled || length < 2) return null;
  const bucket = Math.floor(Date.now() / (Math.max(1, bg.slideshow.intervalMin) * 60000));
  return bucket % length;
}

function currentGradient(bg) {
  const keys = Object.keys(GRADIENTS);
  if (bg.type !== 'gradient') return bg.gradient.preset;
  const i = bg.slideshow.enabled && bg.slideshow.source === 'gradients' ? slideIndex(bg, keys.length) : null;
  return i == null ? bg.gradient.preset : keys[i];
}

function currentEngine(bg) {
  const keys = Object.keys(LIVE_ENGINES);
  const i = bg.slideshow.enabled && bg.slideshow.source === 'engines' ? slideIndex(bg, keys.length) : null;
  return i == null ? bg.live.engine : keys[i];
}

let uploadImageIds = [];
function currentImageId(bg) {
  if (bg.slideshow.enabled && bg.slideshow.source === 'uploads' && uploadImageIds.length > 1) {
    const i = slideIndex(bg, uploadImageIds.length);
    if (i != null) return uploadImageIds[i];
  }
  return bg.image.mediaId;
}

/* --------------------------------------------------------------- shuffle */

async function shuffle() {
  const bg = state.background;
  const rnd = (arr) => arr[(Math.random() * arr.length) | 0];

  if (bg.type === 'live') {
    const next = rnd(Object.keys(LIVE_ENGINES).filter((k) => k !== bg.live.engine));
    await ctx.patch({ 'background.live.engine': next });
    toast(LIVE_ENGINES[next]);
  } else if (bg.type === 'image' || bg.type === 'video') {
    const kind = bg.type === 'video' ? 'video' : 'image';
    const all = (await media.list()).filter((m) => m.kind === kind);
    if (all.length < 2) { toast(`Upload more ${kind}s to shuffle`); return; }
    const key = bg.type === 'video' ? 'background.video.mediaId' : 'background.image.mediaId';
    const cur = bg.type === 'video' ? bg.video.mediaId : bg.image.mediaId;
    const next = rnd(all.filter((m) => m.id !== cur));
    await ctx.patch({ [key]: next.id });
    toast(next.name);
  } else {
    const next = rnd(Object.keys(GRADIENTS).filter((k) => k !== bg.gradient.preset));
    await ctx.patch({ 'background.type': 'gradient', 'background.gradient.preset': next });
    toast(next);
  }
}

/* ----------------------------------------------------------------- stage */

const tickers = [];

function renderStage() {
  for (const t of tickers.splice(0)) t.stop = true;
  stage.textContent = '';

  const order = state.layout.order.filter((k) => WIDGETS[k]);
  for (const k of Object.keys(WIDGETS)) if (!order.includes(k)) order.push(k);

  let i = 0;
  for (const name of order) {
    if (!state.layout.widgets[name]) continue;
    const def = WIDGETS[name];

    const section = document.createElement('section');
    section.className = 'widget';
    section.dataset.widget = name;
    section.style.setProperty('--i', i++);

    const bare = BARE_WIDGETS.has(name) || state.layout.preset === 'minimal';
    let host = section;
    if (!bare) {
      const card = document.createElement('div');
      card.className = 'card';
      if (def.title) {
        const h = document.createElement('h3');
        h.className = 'card-title';
        h.textContent = def.title;
        card.appendChild(h);
      }
      section.appendChild(card);
      host = card;
    }

    let body;
    try {
      body = def.render(ctx);
    } catch (err) {
      console.error(`[chroma] widget "${name}" failed to render`, err);
      continue;
    }
    host.appendChild(body);
    stage.appendChild(section);

    if (def.tick) {
      const ticker = { stop: false };
      tickers.push(ticker);
      const run = () => {
        if (ticker.stop || !body.isConnected) return;
        try { def.tick(body, ctx); } catch (err) { console.error(err); ticker.stop = true; return; }
        setTimeout(run, 250);
      };
      setTimeout(run, 250);
    }
  }

  if (!stage.children.length) {
    const empty = document.createElement('div');
    empty.className = 'card widget';
    empty.innerHTML = `<p class="field-help">Every widget is switched off. Press <kbd>,</kbd> to open Customize.</p>`;
    stage.appendChild(empty);
  }
}

/* Keep caret and focus across a re-render so typing in the scratchpad or the
   search field survives a state write. */
function captureFocus() {
  const a = document.activeElement;
  if (!a || !stage.contains(a)) return null;
  const widget = a.closest('[data-widget]');
  if (!widget) return null;
  const sameTag = [...widget.querySelectorAll(a.tagName)];
  return {
    widget: widget.dataset.widget,
    tag: a.tagName,
    index: sameTag.indexOf(a),
    start: a.selectionStart ?? null,
    end: a.selectionEnd ?? null
  };
}

function restoreFocus(snap) {
  if (!snap) return;
  const widget = stage.querySelector(`[data-widget="${snap.widget}"]`);
  if (!widget) return;
  const target = widget.querySelectorAll(snap.tag)[snap.index];
  if (!target) return;
  target.focus();
  if (snap.start != null && target.setSelectionRange) {
    try { target.setSelectionRange(snap.start, snap.end); } catch { /* not a text field */ }
  }
}

/* ----------------------------------------------------------------- apply */

function sliceKeys() {
  return {
    bg: JSON.stringify(state.background),
    theme: JSON.stringify(state.theme),
    stage: JSON.stringify([
      state.layout, state.clock, state.search, state.shortcuts,
      state.icons, state.profile, state.weather.place, state.weather.unit, state.data
    ]),
    interactions: JSON.stringify(state.interactions)
  };
}

function apply(force = false) {
  const next = sliceKeys();
  applyTheme(state);

  if (force || next.bg !== lastSlices.bg || next.theme !== lastSlices.theme) {
    applyBackground().catch((err) => console.error('[chroma] background failed', err));
  }
  if (force || next.stage !== lastSlices.stage) {
    const snap = captureFocus();
    renderStage();
    restoreFocus(snap);
  }
  if (force || next.interactions !== lastSlices.interactions) {
    applyInteractions();
  }
  lastSlices = next;
}

/* ---------------------------------------------------------- interactions */

let pointerBound = false;

function applyInteractions() {
  const it = state.interactions;
  root.dataset.parallax = it.parallax ? 'on' : 'off';
  root.dataset.spotlight = it.spotlight ? 'on' : 'off';
  root.dataset.motion = it.reducedMotion ? 'reduced' : 'full';

  if (pointerBound) return;
  pointerBound = true;

  let lastTrail = 0;
  addEventListener('pointermove', (e) => {
    const it2 = state.interactions;
    const nx = e.clientX / innerWidth;
    const ny = e.clientY / innerHeight;

    if (it2.spotlight) {
      root.style.setProperty('--mx', `${nx * 100}%`);
      root.style.setProperty('--my', `${ny * 100}%`);
    }
    if (it2.parallax && !it2.reducedMotion) {
      root.style.setProperty('--px', (nx - 0.5) * 2);
      root.style.setProperty('--py', (ny - 0.5) * 2);
    }
    if (it2.cursorTrail !== 'none' && !it2.reducedMotion && e.timeStamp - lastTrail > 28) {
      lastTrail = e.timeStamp;
      spawnTrail(e.clientX, e.clientY, it2.cursorTrail);
    }
  }, { passive: true });

  addEventListener('pointerdown', (e) => {
    if (!state.interactions.ripple || state.interactions.reducedMotion) return;
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
    $('#trail-layer').appendChild(dot);
    setTimeout(() => dot.remove(), 640);
  });

  // 3D tilt on hovered cards
  stage.addEventListener('pointermove', (e) => {
    if (!state.interactions.tilt || state.interactions.reducedMotion) return;
    const card = e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(900px) rotateY(${dx * 5}deg) rotateX(${-dy * 5}deg)`;
  });
  stage.addEventListener('pointerout', (e) => {
    const card = e.target.closest && e.target.closest('.card');
    if (card) card.style.transform = '';
  });
}

function spawnTrail(x, y, kind) {
  const layer = $('#trail-layer');
  const n = kind === 'spark' ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const dot = document.createElement('span');
    dot.className = `trail-dot${kind === 'spark' ? ' spark' : ''}`;
    const jitter = kind === 'spark' ? 14 : 0;
    dot.style.left = `${x + (Math.random() - 0.5) * jitter}px`;
    dot.style.top = `${y + (Math.random() - 0.5) * jitter}px`;
    if (kind === 'ring') {
      dot.style.background = 'transparent';
      dot.style.border = '2px solid var(--accent)';
      dot.style.boxShadow = 'none';
    }
    layer.appendChild(dot);
    setTimeout(() => dot.remove(), 720);
  }
}

/* -------------------------------------------------------------- palette */

const paletteEl = $('#palette');
const paletteInput = $('#palette-input');
const paletteList = $('#palette-list');
let paletteItems = [];
let paletteIndex = 0;

function commandItems() {
  const items = [];

  for (const sc of state.shortcuts) {
    items.push({ glyph: '→', label: sc.title || sc.url, kind: 'open', run: () => { location.href = sc.url; } });
  }

  const browserPages = [
    ['History', 'chrome://history'],
    ['Downloads', 'chrome://downloads'],
    ['Bookmarks', 'chrome://bookmarks'],
    ['Extensions', 'chrome://extensions'],
    ['Chrome settings', 'chrome://settings'],
    ['Appearance / themes', 'chrome://settings/appearance']
  ];
  for (const [label, url] of browserPages) {
    items.push({
      glyph: '⌘', label, kind: 'chrome',
      run: () => chrome.tabs.update({ url }).catch(() => toast('Chrome blocked that page'))
    });
  }

  items.push({ glyph: '⚙', label: 'Open Customize panel', kind: 'action', run: () => drawer.open() });
  items.push({ glyph: '🎲', label: 'Shuffle wallpaper', kind: 'action', run: shuffle });

  for (const [key, label] of Object.entries(LIVE_ENGINES)) {
    items.push({
      glyph: '✨', label: `Live wallpaper: ${label}`, kind: 'wallpaper',
      run: () => ctx.patch({ 'background.type': 'live', 'background.live.engine': key })
    });
  }
  for (const key of Object.keys(GRADIENTS)) {
    items.push({
      glyph: '🎨', label: `Gradient: ${key}`, kind: 'wallpaper',
      run: () => ctx.patch({ 'background.type': 'gradient', 'background.gradient.preset': key })
    });
  }

  for (const [name, label] of Object.entries(WIDGET_LABELS)) {
    const on = state.layout.widgets[name];
    items.push({
      glyph: on ? '◉' : '○', label: `${on ? 'Hide' : 'Show'} ${label}`, kind: 'widget',
      run: () => ctx.patch({ [`layout.widgets.${name}`]: !on })
    });
  }

  for (const preset of ['center', 'minimal', 'grid', 'sidebar', 'zen']) {
    items.push({
      glyph: '▤', label: `Layout: ${preset}`, kind: 'layout',
      run: () => ctx.patch({ 'layout.preset': preset })
    });
  }

  const siteOn = state.siteTheme.enabled;
  items.push({
    glyph: '🖌', label: `${siteOn ? 'Disable' : 'Enable'} website theming`, kind: 'action',
    run: () => ctx.patch({ 'siteTheme.enabled': !siteOn })
  });
  items.push({
    glyph: '◐', label: `Switch to ${state.theme.mode === 'dark' ? 'light' : 'dark'} mode`, kind: 'action',
    run: () => ctx.patch({ 'theme.mode': state.theme.mode === 'dark' ? 'light' : 'dark' })
  });

  return items;
}

function openPalette() {
  paletteEl.hidden = false;
  paletteInput.value = '';
  filterPalette('');
  paletteInput.focus();
}

function closePalette() {
  paletteEl.hidden = true;
}

function filterPalette(query) {
  const q = query.trim().toLowerCase();
  let items = commandItems();

  if (q) {
    items = items
      .map((it) => ({ it, score: fuzzyScore(it.label.toLowerCase(), q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.it)
      .slice(0, 40);

    const engine = SEARCH_ENGINES[state.search.engine] || SEARCH_ENGINES.google;
    items.unshift({
      glyph: '⌕', label: `Search ${engine.name} for “${query.trim()}”`, kind: 'search',
      run: () => { location.href = engine.url.replace('%s', encodeURIComponent(query.trim())); }
    });
  } else {
    items = items.slice(0, 40);
  }

  paletteItems = items;
  paletteIndex = 0;
  paletteList.textContent = '';
  items.forEach((it, i) => {
    const li = document.createElement('li');
    li.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    li.innerHTML = `<span class="pl-glyph">${it.glyph}</span><span class="pl-text"></span><span class="pl-kind">${it.kind}</span>`;
    li.querySelector('.pl-text').textContent = it.label;
    li.addEventListener('click', () => { closePalette(); it.run(); });
    li.addEventListener('pointerenter', () => selectPalette(i));
    paletteList.appendChild(li);
  });
}

/** Subsequence match: every query char in order, bonus for word starts. */
function fuzzyScore(text, q) {
  let ti = 0, score = 0;
  for (const ch of q) {
    const found = text.indexOf(ch, ti);
    if (found === -1) return 0;
    score += found === 0 || text[found - 1] === ' ' || text[found - 1] === ':' ? 3 : 1;
    ti = found + 1;
  }
  if (text.startsWith(q)) score += 12;
  return score;
}

function selectPalette(i) {
  paletteIndex = (i + paletteItems.length) % paletteItems.length;
  [...paletteList.children].forEach((li, idx) => {
    const on = idx === paletteIndex;
    li.setAttribute('aria-selected', on ? 'true' : 'false');
    if (on) li.scrollIntoView({ block: 'nearest' });
  });
}

paletteInput.addEventListener('input', () => filterPalette(paletteInput.value));

paletteInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); selectPalette(paletteIndex + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); selectPalette(paletteIndex - 1); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    const it = paletteItems[paletteIndex];
    closePalette();
    if (it) it.run();
  } else if (e.key === 'Escape') {
    closePalette();
  }
});

paletteEl.addEventListener('pointerdown', (e) => {
  if (e.target === paletteEl) closePalette();
});

/* ------------------------------------------------------------- keyboard */

const isTyping = () => {
  const a = document.activeElement;
  return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
};

addEventListener('keydown', (e) => {
  const inPalette = !paletteEl.hidden;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (!state.interactions.commandPalette) return;
    inPalette ? closePalette() : openPalette();
    return;
  }

  if (e.key === 'Escape') {
    if (inPalette) return closePalette();
    if (drawer && drawer.isOpen()) return drawer.close();
  }

  if (isTyping() || inPalette) return;

  if (e.key === ',') { e.preventDefault(); drawer.toggle(); }
  else if (e.key === '/') { e.preventDefault(); const i = stage.querySelector('.search-box input'); if (i) i.focus(); }
  else if (e.key.toLowerCase() === 'w' && e.altKey) { e.preventDefault(); shuffle(); }
  else if (/^[1-9]$/.test(e.key) && e.altKey) {
    const sc = state.shortcuts[Number(e.key) - 1];
    if (sc) { e.preventDefault(); location.href = sc.url; }
  }
});

/* ----------------------------------------------------------------- boot */

$('#btn-settings').addEventListener('click', () => drawer.toggle());
$('#btn-shuffle').addEventListener('click', shuffle);

async function boot() {
  state = await loadState();
  drawer = initDrawer(ctx);

  apply(true);

  // The uploads slideshow needs the media list, but IndexedDB can be slow or
  // flatly unavailable (private window, blocked site data) and must never keep
  // the page from rendering — so this runs after the first paint, not before.
  media.list()
    .then((items) => {
      uploadImageIds = items.filter((m) => m.kind === 'image').map((m) => m.id);
      const ss = state.background.slideshow;
      if (ss.enabled && ss.source === 'uploads') applyBackground().catch(() => {});
    })
    .catch((err) => console.warn('[chroma] media store unavailable', err));

  if (new URLSearchParams(location.search).get('settings')) drawer.open();

  // Other tabs (and the popup) write the same key — mirror their changes here.
  onStateChange((next) => {
    const fromSelf = Date.now() - selfPatchAt < 400;
    state = next;
    if (fromSelf) { lastSlices = sliceKeys(); applyTheme(state); return; }
    apply();
  });

  // Long-lived tabs still need the slideshow to advance.
  setInterval(() => {
    if (state.background.slideshow.enabled) applyBackground().catch(() => {});
  }, 60000);

  addEventListener('beforeunload', () => {
    for (const u of objectUrls) URL.revokeObjectURL(u);
  });
}

boot().catch((err) => {
  console.error('[chroma] boot failed', err);
  document.body.innerHTML =
    `<pre style="padding:40px;font:14px/1.6 ui-monospace">Chroma Canvas failed to start.\n\n${err}\n\nOpen DevTools on this page for the full trace.</pre>`;
});
