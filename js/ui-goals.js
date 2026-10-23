/* UI v2.25: карточка «Ежедневно» в Лагере (вход, задания, Дозор, достижения), окно достижений,
   обновлённое меню героя (рамка по редкости, мощь, разделы-вкладки). Все прежние кнопки и карточки на месте. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { esc, fmt } = UI;
  const bar = (v, max, cl) => `<span class="bar ${cl || ''}"><i style="width:${Math.max(0, Math.min(100, v / Math.max(1, max) * 100))}%"></i></span>`;
  const rw = (r) => [r.gold ? UI.gi('cur_gold', '🪙') + ' ' + fmt(r.gold) : '', r.food ? UI.gi('cur_food', '🍖') + ' ' + r.food : '', r.sig ? UI.gi('cur_sig', '🔱') + ' ' + r.sig : '', r.egg >= 0 && r.egg != null ? UI.gi('cur_egg', '🥚') + ' ' + esc(D.EGG_NAME[r.egg]) : '', r.mats ? Object.keys(r.mats).map((m) => UI.matIc(m) + ' ' + r.mats[m]).join(' ') : ''].filter(Boolean).join(' · ');
  const hm = (ms) => { const m = Math.floor(ms / 60000); return Math.floor(m / 60) + ' ч ' + (m % 60) + ' мин'; };
  UI.rwText = rw;

  // ═════ Лагерь: «Ежедневно» ═════
  UI.dailyCard = function (s) {
    const now = Date.now(), list = E.dailyList(s, now), d = s.daily, login = E.loginReady(s, now), nd = d.loginDay === E.dayKey(now) - 1 ? d.streak + 1 : 1, next = E.streakReward(s, nd);
    const allC = list.every((q) => q.claimed), af = E.afkPreview(s, now), ach = E.achReady(s);
    const qs = list.map((q) => `<div class="dq ${q.done ? 'done' : ''}"><span class="dqi">${UI.gi('ach_' + q.id, q.ic)}</span><div class="grow tl"><b>${esc(q.n)}</b> <small class="dim">${fmt(q.have)}/${fmt(q.need)}</small>${bar(q.have, q.need, 'xp')}</div>${q.claimed ? '<span class="dqok">✓</span>' : `<button class="btn small ${q.done ? 'primary' : 'ghost'}" data-act="dailyClaim" data-id="${q.id}" ${q.done ? '' : 'disabled'}>Забрать</button>`}</div>`).join('');
    return `<div class="card dailycard"><div class="row between center-v"><b class="ttl">${UI.gi('act_daily', '📅')} Ежедневно</b><button class="btn ghost small" data-act="achOpen" data-quiet="1">${UI.gi('act_ach', '🏆')} Достижения${ach ? ` <i class="dbadge">${ach}</i>` : ''}</button></div>
      <div class="dlogin ${login ? 'ready' : ''}"><div class="grow tl"><b>${UI.gi('act_login', '🔥')} Серия входов: ${d.streak} ${login ? '' : '· сегодня получено'}</b><div class="small dim">${login ? 'Награда дня ' + (((nd - 1) % 7) + 1) + '/7: ' + rw(next) : 'Завтра — следующий день серии (7-й день: яйцо)'}</div></div>${login ? '<button class="btn primary small" data-act="loginClaim">Получить</button>' : ''}</div>
      ${qs}<button class="btn ${allC && !d.bonus ? 'primary' : 'ghost'} small wide" data-act="dailyBonus" ${allC && !d.bonus ? '' : 'disabled'}>${d.bonus ? '✓ Сундук дня получен' : UI.gi('act_chest', '🎁') + ' Сундук дня (все 3 задания): ' + rw(E.dailyBonus(s))}</button>
      <div class="dafk"><div class="grow tl"><b>${UI.gi('act_afk', '🌙')} Дозор Свиты</b><div class="small dim">${af.ok ? `Собрано за ${hm(af.ms)}${af.full ? ' (максимум 12 ч)' : ''}: ${rw(af)}` : 'Свита собирает добычу, пока вас нет (до 12 ч). Загляните позже.'}</div></div><button class="btn small ${af.ok ? 'primary' : 'ghost'}" data-act="afkClaim" ${af.ok ? '' : 'disabled'}>Собрать</button></div></div>`;
  };
  const done = (r, msg) => { if (r.err) { UI.toast(r.err, 'bad'); UI.sfx('err'); return false; } UI.sfx('gold'); UI.save(true); UI.toast(msg + (rw(r) ? ': ' + rw(r) : ''), 'gold'); UI.refresh(); return true; };
  UI.act.dailyClaim = (el) => done(E.dailyClaim(UI.slot(), el.dataset.id), '✓ Задание выполнено');
  UI.act.dailyBonus = () => done(E.dailyBonusClaim(UI.slot()), '🎁 Сундук дня');
  UI.act.loginClaim = () => { const r = E.loginClaim(UI.slot()); done(r, '🔥 День серии ' + (r.streak || '')); };
  UI.act.afkClaim = () => done(E.afkClaim(UI.slot()), '🌙 Дозор');

  // ═════ Достижения ═════
  UI.achModal = function () {
    const s = UI.slot(), L = E.achList(s), got = L.filter((x) => x.claimed).length;
    const fams = D.ACH_FAM.map((f) => { const xs = L.filter((x) => x.a.fam === f.id), cur = xs.find((x) => !x.claimed) || xs[xs.length - 1], v = cur.v;
      return `<div class="achf ${xs.every((x) => x.claimed) ? 'all' : ''}"><span class="achi">${UI.gi('ach_' + f.id, f.ic)}</span><div class="grow tl"><b>${esc(cur.a.n)}</b> <span class="achst">${xs.map((x) => x.claimed ? '★' : '☆').join('')}</span><div class="small dim">${esc(cur.a.d)} · награда: ${rw(cur.a.rw)}</div>${bar(Math.min(v, cur.a.need), cur.a.need, 'xp')}<small class="dim">${fmt(Math.min(v, cur.a.need))} / ${fmt(cur.a.need)}</small></div>${cur.claimed ? '<span class="dqok">✓</span>' : `<button class="btn small ${cur.done ? 'primary' : 'ghost'}" data-act="achClaim" data-id="${cur.a.id}" ${cur.done ? '' : 'disabled'}>Забрать</button>`}</div>`; }).join('');
    UI.modal(`<h3>${UI.gi('act_ach', '🏆')} Достижения <span class="dim small">${got}/${D.ACH.length}</span></h3><div class="achlist">${fams}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.achOpen = () => UI.achModal();
  UI.act.achClaim = (el) => { if (done(E.achClaim(UI.slot(), el.dataset.id), '🏆 Достижение')) UI.achModal(); };

  // Лагерь: карточка — после текущей цели
  const _city = UI.tabs.city;
  UI.tabs.city = function (s) { const h = _city(s), k = h.indexOf('<div class="campaign-heading">'); const card = UI.dailyCard(s); return k < 0 ? h + card : h.slice(0, k) + card + h.slice(k); };

  // ═════ Меню героя: рамка по редкости, мощь, разделы ═════
  UI.heroSec = 'all';
  const SECS = [['all', 'Обзор'], ['gear', 'Снаряжение'], ['comp', 'Спутники'], ['info', 'Бонусы']];
  const secOf = (el) => { const c = el.className || ''; if (/herocard/.test(c)) return 'top'; if (/gearcard/.test(c) || (/artcard/.test(c) && !/petcard|allycard/.test(c))) return 'gear'; if (/petcard|allycard/.test(c)) return 'comp'; if (/stcard/.test(c)) return 'stat'; return 'info'; };
  const _hero = UI.tabs.hero;
  UI.tabs.hero = function (s) {
    let h = _hero(s); if (typeof document === 'undefined') return h;
    const best = Object.values(s.eq || {}).reduce((m, it) => Math.max(m, it ? it.r | 0 : 0), 0), R = D.RARITY[best] || D.RARITY[0];
    const tp = document.createElement('div'); tp.innerHTML = h;
    const hc = tp.querySelector('.herocard'); if (hc) { hc.classList.add('herocard2'); hc.style.setProperty('--hrc', R.c); const info = hc.querySelector('.hinfo'); if (info) info.insertAdjacentHTML('beforeend', `<div class="hpow"><span>💪 Мощь <b>${fmt(E.power(s))}</b></span><span>👥 Отряд <b>${fmt(E.teamPower(s))}</b></span></div>`); }
    [...tp.children].forEach((el) => { if (el.tagName !== 'H2') el.dataset.hs = secOf(el); });
    const t = tp.querySelector('h2.herotitle'); if (t) t.insertAdjacentHTML('afterend', `<div class="hsecs" role="tablist">${SECS.map(([k, n]) => `<button class="${UI.heroSec === k ? 'on' : ''}" data-act="heroSec" data-k="${k}" data-quiet="1">${n}</button>`).join('')}</div>`);
    return `<div class="herowrap hs-${UI.heroSec}">${tp.innerHTML}</div>`;
  };
  UI.act.heroSec = (el) => { UI.heroSec = el.dataset.k; const w = document.querySelector('.herowrap'); if (!w) { UI.refresh(); return; } w.className = 'herowrap hs-' + UI.heroSec; w.querySelectorAll('.hsecs button').forEach((b) => b.classList.toggle('on', b.dataset.k === UI.heroSec)); };

  // при входе — напоминание о Дозоре
  const _enter = UI.enterGame;
  UI.enterGame = async function () { const r = await _enter.apply(this, arguments); try { const s = UI.slot(); if (s && E.afkPreview(s).h >= 1) setTimeout(() => UI.toast('🌙 Дозор Свиты собрал добычу — загляните в Лагерь', 'gold'), 2500); } catch (e) { /* ignore */ } return r; };
})();
