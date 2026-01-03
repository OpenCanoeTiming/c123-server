import WebSocket from 'ws';

const c123 = new WebSocket('ws://192.168.68.108:27084');

c123.on('open', () => console.log('[C123] Connected'));

c123.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.msg === 'oncourse') {
      // Find competitor 12
      const comp12 = msg.data?.find((c: any) => c.Bib?.trim() === '12');
      if (comp12) {
        console.log('[C123] ONCOURSE Bib 12:', JSON.stringify(comp12));
      }
    }
  } catch {}
});

c123.on('error', (e) => console.log('[C123] Error:', e.message));

console.log('Watching oncourse messages for bib 12...');
