require('./tray-main.cjs'); // first: tray icon + only one WinLand at a time
require('./island-window-main');
const {
  app,
  BrowserWindow,
  ipcMain,
  screen
} = require('electron');

const path = require('path');

require('./ai-monitor-main.cjs');
require('./extras-main.cjs');
require('./settings-app-main.cjs'); // WinLand Instellingen: settings as their own app
require('./license-main.cjs'); // which apps are open (all of them: everything is local and free)
require('./ai-account-main.cjs'); // Codex sign-in for Pip's chat (the local Codex program) and Pip himself
require('./media-main.cjs');
require('./palette-main.cjs');
require('./queue-main.cjs');
require('./remote-main.cjs');
require('./companion-main.cjs'); // Pip on the desktop // the phone remote, on your Wi-Fi only (off until you turn it on) // Claude dashboard: tasks Claude Code does one after another // command palette: Alt+Space
require('./software-main.cjs'); // Software page: FL Studio, VS Code, Steam, Word… only the ones on this PC
require('./dev-main.cjs'); // Dev page: Git, local servers, dev programs (all read on this PC) // what plays in any music app (Spotify, Apple Music, Deezer…)

app.setAppUserModelId(
  'local.winland.island'
);


// ============================================================
// WINDOW
// ============================================================

const PANEL_WIDTH = 860; // wide and low, like NotchNook
const PANEL_HEIGHT = 320;
const ISLAND_FLOAT = 0; // the island hangs from the top edge of the screen (like the notch on a MacBook)

let mascotWindow = null;
let pointerTimer = null;
let mascotInteractive = false;


// ============================================================
// WINDOW POSITION
// ============================================================

function positionMascot() {
  if (
    !mascotWindow ||
    mascotWindow.isDestroyed()
  ) {
    return;
  }


  const display =
    islandDisplay();


  const x =
    Math.round(
      display.bounds.x +
      (
        display.bounds.width -
        PANEL_WIDTH
      ) /
      2
    );


  const y =
    display.bounds.y + ISLAND_FLOAT; // the island floats a little below the top edge, like the Dynamic Island


  mascotWindow.setPosition(
    x,
    y,
    false
  );
}


// ============================================================
// POINTER
// ============================================================

// Safety net: the island repeats its choice at least once a second. If it goes quiet while the window
// still catches the mouse (a frozen or throttled page), let go after 2 s, so clicks reach the apps below.
let interactiveHeardAt = 0;

let lastPointerKey = '';
let lastPointerAt = 0;

function sendPointer() {
  if (
    !mascotWindow ||
    mascotWindow.isDestroyed() ||
    !mascotWindow.isVisible()
  ) {
    return;
  }


  if (
    mascotInteractive &&
    Date.now() - interactiveHeardAt > 2000
  ) {
    setMascotInteractive(
      false
    );
  }


  const cursor =
    screen.getCursorScreenPoint();


  const bounds =
    mascotWindow.getBounds();


  // Only tell the island when the mouse moved (or the island moved): this runs 50 times a second,
  // and sending the same point over and over kept the PC busy for nothing. A refresh every second stays.
  const key = cursor.x + ',' + cursor.y + ',' + bounds.x + ',' + bounds.y;
  const stamp = Date.now();

  if (key === lastPointerKey && stamp - lastPointerAt < 1000) {
    return;
  }

  lastPointerKey = key;
  lastPointerAt = stamp;


  mascotWindow.webContents.send(
    'companion:pointer',
    {
      x:
        cursor.x -
        bounds.x,

      y:
        cursor.y -
        bounds.y,

      insideWindow:
        cursor.x >=
          bounds.x &&
        cursor.x <
          bounds.x +
          bounds.width &&
        cursor.y >=
          bounds.y &&
        cursor.y <
          bounds.y +
          bounds.height
    }
  );
}


// ============================================================
// INTERACTION
// ============================================================

function setMascotInteractive(
  interactive
) {
  if (
    !mascotWindow ||
    mascotWindow.isDestroyed()
  ) {
    return;
  }


  const next =
    Boolean(
      interactive
    );


  // Catching the mouse is only switched on when it changes. Letting clicks through is applied again every
  // time the island says so (about once a second): Windows could leave the invisible window catching clicks
  // after Claude finished, so the top of the screen stopped working until you clicked the island.
  if (
    next &&
    next ===
    mascotInteractive
  ) {
    return;
  }


  mascotInteractive =
    next;


  mascotWindow.setIgnoreMouseEvents(
    !next,
    {
      forward:
        true
    }
  );
}


