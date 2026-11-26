/**
 * Widgets.
 *
 * Each entry is `{ title?, render(ctx), tick?(el, ctx) }`. `render` returns the
 * inner node for a widget shell; `tick` is called once a second for anything
 * live. Widgets never write to storage directly — they call `ctx.patch`, which
 * keeps one write path and lets other tabs react through the storage listener.
 */

import { SEARCH_ENGINES } from '../lib/state.js';

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

const pad = (n) => String(n).padStart(2, '0');

export const faviconUrl = (pageUrl, size = 64) => {
  try {
    const u = new URL(chrome.runtime.getURL('/_favicon/'));
    u.searchParams.set('pageUrl', pageUrl);
    u.searchParams.set('size', String(size));
    return u.toString();
  } catch {
    return '';
  }
};

const QUOTES = [
  ['Simplicity is the ultimate sophistication.', 'Leonardo da Vinci'],
  ['The best way out is always through.', 'Robert Frost'],
  ['Make it work, make it right, make it fast.', 'Kent Beck'],
  ['What we do now echoes in eternity.', 'Marcus Aurelius'],
  ['Perfection is achieved when there is nothing left to take away.', 'Antoine de Saint-Exupéry'],
  ['The obstacle is the way.', 'Marcus Aurelius'],
  ['Done is better than perfect.', 'Sheryl Sandberg'],
  ['Creativity is intelligence having fun.', 'Albert Einstein'],
  ['You miss 100% of the shots you never take.', 'Wayne Gretzky'],
  ['Order and simplification are the first steps toward mastery.', 'Thomas Mann'],
  ['Slow is smooth, smooth is fast.', 'Proverb'],
  ['The details are not the details. They make the design.', 'Charles Eames'],
  ['Act without expectation.', 'Lao Tzu'],
  ['A day without laughter is a day wasted.', 'Charlie Chaplin'],
  ['First solve the problem, then write the code.', 'John Johnson']
];

/* ---------------------------------------------------------------- clock */

const clock = {
  render(ctx) {
    const wrap = el('div', 'clock');
    if (ctx.state.clock.style === 'analog') {
      wrap.innerHTML = `
        <div class="analog">
          <div class="analog-face"></div>
          <div class="analog-hand h"></div>
          <div class="analog-hand m"></div>
          <div class="analog-hand s"></div>
          <div class="analog-pin"></div>
        </div>
        <p class="clock-date"></p>`;
    } else {
      wrap.innerHTML = `<p class="clock-time"></p><p class="clock-date"></p>`;
    }
    wrap.style.setProperty('--clock-weight', ctx.state.clock.weight);
    clock.tick(wrap, ctx);
    return wrap;
  },

  tick(wrap, ctx) {
    const c = ctx.state.clock;
    const now = new Date();
    const dateNode = wrap.querySelector('.clock-date');

    if (dateNode) {
      dateNode.textContent = c.showDate
        ? now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
        : '';
    }

    if (c.style === 'analog') {
      const h = wrap.querySelector('.analog-hand.h');
      const m = wrap.querySelector('.analog-hand.m');
      const s = wrap.querySelector('.analog-hand.s');
      const secs = now.getSeconds() + now.getMilliseconds() / 1000;
      const mins = now.getMinutes() + secs / 60;
      const hours = (now.getHours() % 12) + mins / 60;
      if (h) h.style.transform = `rotate(${hours * 30}deg)`;
      if (m) m.style.transform = `rotate(${mins * 6}deg)`;
      if (s) s.style.transform = `rotate(${secs * 6}deg)`;
      return;
    }

    const node = wrap.querySelector('.clock-time');
    if (!node) return;

    if (c.style === 'text') {
      node.textContent = spellTime(now, c.format24);
      return;
    }

    let h24 = now.getHours();
    const h = c.format24 ? pad(h24) : String(h24 % 12 === 0 ? 12 : h24 % 12);
    const parts = [h, pad(now.getMinutes())];
    if (c.seconds) parts.push(pad(now.getSeconds()));
    const suffix = c.format24 ? '' : `<span class="clock-suffix">${h24 < 12 ? 'AM' : 'PM'}</span>`;
    node.innerHTML = parts.join('<span class="sep">:</span>') + suffix;
  }
};

