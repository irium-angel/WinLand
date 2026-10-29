'use strict';
// Dev page: your Git projects (branch, changes, commits not pushed), the local servers that listen on a port
// (with a stop button that asks twice) and the dev programs running now. Everything comes from dev-main.cjs,
// read on this PC. Layout comes from pages-ui.js (same as every page). French or English, like the island.
(function devPage() {
  const api = window.winland;
  if (!api?.devGet) return;
  const root = document.createElement('section'); root.id = 'winland-dev'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#winland-dev{position:absolute;z-index:60;display:none;color:#fff;font:12px/1.4 Inter,"Segoe UI",sans-serif;pointer-events:auto}
#winland-dev *{box-sizing:border-box}
#winland-dev button{border:0;background:transparent;color:#fff;font:inherit;padding:0;cursor:pointer}
#winland-dev .dv-list{height:100%;overflow:auto;scrollbar-width:none;padding:0 2px 6px}
#winland-dev h4{margin:8px 0 4px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#8e8e93;font-weight:600;display:flex;align-items:center;gap:8px}
#winland-dev h4:first-child{margin-top:0}
#winland-dev h4 button{margin-left:auto;color:#64d2ff;font-size:11px;text-transform:none;letter-spacing:0;font-weight:600}
#winland-dev .dv-row{display:flex;align-items:center;gap:10px;min-height:34px;padding:4px 8px;margin:0 -8px;border-radius:9px}
#winland-dev .dv-row:hover{background:#1c1c1e}
#winland-dev .dv-main{flex:1 1 110px;min-width:90px}
#winland-dev .dv-main b{display:block;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#winland-dev .dv-main small{display:block;font-size:11px;color:#8e8e93;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#winland-dev .dv-tags{display:flex;gap:5px;flex:0 1 auto;min-width:0;max-width:62%}
#winland-dev .dv-tag{font:600 10.5px "Cascadia Mono",Consolas,monospace;padding:2px 6px;border-radius:6px;background:#2c2c2e;color:#e5e5ea;white-space:nowrap;flex:none}
#winland-dev .dv-tag.br{flex:0 1 auto;min-width:40px;overflow:hidden;text-overflow:ellipsis}
#winland-dev .dv-tag.br{color:#64d2ff}#winland-dev .dv-tag.up{color:#ffd60a}#winland-dev .dv-tag.ch{color:#ff9f0a}#winland-dev .dv-tag.ok{color:#30d158}
#winland-dev .dv-port{font:700 13px "Cascadia Mono",Consolas,monospace;color:#64d2ff;width:54px;flex:none}
#winland-dev .dv-stop{flex:none;font-size:11px !important;font-weight:600 !important;color:#ff453a !important;padding:3px 8px !important;border-radius:7px;background:rgba(255,69,58,.12) !important}
#winland-dev .dv-stop.sure{background:#ff453a !important;color:#fff !important}
#winland-dev .dv-x{flex:none;width:18px;height:18px;border-radius:50%;color:#8e8e93 !important;font-size:11px !important;opacity:0}
#winland-dev .dv-row:hover .dv-x{opacity:1}
#winland-dev .dv-code{flex:none;font-size:10.5px !important;font-weight:600 !important;color:#64d2ff !important;padding:3px 7px !important;border-radius:7px;background:rgba(100,210,255,.12) !important}
#winland-dev .dv-dot{flex:none;width:8px;height:8px;border-radius:50%;background:#48484a}#winland-dev .dv-dot.on{background:#30d158;box-shadow:0 0 6px #30d158}
#winland-dev .dv-go{flex:none;font-size:11px !important;font-weight:600 !important;color:#30d158 !important;padding:3px 8px !important;border-radius:7px;background:rgba(48,209,88,.12) !important}
#winland-dev .dv-none{font-size:11.5px;color:#8e8e93;padding:2px 0 4px}`;
  document.head.appendChild(style);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
  const WORDS = {
    fr: { projects: 'Projets Git', add: '+ Suivre un dossier', noGit: 'Aucun projet pour l’instant. Travaille avec Claude Code dans un dossier Git, ou ajoute-en un.',
      servers: 'Serveurs locaux', noServers: 'Aucun serveur de dev en écoute.', running: 'Programmes de dev', noRunning: 'Aucun en cours.',
      stop: 'Arrêter', sure: 'Sûr ?', forget: 'Ne plus suivre', clean: 'propre', changes: n => `${n} modif${n > 1 ? 's' : ''}`, ahead: n => `↑${n}`, behind: n => `↓${n}`,
      noUpstream: 'pas de branche distante', ago: ms => { const m = Math.round(ms / 60000); return m < 1 ? 'à l’instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`; },
      done: (n, t) => `${n} a terminé · ${t}`, finished: 'Programme terminé', status: g => g ? `${g.branch || '?'} · ${g.changed + g.untracked ? `${g.changed + g.untracked} modif${g.changed + g.untracked > 1 ? 's' : ''}` : 'propre'}` : 'Git, ports, programmes',
      local: 'seulement ce PC', network: 'visible sur le réseau', code: 'VS Code', docker: 'Conteneurs Docker', dockerOff: 'Docker n’est pas lancé.', noContainers: 'Aucun conteneur.', start: 'Démarrer' },
    en: { projects: 'Git projects', add: '+ Follow a folder', noGit: 'No projects yet. Work with Claude Code in a Git folder, or add one.',
      servers: 'Local servers', noServers: 'No dev server listening.', running: 'Dev programs', noRunning: 'Nothing running.',
      stop: 'Stop', sure: 'Sure?', forget: 'Stop following', clean: 'clean', changes: n => `${n} change${n > 1 ? 's' : ''}`, ahead: n => `↑${n}`, behind: n => `↓${n}`,
      noUpstream: 'no remote branch', ago: ms => { const m = Math.round(ms / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; },
      done: (n, t) => `${n} finished · ${t}`, finished: 'Program finished', status: g => g ? `${g.branch || '?'} · ${g.changed + g.untracked ? `${g.changed + g.untracked} change${g.changed + g.untracked > 1 ? 's' : ''}` : 'clean'}` : 'Git, ports, programs',
      local: 'this PC only', network: 'visible on the network', code: 'VS Code', docker: 'Docker containers', dockerOff: 'Docker is not running.', noContainers: 'No containers.', start: 'Start' }
  };
  const L = () => WORDS[window.__winlandPrefs?.().lang === 'en' ? 'en' : 'fr'];
  const dur = ms => { const s = Math.round(ms / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`; };

  let data = null, sure = null, lastHtml = '';
  async function load() { try { const r = await api.devGet(); if (r?.ok) data = r; } catch {} render(); }
  function render() {
    if (currentView !== 'dev') return;
    const w = L();
    const git = data?.git || [], ports = data?.ports || [], running = data?.running || [];
    const gitRows = git.map(g => `<div class="dv-row" title="${esc(g.dir)}"><div class="dv-main"><b>${esc(g.name)}</b><small>${g.last ? esc(g.last) + ' · ' + w.ago(Date.now() - g.lastAt) : ''}</small></div>
      <div class="dv-tags"><span class="dv-tag br">${esc(g.branch || '?')}</span>${g.changed + g.untracked ? `<span class="dv-tag ch">${w.changes(g.changed + g.untracked)}</span>` : `<span class="dv-tag ok">${w.clean}</span>`}${g.ahead ? `<span class="dv-tag up">${w.ahead(g.ahead)}</span>` : ''}${g.behind ? `<span class="dv-tag up">${w.behind(g.behind)}</span>` : ''}${!g.upstream ? `<span class="dv-tag" title="${w.noUpstream}">⌀</span>` : ''}</div>
      ${data.vscode ? `<button type="button" class="dv-code" data-code="${esc(g.dir)}">${w.code}</button>` : ''}<button type="button" class="dv-x" data-forget="${esc(g.dir)}" title="${w.forget}">✕</button></div>`).join('');
    const dk = data?.docker || {}, boxes = dk.containers || [];
    const dockerRows = boxes.map(c => `<div class="dv-row"><i class="dv-dot ${c.state === 'running' ? 'on' : ''}"></i><div class="dv-main"><b>${esc(c.name)}</b><small>${esc(c.image)} · ${esc(c.status)}${c.ports ? ' · ' + esc(c.ports.split(',')[0]) : ''}</small></div>
      ${c.state === 'running' ? `<button type="button" class="dv-stop ${sure === c.id ? 'sure' : ''}" data-dstop="${esc(c.id)}">${sure === c.id ? w.sure : w.stop}</button>` : `<button type="button" class="dv-go" data-dstart="${esc(c.id)}">${w.start}</button>`}</div>`).join('');
    const portRows = ports.map(p => `<div class="dv-row"><span class="dv-port">:${p.port}</span><div class="dv-main"><b>${esc(p.name)}</b><small>PID ${p.pid} · ${p.local ? w.local : w.network}</small></div>
      <button type="button" class="dv-stop ${sure === p.pid ? 'sure' : ''}" data-stop="${p.pid}">${sure === p.pid ? w.sure : w.stop}</button></div>`).join('');
    const runRows = running.map(r => `<div class="dv-row"><div class="dv-main"><b>${esc(r.name)}</b><small>PID ${r.pid}${r.since ? ' · ' + dur(Date.now() - r.since) : ''}</small></div><div class="dv-tags"><span class="dv-tag">${r.memMb} Mo</span></div></div>`).join('');
    const html = `<div class="dv-list"><h4>${w.projects}<button type="button" data-add="1">${w.add}</button></h4>${gitRows || `<div class="dv-none">${w.noGit}</div>`}
      <h4>${w.servers}</h4>${portRows || `<div class="dv-none">${w.noServers}</div>`}
      <h4>${w.running}</h4>${runRows || `<div class="dv-none">${w.noRunning}</div>`}
      ${dk.installed ? `<h4>${w.docker}</h4>${!dk.running ? `<div class="dv-none">${w.dockerOff}</div>` : dockerRows || `<div class="dv-none">${w.noContainers}</div>`}` : ''}</div>`;
    if (html === lastHtml) return;
    const top = root.querySelector('.dv-list')?.scrollTop || 0;
    root.innerHTML = html; lastHtml = html;
    const list = root.querySelector('.dv-list'); if (list) list.scrollTop = top;
  }
  root.addEventListener('click', async e => {
    const add = e.target.closest('[data-add]'), stop = e.target.closest('[data-stop]'), forget = e.target.closest('[data-forget]');
    const code = e.target.closest('[data-code]'), dstop = e.target.closest('[data-dstop]'), dstart = e.target.closest('[data-dstart]');
    if (code) { sound('click'); api.devOpenCode(code.dataset.code); return; }
    if (dstart) { sound('click'); await api.devDocker(dstart.dataset.dstart, 'start').catch(() => {}); load(); return; }
    if (dstop) { // asks twice, like the servers
      const id = dstop.dataset.dstop;
      if (sure !== id) { sure = id; sound('click'); render(); setTimeout(() => { if (sure === id) { sure = null; render(); } }, 3000); return; }
      sure = null; await api.devDocker(id, 'stop').catch(() => {}); window.__winlandChime?.('pop'); load(); return;
    }
    if (add) { sound('click'); await api.devAddFolder().catch(() => {}); load(); return; }
    if (forget) { sound('click'); await api.devForgetFolder(forget.dataset.forget).catch(() => {}); load(); return; }
    if (stop) { // asks twice: the first click turns the button red ("Sûr ?"), the second stops it
      const pid = Number(stop.dataset.stop);
      if (sure !== pid) { sure = pid; sound('click'); render(); setTimeout(() => { if (sure === pid) { sure = null; render(); } }, 3000); return; }
      sure = null; await api.devStop(pid).catch(() => {}); window.__winlandChime?.('pop'); setTimeout(load, 500);
    }
  });

  // the status line of the Dev app on the home screen and its quick button: the first project's branch and changes
  window.__winlandDevStatus = () => L().status(data?.git?.[0]);

  // ---- a dev program that ran a while has finished (Settings → "Prévenir quand un programme de dev se termine") ----
  api.onDevFinished?.(({ name, ms }) => {
    if (!window.__winlandPrefs?.().devWatch) return;
    const line = L().done(name, dur(ms));
    window.__winlandFlash?.('✓ ' + line, 2600); window.__winlandChime?.('done'); window.__winlandSay?.(L().finished, line);
  });
  let watchOn = null;
  setInterval(() => { const on = Boolean(window.__winlandPrefs?.().devWatch); if (on !== watchOn) { watchOn = on; api.devWatch(on); } }, 1500);

  // ---- placing the panel; while it is open it refreshes every 3 s, otherwise every minute (for the home status) ----
  let shown = false;
  (function position() {
    const show = currentView === 'dev' && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) { window.__winlandPage.place(root, contentRect()); if (!shown) { shown = true; lastHtml = ''; load(); } } else shown = false;
    requestAnimationFrame(position);
  })();
  setInterval(() => { if (shown) load(); }, 3000);
  setTimeout(load, 4000); setInterval(() => { if (!shown) load(); }, 60000);
  canvas.addEventListener('click', e => { if (inside(e.clientX, e.clientY, hit.devApp)) { e.preventDefault(); e.stopImmediatePropagation(); setView('dev'); } }, true);
})();
