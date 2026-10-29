'use strict';
// WinLand fun: Pip's faces, blinking, startup show, sounds, confetti, sleeping, dancing,
// limit warnings, a focus timer, and all the "make it yours" options in Settings.
// Reads the Claude Code status from ai-monitor-ui.js (window.__winlandStatus) and draws through
// the hooks in drawGhost (mascot.html): __winlandGhostFx, __winlandGhostDecor and __winlandLook.
(function winlandFun() {
  const now = () => performance.now();
  const store = {
    get: (key, fallback) => { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  };

  // ---------- preferences (Settings → Algemeen) ----------
  const DEFAULTS = { lang: 'fr', theme: 'dark', profile: 'custom', quietFullscreen: true, autoHide: true, privacyDot: true, shotsToTray: true, downloadsLive: true, chargeLive: true, breakEvery: 0, clipWarn: false, devWatch: false, speed: 'snel', focusMin: 25, focusSec: 1500,eye: 'mint', body: 'wolk', palette: 'klassiek', faces: true, blink: true,
    dance: true, confetti: true, chimes: true, notify: true, startup: true, sleepMin: 10, warnAt: 80,
    pack: 'verre', volumeHud: true, batteryWarn: true, appAnim: true,
    testMode: false, name: 'Pip', lightBusy: '#ff9a1f', lightDone: '#22e05a', lightError: '#ff3b3b' };
  const savedPrefs = store.get('winland:prefs', {});
  if (!savedPrefs.newLook) { savedPrefs.body = 'wolk'; savedPrefs.newLook = true; store.set('winland:prefs', savedPrefs); } // switch once to the new white look
  const prefs = { ...DEFAULTS, ...savedPrefs };
  // Old saves only had a palette preset: start the own colours from that preset.
  if (savedPrefs.lightBusy === undefined && savedPrefs.palette && savedPrefs.palette !== 'klassiek') {
    const old = { zacht: ['#ffc27a', '#8ef0a8', '#ff8a8a'], kleurenblind: ['#ffb000', '#3d9bff', '#ff5ac8'] }[savedPrefs.palette];
    if (old) [prefs.lightBusy, prefs.lightDone, prefs.lightError] = old;
  }
  if (!window.__winlandSfx?.packs[prefs.pack]) prefs.pack = 'verre'; // the sound packs were renewed (sfx-ui.js)
  if (prefs.lang !== 'en') prefs.lang = 'fr'; // only French and English (old saves may still say 'nl')
  if (prefs.theme !== 'light') prefs.theme = 'dark';
  if (prefs.name === 'Robo' || prefs.name === 'WinLand') prefs.name = 'Pip'; // the old names become the new mascot's
  const petName = () => String(prefs.name || '').trim() || 'Pip';
  if (!['snel', 'normaal'].includes(prefs.speed)) prefs.speed = 'normaal'; // 'rustig' no longer exists
  let drafting = false; // WinLand Instellingen is trying something out (settings-bridge-ui.js): not saved, not on the real Pip
  const save = () => { if (drafting) return; store.set('winland:prefs', prefs); apply(); };

  const EYES = { mint: '#e3ffd4', wit: '#ffffff', blauw: '#8fd3ff', roze: '#ffb3d9', paars: '#c9a7ff', geel: '#fff3a3' };
  // 'wolk' is the bright white blob (default since the new look); the others are the classic dark ghost.
  const BODIES = { wolk: ['#ffffff', '#e2ece6'], munt: ['#f4fff6', '#c9f0d6'], lucht: ['#f3f8ff', '#cfe0ff'], roos: ['#fff4f8', '#ffd3e4'], klassiek: ['#59695d', '#344239'], nacht: ['#3a3f47', '#1c1f24'], blauw: ['#4f6f9e', '#2c3f5e'],
    paars: ['#6e5a9e', '#3b2f5e'], roze: ['#a5637f', '#5e3446'], goud: ['#9e8a4f', '#5e4f2c'] };
  const PALETTES = {
    klassiek: { busy: '#ff9a1f', question: '#ff9a1f', done: '#22e05a', error: '#ff3b3b', label: 'Klassiek' },
    zacht: { busy: '#ffc27a', question: '#ffc27a', done: '#8ef0a8', error: '#ff8a8a', label: 'Zacht' },
    kleurenblind: { busy: '#ffb000', question: '#ffb000', done: '#3d9bff', error: '#ff5ac8', label: 'Kleurenblind' }
  };
  // Only Snel and Normaal: slow animations felt sluggish.
  const SPEEDS = { snel: { t: 0.5, peek: 140, home: 300, view: 1500, mon: 600 }, normaal: { t: 0.8, peek: 260, home: 400, view: 2200, mon: 800 } };

  const BLOBS = ['wolk', 'munt', 'lucht', 'roos'];
  window.__winlandLook = () => ({ eye: EYES[prefs.eye], shell1: BODIES[prefs.body]?.[0], shell2: BODIES[prefs.body]?.[1], style: BLOBS.includes(prefs.body) ? 'blob' : 'ghost' });
  // The traffic-light colours are your own choice (Settings → Karakter → Stoplicht-ogen).
  window.__winlandPalette = () => ({ busy: prefs.lightBusy, question: prefs.lightBusy, done: prefs.lightDone, error: prefs.lightError });
  window.__winlandName = petName;

  // Faster (or calmer) opening and closing, and how quickly the island reacts to your mouse.
  const baseSetMode = setMode;
  setMode = function (next, playSound) {
    const result = baseSetMode(next, playSound);
    if (transition && !transition.scaled) { transition.duration *= SPEEDS[prefs.speed].t; transition.scaled = true; }
    return result;
  };
  // the choices made in the installer, the very first time (tray-main.cjs reads them once)
  window.winland?.firstRun?.().then(r => {
    if (!r) return;
    if (['fr', 'en'].includes(r.lang)) prefs.lang = r.lang;
    if (['dark', 'light'].includes(r.theme)) prefs.theme = r.theme;
    if (PROFILES[r.profile] !== undefined) { prefs.profile = r.profile; Object.assign(prefs, PROFILES[r.profile]?.prefs || {}); }
    save();
  }).catch(() => {});
  function apply() {
    window.winland?.setLang?.(prefs.lang);
    applyProfile(); updateQuiet();
    const s = SPEEDS[prefs.speed];
    UI.NORMAL_PEEK_DELAY = s.peek; UI.HOME_LEAVE_DELAY = s.home; UI.VIEW_LEAVE_DELAY = s.view; UI.MONITOR_LEAVE_DELAY = s.mon;
    window.winland?.aiMonitorSetNotify?.(prefs.notify).catch?.(() => {});
  }

  // ---------- profiles: the island set up for what you do (Settings → General → Profile) ----------
  // Picking one sets a few switches right away (you see them change, you can still change each one) and,
  // when you save, the home screen widgets and the 4 quick buttons. "Eigen keuze" (custom) changes nothing.
  const PROFILES = {
    custom: null,
    office: { apps: ['note', 'clips', 'focus', 'tray', 'clock', 'mirror', 'buddy', 'spotify', 'controls', 'software'],
      home: [['note', 'W'], ['clips', 'W'], ['focus', 'S'], ['tray', 'S'], ['software', 'S'], ['settings', 'S']], quick: ['note', 'clips', 'focus', 'tray'],
      prefs: { chimes: true, notify: true, confetti: false, appAnim: false, dance: false, quietFullscreen: true, batteryWarn: true } },
    dev: { apps: ['claude', 'dev', 'buddy', 'clips', 'note', 'focus', 'tray', 'spotify', 'clock', 'controls', 'system', 'software'],
      home: [['claude', 'L'], ['dev', 'W'], ['focus', 'S'], ['clips', 'S']], quick: ['claude', 'dev', 'chat', 'clips'],
      prefs: { chimes: true, notify: true, confetti: true, appAnim: true, warnAt: 80, quietFullscreen: false, devWatch: true } },
    gaming: { apps: ['spotify', 'clock', 'tray', 'controls', 'system', 'software'],
      home: [['spotify', 'L'], ['system', 'W'], ['software', 'S'], ['tray', 'S']], quick: ['spotify', 'system', 'software', 'controls'],
      prefs: { chimes: false, notify: false, confetti: true, appAnim: true, volumeHud: true, batteryWarn: true, quietFullscreen: true, breakEvery: 120 } },
    music: { apps: ['spotify', 'tray', 'note', 'focus', 'clock', 'controls', 'studio', 'software'],
      home: [['spotify', 'L'], ['studio', 'W'], ['software', 'S'], ['tray', 'S']], quick: ['spotify', 'studio', 'software', 'tray'],
      prefs: { chimes: false, notify: true, confetti: false, dance: true, volumeHud: true, quietFullscreen: false, clipWarn: true } }
  };
  const PROFILE_HELP = {
    custom: 'Jij kiest alles zelf, hieronder',
    office: 'Notitie, klembord en focus voorop. Rustig: geen confetti, verstopt bij een presentatie',
    dev: 'Claude Code en Dev (Git, servers) op het homescherm, melding als een build klaar is, waarschuwing bij 80% limiet',
    gaming: 'Muziek voorop, geen geluiden of meldingen, en de island verstopt zich als een game het scherm vult',
    music: 'Muziek en lade voorop (sleep je samples erin). Geen eigen geluiden die je mix storen'
  };
  // every app you can turn on or off (the settings app's Apps page); Settings itself is always there
  const ALL_APPS = ['software', 'system', 'studio', 'controls', 'claude', 'dev', 'buddy', 'spotify', 'focus', 'tray', 'clips', 'note', 'clock', 'mirror'];
  window.__winlandProfileOff = name => PROFILES[name] ? ALL_APPS.filter(id => !PROFILES[name].apps.includes(id)) : null;
  let profileApplied = store.get('winland:profile-applied', 'custom');
  function applyProfile() { // on save: the home screen follows the profile you picked (only when it changed)
    const p = PROFILES[prefs.profile];
    if (prefs.profile === profileApplied) return;
    profileApplied = prefs.profile; store.set('winland:profile-applied', profileApplied);
    if (!p) return;
    window.__winlandSetAppsOff?.(window.__winlandProfileOff(prefs.profile)); // only the useful apps stay
    window.__winlandSetHome?.(p.home, p.quick);
    const pageApp = { monitor: 'claude', assistant: 'claude', chat: 'buddy', spotify: 'spotify', focus: 'focus', tray: 'tray', clips: 'clips', note: 'note', mirror: 'mirror', dev: 'dev', controls: 'controls', system: 'system', studio: 'studio', software: 'software' }[currentView];
    if (pageApp && window.__winlandAppsOff?.().has(pageApp)) setView('home'); // the page you were on just went
  }

  // ---------- the window in front (volume-watch.ps1): nothing, a maximized/full-screen window, or a game ----------
  // A game: with "Discreet in a game" on, the island is gone and silent (no sounds, no notifications).
  // A maximized or full-screen window (browser, video…): with "Hide behind big windows" on, the island only comes
  // out when the mouse goes to the top edge, and hides again when it leaves (main.js peek).
  let foreground = 'none', quiet = false, presence = '';
  function updateQuiet() {
    quiet = Boolean(prefs.quietFullscreen && foreground === 'game');
    const next = quiet ? 'hidden' : prefs.autoHide && foreground === 'cover' ? 'peek' : 'normal';
    if (next !== presence) { presence = next; window.winland?.setPresence?.(presence); }
  }
  window.winland?.onForeground?.(mode => { foreground = String(mode || 'none'); updateQuiet(); });
  window.winland?.foregroundGet?.().then(r => { foreground = String(r?.mode || 'none'); updateQuiet(); }).catch(() => {});
  window.__winlandQuiet = () => quiet;
  // ---------- break reminder: how long a game has been in front (a pause of 5 min or more starts the count again) ----------
  let playSince = 0, lastGameAt = 0, reminded = 0;
  setInterval(() => {
    const now = Date.now();
    if (foreground === 'game') { if (!playSince || now - lastGameAt > 5 * 60000) { playSince = now; reminded = 0; } lastGameAt = now; }
    const every = Number(prefs.breakEvery) || 0;
    if (!every || !playSince || foreground !== 'game') return;
    const due = Math.floor((now - playSince) / 60000 / every);
    if (due >= 1 && due > reminded) { // even in a game (the island is hidden then): a Windows notification
      reminded = due; const mins = Math.round((now - playSince) / 60000), h = `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')}`;
      try { new Notification(prefs.lang === 'en' ? 'Time for a break?' : 'Petite pause ?', { body: prefs.lang === 'en' ? `You have been playing for ${h}. Stretch, drink some water.` : `Tu joues depuis ${h}. Étire-toi, bois un verre d’eau.` }); } catch {}
    }
  }, 30000);
  window.__winlandPlayTime = () => playSince && Date.now() - lastGameAt < 5 * 60000 ? Math.round((Date.now() - playSince) / 1000) : 0; // seconds
  apply();

  const say = (title, body) => { if (!prefs.notify || quiet) return; try { new Notification(title, { body, silent: true }); } catch {} };
  window.__winlandPrefs = () => prefs;
  window.__winlandSay = say;

  // ---------- sounds: the melodies and packs live in sfx-ui.js ----------
  const PACKS = window.__winlandSfx?.packs || {};
  function chime(kind) {
    if (!soundEnabled || !prefs.chimes || quiet) return;
    window.__winlandSfx?.melody(kind, prefs.pack);
  }

  // ---------- finished tasks: only counted (the Claude screen shows today's jobs). No outfits, achievements or hunger. ----------
  let doneCount = store.get('winland:done-count', 0);
  function countDone() { doneCount++; store.set('winland:done-count', doneCount); window.__winlandMonitor?.refresh?.(); }
  const bump = () => {}, feed = () => {}, hungry = () => false; // (the old rewards are gone; the callers stay simple)
  window.__winlandHunger = () => null;
  window.__winlandHomeTitle = () => '';

  // ---------- focus timer (hours, minutes and seconds are chosen on the Focus page, focus-ui.js) ----------
  if (!prefs.focusSec) prefs.focusSec = (prefs.focusMin || 25) * 60;
  let focusEnd = store.get('winland:focus-end', 0), focusLength = store.get('winland:focus-length', prefs.focusSec * 1000);
  const clock = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`; };
  const focus = {
    active: () => focusEnd > Date.now(),
    left: () => Math.max(0, focusEnd - Date.now()),
    length: () => focusLength,
    chosen: () => prefs.focusSec,
    minutes: () => Math.round(prefs.focusSec / 60),
    label: () => clock(focus.left()),
    choose(sec) { prefs.focusSec = Math.max(5, Math.min(24 * 3600 - 1, Math.round(sec))); save(); },
    start(sec = prefs.focusSec) {
      focusLength = sec * 1000; focusEnd = Date.now() + focusLength;
      store.set('winland:focus-end', focusEnd); store.set('winland:focus-length', focusLength);
      chime('pop'); feel('heart', 1200); wake(); window.__winlandSettleSize?.();
    },
    add(sec) { if (!focus.active()) return; focusEnd += sec * 1000; focusLength += sec * 1000; store.set('winland:focus-end', focusEnd); store.set('winland:focus-length', focusLength); },
    stop() { focusEnd = 0; store.set('winland:focus-end', 0); chime('error'); window.__winlandSettleSize?.(); },
    toggle() { focus.active() ? focus.stop() : focus.start(); }
  };
  window.__winlandFocus = focus;
  // ---------- focus statistics: the minutes of every finished focus block, per day (kept 60 days, on this PC) ----------
  const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function logFocus(ms) {
    const log = store.get('winland:focus-log', {}), key = dayKey(new Date());
    log[key] = (log[key] || 0) + Math.round(ms / 60000);
    const keep = Object.keys(log).sort().slice(-60); store.set('winland:focus-log', Object.fromEntries(keep.map(k => [k, log[k]])));
  }
  window.__winlandFocusStats = () => { // today, the last 7 days (oldest first) and their total, in minutes
    const log = store.get('winland:focus-log', {}), days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(log[dayKey(d)] || 0); }
    return { today: days[6], days, week: days.reduce((a, b) => a + b, 0) };
  };
  canvas.addEventListener('click', event => {
    if (inside(event.clientX, event.clientY, hit.focusApp)) { event.preventDefault(); event.stopImmediatePropagation(); setView('focus'); }
  }, true);

  // ---------- confetti (own click-through canvas over the window) ----------
  const layer = document.createElement('canvas');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:80';
  document.body.appendChild(layer);
  const lctx = layer.getContext('2d');
  let bits = [], running = false;
  function confetti(amount = 90) {
    if (!prefs.confetti) return;
    const cx = islandBounds.x + islandBounds.width / 2, colours = ['#22e05a', '#ff9a1f', '#ffd166', '#4cc9f0', '#f72585', EYES[prefs.eye]];
    for (let i = 0; i < amount; i++) {
      bits.push({ x: cx + (Math.random() - 0.5) * Math.max(80, islandBounds.width * 0.6), y: islandBounds.height * 0.6, vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 3 - 1, size: 3 + Math.random() * 4, spin: Math.random() * 6, colour: colours[i % colours.length], life: 1 });
    }
    if (!running) { running = true; requestAnimationFrame(drawConfetti); }
  }
  function drawConfetti() {
    layer.width = innerWidth; layer.height = innerHeight;
    bits = bits.filter(b => b.life > 0 && b.y < innerHeight + 10);
    for (const b of bits) {
      b.vy += 0.12; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.spin += 0.2; b.life -= 0.008;
      lctx.save(); lctx.globalAlpha = Math.min(1, b.life * 2); lctx.translate(b.x, b.y); lctx.rotate(b.spin);
      lctx.fillStyle = b.colour; lctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2); lctx.restore();
    }
    if (bits.length) requestAnimationFrame(drawConfetti); else running = false;
  }

  // ---------- feelings: short-lived expressions on top of the status ----------
  let feeling = null, feelingUntil = 0, bounceAt = -1e9;
  // The settings app's own Pip: his own feelings, hops, waves and the look you are trying out.
  const pv = { prefs: null, feeling: null, feelingUntil: 0, bounceAt: -1e9, danceUntil: 0, waveUntil: 0, nextBlink: 0 };
  function feel(mood, ms) { if (drafting) { pv.feeling = mood; pv.feelingUntil = now() + ms; return; } feeling = mood; feelingUntil = now() + ms; }
  function jump() { if (drafting) { pv.bounceAt = now(); return; } bounceAt = now(); }
  window.__winlandFeel = feel;
  window.__winlandCelebrate = (kind = 'done', bits = 40) => { chime(kind); jump(); confetti(bits); }; // Pip's chat: a fix landed
  window.__winlandChime = kind => chime(kind);
  window.__winlandCheer = () => { jump(); feel('happy', 800); chime('pop'); };

  // ---------- sleeping ----------
  let lastWake = Date.now();
  function wake() { lastWake = Date.now(); }
  canvas.addEventListener('click', wake, true);
  const asleep = () => sleepEnabled && !window.__winlandStatus?.() && !focus.active() && !spotifyState.is_playing
    && !(pointer.known && inside(pointer.x, pointer.y, islandBounds)) && Date.now() - lastWake > prefs.sleepMin * 60000;

  // ---------- hello and goodbye: calm and smooth ----------
  // Startup: the island opens, he waves and says "Hoi! Ik ben …", winks, and goes small again.
  // Goodbye: "Doei! Tot zo", he waves, closes his eyes, and the island shrinks away.
  let showAt = null;
  const showColours = () => [prefs.lightError, prefs.lightBusy, prefs.lightDone];
  const baseEyes = window.__winlandEyes;
  // In the Settings locker WinLand shows his own look, not Claude's traffic light.
  const inLocker = () => window.__winlandLockerDraw === true;
  let lightsDemoAt = -1e9; // Settings example: the traffic-light eyes test themselves once
  let lightPreview = null; // { color, until }: a just-picked traffic-light colour, shown on the eyes
  // Like a jelly blob (inspired by the iPhone's Dynamic Island springs and cartoon squash & stretch):
  // hello: the island plops open and wobbles, he lands squashed, stretches up and says a cute "hi!".
  // bye: "bye-bye!", he waves, squashes down and zips into a dot with a "bloop", the island squeezes shut.
  const HELLO = { land: 380, hi: 700, tilt: 1300, wink: 2000, end: 2700 };
  const BYE = { squash: 650, off: 880, end: 1400 };
  // A spring: overshoots and wobbles out (amp × fading sine). Used for the jelly island and squash & stretch.
  const spring = (ms, amp, hz = 3, damp = 6) => ms < 0 ? 0 : amp * Math.exp(-damp * ms / 1000) * Math.sin(2 * Math.PI * hz * ms / 1000);

  // ---- Pip's voice and the island's bloops (sfx-ui.js) ----
  const sayHi = () => window.__winlandSfx?.pip('hi'), sayByeBye = () => window.__winlandSfx?.pip('bye');
  window.__winlandVoice = { hi: sayHi, bye: sayByeBye }; // handy for testing

  // The island itself wobbles like jelly: each "kick" starts a spring.
  const kicks = [];
  const kick = (amp, hz = 2.6, damp = 5.5) => { kicks.push({ at: now(), amp, hz, damp }); if (kicks.length > 6) kicks.shift(); };
  window.__winlandKick = kick; // a little jelly wobble of the island (used by swipe)
  const baseDrawIsland = drawIsland;
  // During hello and bye he stands in the middle of the island (a bit bigger): he is the show.
  const baseDrawGhost = drawGhost;
  drawGhost = function (x, y, size, ...rest) {
    if ((showAt != null || byeAt != null) && mode === 'compact' && y < 40 && !inLocker()) { x = islandBounds.x + islandBounds.width / 2; size *= 1.2; }
    return baseDrawGhost(x, y, size, ...rest);
  };
  drawIsland = function () {
    const out = window.__winlandOutro?.() || 0;
    if (out > 0) { // goodbye: narrower and lower, faster at the end (it slips into the edge)
      const e = out * out, w = visual.width, h = visual.height, r = visual.radius;
      visual.width = w + (18 - w) * e; visual.height = h * (1 - e); visual.radius = Math.min(r, visual.height / 2);
      try { if (visual.height > 1) baseDrawIsland(); } finally { visual.width = w; visual.height = h; visual.radius = r; }
      return;
    }
    const t = now(); let j = 0;
    for (const k of kicks) j += spring(t - k.at, k.amp, k.hz, k.damp);
    if (Math.abs(j) < 0.002) return baseDrawIsland();
    const w = visual.width, h = visual.height;
    visual.width = w * (1 + j); visual.height = h * (1 - j * 1.4); // wider = flatter, thinner = taller
    try { return baseDrawIsland(); } finally { visual.width = w; visual.height = h; }
  };
  let byeAt = null;
  window.__winlandEyes = () => {
    if (lightPreview && now() < lightPreview.until) return { color: lightPreview.color };
    const demo = now() - lightsDemoAt; if (demo >= 0 && demo < 1500) return { color: showColours()[Math.min(2, Math.floor(demo / 500))] };
    if (inLocker()) return null;
    return baseEyes?.() || null;
  };
  let waveUntil = 0, popAt = -1e9;
  const waving = () => now() < waveUntil;
  // No text during hello and bye: the animation says it all. (A space keeps the island open without showing anything.)
  window.__winlandCompactMessage = () => byeAt != null ? (now() - byeAt < BYE.off ? ' ' : '') : showAt != null && now() - showAt < HELLO.end ? ' ' : '';

  let showId = 0;
  const step = (id, ms, fn) => setTimeout(() => { if (id === showId) fn(); }, ms); // a newer show cancels the old steps
  function startHello() {
    const id = ++showId;
    showAt = now(); popAt = now() + 180; setMode('compact', false);
    kick(0.12); window.__winlandSfx?.pip('open');                                   // the island plops open: "bloop"
    step(id, HELLO.land, () => window.__winlandSfx?.pip('land'));                    // he lands: "plop"
    step(id, HELLO.hi, () => { sayHi(); feel('happy', 1100); waveUntil = now() + 1100; }); // stretches up and says "hi!"
    step(id, HELLO.tilt, () => feel('happy', 600));
    step(id, HELLO.wink, () => { feel('wink', 450); window.__winlandSfx?.pip('wink'); });
    // Back to small with a little wobble, unless you already opened the island yourself.
    step(id, HELLO.end, () => { showAt = null; if (mode === 'compact' && !(pointer.known && inside(pointer.x, pointer.y, islandBounds))) { setMode('rest', false); kick(0.07, 3); } });
  }
  let helloQueued = true;
  const startShow = setInterval(() => {
    if (!introFinished) return;
    clearInterval(startShow);
    helloQueued = false;
    if (prefs.startup) startHello();
  }, 100);
  // While Pip says hi (or bye) he stands big in the middle of the island: other messages wait (extras-ui.js).
  window.__winlandHelloBusy = () => (helloQueued && prefs.startup) || showAt != null || byeAt != null;
  window.__winlandHello = startHello; // also used by the Settings example
  // Goodbye, calm and quick: "bye-bye", the island goes small, Pip closes his eyes and the island shrinks back into the
  // top edge, then the app is gone (main.js quits after OUT.end). No moment where the island hangs around empty.
  const OUT = { eyes: 260, shrink: 300, end: 950 };
  let outAt = null;
  const baseIslandEyes = drawIslandEyes;
  drawIslandEyes = function (cx, cy, size = 1) {
    if (outAt == null) return baseIslandEyes(cx, cy, size);
    const k = Math.max(0, Math.min(1, (now() - outAt) / OUT.eyes)); if (k >= 1) return;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, Math.max(0.06, 1 - k * k)); ctx.translate(-cx, -cy); baseIslandEyes(cx, cy, size); ctx.restore();
  };
  window.__winlandIslandEyes = drawIslandEyes;
  window.__winlandOutro = () => outAt == null ? 0 : Math.max(0, Math.min(1, (now() - outAt - OUT.eyes * 0.7) / OUT.shrink));
  window.__winlandBye = () => {
    ++showId; byeAt = null; showAt = null; sayByeBye();
    const wasOpen = mode !== 'rest'; if (wasOpen) setMode('rest', false);
    outAt = now() + (wasOpen ? 320 : 120);
    setTimeout(() => window.__winlandSfx?.pip('close'), (wasOpen ? 320 : 120) + OUT.eyes); // a soft "bloop" as it closes
  };
  window.__winlandByeReset = () => { outAt = null; };
  // while the eyes close, everything else in the small island (cover, bars, time) fades with them; after that only the shape is left
  const baseSmall = drawSmall;
  drawSmall = function (...args) {
    if (outAt == null) return baseSmall.apply(this, args);
    const k = Math.max(0, Math.min(1, (now() - outAt) / OUT.eyes)); if (k >= 1) return;
    ctx.save(); ctx.globalAlpha *= 1 - k; try { return baseSmall.apply(this, args); } finally { ctx.restore(); }
  };
  window.winland?.onGoodbye?.(() => window.__winlandBye());

  // ---------- poking: click WinLand a few times and he gets angry, click a lot and he gets dizzy ----------
  let pokes = [], dizzyUntil = 0, pokeMessage = '', pokeMessageUntil = 0;
  canvas.addEventListener('click', event => {
    if (!(window.__winlandOnRobo?.(event) ?? inside(event.clientX, event.clientY, hit.ghost))) return;
    const t = now(); pokes = pokes.filter(p => t - p < 1600); pokes.push(t);
    jump(); chime('pop');
    if (pokes.length >= 6) {
      dizzyUntil = t + 2600; pokes = []; feel('dizzy', 2600); chime('error');
      pokeMessage = 'Au! Te veel tikken… even bijkomen 😵'; pokeMessageUntil = t + 2600;
      if (mode === 'rest') setMode('compact', false);
    } else if (pokes.length >= 3) { angry = 1; feel('surprised', 900); }
    else feel('surprised', 400);
  });
  setInterval(() => {
    angry = Math.max(0, angry - 0.12);                             // red anger fades away
    dizzy = now() < dizzyUntil ? 1 : Math.max(0, dizzy - 0.15);   // wobbling (drawGhost rotates with it)
  }, 100);
  const startMessage = window.__winlandCompactMessage;
  window.__winlandCompactMessage = () => (now() < pokeMessageUntil ? pokeMessage : '') || startMessage?.() || '';

  // ---------- watch Claude Code ----------
  let lastState = null, lastDetail = '', wasFocus = focus.active();
  setInterval(() => {
    const status = window.__winlandStatus?.(), state = status?.state || null;
    if (pointer.known && inside(pointer.x, pointer.y, islandBounds)) wake();
    if (state !== lastState) {
      if (state) wake();
      if (state === 'done') { chime('done'); jump(); countDone(status); if ((status.elapsed || 0) >= 300) confetti(); }
      if (state === 'question') chime('question');
      if (state === 'error') chime('error');
      lastState = state;
    }
    // You answered or allowed something from the island: a little heart.
    const detail = status?.detail || '';
    if (detail !== lastDetail && /Toegestaan|antwoord is verstuurd/.test(detail)) { feel('heart', 1400); chime('pop'); bump('helper', 10, 'helper'); }
    lastDetail = detail;
    if (wasFocus && !focus.active()) {
      say('Focus klaar!', `${clock(focusLength)} gefocust. Neem even pauze.`); chime('party'); confetti(); jump(); feel('happy', 2000);
      logFocus(focusLength);
      bump('focus', 5, 'focus'); feed(10);
      window.__winlandSettleSize?.();
    }
    wasFocus = focus.active();
    warnLimit();
  }, 300);

  function warnLimit() {
    const usage = window.__winlandMonitor?.state()?.providers?.find(p => p.provider === 'claudecode')?.usage?.fiveHour;
    if (!usage || !prefs.warnAt) return;
    const level = usage.used >= 95 ? 95 : usage.used >= prefs.warnAt ? prefs.warnAt : 0;
    const key = `${usage.resetsAt || 'x'}:${level}`;
    if (!level || store.get('winland:limit-warned', '') === key) return;
    store.set('winland:limit-warned', key);
    const at = usage.resetsAt ? new Date(usage.resetsAt * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '';
    say(`Je hebt ${usage.used}% van je Claude-limiet gebruikt`, at ? `Om ${at} is hij weer vol.` : 'Doe het even rustig aan.');
    chime('warn'); feel('surprised', 1500);
  }

  // ---------- random life: blinking and the odd wink ----------
  let nextBlink = now() + 2500;
  function idleLife(t, mood) {
    if (!prefs.blink || mood) return mood;
    if (t > nextBlink) {
      if (t > nextBlink + 140) nextBlink = t + 2500 + Math.random() * 3500;
      else return Math.random() < 0.004 ? 'wink' : 'blink';
    }
    return null;
  }

  let danceDemoUntil = 0;
  // ---------- what drawGhost asks for ----------
  const MOODS = { running: 'focus', sending: 'focus', question: 'curious', done: 'happy' }; // never a lasting sad face: an error shows in the eyes' colour
  function fx() {
    const t = now(), status = window.__winlandStatus?.();
    let dy = 0, tilt = 0, scale = 1;
    let mood = prefs.faces && !inLocker() ? (status?.permission ? 'surprised' : MOODS[status?.state] || null) : null;
    if (feeling && t < feelingUntil) mood = feeling;
    const hop = (t - bounceAt) / 700;
    if (hop >= 0 && hop < 1) { dy -= Math.abs(Math.sin(hop * Math.PI)) * 11 * (1 - hop * 0.5); scale = 1 + Math.sin(hop * Math.PI) * 0.06; }
    else if ((prefs.dance && spotifyState.is_playing && window.__winlandHearing || now() < danceDemoUntil) && !mood) { // dance to the music: every song gets its own move
      const id = spotifyState.track?.id || spotifyState.track?.name || '';
      const move = [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 4;
      if (move === 0) { dy -= Math.abs(Math.sin(t / 250)) * 3; tilt = Math.sin(t / 500) * 0.07; } // bob
      if (move === 1) { tilt = Math.sin(t / 380) * 0.16; dy -= Math.abs(Math.sin(t / 380)) * 1.5; } // sway
      if (move === 2) { dy -= Math.abs(Math.sin(t / 180)) * 4; scale = 1 + Math.abs(Math.sin(t / 180)) * 0.04; } // jump
      if (move === 3) { tilt = Math.sin(t / 120) * 0.08; dy -= Math.abs(Math.sin(t / 240)) * 2; } // wiggle
    }
    if (mood === 'sad') dy += 2;
    if (!mood && asleep()) { mood = 'sleep'; dy += Math.sin(t / 900) * 1.5; }
    mood = idleLife(t, mood);
    // Hello: pop in with a little overshoot. Goodbye: shrink away after waving.
    const pop = (t - popAt) / 420;
    if (pop >= 0 && pop < 1) scale *= 1 + 2.70158 * Math.pow(pop - 1, 3) + 1.70158 * Math.pow(pop - 1, 2); // ease-out-back: 0 → overshoot → 1
    let sx = 1, sy = 1; // squash & stretch
    if (showAt != null) {
      const k = t - showAt;
      if (k < 180) scale = 0;                                                       // not there yet: the island opens first
      const land = spring(k - HELLO.land, 0.3, 3.2, 7);                             // lands: squashed flat, then wobbles
      const hi = spring(k - HELLO.hi, -0.22, 3, 6);                                 // "hi!": stretches up tall
      sx += land + hi; sy -= land + hi;
      const hop = (k - HELLO.hi) / 450; if (hop > 0 && hop < 1) dy -= Math.sin(hop * Math.PI) * 7;
      const hehe = (k - HELLO.tilt) / 600; if (hehe > 0 && hehe < 1) tilt += Math.sin(hehe * Math.PI * 2) * 0.22 * (1 - hehe); // cute head tilt left-right
    }
    if (byeAt != null) {
      const k = t - byeAt, pre = (k - (BYE.squash - 250)) / 250, zip = (k - BYE.squash) / 230;
      if (pre > 0 && pre < 1) { sx *= 1 + 0.25 * pre; sy *= 1 - 0.25 * pre; dy += 3 * pre; } // ducks down (getting ready)
      if (zip > 0) { const z = Math.min(1, zip); scale *= Math.max(0, 1 - z * z); sx *= 1 - 0.35 * z; sy *= 1 + 0.5 * z; dy -= 4 * z; } // zips away
    }
    // Leaning into the walk while carrying the basket.
    const b = window.__winlandBasket?.(); if (b?.show) tilt += Math.max(-0.25, Math.min(0.25, b.vx * 0.03));
    return { dy, tilt, scale, sx, sy, mood };
  }
  window.__winlandGhostFx = fx;
  window.__winlandGhostDecor = () => {}; // Pip has no decorations (pip-ui.js draws him)

  // ---------- Settings: make WinLand yours ----------
  const style = document.createElement('style');
  style.textContent = `
#winland-settings-v2 .tc-group{margin:14px 2px 6px;color:#c6e994;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
#winland-settings-v2 .tc-chips{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;max-width:62%}
#winland-settings-v2 .tc-chip{border:0;border-radius:12px;padding:6px 10px;background:#262e23;color:#dfe7da;font-size:10px}
#winland-settings-v2 .tc-chip.on{background:#c6e994;color:#11180d;font-weight:700}
#winland-settings-v2 .tc-swatch{width:22px;height:22px;border-radius:50%;border:2px solid transparent;padding:0}
#winland-settings-v2 .tc-swatch.on{border-color:#fff;box-shadow:0 0 0 2px #c6e994}
#winland-settings-v2 .tc-lights{flex-direction:column;align-items:stretch !important;gap:8px}
#winland-settings-v2 .tc-lights-head{display:flex;flex-direction:column;gap:8px}
#winland-settings-v2 .tc-lights-head .tc-chips,#winland-settings-v2 .tc-light-line .tc-chips{justify-content:flex-start;max-width:none}
#winland-settings-v2 .tc-light-line{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.03)}
#winland-settings-v2 .tc-light-line > span{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;color:#dfe7da;white-space:nowrap}
#winland-settings-v2 .tc-light-line > span i{width:10px;height:10px;border-radius:50%;display:block}
#winland-settings-v2 .tc-light-line .tc-swatch{width:20px;height:20px}
#winland-settings-v2 .tc-tests{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0 4px}
#winland-settings-v2 .tc-tests .tc-chip{padding:9px 8px;font-size:11px;border-radius:11px}
#winland-settings-v2 .tc-name{width:140px;font-size:12px;font-weight:600}
#winland-settings-v2 .tc-step{display:flex;align-items:center;gap:6px}
#winland-settings-v2 .tc-step b{min-width:46px;text-align:center;font-size:12px}
#winland-settings-v2 .tc-input{width:170px;border:1px solid #4b5943;border-radius:10px;padding:6px 9px;background:#1b2219;color:#f0f5ed;font-size:10px;user-select:text}
#winland-settings-v2 .tc-preview{display:inline-flex;gap:3px;margin-right:6px;vertical-align:middle}
#winland-settings-v2 .tc-preview i{width:5px;height:8px;border-radius:50%;display:block}`;
  document.head.appendChild(style);

  const esc = s => String(s).replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
  // A settings block. With a demo name, clicking anywhere on the block shows it on WinLand in the locker.
  const row = (title, help, control, demo = '') => `<div class="tc-setting-row${demo ? ' tc-demo' : ''}"${demo ? ` data-demo="${demo}"` : ''}><div><strong>${title}</strong><small>${help}</small></div>${control}</div>`;
  const chips = (key, options) => `<div class="tc-chips">${options.map(([value, label, locked]) =>
    `<button type="button" class="tc-chip ${prefs[key] === value ? 'on' : ''}" data-pref="${key}" data-value="${esc(value)}" ${locked ? 'disabled title="Nog niet verdiend"' : ''}>${locked ? '🔒 ' : ''}${label}</button>`).join('')}</div>`;
  const toggle = key => `<button type="button" class="tc-toggle ${prefs[key] ? 'on' : ''}" data-pref="${key}" data-toggle="1" aria-pressed="${prefs[key]}">${prefs[key] ? 'Aan' : 'Uit'}</button>`;
  const swatches = (key, colours) => `<div class="tc-chips">${Object.entries(colours).map(([name, c]) =>
    `<button type="button" class="tc-swatch ${prefs[key] === name ? 'on' : ''}" style="background:${Array.isArray(c) ? `linear-gradient(135deg,${c[0]},${c[1]})` : c}" data-pref="${key}" data-value="${name}" title="${name}" aria-label="${name}"></button>`).join('')}</div>`;
  const preview = p => `<span class="tc-preview">${[p.busy, p.done, p.error].map(c => `<i style="background:${c};box-shadow:0 0 6px ${c}"></i>`).join('')}</span>`;

  // Traffic-light eyes: pick your own colour for every state (plus three quick presets).
  const LIGHT_OPTIONS = {
    lightBusy: ['#ff9a1f', '#ffb000', '#ffd23f', '#ff6b9d', '#c9a7ff', '#8fd3ff'],
    lightDone: ['#22e05a', '#8ef0a8', '#c6e994', '#2ee6d6', '#3d9bff', '#ffffff'],
    lightError: ['#ff3b3b', '#ff8a8a', '#e11d48', '#ff6b00', '#ff5ac8', '#b04bff']
  };
  const LIGHT_PRESETS = { klassiek: ['#ff9a1f', '#22e05a', '#ff3b3b', 'Klassiek'], zacht: ['#ffc27a', '#8ef0a8', '#ff8a8a', 'Zacht'], kleurenblind: ['#ffb000', '#3d9bff', '#ff5ac8', 'Kleurenblind'] };
  const lightsBlock = () => `<div class="tc-setting-row tc-demo tc-lights" data-demo="lights"><div class="tc-lights-head"><div><strong>Stoplicht-ogen</strong><small>Kies zelf de kleur voor elke stand. Klik het blokje voor een test.</small></div>
    <div class="tc-chips">${Object.entries(LIGHT_PRESETS).map(([k, [b, d, e, label]]) => `<button type="button" class="tc-chip ${prefs.lightBusy === b && prefs.lightDone === d && prefs.lightError === e ? 'on' : ''}" data-lightpreset="${k}">${preview({ busy: b, done: d, error: e })}${label}</button>`).join('')}</div></div>
    ${[['lightBusy', 'Bezig of een vraag'], ['lightDone', 'Klaar'], ['lightError', 'Fout']].map(([key, label]) => `<div class="tc-light-line"><span><i style="background:${prefs[key]};box-shadow:0 0 8px ${prefs[key]}"></i>${label}</span><div class="tc-chips">${LIGHT_OPTIONS[key].map(c => `<button type="button" class="tc-swatch ${prefs[key] === c ? 'on' : ''}" style="background:${c}" data-pref="${key}" data-value="${c}" aria-label="${label}: ${c}"></button>`).join('')}</div></div>`).join('')}</div>`;
  const MOOD_DEMO = [['happy', '😊 Blij'], ['heart', '😍 Verliefd'], ['surprised', '😮 Verrast'], ['curious', '🤔 Nieuwsgierig'], ['focus', '🧐 Gefocust'], ['wink', '😉 Knipoog'], ['sad', '😢 Verdrietig'], ['dizzy', '😵 Duizelig'], ['sleep', '😴 Slaperig']];
  // Settings → Karakter (the locker): everything about how WinLand looks and behaves.
  window.__winlandSettingsCharacter = (sleepRow = '') => [
    '<div class="tc-group" data-icon="🏷️" style="--g:#5ad1c4">Naam</div>',
    row('Hoe heet hij?', 'Hij zegt het als hij hoi zegt', `<div class="tc-step"><input class="tc-input tc-name" id="tc-in-petname" maxlength="18" placeholder="Pip" value="${esc(prefs.name || '')}"><button type="button" class="tc-chip on" data-setname="1">Opslaan</button></div>`),
    '<div class="tc-group" data-icon="🎨" style="--g:#ff86c2">Uiterlijk</div>',
    lightsBlock(),
    '<div class="tc-group" data-icon="🤖" style="--g:#7fb2ff">Gedrag · klik een blokje voor een voorbeeld</div>',
    row('Gezichtjes', 'Blij, verdrietig, nieuwsgierig, gefocust', toggle('faces'), 'faces'),
    row('Emoties bekijken', 'Klik er een aan om het te zien', `<div class="tc-chips">${MOOD_DEMO.map(([m, label]) => `<button type="button" class="tc-chip" data-mood="${m}">${label}</button>`).join('')}</div>`),
    row('Knipperen', 'Hij knippert af en toe met zijn ogen', toggle('blink'), 'blink'),
    row('Dansen op muziek', 'Meebewegen als er muziek speelt', toggle('dance'), 'dance'),
    sleepRow,
    row('In slaap vallen na', 'Als er niks gebeurt (Slaapeffect moet aan staan)', chips('sleepMin', [[5, '5 min'], [10, '10 min'], [30, '30 min']]), 'sleep'),
    row('Opstartanimatie', 'Zwaaien en "hoi" zeggen bij het opstarten', toggle('startup'), 'hello'),
  ].join('');
  // What the settings app shows next to the big Pip.
  window.__winlandLocker = () => ({ name: petName(), done: doneCount });

  // Settings → Algemeen: the island itself.
  const TESTS = [['hello', '👋 Opstarten'], ['bye', '😴 Afsluiten'], ['busy', '🟠 Claude bezig'], ['question', '❓ Claude vraagt'],
    ['done', '🟢 Claude klaar'], ['error', '🔴 Claude fout'], ['music', '🎵 Nep-muziek'], ['focus', '⏱️ Focus 1 min'], ['clear', '🧹 Alles stoppen']];
  window.__winlandSettingsExtra = () => [
    '<div class="tc-group" data-icon="🧭" style="--g:#5ad1c4">Profiel</div>',
    row('Profiel', PROFILE_HELP[prefs.profile] || PROFILE_HELP.custom, chips('profile', [['custom', 'Eigen keuze'], ['office', 'Kantoor'], ['dev', 'Programmeren'], ['gaming', 'Gamen'], ['music', 'Muziekproductie']])),
    '<div class="tc-group" data-icon="🌍" style="--g:#7fb2ff">Taal</div>',
    row('Taal · Language', 'De taal van de island', chips('lang', [['fr', 'Français'], ['en', 'English']])),
    '<div class="tc-group" data-icon="🌓" style="--g:#c9a7ff">Thema</div>',
    row('Thema', 'Donker of licht, voor de island en de instellingen', chips('theme', [['dark', 'Donker'], ['light', 'Licht']])),
    '<div class="tc-group" data-icon="🧪" style="--g:#b98cff">Testen</div>',
    row('Testmodus', 'Knoppen om alles te bekijken zonder echte Claude of muziek', toggle('testMode')),
    prefs.testMode ? `<div class="tc-tests">${TESTS.map(([k, label]) => `<button type="button" class="tc-chip" data-test="${k}">${label}</button>`).join('')}</div>` : '',
    '<div class="tc-group" data-icon="✨" style="--g:#ffb35c">Animaties</div>',
    row('Snelheid', 'Hoe snel de island opent, sluit en reageert', chips('speed', [['snel', 'Snel'], ['normaal', 'Normaal']])),
    row('App-animaties', 'Pip doet een kunstje als je een app opent', toggle('appAnim')),
    row('Confetti', 'Bij lange taken en als een focus klaar is', toggle('confetti'), 'confetti'),
    '<div class="tc-group" data-icon="🔔" style="--g:#ff6b6b">Focus &amp; meldingen</div>',
    row('Stoplicht-geluiden', 'Ding bij klaar, pling bij een vraag, laag bij fout', toggle('chimes'), 'chimes'),
    row('Windows-meldingen', 'Melding bij klaar, vraag, focus en limiet', toggle('notify')),
    row('Waarschuw bij limiet', 'Melding als je zoveel van je 5-uurslimiet gebruikt hebt', chips('warnAt', [[70, '70%'], [80, '80%'], [90, '90%'], [0, 'Nooit']])),
    row('Geluidspakket', 'Hoe de stoplicht-geluiden klinken (klik om te horen)', chips('pack', Object.entries(PACKS).map(([k, p]) => [k, p.label]))),
    '<div class="tc-group" data-icon="🏝️" style="--g:#c6e994">Island</div>',
    row('Melden als een dev-programma klaar is', 'bun, node, python, cargo, dotnet… dat langer dan 10 seconden liep (pagina Dev)', toggle('devWatch')),
    row('Verstoppen achter grote vensters', 'Bij een gemaximaliseerd of volledig scherm venster komt de island pas tevoorschijn als je de muis naar boven beweegt', toggle('autoHide')),
    row('Discreet in een game', 'Verstopt de island helemaal en zet geluiden en meldingen uit zolang een game het scherm vult', toggle('quietFullscreen')),
    row('Volumebalk', 'Laat het volume zien in de island als je het verandert', toggle('volumeHud')),
    row('Microfoon en camera', 'Een stipje op de island zolang een app je microfoon (oranje) of camera (groen) gebruikt', toggle('privacyDot')),
    row('Schermafbeeldingen in de lade', 'Een nieuwe schermafbeelding (Win+Shift+S) komt meteen in je lade, klaar om te slepen', toggle('shotsToTray')),
    row('Downloads', 'Een melding en het bestand in je lade zodra een download klaar is', toggle('downloadsLive')),
    row('Opladen', 'Het percentage als je de lader in- of uitplugt', toggle('chargeLive')),
    row('Pauzeherinnering', 'Een seintje als je zo lang aan het gamen bent', chips('breakEvery', [[0, 'Uit'], [60, '1 uur'], [90, '1,5 uur'], [120, '2 uur']])),
    row('Melding bij oversturing', 'Waarschuwt als het geluid van je pc in het rood gaat, ook in je DAW (pagina Studio)', toggle('clipWarn')),
    row('Batterij-waarschuwing', 'Laptop en Bluetooth (koptelefoon, muis) bijna leeg', toggle('batteryWarn')),
    `<div class="tc-setting-row"><div><strong>Alles terugzetten</strong><small>Zet al deze keuzes terug naar standaard</small></div><button type="button" class="tc-toggle" data-pref="reset">Herstel</button></div>`,
    '<div class="tc-group" data-icon="⏻" style="--g:#ff8a8a">WinLand</div>',
    row('Starten met Windows', 'WinLand start vanzelf als je je pc aanzet', `<button type="button" class="tc-toggle ${loginOn ? 'on' : ''}" data-login="1" aria-pressed="${loginOn}">${loginOn ? 'Aan' : 'Uit'}</button>`),
    row('Opnieuw starten', 'Sluit WinLand en start hem meteen opnieuw', '<button type="button" class="tc-chip" data-restart="1">Herstart</button>'),
    row('Afsluiten', 'Sluit WinLand helemaal af. Kan ook via Pip rechtsonder bij de klok.', '<button type="button" class="tc-chip" data-quit="1">Afsluiten</button>')
  ].join('');

  // Settings: click a block and WinLand shows what it does (in the locker).
  const later = (ms, fn) => setTimeout(fn, ms);
  const DEMOS = {
    look: () => { jump(); feel('happy', 900); chime('pop'); },
    lights: () => { lightsDemoAt = now(); chime('pop'); },
    faces: () => [['happy', 0], ['curious', 750], ['surprised', 1500], ['sad', 2250], ['heart', 3000]].forEach(([m, ms]) => later(ms, () => feel(m, 760))),
    blink: () => [0, 450, 900].forEach(ms => later(ms, () => feel('blink', 160))),
    dance: () => { danceDemoUntil = now() + 3200; },
    sleep: () => { feel('sleep', 3200); chime('pop'); },
    hello: () => { sayHi(); jump(); feel('happy', 1300); waveUntil = now() + 1300; },
    confetti: () => { confetti(30); jump(); feel('happy', 900); },
    chimes: () => chime('done')
  };
  window.__winlandDemo = name => { if (drafting) previewDemo(name); else DEMOS[name]?.(); };
  // ---------- test mode: see every state without a real Claude Code session or music ----------
  let fakeMusicUntil = 0;
  function fakeMusic() {
    const realRefresh = window.__winlandRealRefresh || refreshSpotify;
    window.__winlandRealRefresh = realRefresh;
    refreshSpotify = async () => {}; // the real Spotify check would replace the fake song
    const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 200, 200); gr.addColorStop(0, '#ff5ac8'); gr.addColorStop(1, '#3d1a8e'); g.fillStyle = gr; g.fillRect(0, 0, 200, 200);
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(100, 100, 46, 0, Math.PI * 2); g.fill();
    albumImage = new Image(); albumImage.src = c.toDataURL(); window.__winlandAlbumColour = '#ff5ac8';
    spotifyConnected = true; spotifyState = { is_playing: true, progress_ms: 0, duration_ms: 210000, track: { name: 'Testnummer', artist: 'WinLand', id: 'test' } }; spotifySyncAt = performance.now();
    fakeMusicUntil = now() + 30000; window.__winlandSettleSize?.();
    setTimeout(() => { if (now() >= fakeMusicUntil) stopFakeMusic(); }, 30100);
  }
  function stopFakeMusic() {
    fakeMusicUntil = 0;
    if (window.__winlandRealRefresh) { refreshSpotify = window.__winlandRealRefresh; window.__winlandRealRefresh = null; }
    spotifyState = { is_playing: false, track: null }; albumImage = null; window.__winlandAlbumColour = null; refreshSpotify(); window.__winlandSettleSize?.();
  }
  function runTest(kind) {
    const claude = k => window.winland?.aiMonitorHooksTest?.(k).then(() => window.__winlandMonitor?.refresh()).catch(() => {});
    if (kind === 'hello') startHello();
    else if (kind === 'bye') { window.__winlandBye(); setTimeout(() => { window.__winlandByeReset(); jump(); feel('happy', 900); }, 1600); } // a test: he comes back
    else if (kind === 'music') fakeMusic();
    else if (kind === 'focus') focus.start(60);
    else if (kind === 'clear') { claude('clear'); if (fakeMusicUntil) stopFakeMusic(); if (focus.active()) focus.stop(); }
    else if (kind === 'hungry') { food = { value: 12, at: Date.now() }; store.set('winland:food', food); } // hungry right away: the next finished task feeds him
    else claude(kind);
  }
  window.__winlandTest = runTest; // the same test scenes from the console (or a video recording)
  const rerender = () => window.dispatchEvent(new Event('winland:open-ai-settings'));
  // Start with Windows lives in the main process (tray-main.cjs).
  let loginOn = false;
  window.winland?.loginGet?.().then(r => { if (r?.ok) loginOn = r.on; }).catch(() => {});
  window.__winlandSettingsAction = target => {
    if (target.dataset.quit) { window.winland?.close?.(); return true; }
    if (target.dataset.restart) { window.winland?.restart?.(); return true; }
    if (target.dataset.login) { window.winland?.loginSet?.(!loginOn).then(r => { if (r?.ok) loginOn = r.on; rerender(); }).catch(() => {}); return true; }
    if (target.dataset.mood) { feel(target.dataset.mood, 2600); jump(); return true; } // emotion preview in the locker
    if (target.dataset.test) { runTest(target.dataset.test); return true; }
    if (target.dataset.setname) {
      prefs.name = (document.getElementById('tc-in-petname')?.value || '').trim().slice(0, 18) || 'Pip'; save();
      jump(); feel('heart', 1400); chime('pop'); return true;
    }
    if (target.dataset.lightpreset) {
      const [b, d, e] = LIGHT_PRESETS[target.dataset.lightpreset]; Object.assign(prefs, { lightBusy: b, lightDone: d, lightError: e }); save();
      if (!drafting) lightsDemoAt = now(); return true;
    }
    const key = target.dataset.pref; if (!key) return false;
    if (key === 'reset') Object.assign(prefs, DEFAULTS);
    else if (target.dataset.toggle) prefs[key] = !prefs[key];
    else if (target.dataset.step) prefs[key] = Math.min(120, Math.max(5, prefs[key] + Number(target.dataset.step)));
    else { const raw = target.dataset.value; prefs[key] = typeof DEFAULTS[key] === 'number' ? Number(raw) : raw; }
    if (key === 'profile' && PROFILES[prefs.profile]) Object.assign(prefs, PROFILES[prefs.profile].prefs); // its switches flip right away
    save();
    if (key === 'palette') { jump(); feel('happy', 700); }
    if (key === 'pack') chime('done');
    if (/^light(Busy|Done|Error)$/.test(key) && !drafting) lightPreview = { color: prefs[key], until: now() + 1400 }; // show the new colour on his eyes
    return true;
  };

  // ---------- WinLand Instellingen: drafts and the app's own Pip (settings-bridge-ui.js, buddy-ui.js) ----------
  let previewing = false;
  const later2 = (ms, fn) => setTimeout(fn, ms);
  const pFeel = (mood, ms) => { pv.feeling = mood; pv.feelingUntil = now() + ms; };
  // The examples in the settings list, played by the app's Pip only.
  function previewDemo(name) {
    const hop = () => { pv.bounceAt = now(); };
    ({
      look: () => { hop(); pFeel('happy', 900); },
      lights: () => { hop(); pFeel('happy', 700); },
      faces: () => [['happy', 0], ['curious', 750], ['surprised', 1500], ['sad', 2250], ['heart', 3000]].forEach(([m, ms]) => later2(ms, () => pFeel(m, 760))),
      blink: () => [0, 450, 900].forEach(ms => later2(ms, () => pFeel('blink', 160))),
      dance: () => { pv.danceUntil = now() + 3200; },
      sleep: () => pFeel('sleep', 3200),
      hello: () => { hop(); pFeel('happy', 1300); pv.waveUntil = now() + 1300; },
      confetti: () => { hop(); pFeel('happy', 900); },
      chimes: () => { chime('done'); pFeel('happy', 700); }
    })[name]?.();
  }
  window.__winlandPreviewPrefs = p => { pv.prefs = p ? { ...p } : null; };
  window.__winlandRealPrefs = () => ({ ...prefs });
  // Run a click from the settings app on a draft: prefs become the draft for this moment, nothing is saved,
  // feelings go to the app's Pip, and afterwards the real prefs are back.
  window.__winlandWithDraft = (draft, fn) => {
    const real = { ...prefs };
    for (const k of Object.keys(prefs)) delete prefs[k];
    Object.assign(prefs, draft); drafting = true;
    try { return fn(); }
    finally {
      const out = { ...prefs };
      for (const k of Object.keys(prefs)) delete prefs[k];
      Object.assign(prefs, real); drafting = false;
      for (const k of Object.keys(draft)) delete draft[k];
      Object.assign(draft, out);
    }
  };
  // Save: the draft becomes the real thing, and the real Pip is happy with it.
  window.__winlandSaveDraft = draft => { Object.assign(prefs, draft); save(); jump(); feel('happy', 1400); chime('pop'); };
  // Draw the app's Pip: for this one drawing everything he reads comes from the preview, then the real
  // Pip's state is put back. So a test timer, Claude or music never shows on him, and nothing leaks out.
  window.__winlandDrawPreview = draw => {
    const keep = { prefs: { ...prefs }, feeling, feelingUntil, bounceAt, danceDemoUntil, waveUntil, showAt, byeAt, popAt, nextBlink, lastWake,
      spotify: spotifyState, angry: typeof angry === 'number' ? angry : 0, dizzy: typeof dizzy === 'number' ? dizzy : 0, basket: window.__winlandBasket, locker: window.__winlandLockerDraw };
    if (pv.prefs) Object.assign(prefs, pv.prefs);
    feeling = pv.feeling; feelingUntil = pv.feelingUntil; bounceAt = pv.bounceAt; danceDemoUntil = pv.danceUntil;
    waveUntil = pv.waveUntil; showAt = null; byeAt = null; popAt = -1e9; nextBlink = pv.nextBlink || now() + 2000; lastWake = Date.now();
    spotifyState = { is_playing: false, track: null }; angry = 0; dizzy = 0; window.__winlandBasket = null; window.__winlandLockerDraw = true;
    previewing = true;
    try { draw(); }
    finally {
      previewing = false; pv.nextBlink = nextBlink;
      for (const k of Object.keys(prefs)) delete prefs[k];
      Object.assign(prefs, keep.prefs);
      ({ feeling, feelingUntil, bounceAt, danceDemoUntil, waveUntil, showAt, byeAt, popAt, nextBlink, lastWake } = keep);
      spotifyState = keep.spotify; angry = keep.angry; dizzy = keep.dizzy; window.__winlandBasket = keep.basket; window.__winlandLockerDraw = keep.locker;
    }
  };
})();
