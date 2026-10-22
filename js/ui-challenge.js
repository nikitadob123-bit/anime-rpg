/* UI v2.26: «Испытания» в Лагере — Башня, Арена, Тренировочный зал; эффекты боя (баннер навыка, комбо, замедление на добивании босса);
   отдельная громкость звуковых эффектов. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI, A = RPG.A;
  const { esc, fmt } = UI;
  const rw = (r) => (UI.rwText ? UI.rwText(r || {}) : '');
  const bar = (v, max, cl) => `<span class="bar ${cl || ''}"><i style="width:${Math.max(0, Math.min(100, v / Math.max(1, max) * 100))}%"></i></span>`;
  const mm = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? Math.floor(m / 60) + ' ч ' + (m % 60) + ' мин' : m + ' мин'; };

  // ═════ Карточка в Лагере ═════
  UI.challengeCard = function (s) {
    const t = E.towerEnsure(s), a = E.arenaEnsure(s), tr = E.trainEnsure(s), ti = D.ARENA_TIERS[E.arenaTier(a.rating)];
    return `<div class="card chcard"><b>🏯 Испытания</b><div class="chgrid">
      <button class="chb tower" data-act="towerOpen" data-quiet="1"><span>🗼</span><b>Башня</b><small>этаж ${Math.min(100, t.best + 1)}/100</small></button>
      <button class="chb arena" data-act="arenaOpen" data-quiet="1"><span>${ti[2]}</span><b>Арена</b><small>${a.rating} · ${esc(ti[0])}${a.pend ? ' · 🎁' : ''}</small></button>
      <button class="chb train" data-act="trainOpen" data-quiet="1"><span>🏋️</span><b>Зал</b><small>⚡ ${tr.en}/${D.TRAIN_EN_MAX}</small></button></div></div>`;
  };
  const _city = UI.tabs.city;
  UI.tabs.city = function (s) { const h = _city(s), k = h.indexOf('<div class="campaign-heading">'); const c = UI.challengeCard(s); return k < 0 ? h + c : h.slice(0, k) + c + h.slice(k); };

  const fight = async (B, o) => {
    if (B.err) { UI.toast(B.err, 'bad'); UI.sfx('err'); return null; }
    UI.closeModal(); const rep = await UI.battle(Object.assign({ B }, o)); UI.save(true); UI.refresh(); return rep;
  };
  // ═════ Башня ═════
  UI.towerModal = function () {
    const s = UI.slot(), t = E.towerEnsure(s), f = E.towerNext(s), done = t.best >= D.TOWER_MAX, k = E.towerKind(f), src = E.towerSrc(f);
    const foes = done ? '' : E.towerFoes(f).map((u) => `<span class="chip">${u.ic || '👾'} ${esc(u.name)} · ур.${u.lv}</span>`).join('');
    const ms = [...new Set([5, 10].map((st) => Math.ceil(f / st) * st))].filter((nx) => nx > f && nx <= 100).map((nx) => `<div class="small tl">🎯 Этаж ${nx}: ${rw(E.towerReward(nx))}</div>`).join('');
    const floors = Array.from({ length: 10 }, (_, i) => { const n = Math.floor((f - 1) / 10) * 10 + 10 - i; return `<div class="tfl ${n <= t.best ? 'done' : n === f ? 'cur' : ''} ${n % 10 === 0 ? 'boss' : n % 5 === 0 ? 'mini' : ''}"><b>${n}</b><small>${n <= t.best ? '✓' : n % 10 === 0 ? '👑' : n % 5 === 0 ? '⭐' : ''}</small></div>`; }).join('');
    UI.modal(`<h3>🗼 Башня испытаний</h3><div class="small dim tl">100 этажей, враги сильнее с каждым шагом. Награда — за первое прохождение этажа; каждые 5 — материалы, каждые 10 — Знаки, яйцо и много золота. Опыт и добыча вылазок здесь не выпадают, поражение ничего не отнимает.</div>
      <div class="tower">${floors}</div>
      ${done ? `<div class="card center"><b>👑 Башня покорена!</b><div class="small dim">${esc(t.title || '')}</div></div>` : `<div class="card"><b>Этаж ${f} · ${k === 'boss' ? 'Страж этажа' : k === 'mini' ? 'Элитный страж' : 'Бой'}</b> <span class="dim small">(${esc(src.n)}, ур. ${E.towerLv(f)})</span><div class="chips">${foes}</div><div class="small tl">Награда: ${rw(E.towerReward(f))}</div>${ms}</div>
      <button class="btn primary wide big" data-act="towerFight">⚔️ Штурмовать этаж ${f}</button>`}
      <div class="small dim center">Рекорд: ${t.best} · попыток: ${t.tries}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.towerOpen = () => UI.towerModal();
  UI.act.towerFight = async () => {
    const s = UI.slot(), B = E.towerBattle(s, { auto: !!UI.p.settings.auto }); const f = B.tower;
    const rep = await fight(B, { ic: '🗼', bio: (E.towerSrc(f || 1) || {}).bio || 'crypt', title: 'Башня · этаж ' + f, finish: E.towerFinish }); if (!rep) return;
    UI.towerModal(); UI.toast(rep.result === 'win' ? (rep.rw ? `🗼 Этаж ${rep.floor} покорён: ${rw(rep.rw)}` : `Этаж ${rep.floor} пройден`) : `Этаж ${rep.floor} не взят — попробуйте снова`, rep.result === 'win' ? 'gold' : 'bad');
  };
  // ═════ Арена ═════
  UI.arenaModal = function () {
    const s = UI.slot(), a = E.arenaEnsure(s), ti = E.arenaTier(a.rating), my = E.teamPower(s), left = D.ARENA_DAY - a.n;
    const rivals = a.rivals.map((rv, i) => { const df = D.ARENA_DIFF[rv.i], p = E.arenaPower(s, rv); return `<div class="arv d${rv.i}"><span class="arvi">${D.CLASSES[rv.cls].ic}</span><div class="grow tl"><b>${esc(rv.n)}</b> <small class="dim">ур. ${E.arenaLv(s, rv)} · ${esc(df.n)}</small><div class="small dim">Отряд: ${rv.comp.map((c) => esc(D.COMPANIONS[c].n)).join(', ')} · мощь ${fmt(p)}</div><div class="small">+${df.pts} очк. · 🪙 ${fmt(Math.round((20 + 8 * s.hero.level) * df.g))}</div></div><button class="btn small ${left > 0 ? 'primary' : 'ghost'}" data-act="arenaFight" data-i="${i}" ${left > 0 ? '' : 'disabled'}>В бой</button></div>`; }).join('');
    const tiers = D.ARENA_TIERS.map((t, i) => `<span class="atier ${i === ti ? 'on' : ''}">${t[2]} ${esc(t[0])} <small>${t[1]}+</small></span>`).join('');
    UI.modal(`<h3>⚔️ Арена «Тени героев»</h3><div class="small dim tl">Соперники — копии отрядов других Королей. Победа поднимает рейтинг, поражение снимает 8 очков. В понедельник рейтинг сбрасывается, а за достигнутую лигу выдаётся награда.</div>
      ${a.pend ? `<button class="btn primary wide" data-act="arenaWeek">🎁 Награда прошлой недели (${esc(D.ARENA_TIERS[a.pend.tier][0])}, ${a.pend.rating}): ${rw(a.pend.rw)}</button>` : ''}
      <div class="card arhead"><div class="row between center-v"><b>${D.ARENA_TIERS[ti][2]} ${esc(D.ARENA_TIERS[ti][0])} · ${a.rating}</b><span class="small dim">побед ${a.w} · поражений ${a.l}</span></div><div class="small dim">Мощь вашего отряда: <b>${fmt(my)}</b> · боёв сегодня: ${left}/${D.ARENA_DAY} · лучший рейтинг недели: ${a.best}</div><div class="atiers">${tiers}</div><div class="small dim">Награда недели сейчас: ${rw(E.arenaWeekly(s, ti))}</div></div>
      ${rivals}<button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.arenaOpen = () => UI.arenaModal();
  UI.act.arenaWeek = () => { const r = E.arenaClaimWeek(UI.slot()); if (r.err) { UI.toast(r.err, 'bad'); return; } UI.sfx('gold'); UI.save(true); UI.toast('🎁 ' + rw(r.rw), 'gold'); UI.arenaModal(); UI.refresh(); };
  UI.act.arenaFight = async (el) => {
    const s = UI.slot(), B = E.arenaBattle(s, +el.dataset.i, { auto: !!UI.p.settings.auto });
    const rep = await fight(B, { ic: '⚔️', bio: 'ash', title: 'Арена · ' + (B.arena ? B.arena.n : ''), finish: E.arenaFinish }); if (!rep) return;
    UI.arenaModal(); UI.toast(rep.result === 'win' ? `🏆 Победа! +${rep.pts} рейтинга · ${rw(rep.rw)}` : `Поражение: ${rep.pts} рейтинга`, rep.result === 'win' ? 'gold' : 'bad');
  };
  // ═════ Тренировочный зал ═════
  UI.trainModal = function () {
    const s = UI.slot(), t = E.trainEnsure(s), cap = E.trainCap(s), nx = E.trainNextIn(s);
    const rows = D.TRAIN_STATS.map((k) => { const v = t.pts[k] | 0, w = E.trainWhy(s, k); return `<div class="trow"><div class="grow tl"><b>${esc(E.gearLabel ? E.gearLabel(k) : k)}</b> <small class="dim">+${v}/${cap}</small>${bar(v, Math.max(1, cap), 'xp')}</div><button class="btn small ${w ? 'ghost' : 'primary'}" data-act="trainDo" data-k="${k}" ${w ? 'disabled' : ''}>+1 · ⚡${D.TRAIN_EN_COST} · 🪙${fmt(E.trainGold(s, k))}</button></div>`; }).join('');
    UI.modal(`<h3>🏋️ Тренировочный зал</h3><div class="small dim tl">Энергия восстанавливается сама: +1 каждые ${D.TRAIN_REGEN_MIN} мин (до ${D.TRAIN_EN_MAX}). Каждая тренировка навсегда даёт +1 к характеристике. Предел — треть уровня героя, но не больше +30 к каждой.</div>
      <div class="card"><div class="row between center-v"><b>⚡ Энергия ${t.en}/${D.TRAIN_EN_MAX}</b><span class="small dim">${nx ? 'следующая через ' + mm(nx) : 'полная'}</span></div>${bar(t.en, D.TRAIN_EN_MAX, 'mp')}</div>
      <div class="card trlist">${rows}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.trainOpen = () => UI.trainModal();
  UI.act.trainDo = (el) => { const r = E.train(UI.slot(), el.dataset.k); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('level'); UI.save(true); UI.trainModal(); UI.refresh(); };

  // ═════ Эффекты боя ═════
  const layerEl = () => document.getElementById('battle');
  const juiceOn = () => !(UI.p && UI.p.settings && UI.p.settings.juice === false);
  UI.juice = {
    skill(B, e) {
      const u = B.units.find((x) => x.id === e.u), b = layerEl(); if (!u || !b || !juiceOn() || u.side !== 'a') return;
      let el = b.querySelector('.skbanner'); if (!el) { el = document.createElement('div'); el.className = 'skbanner'; b.appendChild(el); }
      el.innerHTML = `<span>${e.ic || '✦'}</span><b>${esc(e.n || '')}</b><small>${esc(u.name)}</small>`; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    },
    dmg(B, e) {
      const u = B.units.find((x) => x.id === e.u), b = layerEl(); if (!u || !b) return;
      if (u.side === 'a') { B.combo = 0; const c = b.querySelector('.combo'); if (c) c.classList.remove('on'); return; }
      B.combo = (B.combo || 0) + 1; B.comboMax = Math.max(B.comboMax || 0, B.combo); if (B.combo < 3 || !juiceOn()) return;
      let c = b.querySelector('.combo'); if (!c) { c = document.createElement('div'); c.className = 'combo'; b.appendChild(c); }
      c.innerHTML = `<b>${B.combo}</b><small>КОМБО</small>`; c.classList.add('on'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    },
    async death(B, e) {
      const u = B.units.find((x) => x.id === e.u), b = layerEl(); if (!u || !b || u.side !== 'e' || !(u.role === 'boss' || u.role === 'mini') || !juiceOn()) return;
      b.classList.add('slowmo'); let k = b.querySelector('.kobanner'); if (!k) { k = document.createElement('div'); k.className = 'kobanner'; b.appendChild(k); }
      k.innerHTML = `<b>${u.role === 'boss' ? 'БОСС ПОВЕРЖЕН' : 'СТРАЖ ПОВЕРЖЕН'}</b><small>${esc(u.name)}</small>`; k.classList.remove('on'); void k.offsetWidth; k.classList.add('on'); UI.sfx('boom');
      await UI.wait(1100); b.classList.remove('slowmo');
    } };

  // ═════ Настройки: громкость эффектов ═════
  const applySfx = () => { const v = UI.p && UI.p.settings && UI.p.settings.sfxVol; A.sfx = v == null ? 1 : +v; };
  const _set = UI.tabs.set;
  UI.tabs.set = function (s) {
    let h = _set(s); const st = UI.p.settings, v = st.sfxVol == null ? 1 : st.sfxVol, row = `<div class="setrow"><span>Громкость эффектов</span><input type="range" min="0" max="1" step="0.05" value="${v}" id="sfxR" aria-label="Громкость эффектов"></div><div class="setrow"><span>Эффекты боя (баннеры, комбо, замедление)</span><button class="tg ${st.juice === false ? '' : 'on'}" data-act="juiceTg" data-quiet="1">${st.juice === false ? 'выкл' : 'вкл'}</button></div>`;
    const i = h.indexOf('id="volR"'); if (i < 0) return h; const j = h.indexOf('</div>', i); return h.slice(0, j + 6) + row + h.slice(j + 6);
  };
  UI.act.juiceTg = () => { const st = UI.p.settings; st.juice = st.juice === false; UI.save(true); UI.refresh(); };
  document.addEventListener('input', (e) => { if (e.target && e.target.id === 'sfxR') { UI.p.settings.sfxVol = +e.target.value; applySfx(); } });
  document.addEventListener('change', (e) => { if (e.target && e.target.id === 'sfxR') { UI.save(true); UI.sfx('click'); } });
  const _enter = UI.enterGame; UI.enterGame = async function () { applySfx(); return _enter.apply(this, arguments); };
})();
