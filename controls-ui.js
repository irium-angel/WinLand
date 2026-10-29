'use strict';
// Controls page: quick actions (lock the PC, take a screenshot, sound on/off, light/dark) and the audio output
// (headphones, speakers, an audio interface…: one click to switch, like the sound flyout of Windows).
// Everything goes through extras-main.cjs and winland-helper.exe, on this PC. Layout comes from pages-ui.js.
(function controlsPage() {
  const api = window.winland;
  if (!api?.outputsGet) return;
  const root = document.createElement('section'); root.id = 'winland-controls'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#winland-controls{position:absolute;z-index:60;display:none;color:#fff;font:12px/1.4 Inter,"Segoe UI",sans-serif;pointer-events:auto}
#winland-controls *{box-sizing:border-box}
#winland-controls button{border:0;background:transparent;color:#fff;font:inherit;padding:0;cursor:pointer}
#winland-controls .ct-wrap{height:100%;display:flex;flex-direction:column;gap:8px}
#winland-controls .ct-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;flex:none}
#winland-controls .ct-act{height:62px;border-radius:14px;background:#1c1c1e;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:11.5px !important;font-weight:600 !important;transition:background .15s,transform .1s}
#winland-controls .ct-act:hover{background:#2c2c2e}#winland-controls .ct-act:active{transform:scale(.96)}
#winland-controls .ct-act.on{background:#ff9f0a;color:#000 !important}
#winland-controls .ct-act span{font-size:19px;line-height:1}
#winland-controls .ct-act img{width:22px;height:22px;display:block}
#winland-controls h4{margin:2px 0 0;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#8e8e93;font-weight:600;flex:none}
#winland-controls .ct-list{flex:1;min-height:0;overflow:auto;scrollbar-width:none;margin:0 -8px}
#winland-controls .ct-out{display:flex;align-items:center;gap:10px;width:100%;min-height:32px;padding:3px 8px;border-radius:9px;text-align:left}
#winland-controls .ct-out:hover{background:#1c1c1e}
#winland-controls .ct-out i{flex:none;width:16px;height:16px;border-radius:50%;border:1.5px solid #48484a;display:grid;place-items:center}
#winland-controls .ct-out.on i{border-color:#30d158;background:#30d158}
#winland-controls .ct-out.on i::after{content:"";width:6px;height:6px;border-radius:50%;background:#000}
#winland-controls .ct-out b{flex:1;min-width:0;font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#winland-controls .ct-out small{color:#8e8e93;font-size:10.5px;font-weight:400;margin-left:6px}
#winland-controls .ct-none{color:#8e8e93;font-size:11.5px;padding:4px 8px}`;
  document.head.appendChild(style);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
  const WORDS = {
    fr: { lock: 'Verrouiller', snip: 'Capture', mute: 'Couper le son', unmute: 'Remettre le son', theme: 'Thème', output: 'Sortie audio', none: 'Aucune sortie trouvée.', switched: n => `🔊 ${n}` },
    en: { lock: 'Lock', snip: 'Screenshot', mute: 'Mute', unmute: 'Unmute', theme: 'Theme', output: 'Audio output', none: 'No output found.', switched: n => `🔊 ${n}` }
  };
  const L = () => WORDS[window.__winlandPrefs?.().lang === 'en' ? 'en' : 'fr'];
  // "SteelSeries Sonar - Gaming (SteelSeries Sonar Virtual Audio Device)" -> name + the device in small type
  const split = name => { const m = /^(.*?)\s*\((.+)\)$/.exec(name || ''); return m ? [m[1], m[2]] : [name || '?', '']; };

  let outputs = [], lastHtml = '';
  async function load() { try { const r = await api.outputsGet(); outputs = r?.outputs || []; } catch { outputs = []; } render(); }
  function render() {
    if (currentView !== 'controls') return;
    const w = L(), muted = Boolean(window.__winlandSysVolume?.muted), light = window.__winlandPrefs?.().theme === 'light';
    // your own icons (assets/icons): the mute button shows the speaker with its red bar, and without it once the sound is off
    const icon = name => `<img src="./assets/icons/${name}.svg" alt="">`;
    const html = `<div class="ct-wrap"><div class="ct-actions">
      <button type="button" class="ct-act" data-do="lock">${icon('lock')}${w.lock}</button>
      <button type="button" class="ct-act" data-do="snip"><span>✂️</span>${w.snip}</button>
      <button type="button" class="ct-act ${muted ? 'on' : ''}" data-do="mute">${icon(muted ? 'sound' : 'mute')}${muted ? w.unmute : w.mute}</button>
      <button type="button" class="ct-act" data-do="theme">${icon(light ? 'day' : 'night')}${w.theme}</button></div>
      <h4>${w.output}</h4><div class="ct-list">${outputs.length ? outputs.map(o => { const [name, dev] = split(o.name);
        return `<button type="button" class="ct-out ${o.default ? 'on' : ''}" data-out="${esc(o.id)}" title="${esc(o.name)}"><i></i><b>${esc(name)}${dev ? `<small>${esc(dev)}</small>` : ''}</b></button>`; }).join('')
      : `<div class="ct-none">${w.none}</div>`}</div></div>`;
    if (html === lastHtml) return;
    const top = root.querySelector('.ct-list')?.scrollTop || 0;
    root.innerHTML = html; lastHtml = html;
    const list = root.querySelector('.ct-list'); if (list) list.scrollTop = top;
  }
  root.addEventListener('click', async e => {
    const act = e.target.closest('[data-do]')?.dataset.do, out = e.target.closest('[data-out]')?.dataset.out;
    if (act === 'lock') { sound('click'); api.lockPc(); }
    if (act === 'snip') { sound('click'); setMode('rest'); api.snip(); } // fold away so it is not in the picture
    if (act === 'mute') { sound('click'); await api.muteSet(!window.__winlandSysVolume?.muted).catch(() => {}); setTimeout(render, 250); }
    if (act === 'theme') { const p = window.__winlandRealPrefs(); window.__winlandSaveDraft({ ...p, theme: p.theme === 'light' ? 'dark' : 'light' }); setTimeout(render, 50); }
    if (out) {
      sound('click');
      const r = await api.outputSet(out).catch(() => null);
      if (r?.outputs?.length) outputs = r.outputs;
      const now = outputs.find(o => o.default); if (now) window.__winlandFlash?.(L().switched(split(now.name)[0]), 1600);
      render();
    }
  });

  let shown = false;
  (function position() {
    const show = currentView === 'controls' && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) { window.__winlandPage.place(root, contentRect()); if (!shown) { shown = true; lastHtml = ''; load(); } render(); } else shown = false;
    requestAnimationFrame(position);
  })();
  window.__winlandOutputName = () => split(outputs.find(o => o.default)?.name)[0] || '';
  setTimeout(load, 5000);
  canvas.addEventListener('click', e => { if (inside(e.clientX, e.clientY, hit.controlsApp)) { e.preventDefault(); e.stopImmediatePropagation(); setView('controls'); } }, true);
})();