const ONES = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
const TENS = { 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty' };

function wordNumber(n) {
  const small = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  if (n < 20) return small[n];
  const t = Math.floor(n / 10) * 10;
  const r = n % 10;
  return TENS[t] + (r ? `-${small[r]}` : '');
}

function spellTime(now, format24) {
  const m = now.getMinutes();
  const h = now.getHours();
  const hourWord = format24 ? wordNumber(h) : ONES[h % 12];
  if (m === 0) return `${hourWord} o'clock`;
  if (m === 30) return `half past ${hourWord}`;
  if (m === 15) return `quarter past ${hourWord}`;
  if (m === 45) return `quarter to ${format24 ? wordNumber((h + 1) % 24) : ONES[(h + 1) % 12]}`;
  if (m < 30) return `${wordNumber(m)} past ${hourWord}`;
  return `${wordNumber(60 - m)} to ${format24 ? wordNumber((h + 1) % 24) : ONES[(h + 1) % 12]}`;
}

/* ------------------------------------------------------------- greeting */

const greeting = {
  render(ctx) {
    const wrap = el('div');
    wrap.innerHTML = `<p class="greeting"></p><p class="greeting-sub"></p>`;
    greeting.tick(wrap, ctx);
    return wrap;
  },
  tick(wrap, ctx) {
    const name = (ctx.state.profile.name || '').trim();
    const h = new Date().getHours();
    const style = ctx.state.profile.greetingStyle;

    let line;
    if (style === 'static') {
      line = name ? `Hello, <b>${escapeHtml(name)}</b>` : 'Hello';
    } else if (style === 'motivational') {
      const picks = ['Let’s make today count', 'One thing at a time', 'Deep work mode', 'Build something good', 'Momentum beats motivation'];
      line = picks[new Date().getDate() % picks.length] + (name ? `, <b>${escapeHtml(name)}</b>` : '');
    } else {
      const part = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Good night';
      line = part + (name ? `, <b>${escapeHtml(name)}</b>` : '');
    }

    wrap.querySelector('.greeting').innerHTML = line;
    const left = 24 - h;
    wrap.querySelector('.greeting-sub').textContent =
      style === 'static' ? '' : `${left} hour${left === 1 ? '' : 's'} left today`;
  }
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* --------------------------------------------------------------- search */

const search = {
  render(ctx) {
    const s = ctx.state.search;
    const wrap = el('div', 'search-wrap');
    const engine = SEARCH_ENGINES[s.engine] || SEARCH_ENGINES.google;

    wrap.innerHTML = `
      <form class="search-box" autocomplete="off">
        <button type="button" class="search-engine" title="Change search engine">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <span>${escapeHtml(engine.name)}</span>
        </button>
        <input type="text" name="q" placeholder="${escapeHtml(s.placeholder)}" spellcheck="false" />
        <button type="submit" class="search-go" aria-label="Search">
          <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </form>`;

    const form = wrap.querySelector('form');
    const input = wrap.querySelector('input');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      const target = looksLikeUrl(q) ? normalizeUrl(q) : engine.url.replace('%s', encodeURIComponent(q));
      if (ctx.state.search.newTab) window.open(target, '_blank');
      else location.href = target;
    });

    // Cycle engines without opening the drawer.
    wrap.querySelector('.search-engine').addEventListener('click', () => {
      const keys = Object.keys(SEARCH_ENGINES);
      const next = keys[(keys.indexOf(ctx.state.search.engine) + 1) % keys.length];
      ctx.patch({ 'search.engine': next });
      ctx.toast(`Search: ${SEARCH_ENGINES[next].name}`);
    });

    requestAnimationFrame(() => input.focus());
    return wrap;
  }
};

