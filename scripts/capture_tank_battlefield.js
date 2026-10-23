const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/caldw/.gemini/antigravity-ide/brain/84039e6f-fa3a-4bb4-a592-d04b6697719f';
const CHROME_PATH = fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function main() {
  console.log('Launching browser via CDP:', CHROME_PATH);

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--window-size=1920,1080',
    '--disable-gpu-shader-disk-cache',
    '--no-sandbox',
    'about:blank'
  ]);

  // Wait for DevTools port to open
  await new Promise(r => setTimeout(r, 1500));

  let versionRes;
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      versionRes = await res.json();
      break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (!versionRes) {
    console.error('Failed to connect to browser on port 9222');
    chromeProc.kill();
    process.exit(1);
  }

  console.log('Connected to browser:', versionRes.Browser);

  // Create new page target
  const newTargetRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:3000/?bust=' + Date.now(), { method: 'PUT' });
  const target = await newTargetRes.json();
  console.log('Target opened:', target.id);

  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise(resolve => ws.onopen = resolve);

  // Listen for messages
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      const type = data.params.type;
      const text = data.params.args.map(a => a.value || a.description || '').join(' ');
      if (type === 'error') {
        console.error('[BROWSER CONSOLE ERROR]:', text);
      } else {
        console.log('[BROWSER CONSOLE]:', text);
      }
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]:', data.params.exceptionDetails.text);
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');

  console.log('Waiting for page to initialize Three.js scene...');
  await new Promise(r => setTimeout(r, 3500));

  // Ensure game mode is Tank Minefield
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const sel = document.querySelector('#select-game-mode');
        if (sel && sel.value !== 'tank_minefield') {
          sel.value = 'tank_minefield';
          sel.dispatchEvent(new Event('change'));
        }
      })()
    `
  });

  await new Promise(r => setTimeout(r, 2000));

  async function takeScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log('✓ Saved screenshot:', filePath);
  }

  // 1. Cockpit View with skirmish soldiers & undulating terrain
  console.log('Capturing Cockpit View...');
  await takeScreenshot('tank_cockpit_skirmish_verified.png');

  // 2. Switch to Orbit View
  console.log('Switching to Orbit camera view...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('#btn-tm-cam-mode');
        if (btn) btn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1200));
  await takeScreenshot('tank_orbit_terrain_trees_verified.png');

  // 3. Wait 4 seconds for soldier crossfire, grenade tosses, and bomber plane pass
  console.log('Waiting for skirmish crossfire, grenades, and distant bombing run...');
  await new Promise(r => setTimeout(r, 4500));
  await takeScreenshot('tank_combat_and_bomber_verified.png');

  // 4. Cycle to Desert preset
  console.log('Cycling to Desert environment...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('#btn-tm-env-mode');
        if (btn) btn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));
  await takeScreenshot('tank_desert_visuals_verified.png');

  // Clean exit
  ws.close();
  chromeProc.kill();
  console.log('Browser test complete! All screenshots captured.');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error in browser test:', err);
  process.exit(1);
});
