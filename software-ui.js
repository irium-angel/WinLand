'use strict';
// Software page: the programs for your profile (FL Studio, Ableton… for music; VS Code, Docker… for dev; Steam,
// Discord… for gaming; Word, Excel… for office), only the ones installed on this PC (software-main.cjs). Click one to
// start it, or drop a file on it to open the file with it. Layout comes from pages-ui.js.
(function softwarePage() {
  const api = window.winland;
  if (!api?.softwareGet) return;
  const root = document.createElement('section'); root.id = 'winland-software'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#winland-software{position:absolute;z-index:60;display:none;color:#fff;font:12px/1.4 Inter,"Segoe UI",sans-serif;pointer-events:auto}
#winland-software *{box-sizing:border-box}
#winland-software .sw-wrap{height:100%;display:flex;flex-direction:column;gap:8px}
#winland-software .sw-top{display:flex;align-items:center;gap:6px}
#winland-software .sw-top button{border:0;height:26px;padding:0 11px;border-radius:13px;background:#1c1c1e;color:#8e8e93;font:600 11.5px Inter,"Segoe UI",sans-serif;cursor:pointer;transition:background .15s,color .15s}
#winland-software .sw-top button:hover{background:#2c2c2e;color:#fff}
#winland-software .sw-top button.on{background:#fff;color:#000}
#winland-software .sw-top span{margin-left:auto;font-size:11px;color:#8e8e93;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#winland-software .sw-grid{flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));grid-auto-rows:66px;gap:6px;scrollbar-width:none}
#winland-software .sw-grid::-webkit-scrollbar{display:none}
#winland-software .sw-app{border:0;border-radius:14px;background:#1c1c1e;color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:6px;transition:background .15s,transform .1s,box-shadow .15s}
#winland-software .sw-app:hover{background:#2c2c2e}
#winland-software .sw-app:active{transform:scale(.95)}
#winland-software .sw-app.drop{background:#2c2c2e;box-shadow:inset 0 0 0 2px #0a84ff}
#winland-software .sw-app img,#winland-software .sw-app i{width:28px;height:28px;flex:none;pointer-events:none}
#winland-software .sw-app i{display:grid;place-items:center;border-radius:9px;background:#3a3a3c;font:700 15px Inter,"Segoe UI",sans-serif;font-style:normal}
#winland-software .sw-app b{max-width:100%;font-size:11.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
#winland-software .sw-empty{flex:1;display:grid;place-items:center;text-align:center;color:#8e8e93;font-size:12.5px;padding:0 30px}`;
  document.head.appendChild(style);
  const WORDS = {
    fr: { music: 'Musique', dev: 'Dev', gaming: 'Jeux', office: 'Bureautique', all: 'Tout', hint: 'Glisse un fichier sur un logiciel pour l’ouvrir avec',
      none: c => `Aucun logiciel ${{ music: 'de musique', dev: 'de dev', gaming: 'de jeu', office: 'de bureautique' }[c] || ''} trouvé sur ce PC.`, nothing: 'Aucun logiciel connu trouvé sur ce PC.',
      opening: n => `Ouverture de ${n}…`, openWith: (f, n) => `${f} → ${n}`, fail: n => `${n} ne s’ouvre pas`, count: n => n ? `${n} logiciel${n > 1 ? 's' : ''}` : 'Aucun logiciel' },
    en: { music: 'Music', dev: 'Dev', gaming: 'Games', office: 'Office', all: 'All', hint: 'Drop a file on a program to open it with it',
      none: c => `No ${{ music: 'music', dev: 'dev', gaming: 'gaming', office: 'office' }[c] || ''} software found on this PC.`, nothing: 'No known software found on this PC.',
      opening: n => `Opening ${n}…`, openWith: (f, n) => `${f} → ${n}`, fail: n => `${n} does not open`, count: n => n ? `${n} program${n > 1 ? 's' : ''}` : 'No software' }
  };
  const L = () => WORDS[window.__winlandPrefs?.().lang === 'en' ? 'en' : 'fr'];
  const CATS = ['music', 'dev', 'gaming', 'office'];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let list = null, picked = null, busy = false;

  // the profile's own kind first; "custom" shows everything
  const profileCat = () => { const p = window.__winlandPrefs?.().profile; return CATS.includes(p) ? p : 'all'; };
  async function load(fresh) {
    if (busy) return; busy = true;
    try { const r = await api.softwareGet(fresh); if (r?.ok) list = r.list; } catch {}
    busy = false; render();
  }
  function render() {
    if (currentView !== 'software') return;
    const w = L(), items = list || [], have = CATS.filter(c => items.some(s => s.cat === c));
    const cat = picked && (picked === 'all' || have.includes(picked)) ? picked : profileCat();
    const shown = cat === 'all' ? items : items.filter(s => s.cat === cat);
    const chips = [...new Set([profileCat() === 'all' ? null : profileCat(), ...have])].filter(Boolean)
      .map(c => `<button type="button" data-cat="${c}" class="${c === cat ? 'on' : ''}">${w[c]}</button>`).join('')
      + `<button type="button" data-cat="all" class="${cat === 'all' ? 'on' : ''}">${w.all}</button>`;
    const tile = s => `<button type="button" class="sw-app" data-id="${esc(s.id)}" title="${esc(s.name)}">${s.icon ? `<img src="${esc(s.icon)}" alt="">` : `<i>${esc(s.name[0])}</i>`}<b>${esc(s.name)}</b></button>`;
    const body = !list ? '' : shown.length ? `<div class="sw-grid">${shown.map(tile).join('')}</div>`
      : `<div class="sw-empty">${cat === 'all' ? w.nothing : w.none(cat)}</div>`;
    root.innerHTML = `<div class="sw-wrap"><div class="sw-top">${chips}<span>${shown.length ? w.hint : ''}</span></div>${body}</div>`;
  }
  async function open(id, file) {
    const s = list?.find(x => x.id === id); if (!s) return;
    const w = L();
    window.__winlandFlash?.(file ? w.openWith(file.split(/[\\/]/).pop(), s.name) : w.opening(s.name), 1600);
    const r = await api.softwareOpen(id, file).catch(() => null);
    if (r?.ok) window.__winlandChime?.('pop'); else window.__winlandFlash?.(w.fail(s.name), 2200);
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cat) { picked = b.dataset.cat; render(); return; }
    if (b.dataset.id) open(b.dataset.id);
  });

  // "open with": drop a file on a program. While this page is open the island does not take the file into the tray.
  const tileAt = e => e.target.closest?.('.sw-app');
  root.addEventListener('dragover', e => {
    if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
    e.preventDefault(); e.dataTransfer.dropEffect = tileAt(e) ? 'copy' : 'none';
    root.querySelectorAll('.sw-app').forEach(t => t.classList.toggle('drop', t === tileAt(e)));
  });
  root.addEventListener('dragleave', () => root.querySelectorAll('.sw-app.drop').forEach(t => t.classList.remove('drop')));
  root.addEventListener('drop', e => {
    e.preventDefault(); const t = tileAt(e);
    root.querySelectorAll('.sw-app.drop').forEach(x => x.classList.remove('drop'));
    const file = e.dataTransfer?.files?.[0] && api.pathForFile(e.dataTransfer.files[0]);
    if (t && file) open(t.dataset.id, file);
  });

  let shown = false;
  (function position() {
    const show = currentView === 'software' && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) { window.__winlandPage.place(root, contentRect()); if (!shown) { shown = true; picked = null; render(); load(false); } } else shown = false;
    requestAnimationFrame(position);
  })();
  setTimeout(() => load(false), 4000); // so the home tile can show how many there are
  window.__winlandSoftwareOpen = () => shown; // extras-ui.js: dropped files are for these programs, not the tray
  window.__winlandSoftwareStatus = () => {
    const cat = profileCat(), n = (list || []).filter(s => cat === 'all' || s.cat === cat).length;
    return list ? L().count(n) : '';
  };
  canvas.addEventListener('click', e => { if (inside(e.clientX, e.clientY, hit.softwareApp)) { e.preventDefault(); e.stopImmediatePropagation(); setView('software'); } }, true);
})();
