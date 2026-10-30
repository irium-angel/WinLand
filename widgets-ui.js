// The desktop widgets (widgets-main.cjs) show what the island knows: the music playing and Claude Code.
// The island sends it about once a second (the album cover only when the song changes) and does the music
// buttons pressed on a widget.
(function widgetsFeed() {
  'use strict';
  const api = window.winland; if (!api?.widgetsState) return;
  const tr = s => String(s || '').slice(0, 160);
  let coverSent = null;
  setInterval(() => {
    const cover = spotifyState?.track?.image_url || '';
    const dur = spotifyState?.duration_ms || 0, playing = Boolean(spotifyState?.is_playing);
    const at = Math.min(dur || Infinity, (spotifyState?.progress_ms || 0) + (playing && typeof spotifySyncAt === 'number' ? performance.now() - spotifySyncAt : 0));
    const cc = (window.__winlandMonitorIndicator || []).find(p => p.provider === 'claudecode' && p.connected) || {};
    const s = {
      music: { title: tr(spotifyState?.track?.name), artist: tr(spotifyState?.track?.artist), playing, at: Math.round(at || 0), duration: dur, source: tr(spotifyState?.source), colour: window.__winlandAlbumColour || '' },
      claude: { state: cc.permission ? 'question' : cc.state || '', project: tr(cc.source?.title), detail: tr(cc.detail), question: String(cc.question || '').slice(0, 300) }
    };
    if (cover !== coverSent) { coverSent = cover; s.cover = cover; }
    api.widgetsState(s);
  }, 1000);
  api.onWidgetsDo?.(a => {
    if (!['play', 'pause', 'next', 'previous'].includes(a?.kind)) return;
    api.spotifyControl(a.kind); setTimeout(() => { if (typeof refreshSpotify === 'function') refreshSpotify(); }, 400);
  });
})();
