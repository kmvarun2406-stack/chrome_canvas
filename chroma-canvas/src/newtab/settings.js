/**
 * The Customize drawer.
 *
 * Most of the panel is declared as data in SCHEMA and rendered by a small set
 * of control factories, so adding an option means adding one object. The four
 * things that need real UI — the media library, the shortcut editor, the widget
 * reorder list and the Chrome-theme exporter — are `custom` fields.
 */

import {
  DEFAULTS, GRADIENTS, LIVE_ENGINES, FONTS, SEARCH_ENGINES,
  getPath, media, merge
} from '../lib/state.js';
import { gradientCss, hexToRgb } from '../lib/paint.js';
import { WIDGET_LABELS, iconNode } from './widgets.js';

const ACCENT_SWATCHES = [
  '#7c5cff', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#f472b6',
  '#a3e635', '#60a5fa', '#f97316', '#e879f9', '#2dd4bf', '#f43f5e',
  '#94a3b8', '#eab308', '#8b5cf6', '#06b6d4'
];

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const opts = (o) => Object.entries(o).map(([v, l]) => [v, typeof l === 'string' ? l : l.name]);

/* ---------------------------------------------------------------- schema */

const SCHEMA = [
  /* ---------------------------------------------------------- background */
  {
    id: 'background',
    label: 'Background',
    fields: [
      { type: 'chips', path: 'background.type', label: 'Source', options: [
        ['live', 'Live'], ['gradient', 'Gradient'], ['image', 'Image'], ['video', 'Video'], ['solid', 'Solid']
      ] },

      { type: 'sub', label: 'Live wallpaper', when: (s) => s.background.type === 'live' },
      { type: 'select', path: 'background.live.engine', label: 'Engine', options: opts(LIVE_ENGINES), when: (s) => s.background.type === 'live' },
      { type: 'range', path: 'background.live.speed', label: 'Speed', min: 0.1, max: 3, step: 0.1, when: (s) => s.background.type === 'live' },
      { type: 'range', path: 'background.live.density', label: 'Density', min: 0.2, max: 2.5, step: 0.1, when: (s) => s.background.type === 'live' },
      { type: 'range', path: 'background.live.hueShift', label: 'Hue shift', min: -180, max: 180, step: 5, unit: '°', when: (s) => s.background.type === 'live' },
      { type: 'note', label: 'Live wallpapers are drawn from your accent colours and pause when the tab is hidden.', when: (s) => s.background.type === 'live' },

      { type: 'sub', label: 'Gradient', when: (s) => s.background.type === 'gradient' },
      { type: 'custom', id: 'gradientGrid', when: (s) => s.background.type === 'gradient' },
      { type: 'range', path: 'background.gradient.angle', label: 'Angle', min: 0, max: 360, step: 5, unit: '°', when: (s) => s.background.type === 'gradient' },
      { type: 'toggle', path: 'background.gradient.animate', label: 'Drift slowly', when: (s) => s.background.type === 'gradient' },

      { type: 'sub', label: 'Image', when: (s) => s.background.type === 'image' },
      { type: 'custom', id: 'mediaLibrary', kind: 'image', when: (s) => s.background.type === 'image' },
      { type: 'text', path: 'background.image.url', label: '…or paste an image URL', placeholder: 'https://…', when: (s) => s.background.type === 'image' },
      { type: 'select', path: 'background.image.fit', label: 'Fit', options: [['cover', 'Cover'], ['contain', 'Contain'], ['auto', 'Actual size'], ['100% 100%', 'Stretch']], when: (s) => s.background.type === 'image' },
      { type: 'select', path: 'background.image.position', label: 'Position', options: [['center', 'Center'], ['top', 'Top'], ['bottom', 'Bottom'], ['left', 'Left'], ['right', 'Right']], when: (s) => s.background.type === 'image' },

      { type: 'sub', label: 'Video', when: (s) => s.background.type === 'video' },
      { type: 'custom', id: 'mediaLibrary', kind: 'video', when: (s) => s.background.type === 'video' },
      { type: 'text', path: 'background.video.url', label: '…or paste a video URL', placeholder: 'https://… .mp4 / .webm', when: (s) => s.background.type === 'video' },
      { type: 'range', path: 'background.video.rate', label: 'Playback speed', min: 0.1, max: 2, step: 0.1, unit: '×', when: (s) => s.background.type === 'video' },
      { type: 'toggle', path: 'background.video.muted', label: 'Muted', when: (s) => s.background.type === 'video' },
      { type: 'note', label: 'Chrome will not autoplay a video with sound, so leave Muted on unless you plan to click play.', when: (s) => s.background.type === 'video' },

      { type: 'sub', label: 'Solid', when: (s) => s.background.type === 'solid' },
      { type: 'color', path: 'background.solid', label: 'Colour', when: (s) => s.background.type === 'solid' },

      { type: 'sub', label: 'Treatment' },
      { type: 'range', path: 'background.effects.blur', label: 'Blur', min: 0, max: 40, step: 1, unit: 'px' },
      { type: 'range', path: 'background.effects.dim', label: 'Dim', min: 0, max: 0.92, step: 0.02 },
      { type: 'range', path: 'background.effects.saturate', label: 'Saturation', min: 0, max: 2.5, step: 0.05, unit: '×' },
      { type: 'range', path: 'background.effects.contrast', label: 'Contrast', min: 0.4, max: 2, step: 0.05, unit: '×' },
      { type: 'range', path: 'background.effects.vignette', label: 'Vignette', min: 0, max: 1, step: 0.05 },
      { type: 'range', path: 'background.effects.grain', label: 'Film grain', min: 0, max: 0.3, step: 0.01 },

      { type: 'sub', label: 'Slideshow' },
      { type: 'toggle', path: 'background.slideshow.enabled', label: 'Rotate automatically' },
      { type: 'select', path: 'background.slideshow.source', label: 'Rotate through', options: [['gradients', 'Gradient presets'], ['engines', 'Live wallpapers'], ['uploads', 'My uploaded images']], when: (s) => s.background.slideshow.enabled },
      { type: 'range', path: 'background.slideshow.intervalMin', label: 'Change every', min: 1, max: 240, step: 1, unit: ' min', when: (s) => s.background.slideshow.enabled }
    ]
  },

  /* --------------------------------------------------------------- theme */
  {
    id: 'theme',
    label: 'Colour',
    fields: [
      { type: 'chips', path: 'theme.mode', label: 'Mode', options: [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Follow system']] },
      { type: 'custom', id: 'accentSwatches' },
      { type: 'color', path: 'theme.accent', label: 'Accent' },
      { type: 'color', path: 'theme.accent2', label: 'Secondary accent' },
      { type: 'color', path: 'theme.text', label: 'Text colour (dark mode)' },

      { type: 'sub', label: 'Surfaces' },
      { type: 'range', path: 'theme.surfaceOpacity', label: 'Panel opacity', min: 0, max: 0.6, step: 0.01 },
      { type: 'range', path: 'theme.surfaceBlur', label: 'Frosted blur', min: 0, max: 50, step: 1, unit: 'px' },
      { type: 'range', path: 'theme.borderOpacity', label: 'Border strength', min: 0, max: 0.6, step: 0.01 },
      { type: 'range', path: 'theme.radius', label: 'Corner radius', min: 0, max: 40, step: 1, unit: 'px' },

      { type: 'sub', label: 'Type' },
      { type: 'select', path: 'theme.font', label: 'Font', options: opts(FONTS) },
      { type: 'range', path: 'theme.scale', label: 'Text scale', min: 0.8, max: 1.5, step: 0.05, unit: '×' },

      { type: 'sub', label: "Chrome's own frame" },
      { type: 'custom', id: 'themeExport' },

      { type: 'sub', label: 'Custom CSS' },
      { type: 'textarea', path: 'theme.customCss', label: 'Applied to this new tab page', placeholder: '.clock-time { letter-spacing: -0.06em; }' }
    ]
  },

  /* -------------------------------------------------------------- layout */
  {
    id: 'layout',
    label: 'Layout',
    fields: [
      { type: 'chips', path: 'layout.preset', label: 'Preset', options: [
        ['center', 'Centre stack'], ['minimal', 'Minimal'], ['grid', 'Grid board'], ['sidebar', 'Sidebar'], ['zen', 'Zen (reveal on hover)']
      ] },
      { type: 'chips', path: 'layout.density', label: 'Density', options: [['compact', 'Compact'], ['comfy', 'Comfortable'], ['airy', 'Airy']] },
      { type: 'chips', path: 'layout.align', label: 'Alignment', options: [['left', 'Left'], ['center', 'Centre'], ['right', 'Right']] },
      { type: 'range', path: 'layout.maxWidth', label: 'Content width', min: 420, max: 1600, step: 20, unit: 'px' },

      { type: 'sub', label: 'Clock' },
      { type: 'select', path: 'clock.style', label: 'Style', options: [
        ['digital', 'Digital'], ['gradient', 'Gradient fill'], ['outline', 'Outline'], ['mono', 'Monospace'], ['text', 'Words'], ['analog', 'Analog']
      ] },
      { type: 'toggle', path: 'clock.format24', label: '24-hour time' },
      { type: 'toggle', path: 'clock.seconds', label: 'Show seconds' },
      { type: 'toggle', path: 'clock.showDate', label: 'Show date' },
      { type: 'range', path: 'clock.weight', label: 'Weight', min: 100, max: 800, step: 100 },

      { type: 'sub', label: 'Greeting' },
      { type: 'text', path: 'profile.name', label: 'Your name', placeholder: 'optional' },
      { type: 'select', path: 'profile.greetingStyle', label: 'Greeting', options: [
        ['timeOfDay', 'Time of day'], ['static', 'Just hello'], ['motivational', 'Daily nudge']
      ] },

      { type: 'sub', label: 'Search bar' },
      { type: 'select', path: 'search.engine', label: 'Engine', options: opts(SEARCH_ENGINES) },
      { type: 'text', path: 'search.placeholder', label: 'Placeholder text' },
      { type: 'toggle', path: 'search.newTab', label: 'Open results in a new tab' }
    ]
  },

  /* --------------------------------------------------------------- icons */
  {
    id: 'icons',
    label: 'Icons',
    fields: [
      { type: 'chips', path: 'icons.shape', label: 'Shape', options: [
        ['circle', 'Circle'], ['squircle', 'Squircle'], ['rounded', 'Rounded'], ['square', 'Square'],
        ['hex', 'Hexagon'], ['diamond', 'Diamond'], ['blob', 'Blob'], ['ticket', 'Ticket']
      ] },
      { type: 'chips', path: 'icons.style', label: 'Treatment', options: [
        ['glass', 'Glass'], ['flat', 'Flat'], ['outline', 'Outline'], ['gradient', 'Gradient'],
        ['neumorph', 'Soft'], ['neon', 'Neon'], ['bare', 'No container']
      ] },
      { type: 'chips', path: 'icons.filter', label: 'Icon colour', options: [
        ['none', 'Original'], ['grayscale', 'Grayscale'], ['mono', 'Monochrome'],
        ['duotone', 'Duotone'], ['invert', 'Inverted'], ['vivid', 'Vivid']
      ] },
      { type: 'chips', path: 'icons.hover', label: 'Hover effect', options: [
        ['lift', 'Lift'], ['zoom', 'Zoom'], ['spin', 'Tilt'], ['jelly', 'Jelly'], ['none', 'None']
      ] },
      { type: 'range', path: 'icons.size', label: 'Tile size', min: 36, max: 128, step: 2, unit: 'px' },
      { type: 'range', path: 'icons.gap', label: 'Spacing', min: 4, max: 56, step: 2, unit: 'px' },
      { type: 'range', path: 'icons.columns', label: 'Columns', min: 2, max: 12, step: 1 },
      { type: 'toggle', path: 'icons.glow', label: 'Accent glow on hover' },
      { type: 'toggle', path: 'icons.labels', label: 'Show labels' },
      { type: 'range', path: 'icons.labelSize', label: 'Label size', min: 9, max: 18, step: 1, unit: 'px', when: (s) => s.icons.labels }
    ]
  },

  /* ----------------------------------------------------------- shortcuts */
  {
    id: 'shortcuts',
    label: 'Shortcuts',
    fields: [
      { type: 'custom', id: 'shortcutEditor' }
    ]
  },

  /* ------------------------------------------------------------- widgets */
  {
    id: 'widgets',
    label: 'Widgets',
    fields: [
      { type: 'custom', id: 'widgetList' },
      { type: 'sub', label: 'Weather' },
      { type: 'text', path: 'weather.place', label: 'City', placeholder: 'e.g. Hyderabad' },
      { type: 'chips', path: 'weather.unit', label: 'Units', options: [['c', 'Celsius'], ['f', 'Fahrenheit']] },
      { type: 'note', label: 'Weather comes from open-meteo.com. No account or key needed.' },
      { type: 'sub', label: 'Focus timer' },
      { type: 'range', path: 'data.pomodoro.work', label: 'Work block', min: 5, max: 90, step: 5, unit: ' min' },
      { type: 'range', path: 'data.pomodoro.break', label: 'Break', min: 1, max: 30, step: 1, unit: ' min' }
    ]
  },

  /* ------------------------------------------------------------- motion */
  {
    id: 'interactions',
    label: 'Motion',
    fields: [
      { type: 'chips', path: 'interactions.cursorTrail', label: 'Cursor trail', options: [
        ['none', 'Off'], ['glow', 'Glow'], ['spark', 'Sparks'], ['ring', 'Rings']
      ] },
      { type: 'toggle', path: 'interactions.spotlight', label: 'Spotlight follows cursor' },
      { type: 'toggle', path: 'interactions.parallax', label: 'Background parallax' },
      { type: 'toggle', path: 'interactions.tilt', label: 'Cards tilt in 3D' },
      { type: 'toggle', path: 'interactions.ripple', label: 'Click ripples' },
      { type: 'toggle', path: 'interactions.revealOnLoad', label: 'Stagger widgets on open' },
      { type: 'toggle', path: 'interactions.commandPalette', label: 'Command palette (Ctrl+K)' },
      { type: 'toggle', path: 'interactions.reducedMotion', label: 'Reduce all motion' },
      { type: 'sub', label: 'Keyboard' },
      { type: 'note', label: 'Ctrl+K command palette · / focus search · , open this panel · Alt+Shift+W shuffle wallpaper · Alt+1…9 open shortcut' }
    ]
  },

  /* ------------------------------------------------------------ websites */
  {
    id: 'sites',
    label: 'Websites',
    fields: [
      { type: 'toggle', path: 'siteTheme.enabled', label: 'Restyle websites' },
      { type: 'note', label: 'Applies to every site you visit. Per-site overrides live in the toolbar popup.' },
      { type: 'sub', label: 'Defaults for all sites', when: (s) => s.siteTheme.enabled },
      { type: 'toggle', path: 'siteTheme.global.darkMode', label: 'Force dark mode', when: (s) => s.siteTheme.enabled },
      { type: 'range', path: 'siteTheme.global.darkStrength', label: 'Dark strength', min: 0.4, max: 1, step: 0.05, when: (s) => s.siteTheme.enabled && s.siteTheme.global.darkMode },
      { type: 'color', path: 'siteTheme.global.accent', label: 'Override link / accent colour', allowEmpty: true, when: (s) => s.siteTheme.enabled },
      { type: 'select', path: 'siteTheme.global.font', label: 'Override body font', options: [['', 'Leave alone'], ...opts(FONTS)], when: (s) => s.siteTheme.enabled },
      { type: 'range', path: 'siteTheme.global.fontScale', label: 'Text scale', min: 0.8, max: 1.6, step: 0.05, unit: '×', when: (s) => s.siteTheme.enabled },
      { type: 'range', path: 'siteTheme.global.readingWidth', label: 'Reading width (0 = off)', min: 0, max: 1200, step: 20, unit: 'px', when: (s) => s.siteTheme.enabled },
      { type: 'range', path: 'siteTheme.global.roundImages', label: 'Round image corners', min: 0, max: 40, step: 2, unit: 'px', when: (s) => s.siteTheme.enabled },
      { type: 'toggle', path: 'siteTheme.global.customScrollbar', label: 'Accent scrollbar', when: (s) => s.siteTheme.enabled },
      { type: 'toggle', path: 'siteTheme.global.smoothScroll', label: 'Smooth scrolling', when: (s) => s.siteTheme.enabled },
      { type: 'toggle', path: 'siteTheme.global.grayscaleMedia', label: 'Grayscale images until hovered', when: (s) => s.siteTheme.enabled },
      { type: 'toggle', path: 'siteTheme.global.hideFixed', label: 'Hide sticky headers', when: (s) => s.siteTheme.enabled },
      { type: 'textarea', path: 'siteTheme.global.customCss', label: 'Custom CSS for every site', placeholder: 'body { letter-spacing: 0.01em; }', when: (s) => s.siteTheme.enabled },
      { type: 'custom', id: 'perSiteList', when: (s) => s.siteTheme.enabled }
    ]
  }
];

/* ------------------------------------------------------------- controls */

function makeField(field, ctx, rerender) {
  if (field.when && !field.when(ctx.state)) return null;

  switch (field.type) {
    case 'sub':
      return el('div', 'field-sub', field.label);

    case 'note':
      return el('p', 'field-help', field.label);

    case 'toggle': {
      const row = el('div', 'field-row');
      row.appendChild(el('span', 'field-label', field.label));
      const sw = el('label', 'switch');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!getPath(ctx.state, field.path);
      input.addEventListener('change', () => commit(ctx, field, input.checked, rerender));
      sw.append(input, el('span'));
      row.appendChild(sw);
      return row;
    }

    case 'range': {
      const wrap = el('div', 'field');
      const head = el('div', 'field-row');
      head.style.margin = '0';
      head.appendChild(el('span', 'field-label', field.label));
      const value = getPath(ctx.state, field.path);
      const out = el('span', 'field-help', `${round(value)}${field.unit || ''}`);
      head.appendChild(out);
      const input = document.createElement('input');
      input.type = 'range';
      input.min = field.min; input.max = field.max; input.step = field.step;
      input.value = value;
      input.addEventListener('input', () => {
        out.textContent = `${round(Number(input.value))}${field.unit || ''}`;
        // Dragging fires ~60×/s; coalesce so we are not re-rendering the stage
        // on every pixel of travel.
        throttledCommit(ctx, field, Number(input.value));
      });
      // Commit the settled value directly so the re-render never reads a
      // value the throttle has not flushed yet.
      input.addEventListener('change', () => commit(ctx, field, Number(input.value), rerender));
      wrap.append(head, input);
      return wrap;
    }

    case 'select': {
      const wrap = el('div', 'field');
      wrap.appendChild(el('span', 'field-label', field.label));
      const sel = document.createElement('select');
      for (const [v, l] of field.options) {
        const o = document.createElement('option');
        o.value = v; o.textContent = l;
        sel.appendChild(o);
      }
      sel.value = String(getPath(ctx.state, field.path) ?? '');
      sel.addEventListener('change', () => commit(ctx, field, sel.value, rerender));
      wrap.appendChild(sel);
      if (field.help) wrap.appendChild(el('span', 'field-help', field.help));
      return wrap;
    }

    case 'chips': {
      const wrap = el('div', 'field');
      wrap.appendChild(el('span', 'field-label', field.label));
      const row = el('div', 'chips');
      const current = String(getPath(ctx.state, field.path) ?? '');
      for (const [v, l] of field.options) {
        const chip = el('button', 'chip', l);
        chip.type = 'button';
        chip.setAttribute('aria-pressed', v === current ? 'true' : 'false');
        chip.addEventListener('click', () => commit(ctx, field, v, rerender));
        row.appendChild(chip);
      }
      wrap.appendChild(row);
      return wrap;
    }

    case 'color': {
      const row = el('div', 'field-row');
      row.appendChild(el('span', 'field-label', field.label));
      const group = el('div');
      group.style.display = 'flex';
      group.style.gap = '6px';
      group.style.alignItems = 'center';
      const input = document.createElement('input');
      input.type = 'color';
      const raw = getPath(ctx.state, field.path);
      input.value = raw || '#7c5cff';
      input.addEventListener('input', () => commit(ctx, field, input.value, null));
      group.appendChild(input);
      if (field.allowEmpty) {
        const clear = el('button', 'ghost-btn', raw ? 'Clear' : 'Off');
        clear.type = 'button';
        clear.addEventListener('click', () => commit(ctx, field, '', rerender));
        group.appendChild(clear);
      }
      row.appendChild(group);
      return row;
    }

    case 'text': {
      const wrap = el('div', 'field');
      wrap.appendChild(el('span', 'field-label', field.label));
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = field.placeholder || '';
      input.value = getPath(ctx.state, field.path) ?? '';
      let timer;
      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => commit(ctx, field, input.value, null), 350);
      });
      wrap.appendChild(input);
      return wrap;
    }

    case 'textarea': {
      const wrap = el('div', 'field');
      wrap.appendChild(el('span', 'field-label', field.label));
      const area = document.createElement('textarea');
      area.placeholder = field.placeholder || '';
      area.value = getPath(ctx.state, field.path) ?? '';
      area.spellcheck = false;
      let timer;
      area.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => commit(ctx, field, area.value, null), 500);
      });
      wrap.appendChild(area);
      return wrap;
    }

    case 'custom':
      return CUSTOM[field.id](ctx, field, rerender);

    default:
      return null;
  }
}

