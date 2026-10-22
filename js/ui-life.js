/* UI v2.27: «Жизнь в Лагере» — событие недели, день/ночь, рыбалка (мини-игра), ферма, дом, торговец, титулы и рамки. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { esc, fmt } = UI;
  const mi = (id) => (D.MATS[id] ? D.MATS[id].ic + ' ' + D.MATS[id].n : id);
  const mm = (ms) => { const m = Math.max(0, Math.ceil(ms / 60000)); return m >= 1440 ? Math.floor(m / 1440) + ' д ' + Math.floor((m % 1440) / 60) + ' ч' : m >= 60 ? Math.floor(m / 60) + ' ч ' + (m % 60) + ' мин' : m + ' мин'; };
  const tierTag = (s, pid) => { const e = E.profEff(s, pid); return `<span class="ptier ${e.tier}">${D.PROFS[pid].ic || ''} ${esc(D.PROFS[pid].n)}: ${D.PROF_TIER_N[e.tier]} · отдача ${Math.round(e.k * 100)}%${e.rare ? '' : ' · без редкой добычи'}</span>`; };
  const err = (r) => { if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return true; } return false; };
  const done = () => { UI.save(true); UI.refresh(); };

  UI.lifeCard = function (s) {
    const l = E.lifeEnsure(s), ev = E.eventOf(), ph = E.dayPhase(), ripe = l.plots.filter((p) => p && Date.now() >= p.end).length;
    return `<div class="card lifecard ph-${ph}"><div class="lfhead"><b>🏕️ Жизнь в Лагере</b><span class="small">${D.PHASE_N[ph]}</span></div>
      <div class="small dim tl">${esc(D.PHASE_TXT[ph])}</div>
      <button class="evbanner" data-act="eventOpen" data-quiet="1"><span>${ev.ic}</span><span class="grow tl"><b>${esc(ev.n)}</b><small>${esc(ev.d)}</small></span><small>⏳ ${mm(E.eventLeft())}</small></button>
      <div class="chgrid four">
        <button class="chb" data-act="fishOpen" data-quiet="1"><span>🎣</span><b>Рыбалка</b><small>${E.fishCasts(s) - l.fish.used}/${E.fishCasts(s)}</small></button>
        <button class="chb" data-act="farmOpen" data-quiet="1"><span>🌱</span><b>Ферма</b><small>${ripe ? '✅ ' + ripe + ' созрело' : l.plots.filter(Boolean).length + '/' + l.plots.length}</small></button>
        <button class="chb" data-act="houseOpen" data-quiet="1"><span>🏠</span><b>Дом</b><small>ур. ${E.houseLv(s)}/12</small></button>
        <button class="chb" data-act="mkOpen" data-quiet="1"><span>🧺</span><b>Торговец</b><small>цены дня</small></button></div></div>`;
  };
  const _city = UI.tabs.city;
  UI.tabs.city = function (s) { const h = _city(s), k = h.indexOf('<div class="campaign-heading">'), c = UI.lifeCard(s); let out = k < 0 ? h + c : h.slice(0, k) + c + h.slice(k); return out.replace('<div class="hub">', `<div class="hub ph-${E.dayPhase()}">`); };

  UI.act.eventOpen = () => { const now = Date.now(); UI.modal(`<h3>📅 События недели</h3><div class="small dim tl">События сменяются каждую неделю сами — по календарю, без сети.</div>${[0, 1, 2, 3].map((i) => { const t = now + i * 7 * 864e5, ev = E.eventOf(t); return `<div class="card ${i ? '' : 'evnow'}"><b>${ev.ic} ${esc(ev.n)}</b> <span class="small dim">${i ? 'через ' + mm(E.eventLeft(now) + (i - 1) * 7 * 864e5) : 'идёт сейчас'}</span><div class="small tl">${esc(ev.d)}</div></div>`; }).join('')}<button class="btn ghost wide" data-act="closeModal">Закрыть</button>`); };

  // ═════ Рыбалка ═════
  let fg = null;
  UI.act.fishOpen = () => {
    const s = UI.slot(), l = E.lifeEnsure(s), left = E.fishCasts(s) - l.fish.used, z = E.fishZone(s);
    UI.modal(`<h3>🎣 Пруд у Лагеря</h3>${tierTag(s, 'fish')}<div class="small dim tl">Поплавок бегает по шкале — нажмите «Подсечь!», когда он в зелёной зоне. Ближе к центру — больше рыбы и выше шанс на 🐠 Золотого карпа (только Рыбаку). Рыбаку зона шире.</div>
      <div class="fishbar"><i class="fz" style="width:${z * 100}%"></i><i class="fn"></i></div>
      <div class="fishres small center" id="fishRes">Забросов осталось: <b>${left}</b> · всего поймано ${l.fish.total} · редких ${l.fish.rare}</div>
      <button class="btn primary wide big" id="fishBtn" data-act="fishTap" ${left > 0 ? '' : 'disabled'}>${left > 0 ? '🎣 Забросить' : 'На сегодня всё'}</button><button class="btn ghost wide" data-act="fishClose">Закрыть</button>`, { lock: true });
    fg = null;
  };
  const fishRun = () => {
    const bar = document.querySelector('.fishbar'); if (!bar) return; const s = UI.slot(), z = E.fishZone(s), zs = 0.05 + Math.random() * (0.9 - z);
    const zn = bar.querySelector('.fz'), nd = bar.querySelector('.fn'); zn.style.left = zs * 100 + '%';
    fg = { zs, z, t0: performance.now(), sp: 0.9 + Math.random() * 0.7, pos: 0 };
    const step = (t) => { if (!fg || !document.body.contains(nd)) return; const x = ((t - fg.t0) / 1000) * fg.sp; fg.pos = 1 - Math.abs((x % 2) - 1); nd.style.left = fg.pos * 100 + '%'; fg.raf = requestAnimationFrame(step); };
    fg.raf = requestAnimationFrame(step);
  };
  UI.act.fishTap = () => {
    const b = document.getElementById('fishBtn'); if (!fg) { fishRun(); b.textContent = '⚡ Подсечь!'; UI.sfx('click'); return; }
    cancelAnimationFrame(fg.raf); const c = fg.zs + fg.z / 2, d = Math.abs(fg.pos - c), q = d <= fg.z / 2 ? Math.max(0.05, 1 - d / (fg.z / 2)) : 0; fg = null;
    const s = UI.slot(), r = E.fishCatch(s, q); if (r.err) { err(r.err); return; } UI.save(true);
    const left = E.fishCasts(s) - r.used, el = document.getElementById('fishRes');
    el.innerHTML = r.miss ? '💨 Сорвалась! Чуть-чуть не успели.' : `${r.perfect ? '✨ Идеальная подсечка! ' : ''}${r.rare ? '🌟 Редкий улов: ' : 'Улов: '}<b>${mi(r.id)} ×${r.n}</b>${r.up ? ' · ⬆️ Рыбак ур.+' + r.up : ''}`;
    el.insertAdjacentHTML('beforeend', `<div class="dim">Забросов осталось: ${left}</div>`); UI.sfx(r.miss ? 'err' : r.rare ? 'gold' : 'coin');
    if (left > 0) b.textContent = '🎣 Забросить ещё'; else { b.textContent = 'На сегодня всё'; b.disabled = true; }
  };
  UI.act.fishClose = () => { if (fg) cancelAnimationFrame(fg.raf); fg = null; UI.closeModal(); UI.refresh(); };

  // ═════ Ферма ═════
  UI.act.farmOpen = () => {
    const s = UI.slot(), l = E.lifeEnsure(s), now = Date.now();
    const plots = l.plots.map((p, i) => { if (!p) return `<div class="plot empty"><b>Грядка ${i + 1}</b><div class="seeds">${D.CROPS.map((c) => { const lock = c.need && E.profTier(s, c.need) === 'none'; return `<button class="btn small ${lock ? 'ghost' : ''}" data-act="farmPlant" data-i="${i}" data-c="${c.id}" ${lock || s.gold < c.seed ? 'disabled' : ''}>${D.MATS[c.id].ic} ${mm(E.cropMin(s, c) * 60e3)} · 🪙${c.seed}${lock ? ' 🔒' : ''}</button>`; }).join('')}</div></div>`;
      const ok = now >= p.end, pr = Math.min(100, (now - p.t) / (p.end - p.t) * 100); return `<div class="plot ${ok ? 'ripe' : ''}"><b>Грядка ${i + 1}: ${mi(p.c)}</b><span class="bar"><i style="width:${pr}%"></i></span>${ok ? `<button class="btn primary small" data-act="farmHarvest" data-i="${i}">🧺 Собрать</button>` : `<small class="dim">ещё ${mm(p.end - now)}</small>`}</div>`; }).join('');
    UI.modal(`<h3>🌱 Ферма</h3>${tierTag(s, 'herb')}<div class="small dim tl">Посадите семена — травы растут, даже когда игра закрыта. 🔒 Редкие травы (алые, звёздные) растит только Травник; у него как основной профессии всё растёт на 20% быстрее и бывает бонусная ✨ пыль. Больше грядок — в Саду Дома.</div><div class="plots">${plots}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.farmPlant = (el) => { const s = UI.slot(); if (err(E.plant(s, +el.dataset.i, el.dataset.c))) return; UI.sfx('coin'); UI.save(true); UI.act.farmOpen(); };
  UI.act.farmHarvest = (el) => { const s = UI.slot(), r = E.harvest(s, +el.dataset.i); if (r.err) { err(r.err); return; } UI.toast('🧺 ' + Object.keys(r.mats).map((m) => mi(m) + ' ×' + r.mats[m]).join(', ') + (r.up ? ' · ⬆️ Травник' : ''), 'gold'); UI.sfx('gold'); UI.save(true); UI.act.farmOpen(); };

  // ═════ Дом ═════
  UI.act.houseOpen = () => {
    const s = UI.slot(), h = E.lifeEnsure(s).house;
    const rooms = Object.keys(D.ROOMS).map((id) => { const r = D.ROOMS[id], lv = h[id] | 0, max = lv >= r.max, c = max ? null : E.roomCost(s, id), why = max ? '' : E.roomUpWhy(s, id);
      return `<div class="card room"><div class="row gap center-v"><span class="big-ic">${r.ic}</span><div class="grow tl"><b>${esc(r.n)}</b> <span class="small">${'★'.repeat(lv)}${'☆'.repeat(r.max - lv)}</span><div class="small dim">${esc(r.d)}</div>${c ? `<div class="small">🪙${fmt(c.gold)} · ${Object.keys(c.mats).map((m) => mi(m) + ' ×' + c.mats[m]).join(', ')}${c.disc ? ' <span class="good">−20% мастеру</span>' : ''}</div>` : ''}</div>
        <button class="btn small ${why ? 'ghost' : 'primary'}" data-act="houseUp" data-id="${id}" ${why ? 'disabled' : ''}>${max ? 'Готово' : 'Улучшить'}</button></div>${why && !max ? `<div class="small bad">${esc(why)}</div>` : ''}</div>`; }).join('');
    UI.modal(`<h3>🏠 Дом в Лагере</h3><div class="small dim tl">Обустройте дом: каждая комната даёт пассивный бонус жизни в Лагере (на бой не влияет). Кузнец или Кожевник (основная или доп.) строят на 20% дешевле.</div>${rooms}<button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.houseUp = (el) => { const s = UI.slot(); if (err(E.roomUp(s, el.dataset.id))) return; UI.sfx('gold'); UI.toast('🏠 Комната улучшена', 'gold'); UI.save(true); UI.act.houseOpen(); };

  // ═════ Торговец ═════
  UI.act.mkOpen = () => {
    const s = UI.slot(), l = E.lifeEnsure(s), its = E.mkDay(s), ar = { up: '📈', down: '📉', flat: '➖' };
    const rows = its.map((it) => { const left = it.stock - (l.mk.bought[it.id] | 0), have = (s.mats || {})[it.id] || 0;
      return `<div class="mkrow"><span class="grow tl">${mi(it.id)} <small class="${it.trend === 'up' ? 'bad' : it.trend === 'down' ? 'good' : 'dim'}">${ar[it.trend]} ×${it.f}</small><br><small class="dim">есть ${have} · запас ${left}</small></span>
        <button class="btn small" data-act="mkBuy" data-id="${it.id}" ${left > 0 && s.gold >= it.buy ? '' : 'disabled'}>Купить 🪙${fmt(it.buy)}</button><button class="btn small ghost" data-act="mkSell" data-id="${it.id}" ${have > 0 ? '' : 'disabled'}>Продать 🪙${fmt(it.sell)}</button></div>`; }).join('');
    const rare = ['fish_gold', 'fish_star'].filter((m) => ((s.mats || {})[m] || 0) > 0).map((m) => `<div class="mkrow"><span class="grow tl">${mi(m)} <small class="dim">есть ${s.mats[m]}</small></span><button class="btn small ghost" data-act="mkSell" data-id="${m}">Продать 🪙${fmt(Math.round(D.MATS[m].v * (E.eventOf().sell || 1)))}</button></div>`).join('');
    UI.modal(`<h3>🧺 Странствующий торговец</h3><div class="small dim tl">Каждый день — новый товар и новые цены (📈 дороже обычного, 📉 дешевле). Запас ограничен и пополняется утром.</div><div class="small center">🪙 ${fmt(s.gold)}</div><div class="mk">${rows}${rare}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.mkBuy = (el) => { const s = UI.slot(); if (err(E.mkBuy(s, el.dataset.id, 1))) return; UI.sfx('coin'); UI.save(true); UI.act.mkOpen(); };
  UI.act.mkSell = (el) => { const s = UI.slot(); if (err(E.mkSell(s, el.dataset.id, 1))) return; UI.sfx('coin'); UI.save(true); UI.act.mkOpen(); };

  // ═════ Титулы и рамки (меню героя) ═════
  const _hero = UI.tabs.hero;
  UI.tabs.hero = function (s) {
    let h = _hero(s); E.lifeEnsure(s); const fr = s.life.cos.frame && D.FRAMES.find((f) => f.id === s.life.cos.frame);
    const tag = `<div class="htitle"><span>🎖️ ${esc(E.titleName(s))}</span><button class="btn tiny ghost" data-act="cosOpen" data-quiet="1">Титул и рамка</button></div>`;
    h = h.replace(/(<div class="hpow">)/, tag + '$1');
    if (fr) h = h.replace(/--hrc:\s*[^;"]+/, '--hrc: ' + fr.c).replace(/(Рамка: <b style="color:)[^"]*(">)[^<]*/, '$1' + fr.c + '$2' + esc(fr.n));
    return h;
  };
  UI.act.cosOpen = () => {
    const s = UI.slot(), c = E.lifeEnsure(s).cos;
    const ts = D.TITLES.map((t) => { const ok = t.ok(s); return `<button class="cosb ${(c.title || 'king') === t.id ? 'on' : ''}" data-act="cosTitle" data-id="${t.id}" ${ok ? '' : 'disabled'}>${ok ? '🎖️' : '🔒'} ${esc(t.n)}</button>`; }).join('');
    const fs = D.FRAMES.map((f) => { const ok = f.ok(s); return `<button class="cosb fr ${(c.frame || 'rar') === f.id ? 'on' : ''}" style="--fc:${f.c || 'var(--gold,#ffd36b)'}" data-act="cosFrame" data-id="${f.id}" ${ok ? '' : 'disabled'}>${ok ? '' : '🔒 '}${esc(f.n)}</button>`; }).join('');
    UI.modal(`<h3>🎖️ Титул и рамка</h3><div class="small dim tl">Титулы открываются за достижения, Башню, Арену и жизнь в Лагере; рамки — за коллекцию и рекорды. Только украшение.</div><b>Титулы</b><div class="cosgrid">${ts}</div><b>Рамки портрета</b><div class="cosgrid">${fs}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.cosTitle = (el) => { const s = UI.slot(); if (err(E.setTitle(s, el.dataset.id))) return; UI.save(true); UI.act.cosOpen(); UI.refresh(); };
  UI.act.cosFrame = (el) => { const s = UI.slot(); if (err(E.setFrame(s, el.dataset.id))) return; UI.save(true); UI.act.cosOpen(); UI.refresh(); };
})();
