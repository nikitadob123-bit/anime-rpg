/* Звук на WebAudio: короткие синтезированные эффекты и тихая фоновая «пэд»-музыка. Без файлов. */
(function () {
  const RPG = globalThis.RPG || (globalThis.RPG = {});
  const A = RPG.A = { on: true, music: true, vol: 0.6, ctx: null, master: null, pad: null };
  A.init = function () {
    if (A.ctx || typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') return;
    try { const C = window.AudioContext || window.webkitAudioContext; A.ctx = new C(); A.master = A.ctx.createGain(); A.master.gain.value = A.vol * 0.5; A.master.connect(A.ctx.destination); } catch (e) { A.ctx = null; }
  };
  A.resume = function () { A.init(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); if (A.on && A.music) A.startMusic(); };
  A.set = function (o) { Object.assign(A, o); if (A.master) A.master.gain.value = A.on ? A.vol * 0.5 : 0; if (A.on && A.music) A.startMusic(); else A.stopMusic(); };
  function tone(f, t0, dur, type, vol, f2) {
    if (!A.ctx || !A.on) return; const c = A.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, c.currentTime + t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + t0 + dur);
    g.gain.setValueAtTime(0.0001, c.currentTime + t0); g.gain.exponentialRampToValueAtTime(vol || 0.2, c.currentTime + t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g); g.connect(A.master); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
  }
  function noise(t0, dur, vol, hp) {
    if (!A.ctx || !A.on) return; const c = A.ctx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 800; const g = c.createGain(); g.gain.value = vol || 0.2;
    s.connect(f); f.connect(g); g.connect(A.master); s.start(c.currentTime + t0);
  }
  const SFX = {
    click: () => tone(660, 0, 0.06, 'triangle', 0.1), tab: () => tone(520, 0, 0.07, 'sine', 0.1, 780), ok: () => { tone(523, 0, 0.1, 'triangle', 0.14); tone(784, 0.08, 0.14, 'triangle', 0.14); },
    err: () => tone(160, 0, 0.18, 'sawtooth', 0.12, 110), hit: () => { noise(0, 0.1, 0.25, 600); tone(140, 0, 0.1, 'square', 0.14, 70); }, crit: () => { noise(0, 0.14, 0.3, 500); tone(220, 0, 0.16, 'sawtooth', 0.16, 90); tone(880, 0.02, 0.1, 'triangle', 0.1); },
    miss: () => tone(900, 0, 0.1, 'sine', 0.06, 500), heal: () => { tone(523, 0, 0.14, 'sine', 0.13); tone(659, 0.09, 0.14, 'sine', 0.13); tone(784, 0.18, 0.2, 'sine', 0.13); },
    magic: () => { tone(300, 0, 0.3, 'sine', 0.12, 900); noise(0.05, 0.2, 0.08, 2500); }, buff: () => { tone(440, 0, 0.12, 'triangle', 0.1); tone(660, 0.07, 0.16, 'triangle', 0.1); },
    win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.28, 'triangle', 0.15)); }, lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.22, 0.4, 'sine', 0.15)); },
    level: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.26, 'triangle', 0.15)); }, loot: () => { tone(988, 0, 0.08, 'square', 0.07); tone(1318, 0.07, 0.14, 'square', 0.07); },
    gold: () => { tone(1200, 0, 0.07, 'square', 0.06); tone(1600, 0.06, 0.12, 'square', 0.06); }, forge: () => { noise(0, 0.08, 0.3, 1500); tone(900, 0, 0.12, 'triangle', 0.1, 600); tone(1350, 0.09, 0.2, 'sine', 0.08); }, equip: () => { noise(0, 0.07, 0.15, 800); tone(420, 0, 0.1, 'triangle', 0.08, 300); }, pick: () => { tone(520, 0, 0.06, 'sine', 0.08, 700); noise(0.02, 0.1, 0.1, 2000); },
    boom: () => { noise(0, 0.5, 0.35, 120); tone(70, 0, 0.5, 'sine', 0.3, 30); }, page: () => noise(0, 0.05, 0.05, 3000), die: () => { tone(300, 0, 0.35, 'sawtooth', 0.12, 60); }
  };
  A.play = function (n) { if (!A.on || !A.ctx) return; try { if (A.ctx.state === 'suspended') A.ctx.resume(); (SFX[n] || SFX.click)(); } catch (e) { /* ignore */ } };
  A.startMusic = function () {
    if (!A.ctx || A.pad || !A.on || !A.music) return; const c = A.ctx; const g = c.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 3); g.connect(A.master);
    const oscs = [110, 164.8, 220, 277.2].map((f, i) => { const o = c.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f; const l = c.createOscillator(); l.frequency.value = 0.05 + i * 0.03; const lg = c.createGain(); lg.gain.value = 1.2; l.connect(lg); lg.connect(o.frequency); const og = c.createGain(); og.gain.value = 0.5 / (i + 1); o.connect(og); og.connect(g); o.start(); l.start(); return [o, l]; });
    A.pad = { g, oscs };
  };
  A.stopMusic = function () { if (!A.pad) return; const p = A.pad; A.pad = null; try { p.g.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.4); setTimeout(() => p.oscs.forEach(([o, l]) => { try { o.stop(); l.stop(); } catch (e) { } }), 1500); } catch (e) { } };
  if (typeof module !== 'undefined') module.exports = RPG;
})();