function looksLikeUrl(q) {
  if (/\s/.test(q)) return false;
  if (/^[a-z]+:\/\//i.test(q)) return true;
  if (/^localhost(:\d+)?/i.test(q)) return true;
  return /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(q);
}
const normalizeUrl = (q) => (/^[a-z]+:\/\//i.test(q) ? q : `https://${q}`);

/* ------------------------------------------------------------ shortcuts */

const shortcuts = {
  render(ctx) {
    const grid = el('div', 'tiles');

    for (const sc of ctx.state.shortcuts) {
      const a = el('a', 'tile');
      a.href = sc.url;
      a.title = `${sc.title} — ${sc.url}`;
      a.appendChild(iconNode(sc, ctx));
      a.appendChild(el('span', 'tile-label', escapeHtml(sc.title || hostOf(sc.url))));
      grid.appendChild(a);
    }

    const add = el('button', 'tile tile-add');
    add.title = 'Add a shortcut';
    add.innerHTML = `<span class="tile-icon"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span><span class="tile-label">Add</span>`;
    add.addEventListener('click', () => ctx.openDrawer('shortcuts'));
    grid.appendChild(add);

    return grid;
  }
};

const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

/** Build the visual for one shortcut icon, honouring its icon source type. */
export function iconNode(sc, ctx) {
  const box = el('span', 'tile-icon');
  const icon = sc.icon || { type: 'favicon' };

  if (icon.type === 'emoji' && icon.value) {
    box.textContent = icon.value;
  } else if (icon.type === 'letter') {
    const letter = (icon.value || sc.title || hostOf(sc.url) || '?').trim()[0] || '?';
    box.innerHTML = `<span class="tile-letter">${escapeHtml(letter.toUpperCase())}</span>`;
    box.style.background = `linear-gradient(140deg, var(--accent), var(--accent-2))`;
  } else if (icon.type === 'url' && icon.value) {
    box.innerHTML = `<img src="${escapeHtml(icon.value)}" alt="" class="cover" />`;
  } else if (icon.type === 'media' && icon.value) {
    const img = el('img');
    img.alt = '';
    img.className = 'cover';
    box.appendChild(img);
    if (ctx && ctx.mediaUrl) ctx.mediaUrl(icon.value).then((u) => { if (u) img.src = u; });
  } else {
    const img = el('img');
    img.alt = '';
    img.src = faviconUrl(sc.url, 64);
    img.addEventListener('error', () => {
      box.innerHTML = `<span class="tile-letter">${escapeHtml((sc.title || hostOf(sc.url) || '?')[0].toUpperCase())}</span>`;
    });
    box.appendChild(img);
  }
  return box;
}

/* ---------------------------------------------------------------- quote */

const quote = {
  render() {
    const day = Math.floor(Date.now() / 86400000);
    const [text, who] = QUOTES[day % QUOTES.length];
    return el('blockquote', 'quote', `“${escapeHtml(text)}”<span class="quote-by">— ${escapeHtml(who)}</span>`);
  }
};

/* -------------------------------------------------------------- weather */

const WMO = {
  0: ['☀️', 'Clear'], 1: ['🌤️', 'Mainly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Fog'], 48: ['🌫️', 'Rime fog'],
  51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌦️', 'Dense drizzle'],
  61: ['🌧️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'],
  71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'],
  80: ['🌦️', 'Showers'], 81: ['🌧️', 'Showers'], 82: ['⛈️', 'Violent showers'],
  95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Storm + hail'], 99: ['⛈️', 'Severe storm']
};

const weather = {
  title: 'Weather',
  render(ctx) {
    const wrap = el('div', 'weather');
    wrap.innerHTML = `<div class="weather-meta">Loading…</div>`;
    loadWeather(ctx)
      .then((w) => {
        if (!w) {
          wrap.innerHTML = `<div class="weather-meta">Set a city in Customize → Widgets</div>`;
          return;
        }
        const [glyph, label] = WMO[w.code] || ['🌡️', ''];
        const unit = ctx.state.weather.unit === 'f' ? '°F' : '°C';
        wrap.innerHTML = `
          <div class="weather-icon">${glyph}</div>
          <div>
            <div class="weather-temp">${Math.round(w.temp)}${unit}</div>
          </div>
          <div class="weather-meta">
            <span>${escapeHtml(label)}</span>
            <span>${escapeHtml(w.place)}</span>
            <span>feels ${Math.round(w.feels)}${unit} · wind ${Math.round(w.wind)} km/h</span>
          </div>`;
      })
      .catch(() => {
        wrap.innerHTML = `<div class="weather-meta">Weather unavailable</div>`;
      });
    return wrap;
  }
};

async function loadWeather(ctx) {
  const w = ctx.state.weather;
  const cache = w.cache;
  const fresh = cache && Date.now() - cache.at < 20 * 60 * 1000 && cache.unit === w.unit && cache.key === (w.place || `${w.lat},${w.lon}`);
  if (fresh) return cache.data;

  let { lat, lon, place } = w;
  if (lat == null || lon == null) {
    if (!w.place) return null;
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(w.place)}&count=1`
    ).then((r) => r.json());
    const hit = geo && geo.results && geo.results[0];
    if (!hit) return null;
    lat = hit.latitude; lon = hit.longitude;
    place = [hit.name, hit.country_code].filter(Boolean).join(', ');
  }

  const unit = w.unit === 'f' ? 'fahrenheit' : 'celsius';
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&temperature_unit=${unit}`
  ).then((r) => r.json());

  const cur = res && res.current;
  if (!cur) return null;
  const data = {
    temp: cur.temperature_2m,
    feels: cur.apparent_temperature,
    code: cur.weather_code,
    wind: cur.wind_speed_10m,
    place: place || w.place || `${lat.toFixed(1)}, ${lon.toFixed(1)}`
  };

  ctx.patch({
    'weather.cache': { at: Date.now(), unit: w.unit, key: w.place || `${w.lat},${w.lon}`, data },
    'weather.lat': lat,
    'weather.lon': lon
  });
  return data;
}

/* ----------------------------------------------------------------- todo */

const todo = {
  title: 'Tasks',
  render(ctx) {
    const wrap = el('div');
    const list = el('ul', 'todo-list');
    const items = ctx.state.data.todos;

    if (!items.length) list.appendChild(el('li', 'field-help', 'Nothing yet — add a task below.'));

    items.forEach((item, idx) => {
      const li = el('li', `todo-item${item.done ? ' done' : ''}`);
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = !!item.done;
      cb.addEventListener('change', () => {
        const next = ctx.state.data.todos.slice();
        next[idx] = { ...next[idx], done: cb.checked };
        ctx.patch({ 'data.todos': next });
      });
      const del = el('button', 'todo-del', `<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>`);
      del.title = 'Delete';
      del.addEventListener('click', () => {
        ctx.patch({ 'data.todos': ctx.state.data.todos.filter((_, i) => i !== idx) });
      });
      li.append(cb, el('span', null, escapeHtml(item.text)), del);
      list.appendChild(li);
    });

    const input = el('input', 'todo-new');
    input.type = 'text';
    input.placeholder = 'Add a task and press Enter…';
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !input.value.trim()) return;
      ctx.patch({ 'data.todos': [...ctx.state.data.todos, { text: input.value.trim(), done: false }] });
      input.value = '';
    });

    wrap.append(list, input);
    return wrap;
  }
};

