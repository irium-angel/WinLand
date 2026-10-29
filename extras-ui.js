'use strict';
// Island extras (renderer): file tray, quick mirror, volume bar, battery warnings
// on the home screen, and the album colour used by the Spotify screen and sound wave.
(function islandExtras() {
  const api = window.winland;
  if (!api?.trayGet) return;
  const prefs = () => window.__winlandPrefs?.() || {};
  const say = (title, body) => window.__winlandSay?.(title, body);
  const badge = id => window.dispatchEvent(new CustomEvent('winland:badge', { detail: id }));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]));
  const VIEWS = ['tray', 'mirror'];
  // (page height and layout come from pages-ui.js)

  // ---------- DOM panel for the tray and mirror views (same place as the Claude Code screen) ----------
  const root = document.createElement('section'); root.id = 'winland-extras'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#winland-extras{position:absolute;z-index:60;display:none;color:#f4f7ef;font:12px/1.4 Inter, "Segoe UI", sans-serif;pointer-events:auto}
#winland-extras *{box-sizing:border-box}
#winland-extras{font-family:Inter,"Segoe UI",sans-serif;color:#fff}
#winland-extras button{border:0;cursor:pointer;font-family:inherit;color:#fff;background:transparent;padding:0}
#winland-extras .ex-hint{color:#8e8e93;font-size:13px}
#winland-extras .ex-row{display:flex;align-items:center;gap:2px;height:100%;overflow-x:auto;scrollbar-width:none}
#winland-extras .ex-file{position:relative;flex:none;width:78px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 2px;border-radius:10px;cursor:grab;text-align:center;animation:ex-in .3s cubic-bezier(.2,.9,.3,1) both;animation-delay:calc(var(--k) * 30ms)}
#winland-extras .ex-file:hover{background:#1c1c1e}
#winland-extras .ex-file:active{transform:scale(.97);transition:transform .1s ease-out}
#winland-extras .ex-file svg{flex:none;filter:drop-shadow(0 3px 8px rgba(0,0,0,.4))}
#winland-extras .ex-name{font-size:11px;line-height:14px;font-weight:600;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#winland-extras .ex-size{margin-top:-3px;font-size:10px;color:#8e8e93}
#winland-extras .ex-x{position:absolute;top:2px;right:6px;width:18px;height:18px;border-radius:50%;background:#3a3a3c;color:#fff;font-size:9px;line-height:18px;opacity:0;transition:opacity .15s}
#winland-extras .ex-file:hover .ex-x{opacity:1}
/* the drop zone: a dashed box, like a shelf you drop things on */
#winland-extras .ex-zone{height:100%;border:1.5px dashed #3a3a3c;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;text-align:center;transition:border-color .2s,background .2s}
#winland-extras .ex-zone svg{margin-bottom:4px}
#winland-extras .ex-zone b{font-size:13px;font-weight:600}
#winland-extras .ex-zone small{font-size:11px;color:#8e8e93}
#winland-extras.dragging .ex-zone{border-color:#fff;background:#1c1c1e}
#winland-extras .ex-slot{flex:none;width:58px;height:78px;margin-left:4px;border:1.5px dashed #3a3a3c;border-radius:10px;display:grid;place-items:center;transition:border-color .2s,background .2s}
#winland-extras.dragging .ex-slot{border-color:#fff;background:#1c1c1e}
#winland-extras .ex-catch{display:none}
#winland-extras.dragging .ex-catch{display:block}
#winland-extras.dragging .ex-zone .off{display:none}
@keyframes ex-in{0%{opacity:0;transform:translateY(8px) scale(.96)}}
@keyframes ex-pop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}#winland-extras video{width:100%;height:176px;object-fit:cover;border-radius:22px;transform:scaleX(-1);background:#0d0d10}`;
  document.head.appendChild(style);

  let trayFiles = [], trayError = '';
  async function loadTray() { const r = await api.trayGet(); if (r.ok) trayFiles = r.files; render(); }
  window.__winlandTrayReload = loadTray;
  window.__winlandTrayClear = async () => { for (const f of [...trayFiles]) { const r = await api.trayRemove(f.path).catch(() => null); if (r?.ok) trayFiles = r.files; } render(); };
  window.__winlandTrayCount = () => trayFiles.length;
  function render() {
    if (currentView === 'tray') {
      const n = trayFiles.length;
      const ext = name => (/\.([a-z0-9]{1,5})$/i.exec(name)?.[1] || '').toUpperCase();
      const fr = prefs().lang !== 'en'; // Ko / Mo in French, kB / MB in English
      const size = b => !b ? '' : b < 1e6 ? Math.max(1, Math.round(b / 1e3)) + (fr ? ' Ko' : ' kB') : (b / 1e6).toFixed(b < 1e7 ? 1 : 0).replace('.', fr ? ',' : '.') + (fr ? ' Mo' : ' MB');
      // a sheet of paper with a folded corner and its kind on a grey label (like a document icon in Finder)
      const paper = e => { const w = Math.max(22, e.length * 5.4 + 8);
        return `<svg width="38" height="48" viewBox="0 0 38 48" aria-hidden="true"><path d="M4 1h22l11 11v31a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4z" fill="#fff"/><path d="M26 1v7a4 4 0 0 0 4 4h7z" fill="#d1d1d6"/><path d="M7 19h18M7 24h22M7 29h14" stroke="#e5e5ea" stroke-width="2" stroke-linecap="round"/>${e ? `<rect x="5" y="34" width="${w}" height="10" rx="3" fill="#3a3a3c"/><text x="${5 + w / 2}" y="41.5" text-anchor="middle" font-family="Inter, sans-serif" font-size="6.5" font-weight="700" fill="#fff">${esc(e)}</text>` : ''}</svg>`; };
      const T = (nl, en) => window.__winlandPrefs?.().lang !== 'nl' ? en : nl;
      const plus = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
      const trayGlyph = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v9m-3.5-3.5L12 12l3.5-3.5"/><path d="M4 14l2-5h2M20 14l-2-5h-2M4 14v5h16v-5h-5l-1 2h-4l-1-2z"/></svg>`;
      root.innerHTML = n
        ? `<div class="ex-row">${trayFiles.map((f, i) => `<div class="ex-file" draggable="true" data-i="${i}" title="${esc(f.path)}" style="--k:${i}">${paper(ext(f.name))}<span class="ex-name">${esc(f.name.replace(/\.[^.]+$/, ''))}</span><span class="ex-size">${esc(size(f.size))}</span><button type="button" class="ex-x" data-x="${i}" title="Uit de lade halen" aria-label="Uit de lade halen">✕</button></div>`).join('')}<div class="ex-slot" title="${T('Sleep hierheen', 'Drop here')}">${plus}</div></div>`
          + (trayError ? `<p class="ex-hint" style="color:#ff4245">${esc(trayError)}</p>` : '')
        : `<div class="ex-zone">${trayGlyph}<b class="off">${T('Sleep bestanden hierheen', 'Drop files here')}</b><b class="ex-catch">${T('Laat los, ik vang hem!', 'Let go, I will catch it!')}</b><small>${T('Sleep ze er weer uit wanneer je wilt · klik om te openen', 'Drag them out any time · click to open')}</small></div>`;
      for (const el of root.querySelectorAll('.ex-file')) {
        const f = trayFiles[Number(el.dataset.i)];
        el.addEventListener('dragstart', e => { e.preventDefault(); api.trayDrag(f.path); });
        el.addEventListener('click', async e => { if (e.target.closest('.ex-x')) return; const r = await api.trayOpen(f.path); trayError = r.ok ? '' : r.error; render(); });
      }
      for (const x of root.querySelectorAll('[data-x]')) x.addEventListener('click', async () => {
        const r = await api.trayRemove(trayFiles[Number(x.dataset.x)].path); if (r.ok) trayFiles = r.files; render();
      });
    } else if (currentView === 'mirror') {
      if (!root.querySelector('video')) {
        root.innerHTML = `<video autoplay muted playsinline></video><p class="ex-hint" id="ex-cam">Even checken voor je videogesprek · de camera stopt als je weggaat</p>`;
        startCamera();
      }
    } else root.innerHTML = '';
  }

  // ---------- quick mirror ----------
  let stream = null;
  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: false });
      if (currentView !== 'mirror') return stopCamera();
      const video = root.querySelector('video'); if (video) video.srcObject = stream;
      badge('mirror');
    } catch { const p = root.querySelector('#ex-cam'); if (p) p.textContent = 'Geen camera gevonden, of Windows geeft geen toegang (Instellingen → Privacy → Camera).'; }
  }
  function stopCamera() { stream?.getTracks().forEach(t => t.stop()); stream = null; }

  // ---------- views in the canvas island ----------
  // ---------- the basket: while you drag a file over the island, WinLand walks under it with a basket ----------
  const basket = { on: false, seen: 0, x: null, y: null, vx: 0, caughtAt: -1e9, mouseX: null };
  window.__winlandBasket = () => {
    const t = performance.now(), catching = t - basket.caughtAt < 700;
    if (basket.on && t - basket.seen > 180) basket.on = false; // the drag left the island or ended
    return { show: basket.on || catching, wobble: catching ? Math.sin((t - basket.caughtAt) / 45) * (1 - (t - basket.caughtAt) / 700) : 0, vx: basket.vx };
  };
  const baseExpanded = drawExpanded;
  // Full-island drop zone while dragging: slides in, and shrinks away after the catch.
  let zoneIn = -1e9, zoneOut = -1e9, wasOn = false;
  function dropZone(t) {
    if (basket.on && !wasOn) zoneIn = t;
    if (!basket.on && wasOn) zoneOut = t;
    wasOn = basket.on;
    const k = basket.on ? Math.min(1, (t - zoneIn) / 260) : Math.max(0, 1 - (t - zoneOut) / 300);
    if (k <= 0) return false;
    const e = 1 - Math.pow(1 - k, 3), b = islandBounds, pad = 12;
    const w = (b.width - pad * 2) * (0.94 + 0.06 * e), h = (b.height - pad * 2) * (0.94 + 0.06 * e);
    const x = b.x + (b.width - w) / 2, y = (b.height - h) / 2;
    ctx.save(); ctx.globalAlpha = e;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 26); ctx.fillStyle = 'rgba(198,233,148,.07)'; ctx.fill();
    ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t / 30; ctx.lineWidth = 2; ctx.strokeStyle = '#c6e994'; ctx.shadowColor = '#c6e994'; ctx.shadowBlur = 12; ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur = 0;
    window.__winlandIcon?.('tray', b.x + b.width / 2, y + 48, 30, '#c6e994');
    text('Laat los, ik vang hem!', b.x + b.width / 2, y + 92, 18, '#ffffff', 700, 'center');
    text('Het bestand komt in je lade', b.x + b.width / 2, y + 112, 11, '#9aa596', 400, 'center');
    ctx.restore();
    return true;
  }
  drawExpanded = function (alpha) {
    if (!VIEWS.includes(currentView)) return baseExpanded(alpha);
    const PAGE = window.__winlandPage, area = contentRect(), t = performance.now();
    if (basket.on && t - basket.seen > 180) basket.on = false; // no more dragover: the drag left or ended
    const zone = currentView === 'tray' && dropZone(t);
    if (!zone || !basket.on) drawHeader(alpha * (basket.on ? 0 : 1));
    const home = { x: area.x + PAGE.ghost.x, y: area.y + PAGE.ghost.y };
    const sinceCatch = t - basket.caughtAt, holdBasket = currentView === 'tray' && (basket.on || sinceCatch < 1100);
    if (currentView === 'tray' && incoming && sinceCatch < INCOMING_MS) drawIncoming(area, sinceCatch);
    if (!holdBasket && currentView === 'tray') { basket.x = null; return; } // WinLand only shows while catching
    // Walks in from below, follows the mouse along the bottom while you drag, catches, then walks out again.
    const target = holdBasket
      ? { x: Math.min(area.x + area.width - 60, Math.max(area.x + 60, basket.mouseX ?? pointer.x)), y: !basket.on && sinceCatch > 650 ? islandBounds.height + 60 : islandBounds.height - 70 }
      : home;
    if (basket.x == null) { basket.x = target.x; basket.y = islandBounds.height + 40; } // walks in from below
    const nx = basket.x + (target.x - basket.x) * 0.18, ny = basket.y + (target.y - basket.y) * 0.18;
    basket.vx = nx - basket.x; basket.x = nx; basket.y = ny;
    PAGE.drawGhost(area, { x: basket.x, y: basket.y });
  };
  // After a drop: a card in the middle. The file drops in with a bounce, a bar fills up, then a check pops.
  const INCOMING_MS = 1500;
  let incoming = null;
  window.__winlandDragging = () => basket.on;
  window.__winlandTestDrop = names => { incoming = { names, chimed: false }; basket.caughtAt = performance.now(); }; // for test mode / videos
  function drawIncoming(area, k) {
    const ease = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3), back = t => { t = Math.max(0, Math.min(1, t)); return 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2); };
    const out = Math.max(0, Math.min(1, (INCOMING_MS - k) / 220)), appear = back(k / 260), W = 300, H = 92;
    const cx = area.x + area.width / 2, cy = area.y + area.height / 2 - 18, x = cx - W / 2, y = cy - H / 2;
    ctx.save(); ctx.globalAlpha = out; ctx.translate(cx, cy); ctx.scale(0.85 + 0.15 * appear, 0.85 + 0.15 * appear); ctx.translate(-cx, -cy);
    ctx.beginPath(); ctx.roundRect(x, y, W, H, 20); ctx.fillStyle = '#16181a'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(198,233,148,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    // the file: drops from above and bounces
    const drop = ease(k / 380), bounce = k > 380 && k < 640 ? Math.sin((k - 380) / 260 * Math.PI) * 6 : 0;
    const fx = x + 26, fy = y + 18 - (1 - drop) * 70 - bounce, fw = 40, fh = 52;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, W, H); ctx.clip();
    ctx.fillStyle = '#f4f7f2'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + fw - 12, fy); ctx.lineTo(fx + fw, fy + 12); ctx.lineTo(fx + fw, fy + fh); ctx.lineTo(fx, fy + fh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9d4cf'; ctx.beginPath(); ctx.moveTo(fx + fw - 12, fy); ctx.lineTo(fx + fw - 12, fy + 12); ctx.lineTo(fx + fw, fy + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9fb0a9'; for (let i = 0; i < 3; i++) ctx.fillRect(fx + 8, fy + 22 + i * 8, fw - 16 - (i === 2 ? 8 : 0), 3);
    ctx.restore();
    // name + bar + check
    const names = incoming.names, label = names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0];
    text(label, x + 84, y + 34, 13, '#f4f7f2', 700, 'left', W - 104);
    const fill = ease((k - 300) / 650), bx = x + 84, by = y + 50, bw = W - 108;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, 6, 3); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill();
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#c6e994'); g.addColorStop(1, '#7fd8ff');
    if (fill > 0) { ctx.beginPath(); ctx.roundRect(bx, by, Math.max(6, bw * fill), 6, 3); ctx.fillStyle = g; ctx.fill(); }
    const done = k > 980;
    if (done) {
      const p = back((k - 980) / 220); ctx.save(); ctx.translate(bx + 10, by + 26); ctx.scale(p, p);
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fillStyle = '#c6e994'; ctx.fill();
      ctx.strokeStyle = '#10180c'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-1, 3); ctx.lineTo(4.5, -3.5); ctx.stroke(); ctx.restore();
      text('In je lade', bx + 26, by + 30, 11.5, '#c6e994', 700);
      if (!incoming.chimed) { incoming.chimed = true; window.__winlandSfx?.ui('drop'); }
    } else text(names.length > 1 ? `${names.length} bestanden…` : 'Bezig…', bx, by + 30, 11, '#8f998d', 600);
    ctx.restore();
  }
  let shownView = null;
  function position() {
    const show = VIEWS.includes(currentView) && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    // While a file is dragged over the island, the whole island is the drop zone (canvas), so the page hides.
    const display = show && !(currentView === 'tray' && (basket.on || (incoming && performance.now() - basket.caughtAt < INCOMING_MS - 120))) ? 'block' : 'none';
    if (root.style.display !== display) root.style.display = display; // only write when it changes (runs every frame)
    if (show) window.__winlandPage.place(root, contentRect());
    const now = show ? currentView : null;
    if (now !== shownView) { shownView = now; if (now !== 'mirror') stopCamera(); if (now === 'tray') loadTray(); else render(); }
    requestAnimationFrame(position);
  }
  requestAnimationFrame(position);
  canvas.addEventListener('click', event => {
    if (inside(event.clientX, event.clientY, hit.clockApp)) { event.preventDefault(); event.stopImmediatePropagation(); api.openClock?.(); return; } // the clock opens Windows' Clock app
    for (const [key, view] of [['trayApp', 'tray'], ['mirrorApp', 'mirror'], ['settingsApp', 'settings']]) {
      if (inside(event.clientX, event.clientY, hit[key])) { event.preventDefault(); event.stopImmediatePropagation(); setView(view); return; }
    }
  }, true);

  // ---------- drop files on the island ----------
  const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
  window.addEventListener('dragover', e => {
    if (!hasFiles(e) || window.__winlandSoftwareOpen?.()) return; // on the Software page a file is for a program (software-ui.js)
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; root.classList.add('dragging');
    if (!basket.on) window.__winlandFeel?.('surprised', 500);
    basket.on = true; basket.seen = performance.now(); basket.mouseX = e.clientX;
    if (currentView !== 'tray' || mode !== 'expanded') setView('tray');
  });
  window.addEventListener('dragleave', () => root.classList.remove('dragging'));
  window.addEventListener('drop', async e => {
    root.classList.remove('dragging');
    if (!hasFiles(e) || window.__winlandSoftwareOpen?.()) return;
    e.preventDefault();
    basket.on = false; basket.caughtAt = performance.now(); // catch!
    const paths = [...e.dataTransfer.files].map(f => api.pathForFile(f)).filter(Boolean);
    if (!paths.length) return;
    incoming = { names: paths.map(p => p.split(/[\\/]/).pop()), chimed: false };
    const r = await api.trayAdd(paths); if (r.ok) { trayFiles = r.files; trayError = ''; } else trayError = r.error;
    render(); window.__winlandCheer?.(); badge('tray:' + trayFiles.length);
  });

  // ---------- messages in the medium island (volume, battery) ----------
  let hud = null;
  window.__winlandFlash = (text, ms) => flash(text, ms); // short message in the small island (also used by swipe)
  function flash(text, ms = 1600) {
    // Right after start Pip is still saying hi in the middle of the island: a message then ran
    // straight through him (the battery check fires at start). Wait until the hello is over.
    if (!introFinished || window.__winlandHelloBusy?.()) { clearTimeout(flash.later); flash.later = setTimeout(() => flash(text, ms), 400); return; }
    hud = { text, until: performance.now() + ms };
    if (mode === 'rest' && introFinished) setMode('compact', false);
    clearTimeout(flash.timer); flash.timer = setTimeout(() => { hud = null; window.__winlandSettleSize?.(); }, ms + 50);
  }
  const baseMessage = window.__winlandCompactMessage;
  window.__winlandCompactMessage = () => (hud && performance.now() < hud.until ? hud.text : '') || baseMessage?.() || '';

  // Volume bar: "🔊 ▮▮▮▮▮▮▯▯▯▯ 62%"
  let firstVolume = true;
  api.onVolume(({ level, muted }) => {
    window.__winlandSysVolume = { level, muted }; // the volume block on the home screen
    if (firstVolume) { firstVolume = false; return; } // the first report is just the starting value
    if (prefs().volumeHud === false || performance.now() < (window.__winlandVolumeQuietUntil || 0)) return; // not while you slide it in the island
    const blocks = Math.round(level / 10);
    flash(muted ? '🔇 Geluid uit' : `${level > 60 ? '🔊' : level > 20 ? '🔉' : '🔈'} ${'▮'.repeat(blocks)}${'▯'.repeat(10 - blocks)} ${level}%`, 1400);
  });

  // Battery of this laptop
  const warned = new Set();
  navigator.getBattery?.().then(battery => {
    const check = () => {
      if (prefs().batteryWarn === false || battery.charging) { if (battery.charging) warned.clear(); return; }
      const pct = Math.round(battery.level * 100);
      for (const at of [20, 10]) {
        if (pct <= at && !warned.has(at)) {
          warned.add(at); flash(`🪫 Nog ${pct}% batterij. Sluit je lader aan!`, 4000);
          say(`Batterij bijna leeg: ${pct}%`, 'Sluit je lader aan.'); window.__winlandFeel?.('surprised', 1500);
        }
      }
    };
    battery.addEventListener('levelchange', check); battery.addEventListener('chargingchange', check); check();
  }).catch(() => {});

  // ---- live: screenshots, downloads, charging, microphone and camera ----
  const en = () => prefs().lang === 'en';
  api.onNewFile?.(async ({ kind, path: file, name }) => {
    if (kind === 'shot' && prefs().shotsToTray === false) return;
    if (kind === 'download' && prefs().downloadsLive === false) return;
    const r = await api.trayAdd([file]).catch(() => null); if (r?.ok) { trayFiles = r.files; render(); }
    const short = name.length > 34 ? name.slice(0, 31) + '…' : name;
    flash(kind === 'shot' ? (en() ? '📸 Screenshot · in your tray' : '📸 Capture · dans ton tiroir') : `⬇ ${en() ? 'Downloaded' : 'Téléchargé'} · ${short}`, 3200);
    window.__winlandChime?.('pop'); window.__winlandFeel?.('happy', 900);
  });
  navigator.getBattery?.().then(battery => { // plugged in or out: the level, like the iPhone's charging animation
    battery.addEventListener('chargingchange', () => {
      if (prefs().chargeLive === false) return;
      const pct = Math.round(battery.level * 100);
      flash(battery.charging ? `⚡ ${en() ? 'Charging' : 'En charge'} · ${pct} %` : `🔋 ${en() ? 'On battery' : 'Sur batterie'} · ${pct} %`, 2600);
      if (battery.charging) { window.__winlandChime?.('pop'); window.__winlandFeel?.('happy', 1200); }
    });
  }).catch(() => {});
  // microphone / camera in use: a small dot on the island (orange = microphone, green = camera), like on the iPhone
  const dot = document.createElement('div'); dot.id = 'winland-privacy';
  dot.style.cssText = 'position:absolute;z-index:70;top:0;left:0;display:none;gap:4px;pointer-events:none';
  dot.innerHTML = '<i data-k="cam" style="width:7px;height:7px;border-radius:50%;background:#30d158;box-shadow:0 0 6px #30d158;display:none"></i><i data-k="mic" style="width:7px;height:7px;border-radius:50%;background:#ff9f0a;box-shadow:0 0 6px #ff9f0a;display:none"></i>';
  document.body.appendChild(dot);
  let using = { mic: [], cam: [] }, dotLoop = false;
  function placeDot() { // follows the island while it is shown (only then: no work otherwise)
    const on = prefs().privacyDot !== false && (using.mic.length || using.cam.length);
    dot.style.display = on ? 'flex' : 'none';
    if (!on) { dotLoop = false; return; }
    dot.style.transform = `translate(${Math.round(islandBounds.x + islandBounds.width - 26)}px, ${Math.round(Math.min(14, islandBounds.height / 2 - 3))}px)`;
    requestAnimationFrame(placeDot);
  }
  function showPrivacy(next) {
    const started = k => next[k].filter(n => !using[k].includes(n));
    const mic = started('mic'), cam = started('cam');
    using = { mic: next.mic || [], cam: next.cam || [] };
    dot.querySelector('[data-k="mic"]').style.display = using.mic.length ? 'block' : 'none';
    dot.querySelector('[data-k="cam"]').style.display = using.cam.length ? 'block' : 'none';
    if (prefs().privacyDot !== false && (mic.length || cam.length))
      flash(cam.length ? `🟢 ${en() ? 'Camera' : 'Caméra'} · ${cam.join(', ')}` : `🟠 ${en() ? 'Microphone' : 'Micro'} · ${mic.join(', ')}`, 2600);
    if (!dotLoop) { dotLoop = true; placeDot(); }
  }
  api.onPrivacy?.(p => showPrivacy(p || { mic: [], cam: [] }));
  api.privacyGet?.().then(r => { if (r?.privacy) { using = { mic: [], cam: [] }; showPrivacy(r.privacy); } }).catch(() => {});

  // Bluetooth devices (headphones, mouse): warn once a day when one is low
  api.onBluetooth(({ devices }) => {
    window.__winlandBluetooth = devices;
    if (prefs().batteryWarn === false) return;
    for (const d of devices) {
      const key = 'winland:bt-warned:' + d.name + ':' + new Date().toDateString();
      if (d.battery <= 20 && !localStorage.getItem(key)) {
        localStorage.setItem(key, '1'); flash(`🎧 ${d.name}: nog ${d.battery}%`, 4000); say(`${d.name} is bijna leeg`, `Nog ${d.battery}% batterij.`);
      }
    }
  });

  // the line under the clock on the home screen: nothing online (no weather or calendar), so it stays empty
  window.__winlandHomeInfo = () => '';

  // ---------- real sound wave: listen to what the PC plays while music is on ----------
  const BARS = 18;
  const audio = { stream: null, ctx: null, analyser: null, data: null, levels: new Array(BARS).fill(0), starting: false, offSince: 0 };
  async function startListening() {
    if (audio.stream || audio.starting) return;
    audio.starting = true;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: { width: 16, height: 16, frameRate: 1 } });
      stream.getVideoTracks().forEach(t => t.stop()); // only the sound is used
      if (!stream.getAudioTracks().length) throw new Error('no audio');
      const ctx = new (window.__winlandRealAudio || AudioContext)();
      const analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.6; analyser.minDecibels = -80; // very soft hiss counts as silence
      ctx.createMediaStreamSource(stream).connect(analyser); // not connected to the speakers: no echo
      Object.assign(audio, { stream, ctx, analyser, data: new Uint8Array(analyser.frequencyBinCount) });
    } catch { audio.failed = true; }
    audio.starting = false;
  }
  function stopListening() {
    audio.stream?.getTracks().forEach(t => t.stop()); audio.ctx?.close().catch(() => {});
    Object.assign(audio, { stream: null, ctx: null, analyser: null }); audio.levels.fill(0); window.__winlandHearing = false;
  }
  setInterval(() => {
    // listen while music plays, while the Studio page is open, or all the time with the clipping alert on (your DAW has no media session)
    const playing = Boolean(spotifyConnected && spotifyState.is_playing) || prefs().clipWarn === true || Boolean(window.__winlandStudioOpen?.());
    if (playing) { audio.offSince = 0; if (!audio.failed) startListening(); }
    else if (audio.stream) { audio.offSince ||= performance.now(); if (performance.now() - audio.offSince > 4000) stopListening(); }
    window.__winlandAudioLevels?.(); // keeps __winlandHearing fresh when no wave is on screen
  }, 1000);
  // The level of what the PC plays right now (Studio page): peak and average 0..1, and clipped when it hits the top.
  const wave = new Float32Array(2048);
  window.__winlandMeter = () => {
    if (!audio.analyser) return null;
    audio.analyser.getFloatTimeDomainData(wave);
    let peak = 0, sum = 0, hot = 0;
    for (let i = 0; i < wave.length; i++) { const v = Math.abs(wave[i]); if (v > peak) peak = v; sum += v * v; if (v >= 0.995) hot++; }
    return { peak, rms: Math.sqrt(sum / wave.length), clipped: hot >= 3 };
  };
  let clipWarnedAt = 0;
  setInterval(() => { // "Alerte de saturation": a message on the island (never a sound: it would end up in your mix)
    if (prefs().clipWarn !== true || !audio.analyser || performance.now() - clipWarnedAt < 10000) return;
    if (window.__winlandMeter()?.clipped) { clipWarnedAt = performance.now(); flash(prefs().lang === 'en' ? '🔴 Clipping: your sound hits the top' : '🔴 Saturation : ton son tape dans le rouge', 2600); }
  }, 150);
  // Levels 0..1 per bar, or null when not listening.
  // Bars cover 60 Hz – 12 kHz on a log scale (like a real equalizer), and every bar has its own
  // auto-range: bass is much louder than treble, so without this only the first bars would move.
  const peaks = new Array(BARS).fill(0.08);
  let loudPeak = 0.1;
  window.__winlandAudioLevels = () => {
    if (!audio.analyser) return null;
    audio.analyser.getByteFrequencyData(audio.data);
    const n = audio.data.length, hzPerBin = audio.ctx.sampleRate / 2 / n;
    const raw = [];
    for (let i = 0; i < BARS; i++) {
      const f0 = 60 * Math.pow(200, i / BARS), f1 = 60 * Math.pow(200, (i + 1) / BARS);
      const from = Math.max(1, Math.floor(f0 / hzPerBin)), to = Math.max(from + 1, Math.ceil(f1 / hzPerBin));
      let sum = 0; for (let j = from; j < to && j < n; j++) sum += audio.data[j];
      raw.push(sum / (to - from) / 255);
    }
    const loud = raw.reduce((a, b) => a + b, 0) / BARS;
    // Real silence on this PC (e.g. the music plays on your phone): the bars settle flat. Without this the
    // auto-range below would blow up tiny background hiss into a dancing wave.
    window.__winlandHearing = loud > 0.05;
    if (!window.__winlandHearing) { for (let i = 0; i < BARS; i++) audio.levels[i] *= 0.8; return audio.levels; }
    loudPeak = Math.max(loud, loudPeak * 0.997, 0.12);
    const overall = Math.min(1, loud / loudPeak * 1.15); // quiet parts → lower wave
    for (let i = 0; i < BARS; i++) {
      peaks[i] = Math.max(raw[i], peaks[i] * 0.996, 0.15);
      const v = Math.pow(raw[i] / peaks[i], 1.6) * overall; // stretch so beats stand out
      audio.levels[i] += (v - audio.levels[i]) * (v > audio.levels[i] ? 0.55 : 0.2); // quick up, smooth down
    }
    return audio.levels;
  };

  // ---------- album colour (soft, readable version of the cover's main colour) ----------
  let colourFor = '';
  (function colourWatch() { // every frame: the colour follows a new cover at once (only a string compare when nothing changed)
    requestAnimationFrame(colourWatch);
    const url = spotifyState.track?.image_url || '';
    if (url === colourFor) return; colourFor = url;
    if (!url) { window.__winlandAlbumColour = null; return; }
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 12; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 12, 12);
        const d = x.getImageData(0, 0, 12, 12).data; let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]); const w = 1 + sat / 16; r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; n += w; }
        [r, g, b] = [r / n, g / n, b / n];
        const boost = 200 / Math.max(60, Math.max(r, g, b)); // bright enough on black
        window.__winlandAlbumColour = `rgb(${[r, g, b].map(v => Math.min(255, Math.round(v * boost))).join(',')})`;
      } catch { window.__winlandAlbumColour = null; }
    };
    img.src = url;
  })();
})();
