// WinLand's desktop widgets: what each one shows. Used by each widget's window (widget.html) and by the
// gallery's previews (widgets-gallery.html). Everything comes from this PC: the clock, the Windows calendar,
// the music playing, the battery, the processor, Claude Code, and what you write or pick yourself.
(function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SVG = {
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    note: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    plug: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19.5h20"/>'
  };
  const icon = (name, size = 16) => `<svg class="ic" style="width:${size}px;height:${size}px" viewBox="0 0 24 24">${SVG[name]}</svg>`;
  const MEDIA = {
    play: '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="26" height="26"><rect x="5.5" y="4" width="4.6" height="16" rx="1.4"/><rect x="13.9" y="4" width="4.6" height="16" rx="1.4"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 6.2v11.6l8-5.8zM11 6.2v11.6l8-5.8z"/><rect x="19.2" y="6" width="2.2" height="12" rx="1.1"/></svg>',
    previous: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M21 6.2v11.6l-8-5.8zM13 6.2v11.6L5 12z"/><rect x="2.6" y="6" width="2.2" height="12" rx="1.1"/></svg>'
  };
  const KINDS = {
    clock: { fr: 'Horloge', en: 'Clock', sizes: ['s', 'm'], about: ['L’heure, avec une trotteuse qui glisse', 'The time, with a sweeping second hand'] },
    calendar: { fr: 'Calendrier', en: 'Calendar', sizes: ['s', 'm', 'l'], about: ['La date et tes rendez-vous du calendrier Windows', 'The date and your Windows calendar events'] },
    music: { fr: 'Musique', en: 'Music', sizes: ['s', 'm'], about: ['Ce qui joue, dans n’importe quelle app', 'What plays, in any app'] },
    battery: { fr: 'Batterie', en: 'Battery', sizes: ['s', 'm'], about: ['La charge de ton PC portable', 'Your laptop’s charge'] },
    system: { fr: 'Système', en: 'System', sizes: ['s', 'm'], about: ['Processeur et mémoire, en direct', 'Processor and memory, live'] },
    claude: { fr: 'Claude Code', en: 'Claude Code', sizes: ['s', 'm'], about: ['Ce que fait Claude, avec Pip', 'What Claude is doing, with Pip'] },
    note: { fr: 'Note', en: 'Note', sizes: ['s', 'm', 'l'], about: ['Un mot à garder sous les yeux', 'A note to keep in sight'] },
    countdown: { fr: 'Compte à rebours', en: 'Countdown', sizes: ['s', 'm'], about: ['Les jours avant une date', 'The days until a date'] },
    custom: { fr: 'Personnalisé', en: 'Custom', sizes: ['s', 'm', 'l'], about: ['Ta photo, ton titre, ton texte', 'Your picture, your title, your text'] }
  };
  const STATES = { busy: ['#ff9f0a', 'Claude travaille', 'Claude is working'], question: ['#ff9f0a', 'Claude te demande', 'Claude asks you'], done: ['#30d158', 'Terminé', 'Done'], error: ['#ff453a', 'Erreur', 'Error'] };
  const pad2 = n => String(n).padStart(2, '0');
  const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${pad2(s % 60)}`; };

  function ring(value, size, stroke, colour, middle) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>` +
      `<circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke="${colour}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - v)).toFixed(1)}"/></svg><div class="mid">${middle}</div></div>`;
  }

  // ---------- each kind: html(item, ctx) gives what it shows; the same data gives the same html (nothing redrawn) ----------
  const VIEWS = {
    clock(item, ctx) {
      const d = new Date(), lang = ctx.lang;
      const nums = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => { const a = i / 12 * 2 * Math.PI; return `<text x="${(50 + 37 * Math.sin(a)).toFixed(1)}" y="${(50 - 37 * Math.cos(a)).toFixed(1)}">${n}</text>`; }).join('');
      const ticks = Array.from({ length: 60 }, (_, i) => i % 5 ? `<line x1="50" y1="4.5" x2="50" y2="7" transform="rotate(${i * 6} 50 50)"/>` : '').join('');
      const dial = `<div class="dial"><svg viewBox="0 0 100 100"><circle class="face" cx="50" cy="50" r="49"/><g class="ticks">${ticks}</g><g class="hours">${nums}</g>
        <line class="hand h" x1="50" y1="52" x2="50" y2="29"/><line class="hand m" x1="50" y1="53" x2="50" y2="16"/>
        <g class="hand sec ${ctx.still ? '' : 'sweep'}" style="--sd:-${d.getSeconds() + d.getMilliseconds() / 1000}s"><line class="sec" x1="50" y1="58" x2="50" y2="10"/><circle class="pin" cx="50" cy="50" r="2.4"/><circle class="pin2" cx="50" cy="50" r="1"/></g></svg></div>`;
      if (item.size === 's') return dial;
      return dial + `<div class="side"><div class="num" data-time></div><div class="day">${esc(d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</div></div>`;
    },
    calendar(item, ctx) {
      const d = new Date(), loc = ctx.lang === 'en' ? 'en-GB' : 'fr-FR';
      const day = d.toLocaleDateString(loc, { weekday: 'long' }), now = Date.now();
      const events = (ctx.agenda || []).filter(e => e.allDay || e.start + (e.minutes || 0) * 60000 > now).slice(0, item.size === 's' ? 2 : 3);
      const evHtml = events.map(e => `<div class="ev"><i></i><div style="min-width:0"><b class="ell">${esc(e.title || '—')}</b><small class="ell">${e.allDay ? (ctx.lang === 'en' ? 'All day' : 'Toute la journée') : new Date(e.start).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}${e.place ? ' · ' + esc(e.place) : ''}</small></div></div>`).join('');
      const none = `<div class="none">${ctx.lang === 'en' ? 'No more events today' : 'Plus rien aujourd’hui'}</div>`;
      const head = `<div class="cap day">${esc(day)}</div><div class="num big">${d.getDate()}</div>`;
      if (item.size === 's') return `<div class="pad">${head}${evHtml || none}</div>`;
      if (item.size === 'm') return `<div class="pad"><div class="left">${head}<div class="dim" style="margin-top:auto;font-size:12px">${esc(d.toLocaleDateString(loc, { month: 'long', year: 'numeric' }))}</div></div><div class="right">${evHtml || none}</div></div>`;
      // large: the month, today in a red circle
      const first = new Date(d.getFullYear(), d.getMonth(), 1), shift = (first.getDay() + 6) % 7, days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const heads = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(loc, { weekday: 'narrow' }));
      let cells = heads.map(h => `<span class="h">${esc(h)}</span>`).join('');
      for (let i = 0; i < shift; i++) cells += '<span class="o"></span>';
      for (let n = 1; n <= days; n++) cells += `<span class="${n === d.getDate() ? 't' : ''}">${n}</span>`;
      return `<div class="pad"><div class="row" style="display:flex;justify-content:space-between;align-items:baseline"><div class="cap day">${esc(d.toLocaleDateString(loc, { month: 'long' }))}</div><div class="dim" style="font-size:12px;font-weight:600">${d.getFullYear()}</div></div>
        <div class="month">${cells}</div><div style="margin-top:auto">${evHtml || none}</div></div>`;
    },
    music(item, ctx) {
      const m = ctx.state?.music || {}, en = ctx.lang === 'en';
      const cover = m.title && ctx.cover ? `<img src="${esc(ctx.cover)}" alt="">` : icon('music', 26);
      const title = m.title || (en ? 'Nothing playing' : 'Rien ne joue'), artist = m.title ? m.artist || '' : (en ? 'Play music on this PC' : 'Lance de la musique sur ce PC');
      if (item.size === 's') return `<div class="pad"><div class="cover">${cover}</div>${m.source ? `<div class="src ell" style="max-width:80px">${esc(m.source)}</div>` : ''}<div class="t ell">${esc(title)}</div><div class="a ell">${esc(artist)}</div></div>`;
      const pct = m.duration ? Math.min(100, (m.at || 0) / m.duration * 100) : 0;
      return `<div class="pad"><div class="cover">${cover}</div><div class="info"><div class="t ell" style="margin-top:0">${esc(title)}</div><div class="a ell">${esc(artist)}</div>
        <div class="bar"><b style="width:${pct.toFixed(1)}%"></b></div><div class="a" style="font-size:11px;display:flex;justify-content:space-between"><span>${clock(m.at || 0)}</span><span>${m.duration ? '-' + clock(m.duration - (m.at || 0)) : ''}</span></div>
        <div class="ctl"><button data-do="previous" aria-label="${en ? 'Previous' : 'Précédent'}">${MEDIA.previous}</button><button data-do="${m.playing ? 'pause' : 'play'}" aria-label="${m.playing ? 'Pause' : (en ? 'Play' : 'Lecture')}">${m.playing ? MEDIA.pause : MEDIA.play}</button><button data-do="next" aria-label="${en ? 'Next' : 'Suivant'}">${MEDIA.next}</button></div></div>
        ${m.source ? `<div class="src ell" style="max-width:120px">${esc(m.source)}</div>` : ''}</div>`;
    },
    battery(item, ctx) {
      const b = ctx.battery, en = ctx.lang === 'en';
      if (!b || b.none) { // a desktop PC: no battery, on the mains
        const mid = `<span style="color:var(--green)">${icon('plug', 26)}</span>`;
        return `<div class="pad">${ring(1, item.size === 's' ? 112 : 120, 10, 'var(--green)', mid)}${item.size === 'm' ? `<div><div class="what">${en ? 'On the mains' : 'Sur secteur'}</div><div class="dim" style="font-size:12.5px">${en ? 'This PC has no battery' : 'Ce PC n’a pas de batterie'}</div></div>` : ''}</div>`;
      }
      const pct = Math.round(b.level * 100), colour = b.charging ? 'var(--green)' : pct <= 20 ? 'var(--red)' : pct <= 40 ? 'var(--orange)' : 'var(--green)';
      const mid = `<div><div class="num pct">${pct}</div><div style="color:${colour};display:flex;justify-content:center">${b.charging ? icon('bolt', 14) : icon('laptop', 14)}</div></div>`;
      if (item.size === 's') return `<div class="pad">${ring(b.level, 116, 11, colour, mid)}</div>`;
      const left = b.charging ? (isFinite(b.chargingTime) && b.chargingTime > 0 ? `${en ? 'Full in' : 'Pleine dans'} ${Math.floor(b.chargingTime / 3600)} h ${pad2(Math.round(b.chargingTime % 3600 / 60))}` : (en ? 'Charging' : 'En charge'))
        : (isFinite(b.dischargingTime) && b.dischargingTime > 0 ? `${Math.floor(b.dischargingTime / 3600)} h ${pad2(Math.round(b.dischargingTime % 3600 / 60))} ${en ? 'left' : 'restantes'}` : (en ? 'On battery' : 'Sur batterie'));
      return `<div class="pad">${ring(b.level, 124, 12, colour, mid)}<div><div class="what">${en ? 'This PC' : 'Ce PC'}</div><div class="num" style="font-size:32px;font-weight:600;margin:4px 0">${pct} %</div><div class="dim" style="font-size:12.5px">${esc(left)}</div></div></div>`;
    },
    system(item, ctx) {
      const s = ctx.system || { cpu: 0, ram: 0, history: [] }, en = ctx.lang === 'en';
      if (item.size === 's') return `<div class="pad"><div class="two">
        <div>${ring(s.cpu / 100, 60, 7, 'var(--green)', `<span class="val num">${s.cpu}</span>`)}<div class="lab">CPU</div></div>
        <div>${ring(s.ram / 100, 60, 7, 'var(--blue)', `<span class="val num">${s.ram}</span>`)}<div class="lab">RAM</div></div></div></div>`;
      const hist = (s.history || []).slice(-40), W = 312, H = 56;
      const pts = hist.map((v, i) => `${(i / Math.max(1, hist.length - 1) * W).toFixed(1)},${(H - 2 - v / 100 * (H - 4)).toFixed(1)}`);
      const line = pts.length > 1 ? `M${pts.join('L')}` : '';
      return `<div class="pad"><div class="row"><div class="cap dim">${en ? 'Processor' : 'Processeur'}</div><div class="num val" style="color:var(--green)">${s.cpu} %</div></div>
        <svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${line ? `<path class="area" d="${line}L${W},${H}L0,${H}Z"/><path d="${line}"/>` : ''}</svg>
        <div class="row" style="margin-top:8px"><div class="cap dim">${en ? 'Memory' : 'Mémoire'}</div><div style="font-size:12px;font-weight:600">${s.ramUsed ?? '–'} / ${s.ramTotal ?? '–'} Go</div></div>
        <div class="meter"><b style="width:${s.ram}%"></b></div></div>`;
    },
    claude(item, ctx) {
      const c = ctx.state?.claude || {}, en = ctx.lang === 'en', st = STATES[c.state];
      const eyes = st ? st[0] : '#1c1c1e', label = st ? (en ? st[2] : st[1]) : (en ? 'Nothing running' : 'Rien en cours');
      const pip = `<div class="pip" style="--e:${eyes}"><i></i><i></i></div>`;
      const words = `<div class="st ell">${esc(label)}</div>${c.project ? `<div class="pr ell">${esc(c.project)}</div>` : ''}`;
      if (item.size === 's') return `<div class="pad">${pip}${words}</div>`;
      return `<div class="pad">${pip}<div class="body"><div class="st ell" style="margin-top:0">${esc(label)}</div>${c.project ? `<div class="pr ell">${esc(c.project)}${c.detail ? ' · ' + esc(c.detail) : ''}</div>` : ''}${c.question ? `<div class="q">${esc(c.question)}</div>` : ''}</div></div>`;
    },
    note(item, ctx) {
      const en = ctx.lang === 'en';
      return `<div class="pad"><div class="cap">${icon('note', 15)}${en ? 'Notes' : 'Notes'}</div><div class="text" data-note data-empty="${en ? 'Click to write…' : 'Clique pour écrire…'}">${esc(item.opts?.text || '')}</div></div>`;
    },
    countdown(item, ctx) {
      const o = item.opts || {}, en = ctx.lang === 'en', loc = en ? 'en-GB' : 'fr-FR';
      const target = o.date ? new Date(o.date + 'T00:00:00') : null;
      const days = target ? Math.ceil((target - new Date().setHours(0, 0, 0, 0)) / 86400000) : null;
      const title = o.title || (en ? 'Countdown' : 'Compte à rebours');
      const big = days == null ? '–' : Math.abs(days), unit = days == null ? (en ? 'pick a date' : 'choisis une date') : days === 0 ? (en ? 'today' : 'aujourd’hui') : days > 0 ? (en ? (days > 1 ? 'days left' : 'day left') : (days > 1 ? 'jours' : 'jour')) : (en ? 'days ago' : 'jours passés');
      const style = `--a:${/^#[0-9a-f]{6}$/i.test(o.colour || '') ? o.colour : 'var(--orange)'}`;
      if (item.size === 's') return `<div class="pad" style="${style}"><div class="title ell">${esc(title)}</div><div class="num big">${big}</div><div class="unit">${esc(unit)}</div></div>`;
      return `<div class="pad" style="${style}"><div style="display:flex;flex-direction:column;height:100%"><div class="title ell">${esc(title)}</div><div class="num big">${big}</div><div class="unit">${esc(unit)}</div></div>
        <div class="when">${target ? esc(target.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) : ''}</div></div>`;
    },
    custom(item, ctx) {
      const o = item.opts || {}, pic = o.image && ctx.pictureUrl ? ctx.pictureUrl(o.image) : '';
      const words = o.title || o.text ? `${pic ? '<div class="shade"></div>' : ''}<div class="words"><b class="ell">${esc(o.title || '')}</b>${o.text ? `<span>${esc(o.text)}</span>` : ''}</div>` : '';
      return `${pic ? `<img src="${esc(pic)}" alt="">` : ''}${words}`;
    }
  };

  // Put a widget in an element; update(ctx) redraws only when what it shows has changed.
  function mount(el, item, ctx) {
    let shown = '', lastItem = null;
    const card = document.createElement('div');
    el.replaceChildren(card);
    function update(next) {
      Object.assign(ctx, next || {});
      const it = ctx.item || item;
      const extra = it.kind === 'custom' ? (it.opts?.image ? '' : ' plain') : '';
      const cls = `wl k-${it.kind} s-${it.size}${extra}${ctx.editing ? ' editing' : ''}`;
      if (card.className !== cls) card.className = cls;
      card.style.cssText = it.kind === 'music' && ctx.state?.music?.colour ? `--c:${ctx.state.music.colour}` : it.kind === 'custom' && /^#[0-9a-f]{6}$/i.test(it.opts?.colour || '') ? `--a:${it.opts.colour}` : '';
      if (it.kind === 'clock') return tickClock(card, it, it !== lastItem && (lastItem = it));
      if (it.kind === 'note' && card.querySelector('[data-note]') === document.activeElement) { lastItem = it; return; } // typing: leave it alone
      const html = (VIEWS[it.kind] || (() => ''))(it, ctx);
      if (html !== shown) { shown = html; card.innerHTML = html; }
      lastItem = it;
    }
    // the clock is built once (its second hand sweeps on its own) and its hands turn every second
    function tickClock(c, it, rebuilt) {
      if (rebuilt || !c.querySelector('.dial')) { c.innerHTML = VIEWS.clock(it, ctx); shown = ''; }
      const d = new Date(), m = d.getMinutes() + d.getSeconds() / 60, h = (d.getHours() % 12) + m / 60;
      c.querySelector('.h')?.setAttribute('transform', `rotate(${(h * 30).toFixed(2)} 50 50)`);
      c.querySelector('.m')?.setAttribute('transform', `rotate(${(m * 6).toFixed(2)} 50 50)`);
      if (ctx.still) c.querySelector('g.sec')?.setAttribute('transform', `rotate(${d.getSeconds() * 6} 50 50)`);
      const t = c.querySelector('[data-time]'); if (t) t.textContent = `${d.getHours()}:${pad2(d.getMinutes())}`;
    }
    update();
    return { update, card };
  }

  window.WinLandWidgets = { KINDS, mount, esc };
})();