/* ---------------------------------------------------------------- notes */

const notes = {
  title: 'Scratchpad',
  render(ctx) {
    const area = el('textarea', 'notes-area');
    area.placeholder = 'Type anything. It saves as you pause.';
    area.value = ctx.state.data.notes || '';
    let timer;
    area.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => ctx.patch({ 'data.notes': area.value }), 500);
    });
    return area;
  }
};

/* ------------------------------------------------------------- pomodoro */

const pomoRuntime = { running: false, phase: 'work', endsAt: 0, remaining: null };

const pomodoro = {
  title: 'Focus timer',
  render(ctx) {
    const wrap = el('div', 'pomo');
    wrap.innerHTML = `
      <div>
        <div class="pomo-time">25:00</div>
        <div class="pomo-phase">work</div>
      </div>
      <button class="pill-btn primary" data-act="toggle">Start</button>
      <button class="ghost-btn" data-act="reset">Reset</button>`;

    const cfg = () => ctx.state.data.pomodoro;
    if (pomoRuntime.remaining == null) pomoRuntime.remaining = cfg().work * 60;

    wrap.querySelector('[data-act="toggle"]').addEventListener('click', () => {
      if (pomoRuntime.running) {
        pomoRuntime.remaining = Math.max(0, Math.round((pomoRuntime.endsAt - Date.now()) / 1000));
        pomoRuntime.running = false;
      } else {
        pomoRuntime.endsAt = Date.now() + pomoRuntime.remaining * 1000;
        pomoRuntime.running = true;
      }
      pomodoro.tick(wrap, ctx);
    });

    wrap.querySelector('[data-act="reset"]').addEventListener('click', () => {
      pomoRuntime.running = false;
      pomoRuntime.phase = 'work';
      pomoRuntime.remaining = cfg().work * 60;
      pomodoro.tick(wrap, ctx);
    });

    pomodoro.tick(wrap, ctx);
    return wrap;
  },

  tick(wrap, ctx) {
    const cfg = ctx.state.data.pomodoro;
    if (pomoRuntime.running) {
      const left = Math.round((pomoRuntime.endsAt - Date.now()) / 1000);
      if (left <= 0) {
        // flip phase and keep going
        pomoRuntime.phase = pomoRuntime.phase === 'work' ? 'break' : 'work';
        pomoRuntime.remaining = (pomoRuntime.phase === 'work' ? cfg.work : cfg.break) * 60;
        pomoRuntime.endsAt = Date.now() + pomoRuntime.remaining * 1000;
        ctx.toast(pomoRuntime.phase === 'work' ? 'Back to work' : 'Break time');
      } else {
        pomoRuntime.remaining = left;
      }
    }
    const t = pomoRuntime.remaining ?? cfg.work * 60;
    const time = wrap.querySelector('.pomo-time');
    const phase = wrap.querySelector('.pomo-phase');
    const toggle = wrap.querySelector('[data-act="toggle"]');
    if (time) time.textContent = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
    if (phase) phase.textContent = pomoRuntime.phase;
    if (toggle) toggle.textContent = pomoRuntime.running ? 'Pause' : 'Start';
  }
};

