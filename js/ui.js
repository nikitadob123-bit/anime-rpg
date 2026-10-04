/* UI: ядро, профили, слоты, создание персонажа */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, S = RPG.S, A = RPG.A;
  const UI = RPG.UI = { act: {}, v: 'title', tab: 'city', cr: null, p: null, sub: {}, t0: Date.now() };
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
  UI.$ = $; UI.$$ = $$; UI.esc = esc; UI.fmt = fmt;
  UI.slot = () => UI.p && UI.p.slots[UI.p.active];
  UI.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  UI.sfx = (n) => { try { A.play(n); } catch (e) { /* ignore */ } };

  // ───── Сохранение ─────
  UI.save = function (quiet) {
    if (!UI.p) return true;
    const s = UI.slot(); if (s) { s.played = (s.played || 0) + Math.round((Date.now() - UI.t0) / 1000); }
    UI.t0 = Date.now(); UI.p.last = Date.now();
    const r = S.save(UI.p);
    if (!r.ok) { UI.toast('⚠️ ' + r.err, 'bad'); return false; }
    if (!quiet) UI.flashSaved(); return true;
  };
  UI.flashSaved = function () { const el = $('#saveDot'); if (!el) return; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); };

  // ───── Портреты ─────
  UI.portraitSpec = function (id) {
    if (!id) return null;
    if (id.startsWith('npc_')) { const m = /^npc_([a-z]+)(?:_([nhsx]))?$/.exec(id); const L = m && RPG.NPC_LOOK[m[1]]; return L ? Object.assign({}, L, { mood: m[2] || 'n' }) : null; }
    const p = RPG.PORTRAIT_BY_ID[id]; return p ? Object.assign({}, p, { mood: 'n' }) : null;
  };
  UI.por = function (id, cls, lazy) {
    if (!id) return '<div class="por empty"></div>';
    if (/^npc_[a-z]+$/.test(id)) id += '_n';
    return `<img class="por ${cls || ''}" ${lazy === false ? '' : 'loading="lazy"'} decoding="async" alt="" draggable="false" data-pid="${esc(id)}" src="assets/portraits/${esc(id)}.webp">`;
  };
  document.addEventListener('error', function (e) {
    const t = e.target; if (!t || t.tagName !== 'IMG' || !t.dataset.pid) return;
    const spec = UI.portraitSpec(t.dataset.pid); if (!spec) return;
    const d = document.createElement('div'); d.className = t.className + ' svgpor'; d.innerHTML = RPG.portraitSVG(spec); t.replaceWith(d);
  }, true);

  // ───── Тосты и модальные окна ─────
  UI.toast = function (msg, kind) {
    const w = $('#toasts'); const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.innerHTML = msg; w.appendChild(el);
    while (w.children.length > 4) w.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2400);
  };
  UI.modal = function (html, o) {
    o = o || {}; const m = $('#modal'); m.innerHTML = `<div class="mback" data-act="${o.lock ? '' : 'closeModal'}"></div><div class="mbox ${o.cls || ''}" role="dialog" aria-modal="true">${html}</div>`;
    m.classList.add('on'); m.dataset.lock = o.lock ? '1' : ''; const b = $('.mbox', m); b.scrollTop = 0; UI.sfx('page');
  };
  UI.closeModal = function () { const m = $('#modal'); m.classList.remove('on'); m.innerHTML = ''; };
  UI.confirm = function (title, text, okLabel, onOk, danger) {
    UI.modal(`<h3>${title}</h3><div class="mtext">${text}</div><div class="row gap"><button class="btn ghost grow" data-act="closeModal">Отмена</button><button class="btn ${danger ? 'danger' : 'primary'} grow" id="cfOk">${okLabel}</button></div>`, { lock: true });
    $('#cfOk').onclick = () => { UI.closeModal(); onOk(); };
  };
  UI.alert = function (title, text) { UI.modal(`<h3>${title}</h3><div class="mtext">${text}</div><button class="btn primary wide" data-act="closeModal">Понятно</button>`); };

  // ───── Делегирование ─────
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled || el.classList.contains('disabled') && !el.dataset.force) return;
    const a = el.dataset.act; if (!a) return;
    try { A.resume(); } catch (er) { /* ignore */ }
    const fn = UI.act[a]; if (!fn) return;
    if (!el.dataset.quiet) UI.sfx('click');
    try { fn(el, e); } catch (err) { console.error(err); UI.toast('Ошибка: ' + esc(err.message), 'bad'); }
  });
  UI.act.closeModal = () => UI.closeModal();

  // ───── Маршрутизация ─────
  UI.go = function (v) { UI.v = v; UI.render(); };
  UI.render = function () {
    const main = $('#view'), nav = $('#nav');
    document.body.dataset.view = UI.v;
    if (UI.v === 'game') { UI.renderGame(); nav.hidden = false; }
    else { nav.hidden = true; const f = { title: UI.vTitle, newprofile: UI.vNewProfile, slots: UI.vSlots, create: UI.vCreate }[UI.v]; main.innerHTML = f(); main.scrollTop = 0; try { RPG.F.setMode('stars'); } catch (e) { /* ignore */ } }
  };

  // ───── Титульный экран / профили ─────
  UI.vTitle = function () {
    const sums = S.summaries();
    const cards = sums.map((s) => {
      if (s.broken) return `<div class="card prof broken"><div class="av">⚠️</div><div class="grow"><b>Повреждённый профиль</b><div class="dim">${esc(s.id)}</div></div><button class="btn small danger" data-act="delBroken" data-id="${esc(s.id)}">Удалить</button></div>`;
      const first = s.slots.find(Boolean); const info = first ? `${esc(first.name)} · ${D.CLASSES[first.cls].n} ${first.level} ур.` : 'без героев';
      return `<button class="card prof tap" data-act="pickProfile" data-id="${esc(s.id)}"><div class="av">${esc(s.avatar)}</div><div class="grow tl"><b>${esc(s.nick)}</b><div class="dim">${info}</div></div>${s.recovered ? '<span class="tag warn">из копии</span>' : ''}<span class="chev">›</span></button>`;
    }).join('');
    return `<div class="screen title">
      <div class="logo"><div class="ring"></div><h1>Нимб Мира</h1><p>Король Демонов пробуждается</p></div>
      <div class="plist">${cards || '<div class="dim center pad">Профилей ещё нет. Создайте первый — и Король проснётся.</div>'}</div>
      <div class="col gap pad">
        <button class="btn primary big" data-act="newProfile" id="btnNewProfile">✦ Новый профиль</button>
        <button class="btn ghost" data-act="importProfile">Импорт по коду</button>
        <div class="dim center small">Сохранения хранятся в этом браузере. Работает без интернета.</div>
      </div></div>`;
  };
  UI.act.newProfile = () => { UI.np = { nick: '', av: 0 }; UI.go('newprofile'); };
  UI.vNewProfile = function () {
    return `<div class="screen">
      <button class="back" data-act="toTitle">‹ Назад</button>
      <h2>Новый профиль</h2>
      <label class="lbl">Ваш ник</label>
      <input id="npNick" class="inp" maxlength="14" placeholder="Например, Странник" value="${esc(UI.np.nick)}" autocomplete="off">
      <label class="lbl">Аватар</label>
      <div class="avgrid">${S.AVATARS.map((a, i) => `<button class="avb ${i === UI.np.av ? 'sel' : ''}" data-act="npAv" data-i="${i}">${a}</button>`).join('')}</div>
      <button class="btn primary big wide" data-act="npCreate" id="btnNpCreate">Создать профиль</button>
      <div class="dim small center">В профиле — до ${S.SLOTS} героев в отдельных слотах.</div></div>`;
  };
  UI.act.toTitle = () => { UI.p = null; UI.go('title'); };
  UI.act.npAv = (el) => { UI.np.nick = $('#npNick').value; UI.np.av = +el.dataset.i; $$('.avb').forEach((b, i) => b.classList.toggle('sel', i === UI.np.av)); };
  UI.act.npCreate = () => {
    const nick = $('#npNick').value.trim(); if (nick.length < 2) { UI.toast('Ник — от 2 символов', 'bad'); UI.sfx('err'); return; }
    const p = S.newProfile(nick, S.AVATARS[UI.np.av]); if (!S.save(p).ok) { UI.toast('Не удалось сохранить', 'bad'); return; }
    UI.p = p; UI.go('slots');
  };
  UI.act.pickProfile = (el) => {
    const r = S.load(el.dataset.id); if (!r.p) { UI.toast('Профиль не читается', 'bad'); return; }
    UI.p = r.p; if (r.recovered) { UI.toast('Профиль восстановлен из резервной копии', 'warn'); S.save(UI.p); }
    UI.go('slots');
  };
  UI.act.delBroken = (el) => UI.confirm('Удалить профиль?', 'Повреждённые данные будут стёрты безвозвратно.', 'Удалить', () => { S.remove(el.dataset.id); UI.render(); }, true);

  // ───── Слоты ─────
  UI.vSlots = function () {
    const p = UI.p; const bak = S.hasBackup(p.id);
    const slots = p.slots.map((s, i) => {
      if (!s) return `<div class="card slot empty"><div class="sn">Слот ${i + 1}</div><div class="dim">Пусто</div><button class="btn primary" data-act="newHero" data-i="${i}">✦ Создать героя</button></div>`;
      const h = s.hero, ch = D.STORY.filter((x) => s.story.done.includes(x.id)).length;
      return `<div class="card slot"><div class="sn">Слот ${i + 1}</div><div class="row gap">${UI.por(h.portrait, 'sm')}<div class="grow tl"><b>${esc(h.name)}</b><div class="dim">Король Демонов · ${D.RACES[h.race].n}</div><div class="dim">Ур. ${h.level} · глав: ${ch}/${D.STORY.length} · ${Math.round((s.played || 0) / 60)} мин</div></div></div>
        <div class="row gap"><button class="btn primary grow" data-act="playSlot" data-i="${i}">▶ Играть</button><button class="btn ghost" data-act="exportSlot" data-i="${i}" title="Экспорт">⇪</button><button class="btn ghost danger" data-act="delSlot" data-i="${i}" title="Удалить">🗑</button></div></div>`;
    }).join('');
    return `<div class="screen"><button class="back" data-act="toTitle">‹ Профили</button>
      <div class="row gap center-v"><div class="av big">${esc(p.avatar)}</div><div class="grow"><h2 class="m0">${esc(p.nick)}</h2><div class="dim">Выберите слот сохранения</div></div></div>
      <div class="col gap">${slots}</div>
      <div class="card col gap"><b>Профиль</b>
        <div class="row gap wrap"><button class="btn ghost small" data-act="exportProfile">Экспорт профиля</button><button class="btn ghost small" data-act="importProfile">Импорт</button>${bak ? '<button class="btn ghost small" data-act="restoreBak">Восстановить копию</button>' : ''}<button class="btn ghost small danger" data-act="delProfile">Удалить профиль</button></div></div></div>`;
  };
  UI.act.newHero = (el) => { UI.p.active = +el.dataset.i; UI.cr = { step: 0, name: '', race: 'o_orphan', uniq: 'phoenix', prof1: null, prof2: null, sel: 'main' }; UI.go('create'); };
  UI.act.playSlot = (el) => { UI.p.active = +el.dataset.i; UI.save(true); UI.enterGame(); };
  UI.act.delSlot = (el) => { const i = +el.dataset.i, s = UI.p.slots[i]; UI.confirm('Удалить героя?', `Герой «${esc(s.hero.name)}» (ур. ${s.hero.level}) будет удалён из слота ${i + 1}. Отменить нельзя — сделайте экспорт, если хотите сохранить копию.`, 'Удалить', () => { UI.p.slots[i] = null; S.save(UI.p); UI.render(); }, true); };
  UI.act.delProfile = () => UI.confirm('Удалить профиль?', `Профиль «${esc(UI.p.nick)}» и все его герои исчезнут навсегда.`, 'Удалить', () => { S.remove(UI.p.id); UI.p = null; UI.go('title'); }, true);
  UI.act.restoreBak = () => UI.confirm('Восстановить копию?', 'Текущее сохранение профиля будет заменено резервной копией (предыдущее состояние).', 'Восстановить', () => { const p = S.restoreBackup(UI.p.id); if (p) { UI.p = p; UI.toast('Копия восстановлена', 'ok'); UI.render(); } else UI.toast('Копия повреждена', 'bad'); });

  // экспорт / импорт
  UI.showCode = function (title, code) {
    UI.modal(`<h3>${title}</h3><div class="mtext small">Скопируйте код и сохраните где угодно. Импортируйте его на другом устройстве.</div><textarea id="codeBox" class="inp code" readonly rows="6">${esc(code)}</textarea><div class="row gap"><button class="btn primary grow" data-act="copyCode">Скопировать</button><button class="btn ghost grow" data-act="dlCode">Скачать .txt</button></div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`);
  };
  UI.act.copyCode = async () => { const t = $('#codeBox'); t.select(); try { await navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand && document.execCommand('copy'); } UI.toast('Код скопирован', 'ok'); };
  UI.act.dlCode = () => { const t = $('#codeBox').value; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = 'nimb-mira-save.txt'; document.body.appendChild(a); a.click(); a.remove(); };
  UI.act.exportSlot = (el) => UI.showCode('Экспорт героя', S.exportCode(UI.p, +el.dataset.i));
  UI.act.exportProfile = () => UI.showCode('Экспорт профиля', S.exportCode(UI.p));
  UI.act.importProfile = () => UI.modal(`<h3>Импорт по коду</h3><div class="mtext small">Вставьте код, начинающийся с «ARPG». Если такой профиль уже есть, будет создан отдельный.</div><textarea id="impBox" class="inp code" rows="6" placeholder="ARPG3.…"></textarea><div class="row gap"><button class="btn ghost grow" data-act="closeModal">Отмена</button><button class="btn primary grow" data-act="doImport" id="btnDoImport">Импортировать</button></div>`);
  UI.act.doImport = () => {
    const r = S.importCode($('#impBox').value); if (r.err) { UI.toast(esc(r.err), 'bad'); UI.sfx('err'); return; }
    if (!S.save(r.p).ok) { UI.toast('Не удалось сохранить', 'bad'); return; }
    UI.closeModal(); UI.p = r.p; UI.toast('Профиль «' + esc(r.p.nick) + '» импортирован', 'ok'); UI.go('slots');
  };

  // ───── Создание персонажа (Король Демонов) ─────
  const STEPS = ['Имя', 'Прошлое', 'Отголосок', 'Ремесло', 'Итог'];
  const NAMES = ['Кайрон', 'Арвен', 'Зарек', 'Лэн', 'Дариус', 'Моррен', 'Вальтор', 'Рэйн', 'Кассиан', 'Тэйр'];
  UI.randName = () => NAMES[Math.floor(Math.random() * NAMES.length)];
  UI.crSlot = function () { const c = UI.cr; return E.newSlot({ name: c.name || 'Король', race: c.race, uniq: c.uniq, prof1: c.prof1, prof2: c.prof2 }); };
  const bar = (v, max, cl) => `<span class="bar ${cl || ''}"><i style="width:${Math.min(100, v / max * 100)}%"></i></span>`;
  UI.statRow = (d) => `<div class="stats"><span>❤️ ${fmt(d.maxHp)}</span><span>💧 ${fmt(d.maxMp)}</span><span>⚔️ ${fmt(Math.max(d.atk, d.mag, d.hpow))}</span><span>🛡️ ${fmt(d.def)}</span><span>✨ ${fmt(d.res)}</span><span>💨 ${d.spd}</span></div>`;
  UI.vCreate = function () {
    const c = UI.cr, s = UI.crSlot(), d = E.derive(s);
    const head = `<div class="crhead">${UI.por('hero', 'sm', false)}<div class="grow tl"><b class="nm">${esc(c.name || 'Безымянный')}</b><div class="dim">Король Демонов · ${D.ORIGINS[c.race].n}${c.uniq ? ' · ' + D.UNIQ[c.uniq].ic + ' ' + D.UNIQ[c.uniq].n : ''}</div>${UI.statRow(d)}</div></div>`;
    const dots = `<div class="steps">${STEPS.map((n, i) => `<button class="stp ${i === c.step ? 'on' : ''} ${i < c.step ? 'done' : ''}" data-act="crGo" data-i="${i}" data-quiet="1"><i>${i + 1}</i><span>${n}</span></button>`).join('')}</div>`;
    const body = [crName, crOrigin, crEcho, crProf, crFinal][c.step](c, s, d);
    const last = c.step === STEPS.length - 1;
    return `<div class="screen create"><div class="crtop"><button class="back" data-act="crCancel">‹ Выйти</button>${head}${dots}</div><div class="crbody">${body}</div>
      <div class="crfoot"><button class="btn ghost" data-act="crPrev" ${c.step === 0 ? 'disabled' : ''}>‹ Назад</button>${last ? '<button class="btn primary grow" data-act="crFinish" id="btnCrFinish">Начать путь ✦</button>' : '<button class="btn primary grow" data-act="crNext" id="btnCrNext">Далее ›</button>'}</div></div>`;
  };
  function crName(c) {
    return `<div class="card row gap">${UI.por('hero', 'lg', false)}<div class="grow tl small"><b>Король Демонов</b><br>Вы очнулись на руинах, где вчера стоял город. Вместе с памятью вернулась сила, которую когда-то боялись боги. Выберите, кем вы были до пробуждения.</div></div>
      <h3>Как вас зовут?</h3><input id="crName" class="inp" maxlength="16" placeholder="Имя" value="${esc(c.name)}" autocomplete="off">
      <button class="btn ghost small" data-act="crRand">🎲 Случайное имя</button>
      <div class="dim small">Герой — мужчина, Король Демонов. Вся сила — в ветках Силы, а не в классах.</div>`;
  }
  function crOrigin(c) {
    return `<h3>Прошлое — кем вы были в Хельморе</h3>` + D.ORIGIN_IDS.map((id) => {
      const r = D.ORIGINS[id], st = Object.keys(r.st).filter((k) => r.st[k]).map((k) => `<span class="chip">${D.STAT_N[k]} ${r.st[k] > 0 ? '+' : ''}${r.st[k]}</span>`).join('');
      return `<button class="card opt ${c.race === id ? 'sel' : ''}" data-act="crRaceSet" data-id="${id}" data-quiet="1"><div class="row gap center-v"><span class="big-ic">${r.ic}</span><b class="grow tl">${r.n}</b>${c.race === id ? '<span class="ok">✔</span>' : ''}</div><div class="chips">${st}</div><div class="dim small tl">${r.lore}</div><div class="pas tl"><b>${r.pn}:</b> ${r.pd}</div></button>`;
    }).join('');
  }
  function crEcho(c) {
    return `<h3>Отголосок Нимба — стартовый приём</h3><div class="dim small">Осколок силы, что остался в крови после пробуждения. У каждого — активный приём и древо из 7 узлов (до 3 рангов). Очки выдаются каждые 3 уровня и за боссов.</div>` + D.UNIQ_IDS.map((id) => {
      const u = D.UNIQ[id], open = c.uniq === id;
      const nodes = u.nodes.map((n) => `<li><b>${n.n}</b> <span class="dim">(т.${n.t}, до ${n.max} р.)</span> — ${D.nodeDesc(n.e)}</li>`).join('');
      return `<button class="card opt ${open ? 'sel' : ''}" data-act="crUniq" data-id="${id}" data-quiet="1"><div class="row gap center-v"><span class="big-ic">${u.ic}</span><div class="grow tl"><b>${u.n}</b><div class="dim small">${D.ELEMS[u.el].ic} ${D.ELEMS[u.el].n}</div></div>${open ? '<span class="ok">✔</span>' : ''}</div><div class="small tl">${u.d}</div>${open ? `<div class="pas tl"><b>Приём «${u.act.n}»:</b> ${u.act.d || ''}</div><ul class="perks small">${nodes}</ul>` : ''}</button>`;
    }).join('');
  }
  function crProf(c) {
    const pn = (id) => (id ? D.PROFS[id].ic + ' ' + D.PROFS[id].n : '— не выбрано —');
    const grid = D.PROF_IDS.map((id) => { const p = D.PROFS[id], m = c.prof1 === id, s = c.prof2 === id; return `<button class="pf ${m ? 'sel main' : ''} ${s ? 'sel sub' : ''}" data-act="crProf" data-id="${id}" data-quiet="1"><span class="big-ic">${p.ic}</span><b>${p.n}</b><em>${p.t === 'craft' ? 'ремесло' : 'добыча'}</em>${m ? '<i class="badge">Осн.</i>' : s ? '<i class="badge">Доп.</i>' : ''}</button>`; }).join('');
    const focus = c.pfFocus && D.PROFS[c.pfFocus];
    const info = focus ? `<div class="card"><b>${focus.ic} ${focus.n}</b><div class="small tl">${focus.d}</div><div class="small tl dim">${focus.fx}</div><ul class="perks small">${Object.keys(focus.perks).map((l) => `<li><b>Ур. ${l}:</b> ${focus.perks[l].n}</li>`).join('')}</ul></div>` : '<div class="dim small">Нажмите на профессию, чтобы прочитать о ней.</div>';
    return `<h3>Профессии</h3><div class="warnbox">⚠️ Выбор <b>навсегда</b>: одна основная (до 20 ур.) и одна дополнительная (до 10 ур.) на всю игру. Перед стартом попросим подтверждение.</div>
      <div class="seg"><button class="${c.sel === 'main' ? 'on' : ''}" data-act="crSelSlot" data-v="main" data-quiet="1">Основная: ${pn(c.prof1)}</button><button class="${c.sel === 'sub' ? 'on' : ''}" data-act="crSelSlot" data-v="sub" data-quiet="1">Доп.: ${pn(c.prof2)}</button></div>
      <div class="pfgrid">${grid}</div>${info}`;
  }
  function crFinal(c, s, d) {
    const r = D.ORIGINS[c.race], u = D.UNIQ[c.uniq];
    const miss = []; if (!c.name.trim()) miss.push('имя'); if (!c.prof1) miss.push('основная профессия'); if (!c.prof2) miss.push('дополнительная профессия');
    return `<h3>Итог</h3><div class="card row gap">${UI.por('hero', 'lg', false)}<div class="grow tl"><h2 class="m0">${esc(c.name || '—')}</h2><div class="dim">Король Демонов · ${r.n}</div><div class="small">${r.ic} ${r.pn}: ${r.pd}</div></div></div>
      <div class="card"><b>Характеристики</b><div class="sbs">${D.STATS.map((st) => `<div class="sb"><span>${D.STAT_N[st]}</span>${bar(d[st], 25)}<em>${d[st]}</em></div>`).join('')}</div>${UI.statRow(d)}</div>
      <div class="card small tl"><b>Сила:</b> шесть Веток Силы Короля Демонов, Мантра Силы и «Фактор Короля Демонов».<br><b>Отголосок:</b> ${u.ic} ${u.n} — ${u.act.n}<br><b>Профессии:</b> ${c.prof1 ? D.PROFS[c.prof1].ic + ' ' + D.PROFS[c.prof1].n : '—'} (осн.), ${c.prof2 ? D.PROFS[c.prof2].ic + ' ' + D.PROFS[c.prof2].n : '—'} (доп.)</div>
      ${miss.length ? `<div class="warnbox">Не хватает: ${miss.join(', ')}.</div>` : '<div class="warnbox">Профессии нельзя будет поменять. Остальное — только через ветки Силы.</div>'}`;
  }
  const keepName = () => { const i = $('#crName'); if (i) UI.cr.name = i.value; };
  const rerender = () => { const sc = $('.crbody') ? $('.crbody').scrollTop : 0; UI.render(); const b = $('.crbody'); if (b) b.scrollTop = sc; };
  UI.act.crGo = (el) => { keepName(); UI.cr.step = +el.dataset.i; UI.render(); };
  UI.act.crPrev = () => { keepName(); UI.cr.step = Math.max(0, UI.cr.step - 1); UI.render(); };
  UI.act.crNext = () => {
    keepName(); const c = UI.cr;
    if (c.step === 0 && c.name.trim().length < 2) { UI.toast('Имя — от 2 символов', 'bad'); UI.sfx('err'); return; }
    if (c.step === 3 && (!c.prof1 || !c.prof2)) { UI.toast('Выберите основную и дополнительную профессии', 'bad'); UI.sfx('err'); return; }
    c.step++; UI.render();
  };
  UI.act.crCancel = () => UI.confirm('Выйти из создания?', 'Выбор не сохранится.', 'Выйти', () => UI.go('slots'));
  UI.act.crRand = () => { UI.cr.name = UI.randName(); const i = $('#crName'); if (i) i.value = UI.cr.name; keepName(); const h = $('.crhead .nm'); if (h) h.textContent = UI.cr.name; };
  UI.act.crRaceSet = (el) => { keepName(); UI.cr.race = el.dataset.id; rerender(); };
  UI.act.crUniq = (el) => { UI.cr.uniq = el.dataset.id; rerender(); };
  UI.act.crSelSlot = (el) => { UI.cr.sel = el.dataset.v; rerender(); };
  UI.act.crProf = (el) => {
    const c = UI.cr, id = el.dataset.id; c.pfFocus = id;
    if (c.sel === 'main') { if (c.prof2 === id) c.prof2 = null; c.prof1 = id; if (!c.prof2) c.sel = 'sub'; }
    else { if (c.prof1 === id) c.prof1 = null; c.prof2 = id; if (!c.prof1) c.sel = 'main'; }
    rerender();
  };
  UI.act.crFinish = () => {
    keepName(); const c = UI.cr;
    if (c.name.trim().length < 2) { UI.toast('Введите имя', 'bad'); c.step = 0; UI.render(); return; }
    if (!c.prof1 || !c.prof2) { UI.toast('Выберите обе профессии', 'bad'); c.step = 3; UI.render(); return; }
    UI.confirm('Подтвердить выбор?', `Профессии <b>${D.PROFS[c.prof1].n}</b> (основная) и <b>${D.PROFS[c.prof2].n}</b> (дополнительная) закрепляются <b>навсегда</b>.`, 'Начать', () => {
      const slot = E.newSlot({ name: c.name.trim(), race: c.race, uniq: c.uniq, prof1: c.prof1, prof2: c.prof2, now: Date.now() });
      slot.hero.profLocked = true; slot.tut = { newGame: 1 };
      UI.p.slots[UI.p.active] = slot; UI.t0 = Date.now(); UI.save(true); UI.cr = null; UI.sfx('win'); UI.enterGame(true);
    });
  };
})();
