'use strict';
// Light or dark island (Settings → Island → Theme). The island is drawn in dark colours everywhere; in light mode
// every neutral colour (black, greys, white) is flipped on its way to the canvas, so the whole island turns light
// in one place. Colours with a hue (status lights, album colour), pictures and Pip himself stay as they are.
// The DOM pages on top of the canvas get the same flip with a CSS filter.
(function theme() {
  const light = () => window.__winlandPrefs?.().theme === 'light';
  let robo = 0; // > 0 while Pip is drawn: his colours are his own

  // the browser's own colour parser: whatever the code writes comes back as #rrggbb or rgba(r, g, b, a)
  const probe = document.createElement('canvas').getContext('2d');
  const norm = c => { probe.fillStyle = '#000'; probe.fillStyle = c; return probe.fillStyle; };
  const flipped = new Map(), back = new Map();
  function flip(c) {
    if (typeof c !== 'string' || robo || !light()) return c;
    if (flipped.has(c)) return flipped.get(c);
    let out = c;
    const n = norm(c), m = /^#(..)(..)(..)$/.exec(n) || /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(n);
    if (m) {
      const hex = n[0] === '#', [r, g, b] = [1, 2, 3].map(i => hex ? parseInt(m[i], 16) : Number(m[i])), a = hex ? 1 : Number(m[4] ?? 1);
      if (Math.max(r, g, b) - Math.min(r, g, b) <= 24) { // grey enough: black ↔ white, #1c1c1e ↔ a soft light grey
        const f = v => Math.round(247 - v * 0.93);
        out = a < 1 ? `rgba(${f(r)},${f(g)},${f(b)},${a})` : `rgb(${f(r)},${f(g)},${f(b)})`;
        back.set(norm(out), c);
      }
    }
    if (flipped.size > 4000) { flipped.clear(); back.clear(); }
    flipped.set(c, out);
    return out;
  }

  // canvas: fill and stroke colours, and gradient stops
  const proto = CanvasRenderingContext2D.prototype;
  for (const prop of ['fillStyle', 'strokeStyle']) {
    const d = Object.getOwnPropertyDescriptor(proto, prop);
    Object.defineProperty(ctx, prop, {
      configurable: true,
      get() { const v = d.get.call(this); return back.has(v) ? back.get(v) : v; }, // code that saves and restores a colour gets its own back
      set(v) { d.set.call(this, flip(v)); }
    });
  }
  const addStop = CanvasGradient.prototype.addColorStop;
  CanvasGradient.prototype.addColorStop = function (offset, colour) { return addStop.call(this, offset, flip(colour)); };

  // Pip keeps the colours you picked for him
  for (const name of ['drawGhost', 'drawBlob', 'drawIslandEyes', 'drawEye']) {
    const base = window[name];
    if (typeof base !== 'function') continue;
    window[name] = function (...args) { robo++; try { return base.apply(this, args); } finally { robo--; } };
  }

  // DOM pages: the same flip as a filter (pictures are flipped back)
  const PAGES = ['#winland-ai-monitor', '#winland-ai-monitor-status', '#winland-chat', '#winland-extras', '#winland-focus', '#winland-menu',
    '#winland-tip', '#winland-tools', '#winland-dev', '#winland-controls', '#winland-system', '#winland-studio', '#winland-software', '#winland-project-v2', '#winland-settings-v2'].join(',');
  const style = document.createElement('style');
  style.textContent = `html.tc-light :is(${PAGES}){filter:invert(1) hue-rotate(180deg)}
html.tc-light :is(${PAGES}) :is(img,video,canvas){filter:invert(1) hue-rotate(180deg)}`;
  document.head.appendChild(style);
  let shown = null;
  setInterval(() => { const now = light(); if (now !== shown) { shown = now; document.documentElement.classList.toggle('tc-light', now); } }, 250);
})();
