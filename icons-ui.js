'use strict';
// One icon style everywhere: white lines with black inside (like the home icon).
// Also: the header's sound button opens a volume bar, with a tiny WinLand as the knob.
(function iconsAndVolume() {
  const LINE = '#e8eee4';
  // Icons are drawn on a 24×24 grid.
  const ICONS = {
    home(c) { c.beginPath(); c.moveTo(4, 11); c.lineTo(12, 4); c.lineTo(20, 11); c.lineTo(20, 20); c.lineTo(4, 20); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.roundRect(10, 14, 4, 6, 1); c.stroke(); },
    chat(c) { c.beginPath(); c.roundRect(3.5, 5, 17, 12, 5); c.fill(); c.stroke(); c.beginPath(); c.moveTo(8, 17); c.lineTo(7, 20.5); c.lineTo(11.5, 17); c.stroke(); }, // Pip's chat
    plus(c) { c.beginPath(); c.roundRect(4, 4, 16, 16, 5); c.fill(); c.stroke(); c.beginPath(); c.moveTo(12, 8.5); c.lineTo(12, 15.5); c.moveTo(8.5, 12); c.lineTo(15.5, 12); c.stroke(); },
    gear(c) {
      c.beginPath();
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 7 : 9; c.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r); }
      c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.arc(12, 12, 3, 0, Math.PI * 2); c.stroke();
    },
    speaker(c, level = 1) {
      c.beginPath(); c.moveTo(4, 9.5); c.lineTo(8, 9.5); c.lineTo(12.5, 5.5); c.lineTo(12.5, 18.5); c.lineTo(8, 14.5); c.lineTo(4, 14.5); c.closePath(); c.fill(); c.stroke();
      if (level <= 0) { c.beginPath(); c.moveTo(16, 9.5); c.lineTo(21, 14.5); c.moveTo(21, 9.5); c.lineTo(16, 14.5); c.stroke(); return; }
      c.beginPath(); c.arc(13, 12, 4, -0.9, 0.9); c.stroke();
      if (level > 0.5) { c.beginPath(); c.arc(13, 12, 7.5, -0.9, 0.9); c.stroke(); }
    },
    music(c) { c.beginPath(); c.moveTo(9, 17); c.lineTo(9, 6); c.lineTo(19, 4); c.lineTo(19, 15); c.stroke();
      c.beginPath(); c.ellipse(6.5, 17, 3, 2.4, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.ellipse(16.5, 15, 3, 2.4, 0, 0, Math.PI * 2); c.fill(); c.stroke(); },
    camera(c) { c.beginPath(); c.roundRect(3, 7, 13, 10, 3); c.fill(); c.stroke(); c.beginPath(); c.moveTo(16, 11); c.lineTo(21, 8); c.lineTo(21, 16); c.lineTo(16, 13); c.closePath(); c.fill(); c.stroke(); },
    system(c) { c.beginPath(); c.roundRect(5, 5, 14, 14, 3); c.fill(); c.stroke(); c.beginPath(); for (const v of [9, 12, 15]) { c.moveTo(v, 2.5); c.lineTo(v, 5); c.moveTo(v, 19); c.lineTo(v, 21.5); c.moveTo(2.5, v); c.lineTo(5, v); c.moveTo(19, v); c.lineTo(21.5, v); } c.stroke(); c.beginPath(); c.roundRect(9, 9, 6, 6, 1); c.stroke(); },
    software(c) { for (const [x, y] of [[4, 4], [13, 4], [4, 13], [13, 13]]) { c.beginPath(); c.roundRect(x, y, 7, 7, 2); c.fill(); c.stroke(); } },
    bolt(c) { c.beginPath(); c.moveTo(13, 3); c.lineTo(5, 13.5); c.lineTo(11.5, 13.5); c.lineTo(10.5, 21); c.lineTo(19, 10.5); c.lineTo(12.5, 10.5); c.closePath(); c.fill(); c.stroke(); },
    phone(c) { c.beginPath(); c.roundRect(7, 3, 10, 18, 3); c.fill(); c.stroke(); c.beginPath(); c.moveTo(11, 18); c.lineTo(13, 18); c.stroke(); },
    chart(c) { c.beginPath(); c.roundRect(4, 12, 4, 8, 1.5); c.roundRect(10, 7, 4, 13, 1.5); c.roundRect(16, 4, 4, 16, 1.5); c.fill(); c.stroke(); },
    studio(c) { c.beginPath(); c.moveTo(8, 21); c.lineTo(10.5, 4); c.lineTo(13.5, 4); c.lineTo(16, 21); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(12, 17); c.lineTo(17.5, 7); c.stroke(); },
    controls(c) { c.beginPath(); c.roundRect(3, 5, 18, 14, 3); c.fill(); c.stroke(); c.beginPath(); c.moveTo(7, 9); c.lineTo(17, 9); c.moveTo(7, 15); c.lineTo(17, 15); c.stroke(); c.beginPath(); c.arc(10, 9, 1.8, 0, Math.PI * 2); c.arc(15, 15, 1.8, 0, Math.PI * 2); c.fill(); c.stroke(); },
    code(c) { c.beginPath(); c.roundRect(3, 5, 18, 14, 3); c.fill(); c.stroke(); c.beginPath(); c.moveTo(9.5, 9); c.lineTo(6.5, 12); c.lineTo(9.5, 15); c.moveTo(14.5, 9); c.lineTo(17.5, 12); c.lineTo(14.5, 15); c.moveTo(13, 8.5); c.lineTo(11, 15.5); c.stroke(); },
    terminal(c) { c.beginPath(); c.roundRect(3, 5, 18, 14, 3); c.fill(); c.stroke(); c.beginPath(); c.moveTo(7, 10); c.lineTo(10, 12.5); c.lineTo(7, 15); c.moveTo(12, 15); c.lineTo(16, 15); c.stroke(); },
    timer(c) { c.beginPath(); c.arc(12, 13, 7.5, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.moveTo(12, 13); c.lineTo(12, 9); c.moveTo(12, 13); c.lineTo(15, 14.5); c.moveTo(10, 3.5); c.lineTo(14, 3.5); c.stroke(); },
    copy(c) { c.beginPath(); c.roundRect(8, 7, 11, 13, 3); c.fill(); c.stroke(); c.beginPath(); c.moveTo(15, 4.5); c.lineTo(7.5, 4.5); c.quadraticCurveTo(5, 4.5, 5, 7); c.lineTo(5, 16); c.stroke(); },
    note(c) { c.beginPath(); c.moveTo(6, 4); c.lineTo(15, 4); c.lineTo(19, 8); c.lineTo(19, 20); c.lineTo(6, 20); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(9, 11); c.lineTo(16, 11); c.moveTo(9, 15); c.lineTo(14, 15); c.stroke(); },
    clock(c) { c.beginPath(); c.arc(12, 12, 8.5, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.moveTo(12, 7.5); c.lineTo(12, 12); c.lineTo(15, 14); c.stroke(); },
    collapse(c) { c.beginPath(); c.arc(12, 12, 8.5, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.moveTo(8, 13.5); c.lineTo(12, 9.5); c.lineTo(16, 13.5); c.stroke(); },
    tray(c) { c.beginPath(); c.moveTo(4, 13); c.lineTo(7, 5); c.lineTo(17, 5); c.lineTo(20, 13); c.lineTo(20, 19); c.lineTo(4, 19); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(4, 13); c.lineTo(9, 13); c.lineTo(10, 15); c.lineTo(14, 15); c.lineTo(15, 13); c.lineTo(20, 13); c.stroke(); }
  };
  // Old glyphs used by pill(...) calls → icon names.
  const GLYPHS = { '♫': 'music', '›_': 'terminal', '◔': 'timer', '📥': 'tray', '⚙': 'gear', '⌂': 'home', '+': 'plus' };
  function icon(name, x, y, size = 18, colour = LINE, arg, fill = '#000') {
    const draw = ICONS[name]; if (!draw) return false;
    ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 24, size / 24);
    ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = colour; ctx.fillStyle = fill;
    draw(ctx, arg); ctx.restore(); return true;
  }
  window.__winlandIcon = icon;

  // ---- pills: same box, but a line icon instead of a text glyph ----
  pill = function (x, y, width, glyph, label, key) {
    const bounds = { x, y, width, height: 34 }, over = inside(pointer.x, pointer.y, bounds);
    box(x, y, width, 34, 17, over ? '#1d221d' : '#121512');
    ctx.save(); ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, width - 1, 33, 16.5); ctx.strokeStyle = over ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    if (!icon(GLYPHS[glyph] || glyph, x + 19, y + 17, 17)) text(glyph, x + 19, y + 22, 12, LINE, 600, 'center');
    text(label, x + 36, y + 21, 11, '#e8eee4', 600, 'left', width - 44);
    hit[key] = bounds;
  };

  // ---- volume: 0 = silent, 1 = loud (replaces the on/off sound toggle) ----
  const read = () => { try { const v = Number(localStorage.getItem('winland:volume')); return Number.isFinite(v) && localStorage.getItem('winland:volume') !== null ? v : soundEnabled ? 0.7 : 0; } catch { return 0.7; } };
  let volume = read();
  const setVolume = v => {
    volume = Math.max(0, Math.min(1, Math.round(v * 20) / 20));
    soundEnabled = volume > 0;
    try { localStorage.setItem('winland:volume', String(volume)); localStorage.setItem('winland:sound', soundEnabled ? 'on' : 'off'); } catch {}
  };
  setVolume(volume);
  window.__winlandVolume = () => volume;
  // Never two open/close sounds on top of each other (that sounded like a glitch).
  const baseSound = sound;
  let lastUiSound = 0;
  sound = function (name) {
    if (name === 'open' || name === 'close') {
      const t = performance.now(); if (t - lastUiSound < 450) return; lastUiSound = t;
    }
    return baseSound(name);
  };
  const baseTone = tone;
  tone = function (from, to, duration, vol = 0.018, delay = 0) { if (volume <= 0) return; return baseTone(from, to, duration, vol * volume * 1.4, delay); };

  // ---- The frame of the big island, compact like a notch app: the page name left, Pip's eyes + date and time in the
  // middle, ⋯ right. ‹ › on the sides go to the page before / after. At the bottom: Pip's chat left, the speaker right
  // (point at it and it becomes a volume slider) and dots in the middle that turn into a row of tabs when you point at them. ----
  const TITLES = { chat: ['Pip', 'Pip'], spotify: ['Muziek', 'Music'], monitor: ['Claude', 'Claude'], assistant: ['Claude', 'Claude'], focus: ['Focus', 'Focus'],
    tray: ['Lade', 'Tray'], clips: ['Klembord', 'Clipboard'], note: ['Notitie', 'Note'], apps: ['Apps', 'Apps'], shortcuts: ['Snelknoppen', 'Quick buttons'],
    settings: ['Instellingen', 'Settings'], mirror: ['Spiegel', 'Mirror'], dev: ['Dev', 'Dev'], controls: ['Bediening', 'Controls'], system: ['Systeem', 'System'], studio: ['Studio', 'Studio'], software: ['Programma\'s', 'Software'], palette: ['Zoeken', 'Search'], rules: ['Automatisaties', 'Automations'], dashboard: ['Claude', 'Claude'], remote: ['Telefoon', 'Phone'] };
  const en = () => window.__winlandPrefs?.().lang !== 'nl';
  const round = (x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
  const press = { key: null, at: 0 }; // what is pressed right now (it dims instantly, on pointer-down)
  const pressed = key => press.key === key && performance.now() - press.at < 600;
  let menuOpen = false, menuAt = 0, quitArmed = false, dragging = false;
  const MENU = [['apps', 'grid', ['Alle apps', 'All apps']], ['settings', 'gear', ['Instellingen', 'Settings']], ['collapse', 'collapse', ['Inklappen', 'Fold in']], ['quit', 'power', ['Afsluiten', 'Quit']]];
  window.__winlandPageTint = () => '#ffffff';
  // the pages in a row (the tabs and ‹ ›); only the page you are on wears a colour
  const ALL_PAGES = [
    { view: 'home', icon: 'home', tint: '#ffffff', nl: 'Home', en: 'Home' },
    { view: 'monitor', icon: 'claude', tint: '#d97757', nl: 'Claude', en: 'Claude' },
    { view: 'spotify', icon: 'music', tint: () => window.__winlandAlbumColour || '#ff375f', nl: 'Muziek', en: 'Music' },
    { view: 'chat', icon: 'chat', tint: '#30d158', nl: 'Pip', en: 'Pip' },
    { view: 'focus', icon: 'timer', tint: '#bf5af2', nl: 'Focus', en: 'Focus' },
    { view: 'tray', icon: 'tray', tint: '#ffd60a', nl: 'Lade', en: 'Tray' },
    { view: 'clips', icon: 'copy', tint: '#64d2ff', nl: 'Klembord', en: 'Clipboard' },
    { view: 'note', icon: 'note', tint: '#ffd60a', nl: 'Notitie', en: 'Note' },
    { view: 'mirror', icon: 'camera', tint: '#8e8e93', nl: 'Spiegel', en: 'Mirror' },
    { view: 'dev', icon: 'code', tint: '#64d2ff', nl: 'Dev', en: 'Dev' },
    { view: 'controls', icon: 'controls', tint: '#ff9f0a', nl: 'Bediening', en: 'Controls' },
    { view: 'system', icon: 'system', tint: '#30d158', nl: 'Systeem', en: 'System' },
    { view: 'studio', icon: 'studio', tint: '#bf5af2', nl: 'Studio', en: 'Studio' },
    { view: 'software', icon: 'software', tint: '#0a84ff', nl: 'Programma\'s', en: 'Software' },
    { view: 'dashboard', icon: 'chart', tint: '#d97757', nl: 'Dashboard', en: 'Dashboard' },
    { view: 'rules', icon: 'bolt', tint: '#ffd60a', nl: 'Automatisaties', en: 'Automations' },
    { view: 'remote', icon: 'phone', tint: '#30d158', nl: 'Telefoon', en: 'Phone' }
  ];
  // only the apps that are on (Settings → Apps, or a profile): an app you turned off has no tab either
  const PAGE_APP = { monitor: 'claude', spotify: 'spotify', chat: 'buddy', focus: 'focus', tray: 'tray', clips: 'clips', note: 'note', mirror: 'mirror', dev: 'dev', controls: 'controls', system: 'system', studio: 'studio', software: 'software', dashboard: 'dashboard', rules: 'rules', remote: 'remote' };
  const pages = () => { const off = window.__winlandAppsOff?.() || new Set(); return ALL_PAGES.filter(pg => !off.has(PAGE_APP[pg.view])); };
  const pageIndex = () => pages().findIndex(pg => pg.view === (currentView === 'assistant' ? 'monitor' : currentView));
  function go(view) {
    if (window.__winlandHomeEditing?.()) window.__winlandHomeEdit?.(false);
    const from = pageIndex(), to = pages().findIndex(pg => pg.view === view);
    window.__winlandNavDir = from < 0 || to < 0 || from === to ? 0 : to > from ? 1 : -1; // the new page slides in from that side
    if (view === 'monitor') { window.__winlandMonitor?.open?.('claudecode'); return; }
    setView(view); setMode('expanded');
  }
  const ease = (from, to, k) => from + (to - from) * k;
  const claudeGlyph = (x, y, c, size) => { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = size * 0.13; ctx.lineCap = 'round'; const r = size * 0.42;
    for (let i = 0; i < 4; i++) { const an = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x - Math.cos(an) * r, y - Math.sin(an) * r); ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); ctx.stroke(); } ctx.restore(); };
  const pageIcon = (pg, x, y, size, colour) => pg.icon === 'claude' ? claudeGlyph(x, y, colour, size) : icon(pg.icon, x, y, size, colour, null, 'rgba(0,0,0,0)');
  const nav = { vol: 0, sliding: false, lastSet: 0, widths: null };
  window.__winlandNavGeometry = () => ({ top: 34, bottom: 38, side: 24 }); // contentRect (mascot.html) keeps out of this frame
  // a small label above a tab you point at (HTML, so it lies above the pages)
  const tip = document.createElement('div'); tip.id = 'winland-tip'; document.body.appendChild(tip);
  const tipStyle = document.createElement('style'); tipStyle.textContent = `#winland-tip{position:absolute;z-index:95;pointer-events:none;padding:3px 8px;border-radius:7px;background:#2c2c2e;color:#fff;font:600 11px Inter,"Segoe UI",sans-serif;white-space:nowrap;transform:translate(-50%,-100%);opacity:0;transition:opacity .12s}#winland-tip.on{opacity:1}`;
  document.head.appendChild(tipStyle);
  drawHeader = function (alpha) {
    const left = islandBounds.x, right = left + islandBounds.width, H = islandBounds.height, cy = 17, home = currentView === 'home';
    ctx.save(); ctx.globalAlpha = alpha;
    // left: the page name
    const t = TITLES[currentView];
    // two-tone names, like "Minuteur focus": the first part white, the second in the page's colour. [French, English, colour]
    const TWO = { monitor: [['Claude ', 'Code'], ['Claude ', 'Code'], '#d97757'], spotify: [['Lecteur ', 'musique'], ['Music ', 'Player'], () => window.__winlandAlbumColour || '#ff375f'],
      focus: [['Minuteur ', 'focus'], ['Focus ', 'Timer'], '#bf5af2'], tray: [['Tiroir ', 'à fichiers'], ['File ', 'Tray'], '#ffd60a'], clips: [['Presse-', 'papiers'], ['Clip', 'board'], '#64d2ff'],
      note: [['Bloc-', 'notes'], ['Note', 'pad'], '#ffd60a'], chat: [['Pip ', 'Chat'], ['Pip ', 'Chat'], '#30d158'], apps: [['Toutes les ', 'apps'], ['All ', 'apps'], '#8e8e93'],
      settings: [['Para', 'mètres'], ['Set', 'tings'], '#8e8e93'], mirror: [['Mi', 'roir'], ['Mir', 'ror'], '#8e8e93'], dev: [['Outils ', 'dev'], ['Dev ', 'Tools'], '#64d2ff'], controls: [['Con', 'trôles'], ['Con', 'trols'], '#ff9f0a'], system: [['Sys', 'tème'], ['Sys', 'tem'], '#30d158'], studio: [['Stu', 'dio'], ['Stu', 'dio'], '#bf5af2'], software: [['Logi', 'ciels'], ['Soft', 'ware'], '#0a84ff'], palette: [['Recher', 'che'], ['Sea', 'rch'], '#0a84ff'], rules: [['Automati', 'sations'], ['Auto', 'mations'], '#ffd60a'], dashboard: [['Tableau de bord ', 'Claude'], ['Claude ', 'dashboard'], '#d97757'], remote: [['Télé', 'phone'], ['Pho', 'ne'], '#30d158'] };
    const two = TWO[currentView === 'assistant' ? 'monitor' : currentView];
    if (!home && two) {
      const [a, b] = window.__winlandPrefs?.().lang === 'en' ? two[1] : two[0], tint = typeof two[2] === 'function' ? two[2]() : two[2];
      // measure what is really drawn (text() may still translate it), so the second part never overlaps the first
      const shown = window.__winlandTr ? window.__winlandTr(a) : a;
      ctx.save(); ctx.font = '700 13px Inter, "Segoe UI", sans-serif'; const aw = ctx.measureText(shown).width; ctx.restore();
      text(a, left + 22, cy + 4.5, 13, '#ffffff', 700); text(b, left + 22 + aw, cy + 4.5, 13, tint, 700);
    } else if (!home && t) text(en() ? t[1] : t[0], left + 22, cy + 4.5, 13, '#ffffff', 700);
    hit.back = null;
    // middle: Pip's eyes, then the date (grey) and the time (white, bold)
    const d = new Date(), day = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/,/g, '').replace(/^./, c => c.toUpperCase());
    const time = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    ctx.save(); ctx.font = '500 12px Inter, "Segoe UI", sans-serif'; const dw = ctx.measureText(day + ' ').width; ctx.font = '700 12px Inter, "Segoe UI", sans-serif'; const tw = ctx.measureText(time).width; ctx.restore();
    // (no little eyes while Pip stands big on the page himself; the little ones can be grabbed and dragged out too)
    const eyesOn = !window.__winlandRoboBig?.(), total = (eyesOn ? 22 : 0) + dw + tw, x0 = (left + right) / 2 - total / 2, tx = x0 + (eyesOn ? 22 : 0);
    hit.headEyes = null;
    if (eyesOn) { window.__winlandIslandEyes?.(x0 + 8, cy, 0.62); hit.headEyes = { x: x0 - 8, y: 2, width: 32, height: 30 }; }
    text(day, tx, cy + 4.5, 12, '#8e8e93', 500); text(time, tx + dw, cy + 4.5, 12, '#ffffff', 700);
    // right: ⋯ (and, while music plays on another page, a small visualizer that takes you to it; on the tray: clear all)
    const mx = right - 24, overM = inside(pointer.x, pointer.y, { x: mx - 16, y: 2, width: 32, height: 30 });
    if (menuOpen || pressed('more') || overM) round(mx, cy, 12, '#2c2c2e');
    for (const dx of [-5, 0, 5]) round(mx + dx, cy, 1.8, '#ffffff');
    hit.more = { x: mx - 18, y: 0, width: 36, height: 34 };
    hit.navMusic = null; hit.navClear = null;
    if (currentView === 'tray' && (window.__winlandTrayCount?.() || 0) > 0) {
      const label = en() ? 'Clear all' : 'Wis alles'; ctx.save(); ctx.font = '600 11px Inter, "Segoe UI", sans-serif'; const w = ctx.measureText(label).width + 18; ctx.restore();
      const b = { x: mx - 22 - w, y: cy - 10, width: w, height: 20 }, over = inside(pointer.x, pointer.y, b);
      box(b.x, b.y, b.width, b.height, 10, over ? 'rgba(255,69,58,.3)' : 'rgba(255,69,58,.18)'); text(label, b.x + w / 2, cy + 4, 11, '#ff6961', 600, 'center'); hit.navClear = b;
    } else if (currentView !== 'spotify' && spotifyConnected && spotifyState?.track && spotifyState.is_playing) {
      const b = { x: mx - 42, y: cy - 10, width: 22, height: 20 };
      window.__winlandVisualizer?.('header', b.x + 2, cy, 16, 12, window.__winlandAlbumColour || '#ffffff', 4); hit.navMusic = b;
    }
    hit.navPrev = null; hit.navNext = null; hit.navChat = null;
    const i = pageIndex(), by = H - 19;
    // bottom right: the speaker; point at it and it slides open into a volume slider
    const sys = window.__winlandSysVolume || { level: 50, muted: false }, level = sys.muted ? 0 : sys.level / 100;
    const volZone = { x: right - 132, y: by - 15, width: 124, height: 30 };
    nav.vol += ((nav.sliding || inside(pointer.x, pointer.y, nav.vol > 0.5 ? volZone : { x: right - 40, y: by - 15, width: 32, height: 30 }) ? 1 : 0) - nav.vol) * 0.25;
    icon('speaker', right - 25, by, 16, nav.vol > 0.1 ? '#ffffff' : '#8e8e93', level, 'rgba(0,0,0,0)');
    hit.navVol = null;
    if (nav.vol > 0.02) {
      const tw2 = 76 * nav.vol, tx = right - 40 - tw2, a = Math.min(1, nav.vol * 1.4);
      ctx.save(); ctx.globalAlpha *= a; box(tx, by - 2, tw2, 4, 2, 'rgba(255,255,255,.2)'); box(tx, by - 2, Math.max(4, tw2 * level), 4, 2, '#ffffff');
      if (nav.vol > 0.6) round(tx + tw2 * level, by, 5, '#ffffff'); ctx.restore();
      hit.navVol = { x: tx - 6, y: by - 12, width: tw2 + 12, height: 24, track: { x: tx, width: tw2 } };
    }
    // bottom middle: the pages as icons, always visible; the page you are on shows its name in a soft capsule in its colour
    const n = pages().length, label = pg => en() ? pg.en : pg.nl;
    ctx.save(); ctx.font = '600 11px Inter, "Segoe UI", sans-serif';
    const extra = i >= 0 ? ctx.measureText(label(pages()[i])).width + 10 : 0, room = right - left - 150; // the volume on the right, a margin on the left
    const unit = Math.max(20, Math.min(30, Math.floor((room - extra - (n - 1) * 2) / Math.max(1, n))));
    const want = pages().map((pg, j) => unit + (j === i ? extra : 0)); ctx.restore();
    if (!nav.widths || nav.widths.length !== n) nav.widths = want.slice();
    nav.widths = nav.widths.map((w, j) => w + (want[j] - w) * 0.25); // the capsule glides to the new page
    const rowW = nav.widths.reduce((sum, w) => sum + w, 0) + (n - 1) * 2, cx = (left + right) / 2 - 10;
    let x = cx - rowW / 2, tipAt = null;
    pages().forEach((pg, j) => {
      const w = nav.widths[j], b = { x, y: by - 14, width: w, height: 28 }, over = inside(pointer.x, pointer.y, b), on = j === i;
      const tint = typeof pg.tint === 'function' ? pg.tint() : pg.tint, ix = x + unit / 2;
      if (on) { ctx.save(); const n2 = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(tint); const hex = n2 ? null : parseInt(tint.slice(1), 16);
        ctx.fillStyle = tint === '#ffffff' ? '#2c2c2e' : n2 ? `rgba(${n2[1]},${n2[2]},${n2[3]},.2)` : `rgba(${hex >> 16},${(hex >> 8) & 255},${hex & 255},.2)`;
        ctx.beginPath(); ctx.roundRect(x, by - 13, w, 26, 13); ctx.fill(); ctx.restore(); }
      else if (over) round(ix, by, 13, '#2c2c2e');
      pageIcon(pg, ix, by, 15, on ? tint : over ? '#ffffff' : '#8e8e93');
      if (on && w > unit + 10) { ctx.save(); ctx.globalAlpha *= Math.min(1, (w - unit - 10) / 20); text(label(pg), x + unit - 2, by + 4, 11, tint, 600); ctx.restore(); }
      if (over && !on) tipAt = { x: ix, label: label(pg) };
      hit['navTab' + j] = b; x += w + 2;
    });
    for (let j = n; j < 24; j++) hit['navTab' + j] = null;
    // the label above the tab you point at (where you will go)
    if (tipAt && mode === 'expanded') { tip.textContent = tipAt.label; tip.style.left = `${tipAt.x}px`; tip.style.top = `${by - 18}px`; tip.classList.add('on'); }
    else tip.classList.remove('on');
    ['home', 'chat', 'apps', 'sound', 'settings', 'collapse', 'power'].forEach(key => { hit[key] = null; }); // the old toolbar is gone
    ctx.restore();
    drawMenu(right);
  };
  // the volume slider: press and slide (the island's own volume message stays quiet meanwhile)
  const setSys = clientX => {
    const b = hit.navVol; if (!b) return;
    const level = Math.round(Math.max(0, Math.min(1, (clientX - b.track.x) / b.track.width)) * 100);
    window.__winlandVolumeQuietUntil = performance.now() + 1500;
    window.__winlandSysVolume = { level, muted: false };
    const now = performance.now(); if (now - nav.lastSet > 50) { nav.lastSet = now; window.winland?.volumeSet?.(level)?.catch?.(() => {}); }
  };
  canvas.addEventListener('pointerdown', e => {
    if (mode !== 'expanded' || !inside(e.clientX, e.clientY, hit.navVol)) return;
    e.preventDefault(); e.stopImmediatePropagation(); nav.sliding = true; canvas.setPointerCapture?.(e.pointerId); setSys(e.clientX);
  }, true);
  canvas.addEventListener('pointermove', e => { if (nav.sliding) setSys(e.clientX); });
  const endSlide = e => { if (!nav.sliding) return; nav.sliding = false; setSys(e.clientX); const lv = window.__winlandSysVolume?.level; if (lv != null) window.winland?.volumeSet?.(lv)?.catch?.(() => {}); };
  canvas.addEventListener('pointerup', endSlide); canvas.addEventListener('pointercancel', endSlide);
  // the frame's buttons
  canvas.addEventListener('click', e => {
    if (mode !== 'expanded') return;
    const at = b => inside(e.clientX, e.clientY, b), stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    const i = pageIndex(), n = pages().length;
    if (at(hit.navVol)) { stop(); return; }
    for (let j = 0; j < n; j++) if (at(hit['navTab' + j])) { stop(); sound('click'); go(pages()[j].view); return; }
    if (at(hit.navMusic)) { stop(); sound('click'); go('spotify'); return; }
    if (at(hit.navClear)) { stop(); sound('click'); window.__winlandTrayClear?.(); return; }
  }, true);
  // The ⋯ menu (HTML, so it lies above every page): it grows out of its button (Apple: anchor to the source),
  // WinLand's sound on top, then four rows; Quit asks once more in the row itself.
  const menu = document.createElement('div'); menu.id = 'winland-menu'; document.body.appendChild(menu);
  const menuStyle = document.createElement('style'); menuStyle.textContent = `
#winland-menu{position:absolute;z-index:90;width:236px;padding:6px;box-sizing:border-box;border-radius:12px;background:#1c1c1e;box-shadow:0 18px 44px rgba(0,0,0,.6);
  font:500 15px Inter,"Segoe UI",sans-serif;color:#fff;transform-origin:calc(100% - 12px) -15px;opacity:0;transform:scale(.6);pointer-events:none;
  transition:opacity .16s ease-out,transform .22s cubic-bezier(.2,.9,.3,1)}
#winland-menu.open{opacity:1;transform:none;pointer-events:auto}
#winland-menu .mn-vol{display:flex;align-items:center;gap:12px;height:44px;padding:0 12px}
#winland-menu .mn-track{flex:1;height:6px;border-radius:3px;background:#3a3a3c;position:relative;cursor:pointer}
#winland-menu .mn-track i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:#fff}
#winland-menu .mn-track::before{content:'';position:absolute;inset:-14px 0}
#winland-menu button{display:flex;align-items:center;gap:12px;width:100%;height:40px;padding:0 12px;border:0;border-top:1px solid #2c2c2e;border-radius:0;background:transparent;color:#fff;font:inherit;text-align:left;cursor:pointer}
#winland-menu button:hover{background:#2c2c2e;border-radius:8px;border-top-color:transparent}
#winland-menu button:active{transform:scale(.98);transition:transform .1s ease-out}
#winland-menu button.red{color:#ff4245}
#winland-menu svg{flex:none}`;
  document.head.appendChild(menuStyle);
  const SVG = {
    speaker: '<path d="M4 9.5h4l4.5-4v13L8 14.5H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
    collapse: '<path d="m6 15 6-6 6 6"/>',
    power: '<path d="M7.5 6.5a7 7 0 1 0 9 0"/><path d="M12 3v8"/>' };
  const svg = (name, colour = 'currentColor') => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[name]}</svg>`;
  function renderMenu() {
    const words = (nl, en2) => en() ? en2 : nl;
    menu.innerHTML = `<div class="mn-vol">${svg('speaker')}<div class="mn-track" role="slider" aria-label="${words('Geluid van WinLand', 'WinLand sounds')}"><i style="width:${Math.round((window.__winlandVolume?.() ?? 0) * 100)}%"></i></div></div>`
      + MENU.map(([key, g, label]) => `<button type="button" data-menu="${key}" class="${key === 'quit' ? 'red' : ''}">${svg(g)}${key === 'quit' && quitArmed ? words('Klik nog eens om af te sluiten', 'Click again to quit') : (en() ? label[1] : label[0])}</button>`).join('');
  }
  function openMenu(on) {
    menuOpen = on; quitArmed = false;
    if (on) { renderMenu(); menuAt = performance.now(); }
    menu.classList.toggle('open', on);
  }
  function drawMenu(right) {
    if (menuOpen && mode !== 'expanded') openMenu(false);
    menu.style.left = `${right - 12 - 236}px`; menu.style.top = '32px';
  }
  const setFromTrack = clientX => { const t = menu.querySelector('.mn-track'); if (!t) return; const r = t.getBoundingClientRect(); setVolume((clientX - r.left) / r.width); menu.querySelector('.mn-track i').style.width = `${Math.round(volume * 100)}%`; };
  menu.addEventListener('pointerdown', e => {
    if (!e.target.closest('.mn-track')) return;
    dragging = true; setFromTrack(e.clientX); menu.setPointerCapture?.(e.pointerId);
  });
  menu.addEventListener('pointermove', e => { if (dragging) setFromTrack(e.clientX); });
  menu.addEventListener('pointerup', () => { if (dragging) { dragging = false; sound('click'); } });
  menu.addEventListener('click', e => {
    const b = e.target.closest('[data-menu]'); if (!b) return;
    const choice = b.dataset.menu;
    if (choice === 'quit') { if (quitArmed) { openMenu(false); sound('click'); window.winland?.close?.(); } else { quitArmed = true; renderMenu(); sound('click'); } return; }
    openMenu(false);
    if (choice === 'apps') { setView('apps'); sound('click'); }
    else if (choice === 'settings') { setView('settings'); sound('click'); }
    else if (choice === 'collapse') { window.__winlandMonitor?.small?.(); window.__winlandHoldClosed?.(); setMode('rest'); }
  });
  // a press anywhere else closes it
  document.addEventListener('pointerdown', e => { if (menuOpen && !menu.contains(e.target) && !inside(e.clientX, e.clientY, hit.more)) openMenu(false); }, true);
  // feedback on pointer-down (instant), the action on click
  canvas.addEventListener('pointerdown', e => {
    for (const key of ['back', 'more']) if (inside(e.clientX, e.clientY, hit[key])) { press.key = key; press.at = performance.now(); }
  }, true);
  canvas.addEventListener('pointerup', () => { press.key = null; });
  canvas.addEventListener('click', e => {
    const at = b => inside(e.clientX, e.clientY, b), stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (mode !== 'expanded') return;
    if (at(hit.more)) { stop(); openMenu(!menuOpen); sound('click'); return; }
    if (at(hit.back)) {
      stop(); if (currentView === 'monitor') window.__winlandMonitor?.small?.();
      if (window.__winlandHomeEditing?.()) window.__winlandHomeEdit?.(false);
      setView('home'); setMode('expanded'); return;
    }
  }, true);
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) { openMenu(false); e.stopImmediatePropagation(); } }, true);
  window.__winlandMenuOpen = () => menuOpen;
})();
