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

  const bust = Date.now();
  const newTargetRes = await fetch(`http://127.0.0.1:9222/json/new?http://localhost:3000/?bust=${bust}`, { method: 'PUT' });
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

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise(r => { ws.onopen = r; });
  console.log('WebSocket connected to target');

  await send('Page.enable');
  await send('Runtime.enable');

  // Wait for page load
  await new Promise(r => setTimeout(r, 2000));

  // Select admirals_gambit game mode
  console.log('Switching to admirals_gambit game mode...');
  await send('Runtime.evaluate', {
    expression: `
      const sel = document.getElementById('select-game-mode');
      if (sel) {
        sel.value = 'admirals_gambit';
        sel.dispatchEvent(new Event('change'));
      }
    `
  });

  // Wait for 3D scene & sprites to load and render
  await new Promise(r => setTimeout(r, 2500));

  // Screenshot 1: Full Bridge View with Fleet Grid & 3D Center Dreadnought
  console.log('Capturing Bridge View...');
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  const shot1Path = path.join(ARTIFACT_DIR, 'admirals_gambit_verified_bridge.png');
  fs.writeFileSync(shot1Path, Buffer.from(shot1.data, 'base64'));
  console.log('Saved Bridge View:', shot1Path);

  // Switch to Tactical Orbit camera mode
  console.log('Switching to Tactical Orbit mode...');
  await send('Runtime.evaluate', {
    expression: `
      const camBtn = document.getElementById('btn-ag-cam-mode');
      if (camBtn) camBtn.click();
    `
  });

  await new Promise(r => setTimeout(r, 1500));

  // Screenshot 2: Tactical Orbit View showing full 3D dreadnought cutting waves
  console.log('Capturing Tactical Orbit View...');
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  const shot2Path = path.join(ARTIFACT_DIR, 'admirals_gambit_verified_orbit.png');
  fs.writeFileSync(shot2Path, Buffer.from(shot2.data, 'base64'));
  console.log('Saved Tactical Orbit View:', shot2Path);

  // Close tab & terminate Chrome
  await fetch(`http://127.0.0.1:9222/json/close/${target.id}`);
  chromeProc.kill();
  console.log('Browser capture complete!');
}

main().catch(err => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
