'use strict';
// Studio tools (tabs of the Studio page, studio-ui.js):
// - Tuner: the note you play or sing into the microphone, and how many cents off it is
// - BPM: the tempo of what the PC plays (from WinLand's level meter), and "use it" for the metronome
// - Voice notes: record an idea in one click; saved as files in Music\WinLand
// The microphone is only open while the Tuner or a recording runs, and nothing leaves this PC.
(function studioTools() {
  const api = window.winland;
  const prefs = () => window.__winlandPrefs?.() || {};
  const T = (fr, en) => prefs().lang === 'en' ? en : fr;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FR_NOTES = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
  let el = null, loop = null;

  // ---------- tuner ----------
  let mic = null;
  async function micOn() {
    if (mic) return mic;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const ctx = new AudioContext(), analyser = ctx.createAnalyser(); analyser.fftSize = 4096;
    ctx.createMediaStreamSource(stream).connect(analyser);
    mic = { stream, ctx, analyser, buf: new Float32Array(analyser.fftSize) }; return mic;
  }
  function micOff() { mic?.stream.getTracks().forEach(t => t.stop()); mic?.ctx.close().catch(() => {}); mic = null; }
  // the pitch of a sound: autocorrelation, with a parabola between samples for precision
  function pitch(buf, rate) {
    let rms = 0; for (const v of buf) rms += v * v; rms = Math.sqrt(rms / buf.length); if (rms < 0.01) return 0;
    const n = buf.length, half = n >> 1, c = new Float32Array(half);
    for (let lag = 0; lag < half; lag++) { let sum = 0; for (let i = 0; i < half; i++) sum += buf[i] * buf[i + lag]; c[lag] = sum; }
    let d = 0; while (d < half - 1 && c[d] > c[d + 1]) d++;
    let best = -1, at = -1; for (let i = d; i < half; i++) if (c[i] > best) { best = c[i]; at = i; }
    if (at <= 0 || at >= half - 1) return 0;
    const x1 = c[at - 1], x2 = c[at], x3 = c[at + 1], a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2, shift = a ? -b / (2 * a) : 0;
    const f = rate / (at + shift); return f > 40 && f < 2000 ? f : 0;
  }
  function tunerFrame() {
    if (!mic || !el) return;
    mic.analyser.getFloatTimeDomainData(mic.buf);
    const f = pitch(mic.buf, mic.ctx.sampleRate), note = el.querySelector('.st-note'), mark = el.querySelector('.st-scale i'), sub = el.querySelector('.st-sub');
    if (!note) return;
    if (!f) { sub.textContent = T('Joue ou chante une note…', 'Play or sing a note…'); return; }
    const midi = 69 + 12 * Math.log2(f / 440), near = Math.round(midi), cents = Math.round((midi - near) * 100), name = (prefs().lang === 'en' ? NOTES : FR_NOTES)[((near % 12) + 12) % 12];
    note.innerHTML = `${esc(name)}<small>${Math.floor(near / 12) - 1}</small>`;
    mark.style.left = `calc(${50 + cents}% - 3px)`; mark.style.background = Math.abs(cents) <= 5 ? '#30d158' : Math.abs(cents) <= 20 ? '#ffd60a' : '#ff453a';
    sub.textContent = `${f.toFixed(1)} Hz · ${cents > 0 ? '+' : ''}${cents} cents${Math.abs(cents) <= 5 ? ' · ' + T('juste ✓', 'in tune ✓') : ''}`;
  }

  // ---------- BPM of what plays ----------
  let energy = [], lastE = 0, found = 0, sure = 0;
  function bpmFrame() {
    const m = window.__winlandMeter?.(); const e = m ? m.rms : 0;
    energy.push(Math.max(0, e - lastE)); lastE = e; // onsets: where the sound gets louder
    if (energy.length > 500) energy.shift(); // ~10 s at 50 per second
    if (energy.length >= 250 && energy.length % 25 === 0) {
      let best = 0, bestLag = 0, total = 0; const mean = energy.reduce((a, b) => a + b, 0) / energy.length;
      for (let lag = 15; lag <= 43; lag++) { // 70–200 BPM at 50 samples a second
        let sum = 0; for (let i = lag; i < energy.length; i++) sum += (energy[i] - mean) * (energy[i - lag] - mean);
        total += Math.max(0, sum); if (sum > best) { best = sum; bestLag = lag; }
      }
      if (bestLag) { let bpm = 3000 / bestLag; while (bpm < 80) bpm *= 2; while (bpm > 170) bpm /= 2; found = Math.round(bpm); sure = total ? best / total : 0; }
    }
    if (!el) return;
    const big = el.querySelector('.st-note'), sub = el.querySelector('.st-sub'); if (!big) return;
    big.textContent = found || '—';
    sub.textContent = !m ? T('Lance de la musique : WinLand écoute ce que joue le PC.', 'Play some music: WinLand listens to what the PC plays.')
      : energy.length < 250 ? T('J’écoute…', 'Listening…') : `${T('confiance', 'confidence')} ${Math.round(Math.min(1, sure * 4) * 100)} %`;
  }

  // ---------- voice notes ----------
  let rec = null, chunks = [], recStart = 0, memos = [];
  async function loadMemos() { const r = await api.studioMemos?.().catch(() => null); memos = r?.memos || []; if (el) el.querySelector('.st-memos') && (el.querySelector('.st-memos').innerHTML = memoList()); }
  const memoList = () => memos.length ? memos.map(m => `<div class="st-memo"><span>${esc(m.name)}</span><button type="button" data-memo="${esc(m.name)}">▶</button></div>`).join('')
    : `<div class="st-sub">${T('Aucune note vocale pour l’instant.', 'No voice notes yet.')}</div>`;
  async function toggleRec(button) {
    if (rec) { rec.stop(); return; }
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { window.__winlandFlash?.(T('🎙️ Micro inaccessible', '🎙️ Microphone unavailable'), 2000); return; }
    chunks = []; rec = new MediaRecorder(stream, { mimeType: 'audio/webm' }); recStart = Date.now();
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop()); rec = null;
      const buf = new Uint8Array(await new Blob(chunks, { type: 'audio/webm' }).arrayBuffer());
      let bin = ''; for (let i = 0; i < buf.length; i += 32768) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
      const r = await api.studioMemoSave?.(btoa(bin)).catch(() => null);
      window.__winlandFlash?.(r?.name ? `🎙️ ${T('Note vocale enregistrée', 'Voice note saved')} · ${r.name}` : T('⚠ Enregistrement raté', '⚠ Recording failed'), 2400);
      paint('memo'); loadMemos();
    };
    rec.start(500); paint('memo');
  }

  // ---------- the tabs ----------
  function html(tab) {
    if (tab === 'tuner') return `<div class="st-big"><div class="st-note">—</div><div class="st-cents"><div class="st-scale"><u></u><i style="left:calc(50% - 3px)"></i></div><div class="st-sub">${T('Ouverture du micro…', 'Opening the microphone…')}</div></div></div>`;
    if (tab === 'bpm') return `<div class="st-big"><div class="st-note">—</div><div class="st-cents"><div class="st-sub">${T('J’écoute…', 'Listening…')}</div><div class="st-row" style="margin-top:12px"><button type="button" data-usebpm="1">${T('Mettre au métronome', 'Use for the metronome')}</button><button type="button" data-resetbpm="1">${T('Recommencer', 'Start again')}</button></div></div></div>`;
    if (tab === 'memo') return `<div class="st-big"><button type="button" class="st-rec ${rec ? 'on' : ''}" data-rec="1">${rec ? T('Stop', 'Stop') : 'REC'}</button><div><div class="st-memos">${memoList()}</div><div class="st-row" style="margin-top:8px"><button type="button" data-memofolder="1">${T('Ouvrir le dossier', 'Open the folder')}</button></div></div></div>`;
    return '';
  }
  function paint(tab) { const body = el?.querySelector('.st-body'); if (body) { body.innerHTML = html(tab); } }
  function mounted(tab, root) {
    el = root; clearInterval(loop); loop = null;
    if (tab === 'tuner') micOn().then(() => { loop = setInterval(tunerFrame, 80); }).catch(() => { const s = el?.querySelector('.st-sub'); if (s) s.textContent = T('Micro inaccessible.', 'Microphone unavailable.'); });
    if (tab === 'bpm') loop = setInterval(bpmFrame, 20);
    if (tab === 'memo') loadMemos();
  }
  function left(tab) { clearInterval(loop); loop = null; if (tab === 'tuner') micOff(); }
  function click(b) {
    if (b.dataset.rec) { toggleRec(b); return true; }
    if (b.dataset.memo) { api.studioMemoOpen?.(b.dataset.memo); return true; }
    if (b.dataset.memofolder) { api.studioMemoOpen?.(''); return true; }
    if (b.dataset.usebpm) { if (found) { window.__winlandStudioBpm?.(found); window.__winlandFlash?.(`♩ ${found} BPM`, 1400); } return true; }
    if (b.dataset.resetbpm) { energy = []; found = 0; return true; }
    return false;
  }
  window.__winlandStudioTools = { html, mounted, left, click };
})();