// ============================================================
// CREATE WINDOW
// ============================================================

function createMascot() {
  mascotWindow =
    new BrowserWindow({
      icon: path.join(__dirname, 'assets', 'icon.ico'), // Pip under the island (Alt+Tab, Task Manager)
      width:
        PANEL_WIDTH,

      height:
        PANEL_HEIGHT,

      frame:
        false,

      transparent:
        true,

      backgroundColor:
        '#00000000',

      resizable:
        false,

      movable:
        false,

      minimizable:
        false,

      maximizable:
        false,

      fullscreenable:
        false,

      skipTaskbar:
        true,

      alwaysOnTop:
        true,

      // nodig om in Project Mode te kunnen typen
      focusable:
        true,

      hasShadow:
        false,

      show:
        false,

      webPreferences: {
        preload:
          path.join(
            __dirname,
            'preload.js'
          ),

        contextIsolation:
          true,

        nodeIntegration:
          false,

        autoplayPolicy:
          'no-user-gesture-required'
      }
    });


  mascotWindow.setAlwaysOnTop(
    true,
    'floating'
  );


  mascotWindow.setVisibleOnAllWorkspaces(
    true,
    {
      visibleOnFullScreen:
        true
    }
  );


  setMascotInteractive(
    false
  );


  positionMascot();


  mascotWindow.loadFile(
    'mascot.html'
  );

  // everything stays local: the island never opens a web page or a new window
  mascotWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mascotWindow.webContents.on('will-navigate', event => event.preventDefault());


  // Always normal size: Chromium remembers a zoom level per page, and a zoomed island looks broken.
  // (Ctrl + scroll or Ctrl + plus can't zoom it either.)
  mascotWindow.webContents.on(
    'did-finish-load',
    () => {
      mascotWindow.webContents.setZoomFactor(1);
      mascotWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
    }
  );


  mascotWindow.webContents.on(
    'zoom-changed',
    () => mascotWindow.webContents.setZoomFactor(1)
  );


  mascotWindow.once(
    'ready-to-show',

    () => {
      mascotWindow.showInactive();
    }
  );


  // Over a game the island is gone; Alt+Space (the palette) brings it out, and when you leave it, it goes again.
  mascotWindow.on('blur', () => { if (presence === 'hidden') hideIsland(); });


  mascotWindow.on(
    'closed',

    () => {
      mascotWindow =
        null;
    }
  );
}


// ============================================================
// OTHER IPC
// ============================================================

// The screen of the island: the primary one, or with "follow the mouse" on (live-ui.js) the one the mouse is on.
let followMouse = false, followTimer = null, followDisplay = null;
function islandDisplay() { return followMouse && followDisplay ? followDisplay : screen.getPrimaryDisplay(); }
ipcMain.on('island:follow', (event, on) => {
  if (!mascotWindow || event.sender !== mascotWindow.webContents) return;
  followMouse = Boolean(on); clearInterval(followTimer); followTimer = null;
  if (!followMouse) { followDisplay = null; positionMascot(); return; }
  followTimer = setInterval(() => {
    const d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    if (d.id !== followDisplay?.id) { followDisplay = d; positionMascot(); }
  }, 400);
});
// A notification, a reminder: over a big window the island comes out for a moment (not during a game)
ipcMain.on('island:reveal', (event, ms) => {
  if (!mascotWindow || event.sender !== mascotWindow.webContents || presence !== 'peek') return;
  revealed = true; revealedAt = Date.now() + Math.max(0, Math.min(30000, Number(ms) || 0)) - 900; awayAt = 0; showIsland(); raiseIsland(); raisedAt = Date.now();
});

