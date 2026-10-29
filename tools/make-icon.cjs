// Draws the WinLand icons: Pip (a white rounded square with two eyes) on a violet-to-blue tile, and the settings app's
// own icon (a white gear on a dark tile). Small sizes get simpler, bolder shapes so they stay readable.
// Writes PNGs + Windows .ico files + the tray icon. Run: node_modules\electron\dist\electron.exe tools\make-icon.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const OUT = process.env.ICON_OUT || path.join(__dirname, '..', 'assets');
const SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256, 512];

// WinLand: the tile, Pip in the middle (viewBox 0 0 100 100)
function svg(size) {
  const small = size <= 24, r = small ? 20 : 23;
  const shine = small ? '' : '<rect x="6" y="6" width="88" height="44" rx="20" fill="#fff" opacity=".10"/>';
  const shade = small ? '' : '<rect x="24" y="31" width="52" height="45" rx="16" fill="#000" opacity=".22" transform="translate(0 3)"/>';
  const eye = small ? 'rx="5.2" ry="7.2"' : 'rx="4.4" ry="6.6"';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#1aa7ff"/></linearGradient>
      <linearGradient id="pip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e2e2ea"/></linearGradient></defs>
    <rect x="2" y="2" width="96" height="96" rx="${r}" fill="url(#bg)"/>${shine}${shade}
    <rect x="${small ? 18 : 24}" y="${small ? 24 : 28}" width="${small ? 64 : 52}" height="${small ? 52 : 45}" rx="${small ? 18 : 16}" fill="url(#pip)"/>
    <ellipse cx="${small ? 39 : 40}" cy="${small ? 50 : 51}" ${eye} fill="#1c1c1e"/>
    <ellipse cx="${small ? 61 : 60}" cy="${small ? 50 : 51}" ${eye} fill="#1c1c1e"/>
  </svg>`;
}

// WinLand Settings: a white gear on a dark tile
function settingsSvg(size) {
  const small = size <= 24, teeth = [];
  for (let i = 0; i < 8; i++) { const a = i * 45; teeth.push(`<rect x="44" y="${small ? 14 : 17}" width="12" height="16" rx="3" fill="#fff" transform="rotate(${a} 50 50)"/>`); }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3a42"/><stop offset="1" stop-color="#16161a"/></linearGradient></defs>
    <rect x="2" y="2" width="96" height="96" rx="${small ? 20 : 23}" fill="url(#bg)"/>
    ${teeth.join('')}<circle cx="50" cy="50" r="${small ? 26 : 24}" fill="#fff"/><circle cx="50" cy="50" r="${small ? 9 : 10}" fill="#7c5cff"/>
  </svg>`;
}

const render = `(${function render(markup, size) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => { const cv = document.createElement('canvas'); cv.width = cv.height = size; cv.getContext('2d').drawImage(img, 0, 0, size, size); resolve(cv.toDataURL('image/png').split(',')[1]); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  });
}})`;

// .ico with PNG entries (Windows Vista+)
function ico(pngs, file) {
  const sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256], head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let offset = head.length; const bodies = [];
  sizes.forEach((s, i) => {
    const b = pngs[s], e = 6 + i * 16;
    head.writeUInt8(s >= 256 ? 0 : s, e); head.writeUInt8(s >= 256 ? 0 : s, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(b.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += b.length; bodies.push(b);
  });
  fs.writeFileSync(file, Buffer.concat([head, ...bodies]));
}

app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<body></body>');
  const draw = async (make, s) => Buffer.from(await win.webContents.executeJavaScript(`${render}(${JSON.stringify(make(s))}, ${s})`), 'base64');
  const pngs = {}, gear = {};
  for (const s of SIZES) {
    pngs[s] = await draw(svg, s); fs.writeFileSync(path.join(OUT, `icon-${s}.png`), pngs[s]);
    gear[s] = await draw(settingsSvg, s);
  }
  fs.copyFileSync(path.join(OUT, 'icon-512.png'), path.join(OUT, 'icon.png'));
  // tray: 16 px plus a 32 px @2x version for high-DPI screens (Electron picks it up by name)
  fs.copyFileSync(path.join(OUT, 'icon-16.png'), path.join(OUT, 'tray.png'));
  fs.copyFileSync(path.join(OUT, 'icon-32.png'), path.join(OUT, 'tray@2x.png'));
  ico(pngs, path.join(OUT, 'icon.ico'));
  fs.writeFileSync(path.join(OUT, 'settings-icon.png'), gear[256]); fs.writeFileSync(path.join(OUT, 'settings-icon-64.png'), gear[64]);
  ico(gear, path.join(OUT, 'settings-icon.ico'));
  console.log('icons ok', SIZES.join(','));
  app.exit(0);
});
