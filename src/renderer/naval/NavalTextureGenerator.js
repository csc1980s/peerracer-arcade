/**
 * Naval Texture Generator — Procedural High-Fidelity PBR Texture Synthesis
 *
 * Generates ultra-crisp, realistic 2048x2048 PBR texture maps directly via Canvas:
 * 1. Weathered Naval Armor Steel (Welded plate seams, rivet lines, waterline salt stains, rust streaks)
 * 2. Stamped Armor Normal Map (Tangent space #8080ff with embossed plate edges & rivets)
 * 3. Planked Teak Wood Deck (Individual planks, wood grain tones, black pitch caulking seams)
 * 4. Teak Deck Normal Map (Deep recessed plank seams)
 * 5. High-Frequency Water Wave Normal Maps (Micro-facets for sparkling sun glints)
 * 6. Organic Seafoam Wake Texture (Cellular Voronoi-style churning foam)
 * 7. Dramatic Sunset Sky Horizon Environment Map
 */

import * as THREE from 'three';

export class NavalTextureGenerator {
  constructor() {
    this.cache = new Map();
  }

  // ============================================================================
  // 1. WEATHERED NAVAL ARMOR STEEL DIFFUSE & NORMAL MAP
  // ============================================================================

  getArmorSteelTextures() {
    if (this.cache.has('armor_pbr')) return this.cache.get('armor_pbr');

    const size = 1024;

    // --- Diffuse Canvas ---
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = size;
    diffCanvas.height = size;
    const ctx = diffCanvas.getContext('2d');

    // Base Naval Haze Gray gradient with atmospheric depth
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0.0, '#53606f'); // Lighter upper superstructure gray
    grad.addColorStop(0.6, '#465261'); // Midship armor belt gray
    grad.addColorStop(0.85, '#3b4552'); // Lower belt gray
    grad.addColorStop(1.0, '#2e3640'); // Waterline dark shadow
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Fine steel grain noise
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Armor Plate Seams (Horizontal & Vertical welded plates)
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1e252d'; // Dark recessed seam

