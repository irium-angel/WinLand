'use strict';
// System page: how busy the PC is (processor, graphics card, memory), read on this PC (extras-main.cjs and
// winland-helper.exe), every 1.5 s while the page is open, and nothing when it is closed. Plus the time you have been
// playing, for the break reminder (winland-fun.js). Layout comes from pages-ui.js.
(function systemPage() {
  const api = window.winland;
  if (!api?.systemGet) return;
  const root = document.createElement('section'); root.id = 'winland-system'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#winland-system{position:absolute;z-index:60;display:none;color:#fff;font:12px/1.4 Inter,"Segoe UI",sans-serif;pointer-events:none}
#winland-system *{box-sizing:border-box}
#winland-system .sy-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
#winland-system .sy-card{border-radius:16px;background:#1c1c1e;padding:12px 14px;height:118px;display:flex;flex-direction:column}
#winland-system .sy-card small{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#8e8e93;font-weight:600}
#winland-system .sy-card b{font-size:30px;font-weight:700;line-height:1.15;margin-top:auto}
#winland-system .sy-card span{font-size:11px;color:#8e8e93;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#winland-system .sy-bar{height:5px;border-radius:3px;background:#2c2c2e;margin-top:6px;overflow:hidden}
#winland-system .sy-bar i{display:block;height:100%;border-radius:3px;transition:width .6s cubic-bezier(.2,.8,.2,1)}
#winland-system .sy-foot{margin-top:10px;font-size:11.5px;color:#8e8e93}#winland-system .sy-foot b{color:#fff}`;
  document.head.appendChild(style);
  const WORDS = {
    fr: { cpu: 'Processeur', gpu: 'Carte graphique', ram: 'Mémoire', up: 'Allumé depuis', play: 'En jeu depuis', of: 'sur', none: '—' },
    en: { cpu: 'Processor', gpu: 'Graphics card', ram: 'Memory', up: 'On for', play: 'Playing for', of: 'of', none: '—' }
  };
  const L = () => WORDS[window.__winlandPrefs?.().lang === 'en' ? 'en' : 'fr'];
  const colour = p => p == null ? '#48484a' : p < 60 ? '#30d158' : p < 85 ? '#ff9f0a' : '#ff453a';
  const gb = n => (n / 1073741824).toFixed(1).replace('.', window.__winlandPrefs?.().lang === 'en' ? '.' : ',') + ' Go';
  const dur = s => { const m = Math.floor(s / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
  let data = null, busy = false;
  async function load() { if (busy) return; busy = true; try { data = await api.systemGet(); } catch {} busy = false; render(); }
  function render() {
    if (currentView !== 'system') return;
    const d = data || {}; // the first reading of the graphics card takes a moment: the cards show — until then
    const w = L(), ram = d.ram ? Math.round(100 * d.ram.used / d.ram.total) : null;
    const card = (title, value, sub) => `<div class="sy-card"><small>${title}</small><b style="color:${colour(value)}">${value == null ? w.none : value + ' %'}</b><span>${sub}</span><div class="sy-bar"><i style="width:${value || 0}%;background:${colour(value)}"></i></div></div>`;
    const playing = window.__winlandPlayTime?.() || 0;
    root.innerHTML = `<div class="sy-grid">${card(w.cpu, d.cpu ?? null, d.cpuName || '')}${card(w.gpu, d.gpu ?? null, '3D')}${card(w.ram, ram, d.ram ? `${gb(d.ram.used)} ${w.of} ${gb(d.ram.total)}` : '')}</div>
      <div class="sy-foot">${w.up} <b>${dur(d.uptime || 0)}</b>${playing > 60 ? ` · ${w.play} <b>${dur(playing)}</b>` : ''}</div>`;
  }
  let shown = false;
  (function position() {
    const show = currentView === 'system' && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) { window.__winlandPage.place(root, contentRect()); if (!shown) { shown = true; render(); load(); } } else shown = false;
    requestAnimationFrame(position);
  })();
  setInterval(() => { if (shown) load(); }, 1500);
  window.__winlandSystemStatus = () => data?.cpu != null ? `CPU ${data.cpu} % · GPU ${data.gpu ?? '—'} %` : '';
  canvas.addEventListener('click', e => { if (inside(e.clientX, e.clientY, hit.systemApp)) { e.preventDefault(); e.stopImmediatePropagation(); setView('system'); } }, true);
})();
