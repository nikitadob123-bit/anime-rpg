/* UI: вкладка «Герой» — характеристики с распределением очков, меню субстатов (аккордеон), сопротивления и бонусы стихий, подсказки с формулами. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { esc, fmt } = UI;
  UI.draft = {}; UI.heroUi = { subs: false, grp: { off: true }, tip: null, elem: false };
  const num = (v, u) => { const x = Math.round(v * 10) / 10; return (u === '%' || u === '% за ход' ? x + (u === '%' ? '%' : '% за ход') : x + (u && u !== '%' ? ' ' + u : '')); };
  const sgn = (v) => (v > 0 ? '+' : '') + Math.round(v * 100) / 100;
  const draftSum = () => Object.values(UI.draft).reduce((a, b) => a + b, 0);
  UI.draftReset = () => { UI.draft = {}; };
  // слот с применённым черновиком — для предпросмотра
  function preview(s) { const h = Object.assign({}, s.hero, { alloc: Object.assign({}, s.hero.alloc) }); for (const k in UI.draft) h.alloc[k] = (h.alloc[k] || 0) + UI.draft[k]; return Object.assign({}, s, { hero: h }); }
  const parts = (ps, unit) => ps.length ? '<ul class="tipl">' + ps.map((p) => `<li><span>${esc(p.n)}</span><b>${sgn(p.v)}${unit === '%' ? '%' : ''}</b></li>`).join('') + '</ul>' : '<div class="dim small">Нет бонусов</div>';

  UI.statsCard = function (s, d0) {
    const h = s.hero, free = E.statFree(h), left = free - draftSum(), pv = preview(s), dp = draftSum() ? E.derive(pv) : d0, c = E.collect(pv);
    const rows = D.STATS.map((k) => {
      const add = UI.draft[k] || 0, base = d0[k], cur = dp[k], tip = UI.heroUi.tip === 'st:' + k;
      const src = c.sby[k] || {}; const st = Object.keys(src).filter((x) => src[x]).map((x) => ({ n: E.srcName(x), v: src[x] }));
      return `<div class="stline ${tip ? 'open' : ''}"><div class="strow"><button class="stname" data-act="heroTip" data-k="st:${k}" data-quiet="1"><span class="sti">${D.STAT_IC[k]}</span><span class="grow tl"><b>${D.STAT_N[k]}</b><small class="dim">${esc(D.STAT_D[k])}</small></span></button>
        <span class="stval">${cur}${add ? `<em class="up">+${add}</em>` : ''}</span>
        <span class="stbtns"><button class="sbtn" data-act="draftAdd" data-k="${k}" data-n="-1" data-quiet="1" ${add > 0 ? '' : 'disabled'}>−</button><button class="sbtn splus" data-act="draftAdd" data-k="${k}" data-n="1" data-quiet="1" ${left > 0 ? '' : 'disabled'}>+</button><button class="sbtn" data-act="draftAdd" data-k="${k}" data-n="5" data-quiet="1" ${left > 0 ? '' : 'disabled'}>+5</button><button class="sbtn" data-act="draftAdd" data-k="${k}" data-n="max" data-quiet="1" ${left > 0 ? '' : 'disabled'}>макс</button></span></div>
        ${tip ? `<div class="tipbox"><div class="small tl"><b>${D.STAT_N[k]}</b>: ${esc(D.STAT_D[k])}.</div>${parts(st)}<div class="dim small">Вложено вами: ${(h.alloc && h.alloc[k]) || 0}</div></div>` : ''}</div>`;
    }).join('');
    const cost = E.statRespecCost(h), spent = E.statSpent(h);
    const hp = Math.round(s.hero.hp != null ? s.hero.hp : dp.maxHp), mp = Math.round(s.hero.mp != null ? s.hero.mp : dp.maxMp);
    return `<div class="card stcard"><div class="row between center-v"><b>Характеристики</b><span class="pts mini"><b>${left}</b><small>очков</small></span></div>
      <div class="small dim tl">+${D.STAT_PER_LEVEL} очков за уровень. Нажмите на название — формула и источники.</div>
      <div class="stlist">${rows}</div>
      <div class="hpmprow"><div class="hpm"><span class="hpmic c-hp" aria-hidden="true">❤</span><span>${fmt(hp)} / ${fmt(dp.maxHp)}</span><span class="bar hp"><i style="width:${Math.max(0, Math.min(100, hp / dp.maxHp * 100))}%"></i></span></div><div class="hpm"><span class="hpmic c-mp" aria-hidden="true">◆</span><span>${fmt(mp)} / ${fmt(dp.maxMp)}</span><span class="bar mp"><i style="width:${Math.max(0, Math.min(100, mp / dp.maxMp * 100))}%"></i></span></div></div>
      <div class="stats"><span>🎯 крит ${Math.round(dp.crit)}%</span><span>💥 ×${dp.critDmg.toFixed(2)}</span><span>🌀 укл. ${Math.round(dp.eva)}%</span></div>
      <div class="row gap"><button class="btn primary grow" data-act="draftApply" data-quiet="1" ${draftSum() ? '' : 'disabled'}>Применить${draftSum() ? ' (' + draftSum() + ')' : ''}</button><button class="btn ghost" data-act="draftClear" data-quiet="1" ${draftSum() ? '' : 'disabled'}>Отмена</button></div>
      <button class="btn ghost danger" data-act="statRespec" data-quiet="1" ${spent ? '' : 'disabled'}>Сбросить вложенные очки (${spent}) — ${fmt(cost)} 🪙</button>
      <button class="subtoggle ${UI.heroUi.subs ? 'open' : ''}" data-act="toggleSubs" data-quiet="1"><span>Субстаты и стихии</span><i>${UI.heroUi.subs ? '▴' : '▾'}</i></button>
      ${UI.heroUi.subs ? subsMenu(pv) : ''}</div>`;
  };
  function subsMenu(s) {
    const rows = E.subRows(s), el = E.elemRows(s); const g = UI.heroUi.grp;
    const grp = (id, title, body, n) => `<div class="acc ${g[id] ? 'open' : ''}"><button class="acch" data-act="subGrp" data-g="${id}" data-quiet="1"><b>${title}</b><small class="dim">${n}</small><i>${g[id] ? '▴' : '▾'}</i></button>${g[id] ? `<div class="accb">${body}</div>` : ''}</div>`;
    const subHtml = D.SUB_GROUPS.map(([id, title]) => {
      const list = rows.filter((r) => r.grp === id);
      return grp(id, title, list.map((r) => {
        const tip = UI.heroUi.tip === 'sb:' + r.id;
        return `<div class="subrow ${tip ? 'open' : ''}"><button class="subr" data-act="heroTip" data-k="sb:${r.id}" data-quiet="1"><span class="grow tl">${esc(r.n)}</span><b>${num(r.id === 'critDmg' ? r.v / 100 : r.v, r.id === 'critDmg' ? '×' : r.unit)}</b></button>${tip ? `<div class="tipbox"><div class="small tl">${esc(r.d)}</div><div class="dim small tl">${esc(r.formula)}</div>${parts(r.parts, r.unit === '%' ? '%' : '')}${r.raw > r.cap[1] ? '<div class="small warn tl">Достигнут предел: ' + r.cap[1] + '</div>' : ''}</div>` : ''}</div>`;
      }).join(''), list.length + ' пар.');
    }).join('');
    const elHtml = `<div class="elhead small dim"><span></span><span>Сопротивление</span><span>Бонус урона</span></div>` + el.map((r) => {
      const tip = UI.heroUi.tip === 'el:' + r.id;
      return `<div class="subrow ${tip ? 'open' : ''}"><button class="subr elr" data-act="heroTip" data-k="el:${r.id}" data-quiet="1"><span class="grow tl">${r.ic} ${esc(r.n)}</span><b class="${r.res < 0 ? 'bad' : ''}">${Math.round(r.res * 10) / 10}%</b><b>${r.dmg ? '+' + Math.round(r.dmg * 10) / 10 + '%' : '—'}</b></button>${tip ? `<div class="tipbox"><div class="dim small tl">${esc(r.formula)}</div><div class="small"><b>Сопротивление</b></div>${parts(r.resParts, '%')}<div class="small"><b>Бонус урона</b></div>${parts(r.dmgParts, '%')}</div>` : ''}</div>`;
    }).join('');
    return `<div class="subs">${subHtml}${grp('elem', '🌐 Стихии: сопротивления и бонусы урона', elHtml, '10 стихий')}</div>`;
  }
  UI.act.heroTip = (el) => { const k = el.dataset.k; UI.heroUi.tip = UI.heroUi.tip === k ? null : k; UI.refresh(); };
  UI.act.toggleSubs = () => { UI.heroUi.subs = !UI.heroUi.subs; UI.refresh(); };
  UI.act.subGrp = (el) => { const g = el.dataset.g; UI.heroUi.grp[g] = !UI.heroUi.grp[g]; UI.refresh(); };
  UI.act.draftAdd = (el) => {
    const s = UI.slot(), h = s.hero, k = el.dataset.k, left = E.statFree(h) - draftSum(); let n = el.dataset.n === 'max' ? left : +el.dataset.n;
    if (n < 0) n = -Math.min(UI.draft[k] || 0, -n); else n = Math.min(left, n);
    if (!n) return; UI.draft[k] = (UI.draft[k] || 0) + n; if (UI.draft[k] <= 0) delete UI.draft[k]; UI.sfx('tab'); UI.refresh();
  };
  UI.act.draftClear = () => { UI.draft = {}; UI.refresh(); };
  UI.act.draftApply = () => { const s = UI.slot(), n = E.statCommit(s, UI.draft); if (!n) { UI.toast('Не удалось применить', 'bad'); return; } UI.draft = {}; UI.sfx('level'); UI.save(true); UI.toast('Очки распределены: ' + n, 'gold'); UI.refresh(); };
  UI.act.statRespec = () => {
    const s = UI.slot(), c = E.statRespecCost(s.hero);
    UI.modal(`<h3>Сбросить очки?</h3><div class="mtext small">Все вложенные очки характеристик (${E.statSpent(s.hero)}) вернутся. Стоимость: <b>${fmt(c)} 🪙</b> (у вас ${fmt(s.gold)}).</div><div class="row gap"><button class="btn ghost grow" data-act="closeModal">Отмена</button><button class="btn primary grow" data-act="statRespecOk" ${s.gold >= c ? '' : 'disabled'}>Сбросить</button></div>`);
  };
  UI.act.statRespecOk = () => { const s = UI.slot(); if (E.statRespec(s)) { UI.draft = {}; UI.sfx('ok'); UI.save(true); UI.closeModal && UI.closeModal(); UI.toast('Очки возвращены', 'gold'); UI.refresh(); } else UI.toast('Не хватает золота', 'bad'); };
})();
