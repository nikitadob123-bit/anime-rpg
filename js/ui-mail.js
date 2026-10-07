/* UI почты: конверт в шапке, вкладка «Почта», письмо в нижнем листе, «Забрать», окно наград.
   Сеть: лента mail/inbox.json грузится при запуске, при входе в игру, при открытии почты, при появлении сети и раз в 15 минут.
   Без сети игра не ждёт — в ящике остаются уже полученные письма. Логика писем — js/mail.js (RPG.M). */
(function () {
  const RPG = globalThis.RPG, E = RPG.E, M = RPG.M, UI = RPG.UI;
  const { $, $$, esc, fmt } = UI;
  const KEY = 'arpg.mailfeed', EVERY = 15 * 60 * 1000;
  UI.TABS.splice(Math.max(0, UI.TABS.findIndex(([t]) => t === 'set')), 0, ['mail', '✉️', 'Почта']);
  const ENV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="m3.8 7.2 8.2 6.3 8.2-6.3"/></svg>';
  UI.MAIL_IC = ENV;

  // ───── Сеть ─────
  UI.mailNet = { st: 'idle', t: 0 };   // idle | loading | ok | off | err
  const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;
  UI.mailFeed = function () { try { const o = JSON.parse(RPG.S.store.getItem(KEY) || 'null'); if (o && Array.isArray(o.letters)) return o; } catch (e) { /* ignore */ } return { t: 0, letters: [] }; };
  UI.mailFetch = async function (force) {
    if (UI.mailNet.st === 'loading') return;
    if (!online()) { UI.mailNet = { st: 'off', t: Date.now() }; UI.mailUpd(); return; }
    if (!force && UI.mailNet.st === 'ok' && Date.now() - UI.mailNet.t < 60000) return;
    UI.mailNet = { st: 'loading', t: UI.mailNet.t }; UI.mailUpd();
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = setTimeout(() => { if (ctl) ctl.abort(); }, 8000);
    try {
      const r = await fetch(M.FEED + '?t=' + Date.now(), { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const pr = M.parseFeed(await r.text());
      if (pr.errors.length) console.warn('Почта: пропущены письма с ошибками', pr.errors);
      try { RPG.S.store.setItem(KEY, JSON.stringify({ t: Date.now(), letters: pr.letters })); } catch (e) { /* нет места — письма всё равно лягут в сохранение */ }
      UI.mailNet = { st: 'ok', t: Date.now() };
      UI.mailLive = pr.letters;
    } catch (e) { UI.mailNet = { st: online() ? 'err' : 'off', t: Date.now() }; }
    finally { clearTimeout(to); }
    UI.mailSync(); UI.mailUpd();
  };

  // ───── Доставка в ящик героя ─────
  let lastSync = 0;
  const ready = (s) => s && s.story && s.story.done.includes('prologue');   // письма — после пролога
  const deliver = function (quiet) {
    const s = UI.v === 'game' && UI.slot(); if (!ready(s)) return 0;
    lastSync = Date.now();
    const n = M.deliver(s, (UI.mailLive || UI.mailFeed().letters).concat(M.localLetters(s)), Date.now());
    if (n) { UI.save(true); if (!quiet && !$('#story') && !$('.battle')) { UI.toast(`📬 ${n === 1 ? 'Новое письмо' : 'Новых писем: ' + n}`, 'gold'); UI.sfx('page'); } }
    return n;
  };
  UI.mailSync = () => deliver(false);
  UI.mailCount = () => { const s = UI.p && UI.slot(); return s && s.mail ? M.count(s) : 0; };
  // обновить бейджи (и экран почты, если он открыт и поверх ничего нет)
  UI.mailUpd = function () {
    if (UI.v !== 'game' || !UI.slot()) return;
    if (UI.tab === 'mail' && !$('#modal.on') && !$('#story') && !$('.battle')) { UI.refresh(); return; }
    UI.mailBadges();
  };
  UI.mailBadges = function () {
    const n = UI.mailCount(), b = (cls) => `<span class="nb ${cls || ''}">${n > 99 ? '99+' : n}</span>`;
    $$('.mailbtn .nb, #nav .nav-more .nb, #nav [data-t="mail"] .nb').forEach((x) => x.remove());
    const hb = $('.mailbtn'); if (hb) { hb.classList.toggle('has', n > 0); if (n) hb.insertAdjacentHTML('beforeend', b()); }
    if (n) { const m = $('#nav .nav-more'); if (m) m.insertAdjacentHTML('beforeend', b()); const g = $('#nav [data-t="mail"]'); if (g) g.insertAdjacentHTML('beforeend', b()); }
  };

  // ───── Встраивание в игровой экран ─────
  const rg = UI.renderGame;
  UI.renderGame = function () {
    if (Date.now() - lastSync > 4000) deliver(false);
    rg.apply(this, arguments);
    const g = $('.gtop .gh .gold');
    if (g) g.insertAdjacentHTML('beforebegin', `<button class="mailbtn" data-act="tab" data-t="mail" data-quiet="1" aria-label="Почта" title="Почта">${ENV}</button>`);
    UI.mailBadges();
  };
  const city = UI.tabs.city;
  UI.tabs.city = function (s) {
    const h = city(s), n = M.count(s); if (!n) return h;
    const card = `<button class="card tap hint mailhint" data-act="tab" data-t="mail" data-quiet="1"><span class="mhic">${ENV}</span><span class="grow tl">Новые письма: <b>${n}</b>${M.ensure(s).list.some((x) => M.canClaim(s, x)) ? ' <span class="gold">· есть подарки 🎁</span>' : ''}</span><span class="chev">›</span></button>`;
    const i = h.indexOf('<div class="bgrid bcity">'); return i < 0 ? h + card : h.slice(0, i) + card + h.slice(i);
  };
  const tab0 = UI.act.tab;
  UI.act.tab = function (el) { const isMail = el && el.dataset.t === 'mail'; if (isMail) deliver(false); const r = tab0.apply(this, arguments); if (isMail) UI.mailFetch(); return r; };
  const enter = UI.enterGame;
  UI.enterGame = async function () { setTimeout(() => UI.mailFetch(), 1500); return enter.apply(this, arguments); };

  // ───── Формат ─────
  const dt = (iso) => { const t = M.parseT(iso); if (!Number.isFinite(t)) return ''; const d = new Date(t), y = d.getFullYear() !== new Date().getFullYear(); return d.toLocaleDateString('ru-RU', y ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }); };
  const body = (s, txt) => esc(E.fmtText(txt || '', s)).replace(/\n/g, '<br>');
  const sealIc = (L) => (L.src === 'local' ? '🪶' : L.from === 'Администрация' ? '👑' : '✉️');
  const giftTiles = (g, cls) => M.giftList(g).map((x, i) => `<div class="mgift ${cls || ''} ${x.r ? 'rar r' + (x.ri || 0) : ''}" style="${x.c ? '--rc:' + x.c + ';--rg:' + RPG.D.RARITY[x.ri || 0].g + ';' : ''}--i:${i}"><span class="gi">${x.img ? `<img class="uqi" src="${x.img}" alt="">` : x.ic}</span><b>${x.q > 1 || !x.r ? '×' + fmt(x.q) : ''}</b><small>${esc(x.n)}</small>${x.r ? `<i class="mgr">${esc(x.r)}</i>` : ''}</div>`).join('');
  const status = (s, L) => {
    if (!M.hasGifts(L.gifts)) return '';
    if (L.claimed || M.ensure(s).claimed[L.id]) return '<span class="mst ok">✔ Получено</span>';
    if (M.isExpired(L)) return '<span class="mst bad">Срок истёк</span>';
    return `<span class="mst gold">🎁 Подарок</span>${L.expires ? `<span class="mst">до ${dt(L.expires)}</span>` : ''}`;
  };

  // ───── Вкладка «Почта» ─────
  UI.tabs.mail = function (s) {
    const m = M.ensure(s), list = m.list, claimable = list.filter((x) => M.canClaim(s, x)).length, removable = list.filter((x) => M.canRemove(s, x)).length;
    const st = UI.mailNet.st;
    const net = !online() || st === 'off' ? '<div class="mnet off">📡 Нет связи — новые письма придут, когда появится интернет</div>'
      : st === 'err' ? '<div class="mnet off">Почта сейчас недоступна — попробуем позже. Полученные письма на месте.</div>'
      : st === 'loading' ? '<div class="mnet">⏳ Проверяем почту…</div>'
      : UI.mailNet.t ? `<div class="mnet ok">Почта проверена в ${new Date(UI.mailNet.t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>` : '';
    const rows = list.map((L) => {
      const exp = M.hasGifts(L.gifts) && !L.claimed && M.isExpired(L), ic = M.giftList(L.gifts).slice(0, 5).map((x) => x.ic).join('');
      return `<button class="mrow ${L.read ? '' : 'unread'} ${exp ? 'expired' : ''}" data-act="mailOpen" data-id="${esc(L.id)}" data-quiet="1"><span class="mseal">${sealIc(L)}</span><span class="grow tl"><span class="mfrom">${esc(L.from)} · ${dt(L.date || L.got)}</span><b class="mtitle">${esc(L.title)}</b><span class="mmeta">${ic ? `<span class="mic">${ic}</span>` : ''}${status(s, L)}</span></span>${L.read ? '' : '<i class="mdot" aria-label="Не прочитано"></i>'}<span class="chev">›</span></button>`;
    }).join('');
    return `<div class="mailtop"><div class="row center-v gap"><span class="mailic">${ENV}</span><h2 class="grow m0">Почта</h2><button class="btn ghost mref" data-act="mailRefresh" data-quiet="1" aria-label="Проверить почту" title="Проверить почту"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/></svg></button></div>${net}
      <div class="row gap">${claimable ? `<button class="btn primary grow" data-act="mailClaimAll" id="btnMailAll">🎁 Забрать всё (${claimable})</button>` : ''}${removable ? `<button class="btn ghost ${claimable ? '' : 'grow'}" data-act="mailClean">🗑 Удалить прочитанные</button>` : ''}</div></div>
      <div class="mlistbox">${rows || '<div class="card center mempty"><div class="big-ic">📭</div><b>Писем пока нет</b><div class="dim small">Вести от Администрации и Свиты появятся здесь.</div></div>'}</div>
      <div class="pcode card"><span class="small dim">Ваш код игрока</span><b id="pcodeMail">${esc(M.code(s))}</b><button class="btn ghost small" data-act="copyPcode" data-quiet="1">📋 Копировать</button><div class="small dim pch">Сообщите его Администрации, чтобы получить личное письмо.</div></div>
      <div class="dim small center pad">Письма с подарками хранятся, пока вы их не заберёте. Подарок из письма можно получить только один раз.</div>`;
  };
  UI.act.mailRefresh = () => { UI.sfx('click'); if (!online()) { UI.toast('📡 Нет связи', 'warn'); UI.mailNet = { st: 'off', t: Date.now() }; UI.refresh(); return; } UI.mailFetch(true); };

  // ───── Письмо ─────
  UI.mailOpen = function (id) {
    const s = UI.slot(), L = M.find(s, id); if (!L) return;
    if (M.markRead(s, id)) { UI.save(true); UI.mailBadges(); }
    const can = M.canClaim(s, L), rm = M.canRemove(s, L), gifts = M.hasGifts(L.gifts);
    UI.modal(`<div class="mlhead"><span class="mseal big">${sealIc(L)}</span><div class="grow tl"><div class="mfrom">От: <b>${esc(L.from)}</b> · ${dt(L.date || L.got)}</div><h3 class="m0">${esc(L.title)}</h3></div></div>
      <div class="mlbody">${body(s, L.body)}</div>
      ${gifts ? `<div class="mlgifts"><div class="mgh">Вложение ${status(s, L)}</div><div class="mgrid">${giftTiles(L.gifts)}</div></div>` : ''}
      <div class="col gap">${can ? `<button class="btn primary big wide" data-act="mailClaim" data-id="${esc(L.id)}" id="btnMailClaim">🎁 Забрать</button>` : ''}
      <div class="row gap">${rm ? `<button class="btn ghost danger" data-act="mailDel" data-id="${esc(L.id)}">🗑 Удалить</button>` : ''}<button class="btn ghost grow" data-act="closeModal">Закрыть</button></div></div>`, { cls: 'tall mailsheet' });
    if (UI.tab === 'mail') { const r = $(`.mrow[data-id="${CSS.escape(id)}"]`); if (r) { r.classList.remove('unread'); const d = r.querySelector('.mdot'); if (d) d.remove(); } }
  };
  UI.act.copyPcode = async () => { const c = M.code(UI.slot()); let ok = false; try { await navigator.clipboard.writeText(c); ok = true; } catch (e) { try { const t = document.createElement('textarea'); t.value = c; document.body.appendChild(t); t.select(); ok = document.execCommand('copy'); t.remove(); } catch (e2) { /* ignore */ } } UI.toast(ok ? 'Код ' + c + ' скопирован' : 'Код: ' + c, 'ok'); };
  UI.act.mailOpen = (el) => UI.mailOpen(el.dataset.id);
  const after = () => { if (UI.v === 'game') UI.refresh(); };
  UI.act.mailClaim = (el) => {
    const s = UI.slot(), r = M.claim(s, el.dataset.id);
    if (!r.ok) { UI.toast(esc(r.err), 'bad'); UI.sfx('err'); UI.mailOpen(el.dataset.id); return; }
    UI.save(true); after(); UI.mailReward(r.gifts, r.got, 1);
  };
  UI.act.mailClaimAll = () => {
    const s = UI.slot(), r = M.claimAll(s); if (!r.n) { UI.toast('Нечего забирать', 'warn'); return; }
    UI.save(true); after(); UI.mailReward(r.sum, r.got, r.n);
  };
  UI.act.mailDel = (el) => { if (M.remove(UI.slot(), el.dataset.id)) { UI.save(true); UI.closeModal(); after(); UI.toast('Письмо удалено', 'ok'); } };
  UI.act.mailClean = () => UI.confirm('Удалить прочитанные?', 'Будут удалены прочитанные письма без подарков, с уже полученными или истёкшими подарками. Письма с незабранными подарками останутся.', 'Удалить', () => { const n = M.removeDone(UI.slot()); UI.save(true); after(); UI.toast('Удалено писем: ' + n, 'ok'); });

  // ───── Окно наград ─────
  UI.mailReward = function (g, got, n) {
    const lv = got && got.levels ? `<div class="center gold">⬆ Уровень героя +${got.levels}!</div>` : '';
    UI.modal(`<div class="mreward"><div class="mrglow" aria-hidden="true"></div><div class="mrbox" aria-hidden="true">🎁</div><h3 class="center">Получено!</h3><div class="dim small center">${n > 1 ? 'Подарки из писем: ' + n : 'Подарок из письма'}</div>
      <div class="mgrid rw">${giftTiles(g, 'pop')}</div>${lv}<button class="btn primary big wide" data-act="closeModal" id="btnMailOk">Отлично</button></div>`, { cls: 'mrewardbox' });
    UI.sfx('win');
    try { const b = $('.mrbox'); if (b && RPG.F && RPG.F.burst) { const r = b.getBoundingClientRect(); RPG.F.burst(r.left + r.width / 2, r.top + r.height / 2, '#ffd36b', 26, 'big'); setTimeout(() => RPG.F.burst(r.left + r.width / 2, r.top + r.height / 2, '#c04cff', 18), 180); } } catch (e) { /* ignore */ }
  };

  // ───── Триггеры сети ─────
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => setTimeout(() => UI.mailFetch(true), 600));
    window.addEventListener('online', () => UI.mailFetch(true));
    window.addEventListener('offline', () => { UI.mailNet = { st: 'off', t: Date.now() }; UI.mailUpd(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) UI.mailFetch(); });
    setInterval(() => { if (!document.hidden) UI.mailFetch(true); }, EVERY);
  }
})();
