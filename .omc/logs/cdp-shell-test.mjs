// Mini CDP driver — valida interações no shell mode sem dependências.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const URL_UNDER_TEST = process.argv[2] || 'http://localhost:8123/diagrams/arquitetura3.html?theme=light&shell=1';

const chrome = spawn('google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-pipe', 'about:blank'
], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });

let buf = '';
const pending = new Map();
let msgId = 0;
const events = [];

chrome.stdio[4].on('data', (d) => {
  buf += d.toString('utf8');
  let i;
  while ((i = buf.indexOf('\0')) !== -1) {
    const raw = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!raw) continue;
    let m; try { m = JSON.parse(raw); } catch (_) { continue; }
    if (m.id !== undefined && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method) events.push(m);
  }
});

function send(method, params = {}, sessionId) {
  return new Promise((res) => {
    const id = ++msgId;
    pending.set(id, (m) => res(m));
    chrome.stdio[3].write(Buffer.from(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }) + '\0', 'utf8'));
  });
}

function waitFor(pred, ms = 8000) {
  return new Promise((res) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (pred()) { clearInterval(iv); res(true); }
      else if (Date.now() - t0 > ms) { clearInterval(iv); res(false); }
    }, 120);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const created = await send('Target.createTarget', { url: 'about:blank' });
const targetId = created.result.targetId;
const attached = await send('Target.attachToTarget', { targetId, flatten: true });
const sessionId = attached.result.sessionId;

await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
await send('Page.navigate', { url: URL_UNDER_TEST }, sessionId);
await waitFor(() => events.some((e) => e.method === 'Page.loadEventFired'));
await sleep(2500);

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId);
  return r.result?.result?.value ?? JSON.stringify(r.result ?? r);
};

const screenshot = async (path) => {
  const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  fs.writeFileSync(path, Buffer.from(r.result.data, 'base64'));
};

console.log('shell attr:', await evaluate("document.querySelector('iframe') && document ? document.documentElement.getAttribute('data-shell') : 'no-iframe'"));
console.log('dock visible:', await evaluate(`(function(){const d=document.querySelector('.diagram-nav');return !!d && getComputedStyle(d).display!=='none' && d.getBoundingClientRect().height>0;})()`));

console.log('passport via click:', await evaluate(`(function(){
  const doc = document;
  const node = doc.querySelector('[data-node-id="sunco"]');
  node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  const pp = doc.getElementById('focus-chip');
  if (!pp) return 'no-passport-el';
  return JSON.stringify({ hidden: pp.hidden, display: getComputedStyle(pp).display, title: (pp.textContent.match(/Sunshine Conversations/) || [null])[0] });
})()`));

console.log('drag after zoom-in:', await evaluate(`(function(){
  const doc = document;
  const inBtn = doc.querySelector('.diagram-nav [data-view="in"]');
  if (inBtn) inBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return 'clicked=' + !!inBtn;
})()`));
await sleep(400);

console.log('drag result:', await evaluate(`(function(){
  const doc = document;
  const c = doc.querySelector('.diagram-container');
  const svg = c.querySelector('svg');
  const before = svg.style.transform;
  const r = c.getBoundingClientRect();
  const mk = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, button: 0, clientX: x, clientY: y, isPrimary: true }));
  mk('pointerdown', r.left + 40, r.bottom - 40);
  mk('pointermove', r.left + 40 + 120, r.bottom - 40 + 60);
  mk('pointerup', r.left + 40 + 120, r.bottom - 40 + 60);
  const after = svg.style.transform;
  return JSON.stringify({ before: before.slice(0, 60), after: after.slice(0, 60), changed: before !== after, pannable: c.classList.contains('is-pannable') });
})()`));

console.log('overview via dock Map:', await evaluate(`(function(){
  const doc = document
  const b = doc.getElementById('btn-overview-map');
  if (!b) return 'no-btn';
  b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  const p = doc.getElementById('overview-map');
  return JSON.stringify({ hidden: p.hidden, cls: String(p.className).slice(0, 90) });
})()`));

await screenshot('/tmp/cdp-final.png');
console.log('DONE');
chrome.kill();
process.exit(0);
