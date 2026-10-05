/* Режим визуальной новеллы: фон/CG, крупные портреты (до трёх), смена настроения кроссфейдом, печать текста, лог, авто/пропуск, эффекты. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, F = RPG.F, UI = RPG.UI;
  const { $, esc } = UI;
  // ───── Арт: манифест, настроения, запасные SVG ─────
  UI.manifest = { portraits: {}, cg: {}, pre: [] };
  UI.loadManifest = async function () {
    try { const r = await fetch('assets/vn/manifest.json', { cache: 'no-cache' }); if (r.ok) UI.manifest = await r.json(); } catch (e) { /* офлайн без кэша: останутся SVG */ }
    return UI.manifest;
  };
  UI.artFile = (art, mood) => RPG.artFileOf(UI.manifest, art, mood);
  UI.cgFile = (id) => UI.manifest.cg['cg_' + id] || null;
  UI.portraitSpec = function (id, mood) {
    const L = RPG.NPC_LOOK[id]; if (!L) return null;
    return Object.assign({}, L, { mood: { n: 'n', h: 'h', a: 'x', s: 's', d: 's', m: 'x', u: 'n', ma: 'x', mh: 'h', ms: 's', md: 's', mu: 'n' }[mood || 'n'] || 'n' });
  };
  // пул декодированных картинок: look-ahead по репликам, спрайт показывается только после decode() (иначе подлагивает на главном потоке)
  UI.imgPool = new Map();
  UI.prefetch = function (art, mood) {
    const f = art && UI.artFile(art, mood); if (!f) return Promise.resolve();
    const url = 'assets/vn/' + f; let im = UI.imgPool.get(url);
    if (!im) { im = new Image(); im.decoding = 'async'; im.src = url; im._p = im.decode ? im.decode().catch(() => {}) : Promise.resolve(); UI.imgPool.set(url, im); if (UI.imgPool.size > 28) UI.imgPool.delete(UI.imgPool.keys().next().value); }
    else { UI.imgPool.delete(url); UI.imgPool.set(url, im); }
    return im._p;
  };
  UI.por = function (id, cls, lazy, mood) {
    if (!id) return '<div class="por empty"></div>';
    let f = UI.artFile(id, mood);
    const av = (!mood || mood === 'n') && /\b(xs|sm|lg|xl)\b/.test(cls || '') && RPG.avatarOf(UI.manifest, id);    // маленькие аватары: кроп лица (256 px) вместо целого бюста
    if (av) f = av;
    if (f) return `<img class="por ${cls || ''}" ${lazy === false ? '' : 'loading="lazy"'} decoding="async" alt="" draggable="false" data-pid="${esc(id)}" data-mood="${esc(mood || 'n')}" src="assets/vn/${f}">`;
    const spec = UI.portraitSpec(id, mood); if (!spec) return '<div class="por empty"></div>';
    return `<div class="por ${cls || ''} svgpor" data-pid="${esc(id)}">${RPG.portraitSVG(spec)}</div>`;
  };
  document.addEventListener('error', function (e) {
    const t = e.target; if (!t || t.tagName !== 'IMG' || !t.dataset.pid) return;
    const spec = UI.portraitSpec(t.dataset.pid); if (!spec) return;
    const d = document.createElement('div'); d.className = t.className + ' svgpor'; d.innerHTML = RPG.portraitSVG(spec); t.replaceWith(d);
  }, true);

  // ───── Сцены ─────
  UI.playScene = function (id, replay) {
    const sc = D.SCENES[id]; if (!sc) return Promise.resolve();
    return UI.playLines(sc.lines, { bg: sc.bg, replay: !!replay, id, title: sc.t });
  };
  const giveTxt = (g) => [g.gold ? g.gold + ' 🪙' : '', g.sp ? '+' + g.sp + ' искр Нимба' : '', g.item ? 'артефакт' : '', Object.keys(g.cons || {}).map((k) => D.CONS[k].ic + g.cons[k]).join(' '), Object.keys(g.mats || {}).map((k) => D.MATS[k].ic + g.mats[k]).join(' ')].filter(Boolean).join(' ');
  const SIL = { courtyard: 'cathedral', street_fest: 'village', void: '', void_dusk: '', camp: 'trees', ruins: 'arches', forest: 'trees', mines: 'peaks', swamp: 'trees', spire: 'spire', cathedral: 'cathedral' };
  UI.silFor = (bg) => { const m = SIL[bg]; return m ? `<div class="sil sil-${m}"></div>` : ''; };   // v2.8.1: кольцо Нимба больше не рисуется само на фонах сцен — только ['fx','ring'] (слой #vring)

  // ───── Сцена: геометрия спрайтов (расчёты — RPG.vnLayout / RPG.vnPlaceRect в portrait.js) ─────
  // У каждого портрета в манифесте: dim = [w, h, keyed, fx, fy, fw] — центр лица и его ширина (px). Размер голов выравнивается по fw,
  // настроения одного персонажа совмещаются по лицу (кроссфейд без «прыжков»), низ спрайта продлён и растворяется под диалогом.
  UI.artMetrics = (art, mood) => RPG.artMetricsOf(UI.manifest, art, mood);
  UI.vnLayout = RPG.vnLayout;
  UI.vnPlace = function (ref, m, el) { const r = RPG.vnPlaceRect(ref, m); el.style.left = r.left + 'px'; el.style.top = r.top + 'px'; el.style.width = r.width + 'px'; el.style.height = r.height + 'px'; };
  const RIM = { courtyard: '150,160,255', street_fest: '255,170,90', void: '170,120,255', void_dusk: '255,120,90', camp: '255,160,80', ruins: '170,150,255', forest: '110,230,160', mines: '255,170,80', swamp: '120,230,170', spire: '170,210,255', cathedral: '255,214,140' };
  UI.vnRim = (bg) => RIM[bg] || '150,160,255';

  UI.playLines = function (lines, o) {
    return new Promise((resolve) => {
      const slot = UI.slot(), st = UI.p.settings, layer = $('#layer'); o = o || {};
      const result = {};
      layer.innerHTML = `<div id="story" class="story vn"><div class="vbg" id="sbg"></div><div class="vbg b2" id="sbg2"></div><div class="lira vring" id="vring" hidden></div><div class="vcg" id="vcg"></div><div class="vstage" id="vstage"></div><div class="vfog"></div>
        <div class="vtop"><button class="mini" data-act="vLog" data-quiet="1" title="Лог">📜</button><button class="mini" data-act="vAuto" id="vAuto" data-quiet="1">▶ Авто</button><button class="mini" data-act="sSkip" id="sSkip" data-quiet="1">⏭ Пропуск</button></div>
        <div class="dlg" id="dlg" data-act="sNext" data-quiet="1"><div class="spk" id="spk"></div><div class="txt" id="stxt"></div><i class="nx">▾</i></div><div class="schoice" id="schoice"></div><div class="tcard" id="tcard"></div><div class="flash" id="sflash"></div><div class="vlog" id="vlog"></div></div>`;
      layer.classList.add('on'); const root = $('#story');
      const Q = lines.slice(); let typing = null, waitNext = null, skipping = false, auto = false, curBg = '', curCg = null, finished = false;
      const logArr = []; const actors = {}; // key -> {el, mood, art, ord, imgs}
      const stage = $('#vstage'); let ord = 0, bgGen = 0, bgTimer = 0; const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!finished) fn(); }, ms); timers.add(t); return t; };
      const finalizeBg = () => { if (!bgTimer) return; clearTimeout(bgTimer); bgTimer = 0; const b1 = $('#sbg'), b2 = $('#sbg2'); if (!b1 || !b2) return; b1.className = 'vbg bg-' + curBg; b1.innerHTML = b2.innerHTML; b2.className = 'vbg b2'; b2.innerHTML = ''; };
      const setBg = (bg) => {
        if (!bg || bg === curBg) return; finalizeBg(); curBg = bg; const gen = ++bgGen; root.dataset.bg = bg; root.style.setProperty('--rim', UI.vnRim(bg));
        const b2 = $('#sbg2'); b2.className = 'vbg b2 bg-' + bg; b2.innerHTML = UI.silFor(bg); void b2.offsetWidth; b2.classList.add('in');
        bgTimer = setTimeout(() => { if (gen === bgGen && !finished) finalizeBg(); }, 620);
      };
      const setCg = (id) => { const el = $('#vcg'); if (id === curCg) return; curCg = id; if (!id) { el.classList.remove('on'); return; } const f = UI.cgFile(id); if (!f) { el.classList.remove('on'); return; } el.style.backgroundImage = `url(assets/vn/${f})`; el.className = 'vcg on kb'; Object.keys(actors).forEach(hideActor); };
      const done = () => {
        finished = true; timers.forEach(clearTimeout); timers.clear(); clearTimeout(bgTimer); window.removeEventListener('resize', onResize); cancelAnimationFrame(rz);
        layer.classList.remove('on'); layer.innerHTML = ''; UI.sNext = UI.sSkip = UI.vAuto = null; try { F.setMode(st.particles ? (UI.v === 'game' ? 'embers' : 'stars') : 'none'); } catch (e) { /* ignore */ } if (!o.replay && o.id) E.finishScene(slot, o.id); resolve(result);
      };
      const spriteEl = (art, mood) => { const wrap = document.createElement('div'); wrap.innerHTML = UI.por(art, 'vsp', false, mood); return wrap.firstElementChild; };
      const decoded = (el) => (el && el.tagName === 'IMG' ? Promise.race([UI.prefetch(el.dataset.pid, el.dataset.mood).then(() => (el.decode ? el.decode().catch(() => {}) : 0)), UI.wait(700)]) : Promise.resolve());
      // порядок актёров: герой слева, остальные по появлению
      const live = () => Object.keys(actors).sort((p, q) => (D.SPEAKERS[q].hero ? 1 : 0) - (D.SPEAKERS[p].hero ? 1 : 0) || actors[p].ord - actors[q].ord);
      function layout() {
        const keys = live(); if (!keys.length || finished) return;
        const W = stage.clientWidth || 390, dlg = $('#dlg'), Yb = (dlg ? dlg.offsetTop : stage.clientHeight - 140) + 16;
        const L = UI.vnLayout(keys.map((k) => actors[k].ref), W, Yb);
        keys.forEach((k, i) => { const a = actors[k], g = L[i]; a.el.style.height = g.frH + 'px'; a.el.style.transform = `translate(${(Math.round(g.x * 2) / 2)}px,${(Math.round(g.y * 2) / 2)}px) scale(${g.s.toFixed(4)})`; a.el.style.setProperty('--oy', g.oy.toFixed(1) + 'px'); a.el.style.setProperty('--sx', (i === 0 && keys.length > 1 ? -40 : i === keys.length - 1 && keys.length > 1 ? 40 : 0) + 'px'); });
      }
      let rz = 0, rzT = 0; const onResize = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { if (finished) return; stage.classList.add('nofx'); layout(); clearTimeout(rzT); rzT = setTimeout(() => stage.classList.remove('nofx'), 80); }); };   // resize на Android сыплется при движении адресной строки — без переходов и дребезга
      window.addEventListener('resize', onResize);
      const showActor = (key, mood) => {
        const sp = D.SPEAKERS[key]; if (!sp || !sp.art) return null;
        if (curCg) { curCg = null; $('#vcg').classList.remove('on'); }
        mood = mood || 'n'; let a = actors[key];
        if (!a) {
          const ref = UI.artMetrics(sp.art, 'n'), m = UI.artMetrics(sp.art, mood);
          const el = document.createElement('div'); el.className = 'vact'; el.innerHTML = '<div class="vpp"><div class="vbr"><div class="vslide"><div class="vimgs"></div></div></div></div>';
          const img = spriteEl(sp.art, mood); UI.vnPlace(ref, m, img); el.querySelector('.vimgs').appendChild(img); stage.appendChild(el);
          a = actors[key] = { el, mood, art: sp.art, ord: ord++, ref, timer: 0 }; layout();
          decoded(img).then(() => { if (!finished && actors[key] === a) el.classList.add('in'); });
        } else if (mood !== a.mood) {
          const box = a.el.querySelector('.vimgs'); a.mood = mood; clearTimeout(a.timer);
          [...box.children].forEach((c) => { if (c.classList.contains('xf') && !c.classList.contains('on')) c.remove(); });   // ещё не показанные (ждут decode) — выбрасываем
          while (box.children.length > 2) box.firstElementChild.remove();                                                      // цепочка кроссфейдов ограничена
          const nw = spriteEl(sp.art, mood); UI.vnPlace(a.ref, UI.artMetrics(sp.art, mood), nw); nw.classList.add('xf'); box.appendChild(nw);
          decoded(nw).then(() => { if (finished || actors[key] !== a || nw.parentNode !== box) return; void nw.offsetWidth; nw.classList.add('on'); clearTimeout(a.timer); a.timer = later(() => { while (nw.previousElementSibling) nw.previousElementSibling.remove(); nw.classList.remove('xf', 'on'); }, 420); });
          if (mood === 'a' || mood === 'm' || mood === 'ma') { const fx = a.el.querySelector('.vpp'); fx.classList.remove('pop'); void fx.offsetWidth; fx.classList.add('pop'); }
        }
        Object.keys(actors).forEach((k) => actors[k].el.classList.toggle('talk', k === key));
        return a;
      };
      function hideActor(key) { const a = actors[key]; if (!a) return; delete actors[key]; a.el.classList.remove('in', 'talk'); a.el.classList.add('out'); layout(); const el = a.el; later(() => el.remove(), 520); }
      const typeText = (txt, narr) => new Promise((r) => {
        const el = $('#stxt'); el.className = 'txt' + (narr ? ' narr' : ''); el.textContent = ''; const sp = [0, 44, 20, 7][st.textSpeed == null ? 2 : st.textSpeed]; let i = 0; const nx = $('#dlg .nx'); nx.style.opacity = 0;
        if (skipping || !sp) { el.textContent = txt; nx.style.opacity = 1; r(); return; }
        const tick = () => { i++; el.textContent = txt.slice(0, i); if (i >= txt.length) { typing = null; nx.style.opacity = 1; r(); return; } const ch = txt[i - 1]; typing = { timer: setTimeout(tick, sp * (/[.!?…]/.test(ch) ? 7 : /[,;:—]/.test(ch) ? 3 : 1)), finish: () => { clearTimeout(typing && typing.timer); el.textContent = txt; typing = null; nx.style.opacity = 1; r(); } }; };
        tick();
      });
      const waitTap = (len) => new Promise((r) => { if (skipping) { setTimeout(r, 80); return; } waitNext = r; if (auto) setTimeout(() => { if (waitNext === r && auto) { waitNext = null; r(); } }, 900 + len * 22); });
      UI.sNext = () => { if (typing) { typing.finish(); return; } if (waitNext) { const f = waitNext; waitNext = null; UI.sfx('page'); f(); } };
      UI.sSkip = () => { skipping = !skipping; $('#sSkip').classList.toggle('on', skipping); $('#sSkip').textContent = skipping ? '⏩ Идёт…' : '⏭ Пропуск'; if (skipping) { if (typing) typing.finish(); if (waitNext) { const f = waitNext; waitNext = null; f(); } } };
      UI.vAuto = () => { auto = !auto; $('#vAuto').classList.toggle('on', auto); $('#vAuto').textContent = auto ? '⏸ Авто' : '▶ Авто'; if (auto && waitNext && !typing) { const f = waitNext; waitNext = null; setTimeout(f, 400); } };
      UI.vLog = () => { const l = $('#vlog'); if (l.classList.contains('on')) { l.classList.remove('on'); return; } l.innerHTML = '<div class="lh">Лог <button class="mini" data-act="vLog" data-quiet="1">✕</button></div>' + logArr.slice(-60).map((x) => `<p>${x.n ? `<b style="color:${x.c}">${esc(x.n)}</b> ` : ''}${esc(x.t)}</p>`).join(''); l.classList.add('on'); l.scrollTop = l.scrollHeight; };
      const fx = async (name) => {
        const w = (ms) => UI.wait(skipping ? 40 : ms);
        switch (name) {
          case 'stars': case 'embers': case 'fireflies': case 'snow': try { F.setMode(st.particles ? name : 'none'); } catch (e) { /* ignore */ } break;
          case 'silence': root.classList.add('silence'); UI.sfx('boom'); await w(1800); later(() => root.classList.remove('silence'), 2500); break;
          case 'flash': { const f = $('#sflash'); f.className = 'flash'; void f.offsetWidth; f.classList.add('go'); UI.sfx('magic'); await w(450); break; }
          case 'entropy': { const f = $('#sflash'); f.className = 'flash ent'; void f.offsetWidth; f.classList.add('go'); root.classList.add('desat'); UI.sfx('boom'); await w(1400); later(() => root.classList.remove('desat'), 4000); break; }
          case 'halo': { root.classList.remove('halo'); void root.offsetWidth; root.classList.add('halo'); later(() => root.classList.remove('halo'), 1700); UI.sfx('magic'); await w(900); break; }
          case 'ring': $('#vring').hidden = false; break;
          case 'noring': $('#vring').hidden = true; break;
          case 'shake': root.classList.remove('shk'); void root.offsetWidth; root.classList.add('shk'); later(() => root.classList.remove('shk'), 600); UI.sfx('boom'); await w(500); break;
          default: break;
        }
      };
      // look-ahead: декодируем спрайты ближайших реплик заранее (2–3 вперёд, включая ветки if)
      const ahead = (n) => {
        const seen = []; const walk = (arr) => { for (const l of arr) { if (seen.length >= n) return; if (l[0] === 'if') walk(l[2]); else if (l[0] === 'choice') { seen.push(null); } else if (D.SPEAKERS[l[0]] && D.SPEAKERS[l[0]].art && !/^(bg|cg|fx|hide|title|set|give|rec|loy|aff|date)$/.test(l[0])) seen.push([D.SPEAKERS[l[0]].art, l[2] || 'n']); } };
        walk(Q); seen.forEach((s) => { if (s) UI.prefetch(s[0], s[1]); });
      };
      const note = (t) => UI.toast(t, 'gold');
      (async () => {
        ahead(4); setBg(o.bg); await UI.wait(150);
        while (Q.length) {
          const l = Q.shift(), k = l[0];
          if (k === 'bg') { setBg(l[1]); if (curCg) { curCg = null; $('#vcg').classList.remove('on'); } await UI.wait(skipping ? 20 : 450); continue; }
          if (k === 'cg') { setCg(l[1]); await UI.wait(skipping ? 20 : 700); continue; }
          if (k === 'fx') { await fx(l[1]); continue; }
          if (k === 'hide') { hideActor(l[1]); continue; }
          if (k === 'title') {
            if (o.noTitle) continue;
            const t = $('#tcard'); t.innerHTML = `<h1>${esc(l[1])}</h1><p>${esc(l[2] || '')}</p>`; t.classList.add('on'); UI.sfx('level'); await UI.wait(skipping ? 150 : 2400); t.classList.remove('on'); await UI.wait(300); continue;
          }
          if (k === 'set') { if (!o.replay) E.setFlags(slot, l[1]); continue; }
          if (k === 'give') { if (!o.replay) { E.give(slot, l[1]); note('🎁 Получено: ' + giveTxt(l[1])); } continue; }
          if (k === 'rec') { if (!o.replay && E.recruit(slot, l[1])) { note('➕ В Свите: ' + D.CREW[l[1]].n); UI.sfx('level'); } continue; }
          if (k === 'loy') { if (!o.replay) for (const id in l[1]) { if (l[1][id]) { const d = E.addLoy(slot, id, l[1][id]); if (d) note((d > 0 ? '🤝 +' : '💔 ') + d + ' верность: ' + D.CREW[id].n); } } continue; }
          if (k === 'aff') { if (!o.replay) for (const id in l[1]) { const d = E.addAff(slot, id, l[1][id]); if (d) note('💞 ' + (d > 0 ? '+' : '') + d + ' симпатия: ' + D.CREW[id].n); } continue; }
          if (k === 'date') { result.date = l[1]; continue; }
          if (k === 'if') { if (E.flagTest(slot, l[1])) Q.unshift(...l[2]); continue; }
          if (k === 'choice') {
            skipping = false; auto = false; $('#sSkip').classList.remove('on'); $('#sSkip').textContent = '⏭ Пропуск'; $('#vAuto').textContent = '▶ Авто';
            const pick = await new Promise((r) => { const c = $('#schoice'); c.innerHTML = l[1].map((op, i) => `<button class="choice" data-act="sChoice" data-i="${i}" data-quiet="1">${esc(E.fmtText(op.t, slot))}</button>`).join(''); c.classList.add('on'); UI.sChoice = (i) => { c.classList.remove('on'); c.innerHTML = ''; UI.sfx('ok'); r(i); }; });
            const op = l[1][pick]; if (!o.replay && op.f && Object.keys(op.f).length) E.setFlags(slot, op.f); logArr.push({ n: '', t: '▸ ' + op.t, c: '#fff' }); if (op.r) Q.unshift(...op.r); continue;
          }
          const sp = D.SPEAKERS[k]; if (!sp) continue; const narr = !sp.n;
          const text = E.fmtText(l[1], slot);
          ahead(3); if (!narr) showActor(k, l[2]); else Object.keys(actors).forEach((a) => actors[a].el.classList.remove('talk'));
          const spk = $('#spk'); const spn = narr ? '' : E.fmtText(sp.n, slot);
          if (!narr && !sp.art) { spk.innerHTML = '<i class="spkbadge" style="background:' + esc(sp.c || '#c8c8e0') + '">' + esc(Array.from(spn)[0] || '?') + '</i>' + esc(spn); } else spk.textContent = spn;   // говорящий без портрета: значок-силуэт с инициалом вместо спрайта
          spk.style.color = sp.c || '#fff'; spk.style.display = narr ? 'none' : 'block';
          $('#dlg').classList.toggle('narr', narr);
          logArr.push({ n: narr ? '' : E.fmtText(sp.n, slot), t: text, c: sp.c });
          await typeText(text, narr); await waitTap(text.length);
        }
        done();
      })();
    });
  };
  UI.act.sNext = () => UI.sNext && UI.sNext();
  UI.act.sSkip = () => UI.sSkip && UI.sSkip();
  UI.act.vAuto = () => UI.vAuto && UI.vAuto();
  UI.act.vLog = () => UI.vLog && UI.vLog();
  UI.act.sChoice = (el) => UI.sChoice && UI.sChoice(+el.dataset.i);
})();
