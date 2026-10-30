'use strict';
// Studio page (music production): a metronome (tempo, tap, beats per bar, the first beat accented) and a level meter
// of what the PC plays (the sound WinLand already listens to for its bars, extras-ui.js), with a red CLIP light when
// the sound hits the top. With "Alerte de saturation" on, the island also warns while you work in your DAW.
(function studioPage() {
  const root = document.createElement('section'); root.id = 'winland-studio'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#winland-studio{position:absolute;z-index:60;display:none;color:#fff;font:12px/1.4 Inter,"Segoe UI",sans-serif;pointer-events:auto}
#winland-studio *{box-sizing:border-box}
#winland-studio button{border:0;background:#1c1c1e;color:#fff;font:inherit;cursor:pointer;border-radius:12px;transition:background .15s,transform .1s}
#winland-studio button:hover{background:#2c2c2e}#winland-studio button:active{transform:scale(.96)}
#winland-studio .st-wrap{height:100%;display:grid;grid-template-columns:1.25fr 1fr;gap:14px}
#winland-studio .st-box{border-radius:16px;background:#121214;padding:12px 14px;display:flex;flex-direction:column;gap:8px;min-height:0}
#winland-studio small{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#8e8e93;font-weight:600}
#winland-studio .st-bpm{display:flex;align-items:center;gap:10px}
#winland-studio .st-bpm b{font-size:40px;font-weight:700;line-height:1;min-width:84px;text-align:center;font-variant-numeric:tabular-nums}
#winland-studio .st-bpm button{width:34px;height:34px;font-size:18px !important;font-weight:600}
#winland-studio .st-row{display:flex;gap:8px}
#winland-studio .st-row button{flex:1;height:34px;font-size:12px !important;font-weight:600 !important}
#winland-studio .st-go.on{background:#bf5af2}
#winland-studio .st-beats{display:flex;gap:6px}
#winland-studio .st-beats i{flex:1;height:8px;border-radius:4px;background:#2c2c2e;transition:background .06s}
#winland-studio .st-beats i.on{background:#fff}#winland-studio .st-beats i.on.first{background:#bf5af2}
#winland-studio .st-meter{flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px}
#winland-studio .st-lane{height:12px;border-radius:6px;background:#2c2c2e;position:relative;overflow:hidden}
#winland-studio .st-lane i{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:linear-gradient(90deg,#30d158 0%,#30d158 70%,#ffd60a 85%,#ff453a 100%);background-size:var(--w,300px) 100%}
#winland-studio .st-lane u{position:absolute;top:0;bottom:0;width:2px;background:#fff}
#winland-studio .st-db{display:flex;justify-content:space-between;font-size:11px;color:#8e8e93;font-variant-numeric:tabular-nums}
#winland-studio .st-clip{align-self:flex-start;font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:#2c2c2e;color:#8e8e93}
#winland-studio .st-clip.on{background:#ff453a;color:#fff}
#winland-studio .st-page{height:100%;display:flex;flex-direction:column;gap:10px}
#winland-studio .st-tabs{display:flex;gap:6px;flex:none}
#winland-studio .st-tabs button{height:28px;padding:0 12px;border-radius:9px;font-size:12px!important;font-weight:600!important;color:#a1a1ab}
#winland-studio .st-tabs button.on{background:#fff;color:#000}
#winland-studio .st-body{flex:1;min-height:0}
#winland-studio .st-big{display:flex;align-items:center;justify-content:center;gap:26px;height:100%}
#winland-studio .st-note{font-size:64px;font-weight:800;letter-spacing:-2px;min-width:110px;text-align:center}
#winland-studio .st-note small{font-size:24px;color:#8e8e93;letter-spacing:0}
#winland-studio .st-cents{width:280px}
#winland-studio .st-scale{position:relative;height:14px;border-radius:7px;background:#1c1c1e}
#winland-studio .st-scale i{position:absolute;top:-4px;width:6px;height:22px;border-radius:3px;background:#30d158;transition:left .12s}
#winland-studio .st-scale u{position:absolute;left:50%;top:-6px;width:2px;height:26px;background:#fff;opacity:.5}
#winland-studio .st-sub{color:#8e8e93;font-size:12px;margin-top:8px;text-align:center}
#winland-studio .st-memos{display:flex;flex-direction:column;gap:4px;min-width:280px;max-height:150px;overflow:auto}
#winland-studio .st-memo{display:flex;align-items:center;justify-content:space-between;gap:10px;height:30px;padding:0 10px;border-radius:9px;background:#1c1c1e;font-size:12px}
#winland-studio .st-rec{width:72px;height:72px;border-radius:50%!important;background:#ff453a!important;font-size:13px!important;font-weight:700!important}
#winland-studio .st-rec.on{animation:st-pulse 1s infinite}
@keyframes st-pulse{50%{box-shadow:0 0 0 10px rgba(255,69,58,.25)}}`;
  document.head.appendChild(style);
  const WORDS = {
    fr: { tuner: 'Accordeur', memos: 'Notes vocales', metro: 'Métronome', tap: 'Taper', start: 'Démarrer', stop: 'Arrêter', beats: 'temps', level: 'Niveau de sortie', peak: 'crête', rms: 'moyen', quiet: 'Rien ne joue', clip: 'SATURATION' },
    en: { tuner: 'Tuner', memos: 'Voice notes', metro: 'Metronome', tap: 'Tap', start: 'Start', stop: 'Stop', beats: 'beats', level: 'Output level', peak: 'peak', rms: 'average', quiet: 'Nothing playing', clip: 'CLIP' }
  };
  const L = () => WORDS[window.__winlandPrefs?.().lang === 'en' ? 'en' : 'fr'];
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  // ---- metronome: sample-accurate clicks scheduled a little ahead (Web Audio), the first beat of a bar higher ----
  let bpm = store.get('winland:bpm', 120), perBar = store.get('winland:beats', 4), on = false, ac = null, next = 0, beat = 0, timer = null, shownBeat = -1;
  const taps = [];
  function click(at, first) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = first ? 1760 : 1175; o.type = 'square';
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(first ? 0.35 : 0.22, at + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    o.connect(g).connect(ac.destination); o.start(at); o.stop(at + 0.06);
  }
  function schedule() {
    while (next < ac.currentTime + 0.12) {
      const b = beat; click(next, b === 0);
      const wait = (next - ac.currentTime) * 1000; setTimeout(() => { shownBeat = b; paintBeats(); }, Math.max(0, wait));
      next += 60 / bpm; beat = (beat + 1) % perBar;
    }
  }
  function start() { ac ||= new AudioContext(); ac.resume(); next = ac.currentTime + 0.06; beat = 0; on = true; timer = setInterval(schedule, 25); render(true); }
  function stop() { on = false; clearInterval(timer); shownBeat = -1; render(true); }
  const setBpm = v => { bpm = Math.max(30, Math.min(260, Math.round(v))); store.set('winland:bpm', bpm); render(true); };
  function tap() {
    const now = performance.now(); if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
    taps.push(now); if (taps.length > 6) taps.shift();
    if (taps.length >= 2) setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
  }
  function paintBeats() { root.querySelectorAll('.st-beats i').forEach((el, i) => el.classList.toggle('on', i === shownBeat)); }

  // ---- level meter (extras-ui.js __winlandMeter: peak and average of the last moment, 0..1) ----
  const db = v => v > 0.00001 ? Math.max(-60, 20 * Math.log10(v)) : -60;
  let hold = 0, holdAt = 0, clipAt = 0;
  function paintMeter() {
    const m = window.__winlandMeter?.(), lanes = root.querySelectorAll('.st-lane'); if (!lanes.length) return;
    const now = performance.now(), w = L();
    const peak = m?.peak || 0, rms = m?.rms || 0;
    if (peak >= hold || now - holdAt > 1200) { hold = peak; holdAt = now; }
    if (m?.clipped) clipAt = now;
    const pos = v => `${Math.round(100 * (db(v) + 60) / 60)}%`;
    lanes[0].querySelector('i').style.width = pos(peak); lanes[0].querySelector('u').style.left = pos(hold);
    lanes[1].querySelector('i').style.width = pos(rms);
    const n = v => db(v).toFixed(1).replace('.', window.__winlandPrefs?.().lang === 'en' ? '.' : ','); // -12,4 dB in French
    root.querySelector('.st-db').innerHTML = m ? `<span>${w.peak} ${n(peak)} dB</span><span>${w.rms} ${n(rms)} dB</span>` : `<span>${w.quiet}</span>`;
    root.querySelector('.st-clip').classList.toggle('on', now - clipAt < 1500);
  }

  let lastKey = '', tab = 'metro'; // metronome · tuner · BPM of what plays · voice notes (studio-tools-ui.js)
  function render(force) {
    if (currentView !== 'studio') return;
    const w = L(), key = [bpm, perBar, on, w.metro, tab].join('|');
    if (!force && key === lastKey) return; lastKey = key;
    const tabs = `<div class="st-tabs">${[['metro', w.metro], ['tuner', w.tuner], ['bpm', 'BPM'], ['memo', w.memos]].map(([id, label]) => `<button type="button" data-tab="${id}" class="${tab === id ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    if (tab !== 'metro') { root.innerHTML = `<div class="st-page">${tabs}<div class="st-body">${window.__winlandStudioTools?.html(tab) || ''}</div></div>`; window.__winlandStudioTools?.mounted(tab, root); return; }
    root.innerHTML = `<div class="st-page">${tabs}<div class="st-body"><div class="st-wrap"><div class="st-box"><small>${w.metro}</small>
      <div class="st-bpm"><button type="button" data-bpm="-1">−</button><b>${bpm}</b><button type="button" data-bpm="1">+</button><span style="color:#8e8e93;font-size:12px">BPM</span></div>
      <div class="st-beats">${Array.from({ length: perBar }, (_, i) => `<i class="${i === 0 ? 'first' : ''}"></i>`).join('')}</div>
      <div class="st-row"><button type="button" class="st-go ${on ? 'on' : ''}" data-go="1">${on ? w.stop : w.start}</button><button type="button" data-tap="1">${w.tap}</button><button type="button" data-per="1">${perBar} ${w.beats}</button></div></div>
      <div class="st-box"><small>${w.level}</small><div class="st-meter"><div class="st-lane"><i></i><u></u></div><div class="st-lane"><i></i></div><div class="st-db"></div></div><span class="st-clip">${w.clip}</span></div></div></div></div>`;
    paintBeats();
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { const before = tab; tab = b.dataset.tab; if (before !== tab) window.__winlandStudioTools?.left(before); render(true); return; }
    if (window.__winlandStudioTools?.click(b, tab)) return;
    if (b.dataset.bpm) setBpm(bpm + Number(b.dataset.bpm) * (e.shiftKey ? 10 : 1));
    if (b.dataset.go) on ? stop() : start();
    if (b.dataset.tap) tap();
    if (b.dataset.per) { perBar = perBar >= 7 ? 2 : perBar + 1; store.set('winland:beats', perBar); beat = 0; render(true); }
  });

  let shown = false, meterTimer = null;
  (function position() {
    const show = currentView === 'studio' && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) { window.__winlandPage.place(root, contentRect()); if (!shown) { shown = true; render(true); meterTimer = setInterval(paintMeter, 50); } }
    else if (shown) { shown = false; clearInterval(meterTimer); window.__winlandStudioTools?.left(tab); }
    requestAnimationFrame(position);
  })();
  window.__winlandStudioBpm = v => setBpm(v); // the BPM tool can hand its tempo to the metronome
  window.__winlandStudioStatus = () => on ? `♩ ${bpm} BPM` : `${bpm} BPM`;
  window.__winlandStudioOpen = () => shown;
  canvas.addEventListener('click', e => { if (inside(e.clientX, e.clientY, hit.studioApp)) { e.preventDefault(); e.stopImmediatePropagation(); setView('studio'); } }, true);
})();
