'use strict';
// Pip, WinLand's mascot: a small rounded square with two eyes, nothing else. The eyes do all the talking: the traffic-light
// colours (busy, question, done, error: ai-monitor-ui.js), blinking, and the moods of winland-fun.js (happy, surprised,
// sleepy, dizzy…) drawn by drawEye in mascot.html. No body colours, no outfits, no hands.
// drawGhost is the one place every screen draws the mascot (the island, the chat, the settings app's big face).
(function pip() {
  const BODY = ['#ffffff', '#dedee4'], LINE = 'rgba(0,0,0,.14)', EYE = '#1c1c1e';
  drawGhost = function (x, y, diameter) {
    if (window.__winlandCarried?.() && !window.__winlandBuddyDrawing) return;
    const s = diameter / 82, t = performance.now(), fx = window.__winlandGhostFx?.() || {};
    const status = window.__winlandLockerDraw ? null : window.__winlandEyes?.(); // the settings app shows Pip's own look
    const cross = typeof angry === 'number' && angry > 0.05, spin = typeof dizzy === 'number' ? dizzy : 0;
    const eye = cross ? '#ff453a' : status?.color || EYE;
    const alpha = status?.blink ? 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(t / 200)) : 1;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.rotate(Math.sin(t * 0.006) * 0.08 * spin);
    ctx.translate(0, fx.dy || 0);
    ctx.scale((fx.scale ?? 1) * (fx.sx ?? 1), (fx.scale ?? 1) * (fx.sy ?? 1)); // squash and stretch (?? not ||: 0 hides him)
    ctx.rotate(fx.tilt || 0);
    // the body: one rounded square, lit from the top, a soft shadow under it
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    const g = ctx.createLinearGradient(0, -31, 0, 31); g.addColorStop(0, BODY[0]); g.addColorStop(1, BODY[1]);
    ctx.beginPath(); ctx.roundRect(-36, -31, 72, 62, 22); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.roundRect(-35.25, -30.25, 70.5, 60.5, 21.5); ctx.strokeStyle = LINE; ctx.lineWidth = 1.5; ctx.stroke();
    // the eyes, a little bigger than the old ones; they glow in the status colour when something happens
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 13 + (typeof ghostLookX === 'number' ? ghostLookX * 0.7 : 0), 1 + (typeof ghostLookY === 'number' ? ghostLookY * 0.7 : 0));
      ctx.scale(1.3, 1.3); ctx.globalAlpha *= alpha;
      if (status) { ctx.shadowColor = eye; ctx.shadowBlur = 8; }
      drawEye(side, eye, cross ? null : fx.mood);
      ctx.restore();
    }
    if (fx.mood === 'sleep') { // z z z floating up
      ctx.fillStyle = '#9aa0a6'; ctx.font = '700 15px Inter, "Segoe UI", sans-serif';
      ['z', 'z', 'Z'].forEach((letter, i) => { const k = (t / 2000 + i / 3) % 1; ctx.globalAlpha = 1 - k; ctx.fillText(letter, 30 + k * 16, -18 - k * 32); });
    }
    ctx.restore();
  };
})();
