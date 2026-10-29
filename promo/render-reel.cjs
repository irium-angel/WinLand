'use strict';
// Renders promo/reel.html to dist/WinLand-reel.mp4 (1080×1920, 30 fps, with its own soundtrack), frame by frame.
// Run: node_modules\electron\dist\electron.exe promo\render-reel.cjs   (FFMPEG=path\to\ffmpeg.exe if it is not on the PATH)
const { app, BrowserWindow } = require('electron');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const FPS = 30, root = path.join(__dirname, '..'), out = path.join(root, 'dist'), frames = path.join(out, 'reel-frames');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';

app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.whenReady().then(async () => {
  fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
  const win = new BrowserWindow({ width: 1080, height: 1920, show: false, useContentSize: true, enableLargerThanScreen: true, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.setContentSize(1080, 1920); // taller than most screens
  await win.loadFile(path.join(__dirname, 'reel.html'), { search: 'still' });
  await win.webContents.executeJavaScript('document.fonts.ready.then(() => 1)');
  const duration = await win.webContents.executeJavaScript('DURATION'), total = Math.round(duration * FPS);
  for (let i = 0; i < total; i++) {
    await win.webContents.executeJavaScript(`render(${i / FPS}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    const img = await win.webContents.capturePage({ x: 0, y: 0, width: 1080, height: 1920 });
    fs.writeFileSync(path.join(frames, String(i).padStart(4, '0') + '.png'), img.toPNG());
    if (i % 60 === 0) console.log(`frame ${i}/${total}`);
  }
  const wav = path.join(out, 'reel-audio.wav');
  fs.writeFileSync(wav, Buffer.from(await win.webContents.executeJavaScript('soundtrack()'), 'base64'));
  const mp4 = path.join(out, 'WinLand-reel.mp4');
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, '%04d.png'), '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-vf', 'scale=1080:1920:flags=lanczos',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4]);
  fs.rmSync(frames, { recursive: true, force: true }); fs.rmSync(wav, { force: true });
  console.log('ok ' + mp4);
  app.exit(0);
});
