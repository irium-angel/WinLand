'use strict';
// Claude Code Stop hook (asyncRewake): lets you answer Claude from the WinLand island.
// Runs in the background after Claude stops and waits until you type an answer in the island.
// Exit code 2 wakes Claude with your answer; exit 0 means "nothing to send" (you answered in the
// terminal, WinLand is closed, or the wait ended). Usage: bun winland-reply.cjs <token>
const http = require('node:http');

// A task of WinLand's queue (queue-main.cjs) runs without a window: nobody answers it from the island, let it end.
if (process.env.WINLAND_QUEUE) process.exit(0);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let sessionId = '';
  try { sessionId = String(JSON.parse(input).session_id || ''); } catch {}
  if (!sessionId) process.exit(0);
  // ppid = the process that started this hook (part of Claude Code), used for "jump to terminal".
  const body = JSON.stringify({ session_id: sessionId, pid: process.ppid });
  const req = http.request({ host: '127.0.0.1', port: 47823, path: '/winland-wait', method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'x-winland-token': process.argv[2] || '' } }, res => {
    let answer = '';
    res.setEncoding('utf8');
    res.on('data', chunk => { answer += chunk; });
    res.on('end', () => {
      let reply = '';
      try { reply = String(JSON.parse(answer).reply || '').trim(); } catch {}
      if (!reply) process.exit(0);
      process.stderr.write('De gebruiker antwoordt via de WinLand-island: ' + reply + '\n');
      process.exit(2);
    });
  });
  req.on('error', () => process.exit(0));
  req.end(body);
});
