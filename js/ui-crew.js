/* UI: Ветки Силы, Свита, Сердца, подарки */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { $, esc, fmt } = UI;
  const bar = (v, max, cl) => `<span class="bar ${cl || ''}"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i></span>`;
  const sil = (id, cls) => `<div class="silhouette ${cls || ''}">${UI.por(id, cls || 'sm', true)}</div>`;
  UI.sub.skills = 'b0'; UI.sub.crewId = null;

  // ═════ СИЛЫ (ветки Короля Демонов) ═════
  const nodeIcon = (n) => { if (n.e && n.e.unlock) return (D.SKILLS[n.e.unlock] || {}).ic || '✦'; if (n.concept) return '✦'; if (n.e && n.e.m && (n.e.m.mantra || n.e.m.erase || n.e.m.devour || n.e.m.reviveFull)) return '✦'; return n.fuse ? '⚗️' : '•'; };
  const store = (h, isU) => (isU ? h.uspent : h.spent);
  function nodeBtn(h, n, isU, sel, fz) {
    const st = store(h, isU), r = st[n.id] || 0, can = !E.canLearn(h, n.id), fused = !isU && fz[n.id];
    const lockd = !r && !can && (h.level < n.lv || n.req.some((q) => !(st[q] > 0)));
    return `<button class="node ${r ? 'got' : ''} ${r >= n.max ? 'max' : ''} ${can ? 'can' : ''} ${lockd ? 'lock' : ''} ${sel ? 'sel' : ''} ${n.concept ? 'concept' : ''} ${fused ? 'fused' : ''}" data-act="nodeSel" data-id="${n.id}" data-quiet="1"><span>${nodeIcon(n)}</span><b>${esc(n.n)}</b><em>${fused ? 'слито' : r + '/' + n.max}</em></button>`;
  }
  UI.tabs.skills = function (s) {
    const h = s.hero, k = UI.sub.skills, sp = E.sp(h), up = E.up(h), B = D.MAOU_BRANCHES;
    const chips = B.map((b, i) => `<button class="${k === 'b' + i ? 'on' : ''}" style="--bc:${b.c}" data-act="sub" data-k="skills" data-v="b${i}" data-quiet="1">${b.ic} ${esc(b.n.replace('Фактор Короля Демонов', 'Фактор'))}</button>`).join('') + `<button class="${k === 'echo' ? 'on' : ''}" data-act="sub" data-k="skills" data-v="echo" data-quiet="1">🔆 Отголосок</button><button class="${k === 'list' ? 'on' : ''}" data-act="sub" data-k="skills" data-v="list" data-quiet="1">📜 Приёмы</button>`;
    const head = `<div class="row gap"><div class="pts"><b>${sp}</b><small>очков Силы</small></div><div class="pts echo"><b>${up}</b><small>искр Нимба</small></div></div><div class="seg small scrollx">${chips}</div>`;
    if (k === 'list') return head + skillList(s);
    const isU = k === 'echo', T = isU ? D.UNIQ[h.uniq] : D.TREES.maou, fz = isU ? {} : E.fused(h);
    const bi = isU ? 0 : +k.slice(1), nodes = isU ? T.nodes : T.nodes.filter((n) => n.br === bi);
    const sel = UI.sub.node && T.nodes.find((n) => n.id === UI.sub.node) ? UI.sub.node : null;
    const tiers = {}; nodes.forEach((n) => { (tiers[n.t] = tiers[n.t] || []).push(n); });
    const rows = Object.keys(tiers).sort((a, b) => a - b).map((t) => `<div class="trow"><i class="tline"></i><span class="tlv">ур. ${tiers[t][0].lv}</span>${tiers[t].map((n) => nodeBtn(h, n, isU, n.id === sel, fz)).join('')}</div>`).join('');
    let det = '<div class="card small dim center">Нажмите на узел, чтобы увидеть описание. ✦ — концептуальные узлы, ⚗️ — слияние.</div>';
    if (sel) {
      const n = T.nodes.find((x) => x.id === sel), r = store(h, isU)[n.id] || 0, why = E.canLearn(h, n.id), reqs = n.req.map((q) => T.nodes.find((x) => x.id === q).n).join(', ');
      const fuse = n.fuse ? `<div class="pas tl small"><b>⚗️ Слияние:</b> поглощает ${n.fuse.map((q) => '«' + esc(T.nodes.find((x) => x.id === q).n) + '»').join(' и ')} — они перестают работать, но этот узел сильнее.</div>` : '';
      const fusedBy = fz[n.id] ? `<div class="pas tl small">Слит в «${esc(T.nodes.find((x) => x.id === fz[n.id]).n)}» — эффект сейчас не действует.</div>` : '';
      const sk = n.e && n.e.unlock && D.SKILLS[n.e.unlock] ? `<div class="pas tl small"><b>${D.SKILLS[n.e.unlock].ic} ${D.SKILLS[n.e.unlock].n}</b> — ${D.SKILLS[n.e.unlock].d} (${D.SKILLS[n.e.unlock].mp ? D.SKILLS[n.e.unlock].mp + ' эн.' : 'ресурс ' + (D.SKILLS[n.e.unlock].rc || 'комбо')})</div>` : '';
      det = `<div class="card ndet ${n.concept ? 'concept' : ''}"><div class="row gap center-v"><span class="big-ic">${nodeIcon(n)}</span><div class="grow tl"><b>${esc(n.n)}</b>${n.concept ? ' <span class="tag new">концепт</span>' : ''}<div class="dim small">Ранг ${r}/${n.max} · ур. ${n.lv}+${reqs ? ' · после: ' + esc(reqs) : ''}</div></div></div><div class="small tl">${n.d ? esc(n.d) : D.nodeDesc(n.e, h)}${n.max > 1 ? ' <span class="dim">(за ранг)</span>' : ''}</div>${n.d && n.e && n.e.m ? `<div class="small dim tl">${D.nodeDesc(n.e, h)}</div>` : ''}${sk}${fuse}${fusedBy}<button class="btn ${why ? 'ghost' : 'primary'} wide" data-act="learn" data-id="${n.id}" data-u="${isU ? 1 : ''}" ${why ? 'disabled' : ''} id="btnLearn">${why ? why : n.fuse && !r ? 'Слить и изучить' : r ? 'Улучшить' : 'Изучить'}</button></div>`;
    }
    const br = isU ? `<div class="card small tl"><b>${T.ic} ${T.n}</b> — ${T.d}<div class="pas"><b>${T.act.n}</b> · ${T.act.mp} эн. · пер. ${T.act.cd} — ${T.act.d}</div></div>` : `<div class="card small tl brinfo" style="--bc:${D.MAOU_BRANCHES[bi].c}"><b>${D.MAOU_BRANCHES[bi].ic} ${esc(D.MAOU_BRANCHES[bi].n)}</b> — ${esc(D.MAOU_BRANCHES[bi].d)}</div>`;
    return head + br + `<div class="tree one">${`<div class="tcol">${rows}</div>`}</div>` + det;
  };
  UI.act.nodeSel = (el) => { UI.sub.node = el.dataset.id; UI.sfx('tab'); UI.refresh(); const d = $('.ndet'); if (d) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  UI.act.learn = (el) => {
    const s = UI.slot(), h = s.hero, id = el.dataset.id, n = D.TREES.maou.nodes.find((x) => x.id === id), isU = !!el.dataset.u;
    const go = () => { const r = E.learn(h, id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('level'); UI.save(true); UI.refresh(); };
    if (!isU && n && n.fuse && !(h.spent[id] > 0)) { UI.confirm('Слить узлы?', `«${esc(n.n)}» поглотит ${n.fuse.map((q) => '«' + esc(D.TREES.maou.nodes.find((x) => x.id === q).n) + '»').join(' и ')}. Их эффекты перестанут действовать, пока этот узел изучен. Вернуть можно только сбросом Сил.`, 'Слить', go); return; }
    go();
  };
  function skillList(s) {
    const ids = E.skillsOf(s.hero), d = E.derive(s);
    const rows = ids.map((id) => { const sk = id.startsWith('u_') ? Object.assign({}, D.UNIQ[s.hero.uniq].act, { ic: D.UNIQ[s.hero.uniq].ic }) : D.SKILLS[id]; if (!sk) return ''; const bonus = d.skb[id]; return `<div class="card sk ${id.startsWith('c_') ? 'concept' : ''}"><div class="row gap center-v"><span class="big-ic">${sk.ic}</span><div class="grow tl"><b>${sk.n}</b><div class="dim small">${sk.mp ? sk.mp + ' эн.' : ''}${sk.rc ? ' · Мощь ' + sk.rc : ''}${sk.rcAll ? ' · вся Мощь' : ''}${sk.cd ? ' · пер. ' + sk.cd : ''}${bonus ? ' · +' + bonus + '% силы' : ''}</div></div></div><div class="small tl">${sk.d}</div></div>`; }).join('');
    const b = D.BASIC.maou;
    return `<div class="card sk"><div class="row gap center-v"><span class="big-ic">${b.ic}</span><div class="grow tl"><b>${b.n}</b> <span class="dim small">базовая атака</span></div></div></div>` + rows;
  }

  // ═════ СВИТА ═════
  const loyBar = (st) => { const t = D.loyTier(st.loy); return `<span class="loy" style="--lc:${t.c}">${bar(st.loy, 100, 'loy')}<em style="color:${t.c}">${t.n} · ${st.loy}</em></span>`; };
  UI.tabs.crew = function (s) {
    const un = E.recruited(s), ms = s.missions || [];
    const party = s.party.map((id) => D.CREW[id]).filter(Boolean);
    const head = `<h2>Свита</h2><div class="card"><div class="row gap center-v"><b class="grow tl">Отряд на вылазку (${party.length}/${E.PARTY_MAX})</b><small class="dim">вечеров: ${s.crewTalk || 0}</small></div><div class="row gap partyrow">${[0, 1, 2].map((i) => party[i] ? `<button class="pcell" data-act="crewOpen" data-id="${s.party[i]}" data-quiet="1">${UI.por(party[i].art, 'xs', false)}<small>${esc(party[i].n)}</small></button>` : '<div class="pcell empty"><span>＋</span><small>пусто</small></div>').join('')}</div>
      <label class="toggle row gap center-v"><input type="checkbox" id="cmdChk" ${s.cmd ? 'checked' : ''} data-act="cmdTog"><span class="grow tl small">Командовать Свитой в бою самому <span class="dim">(иначе она действует сама)</span></span></label></div>`;
    const mis = ms.length ? `<div class="card"><b>Задания в пути</b>${ms.map((m, i) => { const left = E.missionLeft(m); const c = D.CREW[m.cid]; return `<div class="item"><span class="grow tl"><b>${esc(c.n)}</b> · ${D.DUN[m.did].n} · ${E.MISSION_DUR[m.di].n}<small>${left > 0 ? 'ещё ' + Math.ceil(left / 60000) + ' мин' : 'готово!'}</small></span>${left > 0 ? '' : `<button class="btn primary small" data-act="missionDone" data-i="${i}">Забрать</button>`}</div>`; }).join('')}</div>` : '';
    const list = D.CREW_IDS.map((id) => {
      const c = D.CREW[id], st = s.crew[id];
      if (!st) return `<div class="card crewc locked"><div class="row gap center-v">${sil(c.art, 'sm')}<div class="grow tl"><b>???</b><div class="dim small">${c.t === 'sub' ? 'Подчинённый' : c.t === 'gen' ? 'Генерал' : 'Героиня Света'} · пока не с вами</div></div></div></div>`;
      const nd = E.crewXpNeed(st.lv), onM = E.onMission(s, id), inP = s.party.includes(id);
      return `<button class="card crewc tap ${inP ? 'inparty' : ''}" data-act="crewOpen" data-id="${id}" data-quiet="1"><div class="row gap center-v">${UI.por(c.art, 'sm', true)}<div class="grow tl"><b>${esc(c.n)}</b> <span class="tag">${D.ARCH_N[c.arch]}</span>${inP ? ' <span class="tag ok">в отряде</span>' : ''}${onM ? ' <span class="tag new">задание</span>' : ''}<div class="dim small">${esc(c.role)} · ур. ${st.lv}</div><div class="xpb">${bar(st.xp, nd, 'xp')}</div>${loyBar(st)}</div></div></button>`;
    }).join('');
    return head + mis + `<div class="small dim tl">Подчинённые: ${un.filter((i) => D.CREW[i].t === 'sub').length}/6 · Генералы: ${un.filter((i) => D.CREW[i].t === 'gen').length}/9 · Героини: ${un.filter((i) => D.CREW[i].t === 'her').length}/3</div>` + list;
  };
  UI.act.cmdTog = (el) => { const s = UI.slot(); s.cmd = !!el.checked; UI.save(true); UI.toast(s.cmd ? 'Вы командуете Свитой' : 'Свита действует сама', 'ok'); };
  UI.act.missionDone = (el) => {
    const s = UI.slot(), r = E.collectMission(s, +el.dataset.i); if (!r) return; const c = D.CREW[r.cid];
    UI.save(true); UI.sfx(r.ok ? 'gold' : 'err');
    UI.modal(`<div class="center"><div class="big-ic xl">${r.ok ? '🏆' : '💨'}</div><h3>${r.ok ? 'Задание выполнено' : 'Задание провалено'}</h3></div><div class="mtext small tl">${esc(c.n)} ${r.ok ? 'вернулся(-ась) с добычей' : 'вернулся(-ась) ни с чем, но живым(-ой)'}.${r.ok ? `<br>🪙 ${fmt(r.gold)} ${Object.keys(r.mats).map((k) => D.MATS[k].ic + r.mats[k]).join(' ')}` : ''}<br>Опыт: +${r.xp}${r.up ? ' · уровень +' + r.up : ''}</div><button class="btn primary wide" data-act="closeModal">Ок</button>`);
    UI.refresh();
  };
  UI.act.crewOpen = (el) => { UI.sub.crewId = el.dataset.id; UI.crewModal(); };
  const gearName = (it) => `${D.BASES[it.k].ic} ${UI.itemName(it)}`;
  UI.crewModal = function () {
    const s = UI.slot(), id = UI.sub.crewId, c = D.CREW[id], st = s.crew[id]; if (!st) return;
    const u = RPG.C.unitFromCrew(s, id), inP = s.party.includes(id), onM = E.onMission(s, id);
    const eq = [['weapon', 'Оружие', '🗡️'], ['armor', 'Броня', '🛡️'], ['trinket', 'Украшение', '💍']].map(([k, n, ic]) => `<button class="eqs" data-act="crewEq" data-k="${k}" data-quiet="1"><span>${st.eq[k] ? D.BASES[st.eq[k].k].ic : ic}</span><small>${st.eq[k] ? esc(st.eq[k].nm) : n}</small></button>`).join('');
    const sk = E.crewSkills(s, id).map((x) => D.SKILLS[x]).filter(Boolean).map((k) => `<div class="small tl"><b>${k.ic} ${k.n}</b> — ${k.d}</div>`).join('');
    const gifts = Object.keys(D.GIFTS).filter((g) => E.giftCount(s, g) > 0).map((g) => `<button class="btn ghost small" data-act="giveGift" data-id="${id}" data-g="${g}" data-quiet="1">${D.GIFTS[g].ic} ×${E.giftCount(s, g)}</button>`).join('') || '<span class="dim small">Подарков нет — купите в лавке.</span>';
    UI.modal(`<div class="crewm"><div class="row gap">${UI.por(c.art, 'lg', false)}<div class="grow tl"><h3 class="m0">${esc(c.n)}</h3><div class="dim small">${esc(c.role)} · ${D.ARCH_N[c.arch]} · ур. ${st.lv}</div>${loyBar(st)}<div class="small dim">Опыт ${st.xp}/${E.crewXpNeed(st.lv)} · потолок ур. ${E.crewCap(s)}</div></div></div>
      <div class="small tl">${esc(c.d)}</div>
      <div class="stats"><span>❤️ ${fmt(u.maxHp)}</span><span>⚔️ ${fmt(Math.max(u.atk || 0, u.mag || 0))}</span><span>🛡️ ${fmt(u.def || 0)}</span><span>✨ ${fmt(u.res || 0)}</span></div>
      <div class="card">${sk || '<div class="dim small">Навыки откроются с уровнем.</div>'}${c.sig ? `<div class="small dim tl">${st.lv >= 8 ? (st.loy >= 50 ? '' : 'Подписной навык требует верности 50+.') : 'Подписной навык — с 8 ур.'}</div>` : ''}</div>
      <div class="card"><b>Снаряжение</b><div class="eqgrid three">${eq}</div></div>
      <div class="card"><b>Подарки</b> <span class="dim small">любимое: ${D.GIFTS[c.fav].ic} ${D.GIFTS[c.fav].n}</span><div class="row gap wrap">${gifts}</div></div>
      <div class="row gap wrap"><button class="btn ${inP ? 'ghost' : 'primary'} grow" data-act="crewParty" data-id="${id}" ${onM ? 'disabled' : ''}>${inP ? 'Убрать из отряда' : 'В отряд'}</button><button class="btn ghost grow" data-act="crewTalk" data-id="${id}" ${(s.crewTalk || 0) < 1 ? 'disabled' : ''}>💬 Поговорить (${s.crewTalk || 0})</button><button class="btn ghost grow" data-act="crewMis" data-id="${id}" ${onM || inP && s.run ? 'disabled' : ''}>🧭 На задание</button></div>
      <button class="btn ghost wide" data-act="closeModal">Закрыть</button></div>`);
  };
  UI.act.crewParty = (el) => { const s = UI.slot(), id = el.dataset.id; let p = s.party.slice(); if (p.includes(id)) { if (s.run) { UI.toast('Во время вылазки состав не меняется', 'bad'); return; } p = p.filter((x) => x !== id); } else { if (s.run) { UI.toast('Во время вылазки состав не меняется', 'bad'); return; } if (p.length >= E.PARTY_MAX) p.shift(); p.push(id); } E.setParty(s, p); UI.save(true); UI.crewModal(); UI.refresh(); };
  UI.act.crewTalk = (el) => { const s = UI.slot(), id = el.dataset.id, r = E.talk(s, id); if (!r) return; UI.sfx('ok'); UI.save(true); UI.crewModal(); UI.toast(`«${esc(r.line)}»${r.loy ? ' · верность +' + r.loy : ''}${r.aff ? ' · симпатия +' + r.aff : ''}`, 'gold'); UI.refresh(); };
  UI.act.giveGift = (el) => { const s = UI.slot(), id = el.dataset.id, g = el.dataset.g, r = E.giveGift(s, id, g); if (!r) return; UI.sfx(r.t ? 'level' : 'ok'); UI.save(true); UI.toast(['Спасибо.', 'О, мне нравится!', 'Это ровно то, что нужно!'][r.t] + ` · верность +${r.loy}${r.aff ? ' · симпатия +' + r.aff : ''}`, r.t ? 'gold' : 'ok'); if (UI.tab === 'crew') UI.crewModal(); UI.refresh(); if (UI.tab === 'hearts') UI.heartModal && UI.heartModal(); };
  UI.act.crewEq = (el) => {
    const s = UI.slot(), id = UI.sub.crewId, key = el.dataset.k, cur = s.crew[id].eq[key];
    const items = s.inv.filter((it) => E.crewSlotOk(key, it)).sort((a, b) => b.il - a.il).slice(0, 30);
    UI.modal(`<h3>${D.CREW[id].n}: ${key === 'weapon' ? 'оружие' : key === 'armor' ? 'броня' : 'украшение'}</h3><div class="mlist">${cur ? `<button class="item" data-act="crewUneq" data-k="${key}" data-quiet="1"><span class="grow tl"><b>Снять:</b> ${gearName(cur)}</span></button>` : ''}${items.map((it) => `<button class="item" style="--rc:${D.RARITY[it.r].c}" data-act="crewPut" data-k="${key}" data-i="${it.id}" data-quiet="1"><span class="grow tl"><b>${gearName(it)}</b><small>ур.пред. ${it.il}</small></span></button>`).join('') || '<div class="dim center pad">В сумке нет подходящих предметов</div>'}</div><button class="btn ghost wide" data-act="crewBack">Назад</button>`);
  };
  UI.act.crewBack = () => UI.crewModal();
  UI.act.crewPut = (el) => { const r = E.crewEquip(UI.slot(), UI.sub.crewId, el.dataset.k, +el.dataset.i); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('forge'); UI.save(true); UI.crewModal(); UI.refresh(); };
  UI.act.crewUneq = (el) => { E.crewUnequip(UI.slot(), UI.sub.crewId, el.dataset.k); UI.save(true); UI.crewModal(); UI.refresh(); };
  UI.act.crewMis = (el) => {
    const s = UI.slot(), id = el.dataset.id; const ds = D.DUNGEONS.map((d) => d.id).filter((d) => E.dungeonUnlocked(s, d));
    UI.sub.misId = id;
    UI.modal(`<h3>🧭 ${esc(D.CREW[id].n)}: задание</h3><div class="small dim tl">Идёт в реальном времени (даже когда игра закрыта). Шанс успеха зависит от уровня и верности. До трёх заданий одновременно.</div><div class="mlist">${ds.map((d) => `<div class="card"><b>${D.DUN[d].ic} ${D.DUN[d].n}</b> <small class="dim">ур. ${D.DUN[d].lv}</small><div class="row gap">${E.MISSION_DUR.map((m, i) => `<button class="btn ghost small grow" data-act="missionGo" data-d="${d}" data-m="${i}" data-quiet="1">${m.n}<br><small>${m.min} мин · ${Math.round(E.missionChance(s, { cid: id, did: d }) * 100)}%</small></button>`).join('')}</div></div>`).join('')}</div><button class="btn ghost wide" data-act="crewBack">Назад</button>`);
  };
  UI.act.missionGo = (el) => { const s = UI.slot(), r = E.sendMission(s, UI.sub.misId, el.dataset.d, +el.dataset.m); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('ok'); UI.save(true); UI.closeModal(); UI.toast('Отправлен на задание', 'ok'); UI.refresh(); };

  // ═════ ПОДАРКИ (лавка) ═════
  UI.giftShop = function (s) {
    return Object.keys(D.GIFTS).map((g) => { const x = D.GIFTS[g]; return `<div class="item"><span class="ico">${x.ic}</span><span class="grow tl"><b>${x.n}</b> <small>есть: ${E.giftCount(s, g)}</small><small>${x.d}</small></span><button class="btn small ${s.gold >= x.p ? 'primary' : 'ghost'}" data-act="buyGiftBtn" data-g="${g}" data-quiet="1">🪙 ${x.p}</button></div>`; }).join('');
  };
  UI.act.buyGiftBtn = (el) => { if (E.buyGift(UI.slot(), el.dataset.g, 1)) { UI.sfx('gold'); UI.save(true); const l = $('.mlist'); const sc = l ? l.scrollTop : 0; UI.shopModal(); const l2 = $('.mlist'); if (l2) l2.scrollTop = sc; UI.refresh(); } else { UI.toast('Не хватает золота', 'bad'); UI.sfx('err'); } };

  // ═════ СЕРДЦА ═════
  UI.romPending = (s) => D.ROM_IDS.filter((id) => E.romScenePending(s, id) >= 0).length;
  const bondText = (id, st) => { const R = D.ROMANCE[id]; if (!R || !R.bond) return ''; return Object.keys(R.bond).map((k) => `${R.bond[k] * st > 0 ? '+' : ''}${Math.round(R.bond[k] * st * 10) / 10}${/%$/.test(D.MODN[k] || '') ? '%' : ''} ${(D.MODN[k] || D.STAT_N[k] || k).replace(/\s*%$/, '')}`).join(', '); };
  UI.tabs.hearts = function (s) {
    const pend = UI.romPending(s);
    const cards = D.ROM_IDS.map((id) => {
      const c = D.CREW[id], R = s.rom[id], rec = !!s.crew[id];
      if (!rec) return `<div class="card heart locked"><div class="row gap center-v">${sil(c.art, 'sm')}<div class="grow tl"><b>???</b><div class="dim small">${c.t === 'her' ? 'Героиня Света — её судьба решится в дуэли' : 'Генерал — присоединится по ходу сюжета'}</div></div></div></div>`;
      const stg = E.romStage(R), pd = E.romScenePending(s, id);
      return `<button class="card heart tap ${pd >= 0 ? 'glow' : ''}" data-act="heartOpen" data-id="${id}" data-quiet="1"><div class="row gap center-v">${UI.por(c.art, 'sm', true)}<div class="grow tl"><b>${esc(c.n)}</b> ${pd >= 0 ? '<span class="tag new">новая сцена</span>' : ''}<div class="dim small">${esc(c.role)}</div><div class="affb">${bar(R.aff, 100, 'aff')}<i style="left:15%"></i><i style="left:40%"></i><i style="left:70%"></i></div><div class="dim small">💞 ${R.aff}/100 · ступень ${stg}/3${stg ? ' · ' + bondText(id, stg) : ''}</div></div></div></button>`;
    }).join('');
    return `<h2>Сердца</h2><div class="small dim tl">Лёгкая романтика без откровенных сцен: разговоры, подарки, свидания. Симпатия открывает три сцены (на 15, 40 и 70) и даёт постоянные бонусы. Свободных вечеров: <b>${s.crewTalk || 0}</b>${pend ? ` · новых сцен: <b>${pend}</b>` : ''}.</div>${cards}`;
  };
  UI.act.heartOpen = (el) => { UI.sub.heartId = el.dataset.id; UI.heartModal(); };
  UI.heartModal = function () {
    const s = UI.slot(), id = UI.sub.heartId, c = D.CREW[id], R = s.rom[id], st = s.crew[id]; if (!R || !st) return;
    const R0 = D.ROMANCE[id], stg = E.romStage(R);
    const sc = R0.scenes.map((x, i) => { const seen = R.seen.includes(i), ok = R.aff >= E.ROM_AT[i]; return `<button class="btn ${seen ? 'ghost' : ok ? 'primary' : 'ghost'} small grow" data-act="romScene" data-id="${id}" data-i="${i}" ${ok ? '' : 'disabled'} data-quiet="1">${seen ? '↺ ' : ok ? '▶ ' : '🔒 '}${i + 1}<br><small>${ok ? esc(x.sub.split('·')[1] || x.sub) : 'симп. ' + E.ROM_AT[i]}</small></button>`; }).join('');
    const gifts = Object.keys(D.GIFTS).filter((g) => E.giftCount(s, g) > 0).map((g) => `<button class="btn ghost small" data-act="giveGift" data-id="${id}" data-g="${g}" data-quiet="1">${D.GIFTS[g].ic} ×${E.giftCount(s, g)}</button>`).join('') || '<span class="dim small">Подарков нет — купите в лавке.</span>';
    const why = E.dateOk(s, id);
    UI.modal(`<div class="crewm"><div class="row gap">${UI.por(c.art, 'lg', false)}<div class="grow tl"><h3 class="m0">${esc(c.n)}</h3><div class="dim small">${esc(c.role)}</div><div class="affb">${bar(R.aff, 100, 'aff')}<i style="left:15%"></i><i style="left:40%"></i><i style="left:70%"></i></div><div class="small">💞 ${R.aff}/100 · верность: ${D.loyTier(st.loy).n}</div></div></div>
      <div class="small tl">${stg ? '<b>Бонус сердца:</b> ' + bondText(id, stg) : 'Бонус откроется со ступенью 1 (симпатия 15).'}</div>
      <div class="card"><b>Сцены</b><div class="row gap">${sc}</div></div>
      <div class="card"><b>Подарок</b> <span class="dim small">любимое: ${D.GIFTS[c.fav].ic} ${D.GIFTS[c.fav].n}</span><div class="row gap wrap">${gifts}</div></div>
      <div class="card"><b>Свидание</b> <span class="dim small">🪙 ${E.dateCost(s)} · 1 вечер</span><div class="row gap">${D.DATE_PLACES.map((p, i) => `<button class="btn ghost small grow" data-act="dateGo" data-id="${id}" data-i="${i}" ${why ? 'disabled' : ''} data-quiet="1">${p.n}</button>`).join('')}</div>${why ? `<div class="small dim">${why}</div>` : ''}</div>
      <div class="row gap"><button class="btn ghost grow" data-act="crewTalk" data-id="${id}" ${(s.crewTalk || 0) < 1 ? 'disabled' : ''}>💬 Поговорить</button><button class="btn ghost grow" data-act="closeModal">Закрыть</button></div></div>`);
  };
  UI.act.romScene = async (el) => {
    const s = UI.slot(), id = el.dataset.id, i = +el.dataset.i, R = s.rom[id], sc = D.ROMANCE[id].scenes[i]; if (!R || R.aff < E.ROM_AT[i]) return;
    const first = !R.seen.includes(i); UI.closeModal();
    await UI.playLines(sc.lines, { bg: sc.bg, replay: !first });
    if (first) { R.seen.push(i); E.addLoy(s, id, 5); E.addAff(s, id, 2); s.rev++; UI.toast('💞 Бонус сердца усилен', 'gold'); UI.save(true); }
    UI.refresh(false); UI.heartModal();
  };
  UI.act.dateGo = async (el) => {
    const s = UI.slot(), id = el.dataset.id, sc = D.dateScene(id, +el.dataset.i); if (E.dateOk(s, id)) return; UI.closeModal();
    const res = await UI.playLines(sc.lines, { bg: sc.bg, replay: false });
    const r = E.doDate(s, id, !!res.date); UI.save(true);
    if (r) UI.toast(`💞 Свидание: симпатия +${r.aff}, верность +${r.loy}`, res.date ? 'gold' : 'ok');
    UI.refresh(false); UI.heartModal();
  };
})();
