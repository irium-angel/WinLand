'use strict';
// WinLand's sounds, all made here with the Web Audio API (no sound files): the island's own sounds (open, close,
// click…), the traffic-light melodies (done, question, error…) in four packs, and Pip's little voice.
// Packs: verre (glass bells, the default), bois (marimba), neon (soft retro synth), bulles (water drops).
// Loaded before icons-ui.js, which adds the volume and the "never two open/close at once" rule on top.
(function sfx() {
  let ctx = null, master = null, room = null;
  const volume = () => (typeof soundEnabled === 'undefined' || soundEnabled) ? (window.__winlandVolume?.() ?? 0.7) : 0;
  function audio() {
    if (!ctx) {
      ctx = new AudioContext();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
      master = ctx.createGain(); master.connect(comp);
      // a small room: a short, soft tail that makes the bells shine
      const conv = ctx.createConvolver(), len = ctx.sampleRate * 0.9, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4); }
      conv.buffer = ir; room = ctx.createGain(); room.gain.value = 0.22; room.connect(conv).connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.value = 1.6 * volume();
    return ctx;
  }
  // the end of every voice: panned, to the master and a little into the room
  function out(c, node, pan = 0, wet = 1) {
    const p = c.createStereoPanner(); p.pan.value = pan; node.connect(p); p.connect(master);
    if (wet) { const s = c.createGain(); s.gain.value = wet; p.connect(s).connect(room); }
  }
  const env = (c, g, t, peak, attack, decay) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay); };

  // ---- voices ----
  // glass bell: FM, bright at the start and pure as it rings out
  function bell(f, at = 0, dur = 0.7, vol = 0.12, pan = 0) {
    const c = audio(), t = c.currentTime + at, car = c.createOscillator(), mod = c.createOscillator(), idx = c.createGain(), g = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * 3.5;
    idx.gain.setValueAtTime(f * 2.2, t); idx.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.6);
    mod.connect(idx).connect(car.frequency); car.connect(g); env(c, g, t, vol, 0.004, dur);
    out(c, g, pan, 1); car.start(t); mod.start(t); car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
  }
  // marimba: a round fundamental with a short wooden knock on top
  function wood(f, at = 0, dur = 0.35, vol = 0.16, pan = 0) {
    const c = audio(), t = c.currentTime + at, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f * 6;
    for (const [mul, level, d] of [[1, 1, dur], [3.99, 0.35, dur * 0.25], [9.2, 0.12, dur * 0.08]]) {
      const o = c.createOscillator(), og = c.createGain(); o.frequency.value = f * mul; env(c, og, t, level, 0.002, d);
      o.connect(og).connect(lp); o.start(t); o.stop(t + d + 0.05);
    }
    lp.connect(g); g.gain.value = vol; out(c, g, pan, 0.3);
  }
  // soft retro synth: two detuned saws through a closing filter
  function neon(f, at = 0, dur = 0.3, vol = 0.07, pan = 0) {
    const c = audio(), t = c.currentTime + at, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6;
    lp.frequency.setValueAtTime(f * 8, t); lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + dur);
    for (const d of [-7, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
    lp.connect(g); env(c, g, t, vol, 0.01, dur); out(c, g, pan, 0.6);
  }
  // water drop: a sine that jumps up fast
  function drop(f, at = 0, dur = 0.14, vol = 0.14, pan = 0) {
    const c = audio(), t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(f * 0.55, t); o.frequency.exponentialRampToValueAtTime(f * 1.35, t + dur * 0.55);
    o.connect(g); env(c, g, t, vol, 0.006, dur); out(c, g, pan, 0.5); o.start(t); o.stop(t + dur + 0.05);
  }
  // a crisp tick (filtered noise) with a tiny tone in it
  function tick(at = 0, vol = 0.12, hz = 3200) {
    const c = audio(), t = c.currentTime + at, n = c.createBufferSource(), b = c.createBuffer(1, c.sampleRate * 0.03, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
    const bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = hz; bp.Q.value = 1.4; g.gain.value = vol;
    n.buffer = b; n.connect(bp).connect(g); out(c, g, 0, 0); n.start(t);
  }
  // air: noise through a sweeping band, for opening and closing
  function air(from, to, at = 0, dur = 0.28, vol = 0.09) {
    const c = audio(), t = c.currentTime + at, n = c.createBufferSource(), b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length);
    const bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(from, t); bp.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.value = vol; n.buffer = b; n.connect(bp).connect(g); out(c, g, 0, 0.4); n.start(t);
  }
  // Pip's voice: a little "bwee": a sine with a vowel-like filter and a wobble
  function voice(from, to, at = 0, dur = 0.16, vol = 0.1, wobble = 0) {
    const c = audio(), t = c.currentTime + at, o = c.createOscillator(), sub = c.createOscillator(), f1 = c.createBiquadFilter(), g = c.createGain();
    o.type = 'triangle'; sub.type = 'sine';
    for (const x of [o, sub]) { x.frequency.setValueAtTime(from * (x === sub ? 0.5 : 1), t); x.frequency.exponentialRampToValueAtTime(to * (x === sub ? 0.5 : 1), t + dur * 0.8); }
    f1.type = 'bandpass'; f1.Q.value = 2.5; f1.frequency.setValueAtTime(900, t); f1.frequency.linearRampToValueAtTime(2200, t + dur);
    if (wobble) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 11; lg.gain.value = wobble; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    o.connect(f1); sub.connect(f1); f1.connect(g); env(c, g, t, vol, 0.012, dur); out(c, g, 0, 0.4);
    o.start(t); sub.start(t); o.stop(t + dur + 0.05); sub.stop(t + dur + 0.05);
  }

  // ---- packs: one way to play a note ----
  const PACKS = {
    verre: { label: 'Verre', note: (f, at, len, v, pan) => bell(f, at, 0.55 * len + 0.25, 0.11 * v, pan) },
    bois: { label: 'Bois', note: (f, at, len, v, pan) => wood(f / 2, at, 0.3 * len + 0.12, 0.17 * v, pan) },
    neon: { label: 'Néon', note: (f, at, len, v, pan) => neon(f / 2, at, 0.22 * len + 0.08, 0.06 * v, pan) },
    bulles: { label: 'Bulles', note: (f, at, len, v, pan) => drop(f * 0.75, at, 0.1 * len + 0.08, 0.13 * v, pan) }
  };
  // ---- the melodies (D major pentatonic: D E F# A B), [frequency, delay s, length, loudness, pan] ----
  const N = { D5: 587.3, E5: 659.3, Fs5: 740, A5: 880, B5: 987.8, D6: 1174.7, E6: 1318.5, Fs6: 1480, A6: 1760, B6: 1975.5, D7: 2349.3, A4: 440, F5: 698.5, D4: 293.7 };
  const MELODIES = {
    done: [[N.D6, 0, 1, 1, -.2], [N.Fs6, 0.07, 1, .9, 0], [N.A6, 0.14, 1.6, .9, .2], [N.D7, 0.26, 2.2, .55, .3]],
    question: [[N.A5, 0, 1, 1, -.15], [N.E6, 0.13, 1.8, .9, .15], [N.Fs6, 0.32, .8, .4, .25]],
    error: [[N.F5, 0, 1.2, 1, .1], [N.D5, 0.15, 1.4, 1, -.1], [N.D4, 0.32, 2, .9, 0]],
    warn: [[N.B5, 0, .8, 1, -.2], [N.B5, 0.2, .8, 1, .2]],
    party: [N.D6, N.E6, N.Fs6, N.A6, N.B6, N.D7].map((f, i) => [f, i * 0.06, 1.2, .8, (i % 2 ? .3 : -.3)]),
    hello: [N.A5, N.D6, N.E6, N.A6].map((f, i) => [f, i * 0.08, 1.1, .8, i / 4 - .3]),
    pop: [[N.A6, 0, .5, .7, 0]],
    badge: [N.Fs6, N.A6, N.D7].map((f, i) => [f, i * 0.07, 1, .7, 0]),
    yum: [[N.E6, 0, .7, .8, 0], [N.B5, 0.09, .9, .7, 0]],
    send: [[N.D6, 0, .4, .5, .1]],
    reply: [[N.E6, 0, .9, .8, -.1], [N.B6, 0.08, 1.4, .7, .1]],
    fix: [N.D5, N.Fs5, N.A5, N.D6, N.Fs6, N.A6].map((f, i) => [f, i * 0.07, 1.3, .8, i / 6 - .4])
  };
  function melody(kind, pack) {
    if (!volume()) return;
    const p = PACKS[pack] || PACKS.verre;
    try {
      if (kind === 'send') air(500, 2600, 0, 0.18, 0.05);
      for (const [f, at, len, v, pan] of MELODIES[kind] || []) p.note(f, at, len, v, pan);
    } catch {}
  }
  // ---- the island's own sounds ----
  const UI = {
    intro: () => { air(300, 1800, 0, 0.4, 0.05); bell(N.D6, 0.12, 0.9, 0.06, -.2); bell(N.A6, 0.2, 1, 0.05, .2); },
    peek: () => tick(0, 0.04, 4200),
    open: () => { air(400, 2400, 0, 0.22, 0.05); drop(N.A5, 0.03, 0.12, 0.06); },
    close: () => { air(2200, 380, 0, 0.22, 0.045); drop(N.D5, 0.05, 0.12, 0.05); },
    click: () => tick(0, 0.09, 3400),
    angry: () => { neon(146.8, 0, 0.25, 0.05); neon(138.6, 0.12, 0.3, 0.05); },
    dizzy: () => { voice(900, 500, 0, 0.5, 0.06, 60); },
    drop: () => { drop(N.E6, 0, 0.12, 0.1); drop(N.A6, 0.09, 0.14, 0.08); } // a file lands in the tray
  };
  function ui(name) { if (!volume() || !UI[name]) return; try { UI[name](); } catch {} }
  // ---- Pip ----
  const PIP = {
    hi: () => { voice(620, 980, 0, 0.11, 0.09); voice(980, 1450, 0.1, 0.2, 0.08, 24); },     // "bi-bwee!"
    bye: () => { voice(1100, 880, 0, 0.12, 0.08); voice(980, 520, 0.16, 0.3, 0.08, 20); },   // "bwoo-ooh"
    open: () => drop(420, 0, 0.18, 0.12),     // the island plops open
    land: () => drop(300, 0, 0.12, 0.1),      // he lands
    wink: () => bell(N.B6, 0, 0.3, 0.04),     // a tiny sparkle
    close: () => drop(260, 0, 0.2, 0.1)       // the island closes
  };
  function pip(name) { if (!volume() || !PIP[name]) return; try { PIP[name](); } catch {} }

  window.__winlandSfx = { ui, melody, pip, packs: PACKS };
  // the island's sound() (mascot.html) now plays these; tone() stays for the rare raw tone
  if (typeof sound === 'function') sound = name => ui(name);
})();
