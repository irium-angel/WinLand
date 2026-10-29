// Settings are their own app now (settings-app.html, opened by settings-app-main.cjs). The settings code
// itself stays here in the island, where Pip and all his preferences live: the app asks for a list
// ("general" or "karakter") and every click in the app is played on a hidden copy of that list here.
//
// Everything you change in the app is a draft first: the app's own Pip shows it right away, the real Pip
// and the island only get it when you press Save (and nothing at all when you press Cancel).
(() => {
  const openView = setView;
  // The gear, the Settings tile and the AI shortcut all open the app instead of the small settings page.
  // An app from a pack you don't have yet opens Instellingen → Apps instead, where you can get it (once per few seconds:
  // dragging a file over the island asks for the Tray again and again).
  const PACK_VIEWS = ['focus', 'tray', 'clips', 'note', 'spotify'];
  let askedAt = 0;
  setView = (view, ...rest) => {
    if (view === 'settings' && window.winland?.settingsOpen) { window.winland.settingsOpen(); return; }
    if (PACK_VIEWS.includes(view) && license.locked.includes(view)) {
      if (performance.now() - askedAt > 4000) { askedAt = performance.now(); window.winland?.settingsOpen?.('apps'); }
      return;
    }
    return openView(view, ...rest);
  };

  const root = document.getElementById('winland-settings-v2');
  const box = document.createElement('div');
  box.id = 'tc-remote-settings'; box.hidden = true; box.setAttribute('aria-hidden', 'true');
  root.appendChild(box); // inside the settings root, so its click handler runs for clicks in here

  // ---------- apps you removed (ai-monitor-ui.js leaves them out of the island, buddy-ui.js for Pip) ----------
  let offCache = null, allOff = null; // read once, the island asks every frame
  const appsOff = () => { if (!offCache) { try { offCache = new Set(JSON.parse(localStorage.getItem('winland:apps-off')) || []); } catch { offCache = new Set(); } } return offCache; };
  // ---------- packs (license-main.cjs): apps from a pack you did not buy are not in the island either ----------
  let license = { apps: ['focus', 'tray', 'clips', 'note', 'spotify', 'outfits'], locked: [] }; // free during the beta: everything is open
  window.__winlandLicense = () => license;
  const setLicense = v => { if (v && Array.isArray(v.locked)) { license = v; allOff = null; } };
  window.winland?.licenseGet?.().then(setLicense).catch(() => {});
  window.winland?.onLicense?.(setLicense);
  // what the island leaves out: the apps you removed, plus the ones still locked
  // Pip's chat ("chat" in the island) belongs to Pip Buddy ("buddy" in the app list)
  window.__winlandAppsOff = () => (allOff ??= new Set([...appsOff(), ...license.locked, ...(appsOff().has('buddy') ? ['chat'] : [])]));
  // a profile turns its useless apps off at once (winland-fun.js applyProfile)
  window.__winlandSetAppsOff = list => {
    offCache = new Set(list); allOff = null;
    try { localStorage.setItem('winland:apps-off', JSON.stringify([...offCache])); } catch {}
    if (draft) draft.apps = [...offCache];
  };

  // ---------- the draft ----------
  // prefs: a copy of Pip's preferences; sleep/login: the two switches that live outside prefs;
  // extras: text typed in a field but not saved yet; apps: the apps you want in your WinLand.
  let draft = null;
  const realLogin = () => box.querySelector('[data-login]')?.classList.contains('on') ?? false;
  function begin() {
    if (draft) return draft;
    box.innerHTML = window.__winlandSettingsHtml?.('general') || '';
    // login: null until you flip it (its real value arrives a moment after start, so it is read when needed)
    draft = { prefs: window.__winlandRealPrefs(), sleep: !!sleepEnabled, login: null, extras: {}, apps: [...appsOff()] };
    window.__winlandPreviewPrefs(draft.prefs);
    return draft;
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function dirty() {
    if (!draft) return false;
    box.innerHTML = window.__winlandSettingsHtml?.('general') || '';
    return !same(draft.prefs, window.__winlandRealPrefs()) || draft.sleep !== !!sleepEnabled || (draft.login !== null && draft.login !== realLogin())
      || Object.keys(draft.extras).length > 0 || !same([...draft.apps].sort(), [...appsOff()].sort());
  }

  const settle = () => new Promise(r => setTimeout(r, 0)); // the English translation (i18n-ui.js) runs right after a change
  // A list as it looks with your draft.
  async function list(which) {
    const d = begin();
    box.innerHTML = window.__winlandWithDraft(d.prefs, () => window.__winlandSettingsHtml?.(which) || '');
    const set = (sel, on) => box.querySelectorAll(sel).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    set('[data-action="sleep"]', d.sleep);
    if (d.login !== null) set('[data-login]', d.login);
    for (const [key, value] of Object.entries(d.extras)) box.querySelectorAll('#tc-in-' + key).forEach(i => i.setAttribute('value', value));
    await settle();
    return box.innerHTML;
  }
  const info = () => {
    const d = draft, base = window.__winlandLocker?.() || {};
    const p = d?.prefs || window.__winlandPrefs?.() || {}; // the draft, so the app shows a new language or theme right away
    return { ...base, name: (d?.prefs.name || '').trim() || base.name, lang: p.lang === 'en' ? 'en' : 'fr', theme: p.theme === 'light' ? 'light' : 'dark', dirty: dirty() };
  };

  // Play one click from the app on the draft.
  function clickDraft(el, values) {
    const d = begin();
    // what you typed in the app goes into the field here first
    for (const [id, value] of Object.entries(values || {})) {
      if (!/^tc-in-[\w-]+$/.test(id)) continue;
      document.querySelectorAll('#' + id).forEach(input => { input.value = String(value).slice(0, 2000); }); // every copy (the island may have one too)
    }
    if (el.dataset.action === 'sleep') { d.sleep = !d.sleep; return; }
    if (el.dataset.login) { d.login = !(d.login ?? el.classList.contains('on')); return; }
    if (el.dataset.save) { const key = el.dataset.pref; d.extras[key] = box.querySelector('#tc-in-' + key)?.value || ''; return; }
    // these really happen right now: quit, restart and the test buttons (they test the island itself)
    if (el.dataset.quit || el.dataset.restart || el.dataset.test) { el.click(); return; }
    window.__winlandWithDraft(d.prefs, () => el.click());
    window.__winlandPreviewPrefs(d.prefs);
    if (el.dataset.pref === 'profile') { // a profile is applied at once: its apps, home screen and switches, no Save needed
      const off = window.__winlandProfileOff?.(d.prefs.profile); if (off) d.apps = off;
      saveDraft();
    }
  }

  // Save: everything in the draft becomes real at once.
  async function saveDraft() {
    if (!draft) return;
    const d = draft;
    window.__winlandSaveDraft(d.prefs);
    box.innerHTML = window.__winlandSettingsHtml?.('karakter') || '';
    if (d.sleep !== !!sleepEnabled) box.querySelector('[data-action="sleep"]')?.click();
    box.innerHTML = window.__winlandSettingsHtml?.('general') || '';
    if (d.login !== null && d.login !== realLogin()) box.querySelector('[data-login]')?.click();
    for (const [key, value] of Object.entries(d.extras)) {
      box.innerHTML = window.__winlandSettingsHtml?.('general') || '';
      document.querySelectorAll('#tc-in-' + key).forEach(i => { i.value = value; });
      box.querySelector(`[data-save][data-pref="${key}"]`)?.click();
    }
    offCache = new Set(d.apps); allOff = null;
    try { localStorage.setItem('winland:apps-off', JSON.stringify(d.apps)); } catch {}
    draft = null;
    await new Promise(r => setTimeout(r, 120));
  }

  // req: { kind: 'list' | 'click' | 'save' | 'discard' | 'apps' | 'app', ... }
  window.__winlandRemoteSettings = async req => {
    const which = req?.which === 'karakter' ? 'karakter' : 'general';
    if (req?.kind === 'save') await saveDraft();
    if (req?.kind === 'discard') { draft = null; window.__winlandPreviewPrefs(null); }
    if (req?.kind === 'apps' || req?.kind === 'app') {
      const d = begin();
      if (req.kind === 'app' && /^[a-z]+$/.test(req.id || '')) {
        const off = new Set(d.apps); if (req.on) off.delete(req.id); else off.add(req.id);
        d.apps = [...off];
      }
      return { off: d.apps, locked: license.locked, info: info() };
    }
    if (req?.kind === 'click') {
      await list(which);
      const el = req.row != null ? box.querySelectorAll('.tc-setting-row')[req.row] : box.querySelectorAll('button')[req.index];
      if (el && req.row != null) window.__winlandWithDraft(begin().prefs, () => window.__winlandDemo?.(el.dataset.demo)); // an example block: the app's Pip shows it
      else if (el) clickDraft(el, req.values);
      await new Promise(r => setTimeout(r, 30));
    }
    return { html: await list(which), info: info() };
  };

  // While the app is open its Pip is drawn too (buddy-ui.js), from the draft.
  window.__winlandFaceForSettings = false;
  window.__winlandSettingsClosed = () => { draft = null; window.__winlandPreviewPrefs(null); };
})();
