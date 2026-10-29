'use strict';
// The AI behind Pip's chat (buddy-main.cjs): Claude Code or Codex, the programs already on this PC.
// Claude Code needs nothing here. Codex signs in once with your ChatGPT account (chatgpt-provider.js runs the
// local Codex program for that); these channels show, start and end that sign-in in the settings app.
const { ipcMain } = require('electron');
const chatgpt = require('./chatgpt-provider');

// check: really ask Codex (starts it when it is not running). Without it the settings show what we last knew,
// or unknown: true, so opening them never freezes the island.
async function view({ check = false } = {}) {
  const s = check ? await chatgpt.status() : chatgpt.peek() || { installed: true, ready: false, unknown: true };
  return {
    ok: true,
    chatgpt: { available: true, installed: s.installed, ready: s.ready, email: s.email || '', plan: s.plan || '', error: s.error || '', unknown: s.unknown === true }
  };
}

ipcMain.handle('ai-settings:get', (_event, request) => view({ check: request?.check === true }));
ipcMain.handle('ai-settings:chatgpt-login', async () => {
  try { await chatgpt.login(); return await view({ check: true }); } catch (error) { return { ok: false, error: error.message }; }
});
ipcMain.handle('ai-settings:chatgpt-cancel', async () => { await chatgpt.cancelLogin(); return { ok: true }; });
ipcMain.handle('ai-settings:chatgpt-logout', async () => {
  try { await chatgpt.logout(); return await view({ check: true }); } catch (error) { return { ok: false, error: error.message }; }
});

// Pip Buddy: aim at any window and ask Pip about it
require('./buddy-main.cjs')({});