const round = (n) => (Math.abs(n) < 10 ? Math.round(n * 100) / 100 : Math.round(n));

function commit(ctx, field, value, rerender) {
  ctx.patch({ [field.path]: value }).then(() => rerender && rerender());
}

let throttleTimer = 0;
let throttlePending = null;
function throttledCommit(ctx, field, value) {
  throttlePending = { ctx, field, value };
  if (throttleTimer) return;
  throttleTimer = setTimeout(() => {
    throttleTimer = 0;
    const p = throttlePending;
    throttlePending = null;
    if (p) p.ctx.patch({ [p.field.path]: p.value });
  }, 90);
}

/* --------------------------------------------------------- custom fields */

const CUSTOM = {
  gradientGrid(ctx, field, rerender) {
    const wrap = el('div', 'field');
    const grid = el('div', 'grad-grid');
    for (const [name, stops] of Object.entries(GRADIENTS)) {
      const cell = el('button', 'grad-cell');
      cell.type = 'button';
      cell.title = name;
      cell.style.backgroundImage = gradientCss(name, ctx.state.background.gradient.angle);
      cell.setAttribute('aria-pressed', name === ctx.state.background.gradient.preset ? 'true' : 'false');
      cell.addEventListener('click', () => {
        ctx.patch({ 'background.gradient.preset': name }).then(rerender);
      });
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    return wrap;
  },

  accentSwatches(ctx, field, rerender) {
    const wrap = el('div', 'field');
    wrap.appendChild(el('span', 'field-label', 'Accent presets'));
    const row = el('div', 'swatches');
    for (const c of ACCENT_SWATCHES) {
      const s = el('button', 'swatch');
      s.type = 'button';
      s.style.background = c;
      s.title = c;
      s.setAttribute('aria-pressed', c.toLowerCase() === String(ctx.state.theme.accent).toLowerCase() ? 'true' : 'false');
      s.addEventListener('click', () => ctx.patch({ 'theme.accent': c }).then(rerender));
      row.appendChild(s);
    }
    wrap.appendChild(row);
    return wrap;
  },

  mediaLibrary(ctx, field, rerender) {
    const wrap = el('div', 'field');
    const kind = field.kind;
    const pathKey = kind === 'video' ? 'background.video.mediaId' : 'background.image.mediaId';
    const selected = getPath(ctx.state, pathKey);

    const drop = el('div', 'drop-zone');
    drop.innerHTML = `<strong>Upload ${kind === 'video' ? 'a video' : 'an image'}</strong>
      <span class="field-help">Click or drop a file here · stored locally on this machine</span>`;

    const pick = () => {
      const input = document.getElementById('hidden-file');
      input.accept = kind === 'video' ? 'video/*' : 'image/*';
      input.multiple = kind !== 'video';
      input.value = '';
      input.onchange = async () => {
        const files = [...input.files];
        if (!files.length) return;
        let last = null;
        for (const f of files) last = await media.put(f, kind);
        await ctx.patch({ [pathKey]: last.id, 'background.type': kind === 'video' ? 'video' : 'image' });
        ctx.toast(`Added ${files.length} ${kind}${files.length > 1 ? 's' : ''}`);
        rerender && rerender();
      };
      input.click();
    };

    drop.addEventListener('click', pick);
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', async (e) => {
      e.preventDefault();
      drop.classList.remove('over');
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith(kind === 'video' ? 'video' : 'image'));
      if (!files.length) return ctx.toast(`That is not ${kind === 'video' ? 'a video' : 'an image'}`);
      let last = null;
      for (const f of files) last = await media.put(f, kind);
      await ctx.patch({ [pathKey]: last.id });
      rerender && rerender();
    });

    wrap.appendChild(drop);

    const grid = el('div', 'media-grid');
    grid.style.marginTop = '10px';
    wrap.appendChild(grid);

    media.list().then((items) => {
      const mine = items.filter((m) => m.kind === kind);
      if (!mine.length) {
        grid.replaceWith(el('p', 'field-help', 'Nothing uploaded yet.'));
        return;
      }
      for (const m of mine) {
        const cell = el('button', 'media-cell');
        cell.type = 'button';
        cell.title = m.name;
        cell.setAttribute('aria-pressed', m.id === selected ? 'true' : 'false');

        const thumb = document.createElement(kind === 'video' ? 'video' : 'img');
        if (kind === 'video') { thumb.muted = true; thumb.loop = true; thumb.playsInline = true; }
        ctx.mediaUrl(m.id).then((u) => {
          if (!u) return;
          thumb.src = u;
          if (kind === 'video') thumb.play().catch(() => {});
        });
        cell.appendChild(thumb);
        cell.appendChild(el('span', 'media-kind', formatSize(m.size)));

        const del = el('button', 'media-del');
        del.type = 'button';
        del.title = 'Delete';
        del.innerHTML = `<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
        del.addEventListener('click', async (e) => {
          e.stopPropagation();
          await media.del(m.id);
          if (m.id === selected) await ctx.patch({ [pathKey]: null });
          rerender && rerender();
        });
        cell.appendChild(del);

        cell.addEventListener('click', () => ctx.patch({ [pathKey]: m.id }).then(rerender));
        grid.appendChild(cell);
      }
    });

    return wrap;
  },

  shortcutEditor(ctx, field, rerender) {
    const wrap = el('div');
    const list = el('div', 'sc-list');

    const save = (next) => ctx.patch({ shortcuts: next }).then(rerender);

    ctx.state.shortcuts.forEach((sc, idx) => {
      const row = el('div', 'sc-row');
      row.draggable = true;
      row.dataset.index = idx;

      const prev = el('span', 'sc-prev');
      prev.appendChild(iconNode(sc, ctx).firstChild || document.createTextNode('•'));
      row.appendChild(prev);

      const fields = el('div', 'sc-fields');
      const title = document.createElement('input');
      title.type = 'text'; title.value = sc.title; title.placeholder = 'Label';
      const url = document.createElement('input');
      url.type = 'text'; url.value = sc.url; url.placeholder = 'https://…';

      const iconRow = el('div');
      iconRow.style.display = 'flex';
      iconRow.style.gap = '5px';

      const iconType = document.createElement('select');
      for (const [v, l] of [['favicon', 'Site icon'], ['emoji', 'Emoji'], ['letter', 'Letter'], ['url', 'Image URL'], ['media', 'Uploaded']]) {
        const o = document.createElement('option');
        o.value = v; o.textContent = l;
        iconType.appendChild(o);
      }
      iconType.value = (sc.icon && sc.icon.type) || 'favicon';
      iconType.style.flex = '0 0 110px';

      const iconValue = document.createElement('input');
      iconValue.type = 'text';
      iconValue.placeholder = { emoji: '🎧', letter: 'A', url: 'https://…/icon.png', media: 'pick below', favicon: 'auto' }[iconType.value];
      iconValue.value = (sc.icon && sc.icon.value) || '';
      iconValue.disabled = iconType.value === 'favicon';

      const uploadBtn = el('button', 'ghost-btn', 'Upload');
      uploadBtn.type = 'button';
      uploadBtn.style.display = iconType.value === 'media' ? '' : 'none';
      uploadBtn.addEventListener('click', () => {
        const input = document.getElementById('hidden-file');
        input.accept = 'image/*';
        input.multiple = false;
        input.value = '';
        input.onchange = async () => {
          if (!input.files[0]) return;
          const rec = await media.put(input.files[0], 'image');
          const next = ctx.state.shortcuts.slice();
          next[idx] = { ...next[idx], icon: { type: 'media', value: rec.id } };
          save(next);
        };
        input.click();
      });

      iconRow.append(iconType, iconValue, uploadBtn);
      fields.append(title, url, iconRow);
      row.appendChild(fields);

      const commitRow = () => {
        const next = ctx.state.shortcuts.slice();
        next[idx] = {
          ...next[idx],
          title: title.value,
          url: normalize(url.value),
          icon: { type: iconType.value, value: iconValue.value }
        };
        save(next);
      };

      let t;
      const debounced = () => { clearTimeout(t); t = setTimeout(commitRow, 450); };
      title.addEventListener('input', debounced);
      url.addEventListener('input', debounced);
      iconValue.addEventListener('input', debounced);
      iconType.addEventListener('change', commitRow);

      const acts = el('div', 'sc-acts');
      const up = el('button', null, '');
      up.type = 'button'; up.title = 'Move up';
      up.innerHTML = `<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>`;
      up.addEventListener('click', () => {
        if (idx === 0) return;
        const next = ctx.state.shortcuts.slice();
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        save(next);
      });
      const del = el('button');
      del.type = 'button'; del.title = 'Remove';
      del.innerHTML = `<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
      del.addEventListener('click', () => save(ctx.state.shortcuts.filter((_, i) => i !== idx)));
      acts.append(up, del);
      row.appendChild(acts);

      list.appendChild(row);
    });

    bindDragSort(list, (from, to) => {
      const next = ctx.state.shortcuts.slice();
      next.splice(to, 0, next.splice(from, 1)[0]);
      save(next);
    });

    wrap.appendChild(list);

    const row = el('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.marginTop = '12px';
    row.style.flexWrap = 'wrap';

    const add = el('button', 'pill-btn primary', 'Add shortcut');
    add.type = 'button';
    add.addEventListener('click', () => {
      const next = [...ctx.state.shortcuts, {
        id: `s${Date.now().toString(36)}`,
        title: 'New tab',
        url: 'https://example.com',
        icon: { type: 'favicon', value: '' }
      }];
      save(next);
    });

    const fromTop = el('button', 'pill-btn', 'Fill from most visited');
    fromTop.type = 'button';
    fromTop.addEventListener('click', async () => {
      try {
        const sites = await chrome.topSites.get();
        if (!sites.length) return ctx.toast('Chrome reported no top sites yet');
        const next = sites.slice(0, 12).map((s, i) => ({
          id: `t${i}`,
          title: s.title || new URL(s.url).hostname.replace(/^www\./, ''),
          url: s.url,
          icon: { type: 'favicon', value: '' }
        }));
        save(next);
        ctx.toast(`Loaded ${next.length} shortcuts`);
      } catch {
        ctx.toast('Could not read top sites');
      }
    });

    row.append(add, fromTop);
    wrap.appendChild(row);
    wrap.appendChild(el('p', 'field-help', 'Drag a row to reorder. Alt+1…9 opens the first nine from the new tab page.'));
    return wrap;
  },

  widgetList(ctx, field, rerender) {
    const wrap = el('div', 'field');
    wrap.appendChild(el('span', 'field-label', 'Shown widgets — drag to reorder'));
    const list = el('div', 'sc-list');

    const order = ctx.state.layout.order.filter((k) => WIDGET_LABELS[k]);
    for (const k of Object.keys(WIDGET_LABELS)) if (!order.includes(k)) order.push(k);

    order.forEach((name, idx) => {
      const row = el('div', 'sc-row');
      row.draggable = true;
      row.dataset.index = idx;
      row.style.gridTemplateColumns = '20px 1fr auto';

      row.appendChild(el('span', null, '⠿'));
      row.appendChild(el('span', 'field-label', WIDGET_LABELS[name]));

      const sw = el('label', 'switch');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!ctx.state.layout.widgets[name];
      input.addEventListener('change', () => {
        ctx.patch({ [`layout.widgets.${name}`]: input.checked });
      });
      sw.append(input, el('span'));
      row.appendChild(sw);
      list.appendChild(row);
    });

    bindDragSort(list, (from, to) => {
      const next = order.slice();
      next.splice(to, 0, next.splice(from, 1)[0]);
      ctx.patch({ 'layout.order': next }).then(rerender);
    });

    wrap.appendChild(list);
    return wrap;
  },

  perSiteList(ctx, field, rerender) {
    const sites = Object.entries(ctx.state.siteTheme.perSite);
    const wrap = el('div', 'field');
    wrap.appendChild(el('div', 'field-sub', 'Per-site overrides'));
    if (!sites.length) {
      wrap.appendChild(el('p', 'field-help', 'None yet. Open a site and use the toolbar popup to tune just that site.'));
      return wrap;
    }
    const list = el('div', 'sc-list');
    for (const [host, cfg] of sites) {
      const row = el('div', 'sc-row');
      row.style.gridTemplateColumns = '1fr auto';
      const keys = Object.keys(cfg).filter((k) => cfg[k] !== '' && cfg[k] !== false && cfg[k] !== 0);
      const label = el('div');
      label.append(el('span', 'field-label', host), el('div', 'field-help', keys.join(', ') || 'no overrides'));
      const del = el('button', 'ghost-btn danger', 'Remove');
      del.type = 'button';
      del.addEventListener('click', () => {
        const next = { ...ctx.state.siteTheme.perSite };
        delete next[host];
        ctx.patch({ 'siteTheme.perSite': next }).then(rerender);
      });
      row.append(label, del);
      list.appendChild(row);
    }
    wrap.appendChild(list);
    return wrap;
  },

  themeExport(ctx) {
    const wrap = el('div', 'field');
    wrap.appendChild(el('p', 'field-help',
      'Chrome does not let an extension recolour its own toolbar and tab strip — only a theme can. ' +
      'This builds a matching theme you install alongside Chroma Canvas.'));

    const btn = el('button', 'pill-btn', 'Download matching Chrome theme');
    btn.type = 'button';
    btn.addEventListener('click', () => {
      const t = ctx.state.theme;
      const light = t.mode === 'light';
      const frame = hexToRgb(light ? '#e8eaf2' : '#13151d');
      const toolbar = hexToRgb(light ? '#f6f7fb' : '#1b1e28');
      const accent = hexToRgb(t.accent);
      const text = hexToRgb(light ? '#10131a' : '#f5f7ff');
      const rgb = (c) => [Math.round(c.r), Math.round(c.g), Math.round(c.b)];

      const manifest = {
        manifest_version: 3,
        name: 'Chroma Frame',
        version: '1.0',
        description: 'Chrome frame colours generated by Chroma Canvas.',
        theme: {
          colors: {
            frame: rgb(frame),
            frame_inactive: rgb(frame),
            frame_incognito: rgb(frame),
            toolbar: rgb(toolbar),
            tab_text: rgb(text),
            tab_background_text: rgb({ r: text.r * 0.65, g: text.g * 0.65, b: text.b * 0.65 }),
            bookmark_text: rgb(text),
            toolbar_button_icon: rgb(accent),
            omnibox_background: rgb(light ? hexToRgb('#ffffff') : hexToRgb('#242834')),
            omnibox_text: rgb(text),
            ntp_background: rgb(light ? hexToRgb('#f6f7fb') : hexToRgb('#0b0d14')),
            ntp_text: rgb(text),
            ntp_link: rgb(accent),
            button_background: rgb(toolbar)
          },
          properties: { ntp_logo_alternate: light ? 0 : 1 }
        }
      };

      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'manifest.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      ctx.toast('Saved manifest.json — see README step 4');
    });

    wrap.appendChild(btn);
    wrap.appendChild(el('p', 'field-help',
      'Put the downloaded manifest.json in an empty folder, then load that folder at chrome://extensions with Developer mode on.'));
    return wrap;
  }
};

function formatSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / 1048576;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function normalize(url) {
  const v = url.trim();
  if (!v) return v;
  return /^[a-z]+:\/\//i.test(v) ? v : `https://${v}`;
}

/** HTML5 drag reorder for a list of `[data-index]` rows. */
function bindDragSort(list, onMove) {
  let from = null;
  list.addEventListener('dragstart', (e) => {
    const row = e.target.closest('[data-index]');
    if (!row) return;
    from = Number(row.dataset.index);
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  list.addEventListener('dragend', (e) => {
    const row = e.target.closest('[data-index]');
    if (row) row.classList.remove('dragging');
  });
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });
  list.addEventListener('drop', (e) => {
    e.preventDefault();
    const row = e.target.closest('[data-index]');
    if (!row || from == null) return;
    const to = Number(row.dataset.index);
    if (to !== from) onMove(from, to);
    from = null;
  });
}

/* ---------------------------------------------------------------- drawer */

export function initDrawer(ctx) {
  const drawer = document.getElementById('drawer');
  const tabsBar = document.getElementById('drawer-tabs');
  const body = document.getElementById('drawer-body');
  let activeTab = SCHEMA[0].id;

  function renderTabs() {
    tabsBar.textContent = '';
    for (const group of SCHEMA) {
      const tab = el('button', 'drawer-tab', group.label);
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', group.id === activeTab ? 'true' : 'false');
      tab.addEventListener('click', () => { activeTab = group.id; render(); });
      tabsBar.appendChild(tab);
    }
  }

  function renderBody() {
    const scrollTop = body.scrollTop;
    body.textContent = '';
    const group = SCHEMA.find((g) => g.id === activeTab) || SCHEMA[0];
    for (const field of group.fields) {
      const node = makeField(field, ctx, render);
      if (node) body.appendChild(node);
    }
    body.scrollTop = scrollTop;
  }

  function render() {
    renderTabs();
    renderBody();
  }

  document.getElementById('btn-close-drawer').addEventListener('click', close);

  document.getElementById('btn-reset').addEventListener('click', async () => {
    if (!confirm('Reset every Chroma Canvas setting to defaults? Uploaded wallpapers are kept.')) return;
    await ctx.replace(structuredClone(DEFAULTS));
    render();
    ctx.toast('Back to defaults');
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(ctx.state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chroma-canvas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    ctx.toast('Settings exported');
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    const input = document.getElementById('hidden-file');
    input.accept = 'application/json';
    input.multiple = false;
    input.value = '';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        await ctx.replace(merge(DEFAULTS, parsed));
        render();
        ctx.toast('Settings imported');
      } catch (err) {
        ctx.toast('That file is not valid Chroma JSON');
      }
    };
    input.click();
  });

  function open(tab) {
    if (tab && SCHEMA.some((g) => g.id === tab)) activeTab = tab;
    render();
    drawer.hidden = false;
  }
  function close() { drawer.hidden = true; }
  function toggle() { drawer.hidden ? open() : close(); }

  return { open, close, toggle, isOpen: () => !drawer.hidden, rerender: render };
}
