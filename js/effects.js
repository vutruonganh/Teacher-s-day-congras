/* =========================================================
   Hiệu ứng hạt — bụi phấn, bụi nắng, cánh hoa, đom đóm
   ========================================================= */
(function () {
  'use strict';

  var canvas = document.getElementById('particles');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, DPR = 1;
  var parts = [];
  var running = false;
  var raf = null;
  var last = 0;
  var acc = 0;
  var MAX = 110;

  var scene = 1;
  var cfg = null;

  var CONFIG = {
    1: { kind: 'dust', rate: 7, colors: ['#f1eee2', '#e9b96e'], alpha: 0.42, drift: 1 },
    2: { kind: 'dust', rate: 4, colors: ['#9aa79a', '#b4452f'], alpha: 0.3, drift: 1 },
    3: { kind: 'mote', rate: 8, colors: ['#e9b96e', '#fff3d6'], alpha: 0.5, drift: 0.5 },
    4: { kind: 'dust', rate: 3, colors: ['#f4d9a6', '#e9b96e'], alpha: 0.35, drift: 1 },
    5: { kind: 'dust', rate: 3, colors: ['#e9b96e', '#f4d9a6'], alpha: 0.35, drift: 1 },
    6: { kind: 'mixed', rate: 5, colors: ['#f4d9a6', '#e9b96e', '#d98b8b'], alpha: 0.55, drift: 1 }
  };

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function push(p) {
    if (parts.length >= MAX) parts.shift();
    parts.push(p);
  }

  function spawn(kind) {
    var c = cfg || CONFIG[1];
    var color = pick(c.colors);

    if (kind === 'dust') {
      push({
        kind: 'dot',
        x: rnd(0, W), y: rnd(0, H),
        vx: rnd(-5, 5) * c.drift, vy: rnd(-11, -3) * c.drift,
        size: rnd(0.9, 2.2), rot: 0, vr: 0,
        color: color, alpha: c.alpha * rnd(0.45, 1),
        life: rnd(6, 12), max: 12,
        ph: rnd(0, 6.28), sway: rnd(3, 12)
      });
      return;
    }

    if (kind === 'mote') {
      push({
        kind: 'glow',
        x: rnd(0, W), y: rnd(H * 0.25, H * 1.05),
        vx: rnd(-4, 4), vy: rnd(-10, -3),
        size: rnd(1.2, 3.2), rot: 0, vr: 0,
        color: color, alpha: c.alpha * rnd(0.4, 1),
        life: rnd(7, 14), max: 14,
        ph: rnd(0, 6.28), sway: rnd(4, 14)
      });
      return;
    }

    if (kind === 'petal') {
      push({
        kind: 'petal',
        x: rnd(-20, W + 20), y: rnd(-60, -10),
        vx: rnd(-14, 14), vy: rnd(14, 30),
        size: rnd(4, 9), rot: rnd(0, 6.28), vr: rnd(-1.1, 1.1),
        color: color, alpha: rnd(0.5, 0.9),
        life: 16, max: 16,
        ph: rnd(0, 6.28), sway: rnd(8, 22)
      });
      return;
    }

    if (kind === 'firefly') {
      push({
        kind: 'firefly',
        x: rnd(0, W), y: rnd(H * 0.3, H * 0.95),
        vx: rnd(-6, 6), vy: rnd(-8, 2),
        size: rnd(1.6, 3.4), rot: 0, vr: 0,
        color: color, alpha: 0.9,
        life: rnd(9, 16), max: 16,
        ph: rnd(0, 6.28), sway: rnd(6, 18)
      });
      return;
    }

    if (kind === 'spark') {
      var a = rnd(0, 6.2832);
      var sp = rnd(40, 190);
      push({
        kind: 'spark',
        x: W / 2, y: H / 2,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: rnd(1.4, 3.2), rot: 0, vr: 0,
        color: pick(['#e9b96e', '#d98b8b', '#f4d9a6', '#fff6e4']),
        alpha: 1, life: rnd(0.8, 1.5), max: 1.5,
        ph: 0, sway: 0
      });
    }
  }

  function spawnBurst(x, y, count) {
    if (!cfg || reduce) return;
    for (var i = 0; i < count; i++) {
      var a = rnd(0, 6.2832);
      var sp = rnd(30, 210);
      push({
        kind: 'spark',
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
        size: rnd(1.2, 3),
        rot: 0, vr: 0,
        color: pick(['#e9b96e', '#d98b8b', '#f4d9a6', '#fff6e4', '#b4452f']),
        alpha: 1,
        life: rnd(0.9, 1.7),
        max: 1.7,
        ph: 0, sway: 0,
        grav: 45
      });
    }
    for (var j = 0; j < 14; j++) {
      spawn('petal');
    }
  }

  function petalPath(size) {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.9, -size * 0.5, size * 0.65, size * 0.75, 0, size);
    ctx.bezierCurveTo(-size * 0.65, size * 0.75, -size * 0.9, -size * 0.5, 0, -size);
    ctx.closePath();
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;

    if (W === 0) resize();
    ctx.clearRect(0, 0, W, H);

    if (cfg && !reduce && !document.hidden) {
      acc += dt * cfg.rate;
      while (acc >= 1) {
        acc -= 1;
        if (cfg.kind === 'mixed') {
          spawn(Math.random() < 0.55 ? 'firefly' : 'petal');
        } else {
          spawn(cfg.kind);
        }
      }
    }

    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= dt;
      p.ph += dt * 1.4;
      p.x += (p.vx + Math.sin(p.ph) * p.sway * 0.35) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      if (p.grav) p.vy += p.grav * dt;

      if (p.life <= 0 || p.y < -90 || p.y > H + 90 || p.x < -80 || p.x > W + 80) {
        parts.splice(i, 1);
        continue;
      }

      var fadeIn = Math.min(1, (p.max - p.life) / 1.2);
      var fadeOut = Math.min(1, p.life / 1.4);
      var a = p.alpha * fadeIn * fadeOut;

      if (p.kind === 'petal') {
        a *= 0.55 + 0.45 * Math.abs(Math.sin(p.ph * 1.1));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        petalPath(p.size);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (p.kind === 'firefly') {
        var blink = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(p.ph * 1.6)), 2);
        a *= blink;
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 6);
        g.addColorStop(0, 'rgba(255,236,190,' + (a * 0.9) + ')');
        g.addColorStop(1, 'rgba(233,185,110,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 6, 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = a;
        ctx.fillStyle = '#fff6dc';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.8, 0, 6.2832);
        ctx.fill();
        continue;
      }

      if (p.kind === 'glow') {
        var gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        gg.addColorStop(0, 'rgba(255,246,220,' + (a * 0.8) + ')');
        gg.addColorStop(1, 'rgba(233,185,110,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, 6.2832);
        ctx.fill();
        continue;
      }

      if (p.kind === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 6.2832);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        continue;
      }

      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 6.2832);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduce || running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  window.Effects = {
    setScene: function (n) {
      scene = n;
      cfg = CONFIG[n] || CONFIG[1];
      acc = 0;
      parts.length = 0;
      if (n === 5) cfg.rate = 3;
      if (!reduce) start();
    },
    burst: function (x, y, count) {
      spawnBurst(x, y, count || 40);
    },
    giftJoy: function () {
      if (!cfg) return;
      var rect = canvas.getBoundingClientRect();
      spawnBurst(rect.width / 2, rect.height * 0.52, 54);
      for (var i = 0; i < 22; i++) spawn('petal');
      if (scene === 5) cfg.rate = 4.5;
    },
    calmGift: function () {
      if (scene === 5 && cfg) cfg.rate = 3;
    },
    celebrate: function () {
      if (!cfg) return;
      var rect = canvas.getBoundingClientRect();
      for (var i = 0; i < 3; i++) {
        spawnBurst(rnd(rect.width * 0.2, rect.width * 0.8), rnd(rect.height * 0.25, rect.height * 0.5), 22);
      }
    },
    refresh: function () {
      resize();
    }
  };

  window.addEventListener('resize', function () {
    resize();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (!reduce) start();
  });

  resize();
})();
