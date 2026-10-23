/**
 * Solitaire Sovereign - Ultimate Victory Celebration Engine
 * 
 * Features:
 * 1. High-Altitude Multi-Color Fireworks Show:
 *    - Real-time rocket trails, altitude detonation, spherical peonies, sparkling willow streamers.
 *    - Dynamic sound sync (launch whistles and resonant explosion thuds).
 * 2. 3D Tumbling Metallic Golden Confetti Rain:
 *    - Metallic gold foil flakes, shimmering stars, and swirling ribbon streamers.
 *    - 3D tumbling and flutter physics with specular gold highlights.
 * 3. Classic Card Waterfall Cascade:
 *    - Foundation card cascades with elastic floor bounce and motion trails.
 */

export class VictoryCascade {
  constructor(canvas, soundEngine = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = soundEngine;

    this.cards = [];
    this.goldenConfetti = [];
    this.rockets = [];
    this.fireworkParticles = [];

    this.running = false;
    this.animId = null;
    this.gravity = 0.55;
    this.restitution = -0.82;
    this.mode = 'grand_royale'; // 'grand_royale' | 'fireworks' | 'golden_confetti'

    this.fireworkInterval = null;
    this.confettiSpawnInterval = null;
    this.cardInterval = null;
    this.durationTimeout = null;
    this.durationMs = 5000; // Strictly 5.0 seconds maximum to prevent any looping
    this.onCelebrationEnd = null;

    // Initially hide canvas from DOM completely
    this.canvas.style.display = 'none';
    this.canvas.style.pointerEvents = 'none';

    // Click anywhere on canvas to dismiss immediately
    this.canvas.addEventListener('click', () => {
      this.stop();
      if (this.onCelebrationEnd) this.onCelebrationEnd();
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setSoundEngine(soundEngine) {
    this.sound = soundEngine;
  }

  /**
   * Starts the victory celebration
   * @param {Array<Array<Card>>} foundations Foundation piles
   * @param {Function} renderCardFaceImg Card image generator
   * @param {string} mode 'grand_royale' | 'fireworks' | 'golden_confetti'
   */
  start(foundations = [], renderCardFaceImg = null, mode = 'grand_royale') {
    this.stop();
    this.resize();
    this.running = true;
    this.mode = mode;

    this.cards = [];
    this.goldenConfetti = [];
    this.rockets = [];
    this.fireworkParticles = [];

    // Make canvas visible and active for celebration
    this.canvas.style.display = 'block';
    this.canvas.style.pointerEvents = 'auto';

    // Strict 5.0-second auto-stop timer
    if (this.durationTimeout) {
      clearTimeout(this.durationTimeout);
    }
    this.durationTimeout = setTimeout(() => {
      this.stop();
      if (this.onCelebrationEnd) this.onCelebrationEnd();
    }, this.durationMs);

    // 1. Launch Fireworks Show
    if (this.mode === 'grand_royale' || this.mode === 'fireworks') {
      this._launchInitialFireworksBurst();
      this.fireworkInterval = setInterval(() => {
        if (!this.running) return;
        this._launchRocket();
      }, 750);
    }

    // 2. Spawn Golden Confetti Rain
    if (this.mode === 'grand_royale' || this.mode === 'golden_confetti') {
      this._spawnGoldenConfetti(120);
      this.confettiSpawnInterval = setInterval(() => {
        if (!this.running) return;
        if (this.goldenConfetti.length < 180) {
          this._spawnGoldenConfetti(25);
        }
      }, 900);
    }

    // 3. Launch Classic Card Waterfall
    if ((this.mode === 'grand_royale') && foundations && foundations.length > 0 && renderCardFaceImg) {
      const cardPool = [];
      for (let rank = 12; rank >= 0; rank--) {
        for (let f = 0; f < foundations.length; f++) {
          if (foundations[f] && foundations[f][rank]) {
            cardPool.push({
              card: foundations[f][rank],
              foundationIdx: f
            });
          }
        }
      }

      let launchIndex = 0;
      this.cardInterval = setInterval(() => {
        if (!this.running || launchIndex >= cardPool.length) {
          clearInterval(this.cardInterval);
          return;
        }
        const item = cardPool[launchIndex++];
        this._launchCard(item.card, item.foundationIdx, renderCardFaceImg);
      }, 110);
    }

    this._loop();
  }

  // --------------------------------------------------------------------------
  // FIREWORKS SIMULATION
  // --------------------------------------------------------------------------

  _launchInitialFireworksBurst() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (this.running) this._launchRocket();
      }, i * 220);
    }
  }

  _launchRocket() {
    const x = Math.random() * (this.canvas.width * 0.7) + (this.canvas.width * 0.15);
    const targetY = Math.random() * (this.canvas.height * 0.45) + (this.canvas.height * 0.1);
    const vx = (Math.random() - 0.5) * 3;
    const vy = -12 - Math.random() * 4;

    if (this.sound && this.sound.playFireworkLaunch) {
      this.sound.playFireworkLaunch();
    }

    const colors = [
      ['#ffd700', '#ffea75', '#d4af37'], // Royal Gold
      ['#10b981', '#34d399', '#059669'], // Radiant Emerald
      ['#38bdf8', '#60a5fa', '#1d4ed8'], // Sapphire Blue
      ['#f43f5e', '#fb7185', '#be123c'], // Crimson Ruby
      ['#c084fc', '#e879f9', '#9333ea'], // Imperial Violet
      ['#ffffff', '#f1f5f9', '#cbd5e1']  // Diamond White
    ];
    const palette = colors[Math.floor(Math.random() * colors.length)];

    this.rockets.push({
      x,
      y: this.canvas.height,
      vx,
      vy,
      targetY,
      palette,
      trail: []
    });
  }

  _explodeRocket(rocket) {
    if (this.sound && this.sound.playFireworkBurst) {
      this.sound.playFireworkBurst();
    }

    const particleCount = 75 + Math.floor(Math.random() * 45);
    const baseSpeed = 4 + Math.random() * 3.5;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.2;
      const speed = baseSpeed * (0.4 + Math.random() * 0.8);
      const color = rocket.palette[Math.floor(Math.random() * rocket.palette.length)];

      this.fireworkParticles.push({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1.0,
        decay: 0.012 + Math.random() * 0.014,
        size: 2.5 + Math.random() * 2,
        sparkle: Math.random() > 0.4
      });
    }
  }

  // --------------------------------------------------------------------------
  // METALLIC GOLDEN CONFETTI SIMULATION
  // --------------------------------------------------------------------------

  _spawnGoldenConfetti(count = 90) {
    const goldTones = [
      { fill: '#ffd700', border: '#b38728' }, // Bright 24k Gold
      { fill: '#fef08a', border: '#d4af37' }, // Champagne Gold
      { fill: '#eab308', border: '#854d0e' }, // Deep Rich Gold
      { fill: '#fffbeb', border: '#fde047' }, // White Gold Shimmer
      { fill: '#ca8a04', border: '#713f12' }  // Bronze Gold
    ];

    for (let i = 0; i < count; i++) {
      const tone = goldTones[Math.floor(Math.random() * goldTones.length)];
      const type = Math.random() > 0.25 ? 'rect' : (Math.random() > 0.5 ? 'star' : 'ribbon');

      this.goldenConfetti.push({
        x: Math.random() * this.canvas.width,
        y: -30 - Math.random() * 300,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 1.8 + Math.random() * 3.2,
        width: 10 + Math.random() * 12,
        height: 6 + Math.random() * 8,
        angle: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.08,
        tilt: Math.random() * Math.PI,
        vtilt: (Math.random() - 0.5) * 0.12,
        tone,
        type,
        shimmer: Math.random() * Math.PI
      });
    }
  }

  // --------------------------------------------------------------------------
  // CLASSIC CARD WATERFALL
  // --------------------------------------------------------------------------

  _launchCard(card, foundationIdx, renderCardFaceImg) {
    const fElement = document.getElementById(`foundation-${foundationIdx}`);
    const rect = fElement ? fElement.getBoundingClientRect() : { left: 240 + foundationIdx * 110, top: 90 };

    const vx = (Math.random() - 0.5) * 9 + (Math.random() > 0.5 ? 4.5 : -4.5);
    const vy = -3.5 - Math.random() * 4.5;

    this.cards.push({
      card,
      x: rect.left,
      y: rect.top,
      vx,
      vy,
      width: 90,
      height: 126,
      rot: (Math.random() - 0.5) * 0.1,
      vrot: (Math.random() - 0.5) * 0.05,
      active: true,
      img: renderCardFaceImg(card)
    });
  }

  // --------------------------------------------------------------------------
  // MAIN ANIMATION LOOP
  // --------------------------------------------------------------------------

  _loop() {
    if (!this.running) return;

    // Soft dark transparent wash for luminous firework trails
    this.ctx.fillStyle = 'rgba(6, 12, 9, 0.18)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const floor = this.canvas.height - 130;

    // 1. Update & Render Rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.x += r.vx;
      r.y += r.vy;
      r.vy += 0.15; // Slow down ascending

      // Smoky spark trail
      r.trail.push({ x: r.x, y: r.y, alpha: 1.0 });
      if (r.trail.length > 8) r.trail.shift();

      this.ctx.save();
      for (const t of r.trail) {
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 230, 150, ${t.alpha})`;
        this.ctx.fill();
        t.alpha -= 0.12;
      }
      this.ctx.restore();

      // Check detonation
      if (r.y <= r.targetY || r.vy >= 0) {
        this._explodeRocket(r);
        this.rockets.splice(i, 1);
      }
    }

    // 2. Update & Render Firework Particles
    for (let i = this.fireworkParticles.length - 1; i >= 0; i--) {
      const p = this.fireworkParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // Gravity on embers
      p.vx *= 0.98; // Air resistance
      p.vy *= 0.98;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.fireworkParticles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = p.color;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 3. Update & Render Bouncing Cards (if any)
    for (const c of this.cards) {
      if (!c.active) continue;

      c.vy += this.gravity;
      c.x += c.vx;
      c.y += c.vy;
      c.rot += c.vrot;

      if (c.y >= floor) {
        c.y = floor;
        c.vy *= this.restitution;
        c.vx *= 0.98;
        if (Math.abs(c.vy) < 1.2) c.vy = 0;
      }

      if (c.x <= 0 || c.x + c.width >= this.canvas.width) {
        c.vx *= -0.85;
        c.x = Math.max(0, Math.min(this.canvas.width - c.width, c.x));
      }

      if (c.img) {
        this.ctx.save();
        this.ctx.translate(c.x + c.width / 2, c.y + c.height / 2);
        this.ctx.rotate(c.rot);
        this.ctx.drawImage(c.img, -c.width / 2, -c.height / 2, c.width, c.height);
        this.ctx.restore();
      }
    }

    // 4. Update & Render 3D Tumbling Metallic Golden Confetti
    for (const conf of this.goldenConfetti) {
      conf.x += conf.vx;
      conf.y += conf.vy;
      conf.angle += conf.vrot;
      conf.tilt += conf.vtilt;
      conf.shimmer += 0.08;

      if (conf.y > this.canvas.height + 40) {
        if (this.running) {
          conf.y = -20;
          conf.x = Math.random() * this.canvas.width;
        }
      }

      // 3D tilt factor simulating tumbling in wind
      const tiltScale = Math.cos(conf.tilt);
      const shimmerLight = 0.8 + 0.2 * Math.sin(conf.shimmer);

      this.ctx.save();
      this.ctx.translate(conf.x, conf.y);
      this.ctx.rotate(conf.angle);
      this.ctx.scale(1, tiltScale);

      this.ctx.fillStyle = conf.tone.fill;
      this.ctx.strokeStyle = conf.tone.border;
      this.ctx.lineWidth = 1;
      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';

      if (conf.type === 'rect') {
        this.ctx.fillRect(-conf.width / 2, -conf.height / 2, conf.width, conf.height);
        this.ctx.strokeRect(-conf.width / 2, -conf.height / 2, conf.width, conf.height);
      } else if (conf.type === 'star') {
        this._drawStar(this.ctx, 0, 0, 5, conf.width * 0.6, conf.width * 0.3);
      } else {
        // Ribbon Streamer
        this.ctx.beginPath();
        this.ctx.moveTo(-conf.width, -conf.height);
        this.ctx.bezierCurveTo(-conf.width / 2, conf.height, conf.width / 2, -conf.height, conf.width, conf.height);
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      }

      this.ctx.restore();
    }

    this.animId = requestAnimationFrame(() => this._loop());
  }

  _drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  stop() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.fireworkInterval) {
      clearInterval(this.fireworkInterval);
      this.fireworkInterval = null;
    }
    if (this.confettiSpawnInterval) {
      clearInterval(this.confettiSpawnInterval);
      this.confettiSpawnInterval = null;
    }
    if (this.cardInterval) {
      clearInterval(this.cardInterval);
      this.cardInterval = null;
    }
    if (this.durationTimeout) {
      clearTimeout(this.durationTimeout);
      this.durationTimeout = null;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.style.display = 'none';
    this.canvas.style.pointerEvents = 'none';

    this.cards = [];
    this.goldenConfetti = [];
    this.rockets = [];
    this.fireworkParticles = [];
  }
}
