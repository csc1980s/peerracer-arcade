// Browser smoke test: starts the local server, opens every game in headless Chromium and checks that
// it starts without script errors, the PeerRacer Arcade name shows, and the page never scrolls sideways.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const server = spawn(process.execPath, ['server.js'], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);

const wait = (ms) => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 50; i++) {
  try { if ((await fetch('http://localhost:3000/index.html')).ok) break; } catch { /* not up yet */ }
  await wait(200);
}

let failed = 0;
const fail = (msg) => { failed++; console.error('FAIL: ' + msg); };
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:3000/index.html');
await wait(1500);

const modes = await page.evaluate(() => [...document.querySelectorAll('#select-game-mode option')].map(o => o.value));
if (modes.length < 15) fail(`expected the full game list, found ${modes.length}`);
if (!(await page.title()).includes('PeerRacer Arcade')) fail('tab title does not say PeerRacer Arcade');
if (!/PEERRACER ARCADE/.test(await page.textContent('.brand-title'))) fail('header does not say PEERRACER ARCADE');

for (const mode of modes) {
  errors.length = 0;
  await page.selectOption('#select-game-mode', mode);
  await wait(350);
  if (errors.length) fail(`${mode}: script error: ${errors[0]}`);
  const state = await page.evaluate(() => ({
    type: window.solitaireApp?.gameType,
    hasGame: !!window.solitaireApp?.currentGame,
    sideways: document.documentElement.scrollWidth > window.innerWidth + 4
  }));
  if (!state.hasGame) fail(`${mode}: no game was created`);
  if (state.sideways) fail(`${mode}: page scrolls sideways`);
  console.log(`ok ${mode}`);
}

// Blackjack: a crowded hand must stay inside its seat
await page.selectOption('#select-game-mode', 'blackjack');
await wait(300);
const overlap = await page.evaluate(() => {
  const app = window.solitaireApp, g = app.currentGame;
  const take = (k) => g.shoe.splice(0, k).map(c => ({ ...c, faceUp: true }));
  g.status = 'PLAYING';
  g.seats[0].cards = take(5); g.seats[2].cards = take(5);
  g.playerHands = [{ cards: take(5), bet: 10 }];
  app.render();
  const boxes = [...document.querySelectorAll('.bj-seat-box')];
  return boxes.map(box => {
    const b = box.getBoundingClientRect();
    return [...box.querySelectorAll('.solitaire-card')].some(c => { const r = c.getBoundingClientRect(); return r.left < b.left - 2 || r.right > b.right + 2; });
  });
});
if (overlap.some(Boolean)) fail('blackjack cards spill out of their seat');

await browser.close();
stop();
console.log(failed ? `${failed} failed` : 'browser smoke test passed');
process.exit(failed ? 1 : 0);
