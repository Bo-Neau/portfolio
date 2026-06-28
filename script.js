/* ═══════════════════════════════════════════════════════
   LWIN MOE AUNG — Cinematic Portfolio JS
   ═══════════════════════════════════════════════════════ */

'use strict';

const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const rnd   = (min, max) => Math.random() * (max - min) + min;
const map   = (v, a1, a2, b1, b2) => b1 + (v - a1) * (b2 - b1) / (a2 - a1);


/* ════════════════════════════════════════════════
   1. LOADER
   ════════════════════════════════════════════════ */
(function loader() {
  const el = document.getElementById('loader');
  const fill = document.getElementById('loaderFill');
  const pct = document.getElementById('loaderPct');
  let p = 0;
  const tick = () => {
    p = Math.min(p + Math.random() * 6 + 1, 100);
    fill.style.transform = `scaleX(${p / 100})`;
    pct.textContent = Math.floor(p).toString().padStart(3, '0');
    if (p < 100) setTimeout(tick, 30 + Math.random() * 40);
    else setTimeout(() => {
      el.classList.add('is-done');
      document.body.classList.add('loaded');
      window.dispatchEvent(new Event('site-ready'));
    }, 350);
  };
  tick();
})();


/* ════════════════════════════════════════════════
   2. NATIVE SCROLL — no JS interception
   Browsers' native scroll is hardware-accelerated
   and genuinely instant. We only smooth anchor
   jumps via CSS scroll-behavior.
   ════════════════════════════════════════════════ */
const Scroller = {
  get current()   { return window.scrollY || window.pageYOffset || 0; },
  get target()    { return window.scrollY || window.pageYOffset || 0; },
  get viewportH() { return window.innerHeight; },
};

/* ────────────────────────────────────────────────
   Visibility tracker — pause expensive canvas
   draws when their canvas is off-screen so the
   main thread stays free for scrolling.
   ──────────────────────────────────────────────── */
const Visibility = (() => {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { e.target._inview = e.isIntersecting; });
  }, { rootMargin: '200px 0px' });
  return {
    track(el) { el._inview = true; obs.observe(el); },
    is(el) { return el._inview !== false; },
  };
})();


/* ════════════════════════════════════════════════
   3. CUSTOM CURSOR
   ════════════════════════════════════════════════ */
(function cursor() {
  const c = document.getElementById('cursor');
  if (!c || window.matchMedia('(max-width: 900px)').matches) return;

  let tx = 0, ty = 0, cx = 0, cy = 0;

  document.addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
  }, { passive: true });

  function tick() {
    cx = lerp(cx, tx, 0.2);
    cy = lerp(cy, ty, 0.2);
    c.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  document.querySelectorAll('a, button, .rail-card, .proj__chips span').forEach(el => {
    el.addEventListener('mouseenter', () => c.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => c.classList.remove('is-hover'));
  });
})();


/* ════════════════════════════════════════════════
   4. NAV TIME (live SGT clock)
   ════════════════════════════════════════════════ */
(function navTime() {
  const el = document.getElementById('navTime');
  if (!el) return;
  function update() {
    const d = new Date();
    const sgt = new Date(d.getTime() + (d.getTimezoneOffset() + 480) * 60000);
    const hh = sgt.getHours().toString().padStart(2, '0');
    const mm = sgt.getMinutes().toString().padStart(2, '0');
    el.textContent = `SGT ${hh}:${mm}`;
  }
  update();
  setInterval(update, 30000);
})();


/* ════════════════════════════════════════════════
   5. MOUSE-DRIVEN 3D CAMERA
   Any element with [data-camera] tilts based on mouse.
   ════════════════════════════════════════════════ */
