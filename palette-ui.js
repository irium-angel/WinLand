'use strict';
// Command palette (Alt+Space): the island opens into a search bar. Type and press Enter:
//   an app, a recent file, a project · 2*(3+4) · 3h45 en minutes · 72 °F en °C · 5 km en miles
//   claude: fix the tests · minuteur 5 min pâtes · rappel 20 min appeler Julie · mode réunion · pipette
//   port 3000 · temps d'écran · your clipboard · a WinLand page · your scripts
// Everything stays on this PC (palette-main.cjs finds the apps, files and projects).
(function palette() {
  const api = window.winland;
  if (!api?.paletteIndex) return;
  const prefs = () => window.__winlandPrefs?.() || {};
  const en = () => prefs().lang === 'en';
  const T = (fr, eng) => en() ? eng : fr;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const flash = (t, ms) => window.__winlandFlash?.(t, ms);

  const root = document.createElement('section'); root.id = 'winland-palette'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#winland-palette{position:absolute;z-index:60;display:none;color:#fff;font:13px/1.4 Inter,"Segoe UI",sans-serif;pointer-events:auto}
#winland-palette *{box-sizing:border-box}
#winland-palette .pl-box{display:flex;align-items:center;gap:10px;height:48px;padding:0 16px;border-radius:16px;background:#1c1c1e}
#winland-palette .pl-box svg{width:18px;height:18px;flex:none;stroke:#8e8e93;fill:none;stroke-width:2.2;stroke-linecap:round}
#winland-palette input{flex:1;min-width:0;border:0;outline:0;background:none;color:#fff;font:500 17px Inter,"Segoe UI",sans-serif}
#winland-palette input::placeholder{color:#636366}
#winland-palette .pl-list{margin-top:8px;display:flex;flex-direction:column;gap:2px;max-height:calc(100% - 56px);overflow:hidden} /* never over the icons below */
#winland-palette .pl-row{display:flex;align-items:center;gap:11px;height:38px;padding:0 10px;border-radius:11px;cursor:pointer}
#winland-palette .pl-row.on{background:#2c2c2e}
#winland-palette .pl-ic{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;flex:none;font-size:14px;font-weight:800;background:var(--c,#3a3a3c)}
#winland-palette .pl-t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
#winland-palette .pl-t small{font-weight:500;color:#8e8e93;margin-left:8px}
#winland-palette .pl-k{font-size:11px;color:#8e8e93;font-weight:600;flex:none}
#winland-palette .pl-empty{padding:12px 10px;color:#8e8e93}`;
  document.head.appendChild(style);
  root.innerHTML = `<div class="pl-box"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="text" spellcheck="false" autocomplete="off"></div><div class="pl-list"></div>`;
  const input = root.querySelector('input'), list = root.querySelector('.pl-list');
  let idx = null, clips = [], results = [], selected = 0;

  // ---------- calculator: + − × ÷ ^ % ( ), decimals with , or . ----------
  function calc(text) {
    const src = text.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.').replace(/\s+/g, '');
    if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(src)) return null; // a date (2024-10-30), not a sum
    if (!/^[\d.+\-*/^%()]+$/.test(src) || !/\d/.test(src) || !/[+\-*/^%]/.test(src.replace(/^-/, ''))) return null;
    let i = 0;
    const num = () => { const m = /^\d*\.?\d+/.exec(src.slice(i)); if (!m) throw 0; i += m[0].length; return parseFloat(m[0]); };
    const atom = () => { if (src[i] === '(') { i++; const v = expr(); if (src[i++] !== ')') throw 0; return v; } if (src[i] === '-') { i++; return -atom(); } return num(); };
    const pow = () => { let v = atom(); while (src[i] === '%') { i++; v /= 100; } if (src[i] === '^') { i++; v = Math.pow(v, pow()); } return v; };
    const term = () => { let v = pow(); while (src[i] === '*' || src[i] === '/') { const op = src[i++]; const r = pow(); v = op === '*' ? v * r : v / r; } return v; };
    function expr() { let v = term(); while (src[i] === '+' || src[i] === '-') { const op = src[i++]; const r = term(); v = op === '+' ? v + r : v - r; } return v; }
    try { const v = expr(); if (i !== src.length || !Number.isFinite(v)) return null; return Math.round(v * 1e10) / 1e10; } catch { return null; }
  }
  const fmt = v => en() ? String(v) : String(v).replace('.', ',');

  // ---------- conversions ----------
  const UNITS = {
    length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, mile: 1609.344, miles: 1609.344, ft: 0.3048, pied: 0.3048, pieds: 0.3048, in: 0.0254, pouce: 0.0254, pouces: 0.0254, yd: 0.9144 },
    weight: { kg: 1, g: 0.001, mg: 1e-6, t: 1000, lb: 0.45359237, lbs: 0.45359237, livre: 0.45359237, livres: 0.45359237, oz: 0.0283495 },
    data: { o: 1, ko: 1e3, mo: 1e6, go: 1e9, to: 1e12, b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, kio: 1024, mio: 1048576, gio: 1073741824 },
    speed: { 'km/h': 1, kmh: 1, mph: 1.609344, 'm/s': 3.6, noeud: 1.852, noeuds: 1.852, kn: 1.852 },
    time: { s: 1, sec: 1, seconde: 1, secondes: 1, min: 60, minute: 60, minutes: 60, h: 3600, heure: 3600, heures: 3600, hour: 3600, hours: 3600, j: 86400, jour: 86400, jours: 86400, day: 86400, days: 86400, semaine: 604800, semaines: 604800, week: 604800, weeks: 604800 }
  };
  function convert(text) {
    const q = norm(text).replace(',', '.');
    let m = /^(-?[\d.]+)\s*°?\s*([cfk])\s+(?:en|in|to|->)\s+°?\s*([cfk])$/.exec(q);
    if (m) { // temperature
      const v = parseFloat(m[1]), toC = { c: v, f: (v - 32) * 5 / 9, k: v - 273.15 }[m[2]], out = { c: toC, f: toC * 9 / 5 + 32, k: toC + 273.15 }[m[3]];
      return { value: Math.round(out * 100) / 100, unit: '°' + m[3].toUpperCase() };
    }
    m = /^(\d+)\s*h\s*(\d+)?\s*(?:min)?\s+(?:en|in|to)\s+(minutes?|min|secondes?|s)$/.exec(q); // 3h45 en minutes
    if (m) { const sec = (Number(m[1]) * 60 + Number(m[2] || 0)) * 60; return /^s/.test(m[3]) ? { value: sec, unit: 's' } : { value: sec / 60, unit: 'min' }; }
    m = /^(-?[\d.]+)\s*([a-z/]+)\s+(?:en|in|to|->)\s+([a-z/]+)$/.exec(q);
    if (!m) return null;
    for (const table of Object.values(UNITS)) if (m[2] in table && m[3] in table) {
      const out = parseFloat(m[1]) * table[m[2]] / table[m[3]];
      return { value: Math.round(out * 1000) / 1000, unit: m[3] };
    }
    return null;
  }
  const duration = min => min >= 60 ? `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')}` : `${Math.round(min)} min`;

  // ---------- commands ----------
  const PAGES = [['home', T('Accueil', 'Home'), '🏠'], ['spotify', T('Musique', 'Music'), '🎵'], ['chat', 'Pip', '💬'], ['monitor', 'Claude Code', '✳️'], ['focus', 'Focus', '⏱'],
    ['tray', T('Tiroir', 'Tray'), '📥'], ['clips', T('Presse-papiers', 'Clipboard'), '📋'], ['note', T('Note', 'Note'), '📝'], ['dev', T('Outils dev', 'Dev tools'), '🛠'],
    ['controls', T('Contrôles', 'Controls'), '🎛'], ['system', T('Système', 'System'), '🖥'], ['studio', 'Studio', '🎚'], ['software', T('Logiciels', 'Software'), '🧩'], ['dashboard', T('Tableau de bord Claude', 'Claude dashboard'), '📊'], ['rules', T('Automatisations', 'Automations'), '⚡'], ['remote', T('Téléphone (télécommande)', 'Phone (remote)'), '📱']];
  function search(text) {
    const q = text.trim(), n = norm(q), out = [];
    const add = (item, score) => out.push({ ...item, score });
    const qWords = n.split(/\s+/).filter(Boolean);
    const match = name => {
      const s = norm(name); if (!n) return 1; if (s.startsWith(n)) return 100 - s.length / 100;
      const words = s.split(/[\s\-_.]+/).filter(Boolean), initials = words.map(w => w[0]).join('');
      const short = s.length / 100; // among equals, the shorter name (Visual Studio Code before "Developer Command Prompt for VS 2019")
      if (words.some(w => w.startsWith(n))) return 70 - short;
      // several words, or initials: "vs code" → Visual Studio Code
      if (qWords.length && qWords.every(q => words.some(w => w.startsWith(q)) || (q.length > 1 && initials.includes(q)))) return 60 - short + (initials.startsWith(qWords[0]) ? 3 : 0);
      if (s.includes(n)) return 40 - short; return 0;
    };
    if (q) {
      const pc = /^(-?[\d.,]+)\s*%\s*(?:de|of|d’|d')\s*(-?[\d.,]+)$/i.exec(q); // 15 % de 200
      if (pc) { const v = Math.round(parseFloat(pc[1].replace(',', '.')) * parseFloat(pc[2].replace(',', '.'))) / 100; add({ icon: '=', colour: '#0a84ff', title: fmt(v), sub: q, kind: T('Calcul', 'Calculator'), run: () => copy(fmt(v)) }, 1000); }
      const c = calc(q); if (c !== null) add({ icon: '=', colour: '#0a84ff', title: fmt(c), sub: q, kind: T('Calcul', 'Calculator'), run: () => copy(fmt(c)) }, 1000);
      const v = convert(q); if (v) add({ icon: '⇄', colour: '#30d158', title: `${fmt(v.value)} ${v.unit}`, sub: q, kind: T('Conversion', 'Conversion'), run: () => copy(fmt(v.value)) }, 1000);
      let m = /^claude[:\s]+(.+)$/i.exec(q);
      if (m) (idx?.projects?.length ? idx.projects.slice(0, 3) : [{ id: -1, name: T('ton dossier', 'your folder') }]).forEach((p, i) =>
        add({ icon: '✳', colour: '#d97757', title: m[1], sub: `${T('Claude Code dans', 'Claude Code in')} ${p.name}`, kind: 'Claude', run: () => api.paletteClaude(m[1], p.id).then(r => flash(r?.ok ? `✳ ${T('Tâche envoyée à Claude', 'Task sent to Claude')} · ${r.project}` : `⚠ ${T('Claude Code est introuvable sur ce PC', 'Claude Code is not on this PC')}`, 2400)) }, 900 - i));
      // "5", "5 min", "5 minutes", "1 h", "1 heure", "2h30", then what it is for
      const minutes = m => parseFloat(m[1].replace(',', '.')) * (m[2] ? 60 : 1) + Number(m[3] || 0);
      m = /^(?:minuteur|timer)\s+(\d+(?:[.,]\d+)?)(?:\s*(?:(heures?|hours?|h)\s*(\d{1,2})?|minutes?|mins?|m)(?![a-zà-ü]))?\s*(.*)$/i.exec(q);
      if (m) { const mins = minutes(m), label = m[4]; add({ icon: '⏱', colour: '#ff9f0a', title: `${T('Minuteur', 'Timer')} ${duration(mins)}${label ? ' · ' + label : ''}`, kind: T('Minuteur', 'Timer'), run: () => window.__winlandTimers?.add(mins, label, 'timer') }, 950); }
      m = /^(?:rappel|reminder|dans|in)\s+(\d+(?:[.,]\d+)?)(?:\s*(?:(heures?|hours?|h)\s*(\d{1,2})?|minutes?|mins?|m)(?![a-zà-ü]))?\s*:?\s*(.*)$/i.exec(q);
      if (m) { const mins = minutes(m); m[3] = m[4]; add({ icon: '🔔', colour: '#ff9f0a', title: m[3] || T('Rappel', 'Reminder'), sub: `${T('dans', 'in')} ${duration(mins)}`, kind: T('Rappel', 'Reminder'), run: () => window.__winlandTimers?.add(mins, m[3], 'reminder') }, 950); }
      m = /^port\s+(\d{2,5})$/i.exec(q);
      if (m) add({ icon: '🔌', colour: '#64d2ff', title: `${T('Port', 'Port')} ${m[1]}`, sub: T('Voir qui l’utilise et le libérer', 'See who uses it and free it'), kind: 'Dev', run: () => freePort(Number(m[1])), keep: true }, 950);
    }
    for (const md of window.__winlandModes?.list() || []) { const s = Math.max(match(`mode ${md.label}`), match(md.label) * 0.6); if (s && (n.length > 1)) add({ icon: md.icon, colour: '#5e5ce6', title: `${T('Mode', 'Mode')} ${md.label}`, sub: window.__winlandModes.get() === md.id ? T('actif', 'on') : '', kind: T('Mode', 'Mode'), run: () => window.__winlandModes.set(md.id) }, s + 10); }
    const cmd = (words, item) => { const s = Math.max(...words.map(match)); if (s && n.length > 1) add(item, s + 5); };
    cmd(['pipette', 'couleur', 'color picker', 'eyedropper'], { icon: '💧', colour: '#bf5af2', title: T('Pipette : la couleur sous la souris', 'Eyedropper: the colour under the mouse'), sub: T('Place la souris, la couleur est copiée dans 3 s', 'Point at it, the colour is copied in 3 s'), kind: 'Dev', run: pipette });
    cmd(['temps d’écran', "temps d'ecran", 'screen time', 'ecran'], { icon: '⌛', colour: '#30d158', title: T('Temps d’écran aujourd’hui', 'Screen time today'), kind: T('Toi', 'You'), run: screenTime, keep: true });
    if (/^(agenda|calendrier|calendar|rdv|rendez)/.test(n)) { const list = window.__winlandAgenda?.() || [];
      if (!list.length) add({ icon: '📅', colour: '#ff375f', title: T('Rien à l’agenda aujourd’hui', 'Nothing in the calendar today'), kind: T('Agenda', 'Calendar'), run: () => {} }, 900);
      list.slice(0, 5).forEach((a, i) => add({ icon: '📅', colour: '#ff375f', title: a.title || T('Rendez-vous', 'Appointment'), sub: a.place || '', kind: a.time, run: () => {} }, 900 - i)); }
    cmd(['pip sur le bureau', 'pip bureau', 'pip desktop', 'compagnon'], { icon: '🚶', colour: '#ffffff', title: prefs().pipDesk ? T('Ramener Pip dans l’island', 'Bring Pip back to the island') : T('Pip sur le bureau', 'Pip on the desktop'), kind: 'Pip', run: () => window.__winlandSetPref?.('pipDesk', !prefs().pipDesk) });
    cmd(['scripts', 'mes scripts'], { icon: '📁', colour: '#8e8e93', title: T('Ouvrir le dossier de mes scripts', 'Open my scripts folder'), kind: 'Scripts', run: () => api.paletteScriptsFolder() });
    cmd(['micro', 'microphone', 'mute'], { icon: '🎙', colour: '#ff453a', title: window.__winlandMic?.muted() ? T('Rouvrir le micro', 'Turn the microphone on') : T('Couper le micro', 'Turn the microphone off'), kind: T('Micro', 'Mic'), run: () => window.__winlandMic?.toggle() });
    for (const t of window.__winlandTimers?.list() || []) if (!n || match(t.label || 'minuteur') || /minut|timer|rappel/.test(n)) add({ icon: t.kind === 'reminder' ? '🔔' : '⏱', colour: '#ff9f0a', title: t.label || T('Minuteur', 'Timer'), sub: `${t.left} · ${T('Entrée pour annuler', 'Enter to cancel')}`, kind: T('En cours', 'Running'), run: () => window.__winlandTimers.cancel(t.id) }, n ? 60 : 300);
    for (const [view, label, icon] of PAGES) { const s = match(label); if (s && n) add({ icon, colour: '#2c2c2e', title: label, kind: 'WinLand', run: () => { setView(view); setMode('expanded'); }, keep: true }, s - 5); }
    if (idx) {
      for (const a of idx.apps) { const s = match(a.name); if (s && n) add({ icon: a.name[0], colour: '#3a3a3c', title: a.name, kind: T('App', 'App'), run: () => api.paletteOpen('apps', a.id) }, s + 8); }
      for (const p of idx.projects) { const s = match(p.name); if (s && (n || true)) add({ icon: '📂', colour: '#64d2ff', title: p.name, kind: T('Projet', 'Project'), run: () => api.paletteOpen('projects', p.id) }, n ? s + 6 : 20); }
      for (const f of idx.recent) { const s = match(f.name); if (s && n) add({ icon: '📄', colour: '#48484a', title: f.name, kind: T('Récent', 'Recent'), run: () => api.paletteOpen('recent', f.id) }, s); }
      for (const f of idx.scripts) { const s = match(f.name); if (s && n) add({ icon: '▶', colour: '#30d158', title: f.name, kind: 'Script', run: () => api.paletteOpen('scripts', f.id) }, s + 4); }
    }
    for (const c of clips) { if (n.length > 1 && norm(c.text).includes(n)) add({ icon: '📋', colour: '#5ad1c4', title: c.text.replace(/\s+/g, ' ').slice(0, 90), kind: T('Copié', 'Copied'), run: () => copy(c.text) }, 30); }
    if (!q) for (const c of clips.slice(0, 3)) add({ icon: '📋', colour: '#5ad1c4', title: c.text.replace(/\s+/g, ' ').slice(0, 90), kind: T('Copié', 'Copied'), run: () => copy(c.text) }, 10);
    return out.sort((a, b) => b.score - a.score).slice(0, 5);
  }
  const copy = text => { navigator.clipboard?.writeText(String(text)).catch(() => {}); flash(`📋 ${T('Copié', 'Copied')} · ${String(text).slice(0, 30)}`, 1400); };
  function pipette() { flash(`💧 ${T('Place la souris sur la couleur…', 'Point at the colour…')}`, 3000); setTimeout(async () => { const r = await api.pixel().catch(() => null); if (r?.hex) { copy(r.hex); window.__winlandCard?.({ app: T('Pipette', 'Eyedropper'), icon: ' ', colour: r.hex, title: r.hex, body: T('Copié dans le presse-papiers', 'Copied to the clipboard'), ms: 5000 }); } }, 3000); }
  async function screenTime() {
    const r = await api.screenTime().catch(() => null), rows = r?.today || [];
    results = rows.length ? rows.slice(0, 5).map(x => ({ icon: x.app[0].toUpperCase(), colour: '#30d158', title: x.app, kind: duration(x.ms / 60000), run: () => {} }))
      : [{ icon: '⌛', title: T('Rien encore aujourd’hui', 'Nothing yet today'), kind: '', run: () => {} }];
    selected = 0; draw();
  }
  async function freePort(port) {
    const r = await api.palettePort(port, false).catch(() => null);
    if (r?.free) { results = [{ icon: '✅', colour: '#30d158', title: `${T('Le port', 'Port')} ${port} ${T('est libre', 'is free')}`, kind: '', run: () => {} }]; return draw(); }
    results = [{ icon: '🔌', colour: '#ff453a', title: `${T('Arrêter', 'Stop')} ${r?.name || '?'} (PID ${r?.pid})`, sub: `${T('libère le port', 'frees port')} ${port}`, kind: T('Entrée', 'Enter'),
      run: async () => { const k = await api.palettePort(port, true).catch(() => null); flash(k?.killed ? `🔌 ${T('Port', 'Port')} ${port} ${T('libéré', 'freed')}` : `⚠ ${T('Programme Windows : laissé tranquille', 'A Windows program: left alone')}`, 2400); } }];
    selected = 0; draw();
  }

  // ---------- drawing and keys ----------
  function draw() {
    list.innerHTML = results.length ? results.map((r, i) => `<div class="pl-row ${i === selected ? 'on' : ''}" data-i="${i}"><span class="pl-ic" style="--c:${r.colour || '#3a3a3c'}">${esc(r.icon)}</span>
      <span class="pl-t">${esc(r.title)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span><span class="pl-k">${esc(r.kind || '')}</span></div>`).join('')
      : `<div class="pl-empty">${T('Rien trouvé. Essaie une app, un calcul, « claude: … », « minuteur 5 min », « mode réunion »…', 'Nothing found. Try an app, a sum, “claude: …”, “timer 5 min”, “mode meeting”…')}</div>`;
  }
  function update() { results = search(input.value); selected = 0; draw(); }
  function choose(i) { const r = results[i]; if (!r) return; const keep = r.keep; Promise.resolve(r.run()).catch(() => {}); if (!keep) close(); }
  function close() { input.value = ''; if (currentView === 'palette') { setView('home'); setMode('rest'); } }
  input.addEventListener('input', update);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); selected = Math.min(results.length - 1, selected + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selected = Math.max(0, selected - 1); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(selected); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  list.addEventListener('click', e => { const row = e.target.closest('[data-i]'); if (row) choose(Number(row.dataset.i)); });

  async function open() {
    setView('palette'); setMode('expanded'); api.revealFor?.(2000);
    input.placeholder = T('Une app, un calcul, claude: …, minuteur 5 min, mode réunion…', 'An app, a sum, claude: …, timer 5 min, mode meeting…');
    input.value = ''; results = search(''); draw();
    setTimeout(() => input.focus(), 60);
    const [i, c] = await Promise.all([api.paletteIndex().catch(() => null), api.clipsGet?.().catch(() => null)]);
    if (i?.ok) idx = i; clips = c?.clips || []; if (currentView === 'palette') update();
  }
  api.onPaletteShow?.(open);
  window.__winlandCommands = { open, search: q => search(q).map(r => `${r.kind}: ${r.title}${r.sub ? ' (' + r.sub + ')' : ''}`), calc, convert };

  let shown = false;
  (function position() {
    const show = currentView === 'palette' && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) { window.__winlandPage.place(root, contentRect()); if (!shown) { shown = true; } } else if (shown) { shown = false; }
    requestAnimationFrame(position);
  })();
})();
