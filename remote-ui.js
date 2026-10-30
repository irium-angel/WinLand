'use strict';
// Phone page: turn the Wi-Fi remote on, scan the QR code, done (remote-main.cjs, remote-phone.html). While it is on,
// the island tells the phone what happens (Claude Code, music, focus, microphone) and does what the phone asks.
(function remote() {
  const api = window.winland;
  if (!api?.remoteInfo) return;
  const prefs = () => window.__winlandPrefs?.() || {};
  const T = (fr, en) => prefs().lang === 'en' ? en : fr;
  const tr = s => window.__winlandTr ? window.__winlandTr(String(s || '')) : String(s || '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const root = document.createElement('section'); root.id = 'winland-remote'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#winland-remote{position:absolute;z-index:60;display:none;color:#fff;font:12.5px/1.45 Inter,"Segoe UI",sans-serif;pointer-events:auto}
#winland-remote .rm-wrap{height:100%;display:flex;gap:20px;align-items:center}
#winland-remote .rm-qr{width:190px;height:190px;border-radius:16px;background:#fff;padding:6px;flex:none;display:grid;place-items:center}
#winland-remote .rm-qr svg{width:100%;height:100%}
#winland-remote .rm-qr.off{background:#1c1c1e;color:#8e8e93;text-align:center;padding:20px;font-size:12px}
#winland-remote h3{font-size:18px;letter-spacing:-.3px}
#winland-remote p{color:#a1a1ab;margin-top:6px}
#winland-remote code{font:11px ui-monospace,Consolas,monospace;color:#d1d1d6;word-break:break-all}
#winland-remote .rm-row{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
#winland-remote button{border:0;border-radius:10px;height:32px;padding:0 14px;background:#2c2c2e;color:#fff;font:600 12.5px Inter,"Segoe UI",sans-serif}
#winland-remote button.on{background:#30d158}#winland-remote button.go{background:linear-gradient(135deg,#7c5cff,#1aa7ff)}
#winland-remote .err{color:#ff9f0a}`;
  document.head.appendChild(style);
  let info = null, wanted = store.get('winland:remote', false);
  async function refresh() { info = await api.remoteInfo().catch(() => null); render(); }
  function render() {
    if (currentView !== 'remote') return;
    const on = Boolean(info?.on);
    let qr = '';
    try { qr = on && info.url ? window.__winlandQR(info.url, 'M') : ''; } catch {}
    root.innerHTML = `<div class="rm-wrap"><div class="rm-qr ${qr ? '' : 'off'}">${qr || T('Allume la télécommande pour voir le QR code', 'Turn the remote on to see the QR code')}</div>
      <div><h3>${T('Ton téléphone comme télécommande', 'Your phone as a remote')}</h3>
      <p>${on ? T('Scanne ce code avec l’appareil photo de ton téléphone, connecté au même Wi-Fi.', 'Scan this code with your phone’s camera, on the same Wi-Fi.') : T('Vois si Claude a fini, autorise ses demandes, pilote la musique et le focus depuis ton canapé. Uniquement sur ton Wi-Fi.', 'See if Claude is done, answer its requests, control music and focus from your couch. Only on your Wi-Fi.')}</p>
      ${on && info.url ? `<p><code>${esc(info.url.replace(/#k=.*/, '#k=…'))}</code></p>` : ''}${info?.error ? `<p class="err">${esc(info.error)}</p>` : ''}
      <div class="rm-row"><button type="button" class="${on ? 'on' : 'go'}" data-onoff="1">${on ? T('Allumée · éteindre', 'On · turn off') : T('Allumer', 'Turn on')}</button>${on ? `<button type="button" data-key="1">${T('Nouveau code', 'New code')}</button>` : ''}</div>
      ${on ? `<p style="font-size:11px">${T('« Nouveau code » déconnecte tous les téléphones. Windows peut demander l’accès au réseau la première fois : choisis « Réseaux privés ».', '“New code” disconnects every phone. Windows may ask for network access the first time: choose “Private networks”.')}</p>` : ''}</div></div>`;
  }
  root.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return; sound('click');
    if (b.dataset.onoff) { wanted = !info?.on; store.set('winland:remote', wanted); info = await api.remoteSet(wanted).catch(() => null); render(); }
    if (b.dataset.key) { info = await api.remoteNewKey().catch(() => null); render(); }
  });
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
      micMuted: Boolean(window.__winlandMic?.muted())
    });
  }, 1500);
  // ---------- what the phone asks ----------
  api.onRemoteDo?.(a => {
    if (a.kind === 'allow' || a.kind === 'deny') { if (a.sessionId) api.aiMonitorHooksDecide(a.sessionId, a.kind); }
    else if (['play', 'pause', 'next', 'previous'].includes(a.kind)) { api.spotifyControl(a.kind); setTimeout(() => { if (typeof refreshSpotify === 'function') refreshSpotify(); }, 400); }
    else if (a.kind === 'focus') window.__winlandFocus?.toggle();
    else if (a.kind === 'mic') window.__winlandMic?.toggle();
    else if (a.kind === 'mode') window.__winlandModes?.set(a.value);
    window.__winlandFeel?.('happy', 700);
  });

  let shown = false;
  (function position() {
    const show = currentView === 'remote' && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) { window.__winlandPage.place(root, contentRect()); if (!shown) { shown = true; refresh(); } } else shown = false;
    requestAnimationFrame(position);
  })();
  canvas.addEventListener('click', e => { if (inside(e.clientX, e.clientY, hit.remoteApp)) { e.preventDefault(); e.stopImmediatePropagation(); setView('remote'); setMode('expanded'); } }, true);
})();