// Where the island stands (winland-fun.js decides, from the window in front):
//   normal  always there;  hidden  a game fills the screen: gone (and it draws nothing)
//   peek    a maximized or full-screen window: gone, back while the mouse is at the top edge or on the island
let presence = 'normal', revealed = false, revealedAt = 0, awayAt = 0, peekTimer = null;
function showIsland() { if (mascotWindow && !mascotWindow.isDestroyed() && !mascotWindow.isVisible()) mascotWindow.showInactive(); }
function hideIsland() { if (mascotWindow && !mascotWindow.isDestroyed() && mascotWindow.isVisible()) mascotWindow.hide(); }
// Full-screen players, slideshows and some apps are "always on top" themselves: the island goes above them.
function raiseIsland() { if (!mascotWindow || mascotWindow.isDestroyed()) return; mascotWindow.setAlwaysOnTop(true, 'screen-saver'); mascotWindow.moveTop(); }
let raisedAt = 0;
function peekTick() {
  if (!mascotWindow || mascotWindow.isDestroyed()) return;
  const cursor = screen.getCursorScreenPoint(), area = islandDisplay().bounds, now = Date.now();
  const atTop = cursor.y <= area.y + 3 && Math.abs(cursor.x - (area.x + area.width / 2)) <= 420;
  if (!revealed) { if (atTop) { revealed = true; revealedAt = now; awayAt = 0; showIsland(); raiseIsland(); raisedAt = now; } return; }
  if (now - raisedAt > 400) { raiseIsland(); raisedAt = now; } // stay above a window that grabs the top again
  // on the island (its window, where it catches the mouse) or at the top edge: stay; away for a moment: hide again.
  // The window's own area counts, so the island never stays stuck when it missed the mouse leaving.
  const b = mascotWindow.getBounds(), onIt = cursor.x >= b.x && cursor.x <= b.x + b.width && cursor.y >= b.y && cursor.y <= b.y + b.height;
  if (atTop || (onIt && mascotInteractive) || mascotWindow.isFocused() || now - revealedAt < 900) { awayAt = 0; return; } // typing in it (palette, chat): stay
  if (!awayAt) awayAt = now;
  if (now - awayAt > 450) { revealed = false; hideIsland(); }
}
function applyPresence() {
  clearInterval(peekTimer); peekTimer = null; revealed = false;
  if (mascotWindow && !mascotWindow.isDestroyed()) mascotWindow.setAlwaysOnTop(true, 'floating'); // the usual level again
  if (presence === 'normal') showIsland();
  else hideIsland();
  if (presence === 'peek') peekTimer = setInterval(peekTick, 50);
}
ipcMain.on('island:presence', (event, how) => {
  if (!mascotWindow || mascotWindow.isDestroyed() || event.sender !== mascotWindow.webContents) return;
  if (!['normal', 'peek', 'hidden'].includes(how) || how === presence) return;
  presence = how; applyPresence();
});


ipcMain.on(
  'island:set-interactive',

  (
    _event,
    interactive
  ) => {
    interactiveHeardAt = Date.now();

    setMascotInteractive(
      interactive
    );
  }
);


ipcMain.on(
  'window:close',

  () => {
    app.quit();
  }
);


// Goodbye: before closing, WinLand waves "Doei!" and the island
// closes smoothly (winland-fun.js), then the app really quits.
let goodbyeShown = false;

app.on(
  'before-quit',

  event => {
    if (
      goodbyeShown ||
      !mascotWindow ||
      mascotWindow.isDestroyed() ||
      !mascotWindow.isVisible()
    ) {
      return;
    }

    goodbyeShown = true;
    event.preventDefault();
    mascotWindow.webContents.send('winland:goodbye');
    setTimeout(() => app.quit(), 1000); // right after the goodbye (winland-fun.js: eyes close, the island slips into the edge)
  }
);


ipcMain.on(
  'winland:notify',
  () => {}
);


ipcMain.on(
  'island:set-state',
  () => {}
);


ipcMain.on(
  'window:set-mode',
  () => {}
);


// ============================================================
// APP
// ============================================================

app.whenReady().then(
  () => {
    createMascot();


    pointerTimer =
      setInterval(
        sendPointer,
        20
      );


    screen.on(
      'display-metrics-changed',
      positionMascot
    );


    screen.on(
      'display-added',
      positionMascot
    );


    screen.on(
      'display-removed',
      positionMascot
    );
  }
);


app.on(
  'activate',

  () => {
    if (
      !mascotWindow
    ) {
      createMascot();
    }
  }
);


app.on(
  'before-quit',

  () => {
    if (
      pointerTimer
    ) {
      clearInterval(
        pointerTimer
      );


      pointerTimer =
        null;
    }
  }
);


app.on(
  'window-all-closed',

  () => {
    if (
      process.platform !==
      'darwin'
    ) {
      app.quit();
    }
  }
);