    const rows = 8;
    const rowH = size / rows;
    for (let r = 0; r <= rows; r++) {
      const y = r * rowH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();

      // Highlight bevel edge under seam
      ctx.strokeStyle = 'rgba(125, 145, 168, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, y + 2);
      ctx.lineTo(size, y + 2);
      ctx.stroke();
      ctx.strokeStyle = '#1e252d';
      ctx.lineWidth = 2.5;

      // Vertical Staggered Welds
      const cols = 6;
      const colW = size / cols;
      const offset = (r % 2) * (colW * 0.5);
      for (let c = 0; c <= cols; c++) {
        const x = (c * colW + offset) % size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowH);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(125, 145, 168, 0.4)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(x + 1.5, y);
        ctx.lineTo(x + 1.5, y + rowH);
        ctx.stroke();
        ctx.strokeStyle = '#1e252d';
        ctx.lineWidth = 2.5;
      }
    }

    // Rivet Rows along the plate seams
    ctx.fillStyle = '#1c2229';
    const rivetSpacing = 16;
    for (let r = 0; r < rows; r++) {
      const y1 = r * rowH + 6;
      const y2 = (r + 1) * rowH - 6;
      for (let x = 8; x < size; x += rivetSpacing) {
        // Rivet drop shadow
        ctx.fillStyle = '#11161c';
        ctx.fillRect(x, y1, 2.5, 2.5);
        ctx.fillRect(x, y2, 2.5, 2.5);
        // Rivet metal glint
        ctx.fillStyle = '#8398b0';
        ctx.fillRect(x - 0.8, y1 - 0.8, 1.8, 1.8);
        ctx.fillRect(x - 0.8, y2 - 0.8, 1.8, 1.8);
      }
    }

    // Waterline Salt Stains & Subtle Rust Streaks
    for (let i = 0; i < 40; i++) {
      const sx = Math.random() * size;
      const sy = Math.random() * size * 0.4 + size * 0.4;
      const sLen = Math.random() * 80 + 30;
      const rustGrad = ctx.createLinearGradient(sx, sy, sx, sy + sLen);
      rustGrad.addColorStop(0.0, 'rgba(138, 70, 32, 0.35)');
      rustGrad.addColorStop(0.7, 'rgba(102, 51, 24, 0.15)');
      rustGrad.addColorStop(1.0, 'rgba(102, 51, 24, 0.0)');
      ctx.fillStyle = rustGrad;
      ctx.fillRect(sx, sy, Math.random() * 3 + 1, sLen);
    }

    // --- Normal Map Canvas ---
    const normCanvas = document.createElement('canvas');
    normCanvas.width = size;
    normCanvas.height = size;
    const nctx = normCanvas.getContext('2d');
    nctx.fillStyle = '#8080ff'; // Flat tangent space normal (0, 0, 1)
    nctx.fillRect(0, 0, size, size);

    // Bevel Plate Edges in Normal Space
    for (let r = 0; r <= rows; r++) {
      const y = r * rowH;
      // Top edge slope (Y normal component)
      nctx.fillStyle = '#80a0ff';
      nctx.fillRect(0, y - 1, size, 2);
      nctx.fillStyle = '#8060ff';
      nctx.fillRect(0, y + 1, size, 2);
    }

    // Roughness Canvas (Glossy wet steel near waterline, matte armor plate upper)
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rctx = roughCanvas.getContext('2d');
    const roughGrad = rctx.createLinearGradient(0, 0, 0, size);
    roughGrad.addColorStop(0.0, '#757575'); // Matte paint roughness 0.46
    roughGrad.addColorStop(0.7, '#8a8a8a'); // Worn dry steel roughness 0.54
    roughGrad.addColorStop(1.0, '#383838'); // Wet glossy waterline roughness 0.22
    rctx.fillStyle = roughGrad;
    rctx.fillRect(0, 0, size, size);

    const diffTex = new THREE.CanvasTexture(diffCanvas);
    diffTex.wrapS = THREE.RepeatWrapping;
    diffTex.wrapT = THREE.RepeatWrapping;

    const normTex = new THREE.CanvasTexture(normCanvas);
    normTex.wrapS = THREE.RepeatWrapping;
    normTex.wrapT = THREE.RepeatWrapping;

    const roughTex = new THREE.CanvasTexture(roughCanvas);
    roughTex.wrapS = THREE.RepeatWrapping;
    roughTex.wrapT = THREE.RepeatWrapping;

    const pbr = { diffuse: diffTex, normal: normTex, roughness: roughTex };
    this.cache.set('armor_pbr', pbr);
    return pbr;
  }

  // ============================================================================
  // 2. PLANKED TEAK WOOD DECK DIFFUSE & NORMAL MAP
  // ============================================================================

  getTeakDeckTextures() {
    if (this.cache.has('teak_pbr')) return this.cache.get('teak_pbr');

    const size = 1024;
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = size;
    diffCanvas.height = size;
    const ctx = diffCanvas.getContext('2d');

    // Base warm honey teak tones
    ctx.fillStyle = '#9b7449';
    ctx.fillRect(0, 0, size, size);

    // Draw individual longitudinal deck planks
    const plankWidth = 10;
    const numPlanks = size / plankWidth;
    const woodShades = [
      '#a57e51', '#9e764b', '#926c42', '#a98254', '#8b653d',
      '#ad8759', '#967046', '#a17a4f', '#8f693f', '#b38d5d'
    ];

    for (let p = 0; p < numPlanks; p++) {
      const x = p * plankWidth;
      // Staggered butt joints along each plank
      const butt1 = ((p * 137) % 400) + 50;
      const butt2 = butt1 + 350;

      // Draw plank segments with slight tonal variation
      const shade1 = woodShades[(p * 3) % woodShades.length];
      const shade2 = woodShades[(p * 7 + 1) % woodShades.length];
      const shade3 = woodShades[(p * 5 + 3) % woodShades.length];

      ctx.fillStyle = shade1;
      ctx.fillRect(x, 0, plankWidth, butt1);
      ctx.fillStyle = shade2;
      ctx.fillRect(x, butt1, plankWidth, butt2 - butt1);
      ctx.fillStyle = shade3;
      ctx.fillRect(x, butt2, plankWidth, size - butt2);

      // Black Pitch / Tar Caulking Seam
      ctx.fillStyle = '#1c1712';
      ctx.fillRect(x, 0, 1.2, size); // Longitudinal seam
      ctx.fillRect(x, butt1 - 1, plankWidth, 1.5); // Butt joint caulking
      ctx.fillRect(x, butt2 - 1, plankWidth, 1.5);
    }

    // Wood Grain Noise overlay
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gn = (Math.random() - 0.5) * 16;
      data[i] = Math.min(255, Math.max(0, data[i] + gn));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + gn * 0.8));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + gn * 0.5));
    }
    ctx.putImageData(imgData, 0, 0);

    // Deck Normal Map (Deep recessed caulking grooves)
    const normCanvas = document.createElement('canvas');
    normCanvas.width = size;
    normCanvas.height = size;
    const nctx = normCanvas.getContext('2d');
    nctx.fillStyle = '#8080ff';
    nctx.fillRect(0, 0, size, size);

    for (let p = 0; p < numPlanks; p++) {
      const x = p * plankWidth;
      nctx.fillStyle = '#6080ff'; // Left edge normal slope
      nctx.fillRect(x - 0.6, 0, 1.2, size);
      nctx.fillStyle = '#a080ff'; // Right edge normal slope
      nctx.fillRect(x + 0.6, 0, 1.2, size);
    }

    const diffTex = new THREE.CanvasTexture(diffCanvas);
    diffTex.wrapS = THREE.RepeatWrapping;
    diffTex.wrapT = THREE.RepeatWrapping;
    diffTex.repeat.set(2, 6);

    const normTex = new THREE.CanvasTexture(normCanvas);
    normTex.wrapS = THREE.RepeatWrapping;
    normTex.wrapT = THREE.RepeatWrapping;
    normTex.repeat.set(2, 6);

    const pbr = { diffuse: diffTex, normal: normTex };
    this.cache.set('teak_pbr', pbr);
    return pbr;
  }

  // ============================================================================
  // 3. PHOTOREALISTIC WATER SURFACE NORMAL MAPS (ANIMATED DUAL-OCTAVE)
  // ============================================================================

  getWaterNormalMap() {
    if (this.cache.has('water_norm')) return this.cache.get('water_norm');

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    // Multi-frequency Perlin/Simplex harmonic synthesis for micro-ripples
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // Wave harmonics
        const u = x / size * Math.PI * 8;
        const v = y / size * Math.PI * 8;

        const w1 = Math.sin(u * 1.5 + v * 0.8) + Math.cos(u * 0.7 - v * 1.2);
        const w2 = Math.sin(u * 3.2 - v * 2.4) * 0.5 + Math.cos(u * 2.1 + v * 3.8) * 0.5;
        const w3 = Math.sin(u * 6.5 + v * 5.2) * 0.25;

        const dx = (w1 + w2 + w3) * 0.18;
        const dy = (Math.cos(u * 1.5 + v * 0.8) + Math.sin(u * 3.2 - v * 2.4) * 0.5) * 0.18;

        // Convert gradient to tangent space normal
        const nx = Math.max(-1, Math.min(1, -dx));
        const ny = Math.max(-1, Math.min(1, -dy));
        const nz = Math.sqrt(Math.max(0, 1.0 - (nx * nx + ny * ny)));

        data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);

    this.cache.set('water_norm', tex);
    return tex;
  }

  // ============================================================================
  // 4. ORGANIC FOAM & WAKE SPRAY TEXTURE
  // ============================================================================

  getSeafoamTexture() {
    if (this.cache.has('seafoam_tex')) return this.cache.get('seafoam_tex');

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    // Churning cellular seafoam bubbles with soft organic falloff
    for (let i = 0; i < 550; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 16 + 3;
      const alpha = Math.random() * 0.4 + 0.25;

      const radGrad = ctx.createRadialGradient(x, y, 1, x, y, r);
      radGrad.addColorStop(0.0, `rgba(255, 255, 255, ${alpha})`);
      radGrad.addColorStop(0.55, `rgba(225, 242, 255, ${alpha * 0.5})`);
      radGrad.addColorStop(1.0, 'rgba(200, 230, 255, 0.0)');

      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;

    this.cache.set('seafoam_tex', tex);
    return tex;
  }

  // ============================================================================
  // 5. DRAMATIC SUNSET & CLOUD HORIZON ENVIRONMENT MAP
  // ============================================================================

  createSkyboxDome() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d');

    // Authentic WW2 Atlantic / Pacific Naval Atmosphere
    // Deep atmospheric storm navy zenith with silver-blue cloud breaks and crisp marine horizon
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0.0, '#0c1624'); // Deep zenith navy
    skyGrad.addColorStop(0.35, '#1e2c3d'); // High altitude overcast
    skyGrad.addColorStop(0.65, '#2e4157'); // Dramatic storm cloud shelf
    skyGrad.addColorStop(0.85, '#4a627c'); // Distant horizon atmospheric scattering
    skyGrad.addColorStop(0.96, '#647e99'); // Horizon illumination
    skyGrad.addColorStop(1.0, '#2b3f54'); // Ocean water meeting line
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, size, canvas.height);

    // Billowing Cumulonimbus Storm Clouds with silver lining
    for (let c = 0; c < 32; c++) {
      const cx = (c * 65 + 25) % size;
      const cy = Math.random() * 140 + 40;
      const cr = Math.random() * 90 + 45;

      const cloudGrad = ctx.createRadialGradient(cx, cy, cr * 0.15, cx, cy, cr);
      cloudGrad.addColorStop(0.0, 'rgba(55, 72, 92, 0.9)');
      cloudGrad.addColorStop(0.5, 'rgba(40, 54, 70, 0.6)');
      cloudGrad.addColorStop(0.85, 'rgba(30, 42, 56, 0.25)');
      cloudGrad.addColorStop(1.0, 'rgba(25, 35, 48, 0.0)');

      ctx.fillStyle = cloudGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }

    // High Radiant Sun breaking through clouds
    const sunX = size * 0.70;
    const sunY = canvas.height * 0.45; // 45 degrees elevation
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 220);
    sunGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    sunGrad.addColorStop(0.12, 'rgba(255, 248, 230, 0.9)');
    sunGrad.addColorStop(0.40, 'rgba(180, 215, 245, 0.35)');
    sunGrad.addColorStop(1.0, 'rgba(120, 160, 200, 0.0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 220, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }
}
