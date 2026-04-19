/* background.js
   Lightweight animated background (stars + circuit-like connecting lines)
   - Creates and inserts a full-screen <canvas id="bg-canvas"> if none exists
   - Respects prefers-reduced-motion
   - Small, configurable particle system with parallax on mouse move
   - Designed to be imported with <script src="background.js" defer></script>
*/

/* Configuration (tweak these values) */
const BG_CONFIG = {
  minStars: 60,               // minimum number of stars
  densityFactor: 9000,        // larger = fewer stars (w*h / densityFactor)
  maxConnectDistance: 120,    // px distance to draw connecting lines
  lineBaseAlpha: 0.02,        // base alpha for connecting lines
  starSpeed: 0.02,            // base velocity multiplier
  canvasId: 'bg-canvas',      // id used for the canvas element
  zIndex: 0                   // z-index for the canvas (CSS var overrides if needed)
};

(function initBackground(){
  // Respect reduced motion preference
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced) return;

  // Ensure a canvas exists
  let canvas = document.getElementById(BG_CONFIG.canvasId);
  if(!canvas){
    canvas = document.createElement('canvas');
    canvas.id = BG_CONFIG.canvasId;
    canvas.setAttribute('aria-hidden', 'true');
    // Inline style fallback for projects that don't include the CSS file
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = String(BG_CONFIG.zIndex);
    document.documentElement.prepend(canvas);
  }

  const ctx = canvas.getContext('2d', { alpha: true });

  // Device pixel ratio handling
  let DPR = Math.max(1, window.devicePixelRatio || 1);
  let w = innerWidth;
  let h = innerHeight;

  function resizeCanvas(){
    DPR = Math.max(1, window.devicePixelRatio || 1);
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resizeCanvas();

  // Particle (star) generation
  const STAR_COUNT = Math.floor(Math.max(BG_CONFIG.minStars, (w * h) / BG_CONFIG.densityFactor));
  const stars = [];
  const mouse = { x: w / 2, y: h / 2 };

  function rand(min, max){ return Math.random() * (max - min) + min; }

  function initStars(){
    stars.length = 0;
    const count = Math.floor(Math.max(BG_CONFIG.minStars, (w * h) / BG_CONFIG.densityFactor));
    for(let i = 0; i < count; i++){
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.8 + 0.2,
        vx: (Math.random() - 0.5) * BG_CONFIG.starSpeed,
        vy: (Math.random() - 0.5) * BG_CONFIG.starSpeed,
        // hue selection: lime, blue, purple accents
        hue: Math.random() > 0.85 ? 'lime' : (Math.random() > 0.6 ? 'blue' : 'purple')
      });
    }
  }
  initStars();

  // Map hue label to HSL color string (tweak saturation/lightness as desired)
  function hueToHsl(hue, alpha){
    if(hue === 'lime') return `hsla(60, 100%, 60%, ${alpha})`;
    if(hue === 'blue') return `hsla(200, 100%, 60%, ${alpha})`;
    return `hsla(260, 100%, 60%, ${alpha})`; // purple
  }

  // Animation loop
  let last = performance.now();
  function draw(now){
    const dt = Math.min(40, now - last);
    last = now;

    // Clear and draw subtle gradient background (gives depth)
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(10,12,18,0.6)');
    g.addColorStop(1, 'rgba(2,6,23,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Draw stars with glow
    for(const s of stars){
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // Wrap around edges
      if(s.x < -10) s.x = w + 10;
      if(s.x > w + 10) s.x = -10;
      if(s.y < -10) s.y = h + 10;
      if(s.y > h + 10) s.y = -10;

      // Parallax offset based on mouse
      const dx = (s.x - mouse.x) * 0.0006;
      const dy = (s.y - mouse.y) * 0.0006;

      // Glow radial gradient
      ctx.beginPath();
      const glow = ctx.createRadialGradient(s.x - dx, s.y - dy, 0, s.x - dx, s.y - dy, s.r * 6);
      glow.addColorStop(0, hueToHsl(s.hue, s.alpha * 0.9));
      glow.addColorStop(0.2, hueToHsl(s.hue, s.alpha * 0.35));
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.arc(s.x - dx, s.y - dy, s.r * 6, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
      ctx.arc(s.x - dx, s.y - dy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw subtle circuit-like connecting lines between nearby stars
    ctx.beginPath();
    for(let i = 0; i < stars.length; i++){
      for(let j = i + 1; j < stars.length; j++){
        const a = stars[i], b = stars[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < BG_CONFIG.maxConnectDistance){
          const alpha = BG_CONFIG.lineBaseAlpha * (1 - dist / BG_CONFIG.maxConnectDistance);
          ctx.strokeStyle = `rgba(14,165,255,${alpha})`; // tech-blue lines
          ctx.lineWidth = 0.6;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
      }
    }
    ctx.stroke();

    requestAnimationFrame(draw);
  }

  // Mouse parallax
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });

  // Resize handling (debounced)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeCanvas();
      initStars();
    }, 120);
  }, { passive: true });

  // Start animation
  requestAnimationFrame(draw);

  // Expose a small API for runtime tweaks (optional)
  window.__TechBg = {
    config: BG_CONFIG,
    regenerate: () => { initStars(); },
    stop: () => { /* not implemented: could cancel animation frame if needed */ }
  };
})();
