# Chroma Canvas

A Chrome extension that turns the new tab into a canvas you control — live
wallpapers, video and image backgrounds, custom icon packs, layout presets,
widgets, colour themes and interaction effects — plus a theming engine for
every other website you visit.

No build step, no dependencies, no network calls except the weather widget.

---

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and pick the `chroma-canvas` folder
4. Open a new tab

The Customize panel opens by itself the first time. After that, press <kbd>,</kbd>
on the new tab page, or click the gear in the bottom-right corner.

---

## What it does

### Backgrounds
| Source | Notes |
| --- | --- |
| **Live** | Eight animated canvas wallpapers — aurora ribbons, constellation, starfield warp, silk waves, code rain, lava blobs, neon grid, bokeh. They draw from your accent colours and pause when the tab is hidden. |
| **Gradient** | Twelve presets, adjustable angle, optional slow drift. |
| **Image** | Upload your own (stored locally in IndexedDB) or paste a URL. Fit and position controls. |
| **Video** | Upload an mp4/webm or paste a URL. Speed and mute controls. |
| **Solid** | One colour. |

Every source shares the same treatment layer: blur, dim, saturation, contrast,
vignette and film grain. A slideshow mode rotates gradients, live engines or
your uploaded images on a timer.

### Layout
Five presets — centre stack, minimal, grid board, sidebar, and zen (everything
but the clock fades in on hover). Density, alignment and content width are
independent of the preset.

### Widgets
Clock (digital, gradient-filled, outline, mono, spelled-out words, or analog),
greeting, search bar, shortcut tiles, daily quote, weather, task list,
scratchpad, focus timer, and an at-a-glance stats row. Toggle any of them and
drag to reorder.

### Icons
Shortcut tiles are fully restyleable: eight shapes (circle, squircle, rounded,
square, hexagon, diamond, blob, ticket), seven treatments (glass, flat,
outline, gradient, soft, neon, bare), six colour filters (original, grayscale,
monochrome, duotone, inverted, vivid), four hover behaviours, plus size,
spacing, column count and labels.

Each shortcut's icon can come from the site's own favicon, an emoji, a generated
letter tile, an image URL, or a file you upload.

### Colour
Accent and secondary accent drive everything — the live wallpapers, glows,
focus rings and gradient tiles all derive from them. Panel opacity, frosted
blur, border strength, corner radius, font and text scale are separate dials.
There is a custom CSS box for the new tab page.

### Interaction
Cursor trails (glow, sparks, rings), a spotlight that follows the pointer,
background parallax, 3D card tilt, click ripples, staggered reveal on open,
and a command palette. A single "reduce all motion" switch turns the lot off.

### Website theming
A content script can restyle any site: force dark mode with adjustable
strength, override the link/accent colour, swap the body font, scale text,
constrain reading width, round image corners, recolour scrollbars, enable
smooth scrolling, grayscale images until hovered, neutralise sticky headers,
and inject custom CSS. Off by default.

Per-site overrides live in the toolbar popup — open a site, click the Chroma
Canvas icon, and tune just that domain (including "skip this site").

---

## Keyboard

| Key | Action |
| --- | --- |
| <kbd>Ctrl</kbd>+<kbd>K</kbd> | Command palette — shortcuts, wallpapers, layouts, widget toggles, Chrome pages |
| <kbd>,</kbd> | Open the Customize panel |
| <kbd>/</kbd> | Focus the search bar |
| <kbd>Alt</kbd>+<kbd>1</kbd>…<kbd>9</kbd> | Open the first nine shortcuts |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>W</kbd> | Next wallpaper (works from any tab) |
| <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> | Toggle website theming (works from any tab) |

---

## The one thing Chrome will not allow

**An extension cannot restyle Chrome's own interface** — the tab strip, the
toolbar, the address bar, the menus. There is no API for it, and extensions
cannot inject scripts into `chrome://` pages. Nothing published on the Web
Store does this either.

Chrome's frame can only be recoloured by a **theme**, and a theme is mutually
exclusive with everything else: a theme extension cannot have a new tab page,
a popup or scripts. So the two have to be installed side by side.

Customize → **Colour** → *Download matching Chrome theme* generates one from
your accent colours. To install it:

1. Click the button — it saves a `manifest.json`
2. Put that file in a new empty folder, e.g. `chroma-frame/`
3. `chrome://extensions` → **Load unpacked** → pick that folder

Chrome applies it immediately. Re-download and reload the folder whenever you
change your accent.

If restyling the toolbar and tab strip themselves is the real goal, no Chrome
extension will get you there — Vivaldi is the browser whose entire UI is
HTML/CSS and genuinely moddable.

---

## Permissions, and why

| Permission | Reason |
| --- | --- |
| `storage`, `unlimitedStorage` | Settings, plus uploaded wallpapers in IndexedDB |
| `favicon` | Draw real site icons on shortcut tiles |
| `topSites` | The "Fill from most visited" button — only read when you click it |
| `<all_urls>` | The website-theming content script. It reads one storage key and injects CSS; it never reads page content or sends anything anywhere |

Nothing is uploaded. The only outbound requests are to `open-meteo.com`, and
only if you turn on the weather widget and enter a city.

---

## Project layout

```
chroma-canvas/
├─ manifest.json
├─ icons/                      generated PNGs, 16/32/48/128
└─ src/
   ├─ lib/
   │  ├─ state.js              defaults, deep merge, storage, IndexedDB media store
   │  └─ paint.js              colour maths + settings → CSS custom properties
   ├─ background/
   │  └─ service-worker.js     install defaults, keyboard commands
   ├─ newtab/
   │  ├─ newtab.html/.css
   │  ├─ newtab.js             background stack, stage, interactions, command palette
   │  ├─ wallpapers.js         the eight live-wallpaper engines
   │  ├─ widgets.js            widget registry
   │  └─ settings.js           schema-driven Customize drawer
   ├─ popup/
   │  └─ popup.html/.css/.js   quick switches + per-site overrides
   └─ content/
      └─ site-theme.js         website restyling
```

### Adding things

**A live wallpaper** — add `{ init, frame }` to `ENGINES` in `wallpapers.js`
and a label in `LIVE_ENGINES` in `state.js`. `init` seeds state for the current
canvas size and `state.palette`; `frame(ctx, state, t, dt)` draws one tick.

**A widget** — add `{ title?, render(ctx), tick?(el, ctx) }` to `WIDGETS` in
`widgets.js`, a label in `WIDGET_LABELS`, and a default in `DEFAULTS.layout.widgets`.

**A setting** — add one object to `SCHEMA` in `settings.js` (`toggle`, `range`,
`select`, `chips`, `color`, `text`, `textarea`, `sub`, `note`, or `custom`) and
a default value in `DEFAULTS`. Nothing else needs touching.

### Backup
Customize → **Export** writes every setting to JSON; **Import** restores it.
Uploaded wallpapers are not included — they stay in IndexedDB on this machine.
