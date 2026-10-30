'use strict';
// Phone page: turn the Wi-Fi remote on, scan the QR code, type the 6-digit code shown here, done (remote-main.cjs,
// remote-phone.html). The Stream Deck button opens the editor of the phone's buttons (deck-main.cjs). While it is on,
// the island tells the phone what happens (Claude Code, music, focus, microphone, mode) and does what the phone asks.
(function remote() {
  const api = window.winland;
  if (!api?.remoteInfo) return;
  const prefs = () => window.__winlandPrefs?.() || {};
  const T = (fr, en) => prefs().lang === 'en' ? en : fr;
  const tr = s => window.__winlandTr ? window.__winlandTr(String(s || '')) : String(s || '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const I = (name, size = 15) => window.WinLandIcons ? window.WinLandIcons.svg(name, size) : '';
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const root = document.createElement('section'); root.id = 'winland-remote'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#winland-remote{position:absolute;z-index:60;display:none;color:#fff;font:12px/1.4 Inter,"Segoe UI",sans-serif;pointer-events:auto}
#winland-remote *{box-sizing:border-box}
#winland-remote .rm-wrap{height:100%;display:flex;gap:16px;align-items:center;min-width:0}
#winland-remote .rm-qr{width:148px;height:148px;border-radius:14px;background:#fff;padding:5px;flex:none;display:grid;place-items:center}
#winland-remote .rm-qr svg{width:100%;height:100%}
#winland-remote .rm-qr.off{background:#1c1c1e;color:#636366}
#winland-remote .rm-qr.off svg{width:44px;height:44px}
#winland-remote .rm-side{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}
#winland-remote .rm-cap{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#8e8e93;font-weight:600}
#winland-remote .rm-title{font-size:15px;font-weight:700;letter-spacing:-.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#winland-remote .rm-text{color:#a1a1ab;font-size:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#winland-remote .rm-code{display:flex;align-items:baseline;gap:10px}
#winland-remote .rm-code b{font:750 28px ui-monospace,Consolas,monospace;letter-spacing:.12em;line-height:1}
#winland-remote .rm-code small{color:#8e8e93;font-size:11px;white-space:nowrap}
#winland-remote .rm-line{color:#8e8e93;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px}
#winland-remote .rm-line svg{flex:none}
#winland-remote .rm-row{display:flex;gap:6px;margin-top:2px;flex-wrap:nowrap;min-width:0}
#winland-remote button{border:0;border-radius:9px;height:28px;padding:0 10px;background:#2c2c2e;color:#fff;font:600 11.5px Inter,"Segoe UI",sans-serif;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex:none;cursor:pointer}
#winland-remote button:hover{filter:brightness(1.2)}
#winland-remote button.go{background:#0a84ff}#winland-remote button.deck{background:#3a3a3c}
#winland-remote .err{color:#ff9f0a}`;
  document.head.appendChild(style);
  let info = null, wanted = store.get('winland:remote', false), poll = null;
  async function refresh() { info = await api.remoteInfo().catch(() => null); render(); }
  const clock = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  let drawn = '';
  function render() {
    if (currentView !== 'remote') return;
    const on = Boolean(info?.on), phones = info?.devices?.length || 0;
    // only the countdown changes every second: the rest is redrawn when it changes (a click never lands on a vanished button)
    const key = JSON.stringify([on, info?.code, phones, info?.error, Boolean(info?.lockedFor), info?.url, prefs().lang]), left = root.querySelector('.rm-code small');
    if (key === drawn && left) { left.textContent = info.lockedFor ? T('trop d’essais, pause', 'too many tries, paused') : T(`change dans ${clock(info.codeLeft)}`, `changes in ${clock(info.codeLeft)}`); return; }
    drawn = key;
    let qr = ''; try { qr = on && info.url ? window.__winlandQR(info.url, 'M') : ''; } catch {}
    const deckBtn = `<button type="button" class="deck" data-deck="1">${I('grid', 14)}Stream Deck</button>`;
    const side = on ? `<div class="rm-cap">${T('Code de connexion', 'Pairing code')}</div>
        <div class="rm-code"><b>${esc((info.code || '').replace(/(\d{3})(\d{3})/, '$1 $2'))}</b><small>${info.lockedFor ? T('trop d’essais, pause', 'too many tries, paused') : T(`change dans ${clock(info.codeLeft)}`, `changes in ${clock(info.codeLeft)}`)}</small></div>
        <div class="rm-line">${I('phone', 13)}${phones ? T(`${phones} téléphone${phones > 1 ? 's' : ''} connecté${phones > 1 ? 's' : ''}`, `${phones} phone${phones > 1 ? 's' : ''} paired`) : T('Scanne le QR code, puis tape ce code', 'Scan the QR code, then type this code')}</div>
        ${info.error ? `<div class="rm-line err">${esc(info.error)}</div>` : ''}
        <div class="rm-row"><button type="button" data-onoff="1">${I('power', 14)}${T('Éteindre', 'Turn off')}</button>${deckBtn}${phones ? `<button type="button" data-forget="1" title="${T('Il faudra retaper un code sur chaque téléphone', 'Each phone will need a new code')}">${I('x', 14)}${T('Déconnecter', 'Disconnect')}</button>` : ''}</div>`
      : `<div class="rm-title">${T('Ton téléphone comme télécommande', 'Your phone as a remote')}</div>
        <div class="rm-text">${T('Pilote Claude, la musique et le micro, ou tes propres boutons (Stream Deck). Sur ton Wi-Fi uniquement.', 'Control Claude, music and the mic, or your own buttons (Stream Deck). On your Wi-Fi only.')}</div>
        ${info?.error ? `<div class="rm-line err">${esc(info.error)}</div>` : ''}
        <div class="rm-row"><button type="button" class="go" data-onoff="1">${I('power', 14)}${T('Allumer', 'Turn on')}</button>${deckBtn}</div>`;
    root.innerHTML = `<div class="rm-wrap"><div class="rm-qr ${qr ? '' : 'off'}">${qr || I('phone', 44)}</div><div class="rm-side">${side}</div></div>`;
  }
  root.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return; sound('click');
    if (b.dataset.onoff) { wanted = !info?.on; store.set('winland:remote', wanted); info = await api.remoteSet(wanted).catch(() => null); render(); }
    else if (b.dataset.forget) { info = await api.remoteForget('').catch(() => null); render(); }
    else if (b.dataset.deck) api.deckEditor?.(prefs().lang);
  });
  api.onRemoteChanged?.(() => { if (currentView === 'remote') refresh(); else window.__winlandChime?.('pop'); });
  if (wanted) api.remoteSet(true).then(r => { info = r; }).catch(() => {}); // it was on last time

  // ---------- what the phone sees ----------
  setInterval(() => {
    if (!info?.on) return;
    const cc = (window.__winlandMonitorIndicator || []).find(p => p.provider === 'claudecode' && p.connected) || {};
    const perm = cc.permission;
    api.remoteState({
      claude: { state: cc.state || '', detail: tr(cc.detail), project: cc.source?.title || '', question: perm ? '' : String(cc.question || '').slice(0, 300), sessionId: cc.sessionId || '',
        permission: perm?.kind === 'tool' ? tr(perm.tool) : '', permissionDetail: perm?.kind === 'tool' ? String(perm.what || '').slice(0, 200) : '' },
      music: { title: spotifyState?.track?.name || '', artist: spotifyState?.track?.artist || '', playing: Boolean(spotifyState?.is_playing) },
      focus: { active: Boolean(window.__winlandFocus?.active()), label: window.__winlandFocus?.active() ? window.__winlandFocus.label() : '' },
      micMuted: Boolean(window.__winlandMic?.muted()), mode: window.__winlandModes?.get() || 'normal'
    });
  }, 1500);
  // ---------- what the phone asks (the remote's buttons, and the Stream Deck buttons the island does) ----------
  api.onRemoteDo?.(a => {
    if (a.kind === 'allow' || a.kind === 'deny') { if (a.sessionId) api.aiMonitorHooksDecide(a.sessionId, a.kind); }
    else if (['play', 'pause', 'next', 'previous'].includes(a.kind)) { api.spotifyControl(a.kind); setTimeout(() => { if (typeof refreshSpotify === 'function') refreshSpotify(); }, 400); }
    else if (a.kind === 'focus') window.__winlandFocus?.toggle();
    else if (a.kind === 'mic') window.__winlandMic?.toggle();
    else if (a.kind === 'mode') window.__winlandModes?.set(a.value);
    else if (a.kind === 'deck') {
      const x = a.action || {};
      if (x.kind === 'mic') window.__winlandMic?.toggle();
      else if (x.kind === 'focus') window.__winlandFocus?.toggle();
      else if (x.kind === 'mode') window.__winlandModes?.set(x.mode || 'normal');
      else if (x.kind === 'timer') { const min = parseFloat(String(x.minutes || '').replace(',', '.')); if (min > 0) window.__winlandTimers?.add(min, x.label || '', 'timer'); }
    }
    window.__winlandFeel?.('happy', 700);
  });

  let shown = false;
  (function position() {
    const show = currentView === 'remote' && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) { window.__winlandPage.place(root, contentRect()); if (!shown) { shown = true; refresh(); poll = setInterval(refresh, 1000); } } // the code and its countdown
    else if (shown) { shown = false; clearInterval(poll); }
    requestAnimationFrame(position);
  })();
  canvas.addEventListener('click', e => { if (inside(e.clientX, e.clientY, hit.remoteApp)) { e.preventDefault(); e.stopImmediatePropagation(); setView('remote'); setMode('expanded'); } }, true);
})();
