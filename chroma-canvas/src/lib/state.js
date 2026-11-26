/**
 * Single source of truth for Chroma Canvas settings.
 *
 * Settings live in chrome.storage.local under one key so a read is one hop and
 * writes can be diffed cheaply. User media (wallpapers, videos, custom icons)
 * is far too big for storage quotas, so it goes into IndexedDB as Blobs and
 * settings only ever hold the media id.
 */

export const STORE_KEY = 'chroma';

export const SEARCH_ENGINES = {
  google: { name: 'Google', url: 'https://www.google.com/search?q=%s' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
  brave: { name: 'Brave', url: 'https://search.brave.com/search?q=%s' },
  startpage: { name: 'Startpage', url: 'https://www.startpage.com/sp/search?query=%s' },
  youtube: { name: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s' },
  perplexity: { name: 'Perplexity', url: 'https://www.perplexity.ai/search?q=%s' }
};

export const GRADIENTS = {
  nebula:   ['#1b1033', '#5b21b6', '#db2777'],
  aurora:   ['#021b33', '#0e7490', '#34d399'],
  sunset:   ['#1a0b2e', '#c2410c', '#fbbf24'],
  mint:     ['#042f2e', '#0d9488', '#a7f3d0'],
  ember:    ['#1c0a0a', '#9f1239', '#fb923c'],
  slate:    ['#0b0f17', '#1e293b', '#475569'],
  candy:    ['#2e1065', '#7c3aed', '#f0abfc'],
  deepsea:  ['#010b1a', '#1e3a8a', '#22d3ee'],
  forest:   ['#07160f', '#166534', '#bef264'],
  mono:     ['#000000', '#171717', '#404040'],
  daylight: ['#e0f2fe', '#bfdbfe', '#fef9c3'],
  blush:    ['#fff1f2', '#fecdd3', '#e9d5ff']
};

export const LIVE_ENGINES = {
  aurora:      'Aurora ribbons',
  constellate: 'Constellation',
  warp:        'Starfield warp',
  waves:       'Silk waves',
  matrix:      'Code rain',
  blobs:       'Lava blobs',
  grid:        'Neon grid',
  bokeh:       'Floating bokeh'
};

export const FONTS = {
  Inter: '"Inter", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
  System: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  Rounded: '"Nunito", "Segoe UI Variable", ui-rounded, system-ui, sans-serif',
  Serif: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
  Mono: '"JetBrains Mono", "Cascadia Code", Consolas, ui-monospace, monospace',
  Condensed: '"Oswald", "Haettenschweiler", "Arial Narrow", sans-serif'
};

export const DEFAULTS = {
  version: 1,
  profile: { name: '', greetingStyle: 'timeOfDay' },

  theme: {
    mode: 'dark',
    accent: '#7c5cff',
    accent2: '#22d3ee',
    text: '#f5f7ff',
    surfaceOpacity: 0.16,
    surfaceBlur: 20,
    borderOpacity: 0.18,
    radius: 20,
    font: 'Inter',
    scale: 1,
    customCss: ''
  },

  background: {
    type: 'live',
    solid: '#0b0d14',
    gradient: { preset: 'nebula', angle: 135, animate: true },
    image: { mediaId: null, url: '', fit: 'cover', position: 'center' },
    video: { mediaId: null, url: '', rate: 1, muted: true },
    live: { engine: 'aurora', speed: 1, density: 1, hueShift: 0 },
    effects: { blur: 0, dim: 0.35, saturate: 1, contrast: 1, grain: 0.05, vignette: 0.4 },
    slideshow: { enabled: false, intervalMin: 30, source: 'gradients' }
  },

  layout: {
    preset: 'center',
    density: 'comfy',
    align: 'center',
    maxWidth: 820,
    widgets: {
      greeting: true,
      clock: true,
      search: true,
      shortcuts: true,
      quote: true,
      weather: false,
      todo: false,
      notes: false,
      pomodoro: false,
      stats: false
    },
    order: ['clock', 'greeting', 'search', 'shortcuts', 'weather', 'pomodoro', 'todo', 'notes', 'quote', 'stats']
  },

  clock: { format24: false, seconds: false, style: 'digital', weight: 300, showDate: true },

  search: { engine: 'google', placeholder: 'Search or type a URL…', newTab: false, suggestions: true },

  icons: {
    shape: 'squircle',
    size: 64,
    gap: 18,
    columns: 6,
    style: 'glass',
    labels: true,
    labelSize: 12,
    filter: 'none',
    glow: true,
    hover: 'lift'
  },

  shortcuts: [
    { id: 's1', title: 'Gmail',   url: 'https://mail.google.com',   icon: { type: 'favicon', value: '' } },
    { id: 's2', title: 'YouTube', url: 'https://youtube.com',       icon: { type: 'favicon', value: '' } },
    { id: 's3', title: 'GitHub',  url: 'https://github.com',        icon: { type: 'favicon', value: '' } },
    { id: 's4', title: 'Drive',   url: 'https://drive.google.com',  icon: { type: 'favicon', value: '' } },
    { id: 's5', title: 'Maps',    url: 'https://maps.google.com',   icon: { type: 'favicon', value: '' } },
    { id: 's6', title: 'Claude',  url: 'https://claude.ai',         icon: { type: 'emoji', value: '✳️' } }
  ],

  interactions: {
    cursorTrail: 'none',
    parallax: true,
    tilt: true,
    ripple: true,
    commandPalette: true,
    revealOnLoad: true,
    reducedMotion: false,
    spotlight: true
  },

  weather: { place: '', lat: null, lon: null, unit: 'c', cache: null },

  siteTheme: {
    enabled: false,
    global: {
      darkMode: false,
      darkStrength: 0.9,
      accent: '',
      font: '',
      fontScale: 1,
      readingWidth: 0,
      roundImages: 0,
      customScrollbar: false,
      smoothScroll: false,
      hideFixed: false,
      grayscaleMedia: false,
      customCss: ''
    },
    perSite: {}
  },

  data: { todos: [], notes: '', pomodoro: { work: 25, break: 5 } }
};

/* ------------------------------------------------------------------ merge */

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Recursively fill missing keys from `base`, keeping values from `over`. */
export function merge(base, over) {
  if (!isPlain(base)) return over === undefined ? base : over;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  if (!isPlain(over)) return out;
  for (const k of Object.keys(over)) {
    out[k] = isPlain(base[k]) ? merge(base[k], over[k]) : over[k];
  }
  return out;
}

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let node = obj;
  for (const k of keys) {
    if (!isPlain(node[k])) node[k] = {};
    node = node[k];
  }
  node[last] = value;
  return obj;
}

/* ----------------------------------------------------------------- access */

export async function loadState() {
  const raw = await chrome.storage.local.get(STORE_KEY);
  return merge(DEFAULTS, raw[STORE_KEY] || {});
}

export async function saveState(state) {
  await chrome.storage.local.set({ [STORE_KEY]: state });
  return state;
}

/** Apply `path -> value` pairs and persist. Returns the new state. */
export async function patchState(patches) {
  const state = await loadState();
  for (const [path, value] of Object.entries(patches)) setPath(state, path, value);
  return saveState(state);
}

export function onStateChange(fn) {
  const listener = (changes, area) => {
    if (area !== 'local' || !changes[STORE_KEY]) return;
    fn(merge(DEFAULTS, changes[STORE_KEY].newValue || {}));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

/* ------------------------------------------------------------- media (IDB) */

const DB_NAME = 'chroma-media';
const DB_STORE = 'blobs';
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, run) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(DB_STORE, mode);
        const req = run(t.objectStore(DB_STORE));
        t.oncomplete = () => resolve(req && req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

export const media = {
  async put(file, kind) {
    const id = `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id,
      kind: kind || (file.type.startsWith('video') ? 'video' : 'image'),
      type: file.type,
      name: file.name || 'upload',
      size: file.size,
      added: Date.now(),
      blob: file
    };
    await tx('readwrite', (s) => s.put(record));
    return record;
  },
  get(id) {
    return id ? tx('readonly', (s) => s.get(id)) : Promise.resolve(null);
  },
  async url(id) {
    const rec = await media.get(id);
    return rec ? URL.createObjectURL(rec.blob) : null;
  },
  list() {
    return tx('readonly', (s) => s.getAll()).then((all) =>
      (all || []).map(({ blob, ...meta }) => meta).sort((a, b) => b.added - a.added)
    );
  },
  del(id) {
    return tx('readwrite', (s) => s.delete(id));
  },
  clear() {
    return tx('readwrite', (s) => s.clear());
  }
};
