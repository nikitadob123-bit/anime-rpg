/* UI v2.30: «Коллаба: Железный Кулак» — баннер, сюжет, турнир, роман, выбор союзника. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { esc, fmt } = UI;
  const gi = (id, emo) => (UI.gi ? UI.gi(id, emo) : emo);
  const tok = (n) => gi('tk_token', D.TK_TOKEN.ic) + ' ' + fmt(n);
  const mm = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? d + ' д ' + h + ' ч' : h ? h + ' ч ' + m + ' мин' : m + ' мин'; };
  const err = (r) => { if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return true; } return false; };
  const porSrc = (id) => {
    const s = UI.slot && UI.slot();
    if (id && String(id).indexOf('tk_reina') === 0) {
      if (s && s.tk && s.tk.blood && UI.hasTkArt('tk_reina_devil')) return 'tk_reina_devil';
      if (id === 'tk_reina' && s && E.tkReinaLook) return E.tkReinaLook(s);
    }
    return id;
  };
  const devilCls = (id) => {
    const s = UI.slot && UI.slot();
    return (s && s.tk && s.tk.blood && id && String(id).indexOf('tk_reina') === 0) ? ' tkdevil' : '';
  };
  const por = (id, emo) => {
    const src = porSrc(id);
    return (UI.hasTkArt && UI.hasTkArt(src) ? `<img class="tkpor${devilCls(src)}" src="img/tekken/${src}.webp" alt="" draggable="false">` : `<span class="tkemo">${emo || '👊'}</span>`);
  };

  D.TK_ART_HAVE = ["banner","bg_arena","bg_dojo","tk_alisa","tk_anna","tk_armorking","tk_asuka","tk_azucena","tk_bob","tk_bolt","tk_bryan","tk_claudio","tk_clive","tk_deviljin","tk_dragunov","tk_eddy","tk_event","tk_fahkumram","tk_feng","tk_frame","tk_gene","tk_gloves","tk_heihachi","tk_hwoarang","tk_jack","tk_jin","tk_jun","tk_kazuya","tk_king","tk_kuma","tk_kuni","tk_lars","tk_law","tk_lee","tk_leo","tk_leroy","tk_lidia","tk_lili","tk_miary","tk_nina","tk_pack_m","tk_pack_s","tk_panda","tk_paul","tk_raven","tk_rec_jin","tk_rec_nina","tk_reina","tk_reina_devil","tk_reina_jacket","tk_reina_top","tk_reina_top_bust","tk_roger","tk_shaheen","tk_steve","tk_title","tk_token","tk_victor","tk_xiaoyu","tk_yoshimitsu","tk_zafina"]; // @tk-art-have
  const haveArt = new Set(D.TK_ART_HAVE);
  UI.hasTkArt = (id) => haveArt.has(id);
  if (typeof document !== 'undefined') {
    const rules = [];
    if (haveArt.has('banner')) rules.push('.tkbanner .tkart{background-image:url(img/tekken/banner.webp)}');
    if (haveArt.has('bg_arena')) rules.push('.bg-tk_arena{background-image:url(img/tekken/bg_arena.webp)}');
    if (haveArt.has('bg_dojo')) rules.push('.bg-tk_dojo{background-image:url(img/tekken/bg_dojo.webp)}');
    if (rules.length) { const el = document.createElement('style'); el.textContent = rules.join('\n'); (document.head || document.documentElement).appendChild(el); }
  }

  if (UI.gi) {
    const _gi = UI.gi;
    UI.gi = function (id, emo, cls) {
      const src = (id === 'tk_reina' && UI.slot) ? porSrc('tk_reina') : id;
      if (src && String(src).indexOf('tk_') === 0 && haveArt.has(src)) {
        return `<img class="gic ${cls || ''}${devilCls(src)}" src="img/tekken/${src}.webp" alt="" draggable="false" loading="lazy" decoding="async">`;
      }
      return _gi(id, emo, cls);
    };
  }

  const _por = UI.por;
  UI.por = function (id, cls, lazy, mood) {
    const src = (id && String(id).indexOf('tk_reina') === 0) ? porSrc(id) : id;
    if (src && String(src).indexOf('tk_') === 0 && haveArt.has(src)) {
      return `<img class="por tkbust ${cls || ''}${devilCls(src)}" ${lazy === false ? '' : 'loading="lazy"'} decoding="async" alt="" draggable="false" src="img/tekken/${src}.webp">`;
    }
    return _por.apply(this, arguments);
  };

  const _am = UI.artMetrics;
  if (_am) UI.artMetrics = function (art, mood) {
    if (art === 'tk_reina_jacket') return { w: 555, h: 1024, fx: 274, fy: 158, fw: 180, vh: 1024, img: true };
    if (art === 'tk_reina_top') return { w: 639, h: 1024, fx: 308, fy: 166, fw: 180, vh: 1024, img: true };
    if (art === 'tk_reina_top_bust') return { w: 512, h: 512, fx: 256, fy: 158, fw: 200, vh: 512, img: true };
    if (art === 'tk_gene') return { w: 512, h: 512, fx: 256, fy: 158, fw: 200, vh: 512, img: true };
    if (art && String(art).indexOf('tk_') === 0 && haveArt.has(art)) {
      return { w: 1024, h: 1024, fx: 512, fy: 410, fw: 360, vh: 1024, img: true };
    }
    return _am(art, mood);
  };

  const visCh = (s) => (E.tkVisibleChapters ? E.tkVisibleChapters(s) : D.TK_CH);
  const nextCh = (s) => {
    const t = E.tkEnsure(s);
    return visCh(s).find((c) => !t.story.includes(c.id) && E.tkChapterOpen(s, c.id)) || visCh(s).slice(-1)[0];
  };

  UI.tkBanner = function (s) {
    if (!E.tkActive()) {
      if (!(s && s.tk && s.tk.needAlly)) return '';
    }
    const t = E.tkEnsure(s), ch = nextCh(s) || {};
    const vis = visCh(s);
    const doneN = vis.filter((c) => t.story.includes(c.id)).length;
    const st = E.tkNextFighter(s) ? 'Этап ' + (t.won.length + 1) + '/' + D.TK_FIGHTERS.length : 'Турнир пройден';
    return `<button class="card tkbanner${UI.hasTkArt('banner') ? ' hasart' : ''}" data-act="tkOpen" data-quiet="1"><div class="tkart"></div><div class="tkbody"><b class="ttl">${gi('tk_event', '👊')} ${esc(D.TK_EVENT.n)}</b><div class="small dim tl">Побочный сюжет: Король Демонов в мире турнира Железного Кулака.</div><div class="row gap wrap small"><span>⏳ ${mm(E.tkLeft())}</span><span>${tok(t.tokens)}</span><span>${esc(st)}</span></div><div class="small">${esc(ch.n || '')} · ${doneN}/${vis.length} гл.</div></div></button>`;
  };

  const _city = UI.tabs.city;
  UI.tabs.city = function (s) {
    const h = _city(s), card = UI.tkBanner(s); if (!card) return h;
    const k = h.indexOf('<div class="card dailycard">');
    return k < 0 ? h.replace('<div class="campaign-heading">', card + '<div class="campaign-heading">') : h.slice(0, k) + card + h.slice(k);
  };
  const _dun = UI.tabs.dun;
  if (_dun) UI.tabs.dun = function (s) { const h = _dun(s), card = UI.tkBanner(s); return card ? card + h : h; };

  const _crew = UI.tabs.crew;
  if (_crew) UI.tabs.crew = function (s) {
    const hide = new Set((D.CREW_IDS || []).filter((id) => String(id).indexOf('tk_') === 0 && !s.crew[id]));
    const ids = D.CREW_IDS; D.CREW_IDS = ids.filter((id) => !hide.has(id));
    try { return _crew(s); } finally { D.CREW_IDS = ids; }
  };

  const _hearts = UI.tabs.hearts;
  if (_hearts) UI.tabs.hearts = function (s) {
    const ids = D.ROM_IDS;
    D.ROM_IDS = ids.filter((id) => {
      if (String(id).indexOf('tk_') !== 0) return true;
      return !!(s.crew[id] || (s.rom && s.rom[id] && (s.rom[id].aff | 0) > 0));
    });
    try { return _hearts(s); } finally { D.ROM_IDS = ids; }
  };

  UI.tkOpen = function (tab) {
    const s = UI.slot(), t = s && E.tkEnsure(s);
    if (!E.tkActive()) {
      if (t && t.needAlly) { UI.tkAllyModal(s); return; }
      UI.toast(E.tkWhyClosed() || 'Событие недоступно', 'bad'); return;
    }
    if (t && t.needAlly) { UI.tkAllyModal(s); return; }
    UI.tkTab = tab || UI.tkTab || 'story';
    const tabs = [['story', '📜 Сюжет'], ['tour', '🏆 Турнир'], ['daily', '⚔️ Бои'], ['shop', '🛒 Лавка']].map(([k, n]) => `<button class="fchip ${UI.tkTab === k ? 'on' : ''}" data-act="tkTab" data-k="${k}" data-quiet="1">${n}</button>`).join('');
    UI.modal(`<h3>${gi('tk_event', '👊')} ${esc(D.TK_EVENT.n)}</h3>
      <div class="small dim tl">${esc(D.TK_EVENT.disc)}</div>
      <div class="row between center-v small"><span>⏳ ${mm(E.tkLeft())}</span><b>${tok(t.tokens)}</b><span>попыток: ${E.tkDailyLeft(s)}/${D.TK_DAILY}</span></div>
      <div class="fchips">${tabs}</div>
      <div class="tkpane">${UI.tkPane(s)}</div>
      <button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall tkmodal' });
  };
  UI.act.tkOpen = () => UI.tkOpen();
  UI.act.tkTab = (el) => UI.tkOpen(el.dataset.k);

  UI.tkPane = function (s) {
    const t = E.tkEnsure(s);
    if (UI.tkTab === 'tour') {
      const next = E.tkNextFighter(s);
      const rows = D.TK_FIGHTERS.map((f, i) => {
        const done = E.tkWon(s, f.id), cur = next && next.id === f.id;
        return `<div class="tkrow ${done ? 'done' : cur ? 'cur' : 'lock'}">${por('tk_' + f.id, f.ic)}<div class="grow tl"><b>${i + 1}. ${esc(f.n)}</b><small class="dim">${done ? 'побеждён' : cur ? 'следующий бой' : 'закрыто'}</small></div>${cur ? `<button class="btn primary small" data-act="tkFight" data-k="tour" data-id="${f.id}">В бой</button>` : ''}</div>`;
      }).join('');
      return `<div class="small dim tl">Сетка турнира: ${t.won.length}/${D.TK_FIGHTERS.length}. Сначала одиннадцать знакомых лиц, затем остальные бойцы, включая DLC.</div>${rows}${!next ? '<div class="card center"><b>👑 Сетка пройдена</b></div>' : ''}`;
    }
    if (UI.tkTab === 'daily') {
      const left = E.tkDailyLeft(s);
      const rows = D.TK_FIGHTERS.filter((f) => E.tkWon(s, f.id)).map((f) => `<div class="tkrow">${por('tk_' + f.id, f.ic)}<div class="grow tl"><b>${esc(f.n)}</b><small class="dim">${tok(8)} за победу</small></div><button class="btn small ${left ? 'primary' : 'ghost'}" data-act="tkFight" data-k="daily" data-id="${f.id}" ${left ? '' : 'disabled'}>Реванш</button></div>`).join('');
      return `<div class="small dim tl">Повторные бои с уже пройденными бойцами. ${left} попыток сегодня.</div>${rows || '<div class="dim center pad">Сначала выиграйте бой в турнире.</div>'}`;
    }
    if (UI.tkTab === 'shop') {
      const rows = D.TK_SHOP.map((it) => {
        const got = it.once && t.shop[it.id], why = E.tkShopWhy(s, it.id), ic = gi('tk_' + it.id, it.ic);
        return `<div class="tkrow ${got ? 'done' : ''}">${ic}<div class="grow tl"><b>${esc(it.n)}</b><small>${tok(it.cost)}${got ? ' · получено' : why && why !== 'Не хватает жетонов' ? ' · ' + esc(why) : ''}</small></div><button class="btn small ${why ? 'ghost' : 'primary'}" data-act="tkBuy" data-id="${it.id}" ${why ? 'disabled' : ''}>Купить</button></div>`;
      }).join('');
      return `<div class="small dim tl">Жетоны тратятся здесь. Уникальные награды покупаются один раз и остаются после окончания коллабы.</div>${rows}`;
    }
    const vis = visCh(s);
    const rows = vis.map((c, i) => {
      const done = t.story.includes(c.id), open = E.tkChapterOpen(s, c.id), cur = open && !done;
      let act = '';
      if (cur && !c.fight) act = `<button class="btn primary small" data-act="tkPlay" data-id="${c.id}">Читать</button>`;
      else if (cur && c.fight) act = `<button class="btn ghost small" data-act="tkPlay" data-id="${c.id}">Сцена</button><button class="btn primary small" data-act="tkFight" data-k="story" data-id="${c.id}">Бой</button>`;
      else if (done) act = `<button class="btn ghost small" data-act="tkPlay" data-id="${c.id}" data-replay="1">Ещё раз</button>`;
      return `<div class="tkrow ${done ? 'done' : cur ? 'cur' : 'lock'}"><b>${i + 1}</b><div class="grow tl"><b>${esc(c.n)}</b><small class="dim">${esc((D.TK_SCENES[c.id] || {}).sub || '')}${c.fight ? ' · бой' : ''}</small></div>${act}</div>`;
    }).join('');
    return `<div class="small dim tl">Король Демонов попадает в мир турнира из-за Энтропии Реальности. Ваши выборы изменят финал этой истории, но не сюжет Хельмора.</div>${rows}`;
  };

  UI.act.tkBuy = (el) => { const s = UI.slot(); if (err(E.tkShopBuy(s, el.dataset.id))) return; UI.sfx('gold'); UI.save(true); UI.toast('Куплено', 'gold'); UI.tkOpen('shop'); };

  const prepSpeakers = (s) => {
    for (const k in D.TK_SPEAKERS) {
      const src = D.TK_SPEAKERS[k], sp = Object.assign({}, src);
      if (k === 'rei') {
        const t = s && s.tk;
        if (t && t.blood && UI.hasTkArt('tk_reina_devil')) sp.art = 'tk_reina_devil';
        else if (t && t.flags && t.flags.tk_reina_reveal && UI.hasTkArt('tk_reina_top')) sp.art = 'tk_reina_top';
        else sp.art = UI.hasTkArt('tk_reina_jacket') ? 'tk_reina_jacket' : (UI.hasTkArt('tk_reina') ? 'tk_reina' : null);
      }
      if (sp.art && !(UI.hasTkArt && UI.hasTkArt(sp.art))) delete sp.art;
      if (!D.SPEAKERS[k]) D.SPEAKERS[k] = sp;
      else {
        D.SPEAKERS[k].n = sp.n || D.SPEAKERS[k].n;
        if (sp.art) D.SPEAKERS[k].art = sp.art;
        if (sp.c) D.SPEAKERS[k].c = sp.c;
      }
    }
  };

  UI.act.tkPlay = async (el) => {
    const s = UI.slot(), id = el.dataset.id, sc = D.TK_SCENES[id], replay = !!el.dataset.replay;
    if (!sc) return; if (!replay && !E.tkChapterOpen(s, id)) { err('Глава ещё закрыта'); return; }
    UI.closeModal();
    prepSpeakers(s);
    const lines = E.tkSceneLines ? E.tkSceneLines(s, sc) : sc.lines;
    const _sf = E.setFlags, _fin = E.finishScene;
    E.setFlags = function (slot, f) { _sf(slot, f); const tk = E.tkEnsure(slot); Object.assign(tk.flags, f); };
    E.finishScene = function (slot, sid) { if (sid && String(sid).indexOf('tk') === 0) return; return _fin(slot, sid); };
    try { await UI.playLines(lines, { bg: sc.bg || 'void', replay, title: sc.t }); }
    finally { E.setFlags = _sf; E.finishScene = _fin; }
    if (!replay) {
      const ch = D.TK_CH_MAP[id];
      if (ch && ch.blood) {
        const yes = !!(s.story && s.story.flags && s.story.flags.tk_blood);
        E.tkGiveBlood(s, yes);
      }
      if (ch && ch.pick === 'ally') {
        const ok = await UI.tkAllyFlow(s);
        if (!ok) { UI.save(true); UI.tkOpen('story'); return; }
      }
      if (ch && ch.vow) {
        const ok = await UI.tkVowFlow(s);
        if (!ok) { UI.save(true); UI.tkOpen('story'); return; }
      }
      if (ch && !ch.fight) { const r = E.tkFinishChapter(s, id); if (r) err(r); else UI.toast('Глава завершена', 'gold'); }
    }
    UI.save(true); UI.tkOpen('story');
  };

  UI.tkAllyFlow = function (s) {
    const t = E.tkEnsure(s);
    if (t.ally) return Promise.resolve(true);
    return new Promise((resolve) => {
      UI._tkAllyDone = (ok) => { UI._tkAllyDone = null; resolve(!!ok); };
      UI.tkAllyModal(s, true);
    });
  };
  UI.tkAllyModal = function (s, fromStory) {
    const t = E.tkEnsure(s);
    const rows = (D.TK_KAZ_ALLIES || []).map((a) => {
      const c = D.CREW[a.id] || {};
      return `<button class="tkrow" data-act="tkPickAlly" data-id="${a.id}" data-quiet="1">${por(a.id, c.ic)}<div class="grow tl"><b>${esc(c.n || a.id)}</b><small class="dim">${esc(a.why || c.d || '')}</small></div></button>`;
    }).join('');
    UI.modal(`<h3>Союзник Кадзуи</h3><div class="small dim tl">Можно взять только одного. Кадзуя сам не пойдёт в Свиту.</div><div class="tkpane">${rows}</div>${fromStory ? '' : '<button class="btn ghost wide" data-act="closeModal">Позже</button>'}`, { cls: 'tall tkmodal' });
  };
  UI.act.tkPickAlly = (el) => {
    const s = UI.slot(), r = E.tkPickAlly(s, el.dataset.id);
    if (err(r)) return;
    UI.sfx('level'); UI.toast('В Свите: ' + ((D.CREW[el.dataset.id] || {}).n || el.dataset.id), 'gold');
    UI.save(true);
    if (UI._tkAllyDone) { UI.closeModal(); UI._tkAllyDone(true); }
    else UI.tkOpen('story');
  };

  UI.tkVowFlow = function (s) {
    const t = E.tkEnsure(s);
    if (t.vowDone || t.taken) { t.vowDone = 1; return Promise.resolve(true); }
    const can = E.tkRomCandidates(s);
    if (!can.length) { t.vowDone = 1; t.taken = 'none'; return Promise.resolve(true); }
    return new Promise((resolve) => {
      UI._tkVowDone = (ok) => { UI._tkVowDone = null; resolve(!!ok); };
      const rows = can.map((id) => {
        const c = D.CREW[id] || {}, aff = (s.rom[id] && s.rom[id].aff) || 0;
        return `<button class="tkrow" data-act="tkTakeGirl" data-id="${id}" data-quiet="1">${por(id, c.ic)}<div class="grow tl"><b>${esc(c.n || id)}</b><small class="dim">симпатия ${aff}</small></div></button>`;
      }).join('');
      UI.modal(`<h3>Одна клятва</h3><div class="small dim tl">Увести с собой можно только одну. Остальные уйдут без ссоры, но клятвы не будет.</div><div class="tkpane">${rows}</div><button class="btn ghost wide" data-act="tkTakeGirl" data-id="" data-quiet="1">Уйти одному</button>`, { cls: 'tall tkmodal' });
    });
  };
  UI.act.tkTakeGirl = (el) => {
    const s = UI.slot(), id = el.dataset.id || '';
    const r = E.tkTakeGirl(s, id || null);
    if (err(r)) return;
    UI.sfx('level');
    UI.toast(id ? ('Клятва: ' + ((D.CREW[id] || {}).n || id)) : 'Вы уходите одни.', 'gold');
    UI.save(true);
    if (UI._tkVowDone) { UI.closeModal(); UI._tkVowDone(true); }
    else UI.tkOpen('story');
  };

  UI.act.tkFight = async (el) => {
    const s = UI.slot(), B = E.tkBattle(s, el.dataset.k, el.dataset.id);
    if (B.err) { err(B.err); return; }
    UI.closeModal();
    const f = D.TK_FIGHTER[B.tk.fid];
    const ic = (UI.hasTkArt && UI.hasTkArt('tk_' + f.id)) ? undefined : f.ic;
    const rep = await UI.battle({ B, ic: f.ic, bio: 'ash', title: 'Железный Кулак · ' + f.n, finish: E.tkFinish });
    UI.save(true);
    if (rep && rep.result === 'win') UI.toast('Победа! ' + tok(rep.tokens || 0), 'gold');
    UI.tkOpen(el.dataset.k === 'daily' ? 'daily' : el.dataset.k === 'tour' ? 'tour' : 'story');
  };
})();
