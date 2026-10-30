'use strict';
// Claude dashboard: every Claude Code / Codex session at once with what it is doing, your usage (5-hour and weekly
// limits, tasks today), the files the last task changed, and a queue of tasks that Claude Code does one after another
// (queue-main.cjs). Everything comes from this PC.
(function dashboard() {
  const api = window.winland;
  if (!api?.queueGet) return;
  const prefs = () => window.__winlandPrefs?.() || {};
  const T = (fr, en) => prefs().lang === 'en' ? en : fr;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const root = document.createElement('section'); root.id = 'winland-dashboard'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#winland-dashboard{position:absolute;z-index:60;display:none;color:#fff;font:12px/1.4 Inter,"Segoe UI",sans-serif;pointer-events:auto}
#winland-dashboard *{box-sizing:border-box}
#winland-dashboard .db-wrap{height:100%;display:grid;grid-template-columns:1fr 0.85fr 1.25fr;gap:12px}
#winland-dashboard .db-col{min-height:0;overflow:auto;scrollbar-width:none;display:flex;flex-direction:column;gap:6px}
#winland-dashboard small.h{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#8e8e93;font-weight:600}
#winland-dashboard .db-item{padding:8px 10px;border-radius:11px;background:#1c1c1e;display:flex;gap:9px;align-items:flex-start}
#winland-dashboard .db-item div{min-width:0;flex:1}
#winland-dashboard .db-item b{display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#winland-dashboard .db-item span{display:block;color:#8e8e93;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#winland-dashboard .dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex:none;background:#636366}
#winland-dashboard .dot.running{background:#ff9f0a;box-shadow:0 0 8px #ff9f0a}#winland-dashboard .dot.done{background:#30d158}#winland-dashboard .dot.question{background:#ff9f0a}#winland-dashboard .dot.error,#winland-dashboard .dot.failed{background:#ff453a}
#winland-dashboard .bar{height:6px;border-radius:3px;background:#2c2c2e;overflow:hidden;margin-top:4px}
#winland-dashboard .bar i{display:block;height:100%;border-radius:3px}
#winland-dashboard .db-item .big{font-size:26px;font-weight:780;letter-spacing:-.5px;color:#fff;line-height:1.1}
#winland-dashboard .db-add{display:grid;grid-template-columns:1fr 28px;gap:6px}
#winland-dashboard .db-add select{grid-column:1 / -1;max-width:none}
#winland-dashboard select,#winland-dashboard input,#winland-dashboard button{border:0;border-radius:9px;background:#2c2c2e;color:#fff;font:600 11.5px Inter,"Segoe UI",sans-serif;height:28px;padding:0 9px}
#winland-dashboard input{flex:1;min-width:0;font-weight:500;outline:0}
#winland-dashboard .go{background:#d97757}
#winland-dashboard .chip{font-size:10px;font-weight:700;padding:1px 6px;border-radius:6px;background:#2c2c2e;color:#a1a1ab;flex:none;margin-top:2px}
#winland-dashboard .x{height:20px;padding:0 6px;font-size:10px;background:transparent;color:#8e8e93}`;
  document.head.appendChild(style);

  let state = null, queue = [], projects = [], draft = '', project = '';
  const ago = ms => { const m = Math.floor(ms / 60000); return m < 1 ? T('à l’instant', 'just now') : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h`; };
  const STATES = { running: T('travaille', 'working'), question: T('attend ta réponse', 'waiting for you'), done: T('terminé', 'done'), error: T('erreur', 'error'), ready: T('prêt', 'ready'), queued: T('en attente', 'queued'), failed: T('échec', 'failed'), stopped: T('arrêté', 'stopped') };
  async function load() {
    const [s, q, p] = await Promise.all([api.aiMonitorGet().catch(() => null), api.queueGet().catch(() => null), projects.length ? null : api.queueProjects().catch(() => null)]);
    if (s?.ok) state = s; if (q?.ok) queue = q.tasks; if (p?.ok) { projects = p.projects; project ||= projects[0]?.path || ''; }
    render();
  }
  function render() {
    if (currentView !== 'dashboard') return;
    const agents = (state?.providers || []).filter(x => x.kind === 'hooks');
    const sessions = agents.flatMap(a => (a.list || []).map(s => ({ ...s, agent: a.name })));
    const sessionRows = sessions.length ? sessions.map(s => `<div class="db-item"><i class="dot ${esc(s.state)}"></i><div><b>${esc(s.project)}</b><span>${esc(s.agent)} · ${esc(STATES[s.state] || s.detail || '')}${s.elapsed ? ' · ' + Math.round(s.elapsed / 60) + ' min' : ''}</span></div></div>`).join('')
      : `<div class="db-item"><i class="dot"></i><div><b>${T('Aucune session en cours', 'No session right now')}</b><span>${T('Lance Claude Code dans un terminal ou VS Code.', 'Start Claude Code in a terminal or VS Code.')}</span></div></div>`;
    const cc = agents.find(a => a.agent !== 'codex') || agents[0] || {}, u = cc.usage || {};
    const bar = (label, w) => { const pct = Math.round(w?.used ?? 0); const c = pct >= 90 ? '#ff453a' : pct >= 70 ? '#ff9f0a' : '#30d158';
      return `<div class="db-item"><div><b>${label} · ${w ? pct + ' %' : '—'}</b><div class="bar"><i style="width:${w ? pct : 0}%;background:${c}"></i></div></div></div>`; };
    const day = new Date().toDateString(), today = (state?.history || []).filter(h => new Date(h.at).toDateString() === day);
    const files = (cc.files || []).slice(-5);
    const usage = `${bar(T('Limite 5 h', '5-hour limit'), u.fiveHour)}${bar(T('Semaine', 'Week'), u.sevenDay)}
      <div class="db-item"><div><span>${T('Tâches aujourd’hui', 'Tasks today')}</span><span class="big">${today.length}</span></div></div>
      ${files.length ? `<small class="h">${T('Fichiers de la dernière tâche', 'Files of the last task')}</small>${files.map(f => `<div class="db-item"><div><b>${esc(String(f.path || f.name || f).split(/[\\/]/).pop())}</b><span>${esc(f.kind || '')}</span></div></div>`).join('')}` : ''}`;
    const tasks = queue.slice().reverse().map(t => `<div class="db-item"><i class="dot ${esc(t.state)}"></i><div><b title="${esc(t.prompt)}">${esc(t.prompt)}</b><span>${esc(t.project)} · ${esc(STATES[t.state] || t.state)}${t.endedAt ? ' · ' + ago(Date.now() - t.endedAt) : ''}</span>${t.answer && t.state !== 'running' ? `<span title="${esc(t.answer)}">${esc(t.answer.replace(/\s+/g, ' ').slice(-140))}</span>` : ''}</div><button type="button" class="x" data-rm="${esc(t.id)}">${t.state === 'running' ? T('Stop', 'Stop') : '✕'}</button></div>`).join('')
      || `<div class="db-item"><div><b>${T('File d’attente vide', 'The queue is empty')}</b><span>${T('Ajoute des tâches : Claude les fait l’une après l’autre.', 'Add tasks: Claude does them one after another.')}</span></div></div>`;
    const typed = root.querySelector('input')?.value ?? draft, focused = document.activeElement?.dataset?.q;
    root.innerHTML = `<div class="db-wrap"><div class="db-col"><small class="h">${T('Sessions', 'Sessions')}</small>${sessionRows}</div>
      <div class="db-col"><small class="h">${T('Consommation', 'Usage')}</small>${usage}</div>
      <div class="db-col"><small class="h">${T('File d’attente', 'Queue')}</small>
        <div class="db-add"><select data-p="1">${projects.map(p => `<option value="${esc(p.path)}" ${p.path === project ? 'selected' : ''}>${esc(p.name)}</option>`).join('') || `<option>${T('aucun projet', 'no project')}</option>`}</select><input data-q="1" placeholder="${T('Nouvelle tâche pour Claude…', 'New task for Claude…')}"><button type="button" class="go" data-add="1">+</button></div>
        ${tasks}${queue.some(t => !['queued', 'running'].includes(t.state)) ? `<button type="button" data-clear="1">${T('Effacer les terminées', 'Clear finished')}</button>` : ''}</div></div>`;
    const input = root.querySelector('input'); input.value = typed; if (focused) { input.focus(); input.setSelectionRange(typed.length, typed.length); }
  }
  async function add() {
    const input = root.querySelector('input'), prompt = input?.value.trim(); if (!prompt || !project) return;
    const r = await api.queueAdd(prompt, project).catch(() => null);
    if (r?.ok) { queue = r.tasks; draft = ''; input.value = ''; window.__winlandChime?.('send'); render(); }
  }
  root.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.add) add();
    else if (b.dataset.rm) { const r = await api.queueRemove(b.dataset.rm).catch(() => null); if (r?.ok) { queue = r.tasks; render(); } }
    else if (b.dataset.clear) { const r = await api.queueClear().catch(() => null); if (r?.ok) { queue = r.tasks; render(); } }
  });
  root.addEventListener('change', e => { if (e.target.dataset.p) project = e.target.value; });
  root.addEventListener('keydown', e => { if (e.target.dataset.q && e.key === 'Enter') { e.preventDefault(); add(); } });
  api.onQueueUpdate?.(r => { if (r?.ok) { queue = r.tasks; render(); } });
  api.onQueueFinished?.(t => window.__winlandCard?.({ app: T('File Claude', 'Claude queue'), icon: t.ok ? '✓' : '!', colour: t.ok ? '#30d158' : '#ff453a', title: t.prompt, body: `${t.project} · ${t.ok ? T('terminé', 'done') : T('échec', 'failed')}`, sound: t.ok ? 'done' : 'error', ms: 8000 }));
  window.__winlandQueue = { add: (prompt, dir) => api.queueAdd(prompt, dir) };

  let shown = false, timer = null;
  (function position() {
    const show = currentView === 'dashboard' && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) { window.__winlandPage.place(root, contentRect()); if (!shown) { shown = true; load(); timer = setInterval(() => { if (!root.contains(document.activeElement)) load(); }, 3000); } }
    else if (shown) { shown = false; clearInterval(timer); }
    requestAnimationFrame(position);
  })();
  canvas.addEventListener('click', e => { if (inside(e.clientX, e.clientY, hit.dashboardApp)) { e.preventDefault(); e.stopImmediatePropagation(); setView('dashboard'); setMode('expanded'); } }, true);
})();
