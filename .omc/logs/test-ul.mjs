// valida <ul> na description + scroll + modal ≤ container
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-pipe', 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
let buf = ''; const pending = new Map(); let id = 0; const events = [];
chrome.stdio[4].on('data', d => { buf += d; let i; while ((i = buf.indexOf('\0')) !== -1) { const raw = buf.slice(0, i); buf = buf.slice(i + 1); if (!raw) continue; let m; try { m = JSON.parse(raw); } catch (_) { continue; } if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) events.push(m); } });
const send = (method, params = {}, sid) => new Promise(res => { const i = ++id; pending.set(i, m => res(m)); chrome.stdio[3].write(Buffer.from(JSON.stringify(sid ? { id: i, method, params, sessionId: sid } : { id: i, method, params }) + '\0')); });
const wait = p => new Promise(r => { const t0 = Date.now(); const iv = setInterval(() => { if (p()) { clearInterval(iv); r(true); } else if (Date.now() - t0 > 8000) { clearInterval(iv); r(false); } }, 120); });

const created = await send('Target.createTarget', { url: 'about:blank' });
const att = await send('Target.attachToTarget', { targetId: created.result.targetId, flatten: true });
const sid = att.result.sessionId;
await send('Page.enable', {}, sid); await send('Runtime.enable', {}, sid);
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sid);
await send('Page.navigate', { url: 'http://localhost:8123/diagrams/sync-zendesk/email-conflict/email-conflict.html?theme=light&shell=1' }, sid);
await wait(() => events.some(e => e.method === 'Page.loadEventFired'));
await new Promise(r => setTimeout(r, 2500));

const expr = "(function(){const node=[].slice.call(document.querySelectorAll('[data-node-description]')).find(function(n){return (n.getAttribute('data-node-description')||'').indexOf('<ul>')>=0;});if(!node)return 'node-ul-not-found';node.dispatchEvent(new MouseEvent('click',{bubbles:true}));const d=document.getElementById('focus-description');const chip=document.getElementById('focus-chip');const cont=document.querySelector('.diagram-container').getBoundingClientRect();const cr=chip.getBoundingClientRect();return JSON.stringify({li:d.querySelectorAll('li').length,descMaxH:getComputedStyle(d).maxHeight,descScroll:getComputedStyle(d).overflowY,chipH:Math.round(cr.height),contH:Math.round(cont.height),chipFit:cr.bottom<=cont.bottom+1,scrollable:d.scrollHeight>d.clientHeight});})()";
const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sid);
console.log(r.result?.result?.value ?? JSON.stringify(r.result ?? r).slice(0, 300));
const shot = await send('Page.captureScreenshot', { format: 'png' }, sid);
fs.writeFileSync('/tmp/passport-ul.png', Buffer.from(shot.result.data, 'base64'));
chrome.kill(); process.exit(0);
