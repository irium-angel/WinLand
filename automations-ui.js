'use strict';
// Automations: "when X, then Y" rules, like Shortcuts on the iPhone. A page of the island (Automatisations) lists
// them, with ready-made ideas to add in one click. Everything runs here, on this PC.
//   when: a game starts · an app comes to the front · the audio output changes (headphones) · Claude Code finishes
//         while you are away · a time of day · a focus starts or ends · a long command finishes · a notification
//   then: a mode · a profile · the volume · open an app · an audio output · the theme · a message · start a focus ·
//         a summary of Claude's work when you come back
(function automations() {
  const api = window.winland;
  if (!api) return;
  const prefs = () => window.__winlandPrefs?.() || {};
  const T = (fr, en) => prefs().lang === 'en' ? en : fr;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  let rules = store.get('winland:rules', []);
  const save = () => store.set('winland:rules', rules);

  // ---------- what can happen, and what WinLand can do ----------
  const WHEN = {
    game: { fr: 'Je lance un jeu', en: 'I start a game' },
    app: { fr: 'Une app passe devant', en: 'An app comes to the front', arg: { fr: 'nom de l’app (ex. obs64)', en: 'app name (e.g. obs64)' } },
    output: { fr: 'La sortie audio change', en: 'The audio output changes', arg: { fr: 'nom (ex. casque, AirPods)', en: 'name (e.g. headphones, AirPods)' } },
    claudeAway: { fr: 'Claude Code a fini et je ne suis pas là', en: 'Claude Code is done while I’m away' },
    time: { fr: 'Il est une heure précise', en: 'It is a given time', arg: { fr: 'heure (ex. 23:00)', en: 'time (e.g. 23:00)' } },
    focusStart: { fr: 'Un focus commence', en: 'A focus starts' },
    focusEnd: { fr: 'Un focus se termine', en: 'A focus ends' },
    command: { fr: 'Une longue commande se termine', en: 'A long command finishes' },
    notification: { fr: 'Une notification arrive', en: 'A notification arrives', arg: { fr: 'app (ex. Discord)', en: 'app (e.g. Discord)' } }
  };
  const THEN = {
    mode: { fr: 'Passer en mode', en: 'Switch to mode', arg: { fr: 'normal, réunion, nuit, streaming', en: 'normal, meeting, night, stream' } },
    profile: { fr: 'Passer au profil', en: 'Switch to profile', arg: { fr: 'bureau, dev, jeu, musique, perso', en: 'office, dev, gaming, music, custom' } },
    volume: { fr: 'Mettre le son à', en: 'Set the volume to', arg: { fr: '% (ex. 40)', en: '% (e.g. 40)' } },
    open: { fr: 'Ouvrir une app', en: 'Open an app', arg: { fr: 'nom (ex. Discord)', en: 'name (e.g. Discord)' } },
    output: { fr: 'Sortie audio', en: 'Audio output', arg: { fr: 'nom (ex. casque)', en: 'name (e.g. headphones)' } },
    theme: { fr: 'Thème', en: 'Theme', arg: { fr: 'dark ou light', en: 'dark or light' } },
    say: { fr: 'Afficher un message', en: 'Show a message', arg: { fr: 'texte', en: 'text' } },
    focus: { fr: 'Lancer un focus', en: 'Start a focus' },
    summary: { fr: 'Résumé de la tâche à mon retour', en: 'Summary of the task when I’m back' }
  };
  const IDEAS = [
    { when: 'game', then: [['mode', 'normal'], ['profile', 'gaming'], ['volume', '40'], ['open', 'Discord']], name: { fr: 'Session de jeu', en: 'Gaming session' } },
    { when: 'output', whenArg: 'casque', then: [['say', '🎧 Casque branché']], name: { fr: 'Casque branché', en: 'Headphones in' } },
    { when: 'claudeAway', then: [['summary', '']], name: { fr: 'Résumé de Claude à mon retour', en: 'Claude summary when I’m back' } },
    { when: 'time', whenArg: '23:00', then: [['theme', 'dark'], ['say', '🌙 Il est 23 h : pense à couper']], name: { fr: 'Fin de soirée', en: 'Late evening' } },
    { when: 'app', whenArg: 'obs64', then: [['mode', 'stream']], name: { fr: 'OBS ouvert : mode streaming', en: 'OBS open: streaming mode' } },
    { when: 'focusStart', then: [['mode', 'meeting']], name: { fr: 'Focus : rien ne me dérange', en: 'Focus: nothing disturbs me' } }
  ];

  // ---------- doing things ----------
  let index = null;
  async function openApp(name) {
    index ||= await api.paletteIndex?.().catch(() => null);
    const n = norm(name), app = index?.apps?.find(a => norm(a.name) === n) || index?.apps?.find(a => norm(a.name).startsWith(n)) || index?.apps?.find(a => norm(a.name).includes(n));
    if (app) api.paletteOpen('apps', app.id);
  }
  async function useOutput(name) {
    const r = await api.outputsGet?.().catch(() => null), n = norm(name);
    const o = (r?.outputs || []).find(x => norm(x.name).includes(n)); if (o) api.outputSet(o.id);
  }
  // what you type, in French or English, to what WinLand calls it
  const MODE_NAMES = { normal: 'normal', meeting: 'meeting', reunion: 'meeting', night: 'night', nuit: 'night', stream: 'stream', streaming: 'stream', live: 'stream' };
  const PROFILE_NAMES = { office: 'office', bureau: 'office', travail: 'office', dev: 'dev', developpement: 'dev', code: 'dev', gaming: 'gaming', jeu: 'gaming', jeux: 'gaming', jeux_video: 'gaming', music: 'music', musique: 'music', studio: 'music', custom: 'custom', perso: 'custom', personnalise: 'custom' };
  const named = (table, a, fallback) => table[norm(a).replace(/^(mode|profil|profile)\s+/, '').replace(/\s+/g, '_')] || fallback;
  let summaryWaiting = false;
  async function act([kind, arg]) {
    const a = String(arg || '').trim();
    if (kind === 'mode') window.__winlandModes?.set(named(MODE_NAMES, a, 'normal'));
    else if (kind === 'profile') { const p = named(PROFILE_NAMES, a, null); if (p) window.__winlandSetPref?.('profile', p); }
    else if (kind === 'volume') { const v = parseFloat(a); if (Number.isFinite(v)) api.volumeSet?.(Math.max(0, Math.min(100, Math.round(v)))); } // never 0 by mistake
    else if (kind === 'open') openApp(a);
    else if (kind === 'output') useOutput(a);
    else if (kind === 'theme') window.__winlandSetPref?.('theme', a === 'light' ? 'light' : 'dark');
    else if (kind === 'say') window.__winlandCard?.({ app: T('Automatisation', 'Automation'), icon: '⚡', colour: '#ffd60a', title: a || '✓', ms: 7000 });
    else if (kind === 'focus') { if (!window.__winlandFocus?.active()) window.__winlandFocus?.start(); }
    else if (kind === 'summary') summaryWaiting = true;
  }
  function fire(when, value) {
    for (const r of rules) {
      if (!r.on || r.when !== when) continue;
      if (r.whenArg && value != null && !norm(value).includes(norm(r.whenArg))) continue;
      if (r.whenArg && value == null) continue;
      r.then.forEach(act);
    }
  }
  window.__winlandAutomation = (event, data) => { // live-ui.js (notifications) and dev-ui.js (commands)
    if (event === 'notification') fire('notification', data?.app || '');
    if (event === 'command-done') fire('command', data?.name || '');
  };

  // ---------- watching for the "when" ----------
  let fg = '', front = '', output = null, clock = '';
  api.onForeground?.(m => { const next = String(m || ''); if (next === 'game' && fg !== 'game') fire('game'); fg = next; });
  api.onFront?.(name => { if (name && name !== front) { front = name; fire('app', name); } });
  setInterval(async () => { // the default audio output (Windows switches to your headphones when you plug them in)
    if (!rules.some(r => r.on && r.when === 'output')) return;
    const r = await api.outputsGet?.().catch(() => null), now = (r?.outputs || []).find(o => o.default)?.name || null;
    if (output !== null && now && now !== output) fire('output', now);
    output = now;
  }, 4000);
  const timeOf = text => { // "23:00", "23h", "9h30", "9 h 30", "21.15" → "HH:MM"
    const m = /^(\d{1,2})\s*[:hH.]\s*(\d{2})?\s*$/.exec(String(text || '').trim()) || /^(\d{1,2})$/.exec(String(text || '').trim());
    return m && Number(m[1]) < 24 && Number(m[2] || 0) < 60 ? `${String(m[1]).padStart(2, '0')}:${m[2] || '00'}` : '';
  };
  setInterval(() => { // a time of day, once
    const d = new Date(), hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (hm !== clock) { clock = hm; for (const r of rules) if (r.on && r.when === 'time' && timeOf(r.whenArg) === hm) r.then.forEach(act); }
  }, 15000);
  let focusWas = false;
  setInterval(() => { const on = Boolean(window.__winlandFocus?.active()); if (on !== focusWas) { fire(on ? 'focusStart' : 'focusEnd'); focusWas = on; } }, 2000);
  // Claude Code done while you are away; the summary waits until you are back
  let claudeWas = '', pending = null;
  setInterval(async () => {
    const cc = (window.__winlandMonitorIndicator || []).find(p => p.provider === 'claudecode'), st = cc?.state || '';
    if (st === 'done' && claudeWas && claudeWas !== 'done') {
      const idle = (await api.idleTime?.().catch(() => null))?.seconds ?? 0;
      if (idle > 120) { fire('claudeAway'); pending = { at: Date.now(), project: cc.source?.title || '', prompt: cc.prompt || '', last: cc.lastMessage || '' }; }
    }
    claudeWas = st;
    if (pending && summaryWaiting) {
      const idle = (await api.idleTime?.().catch(() => null))?.seconds ?? 99;
      if (idle < 5) { // you are back
        const p = pending; pending = null; summaryWaiting = false;
        window.__winlandCard?.({ app: 'Claude Code', icon: '✳', colour: '#d97757', title: `${T('Pendant ton absence', 'While you were away')}${p.project ? ' · ' + p.project : ''}`,
          body: (p.last || p.prompt || T('La tâche est terminée.', 'The task is done.')).replace(/\s+/g, ' ').slice(0, 220), sound: 'done', ms: 15000 });
      }
    }
  }, 2500);

  // ---------- the page ----------
  const root = document.createElement('section'); root.id = 'winland-rules'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#winland-rules{position:absolute;z-index:60;display:none;color:#fff;font:12px/1.4 Inter,"Segoe UI",sans-serif;pointer-events:auto}
#winland-rules *{box-sizing:border-box}
#winland-rules .ar-wrap{height:100%;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:12px}
#winland-rules .ar-col{min-height:0;overflow:auto;scrollbar-width:none;display:flex;flex-direction:column;gap:6px}
#winland-rules small.h{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#8e8e93;font-weight:600}
#winland-rules .ar-rule{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:12px;background:#1c1c1e}
#winland-rules .ar-rule b{display:block;font-size:12.5px}#winland-rules .ar-rule span{display:block;color:#8e8e93;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#winland-rules .ar-rule div{flex:1;min-width:0}
#winland-rules button,#winland-rules select,#winland-rules input{border:0;border-radius:9px;background:#2c2c2e;color:#fff;font:600 11.5px Inter,"Segoe UI",sans-serif;height:28px;padding:0 9px}
#winland-rules input{font-weight:500;outline:0;min-width:0}
#winland-rules .sw{width:34px;height:20px;border-radius:10px;background:#3a3a3c;position:relative;padding:0;flex:none}
#winland-rules .sw::after{content:"";position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s}
#winland-rules .sw.on{background:#30d158}#winland-rules .sw.on::after{left:16px}
#winland-rules .ar-idea{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 6px 5px 10px;border-radius:10px;background:#141416;flex:none}
#winland-rules .ar-idea button{height:24px;width:28px;padding:0}
#winland-rules .ar-form{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;padding:10px;border-radius:12px;background:#141416;flex:none}
#winland-rules .ar-rule{flex:none}
#winland-rules .ar-form .row{display:flex;gap:6px}#winland-rules .ar-form .row > *{flex:1;min-width:0}
#winland-rules .add{background:#0a84ff}`;
  document.head.appendChild(style);
  const label = (table, k) => T(table[k]?.fr || k, table[k]?.en || k);
  const describe = r => `${label(WHEN, r.when)}${r.whenArg ? ' « ' + r.whenArg + ' »' : ''} → ${r.then.map(([k, a]) => label(THEN, k) + (a ? ' ' + a : '')).join(', ')}`;
  let draft = { when: 'game', whenArg: '', then: 'mode', thenArg: '' };
  function render() {
    const mine = rules.map((r, i) => `<div class="ar-rule"><button type="button" class="sw ${r.on ? 'on' : ''}" data-toggle="${i}"></button><div><b>${esc(r.name || label(WHEN, r.when))}</b><span title="${esc(describe(r))}">${esc(describe(r))}</span></div><button type="button" data-del="${i}">✕</button></div>`).join('')
      || `<div class="ar-rule"><div><b>${T('Aucune automatisation', 'No automations yet')}</b><span>${T('Ajoute une idée à droite, ou crée la tienne.', 'Add an idea on the right, or make your own.')}</span></div></div>`;
    const ideas = IDEAS.filter(x => !rules.some(r => r.idea === x.name.fr)).map((x, i) => `<div class="ar-idea"><span>${esc(T(x.name.fr, x.name.en))}</span><button type="button" class="add" data-idea="${IDEAS.indexOf(x)}">+</button></div>`).join('');
    const opt = (table, sel) => Object.keys(table).map(k => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(label(table, k))}</option>`).join('');
    root.innerHTML = `<div class="ar-wrap"><div class="ar-col"><small class="h">${T('Créer', 'Create')}</small><div class="ar-form">
        <div class="row"><select data-f="when">${opt(WHEN, draft.when)}</select>${WHEN[draft.when].arg ? `<input data-f="whenArg" placeholder="${esc(label({ x: WHEN[draft.when].arg }, 'x'))}" value="${esc(draft.whenArg)}">` : ''}</div>
        <div class="row"><select data-f="then">${opt(THEN, draft.then)}</select>${THEN[draft.then].arg ? `<input data-f="thenArg" placeholder="${esc(label({ x: THEN[draft.then].arg }, 'x'))}" value="${esc(draft.thenArg)}">` : ''}</div>
        <button type="button" class="add" data-create="1">${T('Ajouter', 'Add')}</button></div>
      <small class="h" style="margin-top:6px">${T('Mes automatisations', 'My automations')}</small>${mine}</div>
      <div class="ar-col"><small class="h">${T('Idées', 'Ideas')}</small>${ideas || `<span style="color:#8e8e93">${T('Toutes ajoutées ✓', 'All added ✓')}</span>`}</div></div>`;
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.toggle) { const r = rules[Number(b.dataset.toggle)]; r.on = !r.on; save(); render(); sound('click'); }
    else if (b.dataset.del) { rules.splice(Number(b.dataset.del), 1); save(); render(); sound('click'); }
    else if (b.dataset.idea) { const x = IDEAS[Number(b.dataset.idea)]; rules.push({ on: true, idea: x.name.fr, name: T(x.name.fr, x.name.en), when: x.when, whenArg: x.whenArg || '', then: x.then }); save(); render(); window.__winlandChime?.('pop'); }
    else if (b.dataset.create) { rules.push({ on: true, name: label(WHEN, draft.when), when: draft.when, whenArg: WHEN[draft.when].arg ? draft.whenArg.trim() : '', then: [[draft.then, THEN[draft.then].arg ? draft.thenArg.trim() : '']] }); draft.whenArg = ''; draft.thenArg = ''; save(); render(); window.__winlandChime?.('pop'); }
  });
  root.addEventListener('change', e => { const f = e.target.dataset.f; if (f) { draft[f] = e.target.value; if (f === 'when' || f === 'then') { draft[f + 'Arg'] = ''; render(); } } });
  root.addEventListener('input', e => { const f = e.target.dataset.f; if (f === 'whenArg' || f === 'thenArg') draft[f] = e.target.value; });
  window.__winlandRules = { list: () => rules.map(describe), fire };

  let shown = false;
  (function position() {
    const show = currentView === 'rules' && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) { window.__winlandPage.place(root, contentRect()); if (!shown) { shown = true; render(); } } else shown = false;
    requestAnimationFrame(position);
  })();
  canvas.addEventListener('click', e => { if (inside(e.clientX, e.clientY, hit.rulesApp)) { e.preventDefault(); e.stopImmediatePropagation(); setView('rules'); setMode('expanded'); } }, true);
})();
