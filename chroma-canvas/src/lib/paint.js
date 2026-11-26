/**
 * Colour maths + the one function that turns settings into CSS custom
 * properties. Everything visual in the new tab reads from these variables, so
 * a settings change is a variable write rather than a re-render.
 */

import { FONTS, GRADIENTS } from './state.js';

/* ---------------------------------------------------------------- colour */

export function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return { r: 124, g: 92, b: 255 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

export function rgbToHex({ r, g, b }) {
  const f = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }) {
  h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
  if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 };
}

export const shift = (hex, dh = 0, ds = 0, dl = 0) => {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({
    h: hsl.h + dh,
    s: Math.max(0, Math.min(100, hsl.s + ds)),
    l: Math.max(0, Math.min(100, hsl.l + dl))
  }));
};

export const rgbaOf = (hex, a) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** Perceived luminance 0..1 — used to pick readable foreground colours. */
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export const readableOn = (hex) => (luminance(hex) > 0.5 ? '#10131a' : '#ffffff');

/** Five-stop palette derived from one accent — used by live wallpapers. */
export function paletteFrom(accent, accent2) {
  return [
    shift(accent, -18, 6, -18),
    accent,
    shift(accent, 16, -4, 10),
    accent2,
    shift(accent2, 14, 2, 12)
  ];
}

/* ------------------------------------------------------------ gradients */

export function gradientCss(preset, angle) {
  const stops = GRADIENTS[preset] || GRADIENTS.nebula;
  return `linear-gradient(${angle ?? 135}deg, ${stops.join(', ')})`;
}

/* ------------------------------------------------- settings -> variables */

export function applyTheme(state, root = document.documentElement) {
  const t = state.theme;
  const light = t.mode === 'light' || (t.mode === 'auto' && !matchMedia('(prefers-color-scheme: dark)').matches);

  const base = light ? '#f6f7fb' : '#0b0d14';
  const fg = light ? '#10131a' : t.text || '#f5f7ff';
  const surface = light ? '#ffffff' : '#ffffff';

  const vars = {
    '--accent': t.accent,
    '--accent-2': t.accent2,
    '--accent-soft': rgbaOf(t.accent, 0.22),
    '--accent-glow': rgbaOf(t.accent, 0.55),
    '--on-accent': readableOn(t.accent),
    '--base': base,
    '--fg': fg,
    '--fg-dim': light ? 'rgba(16,19,26,0.62)' : 'rgba(245,247,255,0.64)',
    '--fg-faint': light ? 'rgba(16,19,26,0.38)' : 'rgba(245,247,255,0.38)',
    '--surface': rgbaOf(surface, light ? Math.min(0.92, t.surfaceOpacity + 0.5) : t.surfaceOpacity),
    '--surface-strong': rgbaOf(surface, light ? 0.96 : Math.min(0.5, t.surfaceOpacity + 0.14)),
    '--border': rgbaOf(light ? '#10131a' : '#ffffff', t.borderOpacity),
    '--blur': `${t.surfaceBlur}px`,
    '--radius': `${t.radius}px`,
    '--radius-sm': `${Math.max(6, t.radius * 0.5)}px`,
    '--font': FONTS[t.font] || FONTS.Inter,
    '--scale': String(t.scale),
    '--shadow': light
      ? '0 18px 50px -20px rgba(16,19,26,0.35)'
      : '0 24px 60px -24px rgba(0,0,0,0.75)',
    // background effect layer — the scrim follows the mode, so "light" over a
    // dark wallpaper washes it out instead of leaving dark text on dark pixels
    '--dim-color': light ? '#ffffff' : '#000000',
    '--bg-blur': `${state.background.effects.blur}px`,
    '--bg-dim': String(state.background.effects.dim),
    '--bg-saturate': String(state.background.effects.saturate),
    '--bg-contrast': String(state.background.effects.contrast),
    '--bg-grain': String(state.background.effects.grain),
    '--bg-vignette': String(state.background.effects.vignette),
    // icon grid
    '--icon-size': `${state.icons.size}px`,
    '--icon-gap': `${state.icons.gap}px`,
    '--icon-cols': String(state.icons.columns),
    '--icon-label': `${state.icons.labelSize}px`,
    '--content-max': `${state.layout.maxWidth}px`
  };

  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);

  root.dataset.mode = light ? 'light' : 'dark';
  root.dataset.layout = state.layout.preset;
  root.dataset.density = state.layout.density;
  root.dataset.align = state.layout.align;
  root.dataset.iconShape = state.icons.shape;
  root.dataset.iconStyle = state.icons.style;
  root.dataset.iconFilter = state.icons.filter;
  root.dataset.iconHover = state.icons.hover;
  root.dataset.glow = state.icons.glow ? 'on' : 'off';
  root.dataset.labels = state.icons.labels ? 'on' : 'off';
  root.dataset.motion = state.interactions.reducedMotion ? 'reduced' : 'full';
  root.dataset.clockStyle = state.clock.style;

  let sheet = document.getElementById('chroma-custom-css');
  if (!sheet) {
    sheet = document.createElement('style');
    sheet.id = 'chroma-custom-css';
    document.head.appendChild(sheet);
  }
  sheet.textContent = t.customCss || '';
}
