/* Частицы на canvas: звёзды, угли, светлячки, снег, вспышки. Лёгкие, отключаются в настройках. */
(function () {
  const RPG = globalThis.RPG || (globalThis.RPG = {});
  const F = RPG.F = { on: true, mode: 'stars', parts: [], bursts: [], cv: null, ctx: null, w: 390, h: 844, raf: 0 };
  F.init = function (cv) {
    F.cv = cv; F.ctx = cv.getContext('2d'); F.resize(); window.addEventListener('resize', F.resize); F.setMode('stars'); if (!F.raf) F.loop(0);
  };
  F.resize = function () { const d = Math.min(2, window.devicePixelRatio || 1); const w = innerWidth, h = innerHeight; if (F.cv.width === Math.round(w * d) && F.cv.height === Math.round(h * d) && F.w === w && F.h === h) return; /* на Android resize сыплется при движении адресной строки: пересоздавать холст каждый раз = мерцание */ F.w = w; F.h = h; F.cv.width = F.w * d; F.cv.height = F.h * d; F.cv.style.width = F.w + 'px'; F.cv.style.height = F.h + 'px'; F.ctx.setTransform(d, 0, 0, d, 0, 0); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  F.setMode = function (m) {
    F.mode = m; F.parts = []; const n = m === 'snow' ? 60 : m === 'none' ? 0 : 38;
    for (let i = 0; i < n; i++) F.parts.push(mk(m, true));
  };
  function mk(m, init) {
    const p = { x: rnd(0, F.w), y: init ? rnd(0, F.h) : (m === 'embers' ? F.h + 10 : -10), r: rnd(0.6, 2.2), a: rnd(0.2, 0.9), t: rnd(0, 6.28), vx: 0, vy: 0, c: '#fff' };
    if (m === 'stars') { p.c = '#bcd2ff'; p.vy = rnd(0.02, 0.1); p.y = init ? p.y : -5; }
    else if (m === 'embers') { p.c = Math.random() < 0.5 ? '#ff9a4a' : '#ff5a3a'; p.vy = -rnd(0.3, 1.0); p.vx = rnd(-0.2, 0.3); p.y = init ? p.y : F.h + 5; }
    else if (m === 'fireflies') { p.c = '#d8ff8a'; p.vx = rnd(-0.2, 0.2); p.vy = rnd(-0.2, 0.2); p.r = rnd(1, 2.6); }
    else if (m === 'snow') { p.c = '#e8f4ff'; p.vy = rnd(0.4, 1.2); p.vx = rnd(-0.3, 0.3); p.r = rnd(1, 2.8); }
    else if (m === 'gold') { p.c = '#ffd36b'; p.vy = rnd(-0.3, 0.3); p.vx = rnd(-0.3, 0.3); }
    return p;
  }
  F.burst = function (x, y, color, n, kind) {
    if (!F.on) return; n = n || 14;
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = rnd(1, kind === 'big' ? 6 : 4); F.bursts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (kind === 'heal' ? 1.5 : 0), life: rnd(0.4, 0.9), t: 0, r: rnd(1.5, 3.4), c: color || '#fff', g: kind === 'heal' ? -0.02 : 0.08 }); }
  };
  F.loop = function (ts) {
    F.raf = requestAnimationFrame(F.loop);
    const dt = F.last ? Math.min(50, Math.max(4, ts - F.last)) : 16.7; F.last = ts; const k = dt / 16.7;   // скорость не зависит от частоты кадров (60/90/120 Гц)
    const c = F.ctx; if (!c) return; c.clearRect(0, 0, F.w, F.h); if (!F.on) { F.bursts.length = 0; return; }
    const m = F.mode;
    for (const p of F.parts) {
      p.t += 0.02 * k; p.x += (p.vx + (m === 'fireflies' ? Math.sin(p.t) * 0.3 : m === 'snow' ? Math.sin(p.t) * 0.3 : 0)) * k; p.y += (p.vy + (m === 'fireflies' ? Math.cos(p.t * 0.8) * 0.2 : 0)) * k;
      if (p.y > F.h + 12 || p.y < -14 || p.x < -10 || p.x > F.w + 10) Object.assign(p, mk(m, false));
      const tw = m === 'stars' || m === 'fireflies' ? 0.5 + 0.5 * Math.sin(p.t * 2) : 1;
      c.globalAlpha = p.a * tw; c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.28); c.fill();
      if (m === 'fireflies') { c.globalAlpha = p.a * tw * 0.25; c.beginPath(); c.arc(p.x, p.y, p.r * 4, 0, 6.28); c.fill(); }
    }
    for (let i = F.bursts.length - 1; i >= 0; i--) { const b = F.bursts[i]; b.t += 0.016 * k; b.x += b.vx * k; b.y += b.vy * k; b.vy += b.g * k; b.vx *= Math.pow(0.97, k); if (b.t > b.life) { F.bursts.splice(i, 1); continue; } c.globalAlpha = 1 - b.t / b.life; c.fillStyle = b.c; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 6.28); c.fill(); }
    c.globalAlpha = 1;
  };
  if (typeof module !== 'undefined') module.exports = RPG;
})();
