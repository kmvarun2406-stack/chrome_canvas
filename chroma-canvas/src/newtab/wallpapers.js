/**
 * Live wallpapers.
 *
 * Each engine is `{ init, frame }`. `init` seeds state for the current canvas
 * size and palette; `frame` draws one tick. The runner owns the canvas, the
 * rAF loop, DPR handling and resize, and pauses whenever the tab is hidden so
 * a background new tab costs nothing.
 */

import { paletteFrom, rgbaOf, shift } from '../lib/paint.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/* ---------------------------------------------------------------- aurora */

const aurora = {
  init(s) {
    s.ribbons = Array.from({ length: Math.round(4 + s.density * 3) }, (_, i) => ({
      color: s.palette[i % s.palette.length],
      amp: rand(0.06, 0.2),
      freq: rand(0.6, 1.8),
      phase: rand(0, TAU),
      drift: rand(0.04, 0.16) * (Math.random() < 0.5 ? -1 : 1),
      y: rand(0.25, 0.8),
      thickness: rand(0.08, 0.26)
    }));
  },
  frame(ctx, s, t) {
    const { w, h } = s;
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, shift(s.palette[0], 0, -10, -22));
    bg.addColorStop(1, shift(s.palette[1], 10, -20, -32));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'screen';
    for (const r of s.ribbons) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, rgbaOf(r.color, 0));
      grad.addColorStop(0.5, rgbaOf(r.color, 0.5));
      grad.addColorStop(1, rgbaOf(r.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      const step = Math.max(6, w / 160);
      for (let x = 0; x <= w + step; x += step) {
        const u = x / w;
        const y =
          r.y * h +
          Math.sin(u * TAU * r.freq + t * r.drift + r.phase) * r.amp * h +
          Math.sin(u * TAU * r.freq * 2.3 + t * r.drift * 1.7) * r.amp * h * 0.35;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      for (let x = w + step; x >= 0; x -= step) {
        const u = x / w;
        const y =
          r.y * h +
          Math.sin(u * TAU * r.freq + t * r.drift + r.phase) * r.amp * h +
          r.thickness * h;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
};

/* ----------------------------------------------------------- constellate */

const constellate = {
  init(s) {
    const count = Math.round((s.w * s.h) / 22000 * s.density);
    s.pts = Array.from({ length: Math.max(24, Math.min(320, count)) }, () => ({
      x: Math.random() * s.w,
      y: Math.random() * s.h,
      vx: rand(-0.18, 0.18),
      vy: rand(-0.18, 0.18),
      r: rand(0.8, 2.4)
    }));
    s.link = Math.min(170, Math.max(90, Math.hypot(s.w, s.h) * 0.09));
  },
  frame(ctx, s, t, dt) {
    const { w, h } = s;
    ctx.fillStyle = shift(s.palette[0], 0, -14, -26);
    ctx.fillRect(0, 0, w, h);

    const mx = s.pointer.x, my = s.pointer.y;
    for (const p of s.pts) {
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < s.pts.length; i++) {
      const a = s.pts[i];
      for (let j = i + 1; j < s.pts.length; j++) {
        const b = s.pts[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > s.link * s.link) continue;
        const alpha = (1 - Math.sqrt(d2) / s.link) * 0.5;
        ctx.strokeStyle = rgbaOf(s.palette[2], alpha);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // cursor halo
      if (mx >= 0) {
        const d = Math.hypot(a.x - mx, a.y - my);
        if (d < 200) {
          ctx.strokeStyle = rgbaOf(s.palette[3], (1 - d / 200) * 0.6);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mx, my);
          ctx.stroke();
        }
      }
      ctx.fillStyle = rgbaOf(s.palette[1], 0.9);
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, TAU);
      ctx.fill();
    }
  }
};

/* ------------------------------------------------------------------ warp */

const warp = {
  init(s) {
    const n = Math.round(420 * s.density);
    s.stars = Array.from({ length: n }, () => ({
      x: rand(-1, 1),
      y: rand(-1, 1),
      z: Math.random(),
      c: pick(s.palette)
    }));
  },
  frame(ctx, s, t, dt) {
    const { w, h } = s;
    ctx.fillStyle = rgbaOf(shift(s.palette[0], 0, -10, -30), 0.3);
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2 + (s.pointer.x >= 0 ? (s.pointer.x - w / 2) * 0.08 : 0);
    const cy = h / 2 + (s.pointer.y >= 0 ? (s.pointer.y - h / 2) * 0.08 : 0);
    const f = Math.min(w, h) * 0.9;

    for (const st of s.stars) {
      const pz = st.z;
      st.z -= dt * 0.00018 * s.speed;
      if (st.z <= 0.02) {
        st.x = rand(-1, 1); st.y = rand(-1, 1); st.z = 1; st.c = pick(s.palette);
        continue;
      }
      const sx = cx + (st.x / st.z) * f * 0.5;
      const sy = cy + (st.y / st.z) * f * 0.5;
      const px = cx + (st.x / pz) * f * 0.5;
      const py = cy + (st.y / pz) * f * 0.5;
      const size = (1 - st.z) * 2.6;
      ctx.strokeStyle = rgbaOf(st.c, Math.min(1, (1 - st.z) * 1.2));
      ctx.lineWidth = Math.max(0.5, size);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
  }
};

/* ----------------------------------------------------------------- waves */

const waves = {
  init(s) {
    s.lines = Math.round(26 + s.density * 24);
  },
  frame(ctx, s, t) {
    const { w, h } = s;
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, shift(s.palette[0], 0, -8, -24));
    bg.addColorStop(1, shift(s.palette[3], 0, -18, -30));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1.2;
    for (let i = 0; i < s.lines; i++) {
      const p = i / s.lines;
      ctx.strokeStyle = rgbaOf(s.palette[1 + (i % 3)], 0.14 + p * 0.3);
      ctx.beginPath();
      const step = Math.max(8, w / 120);
      for (let x = 0; x <= w + step; x += step) {
        const u = x / w;
        const y =
          h * (0.18 + p * 0.68) +
          Math.sin(u * 6 + t * 0.18 + i * 0.22) * 28 * (0.4 + p) +
          Math.cos(u * 3.3 - t * 0.12 + i * 0.4) * 18;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
};

/* ---------------------------------------------------------------- matrix */

const matrix = {
  init(s) {
    s.cell = 18;
    s.cols = Math.ceil(s.w / s.cell);
    s.drops = Array.from({ length: s.cols }, () => rand(-60, s.h / s.cell));
    s.glyphs = 'アイウエオカキクケcoサシスセソ0123456789ABCDEF<>{}[]/\\|=+*'.split('');
  },
  frame(ctx, s, t, dt) {
    const { w, h } = s;
    ctx.fillStyle = rgbaOf('#000000', 0.12);
    ctx.fillRect(0, 0, w, h);
    ctx.font = `${s.cell - 2}px "Cascadia Code", Consolas, monospace`;
    ctx.textBaseline = 'top';
    for (let i = 0; i < s.cols; i++) {
      const y = s.drops[i] * s.cell;
      ctx.fillStyle = rgbaOf(s.palette[4], 0.95);
      ctx.fillText(pick(s.glyphs), i * s.cell, y);
      ctx.fillStyle = rgbaOf(s.palette[2], 0.5);
      ctx.fillText(pick(s.glyphs), i * s.cell, y - s.cell * 2);
      s.drops[i] += dt * 0.012 * s.speed * (0.6 + (i % 5) * 0.14);
      if (y > h && Math.random() > 0.975) s.drops[i] = rand(-30, 0);
    }
  }
};

/* ----------------------------------------------------------------- blobs */

const blobs = {
  init(s) {
    s.orbs = Array.from({ length: Math.round(4 + s.density * 4) }, (_, i) => ({
      c: s.palette[i % s.palette.length],
      x: Math.random(), y: Math.random(),
      r: rand(0.22, 0.52),
      ax: rand(0.1, 0.4), ay: rand(0.1, 0.4),
      px: rand(0, TAU), py: rand(0, TAU),
      sp: rand(0.05, 0.16)
    }));
  },
  frame(ctx, s, t) {
    const { w, h } = s;
    ctx.fillStyle = shift(s.palette[0], 0, -6, -28);
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const base = Math.min(w, h);
    for (const o of s.orbs) {
      const x = (o.x + Math.sin(t * o.sp + o.px) * o.ax) * w;
      const y = (o.y + Math.cos(t * o.sp * 0.8 + o.py) * o.ay) * h;
      const r = o.r * base;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgbaOf(o.c, 0.55));
      g.addColorStop(0.45, rgbaOf(o.c, 0.2));
      g.addColorStop(1, rgbaOf(o.c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
};

/* ------------------------------------------------------------------ grid */

const grid = {
  init(s) {
    s.offset = 0;
  },
  frame(ctx, s, t, dt) {
    const { w, h } = s;
    const horizon = h * 0.45;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, shift(s.palette[0], 0, 0, -26));
    sky.addColorStop(1, shift(s.palette[3], 0, -10, -16));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon);
    ctx.fillStyle = shift(s.palette[0], 0, 6, -32);
    ctx.fillRect(0, horizon, w, h - horizon);

    // sun
    const sr = Math.min(w, h) * 0.16;
    const sg = ctx.createRadialGradient(w / 2, horizon, 0, w / 2, horizon, sr * 2.4);
    sg.addColorStop(0, rgbaOf(s.palette[2], 0.8));
    sg.addColorStop(1, rgbaOf(s.palette[2], 0));
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);

    s.offset = (s.offset + dt * 0.0006 * s.speed) % 1;
    ctx.strokeStyle = rgbaOf(s.palette[1], 0.55);
    ctx.lineWidth = 1.4;

    const rows = 22;
    for (let i = 0; i < rows; i++) {
      const p = ((i + s.offset) / rows) ** 2.4;
      const y = horizon + p * (h - horizon);
      ctx.globalAlpha = 1 - p * 0.75;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.5;
    const cols = 24;
    for (let i = -cols; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * 14, horizon);
      ctx.lineTo(w / 2 + i * (w / cols) * 1.6, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
};

/* ----------------------------------------------------------------- bokeh */

const bokeh = {
  init(s) {
    s.dots = Array.from({ length: Math.round(34 * s.density) }, () => ({
      x: Math.random() * s.w,
      y: Math.random() * s.h,
      r: rand(10, 70),
      c: pick(s.palette),
      vy: rand(-0.05, -0.014),
      vx: rand(-0.02, 0.02),
      a: rand(0.08, 0.3)
    }));
  },
  frame(ctx, s, t, dt) {
    const { w, h } = s;
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, shift(s.palette[0], 0, -4, -24));
    bg.addColorStop(1, shift(s.palette[4], 0, -16, -34));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const d of s.dots) {
      d.y += d.vy * dt * 0.1 * s.speed;
      d.x += d.vx * dt * 0.1 * s.speed;
      if (d.y < -d.r) { d.y = h + d.r; d.x = Math.random() * w; }
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      g.addColorStop(0, rgbaOf(d.c, d.a));
      g.addColorStop(0.7, rgbaOf(d.c, d.a * 0.35));
      g.addColorStop(1, rgbaOf(d.c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
};

const ENGINES = { aurora, constellate, warp, waves, matrix, blobs, grid, bokeh };

/* ---------------------------------------------------------------- runner */

export class LiveWallpaper {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.raf = 0;
    this.last = 0;
    this.t = 0;
    this.state = { pointer: { x: -1, y: -1 }, speed: 1, density: 1, palette: [], w: 0, h: 0 };
    this.engine = null;

    this._resize = () => this.resize();
    this._visibility = () => (document.hidden ? this.pause() : this.play());
    this._pointer = (e) => {
      this.state.pointer.x = e.clientX;
      this.state.pointer.y = e.clientY;
    };
    this._leave = () => {
      this.state.pointer.x = -1;
      this.state.pointer.y = -1;
    };
  }

  configure({ engine, speed, density, hueShift, accent, accent2 }) {
    const name = ENGINES[engine] ? engine : 'aurora';
    this.engine = ENGINES[name];
    this.state.speed = speed ?? 1;
    this.state.density = Math.max(0.2, density ?? 1);
    this.state.palette = paletteFrom(accent, accent2).map((c) => shift(c, hueShift || 0));
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = this.canvas.clientWidth || innerWidth;
    const h = this.canvas.clientHeight || innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.state.w = w;
    this.state.h = h;
    if (this.engine) this.engine.init(this.state);
  }

  start() {
    addEventListener('resize', this._resize);
    document.addEventListener('visibilitychange', this._visibility);
    addEventListener('pointermove', this._pointer, { passive: true });
    addEventListener('pointerleave', this._leave);
    this.play();
  }

  play() {
    if (this.raf || !this.engine) return;
    this.last = performance.now();
    const loop = (now) => {
      const dt = Math.min(64, now - this.last);
      this.last = now;
      this.t += (dt / 1000) * this.state.speed;
      try {
        this.engine.frame(this.ctx, this.state, this.t, dt);
      } catch (err) {
        console.error('[chroma] wallpaper frame failed', err);
        this.pause();
        return;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  destroy() {
    this.pause();
    removeEventListener('resize', this._resize);
    document.removeEventListener('visibilitychange', this._visibility);
    removeEventListener('pointermove', this._pointer);
    removeEventListener('pointerleave', this._leave);
  }
}

export const engineNames = Object.keys(ENGINES);
