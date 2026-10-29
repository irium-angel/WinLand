'use strict';
// One layout for every big page (Apps, Settings, Claude Code, Lade, Focus, Spotify), so everything lines up:
// the title and a grey subtitle always at the same height, the content always starting on the same line.
// WinLand only appears where he does something (Spotify: dancing, Lade: catching files). The other UI files use window.__winlandPage.
(function pageLayout() {
  const PAGES = ['apps', 'settings', 'spotify', 'monitor', 'assistant', 'tray', 'mirror', 'focus', 'clips', 'note', 'chat', 'dev', 'controls', 'system', 'studio', 'software'];
  const PAGE = {
    height: 300,
    contentX: 24,   // left edge of titles and content: WinLand only appears on pages where he does something
    titleY: 24,     // title baseline
    subtitleY: 44,  // subtitle baseline
    bodyY: 62,      // where content starts
    ghost: { x: 46, y: 58, size: 60 },
    isPage: view => PAGES.includes(view),
    // WinLand in its standard spot (moved, e.g. while catching a file, when a position is given).
    drawGhost(area, at) {
      const x = at?.x ?? area.x + PAGE.ghost.x, y = at?.y ?? area.y + PAGE.ghost.y;
      drawGhost(x, y, PAGE.ghost.size);
      hit.ghost = { x: x - 40, y: y - 36, width: 80, height: 72 };
      return { x, y };
    },
    // Title + subtitle drawn on the canvas (for canvas pages).
    title(area, title, subtitle, right) {
      const x = area.x + PAGE.contentX, width = area.width - PAGE.contentX - (right || 0);
      text(title, x, area.y + PAGE.titleY, 18, '#ffffff', 700, 'left', width);
      if (subtitle) text(subtitle, x, area.y + PAGE.subtitleY, 11, '#9aa596', 400, 'left', width);
    },
    // Position a DOM panel (Settings, Claude Code, Lade, Spiegel) on the content column.
    place(el, area) {
      el.style.left = `${area.x}px`; el.style.top = `${area.y}px`; // the same 24px margin as the header above it
      el.style.width = `${Math.max(100, area.width)}px`;
      el.style.height = `${area.height}px`; // fixed height, so long pages (Settings) scroll
    }
  };
  window.__winlandPage = PAGE;

  const baseHeight = targetHeight;
  // Spotify is a wide, low player (like NotchNook); the other pages need more height.
  // every page only as tall as it needs (like the Dynamic Island: tight around its content)
  const HEIGHTS = { spotify: 184, focus: 254, tray: 178, clips: 262, note: 250, chat: 300, apps: 246, mirror: 280, settings: 320, dev: 300, controls: 300, system: 230, studio: 236, software: 252 };
  targetHeight = function () { return HEIGHTS[currentView] || (PAGE.isPage(currentView) ? PAGE.height : baseHeight()); };

  // Smooth page changes (this replaced blob-ui.js): opening the island blurs the content in, going to another page slides it in from that side.
  let lastView = null, changedAt = 0, lastMode = null, slideDir = 0, opening = false;
  const ROOTS = ['winland-ai-monitor', 'winland-settings-v2', 'winland-extras', 'winland-focus', 'winland-tools', 'winland-chat', 'winland-dev', 'winland-controls', 'winland-system', 'winland-studio', 'winland-software'];
  const shownBefore = {};
  const enter = el => { if (window.__winlandPrefs?.().appAnim === false) return; const cls = opening ? 'tc-enter' : 'tc-slide'; el.classList.remove('tc-enter', 'tc-slide'); void el.offsetWidth; el.classList.add(cls); };
  (function watch() {
    const opened = mode === 'expanded' && lastMode !== 'expanded';
    if (currentView !== lastView || opened) {
      opening = opened; slideDir = opened ? 0 : (window.__winlandNavDir ?? 0); window.__winlandNavDir = 0;
      lastView = currentView; changedAt = performance.now();
      document.documentElement.style.setProperty('--tc-dx', `${slideDir * 26}px`);
      for (const id of ROOTS) shownBefore[id] = false; // a page that stays (e.g. Klembord → Notitie) slides in again too
    }
    lastMode = mode;
    for (const id of ROOTS) { // a DOM page that just appeared comes in like the canvas pages
      const el = document.getElementById(id); if (!el) continue;
      const shown = el.style.display !== 'none' && el.style.display !== '';
      if (shown && !shownBefore[id]) enter(el);
      shownBefore[id] = shown;
    }
    requestAnimationFrame(watch);
  })();
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  window.__winlandPageAnim = () => ({ opening, slideDir, since: Math.round(performance.now() - changedAt), view: lastView, mode: lastMode }); // for tests
  const baseExpanded = drawExpanded;
  drawExpanded = function (alpha) {
    if (!opening) { // another page: the frame stays put, only the content slides in from the side you went to
      const k = Math.min(1, (performance.now() - changedAt) / 280), e = 1 - Math.pow(1 - k, 3);
      if (e >= 0.995 || window.__winlandPrefs?.().appAnim === false) { baseExpanded(alpha); return; } // Settings → Animaties → App-animaties
      drawHeader(alpha); // the frame (header, ‹ ›, tabs) does not move
      const keep = drawHeader; drawHeader = () => {};
      ctx.save(); if (!calm?.matches) ctx.translate(slideDir * 26 * (1 - e), 0); ctx.globalAlpha *= 0.15 + 0.85 * e;
      try { baseExpanded(alpha); } finally { ctx.restore(); drawHeader = keep; }
      return;
    }
    const target = targetHeight(), grown = Math.max(0, Math.min(1, (visual.height - 60) / Math.max(1, target - 60)));
    const k = Math.min(grown, Math.min(1, (performance.now() - changedAt) / 300)), e = 1 - Math.pow(1 - k, 3);
    if (e >= 0.995) { baseExpanded(alpha); return; }
    ctx.save();
    if (!calm?.matches) { const cx = islandBounds.x + islandBounds.width / 2, sc = 0.94 + 0.06 * e; ctx.translate(cx, 0); ctx.scale(sc, sc); ctx.translate(-cx, 0); ctx.filter = `blur(${((1 - e) * 8).toFixed(2)}px)`; }
    ctx.globalAlpha *= e;
    baseExpanded(alpha);
    ctx.restore();
  };

  // Shared look for the DOM pages' title and subtitle.
  const style = document.createElement('style');
  style.textContent = `
.tc-page-title{font:700 18px/24px Inter, "Segoe UI", sans-serif;color:#fff;margin:6px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tc-page-sub{font:400 11px/16px Inter, "Segoe UI", sans-serif;color:#9aa596;margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tc-page-head{display:flex;align-items:flex-start;gap:10px;height:${PAGE.bodyY - 6}px;flex:none}
.tc-page-head > div{flex:1;min-width:0}
/* Same Windows 11 font in every panel */
#winland-ai-monitor,#winland-ai-monitor *,#winland-settings-v2,#winland-settings-v2 *,#winland-extras,#winland-extras *,#winland-focus,#winland-focus *,#winland-tools,#winland-tools *:not(.tl-clip){font-family:Inter, "Segoe UI",sans-serif !important}
.tc-page-title{font-family:Inter, "Segoe UI",sans-serif !important;letter-spacing:-.2px}
.tc-enter{animation:tc-enter .34s cubic-bezier(.2,.8,.2,1);transform-origin:50% 0}
@keyframes tc-enter{from{opacity:0;transform:scale(.95);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
.tc-slide{animation:tc-slide .28s cubic-bezier(.2,.8,.2,1)}
@keyframes tc-slide{from{opacity:.15;transform:translateX(var(--tc-dx,0px))}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.tc-enter{animation:tc-fade .2s ease-out}@keyframes tc-fade{from{opacity:0}}}
/* Calmer, more refined settings rows and buttons */
#winland-settings-v2 .tc-setting-row{background:#0f120f;border:1px solid rgba(255,255,255,.06);border-radius:14px;transition:border-color .15s,background .15s}
#winland-settings-v2 .tc-setting-row:hover{border-color:rgba(255,255,255,.12);background:#121612}
#winland-settings-v2 .tc-setting-row strong{font-size:12px;font-weight:600}
#winland-settings-v2 .tc-group{color:#9aa596 !important;letter-spacing:.08em !important;font-size:10px !important}
#winland-settings-v2 .tc-toggle,#winland-settings-v2 .tc-chip{border:1px solid rgba(255,255,255,.08) !important;transition:background .15s,transform .1s}
#winland-settings-v2 .tc-toggle:active,#winland-settings-v2 .tc-chip:active{transform:scale(.96)}
#winland-settings-v2 .tc-settings-content{scroll-behavior:smooth}
/* Buttons in panels */
#winland-ai-monitor button,#winland-extras button,#winland-focus button{transition:background .15s,border-color .15s,transform .1s}
#winland-ai-monitor button:active,#winland-extras button:active,#winland-focus button:active{transform:scale(.96)}`;
  document.head.appendChild(style);
})();
