/* UI v2.18: «Подземелье Золота» и «Подземелье Материалов» — карточки в списке подземелий, список этапов (уровень, страж, награды), подготовка, итог боя. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { esc, fmt } = UI;
  const QN = (q) => D.RARITY[q].n, QC = (q) => D.RARITY[q].c;
  const rewardRow = (sp, i) => {
    if (sp === 'gold') return `<span class="ach" style="--ac:#ffd35a">🪙 ${fmt(D.GOLD_STAGE[i])} за стража</span><span class="ach" style="--ac:#ffb23a">×${D.GOLD_KILL_K} золото врагов</span>`;
    const [lo, hi, n] = D.MAT_STAGE[i]; let h = ''; for (let q = lo; q <= hi; q++) h += `<span class="ach" style="--ac:${QC(q)}">${QN(q)}</span>`;
    return h + `<span class="ach" style="--ac:#9ad86a">бросков: ${n}</span>`;
  };
  UI.spDunCards = (s) => D.SP_IDS.map((k) => { const S = D.SP_DUNS[k], open = s.hero.level >= S.unlock, best = S.stages.filter((d) => s.prog.cleared[d.id]).length;
    return `<button class="card dcard spdun sp-${k} ${open ? '' : 'lockd'}" data-act="spDun" data-k="${k}" data-quiet="1"><div class="dic adic"><span>${S.ic}</span></div><div class="grow tl"><b>${S.n}</b> <span class="tag new">особое</span><div class="dim small">ур. ${S.stages[0].ur}–${S.stages[S.stages.length - 1].ur} · этапов: ${S.stages.length} · пройдено: ${best}</div><div class="small tl dim">${open ? esc(S.d) : 'Откроется на ' + S.unlock + ' уровне героя.'}</div></div></button>`; }).join('');
  UI.act.spDun = (el) => {
    const s = UI.slot(), k = el.dataset.k, S = D.SP_DUNS[k];
    if (s.hero.level < S.unlock) { UI.toast(S.n + ' откроется на ' + S.unlock + ' уровне', 'bad'); UI.sfx('err'); return; }
    if (s.run) { UI.toast('Сначала завершите текущую вылазку', 'bad'); return; }
    const rows = S.stages.map((d, i) => { const open = E.spStageOpen(s, k, i), cl = !!s.prog.cleared[d.id], div = k === 'mats' && D.MAT_DIVINE_STAGES.includes(i);
      return `<button class="astage ${open ? '' : 'lockd'} ${div ? 'divine' : ''}" data-act="spStage" data-k="${k}" data-i="${i}" data-quiet="1"><div class="row between center-v"><b>${cl ? '✔' : open ? '▶' : '🔒'} Этап ${i + 1}</b><span class="tag">ур. ${d.ur}</span></div><div class="small dim tl">Страж: ${D.ENEMIES[d.boss].ic} ${esc(D.ENEMIES[d.boss].n)}${cl ? ' · побед: ' + ((s.spProg || {})[d.id] || 0) : ''}</div><div class="achs small">${rewardRow(k, i)}</div>${div ? '<div class="small awarn mini">💫 Здесь выпадают божественные материалы</div>' : ''}</button>`; }).join('');
    UI.modal(`<h3>${S.ic} ${S.n}</h3><div class="small dim tl">${esc(S.d)} Каждый этап — два яруса и страж; этапы открываются по порядку. Награда стража — ${k === 'gold' ? 'золото (растёт с этапом), враги роняют ×' + D.GOLD_KILL_K + ' монет' : 'материалы ремесла, кузни и чар; качество растёт с этапом'}.</div><div class="alist">${rows}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.spStage = (el) => { const s = UI.slot(), k = el.dataset.k, i = +el.dataset.i, d = D.SP_DUNS[k].stages[i];
    if (!E.spStageOpen(s, k, i)) { UI.toast(i ? 'Сначала пройдите этап ' + i : 'Нужен ' + D.SP_DUNS[k].unlock + ' уровень', 'bad'); UI.sfx('err'); return; }
    UI.prep = { did: d.id, tier: 0, buffs: {} }; UI.prepModal(); };
  const _note = UI.artPrepNote;
  UI.artPrepNote = function (s, d) {
    if (!d.sp) return _note(s, d);
    return `<div class="artprep"><div class="small tl"><b>Этап ${d.i + 1} · ур. ${d.ur}</b> <span class="dim">(боевой уровень врагов ${d.lv}–${d.lv + d.floors + 1}, сила ×${d.mul.toFixed(2)})</span></div><div class="achs small">${rewardRow(d.sp, d.i)}</div></div>`;
  };
  UI.spDropHtml = function (rep) {
    if (!rep) return '';
    if (rep.spGold) return `<div class="adrop" style="--ac:#ffd35a;--ag:rgba(255,211,90,.6)"><span class="aic"><i>💰</i></span><div class="grow tl"><b>Сокровищница стража</b><div>🪙 +${fmt(rep.spGold)}</div></div></div>`;
    if (rep.spMats) return `<div class="adrop" style="--ac:#9ad86a;--ag:rgba(154,216,106,.5)"><span class="aic"><i>⛏️</i></span><div class="grow tl"><b>Кладовая стража</b><div class="small">${Object.keys(rep.spMats).map((k) => `<span class="cmat" style="--qc:${QC(Math.max(0, D.MAT_POOL.findIndex((p) => p.includes(k))))}">${D.MATS[k].ic} ${esc(D.MATS[k].n)} ×${rep.spMats[k]}</span>`).join(' ')}</div></div></div>`;
    return '';
  };
})();
