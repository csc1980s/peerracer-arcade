/**
 * EffectPlayer - Plays celebration effects using EffectCraft templates
 * Victorian Christmas Solitaire - Card Celebration System
 */

export class EffectPlayer {
  constructor(options = {}) {
    this.canvas = options.canvas || null;
    this.context = options.context || null;
    this.particleSystem = options.particleSystem || null;
    this.animationLibrary = options.animationLibrary || 'anime'; // 'anime' or 'gsap'

    this.activeEffects = [];
    this.maxConcurrentEffects = options.maxConcurrentEffects || 3;

    // Performance & celebration settings
    this.performanceMode = options.performanceMode || 'auto'; // 'low', 'medium', 'high', 'auto'
    this.celebrationsEnabled = options.celebrationsEnabled !== false;
    this.particlesEnabled = options.particlesEnabled !== false;
    this.intensity = options.intensity || 'medium'; // 'low', 'medium', 'high'

    // Initialize animation library
    this.initAnimationLibrary();
  }

  /**
   * Initialize animation library (anime.js or GSAP)
   */
  initAnimationLibrary() {
    if (this.animationLibrary === 'anime' && typeof anime !== 'undefined') {
      this.animator = anime;
      console.log('✅ Using Anime.js for animations');
    } else if (this.animationLibrary === 'gsap' && typeof gsap !== 'undefined') {
      this.animator = gsap;
      console.log('✅ Using GSAP for animations');
    } else {
      console.warn('⚠️ Animation library not found, using fallback CSS animations');
      this.animator = null;
    }
  }

  /**
   * Play celebration effect
   * @param {Object} effectTemplate - EffectCraft template
   * @param {HTMLElement} cardElement - Card DOM element to animate
   * @param {Object} options - Additional options
   */
  async playEffect(effectTemplate, cardElement, options = {}) {
    if (!this.celebrationsEnabled) {
      return null;
    }

    // Check if we're at max concurrent effects
    if (this.activeEffects.length >= this.maxConcurrentEffects) {
      console.log('Max concurrent effects reached, skipping');
      return;
    }

    const effectId = `effect_${Date.now()}_${Math.random()}`;

    const effect = {
      id: effectId,
      template: effectTemplate,
      cardElement,
      startTime: Date.now(),
      animations: [],
      particles: []
    };

    this.activeEffects.push(effect);

    try {
      // 1. Play card animations
      if (effectTemplate.cardAnimation) {
        await this.playCardAnimations(
          cardElement,
          effectTemplate.cardAnimation,
          effect
        );
      }

      // 2. Spawn particles
      if (this.particlesEnabled && effectTemplate.particles) {
        this.spawnParticles(
          cardElement,
          effectTemplate.particles,
          effect
        );
      }

      // 3. Screen effects (flash, shake, etc.)
      if (effectTemplate.screenEffects) {
        this.playScreenEffects(effectTemplate.screenEffects);
      }

    } catch (error) {
      console.error('Error playing effect:', error);
    } finally {
      // Clean up after effect completes
      setTimeout(() => {
        this.cleanupEffect(effectId);
      }, this.getEffectDuration(effectTemplate));
    }

    return effectId;
  }

  /**
   * Play card animation sequence
   */
  async playCardAnimations(cardElement, animationConfig, effect) {
    const sequence = animationConfig.sequence || [];

    for (const anim of sequence) {
      const animation = await this.playCardAnimation(cardElement, anim);
      effect.animations.push(animation);
    }
  }

  /**
   * Play individual card animation
   */
  async playCardAnimation(cardElement, animConfig) {
    const duration = animConfig.duration || 1000;
    const easing = animConfig.easing || 'easeInOutQuad';
    const properties = animConfig.properties || {};

    if (this.animator === anime) {
      // Use anime.js
      return this.playAnimeAnimation(cardElement, {
        duration,
        easing,
        ...this.buildAnimeProperties(properties)
      });
    } else if (this.animator === gsap) {
      // Use GSAP
      return this.playGSAPAnimation(cardElement, {
        duration: duration / 1000,
        ease: easing,
        ...this.buildGSAPProperties(properties)
      });
    } else {
      // Fallback to CSS
      return this.playCSSAnimation(cardElement, properties, duration);
    }
  }

