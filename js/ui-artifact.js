/* UI v2.17: слот артефакта (Герой), коллекция и подробности артефактов, «Подземелье Артефактов», расширенная Свита (звёзды, мастерство, узы, поддержка). */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { esc, fmt } = UI;
  const R = (a) => D.ART_RAR[a.r];
  // иконка: assets/artifacts/icons/t/<id>.webp (128) / <id>.webp (512); если файла нет — эмодзи в рамке редкости
  UI.artIc = function (a, big) {
    const src = big ? a.icon : a.icon128;
    return `<span class="aic${big ? ' big' : ''}" style="--ac:${R(a).c};--ag:${R(a).g}"><img src="${src}" alt="" draggable="false" loading="lazy" decoding="async" onerror="this.remove()"><i>${a.ic}</i></span>`;
  };
  const rb = (a) => `<span class="arb ${a.r === D.ART_WORLD ? 'world' : ''}" style="--ac:${R(a).c}">${R(a).n}</span>`;
  const stars = (n) => n ? `<span class="astar">${'★'.repeat(n)}${'☆'.repeat(D.ART_STAR_MAX - n)}</span>` : '';
  const statLines = (id, st) => { const s = E.artStats(id, st); return Object.keys(s).map((k) => `<span>${esc(E.gearLabel(k))} <b>${E.fmtGear(k, s[k])}</b></span>`).join(''); };
  const pasLines = (a) => a.pas.map((p) => `<div class="apas"><b>✦ ${esc(p.n)}</b> — ${Object.keys(p.m).map((k) => esc(E.gearLabel(k)) + ' ' + E.fmtGear(k, p.m[k])).join(', ')}${p.d ? `<div class="dim small">${esc(p.d)}</div>` : ''}</div>`).join('');
  const skLines = (a) => a.sk.map((id) => { const k = D.SKILLS[id]; return k ? `<div class="apas sk"><b>${k.ic} ${esc(k.n)}</b> <span class="dim small">${k.mp} эн. · пер. ${k.cd}</span><div class="small">${esc(k.d)}</div></div>` : ''; }).join('');

  // ═════ Герой: слот артефакта ═════
  UI.artSlotCard = function (s) {
    E.artEnsure(s); const id = E.artEquipped(s), a = id && D.ART[id], n = Object.keys(s.arts).length;
    const cell = a ? `<button class="artslot on ${a.r === D.ART_WORLD ? 'world' : ''}" style="--ac:${R(a).c};--ag:${R(a).g}" data-act="artOpen" data-id="${id}" data-quiet="1">${UI.artIc(a, true)}<span class="grow tl"><b>${esc(a.n)}</b><small>${rb(a)} ${stars(s.arts[id])}</small><small class="dim">${a.sk.map((k) => D.SKILLS[k].ic + ' ' + esc(D.SKILLS[k].n)).join(' · ')}</small></span></button>`
      : `<button class="artslot empty" data-act="artList" data-quiet="1"><span class="aic big empty"><i>🏺</i></span><span class="grow tl"><b>Слот артефакта пуст</b><small class="dim">${n ? 'Выберите артефакт из коллекции' : 'Артефакты добываются в Подземелье Артефактов (с ур. ' + D.ART_UNLOCK_LV + ')'}</small></span></button>`;
    return `<div class="card artcard"><div class="row between center-v"><b>🏺 Артефакт</b><button class="btn ghost small" data-act="artList" data-quiet="1">Коллекция ${n}/${D.ART_IDS.length}</button></div>${cell}</div>`;
  };
  UI.act.artList = () => UI.artListModal();
  UI.artListModal = function () {
    const s = UI.slot(); E.artEnsure(s);
    const rows = D.ART_RAR.map((rr, r) => {
      const list = D.ARTIFACTS.filter((a) => a.r === r).map((a) => { const own = s.arts[a.id] != null, eq = s.artEq === a.id;
        return own ? `<button class="aitem ${eq ? 'eq' : ''}" style="--ac:${rr.c};--ag:${rr.g}" data-act="artOpen" data-id="${a.id}" data-quiet="1">${UI.artIc(a)}<small>${esc(a.n)}</small>${stars(s.arts[a.id])}${eq ? '<em>надет</em>' : ''}</button>`
          : `<div class="aitem lock" style="--ac:${rr.c}"><span class="aic"><i>❔</i></span><small>???</small></div>`; }).join('');
      return `<div class="arow"><div class="arh" style="color:${rr.c}">${rr.n}${r === D.ART_WORLD ? ' · уникальные' : ''}</div><div class="agrid">${list}</div></div>`;
    }).join('');
    UI.modal(`<h3>🏺 Коллекция артефактов</h3><div class="small dim tl">У героя один слот артефакта. Повторная находка добавляет звезду (+${Math.round(D.ART_STAR_K * 100)}% к статам, до ${D.ART_STAR_MAX}); Мировые артефакты существуют в одном экземпляре.</div><div class="alist">${rows}</div>${s.artEq ? '<button class="btn ghost wide" data-act="artUneq">Снять артефакт</button>' : ''}<button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.artOpen = (el) => UI.artModal(el.dataset.id);
  UI.artModal = function (id) {
    const s = UI.slot(), a = D.ART[id]; if (!a) return; const own = s.arts && s.arts[id] != null, eq = s.artEq === id, st = own ? s.arts[id] : 0;
    const comp = a.comp && D.CREW[a.comp] ? `<div class="acomp">${UI.por(D.CREW[a.comp].art, 'sm', true)}<div class="grow tl"><b>Спутница: ${esc(D.CREW[a.comp].n)}</b><div class="small dim">${esc(D.CREW[a.comp].role)}${s.crew[a.comp] ? ' · уже в Свите' : ' · присоединится с артефактом'}</div></div></div>` : '';
    UI.modal(`<div class="amodal ${a.r === D.ART_WORLD ? 'world' : ''}" style="--ac:${R(a).c};--ag:${R(a).g}"><div class="row gap center-v">${UI.artIc(a, true)}<div class="grow tl"><h3 class="m0">${esc(a.n)}</h3><div>${rb(a)} ${stars(st)}</div></div></div>
      <div class="alore small">«${esc(a.lore)}»</div>
      <div class="card"><b>Характеристики</b><div class="astats small">${statLines(id, st)}</div></div>
      <div class="card"><b>Пассивы</b>${pasLines(a)}</div>
      <div class="card"><b>Навыки</b>${skLines(a)}</div>${comp}
      <div class="row gap">${own ? `<button class="btn ${eq ? 'ghost' : 'primary'} grow" data-act="${eq ? 'artUneq' : 'artEq'}" data-id="${id}">${eq ? 'Снять' : 'Надеть'}</button>` : ''}<button class="btn ghost grow" data-act="artList">К коллекции</button></div></div>`, { cls: 'tall' });
  };
  UI.act.artEq = (el) => { const s = UI.slot(), r = E.artEquip(s, el.dataset.id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('forge'); UI.save(true); UI.toast('Артефакт надет', 'gold'); UI.artModal(el.dataset.id); UI.refresh(); };
  UI.act.artUneq = () => { const s = UI.slot(), r = E.artEquip(s, null); if (r) { UI.toast(r, 'bad'); return; } UI.save(true); UI.closeModal(); UI.refresh(); };

  // ═════ Подземелье Артефактов ═════
  UI.artDunCard = function (s) {
    const open = s.hero.level >= D.ART_UNLOCK_LV, best = (s.artProg && s.artProg.best) || 0;
    return `<button class="card dcard artdun ${open ? '' : 'lockd'}" data-act="artDun" data-quiet="1"><div class="dic adic"><span>🏺</span></div><div class="grow tl"><b>Подземелье Артефактов</b> <span class="tag new">особое</span><div class="dim small">ур. 30–300 · этапов: ${D.ART_STAGES.length} · пройдено: ${best}</div><div class="small tl dim">${open ? 'Каждая победа над стражем этапа — шанс найти артефакт. Чем реже редкость, тем ниже шанс.' : 'Откроется на ' + D.ART_UNLOCK_LV + ' уровне героя.'}</div></div></button>`;
  };
  const chanceRow = (s, i) => E.artDropTable(s, i).map((t) => `<span class="ach" style="--ac:${D.ART_RAR[t.r].c}">${D.ART_RAR[t.r].n} ${t.p}%</span>`).join('') || '<span class="dim">все артефакты этапа уже найдены</span>';
  const divWarn = (s) => { const n = Object.values(s.eq || {}).filter((it) => it && (it.r | 0) >= 7).length; return `<div class="awarn">⚠️ Рекомендуется <b>Божественное снаряжение</b>. Здесь могут выпасть Божественные и Мировые артефакты. <span class="dim">(на вас божественных вещей: ${n}/${Object.keys(D.SLOTS).length})</span></div>`; };
  UI.act.artDun = () => {
    const s = UI.slot(); if (s.hero.level < D.ART_UNLOCK_LV) { UI.toast('Подземелье Артефактов откроется на ' + D.ART_UNLOCK_LV + ' уровне', 'bad'); UI.sfx('err'); return; }
    if (s.run) { UI.toast('Сначала завершите текущую вылазку', 'bad'); return; }
    const rows = D.ART_STAGES.map((d, i) => { const open = E.artStageOpen(s, i), cl = !!s.prog.cleared[d.id], last = D.ART_DIVINE_STAGES.includes(i);
      return `<button class="astage ${open ? '' : 'lockd'} ${last ? 'divine' : ''}" data-act="artStage" data-i="${i}" data-quiet="1"><div class="row between center-v"><b>${cl ? '✔' : open ? '▶' : '🔒'} Этап ${i + 1}</b><span class="tag">ур. ${d.ur}</span></div><div class="small dim tl">Страж: ${D.ENEMIES[d.boss].ic} ${esc(D.ENEMIES[d.boss].n)}${cl ? ' · побед: ' + ((s.artProg.clears || {})[d.id] || 0) : ''}</div><div class="achs small">${chanceRow(s, i)}</div>${last ? '<div class="small awarn mini">⚠️ Рекомендуется Божественное снаряжение</div>' : ''}</button>`; }).join('');
    UI.modal(`<h3>🏺 Подземелье Артефактов</h3><div class="small dim tl">Сокровищница вещей старше мира. Каждый этап — два яруса и страж. Победа над стражем даёт Знаки возвышения и шанс на артефакт (по редкости ниже). Божественные и Мировые артефакты лежат только на двух последних этапах; Мировые уникальны.</div><div class="alist">${rows}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.artStage = (el) => {
    const s = UI.slot(), i = +el.dataset.i, d = D.ART_STAGES[i];
    if (!E.artStageOpen(s, i)) { UI.toast(i ? 'Сначала пройдите этап ' + i : 'Нужен ' + D.ART_UNLOCK_LV + ' уровень', 'bad'); UI.sfx('err'); return; }
    UI.prep = { did: d.id, tier: 0, buffs: {} }; UI.prepModal();
  };
  UI.artPrepNote = function (s, d) {
    const i = d.art - 1;
    return `<div class="artprep"><div class="small tl"><b>Этап ${d.art} · ур. ${d.ur}</b> <span class="dim">(боевой уровень врагов ${d.lv}–${d.lv + d.floors + 1}, сила ×${d.mul.toFixed(2)})</span></div><div class="achs small">${chanceRow(s, i)}</div>${D.ART_DIVINE_STAGES.includes(i) ? divWarn(s) : ''}</div>`;
  };
  UI.artDropHtml = function (rep) {
    if (!rep || (!rep.art && !rep.artSig)) return '';
    const s = UI.slot(); let h = rep.artSig ? `<div class="small">🔱 Знаки возвышения +${rep.artSig}</div>` : '';
    const r = rep.art; if (!r || r.none) return h + '<div class="small dim">Артефакт на этот раз не найден.</div>';
    const a = D.ART[r.id];
    h += `<div class="adrop ${a.r === D.ART_WORLD ? 'world' : ''}" style="--ac:${R(a).c};--ag:${R(a).g}">${UI.artIc(a)}<div class="grow tl"><b>${r.isNew ? '🏺 Новый артефакт!' : '🏺 Артефакт'}</b><div>${esc(a.n)} ${rb(a)}</div><div class="small dim">${r.star ? 'Повтор: звезда ' + r.star + '/' + D.ART_STAR_MAX : r.conv ? 'Звёзды на максимуме → 🔱' + r.conv.sig + ' и 🪙' + fmt(r.conv.gold) : r.refused ? 'Уникален — второй экземпляр невозможен' : 'Наденьте во вкладке «Герой»'}</div>${r.comp ? `<div class="small">✨ К вам присоединилась <b>${esc(D.CREW[r.comp].n)}</b>!</div>` : ''}</div></div>`;
    return h;
  };

  // ═════ Свита: звёзды, мастерство, узы, поддержка ═════
  UI.crewTopExtra = function (s) {
    const sup = s.support && D.CREW[s.support];
    return `<div class="card small tl crewx"><b>🤝 Поддержка в бою:</b> ${sup ? `${esc(sup.n)} — герой получает навык «${esc(D.SKILLS['sup_' + sup.arch].n)}»` : '<span class="dim">не выбрана (назначьте в карточке члена Свиты вне отряда)</span>'}<br><b>🔱 Знаки возвышения:</b> ${fmt((s.mats && s.mats.asc_sigil) || 0)} <span class="dim">— экспедиции и Подземелье Артефактов</span></div>`;
  };
  UI.crewExtra = function (s, id) {
    const st = E.crewEnsure(s.crew[id]), c = D.CREW[id], bl = E.bondLv(st), nx = E.bondNext(st), ac = E.ascCost(st), aw = E.crewAscendWhy(s, id), sc = E.sklCost(st), sw = E.crewSkillUpWhy(s, id);
    const bh = D.BOND_HERO[c.arch], supOk = !E.supportOk(s, id), isSup = s.support === id;
    return `<div class="card crewx small tl">
      <div class="row between center-v"><b>Возвышение ${'★'.repeat(st.star)}${'☆'.repeat(D.CREW_STAR_MAX - st.star)}</b><span class="dim">+${st.star * 12}% силы · потолок +${st.star * 10} ур.</span></div>
      ${st.star < D.CREW_STAR_MAX ? `<button class="btn ${aw ? 'ghost' : 'primary'} small wide" data-act="crewAsc" data-id="${id}" ${aw ? 'disabled' : ''}>Возвысить: 🪙${fmt(ac.gold)} · 🔱${ac.sig} · ур. ${ac.lv}+${aw ? ' — ' + esc(aw) : ''}</button>` : ''}
      <div class="row between center-v"><b>Мастерство навыков ${st.skl}/${D.CREW_SKL_MAX}</b><span class="dim">+${st.skl * 10}% к силе навыков</span></div>
      ${st.skl < D.CREW_SKL_MAX ? `<button class="btn ${sw ? 'ghost' : 'primary'} small wide" data-act="crewSkl" data-id="${id}" ${sw ? 'disabled' : ''}>Улучшить: 🪙${fmt(sc.gold)} · 🔱${sc.sig}${sw ? ' — ' + esc(sw) : ''}</button>` : ''}
      <div class="row between center-v"><b>Узы ${bl}/${D.CREW_BOND_MAX}</b><span class="dim">${nx ? 'опыт уз ' + Math.floor(st.bxp) + '/' + nx : 'максимум'}</span></div>
      <div class="dim">Сила +${bl * 2}% · герою: ${esc(E.gearLabel(bh[0]))} +${Math.round(bh[1] * bl * 10) / 10}%. Узы растут в боях, разговорах, от подарков и заданий.</div>
      <button class="btn ${isSup ? 'ghost' : supOk ? 'primary' : 'ghost'} small wide" data-act="crewSup" data-id="${id}" ${isSup || supOk ? '' : 'disabled'}>${isSup ? 'Снять с поддержки' : '🤝 Назначить поддержкой'} <span class="dim">(«${esc(D.SKILLS['sup_' + c.arch].n)}»)</span></button></div>`;
  };
  UI.act.crewAsc = (el) => { const r = E.crewAscend(UI.slot(), el.dataset.id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('level'); UI.save(true); UI.toast('★ Возвышение!', 'gold'); UI.crewModal(); UI.refresh(); };
  UI.act.crewSkl = (el) => { const r = E.crewSkillUp(UI.slot(), el.dataset.id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('level'); UI.save(true); UI.toast('Мастерство повышено', 'gold'); UI.crewModal(); UI.refresh(); };
  UI.act.crewSup = (el) => { const s = UI.slot(), id = el.dataset.id, r = E.setSupport(s, s.support === id ? null : id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('ok'); UI.save(true); UI.crewModal(); UI.refresh(); };

  // портреты спутниц артефактов (не в манифесте новеллы): кроп лица для малых размеров, полный арт — для крупных
  const _por = UI.por;
  UI.por = function (id, cls, lazy, mood) {
    const c = id && D.CREW_ARTS && D.CREW_ARTS.map((k) => D.CREW[k]).find((x) => x.art === id);
    if (!c) return _por(id, cls, lazy, mood);
    const src = /\b(xl)\b/.test(cls || '') ? c.img : c.av;
    return `<img class="por ${cls || ''} artpor" ${lazy === false ? '' : 'loading="lazy"'} decoding="async" alt="" draggable="false" src="${src}">`;
  };
})();
