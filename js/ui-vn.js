/* Режим визуальной новеллы: фон/CG, крупные портреты (до трёх), смена настроения кроссфейдом, печать текста, лог, авто/пропуск, эффекты. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, F = RPG.F, UI = RPG.UI;
  const { $, esc } = UI;
  const MOODS = { n: 'neutral', h: 'happy', a: 'angry', s: 'shy', d: 'sad' };
  const HERO = { n: 'neutral', h: 'smirk', a: 'angry', d: 'despair', m: 'demon', s: 'neutral' };
  // ───── Арт: манифест, настроения, запасные SVG ─────
  UI.manifest = { portraits: {}, cg: {}, pre: [] };
  UI.loadManifest = async function () {
    try { const r = await fetch('assets/vn/manifest.json', { cache: 'no-cache' }); if (r.ok) UI.manifest = await r.json(); } catch (e) { /* офлайн без кэша: останутся SVG */ }
    return UI.manifest;
  };
  UI.artFile = function (art, mood) {
    const m = UI.manifest.portraits[art]; if (!m) return null;
    const name = (art === 'hero' ? HERO : MOODS)[mood || 'n'] || 'neutral';
    return m[name] || m.neutral || null;
  };
  UI.cgFile = (id) => UI.manifest.cg['cg_' + id] || null;
  UI.portraitSpec = function (id, mood) {
    const L = RPG.NPC_LOOK[id]; if (!L) return null;
    return Object.assign({}, L, { mood: { n: 'n', h: 'h', a: 'x', s: 's', d: 's', m: 'x' }[mood || 'n'] || 'n' });
  };
  UI.por = function (id, cls, lazy, mood) {
    if (!id) return '<div class="por empty"></div>';
    const f = UI.artFile(id, mood);
    if (f) return `<img class="por ${cls || ''}" ${lazy === false ? '' : 'loading="lazy"'} decoding="async" alt="" draggable="false" data-pid="${esc(id)}" src="assets/vn/${f}">`;
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
  UI.silFor = (bg) => { const m = SIL[bg]; return m ? `<div class="sil sil-${m}"></div>` : ''; };

  UI.playLines = function (lines, o) {
    return new Promise((resolve) => {
      const slot = UI.slot(), st = UI.p.settings, layer = $('#layer'); o = o || {};
      const result = {};
      layer.innerHTML = `<div id="story" class="story vn"><div class="vbg" id="sbg"></div><div class="vbg b2" id="sbg2"></div><div class="vcg" id="vcg"></div><div class="vstage" id="vstage"></div><div class="vfog"></div>
        <div class="vtop"><button class="mini" data-act="vLog" data-quiet="1" title="Лог">📜</button><button class="mini" data-act="vAuto" id="vAuto" data-quiet="1">▶ Авто</button><button class="mini" data-act="sSkip" id="sSkip" data-quiet="1">⏭ Пропуск</button></div>
        <div class="dlg" id="dlg" data-act="sNext" data-quiet="1"><div class="spk" id="spk"></div><div class="txt" id="stxt"></div><i class="nx">▾</i></div><div class="schoice" id="schoice"></div><div class="tcard" id="tcard"></div><div class="flash" id="sflash"></div><div class="vlog" id="vlog"></div></div>`;
      layer.classList.add('on'); const root = $('#story');
      const Q = lines.slice(); let typing = null, waitNext = null, skipping = false, auto = false, curBg = '', curCg = null;
      const logArr = []; const actors = {}; // key -> {el, mood}
      const stage = $('#vstage');
      const setBg = (bg) => { if (!bg || bg === curBg) return; curBg = bg; const b2 = $('#sbg2'), b1 = $('#sbg'); b2.className = 'vbg b2 bg-' + bg + ' in'; b2.innerHTML = UI.silFor(bg); setTimeout(() => { b1.className = 'vbg bg-' + bg; b1.innerHTML = b2.innerHTML; b2.className = 'vbg b2'; b2.innerHTML = ''; }, 600); };
      const setCg = (id) => { const el = $('#vcg'); if (id === curCg) return; curCg = id; if (!id) { el.classList.remove('on'); return; } const f = UI.cgFile(id); if (!f) { el.classList.remove('on'); return; } el.style.backgroundImage = `url(assets/vn/${f})`; el.className = 'vcg on kb'; Object.keys(actors).forEach(hideActor); };
      const done = () => { layer.classList.remove('on'); layer.innerHTML = ''; UI.sNext = UI.sSkip = UI.vAuto = null; try { F.setMode(st.particles ? (UI.v === 'game' ? 'embers' : 'stars') : 'none'); } catch (e) { /* ignore */ } if (!o.replay && o.id) E.finishScene(slot, o.id); resolve(result); };
      const posFor = (key, sp) => { if (sp.hero) return 'left'; const used = Object.values(actors).map((a) => a.pos); return used.includes('right') ? (used.includes('center') ? 'right' : 'center') : 'right'; };
      const spriteHtml = (art, mood) => UI.por(art, 'vsp', false, mood);
      const showActor = (key, mood) => {
        const sp = D.SPEAKERS[key]; if (!sp || !sp.art) return null;
        if (curCg) { curCg = null; $('#vcg').classList.remove('on'); }
        let a = actors[key];
        if (!a) {
          const pos = posFor(key, sp); const el = document.createElement('div'); el.className = 'vact pos-' + pos; el.innerHTML = spriteHtml(sp.art, mood); stage.appendChild(el);
          a = actors[key] = { el, mood: mood || 'n', pos }; requestAnimationFrame(() => el.classList.add('in'));
        } else if ((mood || 'n') !== a.mood) {
          const old = a.el.firstElementChild; const wrap = document.createElement('div'); wrap.innerHTML = spriteHtml(sp.art, mood); const nw = wrap.firstElementChild; nw.classList.add('xf'); a.el.appendChild(nw);
          requestAnimationFrame(() => nw.classList.add('on')); setTimeout(() => { if (old && old.parentNode) old.remove(); nw.classList.remove('xf', 'on'); }, 380);
          a.mood = mood || 'n'; if (mood === 'a' || mood === 'm') { a.el.classList.remove('pop'); void a.el.offsetWidth; a.el.classList.add('pop'); }
        }
        Object.keys(actors).forEach((k) => actors[k].el.classList.toggle('talk', k === key));
        return a;
      };
      function hideActor(key) { const a = actors[key]; if (!a) return; a.el.classList.remove('in'); setTimeout(() => a.el.remove(), 350); delete actors[key]; }
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
          case 'silence': root.classList.add('silence'); UI.sfx('boom'); await w(1800); setTimeout(() => root.classList.remove('silence'), 2500); break;
          case 'flash': { const f = $('#sflash'); f.className = 'flash'; void f.offsetWidth; f.classList.add('go'); UI.sfx('magic'); await w(450); break; }
          case 'entropy': { const f = $('#sflash'); f.className = 'flash ent'; void f.offsetWidth; f.classList.add('go'); root.classList.add('desat'); UI.sfx('boom'); await w(1400); setTimeout(() => root.classList.remove('desat'), 4000); break; }
          case 'halo': { root.classList.remove('halo'); void root.offsetWidth; root.classList.add('halo'); UI.sfx('magic'); await w(900); break; }
          case 'shake': root.classList.remove('shk'); void root.offsetWidth; root.classList.add('shk'); UI.sfx('boom'); await w(500); break;
          default: break;
        }
      };
      const note = (t) => UI.toast(t, 'gold');
      (async () => {
        setBg(o.bg); await UI.wait(150);
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
          if (k === 'if') { if (slot.story.flags[l[1]]) Q.unshift(...l[2]); continue; }
          if (k === 'choice') {
            skipping = false; auto = false; $('#sSkip').classList.remove('on'); $('#sSkip').textContent = '⏭ Пропуск'; $('#vAuto').textContent = '▶ Авто';
            const pick = await new Promise((r) => { const c = $('#schoice'); c.innerHTML = l[1].map((op, i) => `<button class="choice" data-act="sChoice" data-i="${i}" data-quiet="1">${esc(E.fmtText(op.t, slot))}</button>`).join(''); c.classList.add('on'); UI.sChoice = (i) => { c.classList.remove('on'); c.innerHTML = ''; UI.sfx('ok'); r(i); }; });
            const op = l[1][pick]; if (!o.replay && op.f && Object.keys(op.f).length) E.setFlags(slot, op.f); logArr.push({ n: '', t: '▸ ' + op.t, c: '#fff' }); if (op.r) Q.unshift(...op.r); continue;
          }
          const sp = D.SPEAKERS[k]; if (!sp) continue; const narr = !sp.n;
          const text = E.fmtText(l[1], slot);
          if (!narr) showActor(k, l[2]); else Object.keys(actors).forEach((a) => actors[a].el.classList.remove('talk'));
          const spk = $('#spk'); spk.textContent = narr ? '' : E.fmtText(sp.n, slot); spk.style.color = sp.c || '#fff'; spk.style.display = narr ? 'none' : 'block';
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