  /**
   * Build anime.js property object from keyframes
   */
  buildAnimeProperties(properties) {
    const animeProps = {};

    for (const [prop, config] of Object.entries(properties)) {
      if (config.keyframes) {
        // Convert keyframes to anime format
        animeProps[prop] = config.keyframes.map(kf => ({
          value: kf.value,
          duration: kf.time * (config.duration || 1000)
        }));
      } else {
        animeProps[prop] = config;
      }
    }

    return animeProps;
  }

  /**
   * Build GSAP property object from keyframes
   */
  buildGSAPProperties(properties) {
    const gsapProps = {};

    for (const [prop, config] of Object.entries(properties)) {
      if (config.keyframes) {
        // Use GSAP's keyframes
        gsapProps[prop] = config.keyframes.map(kf => kf.value);
      } else {
        gsapProps[prop] = config;
      }
    }

    return gsapProps;
  }

  /**
   * Play animation with anime.js
   */
  async playAnimeAnimation(element, props) {
    return new Promise(resolve => {
      anime({
        targets: element,
        ...props,
        complete: resolve
      });
    });
  }

  /**
   * Play animation with GSAP
   */
  async playGSAPAnimation(element, props) {
    return new Promise(resolve => {
      gsap.to(element, {
        ...props,
        onComplete: resolve
      });
    });
  }

