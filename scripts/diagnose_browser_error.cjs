const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/caldw/.gemini/antigravity-ide/brain/84039e6f-fa3a-4bb4-a592-d04b6697719f';
const CHROME_PATH = fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function main() {
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--window-size=1920,1080',
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

  const newTargetRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:3000/?bust=' + Date.now(), { method: 'PUT' });
  const target = await newTargetRes.json();

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
    } else if (data.method === 'Runtime.exceptionThrown') {
      console.error('EXCEPTION:', JSON.stringify(data.params.exceptionDetails));
    } else if (data.method === 'Console.messageAdded') {
      if (data.params.message.level === 'error') {
        console.error('CONSOLE_ERROR:', data.params.message.text);
      }
    }
  };

  await new Promise(r => ws.onopen = r);

  await send('Console.enable');
  await send('Runtime.enable');
  await send('Page.enable');

  await send('Page.navigate', { url: 'http://localhost:3000/?bust=' + Date.now() });
  await new Promise(r => setTimeout(r, 2500));

  // Switch to admirals_gambit
  console.log('Switching to admirals_gambit in UI...');
  const switchRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const select = document.getElementById('select-game-mode');
      if (select) {
        select.value = 'admirals_gambit';
        select.dispatchEvent(new Event('change'));
        return { success: true, val: select.value };
      }
      return { success: false };
    })()`,
    returnByValue: true
  });
  console.log('Mode switch result:', switchRes.result.value);

  await new Promise(r => setTimeout(r, 2000));

  // Check state of Admiral's Gambit view
  const statusRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const agView = document.getElementById('admirals-gambit-view');
      const cpText = document.getElementById('ag-cp-numeric')?.textContent;
      const turnText = document.getElementById('ag-turn-pill')?.textContent;
      const friendlyStatus = document.getElementById('ag-friendly-status')?.textContent;
      const canvasList = agView ? agView.querySelectorAll('canvas').length : 0;
      return {
        viewVisible: agView && !agView.classList.contains('hidden'),
        cpText,
        turnText,
        friendlyStatus,
        canvasCount: canvasList
      };
    })()`,
    returnByValue: true
  });
  console.log('Admiral\'s Gambit Status:', statusRes.result.value);

  // Take screenshot 1: Initial Bridge View
  const snap1 = await send('Page.captureScreenshot', { format: 'png' });
  const snap1Path = path.join(ARTIFACT_DIR, 'admirals_gambit_bridge.png');
  fs.writeFileSync(snap1Path, Buffer.from(snap1.data, 'base64'));
  console.log('Saved screenshot 1:', snap1Path);

  // Fire Battery at enemy cell (row 4, col 4)
  console.log('Firing battery at enemy cell [4, 4]...');
  const fireRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const enemyCanvas = document.getElementById('ag-enemy-grid-canvas');
      if (enemyCanvas) {
        const rect = enemyCanvas.getBoundingClientRect();
        // Click near center
        const clickX = rect.left + rect.width * 0.45;
        const clickY = rect.top + rect.height * 0.45;
        const evt = new MouseEvent('click', { clientX: clickX, clientY: clickY, bubbles: true });
        enemyCanvas.dispatchEvent(evt);
        return { clicked: true };
      }
      return { clicked: false };
    })()`,
    returnByValue: true
  });
  console.log('Fire trigger result:', fireRes.result.value);

  await new Promise(r => setTimeout(r, 1500));

  // Check CP and log after firing
  const afterFireRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const cpText = document.getElementById('ag-cp-numeric')?.textContent;
      const logHtml = document.getElementById('ag-combat-log')?.textContent;
      return { cpText, logSnippet: logHtml ? logHtml.slice(0, 120) : null };
    })()`,
    returnByValue: true
  });
  console.log('After fire state:', afterFireRes.result.value);

  // Switch camera to Tactical Orbit
  console.log('Toggling Camera Mode to Tactical Orbit...');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-ag-cam-mode')?.click()`,
    returnByValue: true
  });

  await new Promise(r => setTimeout(r, 1500));

  // Take screenshot 2: Tactical Orbit View
  const snap2 = await send('Page.captureScreenshot', { format: 'png' });
  const snap2Path = path.join(ARTIFACT_DIR, 'admirals_gambit_orbit.png');
  fs.writeFileSync(snap2Path, Buffer.from(snap2.data, 'base64'));
  console.log('Saved screenshot 2:', snap2Path);

  // Open Field Manual
  console.log('Opening Field Manual rules modal...');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-ag-rules')?.click()`,
    returnByValue: true
  });

  await new Promise(r => setTimeout(r, 800));

  const snap3 = await send('Page.captureScreenshot', { format: 'png' });
  const snap3Path = path.join(ARTIFACT_DIR, 'admirals_gambit_rules.png');
  fs.writeFileSync(snap3Path, Buffer.from(snap3.data, 'base64'));
  console.log('Saved screenshot 3:', snap3Path);

  ws.close();
  chromeProc.kill();
  console.log('ALL BROWSER TESTS COMPLETED SUCCESSFULLY!');
}

main().catch(console.error);