/* ---------------------------------------------------------------- stats */

const stats = {
  title: 'At a glance',
  render(ctx) {
    const wrap = el('div', 'stats');
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - start) / 86400000) + 1;
    const week = Math.ceil(dayOfYear / 7);
    const yearPct = Math.round((dayOfYear / 365) * 100);

    const add = (value, label) => {
      const s = el('div', 'stat');
      s.append(el('div', 'stat-value', value), el('div', 'stat-label', label));
      wrap.appendChild(s);
      return s;
    };

    add(`${dayOfYear}`, 'day of year');
    add(`W${week}`, 'week');
    add(`${yearPct}%`, 'year done');
    const tabsStat = add('—', 'open tabs');
    const batteryStat = add('—', 'battery');

    chrome.tabs
      .query({})
      .then((tabs) => { tabsStat.querySelector('.stat-value').textContent = String(tabs.length); })
      .catch(() => { tabsStat.remove(); });

    if (navigator.getBattery) {
      navigator.getBattery()
        .then((b) => { batteryStat.querySelector('.stat-value').textContent = `${Math.round(b.level * 100)}%`; })
        .catch(() => batteryStat.remove());
    } else {
      batteryStat.remove();
    }

    return wrap;
  }
};

export const WIDGETS = { clock, greeting, search, shortcuts, quote, weather, todo, notes, pomodoro, stats };

export const WIDGET_LABELS = {
  clock: 'Clock',
  greeting: 'Greeting',
  search: 'Search bar',
  shortcuts: 'Shortcut tiles',
  quote: 'Daily quote',
  weather: 'Weather',
  todo: 'Task list',
  notes: 'Scratchpad',
  pomodoro: 'Focus timer',
  stats: 'At a glance'
};

/** Widgets that look better without a card chrome around them. */
export const BARE_WIDGETS = new Set(['clock', 'greeting', 'search', 'shortcuts']);