  /**
   * Fallback CSS animation
   */
  async playCSSAnimation(element, properties, duration) {
    return new Promise(resolve => {
      element.style.transition = `all ${duration}ms ease-in-out`;

      for (const [prop, config] of Object.entries(properties)) {
        if (config.keyframes && config.keyframes.length > 0) {
          const finalValue = config.keyframes[config.keyframes.length - 1].value;
          element.style[prop] = finalValue;
        }
      }

      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, duration);
    });
  }

  /**
   * Spawn particle effects
   */
  spawnParticles(cardElement, particleConfig, effect) {
    const emitters = particleConfig.emitters || [];
    const cardRect = cardElement.getBoundingClientRect();

    for (const emitter of emitters) {
      const particleEffect = this.createParticleEmitter(
        emitter,
        cardRect,
        effect
      );
      effect.particles.push(particleEffect);
    }
  }

  /**
   * Create particle emitter
   */
  createParticleEmitter(config, cardRect, effect) {
    // Position calculations
    const position = this.calculateEmitterPosition(
      config.position,
      cardRect
    );

    // Calculate intensity-scaled particle count
    let count = config.count || 20;
    if (this.intensity === 'low') {
      count = Math.max(5, Math.round(count * 0.5));
    } else if (this.intensity === 'high') {
      count = Math.round(count * 1.5);
    }

    // Create particles
    const particles = [];

    for (let i = 0; i < count; i++) {
      const particle = this.createParticle(config, position, i);
      particles.push(particle);

      // Add to DOM or canvas
      this.renderParticle(particle);
    }

    // Animate particles
    this.animateParticles(particles, config);

    return {
      config,
      particles,
      startTime: Date.now()
    };
  }

  /**
   * Calculate emitter position based on config
   */
  calculateEmitterPosition(positionType, cardRect) {
    const positions = {
      'card_center': {
        x: cardRect.left + cardRect.width / 2,
        y: cardRect.top + cardRect.height / 2
      },
      'card_top': {
        x: cardRect.left + cardRect.width / 2,
        y: cardRect.top
      },
      'card_bottom': {
        x: cardRect.left + cardRect.width / 2,
        y: cardRect.bottom
      },
      'card_around': {
        x: cardRect.left + cardRect.width / 2,
        y: cardRect.top + cardRect.height / 2
      },
      'screen_top': {
        x: window.innerWidth / 2,
        y: 0
      },
      'screen_center': {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      }
    };

    return positions[positionType] || positions['card_center'];
  }

  /**
   * Create single particle with themed sprite mapping
   */
  createParticle(config, position, index) {
    let spritePath = null;
    const shape = config.shape || 'circle';

    const spriteMap = {
      'heart': ['assets/particles/hearts/heart_01.svg', 'assets/particles/hearts/heart_02.svg'],
      'holly': ['assets/particles/hearts/holly_leaf_01.svg', 'assets/particles/hearts/berry.svg'],
      'snowflake': ['assets/particles/diamonds/snowflake_01.svg', 'assets/particles/diamonds/snowflake_02.svg'],
      'crystal': ['assets/particles/diamonds/diamond_crystal.svg', 'assets/particles/diamonds/ice_sparkle.svg'],
      'leaf': ['assets/particles/spades/leaf_maple.svg', 'assets/particles/spades/leaf_oak.svg'],
      'pine': ['assets/particles/spades/pine_needle.svg', 'assets/particles/spades/acorn.svg'],
      'candy': ['assets/particles/clubs/candy_stripe.svg', 'assets/particles/clubs/peppermint_swirl.svg'],
      'peppermint': ['assets/particles/clubs/peppermint_swirl.svg'],
      'ribbon': ['assets/particles/clubs/ribbon.svg', 'assets/particles/clubs/sugar_sparkle.svg'],
      'crown': ['assets/particles/crowns/crown_royal.svg', 'assets/particles/hearts/sparkle_gold.svg'],
      'lightning': ['assets/particles/crowns/lightning_spark.svg'],
      'star': ['assets/particles/crowns/victory_star.svg', 'assets/particles/hearts/sparkle_gold.svg']
    };

    if (config.sprite?.path) {
      const variants = [config.sprite.path, ...(config.sprite.variants || [])];
      spritePath = this.randomChoice(variants);
    } else if (spriteMap[shape]) {
      spritePath = this.randomChoice(spriteMap[shape]);
    }

    const particle = {
      x: position.x + (Math.random() - 0.5) * 20,
      y: position.y + (Math.random() - 0.5) * 20,
      vx: this.randomInRange(config.velocity?.x || {min: -50, max: 50}),
      vy: this.randomInRange(config.velocity?.y || {min: -100, max: -50}),
      size: (config.size?.start || 12) * (spritePath ? 1.6 : 1),
      color: this.randomChoice(config.colors || ['#ffffff']),
      opacity: config.opacity?.start || 1,
      rotation: config.rotation?.start || Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 6,
      lifetime: config.particleLifetime || 1000,
      createdAt: Date.now(),
      shape: shape,
      spritePath: spritePath,
      element: null
    };

    return particle;
  }

  /**
   * Render particle to DOM with vector sprite or geometric styling
   */
  renderParticle(particle) {
    const el = document.createElement('div');
    el.className = 'celebration-particle';
    el.style.position = 'absolute';
    el.style.left = particle.x + 'px';
    el.style.top = particle.y + 'px';
    el.style.width = particle.size + 'px';
    el.style.height = particle.size + 'px';
    el.style.opacity = particle.opacity;
    el.style.pointerEvents = 'none';
    el.style.zIndex = '10000';
    el.style.willChange = 'transform, opacity';

    if (particle.spritePath) {
      el.style.backgroundImage = `url("${particle.spritePath}")`;
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center';
      el.style.filter = 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))';
    } else {
      el.style.backgroundColor = particle.color;
      el.style.borderRadius = particle.shape === 'circle' ? '50%' : '2px';
      el.style.boxShadow = `0 0 6px ${particle.color}`;
    }

    document.body.appendChild(el);
    particle.element = el;
  }

  /**
   * Animate particles with physics
   */
  animateParticles(particles, config) {
    const gravity = config.gravity || 0;
    const airResistance = config.airResistance || 1;

    const animate = () => {
      const now = Date.now();
      let activeParticles = 0;

      for (const particle of particles) {
        const age = now - particle.createdAt;

        if (age > particle.lifetime) {
          if (particle.element) {
            particle.element.remove();
          }
          continue;
        }

        activeParticles++;

        // Physics update
        particle.vy += gravity * 0.016; // Apply gravity
        particle.vx *= airResistance;
        particle.vy *= airResistance;

        particle.x += particle.vx * 0.016;
        particle.y += particle.vy * 0.016;

        // Opacity fade
        const progress = age / particle.lifetime;
        const opacityStart = config.opacity?.start || 1;
        const opacityEnd = config.opacity?.end || 0;
        particle.opacity = opacityStart + (opacityEnd - opacityStart) * progress;

        // Size change
        if (config.size?.end) {
          const sizeStart = config.size.start || 10;
          const sizeEnd = config.size.end;
          particle.size = sizeStart + (sizeEnd - sizeStart) * progress;
        }

        // Update DOM
        if (particle.element) {
          particle.element.style.left = particle.x + 'px';
          particle.element.style.top = particle.y + 'px';
          particle.element.style.opacity = particle.opacity;
          particle.element.style.width = particle.size + 'px';
          particle.element.style.height = particle.size + 'px';

          if (config.rotation) {
            particle.rotation += 2;
            particle.element.style.transform = `rotate(${particle.rotation}deg)`;
          }
        }
      }

      // Continue animation if particles are active
      if (activeParticles > 0) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Play screen effects (flash, shake, etc.)
   */
  playScreenEffects(effects) {
    if (effects.flash) {
      this.screenFlash(effects.flash);
    }

    if (effects.shake) {
      this.screenShake(effects.shake);
    }
  }

  /**
   * Screen flash effect
   */
  screenFlash(config) {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.backgroundColor = config.color || '#ffffff';
    flash.style.opacity = config.opacity || '0.3';
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '9999';

    document.body.appendChild(flash);

    setTimeout(() => {
      flash.remove();
    }, config.duration || 200);
  }

  /**
   * Screen shake effect
   */
  screenShake(config) {
    const gameContainer = document.getElementById('game-container') || document.body;
    const intensity = config.intensity || 5;
    const duration = config.duration || 400;
    const frequency = config.frequency || 20;

    const originalTransform = gameContainer.style.transform;
    const shakeInterval = setInterval(() => {
      const x = (Math.random() - 0.5) * intensity;
      const y = (Math.random() - 0.5) * intensity;
      gameContainer.style.transform = `translate(${x}px, ${y}px)`;
    }, frequency);

    setTimeout(() => {
      clearInterval(shakeInterval);
      gameContainer.style.transform = originalTransform;
    }, duration);
  }

  /**
   * Get total effect duration
   */
  getEffectDuration(template) {
    let maxDuration = 0;

    if (template.cardAnimation) {
      for (const anim of template.cardAnimation.sequence || []) {
        maxDuration = Math.max(maxDuration, anim.duration || 0);
      }
    }

    if (template.particles) {
      for (const emitter of template.particles.emitters || []) {
        const emitterDuration = (emitter.duration || 0) + (emitter.particleLifetime || 0);
        maxDuration = Math.max(maxDuration, emitterDuration);
      }
    }

    return maxDuration + 500; // Add buffer
  }

  /**
   * Cleanup effect
   */
  cleanupEffect(effectId) {
    const index = this.activeEffects.findIndex(e => e.id === effectId);

    if (index !== -1) {
      const effect = this.activeEffects[index];

      // Remove particle elements
      for (const particleEmitter of effect.particles) {
        for (const particle of particleEmitter.particles) {
          if (particle.element) {
            particle.element.remove();
          }
        }
      }

      this.activeEffects.splice(index, 1);
    }
  }

  /**
   * Utility: Random number in range
   */
  randomInRange(range) {
    return range.min + Math.random() * (range.max - range.min);
  }

  /**
   * Utility: Random choice from array
   */
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Stop all active effects
   */
  stopAll() {
    for (const effect of this.activeEffects) {
      this.cleanupEffect(effect.id);
    }
    this.activeEffects = [];
  }

  setIntensity(intensity) {
    if (['low', 'medium', 'high'].includes(intensity)) {
      this.intensity = intensity;
    }
  }

  setEnabled(enabled) {
    this.celebrationsEnabled = !!enabled;
  }

  setParticlesEnabled(enabled) {
    this.particlesEnabled = !!enabled;
  }
}

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EffectPlayer;
}
