'use strict';
// Live things around the island, all on this PC:
// - Windows notifications (Discord, Outlook, Teams…) as a card under the island
// - the microphone of the whole PC during calls: a button on the island, Ctrl+Alt+M, a red dot while it is off
// - the text of a new screenshot to the clipboard (Windows' own OCR)
// - reminders ("in 20 min: call Julie") and several timers at once
// - Pip takes care of you: rest your eyes, drink water, sleepy at night
// - modes in one click: meeting, night, streaming (also used by the command palette and the automations)
(function live() {
  const api = window.winland;
  if (!api) return;
  const prefs = () => window.__winlandPrefs?.() || {};
  const en = () => prefs().lang === 'en';
  const T = (fr, eng) => en() ? eng : fr;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  // ---------- modes ----------
  // normal · meeting (microphone off, nothing interrupts) · night (dark, quieter) · stream (island hidden and silent)
  let mode = store.get('winland:mode', 'normal'), before = store.get('winland:mode-before', null);
  let micMuted = false, mutedByMode = store.get('winland:mode-muted', false), micUsers = []; // the microphone of the whole PC (see below)
  window.__winlandMode = () => mode;
  window.__winlandDnd = () => mode === 'meeting' || mode === 'stream';
  const MODES = {
    normal: { fr: 'Normal', en: 'Normal', icon: '🏝️' },
    meeting: { fr: 'Réunion', en: 'Meeting', icon: '🎙️' },
    night: { fr: 'Nuit', en: 'Night', icon: '🌙' },
    stream: { fr: 'Streaming', en: 'Streaming', icon: '🔴' }
  };
  function setMode(next) {
    if (!MODES[next] || next === mode) return;
    if (mode === 'meeting' && micMuted && mutedByMode) { api.micSet(false); micMuted = false; }
    mutedByMode = false;
    if (mode === 'night' && before) { window.__winlandSetPref?.('theme', before.theme); if (before.volume != null) api.volumeSet?.(before.volume); }
    before = null;
    mode = next; store.set('winland:mode', mode);
    if (mode === 'meeting' && !micMuted) { api.micSet(true); micMuted = true; mutedByMode = true; }
    if (mode === 'night') { // dark, and the volume down to 30 % at most (never louder)
      const level = window.__winlandSysVolume?.level; before = { theme: prefs().theme, volume: level ?? null };
      window.__winlandSetPref?.('theme', 'dark'); if (level == null || level > 30) api.volumeSet?.(30);
    }
    store.set('winland:mode-before', before); store.set('winland:mode-muted', mutedByMode);
    window.__winlandUpdateQuiet?.();
    if (mode !== 'stream') flash(`${MODES[mode].icon} ${T('Mode', 'Mode')} ${T(MODES[mode].fr, MODES[mode].en)}`, 2200);
  }
  window.__winlandModes = { list: () => Object.entries(MODES).map(([id, m]) => ({ id, label: T(m.fr, m.en), icon: m.icon })), set: setMode, get: () => mode };

  // ---------- a card under the island (notifications, reminders, care) ----------
  const style = document.createElement('style'); style.textContent = `
#winland-card{position:absolute;z-index:80;left:-999px;top:0;width:380px;display:none;gap:12px;align-items:center;padding:12px 16px;border-radius:22px;background:#000;color:#fff;
  box-shadow:0 16px 40px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.08);font:13px/1.35 Inter,"Segoe UI",sans-serif;pointer-events:none;
  transform-origin:50% 0;transition:opacity .25s var(--wl-ease-out),transform .55s var(--wl-spring-bounce)}
#winland-card.in{opacity:1;transform:none}#winland-card:not(.in){opacity:0;transform:scale(.92) translateY(-10px);transition-duration:.18s;transition-timing-function:ease-in-out} /* it leaves the way it came, faster */
#winland-card .ic{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;flex:none;font-weight:800;font-size:16px;background:var(--c,#2c2c2e)}
#winland-card .tx{min-width:0;flex:1}
#winland-card small{display:block;color:#a1a1ab;font-size:11px;font-weight:650;letter-spacing:.02em;text-transform:uppercase}
#winland-card b{display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#winland-card span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#d1d1d6}
#winland-mic{position:absolute;z-index:71;left:0;top:0;display:none;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:11px;background:#1c1c1e;color:#fff;font:700 11px Inter,sans-serif;pointer-events:none}
#winland-mic.off{background:#ff3b30;box-shadow:0 0 12px rgba(255,59,48,.8)}
#winland-mic svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round}`;
  document.head.appendChild(style);
  const card = document.createElement('div'); card.id = 'winland-card'; document.body.appendChild(card);
  const queue = []; let showing = null, cardTimer = null;
  const COLOURS = ['#5865f2', '#0a84ff', '#30d158', '#ff9f0a', '#bf5af2', '#ff375f', '#64d2ff'];
  const colourOf = name => COLOURS[[...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLOURS.length];
  function cardShow(item) { queue.push(item); if (!showing) next(); }
  function next() {
    showing = queue.shift(); if (!showing) { card.classList.remove('in'); setTimeout(() => { if (!showing) card.style.display = 'none'; }, 300); return; }
    const c = showing;
    card.innerHTML = `<div class="ic" style="--c:${c.colour || colourOf(c.app)}">${esc(c.icon || String(c.app || '?').trim()[0]?.toUpperCase() || '•')}</div>
      <div class="tx"><small>${esc(c.app || 'WinLand')}</small><b>${esc(c.title || '')}</b>${c.body ? `<span>${esc(c.body)}</span>` : ''}</div>`;
    placeCard(); card.style.display = 'flex'; requestAnimationFrame(() => card.classList.add('in'));
    api.revealFor?.(c.ms || 6000); // over a big window the island comes out for the card
    window.__winlandChime?.(c.sound || 'pop');
    clearTimeout(cardTimer); cardTimer = setTimeout(next, c.ms || 6000);
  }
  window.__winlandCard = cardShow;
  function placeCard() { card.style.left = Math.round(islandBounds.x + islandBounds.width / 2 - 190) + 'px'; card.style.top = Math.round(islandBounds.y + islandBounds.height + 10) + 'px'; }
  function place() { // under the island, wherever it is (started at the end, once everything exists)
    if (card.style.display !== 'none') placeCard();
    placeMic();
    requestAnimationFrame(place);
  }
  const flash = (text, ms) => window.__winlandFlash?.(text, ms);

  // ---------- Windows notifications ----------
  api.onNotif?.(n => {
    if (prefs().notifIsland === false || window.__winlandDnd?.() || window.__winlandQuiet?.()) return;
    if (/^(winland|electron)$/i.test(String(n?.app || ''))) return; // our own
    cardShow({ app: n.app, title: n.title, body: n.body, ms: 6500 });
    window.__winlandAutomation?.('notification', n);
  });

  // ---------- the microphone of the whole PC ----------
  const mic = document.createElement('div'); mic.id = 'winland-mic'; document.body.appendChild(mic);
  const MIC = '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  const MIC_OFF = '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16"/></svg>';
  function placeMic() {
    const on = prefs().micButton !== false && (micMuted || micUsers.length) && mode !== 'stream';
    mic.style.display = on ? 'flex' : 'none'; if (!on) return;
    const look = (micMuted ? 'off' : 'on') + en(); // its content changes only when the state does, not every frame
    if (mic.dataset.look !== look) { mic.dataset.look = look; mic.className = micMuted ? 'off' : ''; mic.innerHTML = (micMuted ? MIC_OFF : MIC) + (micMuted ? T('Coupé', 'Off') : ''); }
    const w = mic.offsetWidth || 30;
    mic.style.transform = `translate(${Math.round(islandBounds.x + islandBounds.width - w - 40)}px,${Math.round(islandBounds.y + Math.min(islandBounds.height, 38) / 2 - 11)}px)`;
    window.__winlandMicRect = { x: islandBounds.x + islandBounds.width - w - 40, y: islandBounds.y, width: w, height: Math.min(islandBounds.height, 38) };
  }
  api.onMicMute?.(s => { micMuted = Boolean(s?.muted); });
  api.micGet?.().then(s => { micMuted = Boolean(s?.muted); }).catch(() => {});
  api.onPrivacy?.(p => { micUsers = (p?.mic || []).filter(n => !/winland|electron/i.test(n)); });
  api.onMicKey?.(s => flash(s?.muted ? `🔴 ${T('Micro coupé', 'Microphone off')}` : `🎙️ ${T('Micro ouvert', 'Microphone on')}`, 1600));
  canvas.addEventListener('click', e => { // a click on the microphone pill
    const r = window.__winlandMicRect; if (!r || mic.style.display === 'none') return;
    if (e.clientX >= r.x && e.clientX <= r.x + r.width && e.clientY >= r.y && e.clientY <= r.y + r.height) {
      e.preventDefault(); e.stopImmediatePropagation(); api.micSet(!micMuted); micMuted = !micMuted;
      flash(micMuted ? `🔴 ${T('Micro coupé', 'Microphone off')}` : `🎙️ ${T('Micro ouvert', 'Microphone on')}`, 1400);
    }
  }, true);
  window.__winlandMic = { toggle: () => { api.micSet(!micMuted); micMuted = !micMuted; return micMuted; }, set: on => { api.micSet(on); micMuted = on; }, muted: () => micMuted };

  // ---------- the text of a new screenshot ----------
  api.onNewFile?.(async ({ kind, path }) => {
    if (kind !== 'shot' || prefs().ocrShots === false) return;
    const r = await api.ocr(path, true).catch(() => null);
    const words = String(r?.text || '').trim().split(/\s+/).filter(Boolean).length;
    if (words) setTimeout(() => flash(`📝 ${T('Texte copié', 'Text copied')} · ${words} ${T(words > 1 ? 'mots' : 'mot', words > 1 ? 'words' : 'word')}`, 2600), 1800);
  });

  // ---------- reminders and timers ----------
  let timers = store.get('winland:timers', []).filter(t => t.at > Date.now() - 60000);
  const saveTimers = () => store.set('winland:timers', timers);
  const left = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
  window.__winlandTimers = {
    add(minutes, label, kind = 'timer') { const t = { id: Date.now() + Math.random(), at: Date.now() + minutes * 60000, label: String(label || '').slice(0, 80), kind }; timers.push(t); timers.sort((a, b) => a.at - b.at); saveTimers();
      flash(`${kind === 'reminder' ? '🔔' : '⏱'} ${label || T('Minuteur', 'Timer')} · ${T('dans', 'in')} ${left(minutes * 60000)}`, 2200); return t; },
    list: () => timers.map(t => ({ ...t, left: left(t.at - Date.now()) })),
    cancel(id) { timers = timers.filter(t => t.id !== id); saveTimers(); }
  };
  const baseMessage = window.__winlandCompactMessage;
  window.__winlandCompactMessage = () => { // the nearest timer in the small island
    const own = baseMessage?.() || ''; if (own || !timers.length) return own;
    const t = timers[0]; return `${t.kind === 'reminder' ? '🔔' : '⏱'} ${left(t.at - Date.now())}${t.label ? ' · ' + t.label : ''}`;
  };
  setInterval(() => {
    const now = Date.now(), due = timers.filter(t => t.at <= now); if (!due.length) return;
    timers = timers.filter(t => t.at > now); saveTimers();
    for (const t of due) {
      cardShow({ app: t.kind === 'reminder' ? T('Rappel', 'Reminder') : T('Minuteur', 'Timer'), icon: t.kind === 'reminder' ? '🔔' : '⏱', colour: '#ff9f0a', title: t.label || T('C’est l’heure !', 'Time’s up!'), sound: 'done', ms: 9000 });
      window.__winlandSay?.(t.label || T('Minuteur terminé', 'Timer done'), t.kind === 'reminder' ? T('Rappel', 'Reminder') : T('Minuteur', 'Timer'));
      window.__winlandFeel?.('surprised', 1500);
    }
  }, 1000);

  // ---------- several screens: the island follows the mouse (main.js moves the window) ----------
  let following = null;
  setInterval(() => { const on = Boolean(prefs().followMouse); if (on !== following) { following = on; api.followMouse?.(on); } }, 1500);

  // ---------- Pip on the desktop (companion-main.cjs): follows the setting; a click on him brings him back here ----------
  let onDesk = null;
  setInterval(() => { const on = Boolean(prefs().pipDesk); if (on !== onDesk) { onDesk = on; api.pipDesk?.(on); } }, 1000);
  api.onPipHome?.(() => { onDesk = false; window.__winlandSetPref?.('pipDesk', false); window.__winlandFeel?.('happy', 1500); window.__winlandChime?.('hello'); flash(`🏝️ ${T('Pip est rentré dans l’island', 'Pip is back in the island')}`, 2000); });

  // ---------- Pip takes care of you ----------
  let eyesAt = Date.now(), waterAt = Date.now(), nightShown = '';
  setInterval(() => {
    const p = prefs(), now = Date.now(), d = new Date();
    api.idleTime?.().then(r => { if ((r?.seconds || 0) > 300) eyesAt = Date.now(); }).catch(() => {}); // away: the eyes rest already
    if (window.__winlandQuiet?.() || window.__winlandDnd?.()) return;
    if (p.careEyes && now - eyesAt > 20 * 60000) { eyesAt = now; cardShow({ app: 'Pip', icon: '👀', colour: '#30d158', title: T('Repose tes yeux', 'Rest your eyes'), body: T('Regarde au loin pendant 20 secondes.', 'Look far away for 20 seconds.'), ms: 20000 }); }
    if (p.careWater && now - waterAt > 90 * 60000) { waterAt = now; cardShow({ app: 'Pip', icon: '💧', colour: '#0a84ff', title: T('Un verre d’eau ?', 'A glass of water?'), body: T('Ça fait un moment.', 'It’s been a while.'), ms: 9000 }); }
    const late = d.getHours() >= 23 || d.getHours() < 5;
    if (p.nightYawn !== false && late) {
      window.__winlandFeel?.('sleep', 2500);
      const key = d.toDateString(); if (nightShown !== key && d.getHours() === 23) { nightShown = key; cardShow({ app: 'Pip', icon: '🌙', colour: '#5e5ce6', title: T('Il se fait tard…', 'It’s getting late…'), body: T('Pense à aller dormir.', 'Time to think about sleep.'), ms: 9000 }); }
    }
  }, 60000);
  requestAnimationFrame(place);
})();

// ---------- smart clipboard: the action that fits what you copied (tools-ui.js shows it on each clip) ----------
(function smartClips() {
  const api = window.winland; if (!api) return;
  const prefs = () => window.__winlandPrefs?.() || {};
  const T = (fr, en) => prefs().lang === 'en' ? en : fr;
  const copy = (text, what) => { navigator.clipboard?.writeText(text).catch(() => {}); window.__winlandFlash?.(`📋 ${what}`, 1600); };
  window.__winlandSmartClip = raw => {
    if (prefs().smartClips === false) return null;
    const t = String(raw || '').trim(); if (!t) return null;
    if (/^[{[]/.test(t)) { try { const v = JSON.parse(t); if (typeof v === 'object' && v) return { label: T('Ranger le JSON', 'Tidy JSON'), run: () => copy(JSON.stringify(v, null, 2), T('JSON rangé et copié', 'Tidy JSON copied')) }; } catch {} }
    // with its #, or 6 characters mixing digits and letters (ff8800): "123", "add" or "decade" are not colours
    const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(t)?.[1] || (/^[0-9a-f]{6}$/i.test(t) && /\d/.test(t) && /[a-f]/i.test(t) ? t : '');
    if (hex || /^rgba?\([\d\s.,%]+\)$/i.test(t)) { const c = hex ? '#' + hex : t; return { label: T('Voir', 'See'), run: () => window.__winlandCard?.({ app: T('Couleur', 'Colour'), icon: ' ', colour: c, title: c, body: T('La couleur que tu as copiée', 'The colour you copied'), ms: 5000 }) }; }
    if (/(error|exception|traceback|failed|erreur|err!|cannot find|is not defined|undefined is not|segmentation fault|panicked at)/i.test(t) && t.length > 12)
      return { label: T('Demander à Pip', 'Ask Pip'), run: () => window.__winlandChatAsk?.(T('Explique-moi cette erreur et comment la corriger :\n', 'Explain this error and how to fix it:\n') + t) };
    const where = t.replace(/^"(.+)"$/, '$1'); // "Copy as path" puts quotes around it
    if (/^(https?:\/\/)\S+$/i.test(t) || /^([a-z]:[\\/]|\\\\|~[\\/])[^\n<>|"*?]+$/i.test(where)) return { label: T('Ouvrir', 'Open'), run: () => api.openCopied(where) };
    const digits = t.replace(/[\s.\-()]/g, '');
    if (/^(\+33|0033|0)[1-9]\d{8}$/.test(digits)) { const local = digits.replace(/^(\+33|0033)/, '0'); return { label: T('Formater', 'Format'), run: () => copy(local.replace(/(\d{2})(?=\d)/g, '$1 '), T('Numéro formaté', 'Number formatted')) }; }
    if (/^\+\d{8,15}$/.test(digits)) return { label: T('Formater', 'Format'), run: () => copy(digits.replace(/^(\+\d{1,3})(\d+)$/, (m, cc, rest) => cc + ' ' + rest.replace(/(\d{3})(?=\d)/g, '$1 ')), T('Numéro formaté', 'Number formatted')) };
    return null;
  };
})();

// ---------- today's agenda (the Windows calendar): a card 10 minutes before each appointment ----------
(function agenda() {
  const api = window.winland; if (!api?.agenda) return;
  const T = (fr, en) => window.__winlandPrefs?.().lang === 'en' ? en : fr;
  let today = [], warned = new Set();
  const hm = ms => new Date(ms).toLocaleTimeString(T('fr-FR', 'en-GB'), { hour: '2-digit', minute: '2-digit' });
  async function load() { const r = await api.agenda().catch(() => null); today = (r?.list || []).sort((a, b) => a.start - b.start); }
  window.__winlandAgenda = () => today.map(a => ({ ...a, time: a.allDay ? T('Journée', 'All day') : hm(a.start) }));
  setTimeout(load, 20000); setInterval(load, 5 * 60000);
  setInterval(() => {
    const now = Date.now();
    for (const a of today) if (!a.allDay && a.start - now <= 10 * 60000 && a.start - now > 0 && !warned.has(a.start + a.title)) {
      warned.add(a.start + a.title);
      window.__winlandCard?.({ app: T('Agenda', 'Calendar'), icon: '📅', colour: '#ff375f', title: a.title || T('Rendez-vous', 'Appointment'), body: `${hm(a.start)}${a.place ? ' · ' + a.place : ''} · ${T('dans', 'in')} ${Math.ceil((a.start - now) / 60000)} min`, sound: 'question', ms: 12000 });
    }
  }, 30000);
})();
