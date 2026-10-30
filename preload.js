(function preloadBridge() {
  'use strict';

  const { contextBridge, ipcRenderer, webUtils } = require('electron');

  function subscribe(channel, callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const listener = (_event, data) => callback(data);

    ipcRenderer.on(channel, listener);

    return () => ipcRenderer.removeListener(channel, listener);
  }

  contextBridge.exposeInMainWorld('winland', {
    // start with Windows, restart, and the language for the tray menu (tray-main.cjs)
    loginGet: () => ipcRenderer.invoke('app:login-get'),
    firstRun: () => ipcRenderer.invoke('app:first-run'), // what you chose in the installer (once)
    loginSet: on => ipcRenderer.invoke('app:login-set', Boolean(on)),
    restart: () => ipcRenderer.send('app:restart'),
    setLang: lang => ipcRenderer.send('app:lang', lang === 'en' ? 'en' : 'fr'),

    spotifyConnect: () => ipcRenderer.invoke('spotify:connect'),
    spotifyGetState: () => ipcRenderer.invoke('spotify:get-state'),
    spotifyControl: action =>
      ipcRenderer.invoke('spotify:control', action),
    onMusic: callback => subscribe('media:changed', callback), // the player changed (media-main.cjs push)
    spotifySeek: positionMs =>
      ipcRenderer.invoke('spotify:seek', positionMs),
    spotifyDisconnect: () =>
      ipcRenderer.invoke('spotify:disconnect'),

    // Dev page (dev-main.cjs)
    devGet: () => ipcRenderer.invoke('dev:get'),
    devAddFolder: () => ipcRenderer.invoke('dev:add-folder'),
    devForgetFolder: dir => ipcRenderer.invoke('dev:forget-folder', String(dir || '')),
    devStop: pid => ipcRenderer.invoke('dev:stop', Number(pid)),
    devWatch: on => ipcRenderer.send('dev:watch', Boolean(on)),
    devDocker: (id, action) => ipcRenderer.invoke('dev:docker', { id: String(id || ''), action: String(action || '') }),
    devOpenCode: dir => ipcRenderer.invoke('dev:open-code', String(dir || '')),
    onDevFinished: callback => subscribe('dev:finished', callback),

    // Codex sign-in for Pip's chat (ai-account-main.cjs)
    aiSettingsGet: () => ipcRenderer.invoke('ai-settings:get'),
    aiSettingsChatGPTLogin: () =>
      ipcRenderer.invoke('ai-settings:chatgpt-login'),
    aiSettingsChatGPTCancel: () =>
      ipcRenderer.invoke('ai-settings:chatgpt-cancel'),
    aiSettingsChatGPTLogout: () =>
      ipcRenderer.invoke('ai-settings:chatgpt-logout'),

    aiMonitorGet: () => ipcRenderer.invoke('ai-monitor:get'),
    aiMonitorWindows: () => ipcRenderer.invoke('ai-monitor:windows'),
    aiMonitorConnect: (provider, targetId) => ipcRenderer.invoke('ai-monitor:connect', { provider, targetId }),
    aiMonitorDisconnect: provider => ipcRenderer.invoke('ai-monitor:disconnect', { provider }),
    aiMonitorOpenSource: provider => ipcRenderer.invoke('ai-monitor:open-source', { provider }),
    aiMonitorHooksInstall: agent => ipcRenderer.invoke('ai-monitor:hooks-install', { agent }),
    aiMonitorHooksUninstall: agent => ipcRenderer.invoke('ai-monitor:hooks-uninstall', { agent }),
    // Extras: file tray, volume, Bluetooth battery, clipboard, note
    pathForFile: file => { try { return webUtils.getPathForFile(file); } catch { return ''; } },
    trayGet: () => ipcRenderer.invoke('extras:tray-get'),
    trayAdd: paths => ipcRenderer.invoke('extras:tray-add', { paths }),
    trayRemove: filePath => ipcRenderer.invoke('extras:tray-remove', { path: filePath }),
    trayOpen: filePath => ipcRenderer.invoke('extras:tray-open', { path: filePath }),
    trayDrag: filePath => ipcRenderer.send('extras:tray-drag', filePath),
    onVolume: callback => subscribe('extras:volume', callback),
    volumeSet: level => ipcRenderer.invoke('extras:volume-set', { level }),
    volumeGet: () => ipcRenderer.invoke('extras:volume-get'),
    clipsGet: () => ipcRenderer.invoke('extras:clips-get'),
    clipsCopy: index => ipcRenderer.invoke('extras:clips-copy', { index }),
    clipsClear: () => ipcRenderer.invoke('extras:clips-clear'),
    onClips: callback => subscribe('extras:clips', callback),
    noteGet: () => ipcRenderer.invoke('extras:note-get'),
    noteSet: text => ipcRenderer.invoke('extras:note-set', { text }),
    onShortcut: callback => subscribe('extras:shortcut', callback),
    onBluetooth: callback => subscribe('extras:bluetooth', callback),
    // the window in front (none / cover / game) and what the island does about it (main.js island:presence)
    onForeground: callback => subscribe('extras:foreground', callback),
    onPrivacy: callback => subscribe('extras:privacy', callback), // apps using the microphone / camera
    onNotif: callback => subscribe('extras:notif', callback), // a Windows notification (live-ui.js)
    onMicMute: callback => subscribe('extras:micmute', callback), // the PC's microphone cut or open
    onMicKey: callback => subscribe('extras:mic-key', callback), // Ctrl+Alt+M was pressed
    micGet: () => ipcRenderer.invoke('extras:mic-get'),
    micSet: muted => ipcRenderer.invoke('extras:mic-set', { muted: Boolean(muted) }),
    pixel: () => ipcRenderer.invoke('extras:pixel'), // the colour under the mouse
    onFront: callback => subscribe('extras:front', callback), // the program in front changed (automations)
    idleTime: () => ipcRenderer.invoke('extras:idle'),
    agenda: () => ipcRenderer.invoke('extras:agenda'), // today's appointments of the Windows calendar
    ocr: (filePath, copy) => ipcRenderer.invoke('extras:ocr', { path: String(filePath || ''), copy: Boolean(copy) }),
    screenTime: () => ipcRenderer.invoke('extras:screen-time'),
    studioMemoSave: base64 => ipcRenderer.invoke('studio:memo-save', { data: String(base64 || '') }), // voice notes (studio-tools-ui.js)
    studioMemos: () => ipcRenderer.invoke('studio:memos'),
    studioMemoOpen: name => ipcRenderer.invoke('studio:memo-open', { name: String(name || '') }),
    openCopied: text => ipcRenderer.invoke('extras:open-copied', { text: String(text || '') }), // a copied link or path (smart clipboard)
    revealFor: ms => ipcRenderer.send('island:reveal', Number(ms) || 0), // over a big window, come out for a moment
    followMouse: on => ipcRenderer.send('island:follow', Boolean(on)),
    // command palette (palette-main.cjs, palette-ui.js)
    onPaletteShow: callback => subscribe('palette:show', callback),
    paletteIndex: () => ipcRenderer.invoke('palette:index'),
    paletteOpen: (kind, id) => ipcRenderer.invoke('palette:open', { kind: String(kind), id: Number(id) }),
    paletteClaude: (prompt, project) => ipcRenderer.invoke('palette:claude', { prompt: String(prompt || ''), project: Number(project) }),
    palettePort: (port, kill) => ipcRenderer.invoke('palette:port', { port: Number(port), kill: Boolean(kill) }),
    paletteScriptsFolder: () => ipcRenderer.invoke('palette:scripts-folder'),
    // Claude dashboard: the task queue (queue-main.cjs)
    queueGet: () => ipcRenderer.invoke('queue:get'),
    queueAdd: (prompt, project) => ipcRenderer.invoke('queue:add', { prompt: String(prompt || ''), project: String(project || '') }),
    queueRemove: id => ipcRenderer.invoke('queue:remove', { id: String(id || '') }),
    queueClear: () => ipcRenderer.invoke('queue:clear'),
    queueProjects: () => ipcRenderer.invoke('queue:projects'),
    onQueueUpdate: callback => subscribe('queue:update', callback),
    onQueueFinished: callback => subscribe('queue:finished', callback),
    // the phone remote, on your Wi-Fi (remote-main.cjs)
    remoteInfo: () => ipcRenderer.invoke('remote:info'),
    remoteSet: on => ipcRenderer.invoke('remote:set', { on: Boolean(on) }),
    remoteNewCode: () => ipcRenderer.invoke('remote:new-code'),
    remoteForget: id => ipcRenderer.invoke('remote:forget', id ? String(id) : ''),
    onRemoteChanged: callback => subscribe('remote:changed', callback),
    deckEditor: lang => ipcRenderer.send('deck:open-editor', lang === 'en' ? 'en' : 'fr'), // the Stream Deck editor (deck-main.cjs)
    remoteState: state => ipcRenderer.send('remote:state', state),
    remoteCover: url => ipcRenderer.send('remote:cover', String(url || '')), // the album cover for the phone's player
    onRemoteDo: callback => subscribe('remote:do', callback),
    pipDesk: on => ipcRenderer.invoke('pip:desk', Boolean(on)), // Pip on the desktop (companion-main.cjs)
    onPipHome: callback => subscribe('pip:home', callback),
    notifOpen: what => ipcRenderer.invoke('notif:open', { app: String(what?.app || ''), aumid: String(what?.aumid || ''), settings: what?.settings === true }), // a click on a notification (notif-main.cjs)
    onNotifWindowsOff: callback => subscribe('notif:windows-off', callback), // notifications are off for all of Windows
    notifOnlyIsland: on => ipcRenderer.send('notif:only-island', Boolean(on)), // no banners in the corner of the screen
    islandOff: off => ipcRenderer.send('island:off', Boolean(off)), // Settings: no island at all (main.js)
    onIslandOn: callback => subscribe('island:turn-on', callback), // the tray's "Open the island" while it is off
    widgetsState: state => ipcRenderer.send('widgets:state', state), // what the desktop widgets show (widgets-main.cjs)
    onWidgetsDo: callback => subscribe('widgets:do', callback),
    widgetsGallery: () => ipcRenderer.send('widgets:gallery'),
    privacyGet: () => ipcRenderer.invoke('extras:privacy-get'),
    onNewFile: callback => subscribe('extras:new-file', callback), // a new screenshot or a finished download
    // Controls page (controls-ui.js)
    outputsGet: () => ipcRenderer.invoke('extras:outputs'),
    systemGet: () => ipcRenderer.invoke('extras:system'), // System page: processor, graphics card, memory
    softwareGet: fresh => ipcRenderer.invoke('software:get', { fresh: Boolean(fresh) }), // Software page: your installed programs
    softwareOpen: (id, file) => ipcRenderer.invoke('software:open', { id: String(id || ''), file: file ? String(file) : '' }),
    outputSet: id => ipcRenderer.invoke('extras:output-set', { id: String(id || '') }),
    lockPc: () => ipcRenderer.invoke('extras:lock'),
    snip: () => ipcRenderer.invoke('extras:snip'),
    openClock: () => ipcRenderer.invoke('extras:clock'),
    muteSet: on => ipcRenderer.invoke('extras:mute', { on: Boolean(on) }),
    foregroundGet: () => ipcRenderer.invoke('extras:foreground-get'),
    setPresence: how => ipcRenderer.send('island:presence', ['normal', 'peek', 'hidden'].includes(how) ? how : 'normal'),
    aiMonitorHooksAnswer:(sessionId, answers) => ipcRenderer.invoke('ai-monitor:hooks-answer', { sessionId, answers }),
    aiMonitorHooksPlan: (sessionId, approve, feedback) => ipcRenderer.invoke('ai-monitor:hooks-plan', { sessionId, approve, feedback }),
    aiMonitorHooksJump: sessionId => ipcRenderer.invoke('ai-monitor:hooks-jump', { sessionId }),
    aiMonitorHooksModel: model => ipcRenderer.invoke('ai-monitor:hooks-model', { model }),
    aiMonitorHooksTest: (kind, command) => ipcRenderer.invoke('ai-monitor:hooks-test', { kind, command }),
    aiMonitorSetNotify:enabled => ipcRenderer.invoke('ai-monitor:set-notify', { enabled }),
    aiMonitorHooksReply:(sessionId, text) => ipcRenderer.invoke('ai-monitor:hooks-reply', { sessionId, text }),
    aiMonitorHooksSeen:() => ipcRenderer.invoke('ai-monitor:hooks-seen'),
    aiMonitorHooksDecide:(sessionId, behavior) => ipcRenderer.invoke('ai-monitor:hooks-decide', { sessionId, behavior }),
    aiMonitorReply:(provider, questionId, text) => ipcRenderer.invoke('ai-monitor:reply', { provider, questionId, text }),
    onAiMonitorState: callback => subscribe('ai-monitor:state', callback),
    onAiMonitorOpen: callback => subscribe('ai-monitor:open', callback),

    setIslandInteractive: interactive =>
      ipcRenderer.send('island:set-interactive', interactive),
    setIslandState: state =>
      ipcRenderer.send('island:set-state', state),
    setMode: mode =>
      ipcRenderer.send('window:set-mode', mode),
    close: () =>
      ipcRenderer.send('window:close'),
    notify: (title, body, url) =>
      ipcRenderer.send('winland:notify', { title, body, url }),
    onPointer: callback =>
      subscribe('companion:pointer', callback),
    onGoodbye: callback =>
      subscribe('winland:goodbye', callback),
    // Pip Buddy (buddy-main.cjs): the picker, then the chat about what he looked at
    settingsOpen: tab => ipcRenderer.send('settings-app:open', typeof tab === 'string' ? tab : ''), // the WinLand app, its own window
    buddyGrab: info => ipcRenderer.send('buddy:grab', info), // starts the picker
    onBuddyShortcut: callback => subscribe('buddy:shortcut', callback), // Ctrl+Alt+Space
    buddyDrop: () => ipcRenderer.send('buddy:drop'),
    buddyFrame: url => ipcRenderer.send('buddy:frame', url),
    // Pip's chat in the island (chat-ui.js)
    buddyAsk: (kind, text, history, lang) => ipcRenderer.invoke('buddy:ask', { kind, text, history, lang }),
    buddyApply: () => ipcRenderer.invoke('buddy:apply'),
    buddyForget: () => ipcRenderer.send('buddy:forget'),
    buddyAi: () => ipcRenderer.invoke('buddy:ai'),
    buddyUseAi: id => ipcRenderer.invoke('buddy:use-ai', id),
    buddyLogin: () => ipcRenderer.invoke('buddy:login'),
    buddyApplyFix: () => ipcRenderer.invoke('buddy:apply-fix'),
    buddyCancelFix: () => ipcRenderer.send('buddy:cancel-fix'),
    onBuddyChat: callback => subscribe('buddy:chat', callback),
    settingsFrame: url => ipcRenderer.send('settings-app:frame', url), // the settings app's own Pip
    // which apps are open (license-main.cjs): all of them
    licenseGet: () => ipcRenderer.invoke('license:get'),
    onLicense: callback => subscribe('license:changed', callback),
    onBuddy: callback => {
      subscribe('buddy:home', () => callback('home'));
      subscribe('buddy:mood', data => callback('mood', data));
      subscribe('buddy:collapse', () => callback('collapse'));
      subscribe('buddy:dropped', () => callback('dropped'));
    }
  });
})();
