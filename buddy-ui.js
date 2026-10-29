// Pip Buddy, island side. The picker (buddy-main.cjs + buddy.html) starts from the chat's "Viser l'écran" button
// or from Ctrl+Alt+Space anywhere: click a window and Pip looks at it, then the chat opens here about it.
// This file starts it, folds the island away while you pick, and draws Pip's face for the settings app.
(() => {
  const lang = () => (window.__winlandPrefs?.().lang === 'en' ? 'en' : 'fr');
  window.__winlandCarried = () => false; // Pip never leaves the island any more
  window.__winlandBuddyDrawing = false;
  window.__winlandPick = () => { // the Pip Buddy app can be turned off (Settings → Apps)
    if (window.__winlandAppsOff?.().has('buddy')) return false;
    window.winland.buddyGrab({ lang: lang() }); return true;
  };
  window.winland.onBuddyShortcut?.(() => window.__winlandPick());

  window.winland.onBuddy?.((kind, data) => {
    if (kind === 'collapse' && typeof setMode === 'function' && mode !== 'rest') setMode('rest', false); // out of the way while you pick
    if (kind === 'mood' && data?.mood) window.__winlandFeel?.(data.mood, Math.min(120000, +data.ms || 1000));
  });

  // The settings app shows a big Pip: drawn here once more in a free corner of the canvas, copied out, and the corner
  // put back (the screen only updates after this frame, so nobody sees it), from the settings you are trying out.
  const box = 200, face = document.createElement('canvas'), fctx = face.getContext('2d');
  let lastFrame = 0;
  function sendFace(now) {
    requestAnimationFrame(sendFace);
    if (!window.__winlandFaceForSettings || now - lastFrame < 50) return;
    lastFrame = now;
    window.winland.settingsFrame?.(drawFace());
  }
  function drawFace() {
    const dpr = canvas.width / (canvas.clientWidth || canvas.width) || 1, px = Math.ceil(box * dpr);
    if (face.width !== px) { face.width = px; face.height = px; }
    const backup = ctx.getImageData(0, 0, px, px);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, px, px); ctx.restore();
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    window.__winlandBuddyDrawing = true;
    try { window.__winlandDrawPreview(() => drawGhost(box / 2, box / 2, 120)); }
    finally { window.__winlandBuddyDrawing = false; ctx.restore(); }
    fctx.clearRect(0, 0, px, px); fctx.drawImage(canvas, 0, 0, px, px, 0, 0, px, px);
    ctx.putImageData(backup, 0, 0);
    return face.toDataURL('image/png');
  }
  requestAnimationFrame(sendFace);
})();
