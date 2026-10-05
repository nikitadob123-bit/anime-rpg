/* UI сюжета на 300 глав: загрузка арок, вкладка «Сюжет» (арки → главы), автопроигрывание сцен главы, стили новых фонов.
   Подключается после ui-play.js. Файлы ui-game.js / ui-vn.js не правятся: нужные функции переопределяются здесь. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI, ST = RPG.story;
  const { $, esc } = UI;

  // ───── Фоны новых глав: градиенты и цвет обводки спрайтов ─────
  (function injectBg() {
    const css = [];
    const artBg = { kings_hall: 'vn_ruins.webp', court: 'vn_ruins.webp', god_hall: 'vn_cathedral.webp', gallery: 'vn_cathedral_night.webp', cradle: 'vn_cathedral.webp', belltower: 'vn_ruins.webp', cult: 'vn_cathedral_night.webp' };
    Object.keys(ST.BG).forEach((id) => {
      const b = ST.BG[id]; if (b.native || !b.c) return;
      const art = artBg[id];
      css.push(art
        ? `.bg-${id}{background:linear-gradient(180deg,rgba(8,4,16,.2),rgba(6,3,12,.4)),url(assets/ui/${art}) 50% 40%/cover no-repeat,linear-gradient(180deg,${b.c[0]} 0%,${b.c[1]} 55%,${b.c[2]} 100%)}`
        : `.bg-${id}{background:linear-gradient(180deg,${b.c[0]} 0%,${b.c[1]} 55%,${b.c[2]} 100%)}`);
    });
    css.push(`.arcrow{display:flex;align-items:center;gap:9px;text-align:left;width:100%}.arcrow .an{width:30px;height:30px;border-radius:50%;background:rgba(242,195,92,.16);color:var(--gold2);display:grid;place-items:center;font-weight:700;flex:none;font-size:13px}`,
      `.arcrow.done .an{background:rgba(110,224,138,.2);color:var(--ok)}.arcrow.cur .an{background:rgba(242,195,92,.35)}.arcbox.cur{box-shadow:0 0 0 1px rgba(242,195,92,.55)}`,
      `.chrow{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line)}.chrow .cn{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.07);display:grid;place-items:center;font-size:12px;flex:none}`,
      `.chrow.done .cn{background:rgba(110,224,138,.2);color:var(--ok)}.chrow.cur .cn{background:rgba(242,195,92,.35);color:var(--gold2)}.chrow.lockd{opacity:.55}.chrow small{display:block}`);
    const st = document.createElement('style'); st.id = 'story-css'; st.textContent = css.join('\n'); document.head.appendChild(st);
    const rim = UI.vnRim; UI.vnRim = (bg) => (ST.BG[bg] && ST.BG[bg].rim) || rim(bg);
  })();

  // ───── Загрузка арок ─────
  const ensure = async () => { const s = UI.slot(); if (s) { try { await ST.ensureFor(s); } catch (e) { /* офлайн: остаёмся на загруженном */ } } };
  const enter = UI.enterGame; UI.enterGame = async function (isNew) { await ensure(); return enter.call(UI, isNew); };

  // ───── Автопроигрывание: сцены одной главы идут подряд, бой/вылазка останавливает ─────
  let lastCh = 0;
  const play = UI.playScene;
  UI.playScene = function (id, replay) { if (!replay) lastCh = ST.chapterOf(id); return play.call(UI, id, replay); };
  UI.autoStory = async function () {
    await ensure();
    const s = UI.slot(); let guard = 8;
    while (guard--) {
      const n = E.nextScene(s); if (!n || UI.isPre(n.id)) break;
      const same = lastCh && ST.chapterOf(n.id) === lastCh;
      if (!(n.need && n.need.clear) && n.id !== 'ch1_a' && !same) break;
      await UI.playScene(n.id); UI.save(true);
    }
    lastCh = 0;
    if (UI.v === 'game') UI.render();
  };
  UI.act.playNext = async function () { const s = UI.slot(); await ensure(); const ns = UI.nextStory(s); if (!ns || !ns.ok) return; await UI.playScene(ns.st.id); UI.save(true); await UI.autoStory(); UI.refresh(false); };

  // Карточка на главной: «Продолжение следует», когда следующая глава ещё не написана
  const city = UI.tabs.city;
  UI.tabs.city = function (s) {
    let h = city(s);
    if (!UI.nextStory(s)) {
      const n = ST.current(s);
      const card = n ? `<div class="card story done"><div class="small gold">Глава ${n}</div><b>${esc(ST.titleOf(n) || 'Продолжение следует')}</b><div class="small dim">Эта глава ещё пишется. Загляните во вкладку «Сюжет»: там видно, сколько глав уже готово.</div><button class="btn ghost wide" data-act="tab" data-t="story">📖 К сюжету</button></div>` : `<div class="card story done"><b>История окончена</b><div class="small dim">Вы прошли все главы «Нимба Мира».</div></div>`;
      h = h.replace(/<div class="card story done">[\s\S]*?<\/div><\/div>/, card);
    }
    return h;
  };

  // ───── Вкладка «Сюжет» ─────
  const OUT = () => D.OUTLINE;
  const arcInfo = (k) => (OUT() && OUT().arcs[k - 1]) || { n: k, title: 'Арка ' + k, part: '', ready: k === 1 ? 10 : 0 };
  const chInfo = (n) => (OUT() && OUT().chapters[n - 1]) || { n, title: ST.titleOf(n) || 'Глава ' + n, summary: '', level: ST.levelOf(n) };
  let outlineAsked = false;
  const sceneIdsReal = (n) => ST.sceneIds(n);
  const curArc = (s) => { const n = ST.current(s); return n ? ST.arcOf(n) : ST.ARCS; };
  const statusOf = (s, n, cur) => (ST.done(s, n) ? 'done' : n === cur ? (ST.has(n) ? 'cur' : 'soon') : (ST.has(n) ? 'lockd' : 'soon'));

  UI.tabs.story = function (s) {
    if (!OUT() && !outlineAsked) { outlineAsked = true; ST.loadOutline().then(() => { if (UI.v === 'game' && UI.tab === 'story') UI.refresh(); }).catch(() => {}); }
    const cur = ST.current(s), ca = curArc(s), open = +(UI.sub.arc || ca), done = ST.doneCount(s), hero = s.hero;
    let arcs = '';
    for (let k = 1; k <= ST.ARCS; k++) {
      const a = arcInfo(k), [from, to] = ST.arcRange(k); let dn = 0; for (let n = from; n <= to; n++) if (ST.done(s, n)) dn++;
      const written = (OUT() ? a.ready : (k === 1 ? 10 : 0)), isOpen = k === open, state = dn === 10 ? 'done' : k === ca ? 'cur' : '';
      const tag = dn === 10 ? '<span class="tag ok">пройдена</span>' : k === ca ? '<span class="tag new">сейчас</span>' : written ? '<span class="tag">' + dn + '/10</span>' : (k > ca ? '<span class="tag">🔒</span>' : '<span class="tag warn">скоро</span>');
      let body = '';
      if (isOpen) {
        body = `<div class="small dim tl" style="margin:6px 0">${esc(a.region || '')}${a.region ? ' · ' : ''}рек. ур. ${a.levels ? a.levels[0] + '–' + a.levels[1] : ''}</div>`;
        for (let n = from; n <= to; n++) {
          const st = statusOf(s, n, cur), c = chInfo(n), lv = ST.levelOf(n), warn = st === 'cur' && hero.level + 2 < lv;
          const t = st === 'done' ? '<span class="tag ok">пройдено</span>' : st === 'cur' ? '<span class="tag new">текущая</span>' : st === 'soon' ? '<span class="tag warn">скоро</span>' : '<span class="tag">закрыто</span>';
          const showTitle = st === 'done' || st === 'cur' || (ST.has(n) && n <= cur + 1) || !!ST.LEGACY[n];
          const title = showTitle ? esc(c.title) : '«…»';
          const sub = st === 'done' ? esc(c.summary || '') : st === 'cur' ? esc(c.summary || '') : st === 'soon' ? 'Глава ещё пишется.' : 'Откроется после предыдущей главы.';
          const lvTxt = `<small class="${warn ? 'gold' : 'dim'}">рек. ур. ${lv}${warn ? ' — вы слабее, будет тяжело' : ''}</small>`;
          const btn = st === 'done' ? `<button class="btn ghost small" data-act="replayCh" data-n="${n}">↺</button>` : st === 'cur' ? `<button class="btn primary small" data-act="storyGo">▶</button>` : '';
          body += `<div class="chrow ${st}" data-ch="${n}"><div class="cn">${n}</div><div class="grow tl"><b>${title}</b><small class="dim">${sub}</small>${lvTxt}</div><div class="col">${t}${btn}</div></div>`;
        }
      }
      arcs += `<div class="card arcbox ${state}"><button class="arcrow ${state}" data-act="sub" data-k="arc" data-v="${isOpen ? 0 : k}" data-quiet="1"><div class="an">${k}</div><div class="grow tl"><b>${esc(a.title)}</b><div class="small dim">${esc(a.part || '')}</div></div>${tag}</button>${body}</div>`;
    }
    const choices = [];
    D.STORY.forEach((st) => { if (!s.story.done.includes(st.id)) return; D.SCENES[st.id].lines.forEach((l) => { if (l[0] !== 'choice') return; const opt = l[1].find((o) => Object.keys(o.f || {}).length && Object.keys(o.f).every((k) => s.story.flags[k] === o.f[k])); if (opt) choices.push(`<li><b>${esc(D.SCENES[st.id].t)}:</b> ${esc(opt.t)}</li>`); }); });
    const head = `<h2>Сюжет</h2><div class="card"><div class="row gap center-v"><div class="grow tl"><b>Пройдено глав: ${done} из ${ST.TOTAL}</b><span class="bar"><i style="width:${done / ST.TOTAL * 100}%"></i></span><div class="small dim">${cur ? 'Сейчас: глава ' + cur + (ST.has(cur) ? ' «' + esc(ST.titleOf(cur)) + '»' : ' — ещё пишется') : 'История окончена'}</div></div>${cur ? '<button class="btn primary small" data-act="storyCur">К текущей</button>' : ''}</div></div>`;
    return head + arcs + `<div class="card"><b>Ваши решения</b><ul class="perks small">${choices.join('') || '<li class="dim">Пока ничего не решено</li>'}</ul></div>`;
  };
  UI.act.storyCur = function () { const s = UI.slot(), n = ST.current(s); UI.sub.arc = String(curArc(s)); UI.refresh(false); const el = n && document.querySelector('.chrow[data-ch="' + n + '"]'); if (el) el.scrollIntoView({ block: 'center' }); };
  UI.act.storyGo = async function () { UI.act.playNext(); };
  UI.act.replayCh = async function (el) {
    const n = +el.dataset.n, s = UI.slot(); const ids = ST.sceneIds(n).filter((id) => D.SCENES[id]);
    for (const id of ids) { if (!s.story.done.includes(id) && !ST.done(s, n)) break; await UI.playScene(id, true); }
    UI.refresh(false);
  };

  // Тихо подгружаем outline и следующую арку, когда игра уже идёт
  if (UI.slot && UI.slot()) ensure();
})();
