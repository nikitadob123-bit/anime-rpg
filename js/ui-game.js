/* UI: игровой экран и вкладки */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, S = RPG.S, A = RPG.A, UI = RPG.UI;
  const { $, $$, esc, fmt } = UI;
  D.RACE_IDS = D.RACE_IDS || Object.keys(D.RACES);
  const TABS = [['city', '🏰', 'Город'], ['story', '📖', 'Сюжет'], ['dun', '🗝️', 'Вылазки'], ['hero', '👑', 'Герой'], ['skills', '🌟', 'Силы'], ['crew', '🛡️', 'Свита'], ['hearts', '💞', 'Сердца'], ['prof', '⚒️', 'Ремесло'], ['inv', '🎒', 'Сумка'], ['set', '⚙️', 'Меню']];
  UI.TABS = TABS;
  UI.sub = { skills: 'root', crew: null, hearts: null, prof: null, inv: 'gear', filt: 'all', shop: 'gear' };
  const rar = (it) => D.RARITY[it.r];
  const bar = (v, max, cl) => `<span class="bar ${cl || ''}"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i></span>`;
  const matTxt = (m, slot) => Object.keys(m || {}).map((k) => { const have = (slot.mats[k] || 0), ok = have >= m[k]; return `<span class="mat ${ok ? 'ok' : 'no'}">${D.MATS[k].ic} ${D.MATS[k].n} ${have}/${m[k]}</span>`; }).join('');
  const label = (k) => D.STAT_N[k] || D.FLAT[k] || (D.MODN[k] || k).replace(/\s*%$/, '');
  const statLine = (k, v) => { const pct = !D.STAT_N[k] && !D.FLAT[k]; v = Math.round(v * 10) / 10; return `<span class="il"><b>+${v}${pct ? '%' : ''}</b> ${label(k)}</span>`; };
  UI.itemStats = (it) => Object.keys(it.st).map((k) => statLine(k, it.st[k] * (D.STAT_N[k] || D.FLAT[k] ? 1 + 0.09 * (it.up || 0) : 1))).join('');
  UI.itemName = (it) => `<span style="color:${rar(it).c}">${esc(it.nm)}${it.up ? ' +' + it.up : ''}</span>`;
  const itemRow = (it, act, extra) => `<button class="item" style="--rc:${rar(it).c}" data-act="${act}" data-id="${it.id}" data-quiet="1"><span class="ico">${D.BASES[it.k].ic}</span><span class="grow tl"><b>${UI.itemName(it)}</b>${it.lock ? ' 🔒' : ''}${it.en ? ' ✨' : ''}<small>${rar(it).n} · ${D.SLOTS[it.sl]} · ур.${it.il}</small></span>${extra || ''}</button>`;
  UI.itemRow = itemRow;

  // ───── Вход в игру ─────
  UI.enterGame = async function (isNew) {
    UI.t0 = Date.now(); const st = UI.p.settings; A.set({ on: st.sound, music: st.music, vol: st.vol }); UI.applySettings();
    UI.tab = 'city'; UI.v = 'game'; UI.render();
    const s = UI.slot();
    if (isNew || (!s.story.done.includes('prologue') && !s.run)) { await UI.playScene('prologue'); UI.save(true); await UI.autoStory(); UI.render(); }
    else await UI.autoStory();
    if (st.tutorial && !s.tut.guide) { s.tut.guide = 1; UI.save(true); UI.tutorial(); }
  };
  UI.applySettings = function () {
    const st = UI.p.settings; document.body.classList.toggle('noshake', !st.shake); document.body.classList.toggle('nopart', !st.particles);
    try { RPG.F.setMode(st.particles ? 'embers' : 'none'); } catch (e) { /* ignore */ }
  };
  // сцены, которые идут сами (после подземелья / начало 1 главы)
  UI.isPre = (id) => { const st = D.STORY.find((x) => x.id === id); return !!(st && st.pre); };
  UI.autoStory = async function () {
    const s = UI.slot(); let guard = 6;
    while (guard--) {
      const n = E.nextScene(s); if (!n || UI.isPre(n.id)) break;
      if (!(n.need && n.need.clear) && n.id !== 'ch1_a') break;
      await UI.playScene(n.id); UI.save(true);
    }
    if (UI.v === 'game') UI.render();
  };
  UI.nextStory = function (s) {
    const n = D.STORY.find((x) => !s.story.done.includes(x.id) && !UI.isPre(x.id));
    if (!n) return null; return { st: n, ok: E.sceneAvail(s, n.id) };
  };

  // ───── Рендер ─────
  UI.refresh = function (keep) { const c = $('.content'); const sc = c ? c.scrollTop : 0; UI.renderGame(); const c2 = $('.content'); if (c2 && keep !== false) c2.scrollTop = sc; };
  UI.renderGame = function () {
    const s = UI.slot(), h = s.hero, main = $('#view');
    const need = D.xpNeed(h.level);
    const sp = E.sp(h), up = E.up(h);
    main.innerHTML = `<div class="gtop"><div class="gh">${UI.por(h.portrait, 'xs', false)}<div class="grow tl"><b>${esc(h.name)}</b><div class="xpb">${bar(h.level >= D.LEVEL_CAP ? 1 : h.xp, h.level >= D.LEVEL_CAP ? 1 : need, 'xp')}<small>Ур. ${h.level}</small></div></div><div class="gold">🪙 ${fmt(s.gold)}</div><i id="saveDot" class="sdot" title="Сохранено"></i></div></div>
      <div class="content tab-${UI.tab}">${(UI.tabs[UI.tab])(s)}</div>`;
    $$('#nav button').forEach((b) => { const t = b.dataset.t; b.classList.toggle('on', t === UI.tab); const badge = b.querySelector('.nb'); if (badge) badge.remove(); const n = t === 'skills' ? sp + up : 0; if (n > 0) b.insertAdjacentHTML('beforeend', `<span class="nb">${n}</span>`); if (t === 'city') { const ns = UI.nextStory(s); if (ns && ns.ok && !s.run) b.insertAdjacentHTML('beforeend', '<span class="nb dot">!</span>'); } });
    if (UI.tab === 'city') try { RPG.F.setMode(UI.p.settings.particles ? 'embers' : 'none'); } catch (e) { /* ignore */ }
  };
  UI.act.tab = (el) => { UI.tab = el.dataset.t; UI.sfx('tab'); UI.renderGame(); const c = $('.content'); if (c) c.scrollTop = 0; };
  UI.act.sub = (el) => { UI.sub[el.dataset.k] = el.dataset.v; UI.refresh(false); };

  UI.tabs = {};
  // ═════ ГОРОД ═════
  UI.tabs.city = function (s) {
    const h = s.hero, ns = UI.nextStory(s), un = E.recruited(s);
    let story;
    if (!ns) story = `<div class="card story done"><b>Первая арка завершена</b><div class="small dim">Апостол Света пал. Врата Богов приоткрыты — но то, что за ними, ещё ждёт. Продолжение следует.</div></div>`;
    else if (ns.ok) story = `<div class="card story glow"><div class="small gold">Сюжет</div><b>${esc(D.SCENES[ns.st.id].t)}: ${esc(D.SCENES[ns.st.id].sub)}</b><button class="btn primary wide" data-act="playNext" id="btnStory">▶ Продолжить историю</button></div>`;
    else story = `<div class="card story"><div class="small gold">Цель</div><b>${esc(D.SCENES[ns.st.id].t)}: ${esc(D.SCENES[ns.st.id].sub)}</b><div class="small dim">${esc(ns.st.hint || '')}</div><button class="btn ghost wide" data-act="tab" data-t="dun">К вылазкам</button></div>`;
    const run = s.run ? `<button class="card tap runbar" data-act="tab" data-t="dun"><b>⚔️ Вылазка идёт: ${D.DUN[s.run.did].n}</b><div class="small dim">Узел ${s.run.node + 1} из ${s.run.nodes.length}. Нажмите, чтобы продолжить.</div></button>` : '';
    const sp = E.sp(h) + E.up(h);
    const party = un.length ? `<div class="small dim">Отряд: ${s.party.map((c) => D.CREW[c].n).join(', ') || 'не выбран'} · свободных вечеров: ${s.crewTalk || 0}</div>` : '';
    const rp = UI.romPending ? UI.romPending(s) : 0;
    return `<div class="hub"><div class="bg bg-hub"><div class="sil sil-ruins"></div></div><div class="hubtxt"><h2>Лагерь у руин Хельмора</h2><p>Город стёрт. Над пустотой — Нимб, что смотрит на вас.</p></div></div>
      ${story}${run}
      ${sp ? `<button class="card tap hint" data-act="tab" data-t="skills">🌟 Есть неиспользованные очки: <b>${sp}</b></button>` : ''}
      ${rp ? `<button class="card tap hint" data-act="tab" data-t="hearts">💞 Новых сцен с героинями: <b>${rp}</b></button>` : ''}
      <div class="bgrid">
        <button class="bld" data-act="shop" data-quiet="1"><span>🏪</span><b>Лавка</b><small>Снаряжение, зелья, подарки</small></button>
        <button class="bld" data-act="forge" data-quiet="1"><span>⚒️</span><b>Кузница</b><small>Улучшение до +${E.upCap(s)}</small></button>
        <button class="bld" data-act="tavern" data-quiet="1"><span>🔥</span><b>Костёр</b><small>Слухи и разговоры</small></button>
        <button class="bld" data-act="altar" data-quiet="1"><span>🕯️</span><b>Алтарь троп</b><small>Сброс Сил</small></button>
      </div>${party}
      <div class="card small"><b>Подсказка дня</b><div class="dim">${tip()}</div><button class="btn ghost small" data-act="tutorial">📘 Обучение</button></div>`;
  };
  const TIPS = ['Враги показывают намерение значком над собой. ⚠️ — готовится мощный удар: прикройтесь щитом или оглушите врага.', 'Стихии складываются: «Промокший» + молния = разряд; «Промокший» + лёд = заморозка; «Охлаждённый» + огонь = паровой взрыв.', 'Профессия «Травник/Шахтёр/Охотник/Рыбак» даёт больше добычи в событиях подземелий и позволяет ходить на промысел.', 'Еда и эликсиры действуют до конца вылазки — принимайте их перед входом.', 'Легендарные предметы выпадают с боссов на высоких сложностях. Лёд, молния и огонь — у каждого босса свои слабости.', 'Сложность растёт: пройдите подземелье на «Обычном», чтобы открыть «Героический», и дальше.', 'Мантра Силы: каждый ход боя удваивает атаку и защиту по значениям до боя — но только на этот бой.', 'Дуэли с героиней Света: победа открывает выбор — пощадить или убить. Пощажённая может присоединиться.', 'Верность Свиты растёт от решений в сюжете и подарков. Низкая верность — шанс, что подчинённый не послушается.', 'Свидания в «Сердцах» — тёплые и безопасные; они дают постоянные бонусы.'];
  const tip = () => TIPS[(new Date().getDate() + (UI.slot() ? UI.slot().stats.runs : 0)) % TIPS.length];
  UI.act.playNext = async () => { const s = UI.slot(), ns = UI.nextStory(s); if (!ns || !ns.ok) return; await UI.playScene(ns.st.id); UI.save(true); await UI.autoStory(); UI.refresh(false); };
  UI.act.tutorial = () => UI.tutorial();

  // ═════ ЛАВКА ═════
  UI.act.shop = () => { UI.sub.shop = UI.sub.shop || 'gear'; UI.shopModal(); };
  UI.shopModal = function () {
    const s = UI.slot(), t = UI.sub.shop; const tb = [['gear', 'Снаряжение'], ['cons', 'Расходники'], ['mats', 'Материалы'], ['gifts', 'Подарки'], ['sell', 'Продать']];
    let body = '';
    if (t === 'gear') {
      const disc = Math.min(30, E.collect(s).mods.discount || 0);
      body = E.shopStock(s).map((it, i) => { const p = Math.round(E.buyPrice(it) * (1 - disc / 100)); const usable = E.canUse(s.hero, it); return `<div class="item" style="--rc:${rar(it).c}"><span class="ico">${D.BASES[it.k].ic}</span><span class="grow tl"><b>${UI.itemName(it)}</b><small>${D.SLOTS[it.sl]} · ур.${it.il} ${UI.itemStats(it)}</small></span><button class="btn small ${s.gold >= p && usable ? 'primary' : 'ghost'}" data-act="buyGear" data-i="${i}" data-quiet="1">🪙 ${fmt(p)}</button></div>`; }).join('') + (disc ? `<div class="small dim">Скидка торговца: ${disc}%</div>` : '') + `<div class="small dim">Ассортимент растёт с каждым пройденным подземельем.</div>`;
    } else if (t === 'cons') {
      body = E.SHOP_CONS.map((id) => { const c = D.CONS[id], p = E.consBuy(id); return `<div class="item"><span class="ico">${c.ic}</span><span class="grow tl"><b>${c.n}</b> <small>есть: ${s.cons[id] || 0} · ${c.d}</small></span><button class="btn small ${s.gold >= p ? 'primary' : 'ghost'}" data-act="buyCons" data-id="${id}" data-quiet="1">🪙 ${p}</button></div>`; }).join('');
    } else if (t === 'gifts') {
      body = UI.giftShop(s);
    } else if (t === 'mats') {
      body = E.SHOP_MATS.map((id) => { const m = D.MATS[id], p = E.matBuy(id); return `<div class="item"><span class="ico">${m.ic}</span><span class="grow tl"><b>${m.n}</b> <small>в сумке: ${s.mats[id] || 0}</small></span><button class="btn small ${s.gold >= p ? 'primary' : 'ghost'}" data-act="buyMat" data-id="${id}" data-quiet="1">🪙 ${p}</button><button class="btn small ${s.gold >= p * 5 ? 'primary' : 'ghost'}" data-act="buyMat" data-id="${id}" data-n="5" data-quiet="1">×5</button></div>`; }).join('');
    } else {
      const junk = s.inv.filter((x) => x.r <= 1 && !x.lock);
      body = `<div class="row gap"><button class="btn ghost grow small" data-act="sellJunk" data-r="0">Продать обычное (${s.inv.filter((x) => x.r === 0 && !x.lock).length})</button><button class="btn ghost grow small" data-act="sellJunk" data-r="1">+ необычное (${junk.length})</button></div>` +
        Object.keys(s.mats).filter((k) => s.mats[k] > 0 && D.MATS[k]).map((k) => `<div class="item"><span class="ico">${D.MATS[k].ic}</span><span class="grow tl"><b>${D.MATS[k].n}</b> <small>×${s.mats[k]}</small></span><button class="btn small ghost" data-act="sellMat" data-id="${k}" data-n="1" data-quiet="1">🪙 ${E.matSell(k)}</button><button class="btn small ghost" data-act="sellMat" data-id="${k}" data-n="99" data-quiet="1">все</button></div>`).join('') +
        s.inv.slice().sort((a, b) => b.r - a.r || b.il - a.il).map((it) => itemRow(it, 'sellItem', `<span class="btn small ghost">🪙 ${E.sellPrice(it)}</span>`)).join('') || '';
    }
    UI.modal(`<div class="row center-v"><h3 class="grow m0">🏪 Лавка беженцев</h3><b>🪙 ${fmt(s.gold)}</b></div><div class="seg small">${tb.map(([k, n]) => `<button class="${t === k ? 'on' : ''}" data-act="shopTab" data-v="${k}" data-quiet="1">${n}</button>`).join('')}</div><div class="mlist">${body || '<div class="dim center pad">Пусто</div>'}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  const keepScroll = (fn) => { const l = $('.mlist'); const sc = l ? l.scrollTop : 0; fn(); const l2 = $('.mlist'); if (l2) l2.scrollTop = sc; };
  UI.act.shopTab = (el) => { UI.sub.shop = el.dataset.v; UI.shopModal(); };
  UI.act.buyGear = (el) => { const r = E.buyShopItem(UI.slot(), +el.dataset.i); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); } else { UI.sfx('gold'); UI.toast('Куплено', 'ok'); UI.save(true); } keepScroll(UI.shopModal); UI.refresh(); };
  UI.act.buyCons = (el) => { if (E.buyCons(UI.slot(), el.dataset.id, 1)) { UI.sfx('gold'); UI.save(true); } else { UI.toast('Не хватает золота', 'bad'); UI.sfx('err'); } keepScroll(UI.shopModal); UI.refresh(); };
  UI.act.buyMat = (el) => { if (E.buyMat(UI.slot(), el.dataset.id, +(el.dataset.n || 1))) { UI.sfx('gold'); UI.save(true); } else { UI.toast('Не хватает золота', 'bad'); UI.sfx('err'); } keepScroll(UI.shopModal); UI.refresh(); };
  UI.act.sellMat = (el) => { const g = E.sellMat(UI.slot(), el.dataset.id, +el.dataset.n); if (g) { UI.sfx('gold'); UI.save(true); } keepScroll(UI.shopModal); UI.refresh(); };
  UI.act.sellItem = (el) => { const it = E.findItem(UI.slot(), +el.dataset.id); if (it && (it.r >= 3)) { UI.confirm('Продать?', `${UI.itemName(it)} — редкая вещь. Продать за 🪙 ${E.sellPrice(it)}?`, 'Продать', () => { E.sell(UI.slot(), it.id); UI.save(true); UI.shopModal(); UI.refresh(); }); return; } E.sell(UI.slot(), +el.dataset.id); UI.sfx('gold'); UI.save(true); keepScroll(UI.shopModal); UI.refresh(); };
  UI.act.sellJunk = (el) => { const g = E.sellJunk(UI.slot(), +el.dataset.r); UI.toast(g ? `+${fmt(g)} 🪙` : 'Нечего продавать', g ? 'ok' : ''); if (g) UI.sfx('gold'); UI.save(true); UI.shopModal(); UI.refresh(); };

  // ═════ КУЗНИЦА ═════
  UI.act.forge = () => UI.forgeModal();
  UI.forgeModal = function () {
    const s = UI.slot(), cap = E.upCap(s), items = Object.values(s.eq).filter(Boolean).concat(s.inv.filter((x) => x.r >= 1)).slice(0, 40);
    const rows = items.map((it) => { const maxed = (it.up || 0) >= cap, c = E.upCost(s, it), ok = E.canAfford(s, c); return `<div class="item" style="--rc:${rar(it).c}"><span class="ico">${D.BASES[it.k].ic}</span><span class="grow tl"><b>${UI.itemName(it)}</b>${s.eq[it.sl] === it ? ' <small>(надето)</small>' : ''}<small>${maxed ? 'максимум +' + cap : '🪙 ' + c.gold + ' ' + matTxt(c.mats, s)}</small></span>${maxed ? '' : `<button class="btn small ${ok ? 'primary' : 'ghost'}" data-act="upgrade" data-id="${it.id}" data-quiet="1">+${(it.up || 0) + 1}</button>`}</div>`; }).join('');
    UI.modal(`<h3>⚒️ Кузница Брума</h3><div class="small dim tl">Каждый уровень даёт +9% к характеристикам предмета. Предел: +${cap}${cap === 3 ? ' (кузнец-мастер улучшает до +6 и со скидкой 25%)' : ' — вы кузнец!'}.</div><div class="mlist">${rows || '<div class="dim center pad">Нет предметов для улучшения</div>'}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.upgrade = (el) => { const s = UI.slot(), it = E.findItem(s, +el.dataset.id); const r = E.upgrade(s, it); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); } else { UI.sfx('forge'); UI.toast(`${esc(it.nm)} +${it.up}`, 'ok'); UI.save(true); } keepScroll(UI.forgeModal); UI.refresh(); };

  // ═════ ТАВЕРНА / АЛТАРЬ ═════
  UI.act.tavern = () => UI.tavernModal();
  UI.tavernModal = function () {
    const s = UI.slot();
    const rumors = ['У Собора Пяти Богов с каждым днём больше стражи. Они боятся не вас, а того, что вы сделаете с их богами.', 'Говорят, героини Света бьют сильнее, когда рядом нет Апостола, — и слабее, когда им нечего защищать.', 'Беженцы шепчутся, что Нимб над руинами стал тоньше. Или это просто устали глаза.', 'Ильвара не спит. Просто лежит с открытым глазом и считает звёзды, которых нет.', 'Мантра Силы растёт с каждым ударом, но её цена — расчёт: кто ударит первым, тот и накопит больше.', 'Подчинённым нравится, когда о них помнят: слово у костра иногда стоит дороже меча.'];
    UI.modal(`<h3>🔥 Костёр лагеря</h3><div class="small dim tl">Здесь собираются те, кто пошёл за вами. Вечера, проведённые у костра (${s.crewTalk || 0}), можно потратить на разговор — во вкладках «Свита» и «Сердца».</div><div class="mlist">${rumors.map((r) => `<div class="card small tl dim">«${r}»</div>`).join('')}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`);
  };
  UI.act.altar = () => { const s = UI.slot(), c = E.respecCost(s.hero); UI.modal(`<h3>🕯️ Алтарь забытых троп</h3><div class="small tl dim">Нимб помнит все пути. За плату она позволит выбрать их заново: очки вернутся к вам.</div><div class="row gap"><button class="btn ${s.gold >= c ? 'primary' : 'ghost'} grow" data-act="respec" data-w="c">Древо класса<br><small>🪙 ${fmt(c)}</small></button><button class="btn ${s.gold >= c ? 'primary' : 'ghost'} grow" data-act="respec" data-w="u">Древо Эха<br><small>🪙 ${fmt(c)}</small></button></div><div class="small dim">Профессии и класс изменить нельзя.</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`); };
  UI.act.respec = (el) => { const s = UI.slot(); if (s.run) { UI.toast('Не во время вылазки', 'bad'); return; } if (!E.respec(s, el.dataset.w)) { UI.toast('Не хватает золота', 'bad'); UI.sfx('err'); return; } UI.sfx('level'); UI.toast('Очки возвращены', 'ok'); UI.save(true); UI.closeModal(); UI.refresh(); };

  // ═════ СЮЖЕТ ═════
  UI.tabs.story = function (s) {
    const wcount = (id) => D.sceneWords ? D.sceneWords(id) : 0;
    const items = D.STORY.filter((st) => !st.pre).map((st, i) => {
      const sc = D.SCENES[st.id], done = s.story.done.includes(st.id), ok = E.sceneAvail(s, st.id);
      const st2 = done ? '<span class="tag ok">прочитано</span>' : ok ? '<span class="tag new">новое</span>' : '<span class="tag">закрыто</span>';
      const mid = false;
      return `<div class="card chap ${done ? 'done' : ''} ${ok || done ? '' : 'lockd'}"><div class="row gap center-v"><div class="cn">${i}</div><div class="grow tl"><b>${esc(sc.t)}</b><div class="dim small">${esc(sc.sub)}</div></div>${st2}</div>${done ? `<button class="btn ghost small" data-act="replay" data-id="${st.id}">↺ Перечитать</button>` : ok && !mid ? `<button class="btn primary small" data-act="replay" data-id="${st.id}" data-real="1">▶ Читать</button>` : `<div class="small dim tl">${esc(mid ? 'Эта сцена произойдёт в Соборе Безмолвия.' : st.hint || '')}</div>`}</div>`;
    }).join('');
    const choices = [];
    D.STORY.forEach((st) => { if (!s.story.done.includes(st.id)) return; D.SCENES[st.id].lines.forEach((l) => { if (l[0] !== 'choice') return; const opt = l[1].find((o) => Object.keys(o.f || {}).length && Object.keys(o.f).every((k) => s.story.flags[k] === o.f[k])); if (opt) choices.push(`<li><b>${esc(D.SCENES[st.id].t)}:</b> ${esc(opt.t)}</li>`); }); });
    return `<h2>Сюжет</h2><div class="small dim tl">«Нимб Мира» — Арка 1: Король Демонов. Прочитанные сцены можно перечитать.</div>${items}<div class="card"><b>Ваши решения</b><ul class="perks small">${choices.join('') || '<li class="dim">Пока ничего не решено</li>'}</ul></div>`;
  };
  UI.act.replay = async (el) => { const id = el.dataset.id, s = UI.slot(), real = !!el.dataset.real && !s.story.done.includes(id); if (s.run && !real) { /* ok */ } await UI.playScene(id, !real); if (real) { UI.save(true); await UI.autoStory(); } UI.refresh(false); };

  // ═════ ГЕРОЙ ═════
  UI.tabs.hero = function (s) {
    const h = s.hero, d = E.derive(s), cls = D.CLASSES[h.cls], race = D.RACES[h.race], c = E.collect(s);
    const mods = Object.keys(c.mods).filter((k) => c.mods[k] && D.MODN[k]).map((k) => `<span class="chip">${c.mods[k] > 0 && !/aken/.test(k) ? '+' : ''}${Math.round(c.mods[k] * 10) / 10} ${(D.MODN[k]).replace(/\s*%$/, '')}${/%$/.test(D.MODN[k]) ? '%' : ''}</span>`).join('');
    const eq = Object.keys(D.SLOTS).map((sl) => { const it = s.eq[sl]; return `<button class="eqs" style="--rc:${it ? rar(it).c : '#444'}" data-act="${it ? 'itemOpen' : 'tab'}" data-id="${it ? it.id : ''}" data-t="inv"><span>${it ? D.BASES[it.k].ic : D.SLOT_IC[sl]}</span><small>${it ? esc(it.nm) + (it.up ? ' +' + it.up : '') : D.SLOTS[sl]}</small></button>`; }).join('');
    const st = s.stats;
    return `<div class="herocard"><div class="bg bg-hero"></div>${UI.por(h.portrait, 'xl', false)}<div class="hinfo"><h2 class="m0">${esc(h.name)}</h2><div class="dim">Король Демонов · ${race.n} · ур. ${h.level}${h.level >= D.LEVEL_CAP ? ' (макс.)' : ''}</div><div class="dim small">Мощь ${fmt(E.power(s))}</div><div class="xpb">${bar(h.level >= D.LEVEL_CAP ? 1 : h.xp, h.level >= D.LEVEL_CAP ? 1 : D.xpNeed(h.level), 'xp')}<small>${h.level >= D.LEVEL_CAP ? 'МАКС' : fmt(h.xp) + ' / ' + fmt(D.xpNeed(h.level))}</small></div></div></div>
      ${UI.statsCard(s, d)}
      <div class="card"><b>Снаряжение</b><div class="eqgrid">${eq}</div></div>
      <div class="card"><b>${race.ic} ${race.pn}</b> <span class="dim small">(прошлое: ${race.n})</span><div class="small tl dim">${race.pd}</div><b>${cls.ic} Перки класса</b><ul class="perks small">${cls.perks.map((p) => `<li><b>${p.n}</b> — ${p.d}</li>`).join('')}</ul><div class="small tl dim"><b>${cls.rc.n}:</b> копится в бою и усиливает навыки.</div></div>
      <div class="card"><b>Все бонусы</b><div class="chips">${mods || '<span class="dim">нет</span>'}</div></div>
      <div class="card small"><b>Путь</b><div class="dim">Вылазок: ${st.runs} · побед над боссами: ${st.wins} · поражений: ${st.deaths}<br>Врагов повержено: ${fmt(st.kills)} · создано: ${st.crafted} · добыто: ${st.gathered}<br>Заработано золота: ${fmt(st.goldEarned)} · время: ${Math.round((s.played || 0) / 60)} мин</div></div>`;
  };

  // ═════ НАВЫКИ ═════
  const nodeIcon = (n, u) => { if (n.e.unlock) return (D.SKILLS[n.e.unlock] || {}).ic || '✦'; if (n.e.fxAdd) return '💥'; if (n.e.sk) return '📈'; if (n.e.st) return '💪'; return '✦'; };
  UI.tabs.skills = function (s) {
    const h = s.hero, k = UI.sub.skills, sp = E.sp(h), up = E.up(h);
    const head = `<div class="row gap"><div class="pts"><b>${sp}</b><small>очков навыков</small></div><div class="pts echo"><b>${up}</b><small>искр Нимба</small></div></div><div class="seg small">${[['class', 'Класс'], ['echo', 'Эхо'], ['list', 'Приёмы']].map(([a, b]) => `<button class="${k === a ? 'on' : ''}" data-act="sub" data-k="skills" data-v="${a}" data-quiet="1">${b}</button>`).join('')}</div>`;
    if (k === 'list') return head + skillList(s);
    const isU = k === 'echo', T = isU ? D.UNIQ[h.uniq] : D.TREES[h.cls], store = isU ? h.uspent : h.spent;
    const nodes = T.nodes, branches = isU ? [{ n: T.n, ic: T.ic }] : T.branches;
    const sel = UI.sub.node && nodes.find((n) => n.id === UI.sub.node) ? UI.sub.node : null;
    const cols = branches.map((b, bi) => {
      const list = nodes.filter((n) => isU || n.br === bi);
      const tiers = {}; list.forEach((n) => { (tiers[n.t] = tiers[n.t] || []).push(n); });
      return `<div class="tcol"><div class="thead">${b.ic || ''} ${esc(b.n)}</div>${Object.keys(tiers).sort((a, b2) => a - b2).map((t) => `<div class="trow"><i class="tline"></i>${tiers[t].map((n) => nodeBtn(h, n, isU, store, n.id === sel)).join('')}</div>`).join('')}</div>`;
    }).join('');
    let det = '<div class="card small dim center">Нажмите на узел, чтобы увидеть описание.</div>';
    if (sel) {
      const n = nodes.find((x) => x.id === sel), r = store[n.id] || 0, why = E.canLearn(h, n.id), reqs = n.req.map((q) => nodes.find((x) => x.id === q).n).join(', ');
      det = `<div class="card ndet"><div class="row gap center-v"><span class="big-ic">${nodeIcon(n)}</span><div class="grow tl"><b>${esc(n.n)}</b><div class="dim small">Ранг ${r}/${n.max} · ур. ${n.lv}+${reqs ? ' · после: ' + esc(reqs) : ''}</div></div></div><div class="small tl">${D.nodeDesc(n.e, h) }${n.max > 1 ? ' <span class="dim">(за ранг)</span>' : ''}</div>${n.e.unlock && D.SKILLS[n.e.unlock] ? `<div class="pas tl small"><b>${D.SKILLS[n.e.unlock].ic} ${D.SKILLS[n.e.unlock].n}</b> — ${D.SKILLS[n.e.unlock].d} (${D.SKILLS[n.e.unlock].mp ? D.SKILLS[n.e.unlock].mp + ' эн.' : 'ресурс ' + (D.SKILLS[n.e.unlock].rc || 'комбо')})</div>` : ''}<button class="btn ${why ? 'ghost' : 'primary'} wide" data-act="learn" data-id="${n.id}" data-u="${isU ? 1 : ''}" ${why ? 'disabled' : ''} id="btnLearn">${why ? why : r ? 'Улучшить' : 'Изучить'}</button></div>`;
    }
    const info = isU ? `<div class="card small tl"><b>${T.ic} ${T.n}</b> — ${T.d}<div class="pas"><b>${T.act.n}</b> · ${T.act.mp} эн. · пер. ${T.act.cd} — ${T.act.d}</div></div>` : `<div class="card small tl"><b>${D.CLASSES[h.cls].ic} ${D.CLASSES[h.cls].n}</b>: ${T.nodes.length} узлов, 3 ветки. Ярусы открываются на ур. ${D.TIER_LV.slice(1).join(' / ')}.</div>`;
    return head + info + `<div class="tree ${isU ? 'one' : ''}">${cols}</div>` + det;
  };
  function nodeBtn(h, n, isU, store, sel) {
    const r = store[n.id] || 0, can = !E.canLearn(h, n.id), lockd = !r && !can && (h.level < n.lv || n.req.some((q) => !(store[q] > 0)));
    return `<button class="node ${r ? 'got' : ''} ${r >= n.max ? 'max' : ''} ${can ? 'can' : ''} ${lockd ? 'lock' : ''} ${sel ? 'sel' : ''}" data-act="nodeSel" data-id="${n.id}" data-quiet="1"><span>${nodeIcon(n)}</span><b>${esc(n.n)}</b><em>${r}/${n.max}</em></button>`;
  }
  UI.act.nodeSel = (el) => { UI.sub.node = el.dataset.id; UI.sfx('tab'); UI.refresh(); const d = $('.ndet'); if (d) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  UI.act.learn = (el) => { const s = UI.slot(), r = E.learn(s.hero, el.dataset.id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('level'); UI.save(true); UI.refresh(); };
  function skillList(s) {
    const ids = E.skillsOf(s.hero), d = E.derive(s);
    const rows = ids.map((id) => { const sk = id.startsWith('u_') ? Object.assign({}, D.UNIQ[s.hero.uniq].act, { ic: D.UNIQ[s.hero.uniq].ic }) : D.SKILLS[id]; const bonus = d.skb[id]; return `<div class="card sk"><div class="row gap center-v"><span class="big-ic">${sk.ic}</span><div class="grow tl"><b>${sk.n}</b><div class="dim small">${sk.mp ? sk.mp + ' эн.' : ''}${sk.rc ? ' ресурс ' + sk.rc : ''}${sk.rcAll ? ' весь ресурс' : ''}${sk.cd ? ' · пер. ' + sk.cd : ''}${bonus ? ' · +' + bonus + '% силы' : ''}</div></div></div><div class="small tl">${sk.d}</div></div>`; }).join('');
    const b = D.BASIC[s.hero.cls];
    return `<div class="card sk"><div class="row gap center-v"><span class="big-ic">${b.ic}</span><div class="grow tl"><b>${b.n}</b> <span class="dim small">базовая атака</span></div></div></div>` + rows;
  }

  // ═════ ИНВЕНТАРЬ ═════
  UI.tabs.inv = function (s) {
    const k = UI.sub.inv;
    const head = `<div class="seg small">${[['gear', 'Снаряжение'], ['mats', 'Материалы'], ['cons', 'Расходники']].map(([a, b]) => `<button class="${k === a ? 'on' : ''}" data-act="sub" data-k="inv" data-v="${a}" data-quiet="1">${b}</button>`).join('')}</div>`;
    if (k === 'mats') {
      const ids = Object.keys(s.mats).filter((x) => s.mats[x] > 0 && D.MATS[x]);
      return head + `<div class="matgrid">${ids.map((id) => `<div class="mt"><span>${D.MATS[id].ic}</span><b>${s.mats[id]}</b><small>${D.MATS[id].n}</small></div>`).join('') || '<div class="dim center pad">Материалов нет. Добывайте их в подземельях и на промысле.</div>'}</div>`;
    }
    if (k === 'cons') {
      const ids = Object.keys(s.cons).filter((x) => s.cons[x] > 0 && D.CONS[x]);
      return head + (ids.map((id) => { const c = D.CONS[id]; return `<div class="item"><span class="ico">${c.ic}</span><span class="grow tl"><b>${c.n}</b> ×${s.cons[id]}<small>${c.d}</small></span>${c.buff ? `<button class="btn small primary" data-act="useBuff" data-id="${id}">Принять</button>` : ''}</div>`; }).join('') || '<div class="dim center pad">Пусто</div>') + `<div class="small dim">Зелья и бомбы используются в бою. Еда и эликсиры — перед вылазкой.</div>` + ((s.buffs || []).length ? `<div class="card small"><b>Действуют:</b> ${s.buffs.map((b) => (D.CONS[b.id] ? D.CONS[b.id].n : b.id)).join(', ')}</div>` : '');
    }
    const f = UI.sub.filt;
    const chips = ['all'].concat(Object.keys(D.SLOTS)).map((x) => `<button class="fchip ${f === x ? 'on' : ''}" data-act="filt" data-v="${x}" data-quiet="1">${x === 'all' ? 'Все' : D.SLOT_IC[x]}</button>`).join('');
    const list = s.inv.filter((it) => f === 'all' || it.sl === f).sort((a, b) => b.r - a.r || b.il - a.il);
    const eqs = Object.keys(D.SLOTS).map((sl) => s.eq[sl]).filter(Boolean).map((it) => itemRow(it, 'itemOpen', '<span class="tag ok">надето</span>')).join('');
    return head + `<div class="small dim">Сумка: ${s.inv.length} предм.</div><div class="fchips">${chips}</div><h4>Надето</h4>${eqs}<h4>В сумке</h4>${list.map((it) => itemRow(it, 'itemOpen', cmpTag(s, it))).join('') || '<div class="dim center pad">Ничего нет</div>'}`;
  };
  const cmpTag = (s, it) => { const cur = s.eq[it.sl]; if (!E.canUse(s.hero, it)) return '<span class="tag">не для класса</span>'; const dv = E.itemScore(it) - (cur ? E.itemScore(cur) : 0); return dv > 0.5 ? '<span class="tag up">▲</span>' : dv < -0.5 ? '<span class="tag dn">▼</span>' : ''; };
  UI.act.filt = (el) => { UI.sub.filt = el.dataset.v; UI.refresh(false); };
  UI.act.useBuff = (el) => { const r = E.useConsOutside(UI.slot(), el.dataset.id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); } else { UI.toast('Эффект принят до конца вылазки', 'ok'); UI.sfx('heal'); UI.save(true); } UI.refresh(); };
  UI.act.itemOpen = (el) => UI.itemModal(+el.dataset.id);
  UI.itemModal = function (id) {
    const s = UI.slot(), it = E.findItem(s, id); if (!it) { UI.closeModal(); return; }
    const worn = s.eq[it.sl] === it, cur = !worn && s.eq[it.sl], cap = E.upCap(s), c = E.upCost(s, it);
    const dv = cur ? E.itemScore(it) - E.itemScore(cur) : null;
    UI.modal(`<div class="itemhead" style="--rc:${rar(it).c}"><span class="big-ic">${D.BASES[it.k].ic}</span><div class="grow tl"><h3 class="m0">${UI.itemName(it)}</h3><div class="dim small">${rar(it).n} · ${D.SLOTS[it.sl]} · ур. предмета ${it.il}${it.en ? ' · ✨ ' + D.ENCHANTS.find((e) => e.id === it.en).n : ''}</div></div></div>
      <div class="il-list">${UI.itemStats(it)}</div>
      ${cur ? `<div class="small dim tl">Сейчас надето: ${UI.itemName(cur)}. ${dv > 0 ? '<b class="ok">Лучше</b>' : dv < 0 ? '<b class="bad">Хуже</b>' : 'Равно'}</div>` : ''}
      ${!E.canUse(s.hero, it) ? '<div class="warnbox">Ваш класс не может использовать это оружие.</div>' : ''}
      <div class="row gap wrap">${worn ? `<button class="btn ghost grow" data-act="unequip" data-id="${it.id}">Снять</button>` : `<button class="btn primary grow" data-act="equip" data-id="${it.id}" ${E.canUse(s.hero, it) ? '' : 'disabled'}>Надеть</button>`}
      <button class="btn ghost" data-act="lockItem" data-id="${it.id}">${it.lock ? '🔒' : '🔓'}</button>
      ${worn ? '' : `<button class="btn ghost danger" data-act="sellOne" data-id="${it.id}">Продать 🪙${E.sellPrice(it)}</button>`}</div>
      <div class="row gap wrap"><button class="btn ghost grow small" data-act="upItem" data-id="${it.id}" ${(it.up || 0) >= cap ? 'disabled' : ''}>⚒️ Улучшить +${(it.up || 0) + 1} (🪙${c.gold})</button>${(s.hero.prof1 === 'ench' || s.hero.prof2 === 'ench') ? `<button class="btn ghost grow small" data-act="enchOpen" data-id="${it.id}">✨ Зачаровать</button>` : ''}</div>
      <button class="btn ghost wide" data-act="closeModal">Закрыть</button>`);
  };
  UI.act.equip = (el) => { const r = E.equip(UI.slot(), +el.dataset.id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); } else UI.sfx('equip'); UI.save(true); UI.closeModal(); UI.refresh(); };
  UI.act.unequip = (el) => { const s = UI.slot(), it = E.findItem(s, +el.dataset.id); if (it) E.unequip(s, it.sl); UI.save(true); UI.closeModal(); UI.refresh(); };
  UI.act.lockItem = (el) => { const it = E.findItem(UI.slot(), +el.dataset.id); it.lock = !it.lock; UI.save(true); UI.itemModal(it.id); UI.refresh(); };
  UI.act.sellOne = (el) => { const g = E.sell(UI.slot(), +el.dataset.id); if (g) { UI.sfx('gold'); UI.toast(`+${g} 🪙`, 'ok'); } UI.save(true); UI.closeModal(); UI.refresh(); };
  UI.act.upItem = (el) => { const s = UI.slot(), it = E.findItem(s, +el.dataset.id), r = E.upgrade(s, it); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); } else { UI.sfx('forge'); UI.save(true); } UI.itemModal(it.id); UI.refresh(); };
  UI.act.enchOpen = (el) => {
    const s = UI.slot(), it = E.findItem(s, +el.dataset.id), lv = E.profLv(s, 'ench');
    UI.modal(`<h3>✨ Зачарование</h3><div class="small dim">${UI.itemName(it)} — новые чары заменят старые.</div><div class="mlist">${D.ENCHANTS.map((en) => { const ok = lv >= en.lv && E.canAfford(s, { gold: en.gold, mats: en.mats }); return `<div class="item ${lv >= en.lv ? '' : 'lockd'}"><span class="grow tl"><b>${en.n}</b>${it.en === en.id ? ' ✔' : ''}<small>${Object.keys(en.m).map((k) => '+' + en.m[k] + ' ' + (D.MODN[k] || k)).join(', ')} · ур.${en.lv}</small><small>🪙${en.gold} ${matTxt(en.mats, s)}</small></span><button class="btn small ${ok ? 'primary' : 'ghost'}" data-act="doEnch" data-id="${it.id}" data-e="${en.id}" data-quiet="1">Наложить</button></div>`; }).join('')}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.doEnch = (el) => { const s = UI.slot(), r = E.enchant(s, +el.dataset.id, el.dataset.e); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('magic'); UI.toast('Чары наложены', 'ok'); UI.save(true); UI.itemModal(+el.dataset.id); UI.refresh(); };

  // ═════ ПРОФЕССИИ ═════
  UI.tabs.prof = function (s) {
    const h = s.hero, ids = [h.prof1, h.prof2], cur = UI.sub.prof && ids.includes(UI.sub.prof) ? UI.sub.prof : h.prof1; UI.sub.prof = cur;
    const P = D.PROFS[cur], pr = s.profs[cur] || { lv: 1, xp: 0 }, cap = E.profCap(h, cur), isMain = cur === h.prof1;
    const tabs = `<div class="seg small">${ids.map((id) => `<button class="${id === cur ? 'on' : ''}" data-act="profTab" data-id="${id}" data-quiet="1">${D.PROFS[id].ic} ${D.PROFS[id].n}<br><small>${id === h.prof1 ? 'основная' : 'доп.'}</small></button>`).join('')}</div>`;
    const head = `<div class="card"><div class="row gap center-v"><span class="big-ic">${P.ic}</span><div class="grow tl"><h3 class="m0">${P.n}</h3><div class="dim small">${isMain ? 'Основная' : 'Дополнительная'} · ${P.t === 'craft' ? 'ремесло' : 'добыча'} · ур. ${pr.lv}/${cap}</div></div></div><div class="xpb">${bar(pr.lv >= cap ? 1 : pr.xp, pr.lv >= cap ? 1 : D.profXpNeed(pr.lv), 'xp')}<small>${pr.lv >= cap ? 'МАКС' : pr.xp + '/' + D.profXpNeed(pr.lv)}</small></div><div class="small tl dim">${P.d}</div><div class="small tl">${P.fx}</div></div>`;
    const perks = `<div class="card"><b>Прогрессия</b><ul class="perks small">${Object.keys(P.perks).map((l) => { const act = pr.lv >= +l && +l <= cap, off = +l > cap; return `<li class="${act ? 'ok' : off ? 'lockd' : ''}">${act ? '✔' : off ? '✖' : '○'} <b>Ур. ${l}</b> — ${P.perks[l].n}: ${Object.keys(P.perks[l].m).map((k) => '+' + P.perks[l].m[k] + ' ' + (D.MODN[k] || k)).join(', ')}${off ? ' (недоступно для доп. профессии)' : ''}</li>`; }).join('')}</ul></div>`;
    let body = '';
    if (P.t === 'gather') {
      const areas = P.areas.map((a, i) => { const open = pr.lv >= a.lv; return `<div class="item ${open ? '' : 'lockd'}"><span class="grow tl"><b>${a.n}</b><small>${open ? a.drops.map((d) => D.MATS[d[0]].ic + D.MATS[d[0]].n).join(', ') : 'откроется на ур. ' + a.lv}</small></span>${open ? `<button class="btn small primary" data-act="gather" data-p="${cur}" data-i="${E.gatherAreas(s, cur).indexOf(a)}">Промысел 🎒1</button>` : '🔒'}</div>`; }).join('');
      body = `<div class="card"><b>Промысел</b><div class="small dim tl">Каждый выход тратит 1 «Провиант» (🎒 в наличии: ${s.mats.prov || 0}; продаётся в лавке) и приносит 3 находки. Ещё вы добываете больше в событиях подземелий.</div>${areas}<button class="btn ghost small" data-act="shop" data-quiet="1">Купить провиант</button></div>`;
    } else {
      const rec = D.recipesFor(cur), avail = rec.filter((r) => E.recipeAvail(s, r)), locked = rec.filter((r) => !E.recipeAvail(s, r));
      const row = (r, ok) => `<div class="item ${ok ? '' : 'lockd'}"><span class="ico">${recIcon(r)}</span><span class="grow tl"><b>${esc(r.n)}</b> <small>${ok ? 'опыт +' + r.xp : 'ур. ' + r.lv}</small><small>${recOut(r)}</small><small>🪙${r.gold} ${matTxt(r.mats, s)}</small></span>${ok ? `<button class="btn small ${E.canAfford(s, { gold: r.gold, mats: r.mats }) ? 'primary' : 'ghost'}" data-act="craft" data-id="${r.id}" data-quiet="1">Создать</button>` : '🔒'}</div>`;
      const ench = cur === 'ench' ? `<div class="card small tl"><b>Зачарование</b> предметов — через «Сумку»: откройте предмет → «Зачаровать». Чары: ${D.ENCHANTS.length} видов.</div>` : '';
      body = ench + `<div class="card"><b>Рецепты (${avail.length}/${rec.length})</b><div class="rlist">${avail.map((r) => row(r, true)).join('')}</div></div>` + (locked.length ? `<div class="card"><b>Закрытые рецепты</b><div class="rlist">${locked.slice(0, 6).map((r) => row(r, false)).join('')}</div>${locked.length > 6 ? `<div class="small dim">…ещё ${locked.length - 6}</div>` : ''}</div>` : '');
    }
    return tabs + head + perks + body;
  };
  const recIcon = (r) => (r.out.kind === 'mat' ? D.MATS[r.out.id].ic : r.out.kind === 'cons' ? D.CONS[r.out.id].ic : D.BASES[r.out.base].ic);
  const recOut = (r) => (r.out.kind === 'mat' ? `→ ${D.MATS[r.out.id].n} ×${r.out.q}` : r.out.kind === 'cons' ? `→ ${D.CONS[r.out.id].n} ×${r.out.q} · ${D.CONS[r.out.id].d}` : `→ ${D.BASES[r.out.base].n} (ур. ${r.out.il}${r.out.rmin ? ', от «' + D.RARITY[r.out.rmin].n + '»' : ''})`);
  UI.act.profTab = (el) => { UI.sub.prof = el.dataset.id; UI.refresh(false); };
  UI.act.craft = (el) => {
    const s = UI.slot(), r = E.craft(s, el.dataset.id); if (r.err) { UI.toast(r.err, 'bad'); UI.sfx('err'); return; }
    UI.sfx(r.item ? 'forge' : 'magic'); UI.save(true);
    let m = r.item ? `Создано: ${UI.itemName(r.item)}` : r.mat ? `Создано: ${D.MATS[r.mat].n} ×${r.q}` : `Создано: ${D.CONS[r.cons].n} ×${r.q}`;
    if (r.lvUp) { m += ` · 🌟 уровень профессии ${s.profs[r.recipe.prof].lv}!`; UI.sfx('level'); }
    UI.toast(m, r.item && r.item.r >= 3 ? 'gold' : 'ok'); UI.refresh();
  };
  UI.act.gather = (el) => {
    const s = UI.slot(); if (s.run) { UI.toast('Не во время вылазки', 'bad'); return; }
    const r = E.gather(s, el.dataset.p, +el.dataset.i); if (r.err) { UI.toast(r.err, 'bad'); UI.sfx('err'); return; }
    UI.sfx('pick'); UI.save(true); UI.toast('Добыто: ' + Object.keys(r.got).map((k) => `${D.MATS[k].ic}${r.got[k]}`).join(' ') + (r.lvUp ? ' · 🌟 новый уровень!' : ''), 'ok'); UI.refresh();
  };

  // ═════ НАСТРОЙКИ ═════
  UI.tabs.set = function (s) {
    const st = UI.p.settings;
    const tg = (k, n) => `<div class="setrow"><span>${n}</span><button class="toggle ${st[k] ? 'on' : ''}" data-act="toggle" data-k="${k}" data-quiet="1"><i></i></button></div>`;
    const sp = (k, n, vals) => `<div class="setrow"><span>${n}</span><div class="seg small mini">${vals.map(([v, l]) => `<button class="${st[k] === v ? 'on' : ''}" data-act="setVal" data-k="${k}" data-v="${v}" data-quiet="1">${l}</button>`).join('')}</div></div>`;
    return `<h2>Настройки</h2><div class="card">${tg('sound', '🔊 Звуковые эффекты')}${tg('music', '🎵 Музыка (эмбиент)')}<div class="setrow"><span>Громкость</span><input type="range" min="0" max="1" step="0.05" value="${st.vol}" id="volR" data-act="vol" class="rng"></div>
      ${sp('textSpeed', '📖 Скорость текста', [[1, 'Медл.'], [2, 'Норм.'], [3, 'Быстр.']])}${sp('battleSpeed', '⚔️ Скорость боя', [[1, '×1'], [2, '×2']])}${tg('auto', '🤖 Авто-бой по умолчанию')}${tg('shake', '📳 Тряска экрана')}${tg('particles', '✨ Частицы')}${tg('tutorial', '📘 Подсказки')}</div>
      <div class="card col gap"><b>Сохранения</b><div class="small dim">Профиль «${esc(UI.p.nick)}», слот ${UI.p.active + 1}. Автосохранение после каждого действия, плюс резервная копия.</div>
        <div class="row gap wrap"><button class="btn ghost small" data-act="exportSlot" data-i="${UI.p.active}">Экспорт героя</button><button class="btn ghost small" data-act="exportProfile">Экспорт профиля</button><button class="btn ghost small" data-act="saveNow">💾 Сохранить</button></div>
        <div class="row gap wrap"><button class="btn ghost small" data-act="tutorial">📘 Обучение</button><button class="btn ghost small" data-act="credits">О игре</button></div>
        <div class="row gap wrap"><button class="btn ghost small" data-act="toSlots">⇄ Сменить слот</button><button class="btn ghost small" data-act="toProfiles">👤 Сменить профиль</button></div></div>`;
  };
  UI.act.toggle = (el) => { const st = UI.p.settings, k = el.dataset.k; st[k] = !st[k]; el.classList.toggle('on', st[k]); if (k === 'sound' || k === 'music') { A.set({ on: st.sound, music: st.music && st.sound }); if (st.sound) { A.resume(); UI.sfx('click'); } } UI.applySettings(); UI.save(true); };
  UI.act.setVal = (el) => { UI.p.settings[el.dataset.k] = +el.dataset.v; UI.save(true); UI.refresh(); };
  document.addEventListener('input', (e) => { if (e.target.id === 'volR') { UI.p.settings.vol = +e.target.value; A.set({ vol: UI.p.settings.vol }); } });
  document.addEventListener('change', (e) => { if (e.target.id === 'volR') { UI.save(true); UI.sfx('click'); } });
  UI.act.saveNow = () => { if (UI.save()) UI.toast('Сохранено', 'ok'); };
  UI.act.toSlots = () => { if (UI.slot() && UI.slot().run) UI.toast('Вылазка сохранена — вы вернётесь к ней', ''); UI.save(true); UI.go('slots'); };
  UI.act.toProfiles = () => { UI.save(true); UI.p = null; UI.go('title'); };
  UI.act.credits = () => UI.modal(`<h3>Нимб Мира</h3><div class="mtext small tl">Оригинальная тёмная фэнтези-RPG с визуальной новеллой: мир, герои, сюжет и интерфейс созданы специально для этой игры. Портреты и CG — нарисованный арт (WebP), музыка и звуки синтезируются в браузере.<br><br>Версия 2.0 · Арка 1 · работает офлайн (PWA). Романтические сцены — без откровенного содержания.</div><button class="btn primary wide" data-act="closeModal">Закрыть</button>`);

  // ═════ ОБУЧЕНИЕ ═════
  const TUT = [['👑', 'Король Демонов', 'Вы — пробудившийся Король Демонов. Вкладки внизу (листайте вбок): <b>Город</b>, <b>Сюжет</b>, <b>Вылазки</b>, <b>Герой</b>, <b>Силы</b>, <b>Свита</b>, <b>Сердца</b>, <b>Ремесло</b>, <b>Сумка</b>, <b>Меню</b>. Красная точка у «Города» — новая сцена сюжета.'], ['⚔️', 'Бой', 'Бой идёт по шкале скорости: порядок ходов виден сверху. Выберите врага касанием, затем действие. Над врагами — их <b>намерения</b>; ⚠️ значит «готовится мощный удар». Кнопка 👥 — самому командовать Свитой.'], ['🌌', 'Мантра Силы', 'Узел Мантры в ветке «Плоть и Мощь»: каждый ход боя атака и защита удваиваются от значений ДО боя (до 3 раз). После боя всё сбрасывается. Начните бой с мощного первого удара — и дальше вы неостановимы.'], ['🌟', 'Ветки Силы', 'Шесть веток: Фактор Короля Демонов, Плоть и Мощь, Тьма и Разрушение, Энтропия, Власть и Подчинение, Проклятия и Пожирание. 2 очка за уровень. Некоторые узлы <b>сливаются</b> в концептуальные навыки — слитые узлы теряют свой эффект, но результат сильнее.'], ['🛡️', 'Свита и Сердца', 'Пленённые и пощажённые становятся подчинёнными: у них уровни, снаряжение, верность и задания (идут в реальном времени). Подарки, разговоры и свидания открывают сцены и постоянные бонусы.'], ['⚒️', 'Профессии', 'Основная и дополнительная профессии выбраны навсегда. Ремесленники создают снаряжение, зелья и чары из материалов, добытчики приносят больше ресурсов.']];
  UI.tutorial = function (i) {
    i = i || 0; const t = TUT[i];
    UI.modal(`<div class="tut"><div class="big-ic xl">${t[0]}</div><h3>${t[1]}</h3><div class="mtext tl">${t[2]}</div><div class="dots">${TUT.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div><div class="row gap"><button class="btn ghost grow" data-act="closeModal">Закрыть</button><button class="btn primary grow" data-act="tutNext" data-i="${i + 1}" id="btnTut">${i === TUT.length - 1 ? 'Готово' : 'Далее ›'}</button></div></div>`, { lock: true });
  };
  UI.act.tutNext = (el) => { const i = +el.dataset.i; if (i >= TUT.length) UI.closeModal(); else UI.tutorial(i); };
})();
