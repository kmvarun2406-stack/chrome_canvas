/**
 * Website theming.
 *
 * Runs at document_start on every page and injects a single <style> element,
 * rebuilt whenever settings change. Per-site values override the global ones,
 * and nothing is emitted at all unless theming is switched on — so the default
 * install costs one storage read per page and no CSS.
 *
 * Classic script (content scripts cannot be ES modules), so the few constants
 * it needs are inlined rather than imported.
 */

(() => {
  const STORE_KEY = 'chroma';
  const STYLE_ID = 'chroma-site-theme';

  const FONT_STACKS = {
    Inter: '"Inter", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
    System: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    Rounded: '"Nunito", ui-rounded, system-ui, sans-serif',
    Serif: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
    Mono: '"JetBrains Mono", "Cascadia Code", Consolas, ui-monospace, monospace',
    Condensed: '"Oswald", "Arial Narrow", sans-serif'
  };

  const GLOBAL_DEFAULTS = {
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
  };

  const host = location.hostname.replace(/^www\./, '');

  function resolve(settings) {
    const site = settings.siteTheme || {};
    if (!site.enabled) return null;

    const perSite = (site.perSite && (site.perSite[host] || site.perSite[location.hostname])) || {};
    if (perSite.disabled) return null;

    // Per-site values win, but only where they were actually set.
    const cfg = { ...GLOBAL_DEFAULTS, ...(site.global || {}) };
    for (const [k, v] of Object.entries(perSite)) {
      if (v !== undefined && v !== null && v !== '') cfg[k] = v;
    }
    return cfg;
  }

  function buildCss(cfg) {
    const out = [];

    if (cfg.darkMode) {
      const s = Math.min(1, Math.max(0.4, Number(cfg.darkStrength) || 0.9));
      // Invert the page, then invert media back so photos stay photos.
      out.push(`
        html {
          filter: invert(${s}) hue-rotate(180deg) contrast(1.02) !important;
          background: #ffffff !important;
        }
        img, video, picture, canvas, svg:not(:root), iframe, embed, object,
        [style*="background-image"], [data-chroma-keep] {
          filter: invert(${s}) hue-rotate(180deg) !important;
        }
        img[src*=".svg"] { filter: none !important; }
      `);
    }

    if (cfg.accent) {
      out.push(`
        :root { accent-color: ${cfg.accent} !important; }
        a:not([class*="btn"]):not([class*="button"]) { color: ${cfg.accent} !important; }
        ::selection { background: ${cfg.accent} !important; color: #fff !important; }
        :focus-visible { outline: 2px solid ${cfg.accent} !important; outline-offset: 2px !important; }
      `);
    }

    if (cfg.font && FONT_STACKS[cfg.font]) {
      out.push(`
        body, body * :not(code):not(pre):not(kbd):not(samp):not([class*="icon"]):not(i) {
          font-family: ${FONT_STACKS[cfg.font]} !important;
        }
      `);
    }

    const scale = Number(cfg.fontScale) || 1;
    if (Math.abs(scale - 1) > 0.01) {
      out.push(`html { font-size: ${(scale * 100).toFixed(1)}% !important; }`);
    }

    const rw = Number(cfg.readingWidth) || 0;
    if (rw > 0) {
      out.push(`
        main, article, [role="main"], .post, .entry-content, .markdown-body {
          max-width: ${rw}px !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
      `);
    }

    const round = Number(cfg.roundImages) || 0;
    if (round > 0) {
      out.push(`img, video, picture > img { border-radius: ${round}px !important; }`);
    }

    if (cfg.customScrollbar) {
      const bar = cfg.accent || '#7c5cff';
      out.push(`
        * { scrollbar-width: thin !important; scrollbar-color: ${bar} transparent !important; }
        ::-webkit-scrollbar { width: 11px !important; height: 11px !important; }
        ::-webkit-scrollbar-track { background: transparent !important; }
        ::-webkit-scrollbar-thumb {
          background: ${bar} !important;
          border-radius: 99px !important;
          border: 3px solid transparent !important;
          background-clip: content-box !important;
        }
      `);
    }

    if (cfg.smoothScroll) {
      out.push(`html { scroll-behavior: smooth !important; }`);
    }

    if (cfg.grayscaleMedia) {
      out.push(`
        img, video { filter: grayscale(1); transition: filter 300ms ease; }
        img:hover, video:hover { filter: grayscale(0); }
      `);
    }

    if (cfg.hideFixed) {
      // Only neutralises elements the page itself pinned; dialogs keep their
      // own stacking because [role=dialog] is excluded.
      out.push(`
        header[class*="sticky"], header[class*="fixed"],
        div[class*="sticky"]:not([role="dialog"]), div[class*="fixed"]:not([role="dialog"]),
        nav[class*="sticky"], nav[class*="fixed"] {
          position: static !important;
        }
      `);
    }

    if (cfg.customCss) out.push(cfg.customCss);

    return out.join('\n');
  }

  function styleNode() {
    let node = document.getElementById(STYLE_ID);
    if (!node) {
      node = document.createElement('style');
      node.id = STYLE_ID;
      node.setAttribute('data-chroma', 'site-theme');
      (document.head || document.documentElement).appendChild(node);
    } else if (node.parentNode !== document.head && document.head) {
      // Re-home it after document_start so it lands last and wins specificity.
      document.head.appendChild(node);
    }
    return node;
  }

  function paint(settings) {
    const cfg = resolve(settings || {});
    if (!cfg) {
      const existing = document.getElementById(STYLE_ID);
      if (existing) existing.textContent = '';
      return;
    }
    styleNode().textContent = buildCss(cfg);
  }

  chrome.storage.local.get(STORE_KEY, (res) => {
    paint(res && res[STORE_KEY]);
    // Pages replace <head> often enough (SPA frameworks, document.write) that
    // it is worth re-homing the style once the real head exists.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        chrome.storage.local.get(STORE_KEY, (r) => paint(r && r[STORE_KEY]));
      }, { once: true });
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[STORE_KEY]) return;
    paint(changes[STORE_KEY].newValue);
  });
})();
