const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let list = null;
  for (let i = 0; i < 30; i++) {
    try {
      list = JSON.parse(await get('http://127.0.0.1:9371/json/list'));
      if (list.some(t => t.type === 'page')) break;
    } catch (e) {}
    await sleep(250);
  }
  if (!list) throw new Error('no chrome');
  const page = list.find(t => t.type === 'page' && String(t.url).includes('scoop')) || list.find(t => t.type === 'page');
  if (!page) throw new Error('no page ' + JSON.stringify(list.map(t => t.url)));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  await new Promise(r => ws.addEventListener('open', r));
  function send(method, params) {
    return new Promise((resolve, reject) => {
      const i = ++id;
      pending.set(i, msg => {
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  }
  async function ev(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 2000));
    return r.result.value;
  }
  await send('Page.enable');
  await send('Page.reload', { ignoreCache: true });
  await sleep(800);
  await ev(`new Promise(res => { if (document.readyState === 'complete') res(); else addEventListener('load', () => res()); })`);
  await ev(`document.querySelector('#pcNo') ? document.querySelector('#pcNo').click() : 'no-modal'`);
  await sleep(400);
  const ready = await ev(`typeof __scoopFitTest`);
  if (ready !== 'function') throw new Error('hook missing: ' + ready);
  const out = await ev(`__scoopFitTest()`);
  console.log(JSON.stringify(out, null, 2));
  ws.close();
}

main().catch(err => { console.error(err); process.exit(1); });
