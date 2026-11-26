/* UI v2.33.0 «Ранги Рейны»: в карточке Рейны (Свита) вместо звёзд возвышения — ранги, потолок и «Разорвать предел». */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { esc, fmt } = UI;
  const A = D.REINA_ASC; if (!A) return;
  const kTxt = (r) => '×' + (Math.round(E.reinaRankK(r) * 10) / 10).toLocaleString('ru-RU');
  UI.reinaAscBlock = function (s) {
    const st = s.crew[A.id]; if (!st) return '';
    const r = E.reinaAsc(s), max = E.reinaMaxCap(s), gate = E.crewCap(s, A.id), why = E.reinaRankWhy(s), bw = E.reinaBreakWhy(s);
    const pips = Array.from({ length: A.max }, (_, i) => `<i class="${i < r.rank ? 'on' : (i === r.rank && !why ? 'ready' : '')}"></i>`).join('');
    const next = r.rank < A.max ? A.cost(r.rank + 1) : null;
    const have = (s.mats && s.mats.asc_sigil) || 0;
    const rankBtn = next
      ? `<button class="btn ${why ? 'ghost' : 'primary'} small wide reasc-up" data-act="reinaRank" ${why ? 'disabled' : ''}>⚡ Возвышение ранга ${r.rank + 1}: «${esc(A.names[r.rank + 1])}»</button>
         <span class="alcost"><span class="${st.lv >= next.lv ? 'ok' : 'no'}">ур. ${next.lv}+</span><span class="${s.gold >= next.gold ? 'ok' : 'no'}">🪙 ${fmt(next.gold)}</span><span class="${have >= next.sig ? 'ok' : 'no'}">${UI.sigIc()} ${have}/${next.sig}</span><span class="dim">→ ${kTxt(r.rank + 1)} к силе</span></span>${why ? `<div class="dim">${esc(why)}</div>` : ''}`
      : '<div class="alperk on">✦ Все десять рангов взяты</div>';
    const gateTxt = r.rank < A.max && gate < max ? ` · сейчас до ур. ${gate} — дальше нужен ранг ${r.rank + 1}` : '';
    const brk = r.capBreak
      ? '<div class="alperk on">💥 Предел разорван: потолок ур. 150</div>'
      : `<button class="btn ${bw ? 'ghost' : 'primary danger'} small wide reasc-brk" data-act="reinaBreak" ${bw ? 'disabled' : ''}>💥 Разорвать предел — потолок ур. ${A.capBreak}</button>
         <div class="dim">Цена: <b>−${A.heroCost} уровней героя</b>. Нужно: ранг ${A.max}, Рейна ур. ${A.cap}, герой ур. ${A.heroMin}+ (у вас ${s.hero.level}).${bw ? ' <span class="no">' + esc(bw) + '</span>' : ''}</div>`;
    return `<div class="reasc" data-reasc="1">
      <div class="row between center-v"><b>⚡ Ранг ${r.rank}/${A.max}</b><span class="dim">${kTxt(r.rank)} к силе</span></div>
      <div class="reasc-n">«${esc(A.names[r.rank])}»</div>
      <div class="reasc-pips">${pips}</div>
      <div class="dim">Потолок ур. <b>${max}</b>${r.capBreak ? ' (предел разорван)' : ''}${gateTxt}. Ранг — каждые 10 уровней, по порядку.</div>
      ${rankBtn}${brk}</div>`;
  };
  const _cx = UI.crewExtra;
  if (_cx) UI.crewExtra = function (s, id) {
    const h = _cx(s, id); if (id !== A.id) return h;
    const i = h.indexOf('<div class="row between center-v"><b>Возвышение'), j = h.indexOf('<div class="row between center-v"><b>Мастерство');
    return i < 0 || j < 0 ? UI.reinaAscBlock(s) + h : h.slice(0, i) + UI.reinaAscBlock(s) + h.slice(j);
  };
  const reopen = () => { UI.save(true); if (UI.crewModal && UI.sub && UI.sub.crewId === A.id) UI.crewModal(); UI.refresh(); };
  UI.act.reinaRank = () => {
    const r = E.reinaRankUp(UI.slot()); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; }
    const n = E.reinaAsc(UI.slot()).rank; UI.sfx('level'); UI.toast(`⚡ Ранг ${n}: «${A.names[n]}»`, 'gold'); reopen();
  };
  UI.act.reinaBreak = () => {
    const s = UI.slot(), w = E.reinaBreakWhy(s); if (w) { UI.toast(w, 'bad'); UI.sfx('err'); return; }
    const L = s.hero.level, L2 = Math.max(1, L - A.heroCost);
    UI.confirm('Разорвать предел?', `Рейна сможет расти до <b>ур. ${A.capBreak}</b>.<br><br>⚠️ Цена — <b>${A.heroCost} уровней вашего героя</b>: ур. ${L} → <b>ур. ${L2}</b>. Опыт текущего уровня сгорит, базовые характеристики героя упадут. Изученные навыки и вложенные очки останутся, но новые очки появятся, только когда герой снова догонит прежний уровень.<br><span class="small dim">Отменить нельзя.</span>`, `Пожертвовать ${A.heroCost} ур.`, () => {
      const r = E.reinaBreak(UI.slot()); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; }
      UI.sfx('level'); UI.toast(`💥 Предел разорван! Потолок Рейны — ур. ${A.capBreak}`, 'gold'); reopen();
    }, true);
  };
})();
