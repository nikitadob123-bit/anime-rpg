/* UI v2.29: «Коллаба: Железный Кулак» — баннер, сюжет, турнир, ежедневные бои, магазин. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { esc, fmt } = UI;
  const gi = (id, emo) => (UI.gi ? UI.gi(id, emo) : emo);
  const tok = (n) => gi('tk_token', D.TK_TOKEN.ic) + ' ' + fmt(n);
  const mm = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? d + ' д ' + h + ' ч' : h ? h + ' ч ' + m + ' мин' : m + ' мин'; };
  const err = (r) => { if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return true; } return false; };
  const por = (id, emo) => (UI.hasTkArt && UI.hasTkArt(id) ? `<img class="tkpor" src="img/tekken/${id}.webp" alt="" draggable="false">` : `<span class="tkemo">${emo || '👊'}</span>`);

  D.TK_ART_HAVE = []; // @tk-art-have
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
      if (id && String(id).indexOf('tk_') === 0 && haveArt.has(id)) {
        return `<img class="gic ${cls || ''}" src="img/tekken/${id}.webp" alt="" draggable="false" loading="lazy" decoding="async">`;
      }
      return _gi(id, emo, cls);
    };
  }

  const _por = UI.por;
  UI.por = function (id, cls, lazy, mood) {
    if (id && String(id).indexOf('tk_') === 0 && haveArt.has(id)) {
      return `<img class="por ${cls || ''}" ${lazy === false ? '' : 'loading="lazy"'} decoding="async" alt="" draggable="false" src="img/tekken/${id}.webp">`;
    }
    return _por.apply(this, arguments);
  };

  UI.tkBanner = function (s) {
    if (!E.tkActive()) return '';
    const t = E.tkEnsure(s), ch = D.TK_CH.find((c) => !t.story.includes(c.id) && E.tkChapterOpen(s, c.id)) || D.TK_CH[D.TK_CH.length - 1];
    const st = t.stage >= D.TK_FIGHTERS.length ? 'Турнир пройден' : 'Этап ' + (t.stage + 1) + '/' + D.TK_FIGHTERS.length;
    return `<button class="card tkbanner" data-act="tkOpen" data-quiet="1"><div class="tkart"></div><div class="tkbody"><b class="ttl">${gi('tk_event', '👊')} ${esc(D.TK_EVENT.n)}</b><div class="small dim tl">Побочный сюжет: Король Демонов в мире турнира Железного Кулака.</div><div class="row gap wrap small"><span>⏳ ${mm(E.tkLeft())}</span><span>${tok(t.tokens)}</span><span>${esc(st)}</span></div><div class="small">${esc(ch.n)} · ${t.story.length}/${D.TK_CH.length} гл.</div></div></button>`;
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
    const hide = new Set(['tk_jin', 'tk_nina'].filter((id) => !s.crew[id]));
    const ids = D.CREW_IDS; D.CREW_IDS = ids.filter((id) => !hide.has(id));
    try { return _crew(s); } finally { D.CREW_IDS = ids; }
  };

  UI.tkOpen = function (tab) {
    if (!E.tkActive()) { UI.toast(E.tkWhyClosed() || 'Событие недоступно', 'bad'); return; }
    UI.tkTab = tab || UI.tkTab || 'story';
    const s = UI.slot(), t = E.tkEnsure(s);
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
      const rows = D.TK_FIGHTERS.map((f, i) => {
        const done = t.stage > i, cur = t.stage === i, lock = t.stage < i;
        return `<div class="tkrow ${done ? 'done' : cur ? 'cur' : 'lock'}">${por('tk_' + f.id, f.ic)}<div class="grow tl"><b>${i + 1}. ${esc(f.n)}</b><small class="dim">${done ? 'побеждён' : cur ? 'следующий бой' : 'закрыто'}</small></div>${cur ? `<button class="btn primary small" data-act="tkFight" data-k="tour" data-id="${f.id}">В бой</button>` : ''}</div>`;
      }).join('');
      return `<div class="small dim tl">Сетка турнира: побеждайте бойцов по порядку. Награды — жетоны. Опыт вылазок здесь не даётся.</div>${rows}${t.stage >= D.TK_FIGHTERS.length ? '<div class="card center"><b>👑 Сетка пройдена</b></div>' : ''}`;
    }
    if (UI.tkTab === 'daily') {
      const left = E.tkDailyLeft(s);
      const rows = D.TK_FIGHTERS.filter((f) => t.best > f.i || t.stage > f.i).map((f) => `<div class="tkrow">${por('tk_' + f.id, f.ic)}<div class="grow tl"><b>${esc(f.n)}</b><small class="dim">${tok(8)} за победу</small></div><button class="btn small ${left ? 'primary' : 'ghost'}" data-act="tkFight" data-k="daily" data-id="${f.id}" ${left ? '' : 'disabled'}>Реванш</button></div>`).join('');
      return `<div class="small dim tl">Повторные бои с уже пройденными бойцами. ${left} попыток сегодня.</div>${rows || '<div class="dim center pad">Сначала выиграйте бой в турнире.</div>'}`;
    }
    if (UI.tkTab === 'shop') {
      const rows = D.TK_SHOP.map((it) => {
        const got = it.once && t.shop[it.id], why = E.tkShopWhy(s, it.id), ic = gi('tk_' + it.id, it.ic);
        return `<div class="tkrow ${got ? 'done' : ''}">${ic}<div class="grow tl"><b>${esc(it.n)}</b><small>${tok(it.cost)}${got ? ' · получено' : why && why !== 'Не хватает жетонов' ? ' · ' + esc(why) : ''}</small></div><button class="btn small ${why ? 'ghost' : 'primary'}" data-act="tkBuy" data-id="${it.id}" ${why ? 'disabled' : ''}>Купить</button></div>`;
      }).join('');
      return `<div class="small dim tl">Жетоны тратятся здесь. Уникальные награды покупаются один раз и остаются после окончания коллабы.</div>${rows}`;
    }
    const rows = D.TK_CH.map((c) => {
      const done = t.story.includes(c.id), open = E.tkChapterOpen(s, c.id), cur = open && !done;
      let act = '';
      if (cur && !c.fight) act = `<button class="btn primary small" data-act="tkPlay" data-id="${c.id}">Читать</button>`;
      else if (cur && c.fight) act = `<button class="btn ghost small" data-act="tkPlay" data-id="${c.id}">Сцена</button><button class="btn primary small" data-act="tkFight" data-k="story" data-id="${c.id}">Бой</button>`;
      else if (done) act = `<button class="btn ghost small" data-act="tkPlay" data-id="${c.id}" data-replay="1">Ещё раз</button>`;
      return `<div class="tkrow ${done ? 'done' : cur ? 'cur' : 'lock'}"><b>${c.i + 1}</b><div class="grow tl"><b>${esc(c.n)}</b><small class="dim">${esc((D.TK_SCENES[c.id] || {}).sub || '')}${c.fight ? ' · бой' : ''}</small></div>${act}</div>`;
    }).join('');
    return `<div class="small dim tl">Король Демонов попадает в мир турнира из-за Энтропии Реальности. Ваши выборы изменят финал этой истории, но не сюжет Хельмора.</div>${rows}`;
  };

  UI.act.tkBuy = (el) => { const s = UI.slot(); if (err(E.tkShopBuy(s, el.dataset.id))) return; UI.sfx('gold'); UI.save(true); UI.toast('Куплено', 'gold'); UI.tkOpen('shop'); };

  UI.act.tkPlay = async (el) => {
    const s = UI.slot(), id = el.dataset.id, sc = D.TK_SCENES[id], replay = !!el.dataset.replay;
    if (!sc) return; if (!replay && !E.tkChapterOpen(s, id)) { err('Глава ещё закрыта'); return; }
    UI.closeModal();
    for (const k in D.TK_SPEAKERS) {
      const src = D.TK_SPEAKERS[k], sp = Object.assign({}, src);
      if (sp.art && !(UI.hasTkArt && UI.hasTkArt(sp.art))) delete sp.art;
      if (!D.SPEAKERS[k]) D.SPEAKERS[k] = sp;
      else if (!D.SPEAKERS[k].art && sp.art) D.SPEAKERS[k].art = sp.art;
    }
    const _sf = E.setFlags, _fin = E.finishScene;
    E.setFlags = function (slot, f) { _sf(slot, f); const tk = E.tkEnsure(slot); Object.assign(tk.flags, f); };
    E.finishScene = function (slot, sid) { if (sid && String(sid).indexOf('tk') === 0) return; return _fin(slot, sid); };
    try { await UI.playLines(sc.lines, { bg: sc.bg || 'void', replay, title: sc.t }); }
    finally { E.setFlags = _sf; E.finishScene = _fin; }
    if (!replay) {
      const ch = D.TK_CH_MAP[id];
      if (ch && !ch.fight) { const r = E.tkFinishChapter(s, id); if (r) err(r); else UI.toast('Глава завершена', 'gold'); }
    }
    UI.save(true); UI.tkOpen('story');
  };

  UI.act.tkFight = async (el) => {
    const s = UI.slot(), B = E.tkBattle(s, el.dataset.k, el.dataset.id);
    if (B.err) { err(B.err); return; }
    UI.closeModal();
    const f = D.TK_FIGHTER[B.tk.fid];
    const rep = await UI.battle({ B, ic: f.ic, bio: 'ash', title: 'Железный Кулак · ' + f.n, finish: E.tkFinish });
    UI.save(true);
    if (rep && rep.result === 'win') UI.toast('Победа! ' + tok(rep.tokens || 0), 'gold');
    UI.tkOpen(el.dataset.k === 'daily' ? 'daily' : el.dataset.k === 'tour' ? 'tour' : 'story');
  };
})();