(function cameras() {
  const cams = [...document.querySelectorAll('[data-camera]')];
  if (!cams.length) return;

  let mx = 0, my = 0, cx = 0, cy = 0;

  document.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth - 0.5);
    my = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  /* Cache layers per camera, tagged with visibility */
  cams.forEach(cam => {
    cam._layers = [...cam.querySelectorAll('[data-depth]')];
    Visibility.track(cam);
  });

  function tick() {
    cx = lerp(cx, mx, 0.05);
    cy = lerp(cy, my, 0.05);

    const rx = -cy * 6;
    const ry =  cx * 8;
    const tStr = `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`;

    cams.forEach(cam => {
      if (!Visibility.is(cam)) return;
      cam.style.transform = tStr;
      cam._layers.forEach(layer => {
        const depth = parseFloat(layer.dataset.depth) || 0;
        layer.style.transform = `translate3d(${(cx * depth * -1.2).toFixed(2)}px, ${(cy * depth * -1.2).toFixed(2)}px, 0)`;
      });
    });

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();


/* ════════════════════════════════════════════════
   6. SCROLL-DRIVEN PARALLAX — cached + visibility-gated
   Per-frame DOM queries and getBoundingClientRect
   were forcing layout on every scroll tick. Cache
   element refs and use offsetTop instead.
   ════════════════════════════════════════════════ */
(function scrollParallax() {
  const items = [...document.querySelectorAll('.proj__bg, .proj__shapes')].map(el => {
    const wrapper = el.closest('.proj');
    if (wrapper) Visibility.track(wrapper);
    return {
      el,
      wrapper,
      isShape: el.classList.contains('proj__shapes'),
    };
  });

  function tick() {
    const sy = window.scrollY;
    const vh = window.innerHeight;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.wrapper || !Visibility.is(it.wrapper)) continue;
      const wTop = it.wrapper.offsetTop;
      const wH   = it.wrapper.offsetHeight;
      const progress = clamp((sy - wTop) / (wH - vh), 0, 1);
      const speed = it.isShape ? -120 : 60;
      const scale = it.isShape ? 1 + progress * 0.05 : 1.05 + progress * 0.04;
      it.el.style.transform =
        `translate3d(0, ${(progress * speed).toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();


/* ════════════════════════════════════════════════
   7. HERO FLOW-FIELD CANVAS
   Curl-noise-style streaming particles giving a
   "video footage" feel without an actual video.
   ════════════════════════════════════════════════ */
(function heroCanvas() {
  const c = document.getElementById('flowCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');

  let W, H, particles, t = 0;
  Visibility.track(c);
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  function resize() {
    W = c.width  = c.offsetWidth  * DPR;
    H = c.height = c.offsetHeight * DPR;
  }

  function P() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      life: rnd(20, 220),
      age: 0,
      hue: Math.random() < 0.6 ? 18 : (Math.random() < 0.5 ? 200 : 14),
      sat: rnd(70, 95),
      lt:  rnd(50, 65),
      sp:  rnd(0.6, 1.6),
    };
  }

  function field(x, y) {
    /* Smoothly varying flow field */
    const s = 0.0018;
    const a = Math.sin(x * s + t * 0.12) + Math.cos(y * s * 0.85 - t * 0.1);
    return a * Math.PI;
  }

  function init() {
    resize();
    particles = Array.from({ length: 180 }, P);   /* was 280 */
  }

  function frame() {
    if (!Visibility.is(c)) { requestAnimationFrame(frame); return; }
    t += 0.4;
    /* Trail fade */
    ctx.fillStyle = 'rgba(8,8,11,0.06)';
    ctx.fillRect(0, 0, W, H);

    particles.forEach(p => {
      const ang = field(p.x, p.y);
      p.x += Math.cos(ang) * p.sp;
      p.y += Math.sin(ang) * p.sp;
      p.age++;
      const a = (1 - p.age / p.life) * 0.6;

      ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lt}%, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.fill();

      if (p.age > p.life || p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
        Object.assign(p, P());
      }
    });

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  init();
  frame();
})();


/* ════════════════════════════════════════════════
   8. MANIFESTO CANVAS — slow drifting gradient orbs
   ════════════════════════════════════════════════ */
(function manifestoCanvas() {
  const c = document.getElementById('manifestoCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');

  let W, H, orbs;
  Visibility.track(c);
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  function resize() {
    W = c.width  = c.offsetWidth  * DPR;
    H = c.height = c.offsetHeight * DPR;
  }

  function init() {
    resize();
    orbs = Array.from({ length: 5 }, () => ({
      x: rnd(0, W), y: rnd(0, H),
      r: rnd(W*0.15, W*0.3),
      vx: rnd(-0.3, 0.3), vy: rnd(-0.2, 0.2),
      hue: ['18','200','30','140','280'][Math.floor(Math.random()*5)],
    }));
  }

  function frame() {
    if (!Visibility.is(c)) { requestAnimationFrame(frame); return; }
    ctx.clearRect(0, 0, W, H);
    orbs.forEach(o => {
      o.x += o.vx; o.y += o.vy;
      if (o.x < -o.r) o.x = W + o.r;
      if (o.x > W + o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = H + o.r;
      if (o.y > H + o.r) o.y = -o.r;
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, `hsla(${o.hue}, 70%, 50%, 0.18)`);
      g.addColorStop(1, `hsla(${o.hue}, 70%, 50%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  init();
  frame();
})();


/* ════════════════════════════════════════════════
   9. GALAXY CANVAS — connected node constellation
   ════════════════════════════════════════════════ */
(function galaxyCanvas() {
  const c = document.getElementById('galaxyCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');

  let W, H, nodes;
  const COUNT = 50;     /* was 80 — fewer connections per frame */
  Visibility.track(c);
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  function resize() {
    W = c.width  = c.offsetWidth  * DPR;
    H = c.height = c.offsetHeight * DPR;
  }

  function init() {
    resize();
    nodes = Array.from({ length: COUNT }, () => ({
      x: rnd(0, W), y: rnd(0, H),
      vx: rnd(-0.2, 0.2), vy: rnd(-0.15, 0.15),
      r: rnd(0.6, 1.6),
    }));
  }

  function frame() {
    if (!Visibility.is(c)) { requestAnimationFrame(frame); return; }
    ctx.clearRect(0, 0, W, H);

    /* Connections */
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < 160) {
          ctx.strokeStyle = `rgba(244,240,230,${(1 - d/160) * 0.18})`;
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    /* Nodes */
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      ctx.fillStyle = Math.random() < 0.05 ? '#ff5722' : 'rgba(244,240,230,0.6)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  init();
  frame();
})();


/* ════════════════════════════════════════════════
   10. PROJECT DATA-VIZ CANVASES
   Each project background gets a live data-vis layer:
   viz1 → neural network / agentic flow
   viz2 → K-Means cluster scatter
   viz3 → animated bar + line chart
   viz4 → donut + factor segments
   ════════════════════════════════════════════════ */
function setupViz(id, draw) {
  const c = document.getElementById(id);
  if (!c) return;
  const ctx = c.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);  /* cap DPR for perf */
  let W, H, state = {};

  Visibility.track(c);

  function resize() {
    W = c.width  = c.offsetWidth * dpr;
    H = c.height = c.offsetHeight * dpr;
    state = draw.init(W, H);
  }
  function frame() {
    if (W && H && Visibility.is(c)) draw.tick(ctx, W, H, state);
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
}

/* ── viz1: AI agent network — 4 layers + token flow + status panel ── */
setupViz('viz1', {
  init(W, H) {
    const layers = [5, 8, 8, 4];
    const nodes = [];
    layers.forEach((count, li) => {
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: W * (0.13 + li * 0.22),
          y: H * (0.16 + (i + 0.5) / count * 0.68),
          li, i, pulse: rnd(0, Math.PI * 2),
          activation: rnd(0.3, 0.95),
        });
      }
    });
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (nodes[j].li === nodes[i].li + 1) {
          edges.push({ a: i, b: j, t: rnd(0, 1), sp: rnd(0.003, 0.009), w: rnd(0.2, 1) });
        }
      }
    }
    /* Floating tokens entering the network */
    const tokens = Array.from({length: 8}, () => ({
      x: rnd(-W*0.05, W*0.1),
      y: rnd(0, H),
      sp: rnd(0.4, 1.2),
      txt: ['Plan', 'Search', 'Recall', 'Reason', 'Act', 'Reflect', 'Tool', 'Memory'][Math.floor(Math.random()*8)],
    }));
    return { nodes, edges, tokens, t: 0 };
  },
  tick(ctx, W, H, s) {
    ctx.clearRect(0, 0, W, H);
    s.t += 0.02;

    /* Floating tokens drifting toward the network */
    ctx.font = `${Math.max(10, W*0.008)}px monospace`;
    ctx.textBaseline = 'middle';
    s.tokens.forEach(tk => {
      tk.x += tk.sp;
      if (tk.x > W*0.18) {
        tk.x = -W*0.05;
        tk.y = rnd(0, H);
      }
      const fade = clamp((W*0.18 - tk.x) / (W*0.18), 0, 1);
      ctx.fillStyle = `rgba(108, 213, 255, ${fade * 0.7})`;
      ctx.fillText(tk.txt, tk.x, tk.y);
    });

    /* Edges with weighted opacity */
    s.edges.forEach(e => {
      const a = s.nodes[e.a], b = s.nodes[e.b];
      ctx.strokeStyle = `rgba(255, 87, 34, ${0.05 + e.w * 0.18})`;
      ctx.lineWidth = e.w * 0.9;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      /* Pulse along edge */
      e.t += e.sp;
      if (e.t > 1) e.t = 0;
      const px = lerp(a.x, b.x, e.t);
      const py = lerp(a.y, b.y, e.t);
      const intensity = 1 - Math.abs(e.t - 0.5) * 2;
      ctx.fillStyle = `rgba(255, 87, 34, ${intensity})`;
      ctx.beginPath();
      ctx.arc(px, py, 2 + intensity * 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    /* Nodes — colored by layer */
    const layerColors = ['#6cd5ff', '#82d0a8', '#d4b27a', '#ff5722'];
    s.nodes.forEach(n => {
      n.pulse += 0.04;
      const r = 4 + Math.sin(n.pulse) * 1.5 + n.activation * 2;
      ctx.fillStyle = layerColors[n.li];
      ctx.shadowColor = layerColors[n.li];
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    /* Status panel — bottom-right */
    const px = W - W*0.22, py = H - H*0.20;
    const pw = W*0.18, ph = H*0.13;
    ctx.fillStyle = 'rgba(8,8,11,0.7)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(255,87,34,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = '#ff5722';
    ctx.font = `${Math.max(9, W*0.007)}px monospace`;
    const phase = ['REASONING', 'TOOL CALL', 'REFLECTING', 'PLANNING'][Math.floor(s.t * 0.4) % 4];
    ctx.fillText(`▸ ${phase}${'.'.repeat(Math.floor(s.t * 2) % 4)}`, px + 12, py + ph * 0.3);
    /* Progress bar */
    const prog = (s.t * 0.05) % 1;
    ctx.fillStyle = 'rgba(244,240,230,0.15)';
    ctx.fillRect(px + 12, py + ph * 0.6, pw - 24, 3);
    ctx.fillStyle = '#ff5722';
    ctx.fillRect(px + 12, py + ph * 0.6, (pw - 24) * prog, 3);
    ctx.fillStyle = 'rgba(244,240,230,0.5)';
    ctx.fillText(`${Math.floor(prog*100)}%   ctx 4096/4096`, px + 12, py + ph * 0.85);
  }
});

/* ── viz2: K-Means clusters + ROC curve + AUC + confusion matrix ── */
setupViz('viz2', {
  init(W, H) {
    const colors = ['#6cd5ff', '#ff5722', '#82d0a8', '#d4b27a', '#a78bfa', '#ff9e7a', '#7adfff', '#e8b67a'];
    /* Place clusters in left 60% of canvas; right reserved for ROC + matrix */
    const centers = colors.map((_, i) => ({
      x: W * (0.10 + (i % 4) * 0.13 + rnd(-0.02, 0.02)),
      y: H * (0.25 + Math.floor(i / 4) * 0.45 + rnd(-0.04, 0.04)),
      drift: rnd(0, Math.PI * 2),
    }));
    const points = [];
    centers.forEach((c, ci) => {
      for (let i = 0; i < 36; i++) {
        const ang = rnd(0, Math.PI * 2);
        const r = Math.pow(Math.random(), 0.5) * Math.min(W, H) * 0.07;
        points.push({
          ox: Math.cos(ang) * r,
          oy: Math.sin(ang) * r,
          ci, color: colors[ci],
          jitter: rnd(0, Math.PI * 2),
        });
      }
    });
    /* ROC curve points (pre-computed AUC ~0.93 shape) */
    const rocPts = [];
    for (let i = 0; i <= 40; i++) {
      const fpr = i / 40;
      const tpr = Math.min(1, 1 - Math.pow(1 - fpr, 0.18) + Math.random() * 0.02);
      rocPts.push({ x: fpr, y: tpr });
    }
    /* Confusion matrix 2x2 */
    const cm = [[0.91, 0.07], [0.05, 0.97]];
    return { centers, points, colors, rocPts, cm, t: 0, draw: 0 };
  },
  tick(ctx, W, H, s) {
    ctx.clearRect(0, 0, W, H);
    s.t += 0.012;
    s.draw = lerp(s.draw, 1, 0.02);

    /* === LEFT: cluster scatter === */
    s.centers.forEach(c => {
      c.drift += 0.005;
      c.cx = c.x + Math.cos(c.drift) * 8;
      c.cy = c.y + Math.sin(c.drift * 0.7) * 6;
    });
    /* Halos */
    s.centers.forEach((c, i) => {
      const R = Math.min(W, H) * 0.085;
      const g = ctx.createRadialGradient(c.cx, c.cy, 0, c.cx, c.cy, R);
      g.addColorStop(0, s.colors[i] + '33');
      g.addColorStop(1, s.colors[i] + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, R, 0, Math.PI * 2);
      ctx.fill();
    });
    /* Points */
    s.points.forEach(p => {
      const c = s.centers[p.ci];
      p.jitter += 0.02;
      const x = c.cx + p.ox + Math.cos(p.jitter) * 1.5;
      const y = c.cy + p.oy + Math.sin(p.jitter) * 1.5;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
    /* Cluster centers (pulse + label) */
    ctx.font = `${Math.max(9, W*0.006)}px monospace`;
    s.centers.forEach((c, i) => {
      ctx.strokeStyle = 'rgba(244,240,230,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, 3 + Math.sin(s.t * 4 + c.drift) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(244,240,230,0.6)';
      ctx.fillText(`C${i+1}`, c.cx + 6, c.cy - 6);
    });

    /* === TOP-RIGHT: ROC curve === */
    const rx = W * 0.66, ry = H * 0.10;
    const rw = W * 0.28, rh = H * 0.32;
    /* Frame */
    ctx.strokeStyle = 'rgba(244,240,230,0.18)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(rx, ry, rw, rh);
    /* Diagonal reference */
    ctx.strokeStyle = 'rgba(244,240,230,0.15)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(rx, ry + rh);
    ctx.lineTo(rx + rw, ry);
    ctx.stroke();
    ctx.setLineDash([]);
    /* ROC curve */
    ctx.strokeStyle = '#ff5722';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const drawN = Math.floor(s.rocPts.length * s.draw);
    s.rocPts.slice(0, drawN).forEach((p, i) => {
      const x = rx + p.x * rw;
      const y = ry + (1 - p.y) * rh;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    /* Fill under curve */
    ctx.fillStyle = 'rgba(255,87,34,0.12)';
    ctx.beginPath();
    ctx.moveTo(rx, ry + rh);
    s.rocPts.slice(0, drawN).forEach(p => {
      ctx.lineTo(rx + p.x * rw, ry + (1 - p.y) * rh);
    });
    ctx.lineTo(rx + rw, ry + rh);
    ctx.closePath();
    ctx.fill();
    /* Labels */
    ctx.fillStyle = 'rgba(244,240,230,0.7)';
    ctx.font = `${Math.max(10, W*0.0075)}px monospace`;
    ctx.fillText('ROC · AUC 0.93', rx, ry - 6);
    ctx.font = `${Math.max(8, W*0.0055)}px monospace`;
    ctx.fillStyle = 'rgba(244,240,230,0.4)';
    ctx.fillText('FPR →', rx + rw - 30, ry + rh + 12);

    /* === BOTTOM-RIGHT: confusion matrix 2x2 === */
    const mx = W * 0.66, my = H * 0.55;
    const mw = W * 0.18, mh = mw * 0.6;
    const cell = mw / 2;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const v = s.cm[i][j];
        const isDiag = i === j;
        ctx.fillStyle = isDiag ? `rgba(130, 208, 168, ${v * 0.7})` : `rgba(255, 87, 34, ${v * 0.5})`;
        ctx.fillRect(mx + j * cell, my + i * cell, cell - 2, cell - 2);
        ctx.fillStyle = 'rgba(244,240,230,0.95)';
        ctx.font = `${Math.max(10, W*0.007)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(v.toFixed(2), mx + j * cell + cell/2, my + i * cell + cell/2 + 4);
      }
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(244,240,230,0.7)';
    ctx.fillText('Confusion Matrix', mx, my - 6);

    /* Floating metric labels */
    ctx.fillStyle = 'rgba(244,240,230,0.55)';
    ctx.font = `${Math.max(10, W*0.0075)}px monospace`;
    ctx.fillText(`silhouette ${(0.891).toFixed(3)}`, W*0.04, H*0.93);
    ctx.fillText(`k=8 · n=607,056`, W*0.22, H*0.93);
  }
});

/* ── viz3: Tableau-style multi-panel dashboard ── */
setupViz('viz3', {
  init(W, H) {
    const labels = ['NA', 'EMEA', 'APAC', 'LATAM', 'AFR', 'OCE', 'CIS'];
    const targets = [0.55, 0.70, 0.95, 0.40, 0.30, 0.50, 0.45];
    const dollars = ['$2.1M', '$2.6M', '$3.6M', '$1.5M', '$1.1M', '$1.9M', '$1.7M'];
    const bars = labels.map((l, i) => ({
      label: l, target: targets[i], val: 0, dollar: dollars[i],
    }));
    /* Time-series for line chart */
    const months = 24;
    const series = Array.from({length: months}, (_, i) =>
      0.45 + Math.sin(i * 0.4) * 0.15 + Math.sin(i * 0.13) * 0.1 + i * 0.012
    );
    /* Pie segments for category split */
    const pie = [
      { val: 0.35, color: '#d4b27a', label: 'Tech' },
      { val: 0.25, color: '#6cd5ff', label: 'Furniture' },
      { val: 0.22, color: '#82d0a8', label: 'Office' },
      { val: 0.18, color: '#ff5722', label: 'Tables' },
    ];
    return { bars, series, pie, t: 0, draw: 0 };
  },
  tick(ctx, W, H, s) {
    ctx.clearRect(0, 0, W, H);
    s.t += 0.012;
    s.draw = lerp(s.draw, 1, 0.025);

    /* === LEFT PANEL: bar chart === */
    const baseY = H * 0.72;
    const barW = W * 0.05;
    const gap  = W * 0.018;
    const totalW = s.bars.length * barW + (s.bars.length - 1) * gap;
    const startX = W * 0.08;
    const maxBarH = H * 0.45;

    /* Y-axis grid + labels */
    ctx.strokeStyle = 'rgba(244,240,230,0.07)';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = 'rgba(244,240,230,0.4)';
    ctx.font = `${Math.max(8, W*0.0055)}px monospace`;
    for (let i = 0; i <= 4; i++) {
      const y = baseY - (maxBarH * i / 4);
      ctx.beginPath();
      ctx.moveTo(startX - 30, y);
      ctx.lineTo(startX + totalW + 12, y);
      ctx.stroke();
      ctx.fillText(`$${(i * 0.9).toFixed(1)}M`, startX - 30, y - 2);
    }

    /* Bars */
    s.bars.forEach((b, i) => {
      b.val = lerp(b.val, b.target * s.draw, 0.05);
      const x = startX + i * (barW + gap);
      const h = maxBarH * b.val * (0.97 + Math.sin(s.t + i*0.4) * 0.025);
      const g = ctx.createLinearGradient(0, baseY - h, 0, baseY);
      g.addColorStop(0, '#d4b27a');
      g.addColorStop(1, 'rgba(212, 178, 122, 0.1)');
      ctx.fillStyle = g;
      ctx.fillRect(x, baseY - h, barW, h);
      /* Top accent */
      ctx.fillStyle = '#ff5722';
      ctx.fillRect(x, baseY - h - 1.5, barW, 2);
      /* Label */
      ctx.fillStyle = 'rgba(244,240,230,0.5)';
      ctx.font = `${Math.max(8, W*0.0055)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(b.label, x + barW/2, baseY + 14);
      /* Dollar value above */
      if (b.val > 0.15) {
        ctx.fillStyle = '#d4b27a';
        ctx.fillText(b.dollar, x + barW/2, baseY - h - 8);
      }
    });
    ctx.textAlign = 'left';

    /* Title */
    ctx.fillStyle = 'rgba(244,240,230,0.7)';
    ctx.font = `${Math.max(10, W*0.0075)}px monospace`;
    ctx.fillText('Sales by Region · 2019—2022', startX - 30, H * 0.16);

    /* Baseline */
    ctx.strokeStyle = 'rgba(244,240,230,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX - 30, baseY);
    ctx.lineTo(startX + totalW + 12, baseY);
    ctx.stroke();

    /* === TOP-RIGHT PANEL: line chart === */
    const lx = W * 0.66, ly = H * 0.10;
    const lw = W * 0.27, lh = H * 0.24;
    /* Frame */
    ctx.strokeStyle = 'rgba(244,240,230,0.18)';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(lx, ly, lw, lh);
    /* Grid */
    ctx.strokeStyle = 'rgba(244,240,230,0.06)';
    for (let i = 1; i < 4; i++) {
      const y = ly + (lh / 4) * i;
      ctx.beginPath();
      ctx.moveTo(lx, y);
      ctx.lineTo(lx + lw, y);
      ctx.stroke();
    }
    /* Line */
    const drawN = Math.floor(s.series.length * s.draw);
    ctx.strokeStyle = '#6cd5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    s.series.slice(0, drawN).forEach((v, i) => {
      const x = lx + (i / (s.series.length - 1)) * lw;
      const y = ly + (1 - v) * lh;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    /* Area fill */
    ctx.fillStyle = 'rgba(108,213,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(lx, ly + lh);
    s.series.slice(0, drawN).forEach((v, i) => {
      const x = lx + (i / (s.series.length - 1)) * lw;
      const y = ly + (1 - v) * lh;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(lx + ((drawN - 1) / (s.series.length - 1)) * lw, ly + lh);
    ctx.closePath();
    ctx.fill();
    /* Live cursor */
    if (drawN > 0) {
      const last = s.series[Math.min(drawN - 1, s.series.length - 1)];
      const x = lx + ((drawN - 1) / (s.series.length - 1)) * lw;
      const y = ly + (1 - last) * lh;
      ctx.fillStyle = '#ff5722';
      ctx.beginPath();
      ctx.arc(x, y, 3 + Math.sin(s.t * 4) * 1, 0, Math.PI * 2);
      ctx.fill();
    }
    /* Title */
    ctx.fillStyle = 'rgba(244,240,230,0.7)';
    ctx.font = `${Math.max(9, W*0.0065)}px monospace`;
    ctx.fillText('Monthly Trend', lx, ly - 6);

    /* === BOTTOM-RIGHT PANEL: pie chart === */
    const px = W * 0.78, py = H * 0.54;
    const pr = Math.min(W, H) * 0.10;
    let start = -Math.PI / 2;
    s.pie.forEach(seg => {
      const sweep = seg.val * Math.PI * 2 * s.draw;
      ctx.fillStyle = seg.color + 'd0';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, pr, start, start + sweep);
      ctx.closePath();
      ctx.fill();
      start += sweep;
    });
    /* Cutout for donut feel */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(px, py, pr * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    /* Pie title */
    ctx.fillStyle = 'rgba(244,240,230,0.7)';
    ctx.font = `${Math.max(9, W*0.0065)}px monospace`;
    ctx.fillText('Category Mix', px - pr, py - pr - 12);
    /* Legend */
    ctx.font = `${Math.max(8, W*0.0055)}px monospace`;
    s.pie.forEach((seg, i) => {
      const lyy = py + pr + 16 + i * 12;
      ctx.fillStyle = seg.color;
      ctx.fillRect(px - pr, lyy - 4, 6, 6);
      ctx.fillStyle = 'rgba(244,240,230,0.6)';
      ctx.fillText(`${seg.label}  ${Math.round(seg.val * 100)}%`, px - pr + 12, lyy + 1);
    });

    /* KPI floating */
    ctx.fillStyle = 'rgba(244,240,230,0.55)';
    ctx.font = `${Math.max(10, W*0.0075)}px monospace`;
    ctx.fillText('TOTAL  $12.6M  ·  7 regions  ·  17 categories', W * 0.08, H * 0.93);
  }
});

/* ── viz4: Statistical research — donut + scree + factor loadings ── */
setupViz('viz4', {
  init(W, H) {
    const segments = [
      { val: 0.42, color: '#82d0a8', label: 'Consumer' },
      { val: 0.31, color: '#6cd5ff', label: 'Corporate' },
      { val: 0.27, color: '#ff5722', label: 'Home Office' },
    ];
    /* Eigenvalues for scree plot */
    const eigen = [3.42, 2.18, 1.65, 1.12, 0.78, 0.54, 0.41, 0.29, 0.22, 0.18];
    /* Factor loadings (5 factors × 6 variables) */
    const loadings = Array.from({length: 5}, () =>
      Array.from({length: 6}, () => Math.random() * 0.85 + 0.05)
    );
    return { segments, eigen, loadings, draw: 0, t: 0 };
  },
  tick(ctx, W, H, s) {
    ctx.clearRect(0, 0, W, H);
    s.draw = lerp(s.draw, 1, 0.022);
    s.t += 0.01;

    /* === LEFT: donut chart === */
    const cx = W * 0.30;
    const cy = H * 0.45;
    const R = Math.min(W, H) * 0.22;
    const r = R * 0.6;

    /* Outer glow */
    const glow = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.6);
    glow.addColorStop(0, 'rgba(130, 208, 168, 0.10)');
    glow.addColorStop(1, 'rgba(130, 208, 168, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.6, 0, Math.PI * 2);
    ctx.fill();

    /* Donut segments */
    let start = -Math.PI / 2;
    s.segments.forEach(seg => {
      const sweep = seg.val * Math.PI * 2 * s.draw;
      ctx.fillStyle = seg.color + 'cc';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, start, start + sweep);
      ctx.closePath();
      ctx.fill();
      start += sweep;
    });
    /* Cutout */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    /* Center pulse */
    ctx.strokeStyle = 'rgba(244,240,230,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r + Math.sin(s.t * 3) * 4, 0, Math.PI * 2);
    ctx.stroke();

    /* Concentric stat rings */
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(244,240,230,${0.06 - i * 0.015})`;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (1.15 + i * 0.12), 0, Math.PI * 2);
      ctx.stroke();
    }

    /* Segment labels */
    let a = -Math.PI / 2;
    ctx.font = `${Math.max(9, W*0.006)}px monospace`;
    s.segments.forEach(seg => {
      const sweep = seg.val * Math.PI * 2 * s.draw;
      const mid = a + sweep / 2;
      const lx = cx + Math.cos(mid) * (R + 22);
      const ly = cy + Math.sin(mid) * (R + 22);
      ctx.fillStyle = seg.color;
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(244,240,230,0.6)';
      ctx.fillText(`${seg.label} ${Math.round(seg.val * 100)}%`, lx + 8, ly + 3);
      a += sweep;
    });
    /* Donut title */
    ctx.fillStyle = 'rgba(244,240,230,0.7)';
    ctx.font = `${Math.max(10, W*0.0075)}px monospace`;
    ctx.fillText('Segment Distribution · n=5,123', cx - R, cy - R - 16);

    /* === TOP-RIGHT: scree plot === */
    const sx = W * 0.58, sy = H * 0.10;
    const sw = W * 0.34, sh = H * 0.30;
    /* Frame */
    ctx.strokeStyle = 'rgba(244,240,230,0.18)';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(sx, sy, sw, sh);
    /* Bars */
    const barW = sw / s.eigen.length * 0.7;
    const barGap = sw / s.eigen.length * 0.3;
    const maxE = Math.max(...s.eigen);
    s.eigen.forEach((v, i) => {
      const dv = v * s.draw;
      const x = sx + i * (barW + barGap) + barGap / 2;
      const h = (dv / maxE) * sh * 0.85;
      const isAbove1 = v >= 1;
      ctx.fillStyle = isAbove1 ? 'rgba(108, 213, 255, 0.85)' : 'rgba(244,240,230,0.25)';
      ctx.fillRect(x, sy + sh - h, barW, h);
      /* Eigenvalue label */
      ctx.fillStyle = 'rgba(244,240,230,0.55)';
      ctx.font = `${Math.max(7, W*0.005)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(v.toFixed(1), x + barW/2, sy + sh - h - 4);
    });
    /* Kaiser line at eigenvalue=1 */
    const kaiserY = sy + sh - (1 / maxE) * sh * 0.85;
    ctx.strokeStyle = '#ff5722';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, kaiserY);
    ctx.lineTo(sx + sw, kaiserY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff5722';
    ctx.font = `${Math.max(8, W*0.0055)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('Kaiser λ=1', sx + 4, kaiserY - 4);
    /* Title */
    ctx.fillStyle = 'rgba(244,240,230,0.7)';
    ctx.font = `${Math.max(9, W*0.0065)}px monospace`;
    ctx.fillText('Scree Plot · PCA Eigenvalues', sx, sy - 6);

    /* === BOTTOM-RIGHT: factor loading heatmap === */
    const fx = W * 0.58, fy = H * 0.50;
    const fw = W * 0.34, fh = H * 0.32;
    const cellW = fw / s.loadings[0].length;
    const cellH = fh / s.loadings.length;
    s.loadings.forEach((row, ri) => {
      row.forEach((v, ci) => {
        const dv = v * s.draw;
        const isStrong = dv > 0.5;
        const color = isStrong ?
          `rgba(255, 87, 34, ${dv})` :
          `rgba(108, 213, 255, ${dv * 0.6})`;
        ctx.fillStyle = color;
        ctx.fillRect(fx + ci * cellW + 1, fy + ri * cellH + 1, cellW - 2, cellH - 2);
        if (dv > 0.5) {
          ctx.fillStyle = 'rgba(244,240,230,0.95)';
          ctx.font = `${Math.max(7, W*0.005)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(dv.toFixed(2), fx + ci * cellW + cellW/2, fy + ri * cellH + cellH/2 + 3);
        }
      });
    });
    /* Heatmap labels */
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(244,240,230,0.7)';
    ctx.font = `${Math.max(9, W*0.0065)}px monospace`;
    ctx.fillText('Factor Loadings · Varimax', fx, fy - 6);
    ctx.font = `${Math.max(7, W*0.005)}px monospace`;
    ctx.fillStyle = 'rgba(244,240,230,0.45)';
    ['F1','F2','F3','F4','F5'].forEach((l, i) => {
      ctx.fillText(l, fx - 14, fy + i * cellH + cellH/2 + 3);
    });
    ['V1','V2','V3','V4','V5','V6'].forEach((l, i) => {
      ctx.textAlign = 'center';
      ctx.fillText(l, fx + i * cellW + cellW/2, fy + fh + 12);
    });

    /* Floating stat labels */
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(244,240,230,0.55)';
    ctx.font = `${Math.max(10, W*0.0075)}px monospace`;
    ctx.fillText('p < 0.001  ·  95% CI  ·  χ² test', W * 0.06, H * 0.92);
  }
});

/* ── viz5: Churn — SHAP feature bars + ROC curve climbing to AUC 0.86 ── */
setupViz('viz5', {
  init(W, H) {
    /* SHAP global importance (ordered) — Contract & Dependents lead */
    const features = [
      { label: 'Contract',        val: 1.00 },
      { label: 'Dependents',      val: 0.82 },
      { label: 'Tenure',          val: 0.71 },
      { label: 'MonthlyCharges',  val: 0.58 },
      { label: 'InternetService', val: 0.46 },
      { label: 'TechSupport',     val: 0.34 },
      { label: 'PaymentMethod',   val: 0.25 },
    ];
    /* ROC points approaching AUC ≈ 0.86 (concave curve above diagonal) */
    const roc = [];
    for (let i = 0; i <= 40; i++) {
      const fpr = i / 40;
      const tpr = Math.pow(fpr, 0.34);   /* concave → high AUC */
      roc.push({ fpr, tpr });
    }
    return { features, roc, draw: 0, t: 0 };
  },
  tick(ctx, W, H, s) {
    ctx.clearRect(0, 0, W, H);
    s.draw = lerp(s.draw, 1, 0.02);
    s.t += 0.02;

    /* === LEFT: SHAP horizontal feature-importance bars === */
    const bx = W * 0.07, by = H * 0.20;
    const bw = W * 0.34, rowH = H * 0.085, gap = rowH * 0.42;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(244,240,230,0.7)';
    ctx.font = `${Math.max(9, W*0.0065)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('SHAP · mean |impact|', bx, by - H*0.05);
    s.features.forEach((f, i) => {
      const y = by + i * (rowH + gap);
      const len = bw * f.val * s.draw;
      const strong = i < 2;
      const grad = ctx.createLinearGradient(bx, 0, bx + len, 0);
      grad.addColorStop(0, strong ? 'rgba(255,87,34,0.95)' : 'rgba(108,213,255,0.7)');
      grad.addColorStop(1, strong ? 'rgba(225,60,90,0.6)'  : 'rgba(108,213,255,0.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(bx, y, len, rowH);
      /* label */
      ctx.fillStyle = 'rgba(244,240,230,0.78)';
      ctx.font = `${Math.max(8, W*0.0058)}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(f.label, bx + 6, y + rowH / 2);
      /* #2 highlight tag on Dependents */
      if (i === 1) {
        ctx.fillStyle = '#ff5722';
        ctx.textAlign = 'left';
        ctx.fillText('◂ #2 hidden signal', bx + len + 8, y + rowH / 2);
      }
    });

    /* === RIGHT: ROC curve === */
    const rx = W * 0.58, ry = H * 0.22;
    const rw = W * 0.32, rh = H * 0.50;
    /* axes box */
    ctx.strokeStyle = 'rgba(244,240,230,0.18)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(rx, ry, rw, rh);
    /* diagonal baseline */
    ctx.strokeStyle = 'rgba(244,240,230,0.25)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(rx, ry + rh);
    ctx.lineTo(rx + rw, ry);
    ctx.stroke();
    ctx.setLineDash([]);
    /* the curve (progressive draw) */
    const n = Math.floor(s.roc.length * s.draw);
    ctx.beginPath();
    ctx.moveTo(rx, ry + rh);
    for (let i = 0; i <= n; i++) {
      const p = s.roc[i];
      if (!p) break;
      ctx.lineTo(rx + p.fpr * rw, ry + rh - p.tpr * rh);
    }
    ctx.strokeStyle = '#ff5722';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff5722';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
    /* fill under curve */
    ctx.lineTo(rx + (s.roc[n] ? s.roc[n].fpr : 0) * rw, ry + rh);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,87,34,0.10)';
    ctx.fill();
    /* AUC readout */
    ctx.fillStyle = '#ff5722';
    ctx.font = `${Math.max(13, W*0.013)}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`AUC ${(0.86 * s.draw).toFixed(2)}`, rx + rw - 8, ry + rh - 14);
    ctx.fillStyle = 'rgba(244,240,230,0.5)';
    ctx.font = `${Math.max(8, W*0.0055)}px monospace`;
    ctx.fillText('ROC · holdout', rx + rw - 8, ry + rh - 30);
    /* axis labels */
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(244,240,230,0.45)';
    ctx.fillText('FPR →', rx, ry + rh + 14);

    /* Floating stat — revenue at risk */
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(244,240,230,0.55)';
    ctx.font = `${Math.max(10, W*0.0075)}px monospace`;
    ctx.fillText('7,043 customers  ·  M2M×Fiber 54.6% churn  ·  $1.6M ARR at risk', W * 0.07, H * 0.92);
  }
});

/* ── viz6: Production pipeline — Airflow DAG + Spark partitions + Docker run ── */
setupViz('viz6', {
  init(W, H) {
    /* Airflow DAG: 6 stages laid left→right, each a task node */
    const stages = ['Ingest', 'Clean', 'Feature', 'Train', 'Score', 'Deploy'];
    const nodes = stages.map((label, i) => ({
      label,
      x: W * (0.10 + i * 0.155),
      y: H * 0.34,
      i,
    }));
    /* Sequential edges + one branch (parallel feature path) */
    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) edges.push({ a: i, b: i + 1 });
    /* Spark partition lanes underneath — packets streaming through */
    const lanes = Array.from({ length: 5 }, (_, r) => ({
      y: H * (0.62 + r * 0.065),
      packets: Array.from({ length: 4 }, () => ({ x: rnd(0, W), sp: rnd(0.8, 2.0) })),
    }));
    return { nodes, edges, lanes, t: 0, active: 0, pulse: 0 };
  },
  tick(ctx, W, H, s) {
    ctx.clearRect(0, 0, W, H);
    s.t += 0.02;
    s.pulse += 0.04;
    /* advance the "currently running" task every ~50 frames */
    s.active = Math.floor(s.t * 0.6) % s.nodes.length;

    /* === Airflow DAG === */
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    /* edges */
    s.edges.forEach(e => {
      const a = s.nodes[e.a], b = s.nodes[e.b];
      const done = e.b <= s.active;
      ctx.strokeStyle = done ? 'rgba(130, 208, 168, 0.55)' : 'rgba(244,240,230,0.15)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(a.x + W * 0.035, a.y);
      ctx.lineTo(b.x - W * 0.035, b.y);
      ctx.stroke();
      /* flow packet on the edge into the active node */
      if (e.b === s.active) {
        const tt = (s.t * 0.5) % 1;
        const px = lerp(a.x + W * 0.035, b.x - W * 0.035, tt);
        ctx.fillStyle = '#6cd5ff';
        ctx.beginPath();
        ctx.arc(px, a.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    /* nodes */
    s.nodes.forEach(n => {
      const done = n.i < s.active;
      const running = n.i === s.active;
      const rw = W * 0.07, rh = H * 0.085;
      ctx.lineWidth = 1.4;
      if (running) {
        const a = 0.5 + Math.sin(s.pulse) * 0.3;
        ctx.fillStyle = `rgba(255, 87, 34, ${0.18 + a * 0.2})`;
        ctx.strokeStyle = '#ff5722';
        ctx.shadowColor = '#ff5722';
        ctx.shadowBlur = 16;
      } else if (done) {
        ctx.fillStyle = 'rgba(130, 208, 168, 0.14)';
        ctx.strokeStyle = 'rgba(130, 208, 168, 0.7)';
      } else {
        ctx.fillStyle = 'rgba(8,8,11,0.5)';
        ctx.strokeStyle = 'rgba(244,240,230,0.25)';
      }
      ctx.beginPath();
      ctx.rect(n.x - rw / 2, n.y - rh / 2, rw, rh);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      /* label */
      ctx.fillStyle = running ? '#ff5722' : (done ? 'rgba(130,208,168,0.9)' : 'rgba(244,240,230,0.5)');
      ctx.font = `${Math.max(8, W * 0.0058)}px monospace`;
      ctx.fillText(n.label, n.x, n.y);
      /* green check on done */
      if (done) {
        ctx.fillStyle = 'rgba(130,208,168,0.9)';
        ctx.fillText('✓', n.x + rw / 2 - 6, n.y - rh / 2 + 6);
      }
    });
    /* DAG title */
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(244,240,230,0.7)';
    ctx.font = `${Math.max(9, W * 0.0065)}px monospace`;
    ctx.fillText('Airflow DAG · propensity_pipeline', W * 0.07, H * 0.18);

    /* === Spark partition lanes === */
    ctx.fillStyle = 'rgba(244,240,230,0.5)';
    ctx.font = `${Math.max(8, W * 0.0055)}px monospace`;
    ctx.fillText('PySpark · distributed partitions', W * 0.07, H * 0.54);
    s.lanes.forEach((lane, r) => {
      ctx.strokeStyle = 'rgba(108, 213, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W * 0.07, lane.y);
      ctx.lineTo(W * 0.62, lane.y);
      ctx.stroke();
      lane.packets.forEach(p => {
        p.x += p.sp;
        if (p.x > W * 0.62) p.x = W * 0.07;
        const fade = clamp((W * 0.62 - p.x) / (W * 0.2), 0.2, 1);
        ctx.fillStyle = `rgba(108, 213, 255, ${fade})`;
        ctx.fillRect(p.x, lane.y - 2, W * 0.02, 4);
      });
    });

    /* === Docker panel (bottom-right) — container status === */
    const px = W * 0.68, py = H * 0.58, pw = W * 0.26, ph = H * 0.30;
    ctx.fillStyle = 'rgba(8,8,11,0.7)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(70, 130, 180, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = 'rgba(108, 213, 255, 0.9)';
    ctx.font = `${Math.max(9, W * 0.0065)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('🐳 docker compose', px + 12, py + ph * 0.16);
    const services = ['spark-master', 'spark-worker', 'airflow-web', 'scheduler'];
    services.forEach((svc, i) => {
      const y = py + ph * (0.36 + i * 0.16);
      const up = ((Math.floor(s.t) + i) % 8) !== 0;  /* occasional flicker */
      ctx.fillStyle = up ? 'rgba(130,208,168,0.9)' : 'rgba(255,158,122,0.9)';
      ctx.beginPath();
      ctx.arc(px + 16, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(244,240,230,0.7)';
      ctx.font = `${Math.max(8, W * 0.0052)}px monospace`;
      ctx.fillText(svc, px + 28, y);
      ctx.fillStyle = up ? 'rgba(130,208,168,0.7)' : 'rgba(255,158,122,0.7)';
      ctx.textAlign = 'right';
      ctx.fillText(up ? 'Up' : '…', px + pw - 12, y);
      ctx.textAlign = 'left';
    });
  }
});


/* ════════════════════════════════════════════════
   11. CONTACT CANVAS — single radial pulse
   ════════════════════════════════════════════════ */
(function contactCanvas() {
  const c = document.getElementById('contactCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, t = 0;
  Visibility.track(c);
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  function resize() {
    W = c.width  = c.offsetWidth  * DPR;
    H = c.height = c.offsetHeight * DPR;
  }
  resize();
  window.addEventListener('resize', resize);

  function frame() {
    if (!Visibility.is(c)) { requestAnimationFrame(frame); return; }
    t += 0.005;
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.5, cy = H * 0.5;
    for (let i = 0; i < 6; i++) {
      const r = ((t + i * 0.15) % 1) * Math.max(W, H) * 0.7;
      const a = (1 - (t + i * 0.15) % 1) * 0.25;
      ctx.strokeStyle = `rgba(255, 87, 34, ${a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    requestAnimationFrame(frame);
  }
  frame();
})();


/* ════════════════════════════════════════════════
   11. SPLIT TEXT — char-by-char and word-by-word reveal
   ════════════════════════════════════════════════ */
(function splitText() {
  /* Wrap each char in [data-split] elements */
  document.querySelectorAll('[data-split]').forEach(el => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.dataset.char = '';
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.transitionDelay = `${i * 0.022}s`;
      el.appendChild(span);
    });
  });

  /* Wrap each word's content in inner span for slide reveal */
  document.querySelectorAll('[data-word]').forEach(el => {
    const txt = el.textContent;
    el.textContent = '';
    const inner = document.createElement('span');
    inner.textContent = txt;
    inner.style.cssText = 'display:inline-block; transform:translateY(110%); transition:transform 1.1s cubic-bezier(0.16,1,0.3,1);';
    el.appendChild(inner);
    el.dataset.wordInner = '';
  });
})();


/* ════════════════════════════════════════════════
   12. INTERSECTION REVEALS
   ════════════════════════════════════════════════ */
(function reveals() {
  /* Char + manifesto line reveals */
  const charObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      e.target.querySelectorAll('.char').forEach(c => c.classList.add('is-in'));
      charObs.unobserve(e.target);
    });
  }, { threshold: 0.35 });

  document.querySelectorAll('.manifesto__line, [data-split]').forEach(el => charObs.observe(el));

  /* Word slide reveals */
  const wordObs = new IntersectionObserver((entries) => {
    entries.forEach((e, idx) => {
      if (!e.isIntersecting) return;
      const inner = e.target.querySelector('[data-word-inner], span');
      if (inner) {
        const peers = [...e.target.parentElement.querySelectorAll('[data-word]')];
        const i = peers.indexOf(e.target);
        inner.style.transitionDelay = `${i * 0.12}s`;
        inner.style.transform = 'translateY(0)';
      }
      wordObs.unobserve(e.target);
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('[data-word]').forEach(el => wordObs.observe(el));

  /* On site-ready, trigger hero immediately */
  window.addEventListener('site-ready', () => {
    document.querySelectorAll('.hero [data-word] span').forEach((s, i) => {
      setTimeout(() => { s.style.transform = 'translateY(0)'; }, 120 + i * 140);
    });
    document.querySelectorAll('.hero .char').forEach(c => c.classList.add('is-in'));
  });
})();


/* ════════════════════════════════════════════════
   13. STATS MARQUEE
   ════════════════════════════════════════════════ */
(function marquee() {
  const m = document.querySelector('.stats__marquee');
  if (!m) return;
  let x = 0;
  function tick() {
    x -= 0.6;
    const row = m.querySelector('.stats__row');
    const w = row ? row.offsetWidth : 0;
    if (-x > w) x = 0;
    m.style.transform = `translate3d(${x}px, 0, 0)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();


/* ════════════════════════════════════════════════
   14. SMOOTH ANCHORS
   ════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    const r = t.getBoundingClientRect();
    const y = window.scrollY + r.top;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });
});
