/* UI: подземелья, вылазка, бой, сюжетный плеер */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, C = RPG.C, A = RPG.A, F = RPG.F, UI = RPG.UI;
  const { $, $$, esc, fmt } = UI;
  const bar = (v, max, cl) => `<span class="bar ${cl || ''}"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i></span>`;
  const EVIC = { chest: '🎁', rest: '🔥', shrine: '⛩️', gather_ore: '⛏️', gather_herb: '🌿', gather_hunt: '🐾', gather_fish: '🎣' };
  const evIcon = (ev) => EVIC[ev] || (D.GATHER_EV[ev] ? D.GATHER_EV[ev].ic : '❓');
  const rarSpan = (it) => `<span class="lootl">${UI.itemIc(it)} ${UI.itemName(it)} ${UI.rarBadge(it)}</span>`;

  // ═════ ПОДЗЕМЕЛЬЯ ═════
  UI.tabs.dun = function (s) {
    if (s.run) return runView(s);
    const h = s.hero;
    const cards = D.DUNGEONS.filter((d) => !E.dungeonVisible || E.dungeonVisible(s, d.id)).map((d) => {
      const open = E.dungeonUnlocked(s, d.id), cl = s.prog.cleared[d.id] || 0;
      const tiers = D.TIERS.map((t, i) => `<i class="td ${cl > i ? 'on' : ''}" title="${t.n}">${t.ic}</i>`).join('');
      const reason = !open ? (d.lockHint ? d.lockHint : d.id === 'cathedral' && s.prog.cleared.spire ? 'Сначала прочтите главу «У врат собора».' : d.need === 'ch1' ? 'Завершите пролог.' : 'Сначала пройдите «' + D.DUN[d.need].n + '».') : '';
      return `<button class="card dcard ${open ? '' : 'lockd'}" style="--dc:${d.col}" data-act="dunOpen" data-id="${d.id}" ${open ? '' : 'data-quiet="1"'}><div class="dic">${d.ic}</div><div class="grow tl"><b>${d.n}</b><div class="dim small">ур. ${d.lv}–${d.lv + d.floors + 1} · этажей: ${d.floors}</div><div class="small tl dim">${open ? d.d : reason}</div></div><div class="tiers">${open ? tiers : '🔒'}</div></button>`;
    }).join('');
    return `<h2>Подземелья</h2><div class="small dim tl">Выберите место для вылазки. Сложность растёт после первой победы. Рекомендуемый уровень указан для «Обычного».</div>${cards}`;
  };
  UI.act.dunOpen = (el) => {
    const s = UI.slot(), d = D.DUN[el.dataset.id];
    if (!E.dungeonUnlocked(s, d.id)) { UI.toast('Подземелье пока закрыто', 'bad'); UI.sfx('err'); return; }
    const cl = s.prog.cleared[d.id] || 0; UI.prep = { did: d.id, tier: Math.min(cl, 3), buffs: {} }; UI.prepModal();
  };
  UI.prepModal = function () {
    const s = UI.slot(), P = UI.prep, d = D.DUN[P.did], T = D.TIERS[P.tier], un = E.recruited(s);
    const lv0 = d.lv + T.lv, power = E.power(s);
    const tiers = D.TIERS.map((t, i) => { const ok = E.tierUnlocked(s, d.id, i); return `<button class="tchip ${P.tier === i ? 'on' : ''} ${ok ? '' : 'lockd'}" data-act="prepTier" data-i="${i}" data-quiet="1">${ok ? t.ic : '🔒'}<b>${t.n}</b><small>ур. ${d.lv + t.lv}+</small></button>`; }).join('');
    const comps = un.length ? un.filter((id) => !E.onMission(s, id)).map((id) => { const c = D.CREW[id], st = s.crew[id], on = s.party.includes(id); return `<button class="item ${on ? 'selitem' : ''}" data-act="prepComp" data-id="${id}" data-quiet="1">${UI.por(c.art, 'xs', false)}<span class="grow tl"><b>${c.n}</b> <small>${D.ARCH_N[c.arch]} · ур. ${st.lv} · ${D.loyTier(st.loy).n}</small></span>${on ? '<span class="ok">✔</span>' : ''}</button>`; }).join('') : '<div class="small dim">Подчинённые присоединятся по ходу сюжета.</div>';
    const buffs = Object.keys(s.cons).filter((k) => s.cons[k] > 0 && D.CONS[k] && D.CONS[k].buff);
    const bh = buffs.length ? buffs.map((k) => `<button class="chip btn-chip ${P.buffs[k] ? 'on' : ''}" data-act="prepBuff" data-id="${k}" data-quiet="1">${D.CONS[k].ic} ${D.CONS[k].n} ×${s.cons[k]}</button>`).join('') : '<span class="dim small">Нет (готовьте еду у повара, эликсиры — у алхимика)</span>';
    const pots = (s.cons.pot_hp1 || 0) + (s.cons.pot_hp2 || 0) + (s.cons.pot_hp3 || 0);
    UI.modal(`<div class="dhead" style="--dc:${d.col}"><span class="big-ic">${d.ic}</span><div class="grow tl"><h3 class="m0">${d.n}</h3><div class="dim small">${d.d}</div></div></div>
      <div class="small tl"><b>Сложность</b></div><div class="tiers4">${tiers}</div>
      <div class="small dim tl">Враги: ур. ${lv0}–${lv0 + d.floors + 1}. Босс: ${D.ENEMIES[d.boss].ic} ${D.ENEMIES[d.boss].n}.${D.ENEMIES[d.mini].duel ? ' Дуэль с героиней: ' + D.ENEMIES[d.mini].n + '.' : ''} Ваша мощь ${fmt(power)}${pots ? ' · зелий лечения: ' + pots : ' · <b class="bad">нет зелий лечения</b>'}.</div>
      <div class="small tl"><b>Отряд</b> (до трёх, остальные — на заданиях)</div>${comps}
      <div class="small tl"><b>Еда и эликсиры</b> (до конца вылазки)</div><div class="chips">${bh}</div>
      <div class="row gap"><button class="btn ghost grow" data-act="closeModal">Отмена</button><button class="btn primary grow" data-act="dunGo" id="btnDunGo">⚔️ В путь</button></div>`, { cls: 'tall' });
  };
  UI.act.prepTier = (el) => { const s = UI.slot(), i = +el.dataset.i; if (!E.tierUnlocked(s, UI.prep.did, i)) { UI.toast('Сначала победите босса на предыдущей сложности', 'bad'); UI.sfx('err'); return; } UI.prep.tier = i; UI.prepModal(); };
  UI.act.prepComp = (el) => { const s = UI.slot(), id = el.dataset.id; let p = s.party.slice(); if (p.includes(id)) p = p.filter((x) => x !== id); else { if (p.length >= E.PARTY_MAX) p.shift(); p.push(id); } E.setParty(s, p); UI.prepModal(); };
  UI.act.prepBuff = (el) => { UI.prep.buffs[el.dataset.id] = !UI.prep.buffs[el.dataset.id]; UI.prepModal(); };
  UI.act.dunGo = async () => {
    const s = UI.slot(), P = UI.prep; if (s.run) { UI.closeModal(); return; }
    Object.keys(P.buffs).filter((k) => P.buffs[k]).forEach((k) => E.useConsOutside(s, k));
    const r = E.startRun(s, P.did, P.tier); if (r) { UI.toast(r, 'bad'); return; }
    UI.closeModal(); UI.save(true); UI.sfx('boom');
    if (!UI.p.seenIntro[P.did] && D.INTROS && D.INTROS[P.did]) { UI.p.seenIntro[P.did] = 1; UI.save(true); await UI.playLines(D.INTROS[P.did], { bg: bgForDun(P.did), replay: true, noTitle: true }); }
    UI.render();
  };
  const bgForDun = (did) => ({ mill: 'ruins', wood: 'forest', mines: 'mines', swamp: 'swamp', spire: 'spire', cathedral: 'cathedral' }[did] || 'ruins');

  // ───── Вылазка ─────
  const nodeIc = (n) => (n.t === 'ev' ? evIcon(n.ev) : n.t === 'boss' ? '👹' : n.t === 'mini' ? '💀' : n.elite ? '⚔️' : '🗡️');
  function runView(s) {
    const run = s.run, d = D.DUN[run.did], T = D.TIERS[run.tier], dd = E.derive(s), node = run.nodes[run.node], fl = node ? node.f : d.floors - 1;
    const track = run.nodes.map((n, i) => `<span class="nd ${i < run.node ? 'past' : i === run.node ? 'cur' : ''} ${n.t === 'boss' ? 'bossn' : ''}">${i < run.node ? '✔' : nodeIc(n)}</span>`).join('');
    const party = [`<div class="pm">${UI.por(s.hero.portrait, 'xs', false)}<div class="grow"><b>${esc(s.hero.name)}</b>${bar(run.hp, dd.maxHp, 'hp')}${bar(run.mp, dd.maxMp, 'mp')}<small>${fmt(run.hp)}/${fmt(dd.maxHp)} · ${fmt(run.mp)}/${fmt(dd.maxMp)}</small></div></div>`]
      .concat(s.party.map((id) => `<div class="pm">${UI.por(D.CREW[id].art, 'xs', false)}<div class="grow"><b>${D.CREW[id].n}</b>${bar((run.comp[id] == null ? 1 : run.comp[id]), 1, 'hp')}</div></div>`)).join('');
    const b = run.bag, mats = Object.keys(b.mats).map((k) => `${D.MATS[k].ic}${b.mats[k]}`).join(' ');
    let label = 'Дальше'; if (node) label = node.t === 'boss' ? '👹 Сразиться с боссом' : node.t === 'mini' ? '💀 К мини-боссу' : node.t === 'ev' ? 'Исследовать ' + evIcon(node.ev) : node.elite ? '⚔️ Закалённый отряд' : '🗡️ В бой';
    return `<div class="runhead" style="--dc:${d.col}"><span class="big-ic">${d.ic}</span><div class="grow tl"><h3 class="m0">${d.n}</h3><div class="dim small">${T.ic} ${T.n} · этаж ${fl + 1}/${d.floors}</div></div></div>
      <div class="track">${track}</div>
      <div class="card">${party}</div>
      <div class="card small"><b>Добыча вылазки</b><div class="dim">🪙 ${fmt(b.gold)} · ✨ ${fmt(b.xp)} опыта · ${b.items.length} предм.${mats ? ' · ' + mats : ''}</div>${b.items.length ? `<div class="loots">${b.items.slice(-6).map(rarSpan).join('<br>')}</div>` : ''}</div>
      <button class="btn primary big wide" data-act="runNext" id="btnRunNext">${label}</button>
      <div class="row gap"><button class="btn ghost grow" data-act="runPotion">🧪 Зелья</button><button class="btn ghost grow danger" data-act="runLeave">🏃 Уйти (добыча цела)</button></div>`;
  }
  UI.act.runPotion = () => {
    const s = UI.slot(); const ids = Object.keys(s.cons).filter((k) => s.cons[k] > 0 && D.CONS[k] && (D.CONS[k].heal || D.CONS[k].mp) && !D.CONS[k].dmg);
    UI.modal(`<h3>🧪 Зелья</h3><div class="mlist">${ids.map((k) => `<div class="item"><span class="ico">${D.CONS[k].ic}</span><span class="grow tl"><b>${D.CONS[k].n}</b> ×${s.cons[k]}<small>${D.CONS[k].d}</small></span><button class="btn small primary" data-act="drink" data-id="${k}" data-quiet="1">Выпить</button></div>`).join('') || '<div class="dim center pad">Зелий нет. Купите в лавке или сварите.</div>'}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`);
  };
  UI.act.drink = (el) => { const r = E.useConsOutside(UI.slot(), el.dataset.id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('heal'); UI.save(true); UI.runPotion ? UI.act.runPotion() : 0; UI.refresh(); };
  UI.act.runLeave = () => UI.confirm('Покинуть вылазку?', 'Вы вернётесь в город с накопленной добычей. Прогресс по подземелью сбросится.', 'Уйти', () => finishRun('flee'));
  UI.act.runNext = async () => {
    const s = UI.slot(), run = s.run; if (!run || UI.busy) return; const node = run.nodes[run.node]; if (!node) { finishRun('win'); return; }
    UI.busy = true;
    try {
      if (node.t === 'ev') { await doEvent(node); }
      else {
        const pre = D.PRE_BOSS[run.did]; if (node.t === 'boss' && pre && !s.story.done.includes(pre)) { await UI.playScene(pre); UI.save(true); }
        const rep = await UI.battle();
        UI.save(true);
        if (rep.result === 'win' && node.e && node.e.length === 1 && D.ENEMIES[node.e[0]].duel) { const ds = D.DUEL_SCENE[node.e[0]]; if (ds) { await UI.playScene(ds, !!s.story.done.includes(ds)); UI.save(true); } }
        if (rep.result === 'win' && rep.bossDown) { await finishRun('win'); }
        else if (rep.result === 'lose') { await finishRun('lose'); }
        else if (rep.result === 'flee') { await finishRun('flee'); }
      }
    } finally { UI.busy = false; }
    UI.refresh(false);
  };
  async function doEvent(node) {
    const s = UI.slot();
    if (node.ev === 'shrine') {
      const c = await new Promise((res) => { UI.shrineRes = res; UI.modal(`<div class="big-ic xl center shrine-ic">⛩️</div><h3 class="center">Алтарь Лиры</h3><div class="mtext tl shrine-t">Среди камней мерцает осколок песни Лирии. Он откликнется на просьбу: выберите, что попросить — дар или плата зависят только от вас.</div><div class="shrine-opts"><button class="btn primary wide" data-act="shrineP" data-c="bless"><b>✨ Благословение</b><small>+8% урона и брони до конца вылазки</small></button><button class="btn primary wide" data-act="shrineP" data-c="heal"><b>💚 Исцеление</b><small>+60% здоровья и немного энергии</small></button><button class="btn ghost wide" data-act="shrineP" data-c="blood"><b>🩸 Дар крови</b><small>−15% здоровья, взамен золото</small></button></div>`, { lock: true }); });
      UI.closeModal(); const r = C.resolveEvent(s, c); UI.save(true); await evResult(r); return;
    }
    const r = C.resolveEvent(s); UI.save(true); await evResult(r);
  }
  UI.act.shrineP = (el) => { if (UI.shrineRes) { const f = UI.shrineRes; UI.shrineRes = null; f(el.dataset.c); } };
  function evResult(r) {
    return new Promise((res) => {
      const mats = Object.keys(r.mats || {}).map((k) => `${D.MATS[k].ic} ${D.MATS[k].n} ×${r.mats[k]}`).join('<br>');
      UI.sfx(r.ev === 'chest' ? 'loot' : r.ev === 'rest' ? 'heal' : 'ok');
      UI.modal(`<div class="big-ic xl center">${evIcon(r.ev)}</div><h3>${r.ev === 'chest' ? 'Сундук' : r.ev === 'rest' ? 'Привал' : r.ev === 'shrine' ? 'Алтарь Лиры' : 'Находка'}</h3><div class="mtext tl">${esc(r.text)}</div>${r.gold ? `<div>🪙 +${fmt(r.gold)}</div>` : ''}${mats ? `<div class="small">${mats}</div>` : ''}${(r.items || []).map((it) => `<div>${rarSpan(it)}</div>`).join('')}${r.lvUp ? '<div class="ok">🌟 Профессия повысила уровень!</div>' : ''}<button class="btn primary wide" id="evOk" data-act="evOk">Продолжить</button>`, { lock: true });
      UI.evDone = () => { UI.closeModal(); res(); };
    });
  }
  UI.act.evOk = () => { if (UI.evDone) { const f = UI.evDone; UI.evDone = null; f(); } };

  async function finishRun(outcome) {
    const s = UI.slot(), run = s.run; if (!run) return; const d = D.DUN[run.did], first = outcome === 'win' && !s.prog.cleared[run.did];
    const xp = run.bag.xp, res = E.claimRun(s, outcome); s.crewTalk = Math.min(6, (s.crewTalk || 0) + (outcome === 'win' ? 2 : 1)); UI.save(true);
    await new Promise((resolve) => {
      UI.sfx(outcome === 'win' ? 'win' : outcome === 'lose' ? 'lose' : 'ok');
      const mats = Object.keys(res.mats).map((k) => `${D.MATS[k].ic} ${D.MATS[k].n} ×${res.mats[k]}`).join('<br>');
      UI.modal(`<div class="big-ic xl center">${outcome === 'win' ? '🏆' : outcome === 'lose' ? '💀' : '🏃'}</div><h3 class="center">${outcome === 'win' ? 'Подземелье пройдено!' : outcome === 'lose' ? 'Отряд повержен' : 'Вы покинули вылазку'}</h3>
        <div class="mtext small tl dim">${outcome === 'lose' ? 'Вы очнулись у ворот города. Половина добычи потеряна.' : outcome === 'win' ? `«${d.n}» (${D.TIERS[run.tier].n}) покорено. ${first ? 'Первая победа: +1 искра Нимба! Свободных вечеров для Свиты: +2.' : ''}` : 'Добыча вылазки сохранена.'}</div>
        <div class="card"><div>🪙 ${fmt(res.gold)} · ✨ ${fmt(xp)} опыта получено в боях</div>${mats ? `<div class="small">${mats}</div>` : ''}${res.items.map((it) => `<div>${rarSpan(it)}</div>`).join('') || '<div class="dim small">Предметов нет</div>'}</div>
        <button class="btn primary wide" id="runDone" data-act="runDone">В город</button>`, { lock: true });
      UI.runDone = resolve;
    });
    UI.closeModal(); UI.tab = 'city'; UI.render(); await UI.autoStory(); UI.render();
  }
  UI.act.runDone = () => { if (UI.runDone) { const f = UI.runDone; UI.runDone = null; f(); } };

  // ═════ БОЙ ═════
  const stIcons = (u) => u.st.map((s) => `<i class="si ${D.ST[s.id].k}" title="${D.ST[s.id].n}">${D.ST[s.id].ic}${s.id === 'mantra' ? '<b>×' + Math.pow(2, s.pow) + '</b>' : s.dur > 1 && s.dur < 90 ? '<b>' + s.dur + '</b>' : ''}</i>`).join('');
  UI.battle = async function () {
    const slot = UI.slot(), st = UI.p.settings;
    const B = C.startNodeBattle(slot, { auto: !!st.auto, cmd: !!slot.cmd }); UI.B = B; B.sel = null; B.speed = st.battleSpeed || 1;
    const run = slot.run, dng = D.DUN[run.did], node = B.node, layer = $('#layer');
    layer.innerHTML = `<div id="battle" class="battle bio-${dng.bio}"><div class="bsky"></div><div class="bt-top"><div class="bt-title">${dng.ic} ${node.t === 'boss' ? 'БОСС' : node.t === 'mini' ? 'Мини-босс' : node.elite ? 'Элита' : 'Бой'}</div><div class="turnstrip" id="turns"></div><button class="mini" data-act="bCmd" id="bCmd" data-quiet="1" title="Командовать Свитой">👥</button><button class="mini" data-act="bAuto" id="bAuto" data-quiet="1">🤖</button><button class="mini" data-act="bSpeed" id="bSpeed" data-quiet="1">×${B.speed}</button></div>
      <div class="foes" id="foes"></div><div class="bt-log" id="blog"></div><div class="party" id="party"></div><div class="bt-act" id="bact"></div><div class="bubble" id="bubble"></div></div>`;
    layer.classList.add('on'); UI.sfx('boom'); try { F.setMode('none'); } catch (e) { /* ignore */ }
    $('#bAuto').classList.toggle('on', !!B.opts.auto); $('#bCmd').classList.toggle('on', !!B.opts.cmd);
    renderUnits(B, true);
    const boss = B.foes.find((f) => f.role === 'boss' || f.role === 'mini');
    if (boss && D.ENEMIES[boss.eid] && D.ENEMIES[boss.eid].lines) { await bubble(boss, D.ENEMIES[boss.eid].lines[0], B); }
    if (!slot.tut.bt && st.tutorial) { slot.tut.bt = 1; toastHint('Коснитесь врага, чтобы выбрать цель. Над врагами — их намерения.'); }
    let li = 0, guard = 4000;
    while (!B.over && guard--) {
      const u = C.next(B);
      await animate(B); li = showLog(B, li); renderUnits(B);
      if (B.over) break;
      if (u) {
        if (!B.sel || !B.foes.find((f) => f.id === B.sel && f.alive)) B.sel = (B.foes.find((f) => f.alive) || {}).id;
        renderUnits(B);
        const act = await playerAction(B, u);
        const ok = C.act(B, u, act); if (ok === false) { /* неверное действие */ }
        await animate(B); li = showLog(B, li); renderUnits(B);
      } else await UI.wait(60 / B.speed);
    }
    if (!B.over) B.over = 'lose';
    await UI.wait(500 / B.speed);
    const rep = C.finishBattle(slot, B); UI.save(true);
    await battleSummary(B, rep);
    layer.classList.remove('on'); layer.innerHTML = ''; UI.B = null;
    if (UI.v === 'game') try { F.setMode(UI.p.settings.particles ? 'embers' : 'none'); } catch (e) { /* ignore */ }
    return rep;
  };
  const toastHint = (m) => { const b = $('#bubble'); if (b) { b.innerHTML = `<div class="hintb">${m}</div>`; b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 3600); } };
  async function bubble(u, text, B) { const b = $('#bubble'); if (!b) return; b.innerHTML = `<div class="bub"><b>${esc(u.name)}</b>${esc(text)}</div>`; b.classList.add('on'); await UI.wait(1700 / (B ? B.speed : 1)); b.classList.remove('on'); }
  function showLog(B, i) { const l = $('#blog'); if (l && B.log.length > i) { l.textContent = B.log[B.log.length - 1].toString().replace(/<[^>]+>/g, ''); l.classList.remove('pop'); void l.offsetWidth; l.classList.add('pop'); } return B.log.length; }

  function foeCard(B, u) {
    const sk = u.intent && (D.ESK[u.intent.id]); const ch = !!u.charging;
    const weak = (u.weak || []).map((e) => D.ELEMS[e].ic).join('');
    return `<div class="unit foe ${u.role === 'boss' ? 'boss' : ''} ${u.role === 'mini' ? 'mini' : ''} ${u.alive ? '' : 'dead'} ${B.sel === u.id ? 'sel' : ''} ${B.cur === u ? 'active' : ''} ${ch ? 'charging' : ''}" id="u_${u.id}" data-act="bSel" data-id="${u.id}" data-quiet="1">
      <div class="intent">${u.alive && sk ? (ch ? '⚠️' : '') + sk.ic : ''}</div><div class="spr">${u.ic}</div><div class="nm">${esc(u.name)} <small>${u.lv}</small></div>${bar(u.hp, u.maxHp, 'hp')}<div class="sts">${stIcons(u)}</div><div class="wk">${weak ? 'слаб. ' + weak : ''}</div></div>`;
  }
  function partyCard(B, u) {
    const c = u.hero ? D.CLASSES[u.cls] : null;
    return `<div class="unit ally ${u.alive ? '' : 'dead'} ${B.cur === u ? 'active' : ''}" id="u_${u.id}">${UI.por(u.portrait || (u.hero ? UI.slot().hero.portrait : ''), 'xs', false)}<div class="nm">${esc(u.name)}</div>${bar(u.hp, u.maxHp, 'hp')}${bar(u.mp, u.maxMp, 'mp')}${u.rcMax > 0 && u.hero ? bar(u.rc, u.rcMax, 'rc rc-' + u.cls) : ''}<div class="hpn">${fmt(u.hp)}/${fmt(u.maxHp)}</div><div class="sts">${stIcons(u)}</div></div>`;
  }
  // переносим класс со свежей карточки, но не стираем «кратковременные» классы анимаций (hit/acting): раньше renderUnits после каждого события обрывал их в тот же кадр
  function syncCls(old, nw) { const keep = ['hit', 'acting'].filter((c) => old.classList.contains(c)); old.className = nw.className; keep.forEach((c) => old.classList.add(c)); }
  function renderUnits(B, full) {
    const foes = $('#foes'), party = $('#party'); if (!foes) return;
    if (full || foes.children.length !== B.foes.length) foes.innerHTML = B.foes.map((u) => foeCard(B, u)).join(''); else B.foes.forEach((u) => { const old = $('#u_' + u.id); if (old) { const t = document.createElement('div'); t.innerHTML = foeCard(B, u); const nw = t.firstElementChild; // обновляем, сохраняя CSS-переходы полос
      syncCls(old, nw); $$('.bar i', old).forEach((i, k) => { i.style.width = $$('.bar i', nw)[k].style.width; }); const a = $('.sts', old); if (a) a.innerHTML = $('.sts', nw).innerHTML; const it = $('.intent', old); if (it) it.innerHTML = $('.intent', nw).innerHTML; } });
    if (full || party.children.length !== B.party.length) party.innerHTML = B.party.map((u) => partyCard(B, u)).join(''); else B.party.forEach((u) => { const old = $('#u_' + u.id); if (old) { const t = document.createElement('div'); t.innerHTML = partyCard(B, u); const nw = t.firstElementChild; syncCls(old, nw); $$('.bar i', old).forEach((i, k) => { i.style.width = $$('.bar i', nw)[k].style.width; }); const a = $('.sts', old); if (a) a.innerHTML = $('.sts', nw).innerHTML; const hn = $('.hpn', old); if (hn) hn.textContent = $('.hpn', nw).textContent; } });
    renderTurns(B);
  }
  function renderTurns(B) {
    const el = $('#turns'); if (!el) return;
    const us = B.units.filter((u) => u.alive).map((u) => ({ u, g: u.gauge })), out = [];
    if (B.cur && B.cur.alive) out.push(B.cur);
    for (let i = 0; i < 7; i++) { let best = null, bt = 1e9; us.forEach((x) => { const t = (100 - x.g) / C.spdOf(x.u); if (t < bt) { bt = t; best = x; } }); if (!best) break; us.forEach((x) => { x.g += Math.max(0, bt) * C.spdOf(x.u); }); best.g -= 100; out.push(best.u); }
    el.innerHTML = out.slice(0, 7).map((u, i) => `<i class="tn ${u.side} ${i === 0 ? 'now' : ''}" title="${esc(u.name)}">${u.hero ? '👑' : u.ic}</i>`).join('');
  }
  UI.act.bSel = (el) => { const B = UI.B; if (!B) return; const u = B.foes.find((f) => f.id === el.dataset.id); if (!u || !u.alive) return; B.sel = u.id; $$('.foe').forEach((c) => c.classList.toggle('sel', c.id === 'u_' + u.id)); UI.sfx('tab'); };
  UI.act.bAuto = () => { const B = UI.B; if (!B) return; B.opts.auto = !B.opts.auto; $('#bAuto').classList.toggle('on', B.opts.auto); UI.p.settings.auto = B.opts.auto; if (B.opts.auto && B.pending) { const p = B.pending; B.pending = null; p.res(C.choose(B, p.u)); } };
  UI.act.bCmd = () => { const B = UI.B; if (!B) return; B.opts.cmd = !B.opts.cmd; UI.slot().cmd = B.opts.cmd; $('#bCmd').classList.toggle('on', B.opts.cmd); UI.toast(B.opts.cmd ? 'Вы командуете Свитой сами' : 'Свита действует сама', 'ok'); };
  UI.act.bSpeed = () => { const B = UI.B; if (!B) return; B.speed = B.speed === 1 ? 2 : 1; UI.p.settings.battleSpeed = B.speed; $('#bSpeed').textContent = '×' + B.speed; };

  // ───── панель действий игрока ─────
  function playerAction(B, u) {
    return new Promise((res) => {
      B.pending = { u, res: (a) => { B.pending = null; $('#bact').innerHTML = '<div class="dim center small">…</div>'; res(a); } };
      const slot = UI.slot(), skills = u.sk.filter((id) => C.skillOf(u, id));
      const basic = D.BASIC[u.cls] || D.BASIC.warrior;
      const sk = skills.map((id) => {
        const k = C.skillOf(u, id), why = C.canUse(B, u, id), cost = (k.mp ? `💧${k.mp}` : '') + (k.rc ? ` ${D.CLASSES[u.cls].rc.n}${k.rc}` : '') + (k.rcAll ? ' всё' : '');
        return `<button class="sk ${why ? 'off' : ''} ${id.startsWith('u_') ? 'echo' : id.startsWith('c_') ? 'echo conc' : k.gear ? 'cxs' : ''}" data-act="bSkill" data-id="${id}" data-quiet="1" ${why ? 'data-why="' + why + '"' : ''}><span>${k.img ? `<img class="uqi" src="${k.img}" alt="">` : k.ic}</span><b>${esc(k.n)}</b><small>${why ? why : cost || '—'}</small></button>`;
      }).join('');
      const rc = u.rcMax > 0 ? `<div class="rcl">${D.CLASSES[u.cls].rc.n}: <b>${Math.round(u.rc)}/${u.rcMax}</b></div>` : '';
      $('#bact').innerHTML = `<div class="actrow"><div class="turnof">Ход: <b>${esc(u.name)}</b></div>${rc}</div><div class="mainbtns"><button class="abtn" data-act="bBasic" data-quiet="1"><span>${basic.ic}</span>${basic.n}</button><button class="abtn" data-act="bGuard" data-quiet="1"><span>🛡️</span>Защита</button><button class="abtn" data-act="bItems" data-quiet="1"><span>🧪</span>Предметы</button><button class="abtn" data-act="bFlee" data-quiet="1" ${B.opts.noFlee ? 'disabled' : ''}><span>🏃</span>Бегство</button></div><div class="skgrid">${sk}</div>`;
    });
  }
  const sendAct = (a) => { const B = UI.B; if (B && B.pending) { A.resume(); B.pending.res(a); } };
  UI.act.bBasic = () => sendAct({ t: 'basic', tid: UI.B.sel });
  UI.act.bGuard = () => sendAct({ t: 'guard' });
  UI.act.bFlee = () => UI.confirm('Бежать?', 'Шанс побега — 60%. Побег завершает вылазку (добыча сохраняется).', 'Бежать', () => sendAct({ t: 'flee' }), true);
  UI.act.bSkill = (el) => {
    const B = UI.B; if (!B || !B.pending) return; const u = B.pending.u, id = el.dataset.id, k = C.skillOf(u, id);
    if (el.dataset.why) { UI.toast(el.dataset.why, 'bad'); UI.sfx('err'); return; }
    if (k.tgt === 'ally' || k.tgt === 'dead') { allyPick(B, k.tgt === 'dead', (tid) => sendAct({ t: 'skill', id, tid })); return; }
    sendAct({ t: 'skill', id, tid: B.sel });
  };
  function allyPick(B, dead, cb) {
    const list = B.party.filter((x) => x.alive !== dead);
    UI.modal(`<h3>${dead ? 'Кого вернуть?' : 'Кому?'}</h3><div class="mlist">${list.map((x) => `<button class="item" data-act="allyChosen" data-id="${x.id}" data-quiet="1"><span class="grow tl"><b>${esc(x.name)}</b><small>${fmt(x.hp)}/${fmt(x.maxHp)} здоровья</small></span></button>`).join('')}</div><button class="btn ghost wide" data-act="closeModal">Отмена</button>`);
    UI.allyCb = cb;
  }
  UI.act.allyChosen = (el) => { const f = UI.allyCb; UI.allyCb = null; UI.closeModal(); if (f) f(el.dataset.id); };
  UI.act.bItems = () => {
    const B = UI.B; if (!B || !B.pending) return; const ids = Object.keys(B.cons).filter((k) => B.cons[k] > 0 && D.CONS[k] && !D.CONS[k].buff);
    UI.modal(`<h3>🧪 Предметы</h3><div class="mlist">${ids.map((k) => `<button class="item" data-act="bUseItem" data-id="${k}" data-quiet="1"><span class="ico">${D.CONS[k].ic}</span><span class="grow tl"><b>${D.CONS[k].n}</b> ×${B.cons[k]}<small>${D.CONS[k].d}</small></span></button>`).join('') || '<div class="dim center pad">Расходников нет</div>'}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`);
  };
  UI.act.bUseItem = (el) => {
    const B = UI.B, id = el.dataset.id, c = D.CONS[id]; if (!B || !B.pending) return;
    if (c.heal || c.mp || c.cleanse) { UI.closeModal(); allyPick(B, false, (tid) => sendAct({ t: 'item', id, tid })); return; }
    UI.closeModal(); sendAct({ t: 'item', id, tid: B.sel });
  };

  // ───── анимации событий ─────
  const unitEl = (id) => $('#u_' + id);
  function floatTxt(id, txt, cls) {
    const el = unitEl(id); if (!el) return; const f = document.createElement('div'); f.className = 'flt ' + (cls || ''); f.innerHTML = txt; el.appendChild(f); setTimeout(() => f.remove(), 1100);
  }
  function burst(id, col, n) { const el = unitEl(id); if (!el || !UI.p.settings.particles) return; const r = el.getBoundingClientRect(); try { F.burst(r.left + r.width / 2, r.top + r.height / 2, col, n || 14); } catch (e) { /* ignore */ } }
  async function animate(B) {
    const evs = B.ev.splice(0); const sp = B.speed; const d = (ms) => UI.wait(ms / sp);
    for (const e of evs) {
      switch (e.t) {
        case 'skill': { const el = unitEl(e.u); if (el) { el.classList.add('acting'); setTimeout(() => el.classList.remove('acting'), 500 / sp); } floatTxt(e.u, `${e.ic || ''} ${esc(e.n)}`, 'skn'); UI.sfx(/ур|огн|лед|мол|луч|шар|взрыв|эфир/i.test(e.n || '') ? 'magic' : 'click'); await d(300); break; }
        case 'dmg': { const el = unitEl(e.u); const col = (D.ELEMS[e.el] || D.ELEMS.phys).c; floatTxt(e.u, (e.crit ? '💥 ' : '') + '−' + fmt(e.v), 'dmg' + (e.crit ? ' crit' : '')); if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); } burst(e.u, col, e.crit ? 22 : 12); UI.sfx(e.crit ? 'crit' : 'hit'); if (e.crit && UI.p.settings.shake) shake(); await d(220); break; }
        case 'heal': floatTxt(e.u, '+' + fmt(e.v), 'heal'); burst(e.u, '#7dffa0', 10); UI.sfx('heal'); await d(200); break;
        case 'miss': floatTxt(e.u, 'Мимо', 'txt'); UI.sfx('miss'); await d(150); break;
        case 'txt': floatTxt(e.u, esc(e.s), 'txt'); await d(160); break;
        case 'abs': floatTxt(e.u, 'щит −' + e.v, 'txt'); break;
        case 'dot': { floatTxt(e.u, '−' + fmt(e.v), 'dmg dot'); await d(120); break; }
        case 'death': { const el = unitEl(e.u); if (el) el.classList.add('dead'); UI.sfx('die'); burst(e.u, '#ffffff', 18); await d(380); break; }
        case 'charge': { floatTxt(e.u, '⚠️ копит силу!', 'warn'); UI.sfx('buff'); await d(350); break; }
        case 'phase': { const u = B.units.find((x) => x.id === e.u); floatTxt(e.u, '🔥 ЯРОСТЬ!', 'warn'); UI.sfx('boom'); if (UI.p.settings.shake) shake(); if (u && D.ENEMIES[u.eid] && D.ENEMIES[u.eid].lines && D.ENEMIES[u.eid].lines[1]) await bubble(u, D.ENEMIES[u.eid].lines[1], B); else await d(400); break; }
        case 'summon': renderUnits(B, true); UI.sfx('magic'); await d(300); break;
        case 'revive': floatTxt(e.u, '✨ Возрождён!', 'heal'); burst(e.u, '#fff2a8', 24); UI.sfx('level'); await d(350); break;
        case 'skip': floatTxt(e.u, 'Пропуск хода', 'txt'); await d(250); break;
        case 'st': if (e.on) UI.sfx('buff'); break;
        default: break;
      }
      renderUnits(B);
    }
  }
  function shake() { const b = $('#battle'); if (!b) return; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }

  function battleSummary(B, rep) {
    return new Promise((res) => {
      const s = UI.slot();
      let body;
      if (rep.result === 'win') {
        UI.sfx(rep.lvUp ? 'level' : 'win'); const mats = Object.keys(rep.mats).map((k) => `${D.MATS[k].ic}${rep.mats[k]}`).join(' ');
        body = `<div class="big-ic xl center">${rep.bossDown ? '👑' : '⚔️'}</div><h3 class="center">${rep.bossDown ? 'Босс повержен!' : 'Победа!'}</h3><div class="card"><div>✨ +${fmt(rep.xp)} опыта · 🪙 +${fmt(rep.gold)}</div>${mats ? `<div class="small">${mats}</div>` : ''}${rep.items.map((it) => `<div>${rarSpan(it)}</div>`).join('')}</div>${rep.lvUp ? `<div class="lvup">🌟 Новый уровень: <b>${s.hero.level}</b>! Очко навыков получено${s.hero.level % 3 === 0 ? ' + искра Эха' : ''}.</div>` : ''}${rep.firstClear ? '<div class="lvup">🔥 Первая победа над боссом — искра Эха!</div>' : ''}`;
      } else if (rep.result === 'lose') { UI.sfx('lose'); body = `<div class="big-ic xl center">💀</div><h3 class="center">Поражение</h3><div class="mtext tl dim center">Отряд пал. Тьма отступает не сразу — но Лира ещё поёт.</div>`; }
      else body = `<div class="big-ic xl center">🏃</div><h3 class="center">Отступление</h3>`;
      UI.modal(body + `<button class="btn primary wide" id="btnBtDone" data-act="btDone">Продолжить</button>`, { lock: true, cls: 'btsum' });
      UI.btDone = res;
    });
  }
  UI.act.btDone = () => { UI.closeModal(); if (UI.btDone) { const f = UI.btDone; UI.btDone = null; f(); } };

})();
