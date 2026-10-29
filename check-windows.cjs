'use strict';
const { NativeWorker } = require('./ai-monitor-main.cjs');
const { observe, PROVIDERS } = require('./ai-monitor-model.cjs');
async function check(worker, write = console.log) {
  const result = await worker.request('windows');
  if (!result?.ok) throw new Error(result?.error || 'Windows-koppeling niet beschikbaar.');
  write('✓ Windows-koppeling gestart.');
  let identified = 0, readable = 0;
  for (const target of result.windows || []) {
    let snapshot;
    try { snapshot = await worker.request('read', { target }); }
    catch { write('Een venster reageert niet. Herstel het venster en probeer opnieuw.'); continue; }
    if (!Object.hasOwn(PROVIDERS, snapshot?.provider || '')) continue;
    identified++;
    const observation = observe(snapshot, snapshot.provider);
    const name = PROVIDERS[snapshot.provider].name;
    if (!observation.valid) {
      write(name + ': niet leesbaar. ' + (observation.login ? 'Log eerst in.' : snapshot.truncated ? 'Te veel of onvolledige vensterinformatie.' : 'Houd het juiste gesprek zichtbaar in een eigen venster.'));
      continue;
    }
    readable++;
    write(name + ': ' + (observation.composer ? 'invoerveld herkend' : 'bezig-knop herkend') +
      ' · AI-bericht ' + (observation.assistant ? 'herkend' : 'nog niet herkend') +
      ' · afronding ' + (observation.completed ? 'herkend' : 'nog niet herkend'));
  }
  if (!identified) write('Nog geen leesbaar ChatGPT- of Claude-venster. Open je gesprek in een eigen venster en voer deze controle opnieuw uit.');
  else if (readable) write('Verbind nu dat gesprek in WinLand. Test daarna een vraag, een afgerond antwoord en een reactie vanuit de island.');
  write('Deze controle verstuurt niets en toont geen gespreksinhoud. Echte verzending en meldingen moet je apart testen.');
  return { identified, readable };
}
if (require.main === module) {
  const worker = new NativeWorker();
  check(worker).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => worker.close());
}
module.exports = { check };
