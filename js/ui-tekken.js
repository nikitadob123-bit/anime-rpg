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
      // полный рост (jacket/top) только если его явно запросили — карточка романа
      if (id === 'tk_reina_jacket' || id === 'tk_reina_top') return id;
      return UI.hasTkArt('tk_reina') ? 'tk_reina' : id;
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

  D.TK_ART_HAVE = ["banner","bg_arena","bg_awaken","bg_coliseum","bg_dojo","bg_eastgate","bg_gcorp","bg_helmor","bg_jinhall","bg_kazbox","bg_lawdojo","bg_manhattan","bg_pier","bg_sanctuary","bg_service","bg_shore","tk_alisa","tk_anna","tk_armorking","tk_asuka","tk_azazel","tk_azucena","tk_bob","tk_bolt","tk_boy","tk_bryan","tk_claudio","tk_clive","tk_deviljin","tk_dragunov","tk_driver","tk_eddy","tk_event","tk_fahkumram","tk_feng","tk_fixer","tk_frame","tk_frame_dlg","tk_gene","tk_gloves","tk_heihachi","tk_hwoarang","tk_jack","tk_jin","tk_jun","tk_kazuya","tk_king","tk_kuma","tk_kuni","tk_lars","tk_law","tk_lee","tk_leo","tk_leroy","tk_lidia","tk_lili","tk_medic","tk_miary","tk_nina","tk_pack_m","tk_pack_s","tk_panda","tk_paul","tk_raven","tk_rec_jin","tk_rec_nina","tk_reina","tk_reina_devil","tk_reina_jacket","tk_reina_skin_armor","tk_reina_skin_catsuit","tk_reina_skin_evening","tk_reina_skin_shorts","tk_reina_skin_suit","tk_reina_skin_wedding","tk_reina_top","tk_reina_top_bust","tk_roger","tk_shaheen","tk_steve","tk_title","tk_token","tk_vendor","tk_victor","tk_xiaoyu","tk_ygg","tk_yoshimitsu","tk_yujiro","tk_zafina"]; // @tk-art-have
  const haveArt = new Set(D.TK_ART_HAVE);
  UI.hasTkArt = (id) => haveArt.has(id);

  UI.romCardPor = (id) => {
    const sk = (E.skinOf && E.skinOf(UI.slot && UI.slot(), id));
    if (sk && UI.hasTkArt(sk.img)) return '<img class="por lg tkfull" src="' + E.skinSrc(sk) + '" alt="" draggable="false">';
    if (id === 'tk_reina' && UI.hasTkArt('tk_reina_jacket')) return '<img class="por lg tkfull" src="img/tekken/tk_reina_jacket.webp" alt="" draggable="false">';
    return null;
  };
  if (typeof document !== 'undefined') {
    const rules = [];
    if (haveArt.has('banner')) rules.push('.tkbanner .tkart{background-image:url(img/tekken/banner.webp)}');
    haveArt.forEach((id) => {
      if (id.indexOf('bg_') === 0) rules.push('.bg-tk_' + id.slice(3) + '{background-image:url(img/tekken/' + id + '.webp)}');
    });
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
    const TALL = {
      tk_azazel: { fx: 512, fy: 500, fw: 520 },
      tk_driver: { fx: 512, fy: 430, fw: 390 },
      tk_vendor: { fx: 512, fy: 430, fw: 390 },
      tk_boy: { fx: 512, fy: 450, fw: 400 },
      tk_medic: { fx: 512, fy: 430, fw: 390 },
      tk_ygg: { fx: 512, fy: 420, fw: 380 },
      tk_fixer: { fx: 512, fy: 430, fw: 380 }
    };
    if (art && TALL[art]) return Object.assign({ w: 1024, h: 1536, vh: 1536, img: true }, TALL[art]);
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
    if (UI.tkTab === 'meets') {
      const list = (D.TK_MEETS || []).filter((m) => E.tkMeetOpen(s, m.id));
      const post = !!(t.ending && t.story.includes('tk19_home'));
      const rows = list.map((m) => {
        const done = (t.meets || []).includes(m.id);
        return `<div class="tkrow ${done ? 'done' : 'cur'}">${por(m.art || ('tk_' + m.id), '👊')}<div class="grow tl"><b>${esc(m.n)}</b><small class="dim">${esc(m.sub || '')}${done ? ' · прочитано' : ''}</small></div><button class="btn small ${done ? 'ghost' : 'primary'}" data-act="tkMeet" data-id="${m.id}" data-replay="${done ? 1 : ''}">${done && post ? 'Галерея бойцов' : done ? 'Ещё раз' : 'Поговорить'}</button></div>`;
      }).join('');
      const blood = (t.flags.tk_reina_join && !t.blood && t.story.includes('tk17_blood'))
        ? `<div class="card tl small">Рейна: «Я попрошу ещё раз. На этот раз знаю, как выглядит та сила, которой мне не хватало».<button class="btn primary wide" data-act="tkLateBlood">Принять кровь</button></div>` : '';
      return `<div class="small dim tl">${post ? 'Галерея бойцов — повтор встреч после титров.' : 'Личные встречи открываются по ходу истории. Спарринг — в турнире и ежедневных боях.'}</div>${blood}${rows || '<div class="dim center pad">Пока некого навестить. Продвиньтесь по сюжету.</div>'}`;
    }
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
      return !!(s.crew[id] || (s.rom && s.rom[id] && (s.rom[id].aff | 0) > 0) || (E.tkRomGate && E.tkRomGate(s, id, 0)));
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
    const tabs = [['story', '📜 Сюжет'], ['meets', '🤝 Встречи'], ['tour', '🏆 Турнир'], ['daily', '⚔️ Бои'], ['shop', '🛒 Лавка']].map(([k, n]) => `<button class="fchip ${UI.tkTab === k ? 'on' : ''}" data-act="tkTab" data-k="${k}" data-quiet="1">${n}</button>`).join('');
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
      if (cur) act = `<button class="btn primary small" data-act="tkPlay" data-id="${c.id}">Читать</button>`;
      else if (done) act = `<button class="btn ghost small" data-act="tkPlay" data-id="${c.id}" data-replay="1">Ещё раз</button>`;
      return `<div class="tkrow ${done ? 'done' : cur ? 'cur' : 'lock'}"><b>${i + 1}</b><div class="grow tl"><b>${esc(c.n)}</b><small class="dim">${esc((D.TK_SCENES[c.id] || {}).sub || '')}${c.fight ? ' · бой' : ''}</small></div>${act}</div>`;
    }).join('');
    return `<div class="small dim tl">По ту сторону Железного Кулака. Выбор стороны войны (слово Дзину, сделка с Кадзуей или наблюдатель) не закрывает Рейну: её путь независим, пока её не отказали на первой встрече.</div>${rows}`;
  };

  UI.act.tkBuy = (el) => { const s = UI.slot(); if (err(E.tkShopBuy(s, el.dataset.id))) return; UI.sfx('gold'); UI.save(true); UI.toast('Куплено', 'gold'); UI.tkOpen('shop'); };

  const prepSpeakers = (s) => {
    for (const k in D.TK_SPEAKERS) {
      const src = D.TK_SPEAKERS[k], sp = Object.assign({}, src);
      if (k === 'rei') {
        const t = s && s.tk;
        if (t && t.blood && UI.hasTkArt('tk_reina_devil')) sp.art = 'tk_reina_devil';
        else sp.art = UI.hasTkArt('tk_reina') ? 'tk_reina' : (sp.art || null);
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
  UI.tkPrepSpeakers = prepSpeakers;

  UI.act.tkPlay = async (el) => {
    const s = UI.slot(), id = el.dataset.id, sc = D.TK_SCENES[id], replay = !!el.dataset.replay;
    if (!sc) return; if (!replay && !E.tkChapterOpen(s, id)) { err('Глава ещё закрыта'); return; }
    UI.closeModal();
    prepSpeakers(s);
    if (id === 'tk10_coliseum') E.tkSide && E.tkSide(s, true);
    const lines = E.tkSceneLines ? E.tkSceneLines(s, sc) : sc.lines;
    const _sf = E.setFlags, _fin = E.finishScene;
    E.setFlags = function (slot, f) { _sf(slot, f); const tk = E.tkEnsure(slot); Object.assign(tk.flags, f); E.tkSyncFlags && E.tkSyncFlags(slot); };
    E.finishScene = function (slot, sid) { if (sid && String(sid).indexOf('tk') === 0) return; return _fin(slot, sid); };
    const ch = D.TK_CH_MAP[id];
    const split = (arr) => {
      const segs = []; let cur = { lines: [], fight: false };
      (arr || []).forEach((l) => {
        if (l && l[0] === 'fight') { cur.fight = true; segs.push(cur); cur = { lines: [], fight: false }; }
        else cur.lines.push(l);
      });
      if (cur.lines.length || !segs.length) segs.push(cur);
      return segs;
    };
    const opts = { bg: sc.bg || 'void', replay, title: sc.t, boxPor: true };
    try {
      const segs = split(lines);
      const foesRaw = (E.tkFightFor && ch) ? E.tkFightFor(s, ch) : (ch && ch.fight && ch.fight !== 'route' ? ch.fight : null);
      const foes = foesRaw ? [].concat(foesRaw) : [];
      let fi = 0;
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        if (seg.lines && seg.lines.length) await UI.playLines(seg.lines, opts);
        if (seg.fight || (i === segs.length - 1 && fi < foes.length)) {
          const need = seg.fight ? 1 : 0;
          const count = Math.max(need, (i === segs.length - 1 ? foes.length - fi : 0));
          const nFights = seg.fight ? Math.max(1, (foes.length && segs.filter((x) => x.fight).length === 1) ? foes.length - fi : 1) : count;
          const waves = seg.fight ? (segs.filter((x) => x.fight).length === 1 && foes.length > fi ? foes.length - fi : 1) : 0;
          const wcount = waves || nFights;
          for (let w = 0; w < wcount; w++) {
            const fid = foes[fi] || foes[foes.length - 1];
            fi++;
            if (!fid) break;
            let win = false;
            while (!win) {
              const B = E.tkBattle(s, 'story', fid);
              if (B.err) { err(B.err); break; }
              const f = (D.TK_FIGHTER && D.TK_FIGHTER[fid]) || (D.TK_STORY_FOES && D.TK_STORY_FOES[fid]) || { n: 'Противник', ic: '👊', id: fid };
              const rep = await UI.battle({ B, ic: f.ic, bio: 'ash', title: 'Железный Кулак · ' + f.n, finish: E.tkFinish });
              if (rep && rep.result === 'win') win = true;
              else {
                const loss = (D.TK_LOSS && (D.TK_LOSS[id] || D.TK_LOSS[fid])) || [['h', 'Ещё раз.', 'n']];
                await UI.playLines(loss, opts);
              }
            }
            if (!win) { UI.save(true); UI.tkOpen('story'); return; }
          }
        }
      }
    } finally { E.setFlags = _sf; E.finishScene = _fin; }
    if (!replay) {
      if (ch && ch.blood) {
        /* flags already set during the scene */
      }
      if (ch && ch.vow) {
        const ok = await UI.tkVowFlow(s);
        if (!ok) { UI.save(true); UI.tkOpen('story'); return; }
      }
      const r = E.tkFinishChapter(s, id); if (r) err(r); else UI.toast('Глава завершена', 'gold');
    }
    UI.save(true); UI.tkOpen('story');
  };

  UI.act.tkMeet = async (el) => {
    const s = UI.slot(), id = el.dataset.id, m = D.TK_MEET_MAP && D.TK_MEET_MAP[id];
    if (!m) return;
    if (!el.dataset.replay && !E.tkMeetOpen(s, id)) { err('Встреча ещё закрыта'); return; }
    UI.closeModal();
    prepSpeakers(s);
    const _sf = E.setFlags, _fin = E.finishScene;
    E.setFlags = function (slot, f) { _sf(slot, f); const tk = E.tkEnsure(slot); Object.assign(tk.flags, f); E.tkSyncFlags && E.tkSyncFlags(slot); };
    E.finishScene = function (slot, sid) { if (sid && String(sid).indexOf('tk') === 0) return; return _fin(slot, sid); };
    try { await UI.playLines(m.lines || [], { bg: m.bg || 'tk_dojo', title: m.n, boxPor: true }); }
    finally { E.setFlags = _sf; E.finishScene = _fin; }
    if (!el.dataset.replay) E.tkMeetDone(s, id);
    UI.save(true); UI.tkOpen('meets');
  };

  UI.act.tkLateBlood = () => {
    const s = UI.slot(), t = E.tkEnsure(s);
    if (t.blood) { err('Кровь уже дана'); return; }
    if (!t.flags.tk_reina_join) return;
    E.tkGiveBlood(s, 1);
    t.flags.tk_blood = 1;
    UI.sfx('level'); UI.toast('Рейна приняла кровь', 'gold');
    UI.save(true); UI.tkOpen('meets');
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
    const can = (E.tkRomCandidates(s) || []).filter((id) => {
      const r = s.rom && s.rom[id];
      const love = !!(s.story && s.story.flags && s.story.flags['love_' + id]);
      return love || (r && (r.aff | 0) >= 70);
    });
    return new Promise((resolve) => {
      UI._tkVowDone = (ok) => { UI._tkVowDone = null; resolve(!!ok); };
      const rows = can.map((id) => {
        const c = D.CREW[id] || {}, aff = (s.rom[id] && s.rom[id].aff) || 0;
        return `<button class="tkrow" data-act="tkTakeGirl" data-id="${id}" data-quiet="1">${por(id, c.ic)}<div class="grow tl"><b>${esc(c.n || id)}</b><small class="dim">Поговорить перед уходом · симпатия ${aff}</small></div></button>`;
      }).join('');
      UI.modal(`<h3>Одна клятва</h3><div class="small dim tl">Разлом открою под утро. До этого хочу договорить начатое. Можно выбрать один романтический финал или уйти без него. Служба Рейны, Нины и Дзина от этого не зависит.</div><div class="tkpane">${rows || '<div class="dim">Открытых сердечных линий пока нет.</div>'}</div><button class="btn ghost wide" data-act="tkTakeGirl" data-id="" data-quiet="1">Уйти без романа</button>`, { cls: 'tall tkmodal' });
    });
  };
  UI.act.tkTakeGirl = async (el) => {
    const s = UI.slot(), id = el.dataset.id || '';
    const r = E.tkTakeGirl(s, id || null);
    if (err(r)) return;
    UI.sfx('level');
    UI.closeModal();
    prepSpeakers(s);
    if (id) {
      const rom = D.ROMANCE && D.ROMANCE[id];
      const sc = rom && rom.scenes && rom.scenes[2];
      if (sc && sc.lines) await UI.playLines(sc.lines, { bg: sc.bg || 'tk_dojo', title: sc.t, boxPor: true });
      UI.toast('Клятва: ' + ((D.CREW[id] || {}).n || id), 'gold');
    } else {
      await UI.playLines([
        ['h', 'Утром ухожу. Если кто хотел сказать что-то перед дорогой, у нас ещё есть время.', 'n'],
        ['paul', 'Если попадёшь сюда снова, браслет не выбрасывай.', 'n'],
        ['h', 'Зачем?', 'n'],
        ['paul', 'По нему оформляют реванш. Я проверил.', 'n']
      ], { bg: 'tk_dojo', title: 'Уйти без романа', boxPor: true });
      UI.toast('Вы уходите одни.', 'gold');
    }
    UI.save(true);
    if (UI._tkVowDone) UI._tkVowDone(true);
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
