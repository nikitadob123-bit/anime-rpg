/* UI v2.24: карточка «Союзники» на вкладке «Герой» — спутницы Мировых артефактов, эволюция до 5 звёзд. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { esc, fmt } = UI;
  const stars = (n) => `<span class="astar">${'★'.repeat(n)}${'☆'.repeat(D.ALLY_STAR_MAX - n)}</span>`;
  const costHtml = (s, c) => `<span class="alcost"><span class="${s.gold >= c.gold ? 'ok' : 'no'}">🪙 ${fmt(c.gold)}</span>${Object.keys(c.mats).map((m) => { const have = (s.mats && s.mats[m]) || 0; return `<span class="${have >= c.mats[m] ? 'ok' : 'no'}">${D.MATS[m].ic} ${esc(D.MATS[m].n)} ${fmt(have)}/${c.mats[m]}</span>`; }).join('')}</span>`;
  UI.allyBlock = function (s, id) {
    E.allyEnsure(s, id); const c = D.CREW[id], st = s.crew[id], ev = E.allyEv(s, id), a = E.allyStats(s, id), cost = E.allyCost(s, id), why = E.allyEvolveWhy(s, id), P = D.ALLY_PERKS[id] || {};
    const perks = [1, 3, 5].map((n) => `<div class="alperk ${ev >= n ? 'on' : ''}">${ev >= n ? '✦' : '🔒'} <b>★${n}</b> ${esc(P[n] || '')}</div>`).join('');
    return `<div class="allyb" data-ally="${id}"><div class="row gap center-v">${UI.por(c.art, 'sm', true)}<div class="grow tl"><b>${esc(c.n)}</b> ${stars(ev)}<div class="dim small">${esc(c.role)} · ур. ${st.lv} · +${ev * D.ALLY_STAR_K * 100}% к статам</div></div></div>
      <div class="alstats small"><span>❤ ${fmt(a.maxHp)}</span><span>⚔ ${fmt(c.arch === 'mage' ? a.mag : a.atk)}</span><span>🛡 ${fmt(a.def)}</span><span>🔮 ${fmt(a.res)}</span></div>${perks}
      ${cost ? `<button class="btn ${why ? 'ghost' : 'primary'} small wide alevo" data-act="allyEvo" data-id="${id}" ${why ? 'disabled' : ''}>✨ Эволюция ★${ev + 1}</button>${costHtml(s, cost)}${why ? `<div class="small dim tl">${esc(why)}</div>` : ''}` : '<div class="small tl alperk on">✦ Максимальная эволюция</div>'}</div>`;
  };
  UI.allyCard = function (s) {
    const ids = E.allyIds(s);
    return `<div class="card artcard allycard"><div class="row between center-v" style="gap:8px"><b>🤝 Союзники</b><span class="dim small">${ids.length}/${D.CREW_ARTS.length}</span></div>${ids.length ? ids.map((id) => UI.allyBlock(s, id)).join('') : '<div class="small dim tl">Союзники приходят вместе с Мировыми артефактами (Сердце Сверхновой, Ключ Бездонной Сокровищницы): свой уровень со старта, эволюция до 5 звёзд.</div>'}</div>`;
  };
  UI.act.allyEvo = (el) => { const r = E.allyEvolve(UI.slot(), el.dataset.id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('level'); UI.save(true); UI.toast('✨ Эволюция!', 'gold'); UI.refresh(); if (UI.crewModal && document.querySelector('.crewx')) UI.crewModal(); };
  // в карточке члена Свиты у союзника вместо возвышения — эволюция
  const _cx = UI.crewExtra;
  if (_cx) UI.crewExtra = function (s, id) {
    const h = _cx(s, id); if (!E.isAlly(id)) return h;
    const i = h.indexOf('<div class="row between center-v"><b>Возвышение'), j = h.indexOf('<div class="row between center-v"><b>Мастерство');
    return i < 0 || j < 0 ? h : h.slice(0, i) + UI.allyBlock(s, id) + h.slice(j);
  };
})();
