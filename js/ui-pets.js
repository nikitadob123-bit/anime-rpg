/* UI v2.19: слот питомца (Герой), коллекция, карточка питомца (уровень, корм, узы, навыки, пассивы), инкубатор и лавка яиц. Арт: assets/pets/<id>.webp (+ t/), нет файла — эмодзи в рамке редкости. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { esc, fmt } = UI;
  const R = (p) => D.PET_RAR[p.r];
  const bar = (v, max, cl) => `<span class="bar ${cl || ''}"><i style="width:${Math.max(0, Math.min(100, v / Math.max(1, max) * 100))}%"></i></span>`;
  UI.petIc = function (p, big) {
    const src = big ? p.art : p.thumb;
    return `<span class="aic pic${big ? ' big' : ''}" style="--ac:${R(p).c};--ag:${R(p).g}"><img src="${src}" alt="" draggable="false" loading="lazy" decoding="async" onerror="this.remove()"><i>${p.ic}</i></span>`;
  };
  const rb = (p) => `<span class="arb" style="--ac:${R(p).c}">${R(p).n}</span>`;
  const stars = (n) => `<span class="astar">${'★'.repeat(n)}${'☆'.repeat(D.PET_STAR_MAX - n)}</span>`;
  const ph = (p) => p.ph ? '<div class="small dim tl petph">🖼 Заглушка: рисунок питомца будет добавлен позже.</div>' : '';
  const mins = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? Math.floor(m / 60) + ' ч ' + (m % 60) + ' мин' : m + ' мин'; };

  // ═════ Герой: слот питомца ═════
  UI.petSlotCard = function (s) {
    E.petEnsure(s); const id = E.petEquipped(s), p = id && D.PET[id], n = Object.keys(s.pets).length, eggs = Object.values(s.eggs).reduce((a, b) => a + b, 0), hatch = s.hatch ? (E.hatchLeft(s) ? '🥚 ' + mins(E.hatchLeft(s)) : '🐣 готово!') : '';
    const cell = p ? `<button class="artslot on" style="--ac:${R(p).c};--ag:${R(p).g}" data-act="petOpen" data-id="${id}" data-quiet="1">${UI.petIc(p, true)}<span class="grow tl"><b>${esc(p.n)}</b><small>${rb(p)} ${stars(s.pets[id].star)}</small><small class="dim">ур. ${s.pets[id].lv} · узы ${E.petBond(s, id)}/5 · ${E.petSkills(s).map((k) => D.SKILLS[k].ic).join(' ')}</small></span></button>`
      : `<button class="artslot empty" data-act="petList" data-quiet="1"><span class="aic big empty"><i>🐾</i></span><span class="grow tl"><b>Слот питомца пуст</b><small class="dim">${n ? 'Выберите питомца из коллекции' : 'Яйца падают с боссов подземелий и продаются в инкубаторе'}</small></span></button>`;
    return `<div class="card artcard petcard"><div class="row between center-v"><b>🐾 Питомец</b><span class="row gap"><button class="btn ghost small" data-act="hatchery" data-quiet="1">🥚 ${hatch || (eggs ? 'Яйца ' + eggs : 'Инкубатор')}</button><button class="btn ghost small" data-act="petList" data-quiet="1">Коллекция ${n}/${D.PETS.length}</button></span></div>${cell}</div>`;
  };
  UI.act.petList = () => UI.petListModal();
  UI.petFlt = { r: -1, own: false, q: '' };   // фильтр коллекции: редкость (-1 — все) и «только полученные»
  UI.act.petFlt = (el) => { if (el.dataset.k === 'own') UI.petFlt.own = !UI.petFlt.own; else UI.petFlt.r = +el.dataset.r; UI.petListModal(); };
  UI.act.petSearch = () => { const el = document.getElementById('petQ'); UI.petFlt.q = el ? el.value : ''; UI.petListModal(true); const n = document.getElementById('petQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };
  document.addEventListener('input', (e) => { if (e.target.id === 'petQ') { clearTimeout(UI._pq); UI._pq = setTimeout(() => UI.act.petSearch(), 250); } });
  UI.petListModal = function (keep) {
    const s = UI.slot(), F = UI.petFlt; E.petEnsure(s); const m0 = document.querySelector('.mbox'), top = m0 && m0.scrollTop;
    const have = (r) => E.petsOf(r).filter((p) => s.pets[p.id]).length, all = D.PETS.length, got = Object.keys(s.pets).length;
    const chips = `<div class="pfilt"><button class="${F.r < 0 ? 'on' : ''}" data-act="petFlt" data-r="-1" data-quiet="1">Все ${got}/${all}</button>${D.PET_RAR.filter((x) => x.open).map((x, r) => `<button class="${F.r === r ? 'on' : ''}" style="--ac:${x.c}" data-act="petFlt" data-r="${r}" data-quiet="1">${x.n.slice(0, 4)}. ${have(r)}/${E.petsOf(r).length}</button>`).join('')}<button class="${F.own ? 'on' : ''}" data-act="petFlt" data-k="own" data-quiet="1">✔ Мои</button></div><input id="petQ" class="petq" type="search" placeholder="🔍 Поиск по имени" value="${esc(F.q || '')}" autocomplete="off">`;
    const rows = D.PET_RAR.filter((x) => x.open && (F.r < 0 || F.r === D.PET_RAR.indexOf(x))).map((rr) => { const r = D.PET_RAR.indexOf(rr);
      const list = E.petsOf(r).filter((p) => (!F.own || s.pets[p.id]) && (!F.q || (s.pets[p.id] ? p.n : '').toLowerCase().includes(F.q.trim().toLowerCase()))).map((p) => { const own = s.pets[p.id], eq = s.petEq === p.id;
        return own ? `<button class="aitem ${eq ? 'eq' : ''}" style="--ac:${rr.c};--ag:${rr.g}" data-act="petOpen" data-id="${p.id}" data-quiet="1">${UI.petIc(p)}<small>${esc(p.n)}</small>${stars(own.star)}<small class="dim">ур. ${own.lv}</small>${eq ? '<em>с вами</em>' : ''}</button>`
          : `<div class="aitem lock" style="--ac:${rr.c}"><span class="aic"><i>❔</i></span><small>???</small></div>`; }).join('');
      if (!list && (F.q || F.own) && F.r < 0) return '';
      return `<div class="arow"><div class="arh" style="color:${rr.c}">${rr.n} <span class="dim small">${have(r)}/${E.petsOf(r).length}</span></div>${list ? `<div class="agrid">${list}</div>` : '<div class="small dim">Здесь пока никого.</div>'}</div>`;
    }).join('');
    const soon = F.r < 0 ? `<div class="small dim tl petsoon">${D.PET_RAR.filter((x) => !x.open).map((x) => x.n).join(' · ')} — появятся в следующих обновлениях.</div>` : '';
    UI.modal(`<h3>🐾 Питомцы</h3><div class="small dim tl">Один питомец идёт с героем: даёт характеристики как снаряжение его редкости, навыки в бою и пассивы. Повтор добавляет звезду (+${Math.round(D.PET_STAR_K * 100)}% к статам), корм поднимает уровень, а узы открывают пассивы. Драконы — только Легендарные и выше.</div>
      <div class="row gap"><button class="btn ghost grow small" data-act="hatchery" data-quiet="1">🥚 Инкубатор и лавка</button><span class="card small center m0">🍖 Корм: <b>${fmt(s.petFood)}</b></span></div>${chips}<div class="alist">${rows}${soon}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
    const m1 = document.querySelector('.mbox'); if (m1 && top && m0) m1.scrollTop = top;
  };
  UI.act.petOpen = (el) => UI.petModal(el.dataset.id);
  UI.petModal = function (id) {
    const s = UI.slot(), p = D.PET[id], r = s.pets && s.pets[id]; if (!p || !r) return; const eq = s.petEq === id, bl = E.petBond(s, id), st = E.petStats(id, r.lv, r.star, bl), cap = E.petLvCap(s);
    const nextB = D.PET_BOND_AT[bl + 1];
    const stl = Object.keys(st).map((k) => `<span>${esc(E.gearLabel(k))} <b>${E.fmtGear(k, st[k])}</b></span>`).join('');
    const pas = p.pas.map((x, i) => { const on = bl >= i; return `<div class="apas ${on ? '' : 'lockd'}"><b>${on ? '✦' : '🔒'} ${esc(x.n)}</b> — ${Object.keys(x.m).map((k) => esc(E.gearLabel(k)) + ' ' + E.fmtGear(k, x.m[k])).join(', ')}${on ? '' : `<div class="dim small">Откроется на уровне уз ${i}</div>`}</div>`; }).join('');
    const sks = p.sk.map((k, i) => { const K = D.SKILLS[k], on = r.lv >= D.PET_SK_LV[i]; return `<div class="apas sk ${on ? '' : 'lockd'}"><b>${on ? K.ic : '🔒'} ${esc(K.n)}</b> <span class="dim small">${K.mp} эн. · пер. ${K.cd}</span><div class="small">${on ? esc(skD(K)) : 'Откроется на ур. ' + D.PET_SK_LV[i]}</div></div>`; }).join('');
    UI.modal(`<div class="amodal petmodal" style="--ac:${R(p).c};--ag:${R(p).g}"><div class="row gap center-v">${UI.petIc(p, true)}<div class="grow tl"><h3 class="m0">${esc(p.n)}</h3><div>${rb(p)} ${stars(r.star)}</div><div class="small dim">${D.ELEMS[p.el] ? D.ELEMS[p.el].ic + ' ' + D.ELEMS[p.el].n : ''}${p.dragon ? ' · 🐉 дракон' : ''}</div></div></div>
      <div class="petart" style="--ac:${R(p).c};--ag:${R(p).g}"><img src="${p.art}" alt="" draggable="false" decoding="async" onerror="this.parentNode.classList.add('noimg');this.remove()"><i>${p.ic}</i></div><div class="alore small">«${esc(p.lore)}»</div>${ph(p)}
      <div class="card"><div class="row between"><b>Уровень ${r.lv}<span class="dim small"> / ${cap}</span></b><span class="small dim">${r.lv >= cap ? 'предел' : fmt(r.xp) + ' / ' + fmt(E.petNeed(r.lv)) + ' опыта'}</span></div>${bar(r.lv >= cap ? 1 : r.xp, r.lv >= cap ? 1 : E.petNeed(r.lv), 'xp')}
        <div class="row between small"><span>💞 Узы ${bl}/5</span><span class="dim">${nextB ? r.bxp + ' / ' + nextB : 'максимум'}</span></div>${bar(nextB ? r.bxp - D.PET_BOND_AT[bl] : 1, nextB ? nextB - D.PET_BOND_AT[bl] : 1, 'gold')}
        <div class="row gap"><button class="btn small grow" data-act="petFeed" data-id="${id}" data-n="1">🍖 Покормить</button><button class="btn small ghost grow" data-act="petFeed" data-id="${id}" data-n="10">×10</button><span class="small dim center-v">🍖 ${fmt(s.petFood)}</span></div></div>
      <div class="card"><b>Характеристики</b><div class="astats small">${stl}</div></div>
      <div class="card"><b>Пассивы</b>${pas}</div><div class="card"><b>Навыки</b>${sks}</div>
      <div class="row gap"><button class="btn ${eq ? 'ghost' : 'primary'} grow" data-act="${eq ? 'petUneq' : 'petEq'}" data-id="${id}">${eq ? 'Снять' : 'Взять с собой'}</button><button class="btn ghost grow" data-act="petList">К коллекции</button></div></div>`, { cls: 'tall' });
  };
  const skD = (K) => K.d + (K.fx[0] && K.fx[0].k === 'dmg' ? ': ' + Math.round(K.fx[0].m * 100) + '%' + (K.fx[0].hits ? ' ×' + K.fx[0].hits : '') : K.fx[0] && K.fx[0].k === 'heal' ? ': ' + Math.round(K.fx[0].m * 100) + '%' : '');
  UI.act.petEq = (el) => { const s = UI.slot(), r = E.petEquip(s, el.dataset.id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('forge'); UI.save(true); UI.toast('Питомец с вами', 'gold'); UI.petModal(el.dataset.id); UI.refresh(); };
  UI.act.petUneq = () => { const s = UI.slot(), r = E.petEquip(s, null); if (r) { UI.toast(r, 'bad'); return; } UI.save(true); UI.closeModal(); UI.refresh(); };
  UI.act.petFeed = (el) => { const s = UI.slot(), r = E.petFeed(s, el.dataset.id, +el.dataset.n); if (r.err) { UI.toast(r.err, 'bad'); UI.sfx('err'); return; } UI.sfx('pick'); UI.save(true); UI.toast(`Покормлено ×${r.used}${r.up ? ' · уровень ' + r.lv + '!' : ''}`, 'ok'); UI.petModal(el.dataset.id); UI.refresh(); };

  // ═════ Инкубатор и лавка ═════
  UI.act.hatchery = () => UI.hatchModal();
  UI.hatchModal = function () {
    const s = UI.slot(); E.petEnsure(s); const left = s.hatch ? E.hatchLeft(s) : 0;
    const cur = s.hatch ? (() => { const rr = D.PET_RAR[s.hatch.r]; return `<div class="card hcur" style="--ac:${rr.c}"><div class="row gap center-v"><span class="egg" style="--ac:${rr.c}">🥚</span><div class="grow tl"><b>${D.EGG_NAME[s.hatch.r]}</b><div class="small dim">${left ? 'Проклюнется через ' + mins(left) : 'Готово — можно забирать!'}</div></div></div><div class="row gap">${left ? `<button class="btn ghost small grow" data-act="hatchRush" data-quiet="1">⏩ Ускорить · 🪙 ${fmt(E.hatchRush(s))}</button>` : `<button class="btn primary grow" data-act="hatchClaim">🐣 Забрать питомца</button>`}</div></div>`; })()
      : '<div class="card small dim tl">Инкубатор пуст. Выберите яйцо ниже — оно проклюнется само, пока вы играете.</div>';
    const inv = Object.keys(s.eggs).map(Number).sort().map((r) => `<div class="row between center-v egrow" style="--ac:${D.PET_RAR[r].c}"><span>🥚 ${D.EGG_NAME[r]} <b>×${s.eggs[r]}</b> <span class="dim small">(${mins(D.EGG_MIN[r] * 60000)})</span></span><button class="btn small ghost" data-act="eggStart" data-r="${r}" ${s.hatch ? 'disabled' : ''}>Греть</button></div>`).join('') || '<div class="small dim">Яиц нет. Они выпадают с боссов (чем глубже подземелье — тем редче) или продаются ниже.</div>';
    const shop = D.EGG_PRICE.map((pr, r) => `<div class="row between center-v egrow" style="--ac:${D.PET_RAR[r].c}"><span>${D.EGG_NAME[r]}</span><button class="btn small" data-act="eggBuy" data-r="${r}" data-quiet="1" ${s.gold < pr ? 'disabled' : ''}>🪙 ${fmt(pr)}</button></div>`).join('')
      + `<div class="row between center-v egrow"><span>🍖 Корм ×10 <span class="dim small">(в наличии ${fmt(s.petFood)})</span></span><button class="btn small" data-act="foodBuy" data-n="10" data-quiet="1" ${s.gold < D.PET_FOOD_PRICE * 10 ? 'disabled' : ''}>🪙 ${fmt(D.PET_FOOD_PRICE * 10)}</button></div>`;
    UI.modal(`<h3>🥚 Инкубатор</h3>${cur}<div class="card"><b>Ваши яйца</b>${inv}</div><div class="card"><b>Лавка питомцев</b><div class="small dim">Дорогие яйца в лавке не продаются: Эпические и выше — только с боссов, Божественные — лишь с поздних этапов Подземелий Артефактов и Материалов, а Концептуальное (греется сутки) и Яйцо Истока (трое суток) — редчайшие дары 10-го этапа этих подземелий.</div>${shop}</div><div class="row gap"><button class="btn ghost grow" data-act="petList">Коллекция</button><button class="btn ghost grow" data-act="closeModal">Закрыть</button></div>`, { cls: 'tall' });
  };
  const hres = (fn) => { const s = UI.slot(), r = fn(s); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return false; } UI.save(true); UI.hatchModal(); UI.refresh(); return true; };
  UI.act.eggStart = (el) => { if (hres((s) => E.hatchStart(s, +el.dataset.r))) UI.sfx('pick'); };
  UI.act.hatchRush = () => { if (hres((s) => E.hatchSpeedUp(s))) UI.sfx('forge'); };
  UI.act.eggBuy = (el) => { if (hres((s) => E.eggBuy(s, +el.dataset.r))) UI.sfx('pick'); };
  UI.act.foodBuy = (el) => { if (hres((s) => E.foodBuy(s, +el.dataset.n))) UI.sfx('pick'); };
  UI.act.hatchClaim = () => {
    const s = UI.slot(), r = E.hatchClaim(s); if (r.err) { UI.toast(r.err, 'bad'); return; } UI.save(true); UI.sfx('win'); UI.refresh();
    const p = D.PET[r.id];
    UI.modal(`<div class="amodal petmodal center" style="--ac:${R(p).c};--ag:${R(p).g}"><h3>🐣 ${r.isNew ? 'Новый питомец!' : 'Знакомый друг!'}</h3>${UI.petIc(p, true)}<h3 class="m0">${esc(p.n)}</h3><div>${rb(p)}</div><div class="small dim">${r.isNew ? 'Взять с собой можно в карточке питомца.' : r.star ? 'Повтор: звезда ' + r.star + '/' + D.PET_STAR_MAX : 'Звёзды на максимуме → 🍖 корм +' + r.conv.food}</div><div class="row gap"><button class="btn primary grow" data-act="petOpen" data-id="${r.id}">Открыть</button><button class="btn ghost grow" data-act="hatchery" data-quiet="1">Инкубатор</button></div></div>`);
  };
  // итог боя: яйцо, корм, узы
  UI.petDropHtml = function (rep) {
    const r = rep && rep.pet; if (!r) return '';
    let h = `<div class="small">🍖 Корм +${r.food}${r.bond ? ' · 💞 узы +1' + (r.bondUp ? ' — новый уровень уз!' : '') : ''}</div>`;
    if (r.egg != null) { const rr = D.PET_RAR[r.egg]; h = `<div class="adrop" style="--ac:${rr.c};--ag:${rr.g}"><span class="aic"><i>🥚</i></span><div class="grow tl"><b>Найдено яйцо!</b><div>${D.EGG_NAME[r.egg]}</div><div class="small dim">Греть — во вкладке «Герой» → Питомец</div></div></div>` + h; }
    return h;
  };
})();
