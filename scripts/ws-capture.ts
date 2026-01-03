import WebSocket from 'ws';

const c123 = new WebSocket('ws://192.168.68.108:27084');
const cli = new WebSocket('ws://192.168.68.108:8081');

function logMsg(label: string, data: WebSocket.RawData) {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.msg === 'top') {
      console.log(`[${label}] TOP HighlightBib=${msg.data.HighlightBib}`);
      if (msg.data.HighlightBib) {
        console.log(`[${label}] TOP:`, JSON.stringify(msg.data).slice(0, 500));
      }
    } else if (msg.msg === 'comp') {
      console.log(`[${label}] COMP Bib="${msg.data.Bib}" Time=${msg.data.Time}`);
    }
  } catch {}
}

c123.on('open', () => console.log('[C123] Connected'));
cli.on('open', () => console.log('[CLI] Connected'));
c123.on('message', (d) => logMsg('C123', d));
cli.on('message', (d) => logMsg('CLI', d));
c123.on('error', (e) => console.log('[C123] Error:', e.message));
cli.on('error', (e) => console.log('[CLI] Error:', e.message));

console.log('Listening... Ctrl+C to stop');
