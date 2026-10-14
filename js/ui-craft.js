/* v2.15 — UI «Мастерской творца»: карточка во вкладке «Ремесло», выбор 3 материалов, конструктор с живым превью,
   выбор иконки (атлас 200 шт.), загрузка своей PNG (Божественный из 3 божественных материалов). Логика — js/craft.js. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { $, esc, fmt } = UI;
  const QN = (q) => D.RARITY[q].n;
  const FXI = { u: '✦', m: '✸', d: '☀' };
  // иконка ремесла: превью 128 (в прекэше) или 512 (лениво; офлайн без кэша → превью)
  UI.craftIcon = (id, cls) => {
    const ic = (D.CRAFT_ICONS || [])[id | 0] || (D.CRAFT_ICONS || [])[0] || { f: '000.webp', n: '' }, big = /big/.test(cls || ''), th = D.CRAFT_ICON_DIR + 't/' + ic.f;
    return `<img class="cic ${cls || ''}" src="${big ? D.CRAFT_ICON_DIR + ic.f : th}" ${big ? `loading="lazy" onerror="this.onerror=null;this.src='${th}'"` : ''} alt="${esc(ic.n || '')}" draggable="false">`;
  };
  // ───── IndexedDB: полноразмерные загруженные картинки (ключ ci_… из сохранения) ─────
  const IDB = { db: null, url: {} };
  IDB.open = () => new Promise((res, rej) => { if (IDB.db) return res(IDB.db); if (!self.indexedDB) return rej(new Error('нет IndexedDB')); const r = indexedDB.open('arpg-craft', 1); r.onupgradeneeded = () => r.result.createObjectStore('img'); r.onsuccess = () => { IDB.db = r.result; res(IDB.db); }; r.onerror = () => rej(r.error); });
  IDB.put = (k, blob) => IDB.open().then((db) => new Promise((res, rej) => { const tx = db.transaction('img', 'readwrite'); tx.objectStore('img').put(blob, k); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); }));
  IDB.get = (k) => IDB.open().then((db) => new Promise((res, rej) => { const q = db.transaction('img').objectStore('img').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); }));
  UI.craftIDB = IDB;
  // подставить HD вместо превью (проверка: ключ, тип, размер); нет записи → остаётся превью из сейва
  UI.craftHydrate = function (root) {
    (root || document).querySelectorAll('img[data-ck]:not([data-hd])').forEach((img) => {
      const k = img.dataset.ck; img.dataset.hd = '…'; if (!E.craftKeyOk(k)) return;
      if (IDB.url[k]) { img.src = IDB.url[k]; img.dataset.hd = '1'; return; }
      IDB.get(k).then((b) => { if (b && /^image\/(webp|png)$/.test(b.type) && b.size <= D.CRAFT_HD_MAX) { IDB.url[k] = IDB.url[k] || URL.createObjectURL(b); img.src = IDB.url[k]; img.dataset.hd = '1'; } else img.dataset.hd = '0'; }).catch(() => { img.dataset.hd = '0'; });
    });
  };
  if (typeof MutationObserver !== 'undefined' && document.body) new MutationObserver(() => UI.craftHydrate()).observe(document.body, { childList: true, subtree: true });
  const _ic = UI.itemIc;
  UI.itemIc = (it, big) => {
    if (it && it.cu) {
      const src = it.cu.img && E.craftImgOk(it.cu.img) ? (big && it.cu.img2 && E.craftImgOk(it.cu.img2) ? it.cu.img2 : it.cu.img) : null, hd = big && E.craftKeyOk(it.cu.imgKey) ? ` data-ck="${it.cu.imgKey}"` : '';
      return src ? `<span class="cuimg${big ? ' big' : ''}" data-fb="${it.cu.ic | 0}"><img src="${src}"${hd} alt="" draggable="false" onerror="RPG.UI.craftImgFail(this)"></span>` : UI.craftIcon(it.cu.ic, big ? 'big' : '');
    }
    return _ic(it, big);
  };
  // картинка не загрузилась → иконка из атласа
  UI.craftImgFail = (img) => { const sp = img.parentNode; if (sp) sp.outerHTML = UI.craftIcon(+sp.dataset.fb || 0, sp.classList.contains('big') ? 'big' : ''); };
  // «Создано игроком» в карточке предмета
  const _cx = UI.cxHtml;
  UI.cxHtml = function (it) {
    const base = _cx ? _cx(it) : ''; if (!it || !it.cu) return base; const cu = it.cu;
    const mats = (cu.mats || []).map((id) => D.MATS[id] ? `<span class="cmat q${E.matQ(id)}">${D.MATS[id].ic} ${esc(D.MATS[id].n)}</span>` : '').join('');
    const sk = (cu.sk || []).map((id) => D.SKILLS[id] ? `<div class="cxsk"><b>${D.SKILLS[id].ic || '✧'} ${esc(D.SKILLS[id].n)}</b> 💧${D.SKILLS[id].mp} · перезарядка ${D.SKILLS[id].cd} — ${esc(D.SKILLS[id].d)}</div>` : '').join('');
    return base + `<div class="cxbox cu"><div class="cuh">🛠️ Создано игроком${cu.by ? ' · ' + esc(cu.by) : ''}</div><div class="small dim">Материалы: ${mats || '—'}</div>${sk ? `<div class="small"><b>Навыки предмета</b>${sk}</div>` : ''}${cu.img ? '<div class="small dim">Своя иконка (загружена).</div>' : ''}${cu.fixed ? '<div class="warnbox small">Вещь была исправлена при загрузке: значения вне правил редкости обрезаны.</div>' : ''}</div>`;
  };

  // ───── карточка во вкладке «Ремесло» ─────
  UI.craftCard = function (s) {
    const ok = E.craftUnlocked(s), why = ok ? '' : E.craftLockWhy(s);
    return `<div class="card craftcard ${ok ? 'on' : 'lockd'}"><div class="row gap center-v"><span class="big-ic">🛠️</span><div class="grow tl"><b>Мастерская творца</b><div class="small dim">${ok ? 'Кузнец + Зачарователь: создайте свою вещь — от брони до клинков.' : esc(why)}</div></div>${ok ? '<button class="btn small primary" data-act="cfOpen" data-quiet="1">Создать</button>' : '🔒'}</div>
      <div class="small dim tl">3 материала → редкость = <b>среднее качество</b> трёх (вниз), не выше «Божественного». Затем — основа, имя, очки характеристик, свойства, навыки и иконка.</div></div>`;
  };
  const _prof = UI.tabs.prof;
  UI.tabs.prof = function (s) {
    const html = _prof(s), card = UI.craftCard(s) + UI.profChangeCard(s), i = html.indexOf('<div class="card">');
    return i < 0 ? html + card : html.slice(0, i) + card + html.slice(i);
  };

  // ───── состояние конструктора ─────
  UI.cf = null;
  const fresh = () => ({ step: 'mats', mats: [], base: 'sword', nm: '', a: {}, fx: {}, sk: [], ic: null, img: null, img2: null, tab: 'base' });
  const specOf = (cf) => ({ base: cf.base, mats: cf.mats, nm: cf.nm, a: cf.a, fx: cf.fx, sk: cf.sk, ic: cf.ic, img: cf.img || undefined, imgKey: cf.img && cf.hdKey ? cf.hdKey : undefined });
  UI.act.cfOpen = () => { const s = UI.slot(); if (!E.craftUnlocked(s)) { UI.toast(E.craftLockWhy(s), 'bad'); return; } if (s.run) { UI.toast('Не во время вылазки', 'bad'); return; } UI.cf = fresh(); UI.cfRender(true); };
  UI.cfRender = function (first) {
    const cf = UI.cf; if (!cf) return; const html = cf.step === 'mats' ? matsHtml() : makeHtml();
    const box = $('#modal .mbox.cfm');
    if (!first && box) { const sc = box.querySelector('.cfscroll') || box, st = sc.scrollTop, same = box.classList.contains('cfmake') === (cf.step !== 'mats'); box.classList.toggle('cfmake', cf.step !== 'mats'); box.innerHTML = html; const sc2 = box.querySelector('.cfscroll') || box; if (same) sc2.scrollTop = st; } else { UI.modal(html, { cls: 'tall cfm' + (cf.step !== 'mats' ? ' cfmake' : ''), lock: true }); }
    bind();
  };

  // шаг 1: материалы
  function matsHtml() {
    const s = UI.slot(), cf = UI.cf, used = {}; cf.mats.forEach((id) => { used[id] = (used[id] || 0) + 1; });
    const ids = Object.keys(s.mats).filter((id) => s.mats[id] > 0 && D.MATS[id]).sort((a, b) => E.matQ(b) - E.matQ(a) || D.MATS[b].v - D.MATS[a].v);
    const slots = [0, 1, 2].map((i) => { const id = cf.mats[i]; return id ? `<button class="cslot q${E.matQ(id)}" data-act="cfUnmat" data-i="${i}" data-quiet="1"><span>${D.MATS[id].ic}</span><small>${esc(D.MATS[id].n)}</small><i>${QN(E.matQ(id))}</i></button>` : `<div class="cslot empty"><span>＋</span><small>материал ${i + 1}</small></div>`; }).join('');
    const r = cf.mats.length === 3 ? E.craftRarity(cf.mats) : -1, R = r >= 0 ? E.craftRules(r) : null;
    const grid = ids.map((id) => { const left = s.mats[id] - (used[id] || 0), q = E.matQ(id); return `<button class="cmt q${q}" data-act="cfMat" data-id="${id}" data-quiet="1" ${left <= 0 || cf.mats.length >= 3 ? 'disabled' : ''}><span>${D.MATS[id].ic}</span><b>${left}</b><small>${esc(D.MATS[id].n)}</small><i>${QN(q)}</i></button>`; }).join('') || '<div class="dim small">Материалов нет — добудьте их в подземельях и на промысле.</div>';
    const sum = R ? `<div class="cfsum rar r${r}" style="--rc:${D.RARITY[r].c}"><b>Редкость: ${D.RARITY[r].n}</b><div class="small dim">(${cf.mats.map((id) => E.matQ(id)).join(' + ')}) / 3 = ${(cf.mats.reduce((a, id) => a + E.matQ(id), 0) / 3).toFixed(2)} → ${r}</div><div class="small">Бюджет ${R.budget} очков · характеристик до ${R.attr} · аффиксов до ${R.aff} · свойств ${R.fx.length ? R.fx.map((t) => FXI[t]).join(' ') : '—'} · навыков ${R.sk}</div>${E.craftCanUpload(r, cf.mats) ? '<div class="small ok">☀ Все три материала божественные — можно загрузить свою PNG-иконку.</div>' : r === 7 ? '<div class="small dim">Своя иконка — только если все три материала божественные.</div>' : ''}</div>`
      : `<div class="cfsum small dim">Выберите 3 материала. Редкость = среднее качество трёх, округлённое вниз (макс. «${D.RARITY[D.CRAFT_MAX_R].n}»). Своя PNG — только если все три божественные.</div>`;
    return `<div class="row between center-v"><h3 class="m0">🛠️ Материалы творца</h3><button class="btn ghost small" data-act="cfClose" data-quiet="1">✕</button></div>
      <div class="cslots">${slots}</div>${sum}
      <div class="small dim tl">Качество материала = ступень редкости. Высокие (Эпический…Божественный) падают с мини-боссов и боссов: 🌠 ур.18+, 🪶 ур.28+, 🩸 ур.45+, 💫 только боссы ур.65+.</div>
      <div class="cmgrid">${grid}</div>
      <div class="row gap"><button class="btn ghost grow" data-act="cfClose">Отмена</button><button class="btn primary grow" data-act="cfNext" ${R ? '' : 'disabled'}>Далее → конструктор</button></div>`;
  }
  UI.act.cfMat = (el) => { const cf = UI.cf, s = UI.slot(), id = el.dataset.id; if (!cf || cf.mats.length >= 3) return; const n = cf.mats.filter((x) => x === id).length; if ((s.mats[id] || 0) <= n) return; cf.mats.push(id); UI.sfx('pick'); UI.cfRender(); };
  UI.act.cfUnmat = (el) => { const cf = UI.cf; cf.mats.splice(+el.dataset.i, 1); UI.cfRender(); };
  UI.act.cfClose = () => { UI.cf = null; UI.closeModal(); };
  UI.act.cfNext = () => { const cf = UI.cf; if (E.craftRarity(cf.mats) < 0) return; cf.step = 'make'; cf.r = E.craftRarity(cf.mats); clampState(); UI.cfRender(); };
  UI.act.cfBack = () => { UI.cf.step = 'mats'; UI.cfRender(); };

  // держим выбор в рамках правил (смена основы/редкости)
  function clampState() {
    const cf = UI.cf, c = E.craftCheck(Object.assign(specOf(cf), { img: undefined, img2: undefined }), { fix: true });
    if (!c.spec) return; cf.a = c.spec.a; cf.fx = c.spec.fx; cf.sk = c.spec.sk; if (!E.craftIcons(cf.base, c.spec.r).some((x) => x.id === cf.ic)) cf.ic = c.spec.ic;
    if (!E.craftCanUpload(c.spec.r, cf.mats)) { cf.img = null; cf.img2 = null; cf.hd = null; cf.hdKey = null; }
  }

  // шаг 2: конструктор
  const TABS = [['base', 'Основа'], ['stats', 'Очки'], ['fx', 'Свойства'], ['sk', 'Навыки'], ['ic', 'Иконка']];
  const SLOT_ORDER = ['weapon', 'head', 'body', 'boots', 'ring', 'amulet'];
  function makeHtml() {
    const s = UI.slot(), cf = UI.cf, pv = E.craftPreview(s, specOf(cf)), R = pv.rules, it = pv.item, spent = Object.values(cf.a).reduce((x, y) => x + y, 0), left = R.budget - spent;
    const card = `<div class="cfprev itemhead ${UI.rarCls(it)}" style="${UI.rarVars(it)}"><span class="big-ic">${UI.itemIc(it, true)}</span><div class="grow tl"><b class="m0">${UI.itemName(it)}</b><div class="dim small">${UI.rarBadge(it)} ${D.SLOTS[it.sl]} · ур. ${it.il} · 🛠️ Создано игроком</div><div class="ils">${UI.itemStats(it)}</div>${cf.sk.length ? `<div class="small">${cf.sk.map((id) => `<span class="tag">${D.SKILLS[id].ic || '✧'} ${esc(D.SKILLS[id].n)}</span>`).join(' ')}</div>` : ''}</div></div>
      <div class="cfpts"><span>Очки: <b>${spent}</b> / ${R.budget}</span><span class="bar"><i style="width:${Math.min(100, spent / Math.max(1, R.budget) * 100)}%"></i></span><span class="${left ? 'ok' : 'dim'}">осталось ${left}</span></div>`;
    const tabs = `<div class="seg small cftabs">${TABS.map(([k, n]) => `<button class="${cf.tab === k ? 'on' : ''}" data-act="cfTab" data-k="${k}" data-quiet="1">${n}</button>`).join('')}</div>`;
    let body = '';
    if (cf.tab === 'base') {
      body = SLOT_ORDER.map((sl) => `<div class="small dim tl">${D.SLOT_IC[sl]} ${D.SLOTS[sl]}</div><div class="cfchips">${D.CRAFT_BASES.filter((b) => D.BASES[b].slot === sl).map((b) => `<button class="fchip ${cf.base === b ? 'on' : ''}" data-act="cfBase" data-b="${b}" data-quiet="1">${D.BASES[b].ic} ${esc(D.BASES[b].n)}</button>`).join('')}</div>`).join('')
        + `<label class="small dim tl" for="cfName">Название (до ${D.CRAFT_NAME_MAX} знаков)</label><input id="cfName" class="inp" maxlength="${D.CRAFT_NAME_MAX}" value="${esc(cf.nm)}" placeholder="${esc(D.BASES[cf.base].n)}" autocomplete="off">`
        + (!E.canUse(s.hero, it) ? '<div class="warnbox small">Ваш класс не может использовать это оружие (вещь можно создать для Свиты или продажи).</div>' : '');
    } else if (cf.tab === 'stats') {
      const B = D.BASES[cf.base], nA = Object.keys(cf.a).filter((k) => D.STATS.includes(k)).length, nF = Object.keys(cf.a).length - nA;
      const row = (k, isA) => { const p = cf.a[k] || 0, full = isA ? nA >= R.attr : nF >= R.aff, canUp = p < R.lineMax && left > 0 && (p > 0 || !full), v = E.craftLineVal(k, it.il, R.r, Math.max(1, p)), vmax = E.craftLineVal(k, it.il, R.r, R.lineMax);
        return `<div class="cfrow ${p ? 'on' : ''}"><span class="grow tl"><b>${esc(E.gearLabel(k))}</b><small>${p ? E.fmtGear(k, v) : '—'} <span class="dim">(макс. ${E.fmtGear(k, vmax)})</span></small></span><button class="btn small ghost" data-act="cfPt" data-k="${k}" data-d="-1" data-quiet="1" ${p ? '' : 'disabled'}>−</button><b class="cfp">${p}</b><button class="btn small ghost" data-act="cfPt" data-k="${k}" data-d="1" data-quiet="1" ${canUp ? '' : 'disabled'}>+</button></div>`; };
      body = `<div class="small dim tl">1 очко = 10% максимального броска случайной вещи этой редкости; до ${R.lineMax} очков на линию. Основа (${Object.keys(B.p).map((k) => esc(E.gearLabel(k))).join(', ')}) — бесплатно.</div>`
        + `<div class="diffg small dim">Характеристики ${nA}/${R.attr}</div>` + D.STATS.filter((k) => B.p[k] == null).map((k) => row(k, true)).join('')
        + (R.aff ? `<div class="diffg small dim">Аффиксы ${nF}/${R.aff}</div>` + D.GEAR_AFF.filter((a) => B.p[a.k] == null).map((a) => row(a.k, false)).join('') : '<div class="small dim">У этой редкости нет аффиксов.</div>');
    } else if (cf.tab === 'fx') {
      body = R.fx.length ? R.fx.map((t) => `<div class="diffg small">${FXI[t]} ${D.GEAR_FX_T[t]} — выберите одно</div>` + D.GEAR_FX.filter((f) => f.t === t).map((f) => { const on = cf.fx[t] === f.id, clash = !on && (cf.a[f.k] || Object.keys(cf.fx).some((tt) => tt !== t && D.GEAR_FX_BY[cf.fx[tt]] && D.GEAR_FX_BY[cf.fx[tt]].k === f.k)); return `<button class="cfopt fx-${t} ${on ? 'on' : ''}" data-act="cfFx" data-t="${t}" data-id="${f.id}" data-quiet="1" ${clash ? 'disabled' : ''}><b>${FXI[t]} ${esc(f.n)}</b> ${E.fmtGear(f.k, E.craftFxVal(f, it.il, R.r))}<small>${esc(f.d)}</small></button>`; }).join('')).join('')
        : '<div class="small dim">Особые свойства появляются с «Уникального» (✦), «Мифического» (✸) и «Божественного» (☀) — как у случайных вещей.</div>';
    } else if (cf.tab === 'sk') {
      body = R.sk ? `<div class="small dim tl">Навыков: ${cf.sk.length}/${R.sk}. Пул — «Отголоски Нимба» (базовый ранг, без древа). Навык действует, пока вещь надета.</div>` + D.CRAFT_SK_POOL.map((id) => { const S_ = D.SKILLS[id], on = cf.sk.includes(id); return `<button class="cfopt ${on ? 'on' : ''}" data-act="cfSk" data-id="${id}" data-quiet="1" ${!on && cf.sk.length >= R.sk ? 'disabled' : ''}><b>${S_.ic || '✧'} ${esc(S_.n)}</b> 💧${S_.mp} · ⏳${S_.cd}<small>${esc(S_.d)}</small></button>`; }).join('')
        : `<div class="small dim">Навыки предмета открываются с «${D.RARITY[D.CRAFT_SK.findIndex((x) => x > 0)].n}» (1), у «Божественного» — 2.</div>`;
    } else {
      const ics = E.craftIcons(cf.base, R.r), up = E.craftCanUpload(R.r, cf.mats);
      body = `<div class="small dim tl">Иконок для «${esc(D.BASES[cf.base].n)}» до редкости «${D.RARITY[R.r].n}»: ${ics.length}.</div><div class="cficons">${ics.map((ic) => `<button class="cfic ${cf.ic === ic.id && !cf.img ? 'on' : ''}" data-act="cfIc" data-id="${ic.id}" data-quiet="1" aria-label="${esc(ic.n)}">${UI.craftIcon(ic.id)}<i class="r${ic.r}" style="--rc:${D.RARITY[ic.r].c}"></i></button>`).join('')}</div>`
        + (up ? `<div class="cfup"><b>☀ Своя иконка</b><div class="small dim">Только PNG, до 15 МБ. Хранится в HD (длинная сторона до ${D.CRAFT_HD_PX} px, без увеличения, с прозрачностью) в памяти браузера (IndexedDB); в сейве — превью 128 px.</div><div class="row gap center-v">${cf.img ? `<span class="cuimg big"><img src="${cf.hdUrl || cf.img}" alt=""></span><small class="dim">${cf.hdW}×${cf.hdH}, ${Math.round((cf.hd ? cf.hd.size : 0) / 1024)} КБ</small>` : ''}<label class="btn small primary">Загрузить PNG<input type="file" id="cfFile" accept="image/png" hidden></label>${cf.img ? '<button class="btn small ghost" data-act="cfImgDel" data-quiet="1">Убрать</button>' : ''}</div></div>`
          : `<div class="cfup lockd small dim">☀ Своя PNG-иконка — только для «Божественного» из трёх божественных материалов (💫 Осколок Нимба).</div>`);
    }
    const cost = E.craftGold(R.r), errs = pv.err.filter((e) => !/иконка/.test(e));
    return `<div class="cfhead"><div class="row between center-v"><h3 class="m0">🛠️ Конструктор</h3><button class="btn ghost small" data-act="cfClose" data-quiet="1">✕</button></div>${card}${tabs}</div><div class="cfscroll"><div class="cfbody">${body}</div>
      ${errs.length ? `<div class="warnbox small">${errs.map(esc).join('<br>')}</div>` : ''}</div>
      <div class="row gap cfgo"><button class="btn ghost" data-act="cfBack">← Материалы</button><button class="btn primary grow" data-act="cfMake" ${errs.length || s.gold < cost ? 'disabled' : ''}>Создать · 🪙${fmt(cost)} + 3 материала</button></div>`;
  }
  UI.act.cfTab = (el) => { UI.cf.tab = el.dataset.k; UI.cfRender(); };
  UI.act.cfBase = (el) => { UI.cf.base = el.dataset.b; clampState(); UI.cfRender(); };
  UI.act.cfPt = (el) => { const cf = UI.cf, k = el.dataset.k, d = +el.dataset.d; cf.a[k] = Math.max(0, (cf.a[k] || 0) + d); if (!cf.a[k]) delete cf.a[k]; clampState(); UI.cfRender(); };
  UI.act.cfFx = (el) => { const cf = UI.cf, t = el.dataset.t; cf.fx[t] = cf.fx[t] === el.dataset.id ? undefined : el.dataset.id; if (!cf.fx[t]) delete cf.fx[t]; clampState(); UI.cfRender(); };
  UI.act.cfSk = (el) => { const cf = UI.cf, id = el.dataset.id, i = cf.sk.indexOf(id); if (i >= 0) cf.sk.splice(i, 1); else cf.sk.push(id); clampState(); UI.cfRender(); };
  UI.act.cfIc = (el) => { const cf = UI.cf; cf.ic = +el.dataset.id; Object.assign(cf, { img: null, img2: null, hd: null, hdKey: null }); UI.cfRender(); };
  UI.act.cfImgDel = () => { Object.assign(UI.cf, { img: null, img2: null, hd: null, hdKey: null }); UI.cfRender(); };
  UI.act.cfMake = () => {
    const s = UI.slot(), cf = UI.cf, r = E.craftCustom(s, specOf(cf)); if (r.err) { UI.toast(r.err, 'bad'); UI.sfx('err'); return; }
    if (cf.hd && r.item.cu.imgKey) IDB.put(r.item.cu.imgKey, cf.hd).catch(() => UI.toast('HD-картинку не удалось сохранить в браузере — останется превью', 'bad'));
    UI.cf = null; UI.sfx('forge'); UI.save(true); UI.toast('Создано: ' + r.item.nm, r.item.r >= 3 ? 'gold' : 'ok'); UI.refresh(); UI.itemModal(r.item.id);
  };
  function bind() {
    const n = $('#cfName'); if (n) n.addEventListener('input', () => { UI.cf.nm = n.value; const c = $('#modal .cfprev .rn'); if (c) c.textContent = E.craftName(n.value, UI.cf.base); });
    const f = $('#cfFile'); if (f) f.addEventListener('change', () => { const file = f.files && f.files[0]; if (file) UI.craftUpload(file); });
  }
  // загрузка PNG: проверка типа и сигнатуры, уменьшение на canvas до 128 и 256, компактный data URL
  UI.craftUpload = function (file) {
    const fail = (m) => { UI.toast(m, 'bad'); UI.sfx('err'); };
    if (!file || file.type !== 'image/png' || !/\.png$/i.test(file.name || '.png')) return fail('Только PNG');
    if (file.size > D.CRAFT_UP_MAX) return fail('Файл больше 15 МБ');
    const fr = new FileReader();
    fr.onload = () => {
      const b = new Uint8Array(fr.result, 0, 8), sig = [137, 80, 78, 71, 13, 10, 26, 10]; if (!sig.every((x, i) => b[i] === x)) return fail('Это не PNG');
      const url = URL.createObjectURL(new Blob([fr.result], { type: 'image/png' })), img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url); if (!img.naturalWidth || !img.naturalHeight) return fail('Пустая картинка');
        UI.craftEncode(img).then((o) => {
          if (!o) return fail('Не удалось обработать картинку');
          const cf = UI.cf; if (!cf) return; if (cf.hdUrl) URL.revokeObjectURL(cf.hdUrl);
          Object.assign(cf, { img: o.thumb, img2: null, hd: o.blob, hdW: o.w, hdH: o.h, hdUrl: URL.createObjectURL(o.blob), hdKey: 'ci_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10) });
          UI.sfx('magic'); UI.cfRender();
        });
      };
      img.onerror = () => { URL.revokeObjectURL(url); fail('Не удалось прочитать PNG'); };
      img.src = url;
    };
    fr.onerror = () => fail('Не удалось прочитать файл'); fr.readAsArrayBuffer(file);
  };
  // HD: длинная сторона ≤ 1024 (без увеличения), пропорции и прозрачность сохраняются, webp 0.9 (иначе PNG); превью 128 (вписано) — data URL в сейв
  UI.craftEncode = function (img) {
    const k = Math.min(1, D.CRAFT_HD_PX / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
    const t = document.createElement('canvas'); t.width = t.height = 128; const tg = t.getContext('2d'); tg.imageSmoothingQuality = 'high'; const tk = Math.min(128 / w, 128 / h); tg.drawImage(c, (128 - w * tk) / 2, (128 - h * tk) / 2, w * tk, h * tk);
    let thumb = t.toDataURL('image/webp', 0.85); if (!/^data:image\/webp/.test(thumb) || !E.craftImgOk(thumb)) thumb = t.toDataURL('image/png');
    if (!E.craftImgOk(thumb)) return Promise.resolve(null);
    return new Promise((res) => c.toBlob((bl) => {
      if (bl && bl.type === 'image/webp') return res(bl);
      c.toBlob((p) => res(p), 'image/png');
    }, 'image/webp', 0.9)).then((blob) => (blob && blob.size <= D.CRAFT_HD_MAX ? { blob, thumb, w, h } : null));
  };

  // ───── v2.16: смена профессий ─────
  UI.profChangeCard = (s) => `<div class="card pchg"><div class="row gap center-v"><span class="big-ic">🔄</span><div class="grow tl"><b>Сменить профессию</b><div class="small dim">${D.PROF_CHANGE_COST.toLocaleString('ru-RU')} 🪙 за каждую смену. Прогресс прежней профессии сохраняется — вернувшись, продолжите с того же уровня.</div></div><button class="btn small ghost" data-act="pcOpen" data-quiet="1">Сменить</button></div></div>`;
  UI.act.pcOpen = () => {
    const s = UI.slot(), h = s.hero, row = (which, cur) => `<div class="diffg small">${which === 'main' ? 'Основная' : 'Дополнительная'} (сейчас: ${D.PROFS[cur] ? D.PROFS[cur].ic + ' ' + D.PROFS[cur].n : '—'})</div><div class="cfchips">${D.PROF_IDS.filter((id) => id !== cur).map((id) => { const p = s.profs[id]; return `<button class="fchip" data-act="pcPick" data-w="${which}" data-id="${id}" data-quiet="1">${D.PROFS[id].ic} ${D.PROFS[id].n}${p ? ` <small>ур.${p.lv}</small>` : ''}</button>`; }).join('')}</div>`;
    UI.modal(`<h3>🔄 Смена профессии</h3><div class="small dim tl">Каждая смена — ${D.PROF_CHANGE_COST.toLocaleString('ru-RU')} 🪙 (у вас ${fmt(s.gold)}). Уровень и опыт каждой профессии хранятся: смените обратно — продолжите с того же места (выше потолка роли — 20 для основной, 10 для доп. — уровень не действует, но и не теряется). Выбор текущей второй профессии меняет их местами.</div>${row('main', h.prof1)}${row('sub', h.prof2)}<button class="btn ghost wide" data-act="closeModal">Закрыть</button>`, { cls: 'tall' });
  };
  UI.act.pcPick = (el) => {
    const s = UI.slot(), h = s.hero, which = el.dataset.w, id = el.dataset.id, cur = which === 'main' ? h.prof1 : h.prof2, P = D.PROFS[id], keep = s.profs[id], swap = id === (which === 'main' ? h.prof2 : h.prof1);
    UI.confirm('Сменить профессию?', `${which === 'main' ? 'Основная' : 'Дополнительная'}: ${D.PROFS[cur] ? D.PROFS[cur].ic + ' ' + D.PROFS[cur].n : '—'} → <b>${P.ic} ${P.n}</b>${swap ? ' (обмен местами)' : ''}<br>Стоимость: <b>${D.PROF_CHANGE_COST.toLocaleString('ru-RU')} 🪙</b> (у вас ${fmt(s.gold)})<br><span class="small dim">${keep ? `Прогресс «${P.n}» сохранён: ур. ${keep.lv}.` : `«${P.n}» начнётся с ур. 1.`} Прогресс «${D.PROFS[cur] ? D.PROFS[cur].n : ''}» останется в памяти.</span>`, `Сменить · ${D.PROF_CHANGE_COST.toLocaleString('ru-RU')} 🪙`, () => {
      const r = E.profChange(s, which, id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; }
      UI.sfx('level'); UI.save(true); UI.toast('Профессия: ' + P.n, 'ok'); UI.sub.prof = null; UI.refresh();
    });
  };
})();
