// Mede layout do viewer em shell mode: heights, overflow, ancestors.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const URL_UNDER_TEST = process.argv[2] || 'http://localhost:8123/diagrams/arquitetura3.html?theme=light&shell=1';
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-pipe', 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });

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
const send = (method, params = {}, sessionId) => new Promise((res) => {
  const id = ++msgId;
  pending.set(id, (m) => res(m));
  chrome.stdio[3].write(Buffer.from(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }) + '\0', 'utf8'));
});
const waitFor = (pred, ms = 8000) => new Promise((res) => {
  const t0 = Date.now();
  const iv = setInterval(() => { if (pred()) { clearInterval(iv); res(true); } else if (Date.now() - t0 > ms) { clearInterval(iv); res(false); } }, 120);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const created = await send('Target.createTarget', { url: 'about:blank' });
const attached = await send('Target.attachToTarget', { targetId: created.result.targetId, flatten: true });
const sessionId = attached.result.sessionId;
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
await send('Page.navigate', { url: URL_UNDER_TEST }, sessionId);
await waitFor(() => events.some((e) => e.method === 'Page.loadEventFired'));
await sleep(2500);

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId);
  return r.result?.result?.value ?? JSON.stringify(r.result ?? r).slice(0, 400);
};

console.log(await evaluate(`(function(){
  const c = document.querySelector('.diagram-container');
  const svg = c.querySelector('svg');
  const cs = getComputedStyle(c);
  const chain = [];
  let el = c;
  while (el && el !== document.documentElement) {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    chain.push({
      tag: el.tagName.toLowerCase(),
      cls: String(el.className).slice(0, 40),
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      h: Math.round(r.height),
      mt: s.marginTop, mb: s.marginBottom, pt: s.paddingTop, pb: s.paddingBottom,
      display: s.display, position: s.position, minH: s.minHeight
    });
    el = el.parentElement;
  }
  return JSON.stringify({
    innerH: innerHeight, innerW: innerWidth,
    docScrollH: document.documentElement.scrollHeight,
    bodyScrollH: document.body.scrollHeight,
    bodyOverflow: getComputedStyle(document.body).overflow,
    cTop: Math.round(c.getBoundingClientRect().top),
    cBottom: Math.round(c.getBoundingClientRect().bottom),
    cH: Math.round(c.getBoundingClientRect().height),
    svgH: Math.round(svg.getBoundingClientRect().height),
    navReserve: cs.getPropertyValue('--archify-nav-reserve'),
    chain
  }, null, 1);
})()`));

chrome.kill();
process.exit(0);
