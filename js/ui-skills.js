/* UI: вкладка «Силы» — переключатель всех веток (сетка со значками и прогрессом), граф выбранной ветки с линиями-зависимостями,
   подсветка доступных узлов, раздел «Концепты» с карточками, «Преображения». Старые режимы «Отголосок»/«Приёмы» берутся из ui-crew.js. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, E = RPG.E, UI = RPG.UI;
  const { $, esc } = UI;
  const oldSkills = UI.tabs.skills;
  const NB = () => D.MAOU_BRANCHES.length;
  const nodeById = (id) => D.NODE_BY_ID[id];
  const icon = (n) => { if (n.e && n.e.unlock && D.SKILLS[n.e.unlock]) return D.SKILLS[n.e.unlock].ic; if (n.concept) return '✦'; const m = (n.e && n.e.m) || {}; if (m.dmgMul || m.dmg) return '⚔️'; if (m.lifesteal || m.devour) return '🩸'; if (m.hp || m.hpRegen) return '❤️'; if (m.taken || m.def) return '🛡️'; if (m.crit || m.critDmg) return '🎯'; if (m.cdr || m.castSpd || m.spd) return '⏱️'; if (m.mp || m.mpRegen || m.manaEff) return '💧'; if (m.crew || m.perCrew) return '👥'; if (n.e && n.e.st) return '💪'; return '•'; };
  UI.skillIcon = icon;
  // раскладка ветки: строки по ярусам, порядок в строке — по барицентру родителей; x в процентах
  const layoutCache = {};
  function layout(bi) {
    if (layoutCache[bi]) return layoutCache[bi];
    const nodes = D.TREES.maou.nodes.filter((n) => n.br === bi), tiers = Array.from(new Set(nodes.map((n) => n.t))).sort((a, b) => a - b), pos = {};
    tiers.forEach((t, ri) => {
      let row = nodes.filter((n) => n.t === t);
      row.forEach((n) => { const ps = n.req.map((q) => pos[q]).filter(Boolean); n._bx = ps.length ? ps.reduce((a, p) => a + p.x, 0) / ps.length : 50; });
      row.sort((a, b) => a._bx - b._bx || a.id.localeCompare(b.id, 'en', { numeric: true }));
      row.forEach((n, i) => { pos[n.id] = { x: (i + 0.5) / row.length * 100, ri }; });
    });
    nodes.forEach((n) => { delete n._bx; });
    return (layoutCache[bi] = { nodes, pos, rows: tiers.length, tiers });
  }
  UI.skillLayout = layout;
  const ROWH = 96, TOP = 34;
  function progress(h, bi) { const ns = D.TREES.maou.nodes.filter((n) => n.br === bi); let got = 0, ranks = 0, tot = 0; ns.forEach((n) => { tot += n.max; const r = h.spent[n.id] || 0; ranks += r; if (r) got++; }); return { got, n: ns.length, ranks, tot }; }
  UI.skillProgress = progress;
  function costTxt(sk) { const a = []; if (sk.mp) a.push(sk.mp + ' эн.'); if (sk.rc) a.push(sk.rc + ' Силы Короля'); if (sk.hpCost) a.push(Math.round(sk.hpCost * 100) + '% здоровья'); if (sk.cd === 99) a.push('раз за бой'); else if (sk.cd) a.push('перезарядка ' + sk.cd); return a.join(' · '); }
  function nodeState(h, n, fz) {
    const r = h.spent[n.id] || 0, why = E.canLearn(h, n.id), can = !why;
    return { r, can, fused: !!fz[n.id], max: r >= n.max, lock: !r && !can && (h.level < n.lv || n.req.some((q) => !(h.spent[q] > 0)) || (n.rr && Object.keys(n.rr).some((q) => (h.spent[q] || 0) < n.rr[q]))), why };
  }
  function graph(h, bi, sel) {
    const L = layout(bi), fz = E.fused(h), H = TOP + L.rows * ROWH, br = D.MAOU_BRANCHES[bi];
    const lines = L.nodes.map((n) => n.req.filter((q) => L.pos[q]).map((q) => {
      const a = L.pos[q], b = L.pos[n.id], pa = h.spent[q] > 0, pb = h.spent[n.id] > 0, cls = pa && pb ? 'on' : pa ? 'open' : '';
      const y1 = TOP + a.ri * ROWH + 28, y2 = TOP + b.ri * ROWH - 4;
      return `<path class="edge ${cls}" d="M${a.x.toFixed(2)} ${y1} C${a.x.toFixed(2)} ${(y1 + y2) / 2}, ${b.x.toFixed(2)} ${(y1 + y2) / 2}, ${b.x.toFixed(2)} ${y2}"/>`;
    }).join('')).join('');
    const tl = L.tiers.map((t, ri) => `<span class="gtl" style="top:${TOP + ri * ROWH - 22}px">ур. ${D.MAOU_TIER_LV[t]}</span>`).join('');
    const btn = L.nodes.map((n) => {
      const p = L.pos[n.id], s = nodeState(h, n, fz), cls = ['gn', s.r ? 'got' : '', s.max ? 'max' : '', s.can ? 'can' : '', s.lock ? 'lock' : '', n.id === sel ? 'sel' : '', n.concept ? 'concept' : '', n.fuse ? 'tf' : '', s.fused ? 'fused' : '', n.e && n.e.unlock && !n.concept ? 'act' : ''].filter(Boolean).join(' ');
      return `<button class="node ${cls}" style="left:${p.x.toFixed(2)}%;top:${TOP + p.ri * ROWH - 4}px;--bc:${br.c}" data-act="nodeSel" data-id="${n.id}" data-quiet="1"><span class="gi">${icon(n)}</span><em>${s.fused ? '⚗️' : s.r + '/' + n.max}</em><b>${esc(n.n)}</b></button>`;
    }).join('');
    return `<div class="tgraph" style="height:${H}px;--bc:${br.c}">${tl}<svg class="tsvg" viewBox="0 0 100 ${H}" preserveAspectRatio="none">${lines}</svg>${btn}</div>`;
  }
  function detail(h, n) {
    const fz = E.fused(h), s = nodeState(h, n, fz), sk = n.e && n.e.unlock && D.SKILLS[n.e.unlock];
    const reqs = n.req.map((q) => (h.spent[q] > 0 ? '✔ ' : '✖ ') + nodeById(q).n).concat(n.rr ? Object.keys(n.rr).map((q) => ((h.spent[q] || 0) >= n.rr[q] ? '✔ ' : '✖ ') + nodeById(q).n + ' ' + n.rr[q] + '/' + n.rr[q]) : []);
    const tf = n.fuse ? `<div class="pas tl small"><b>⚗️ Преображение:</b> ${n.fuse.map((q) => '«' + esc(nodeById(q).n) + '»').join(' и ')} превращается в «${esc(n.n)}» — старый узел перестаёт работать, но новый сильнее и меняет правила боя.</div>` : '';
    const fusedBy = fz[n.id] ? `<div class="pas tl small">Преображён в «${esc(nodeById(fz[n.id]).n)}» — эффект сейчас не действует.</div>` : '';
    const skh = sk ? `<div class="pas tl small"><b>${sk.ic} ${esc(sk.n)}</b> — ${esc(sk.d)} <span class="dim">(${costTxt(sk) || 'без цены'})</span></div>` : '';
    return `<div class="card ndet ${n.concept ? 'concept' : ''}"><div class="row gap center-v"><span class="big-ic">${icon(n)}</span><div class="grow tl"><b>${esc(n.n)}</b>${n.concept ? ' <span class="tag new">концепт</span>' : ''}<div class="dim small">Ранг ${s.r}/${n.max} · ур. ${n.lv}+</div></div><button class="xbtn" data-act="nodeClose" data-quiet="1">✕</button></div>
      <div class="small tl">${n.d ? esc(n.d) : D.nodeDesc(n.e, h)}${n.max > 1 && !n.d ? ' <span class="dim">(за ранг)</span>' : ''}</div>${n.d && n.e && n.e.m ? `<div class="small dim tl">${D.nodeDesc(n.e, h)}${n.max > 1 ? ' (за ранг)' : ''}</div>` : ''}${n.lore ? `<div class="small lore tl">«${esc(n.lore)}»</div>` : ''}${skh}${tf}${fusedBy}
      ${reqs.length ? `<div class="small dim tl reqs">${reqs.map((x) => `<span class="${x[0] === '✔' ? 'ok' : 'no'}">${esc(x)}</span>`).join(' ')}</div>` : ''}
      <button class="btn ${s.why ? 'ghost' : 'primary'} wide" data-act="learn" data-id="${n.id}" ${s.why ? 'disabled' : ''} id="btnLearn">${s.why ? esc(s.why) : n.fuse && !s.r ? 'Преобразить и изучить' : s.r ? 'Улучшить' : 'Изучить'}</button></div>`;
  }
  function conceptCards(h) {
    const fz = E.fused(h), list = D.CONCEPT_NODES.map(nodeById).sort((a, b) => a.lv - b.lv);
    const got = list.filter((n) => h.spent[n.id] > 0).length;
    const cards = list.map((n) => {
      const s = nodeState(h, n, fz), sk = n.e && n.e.unlock && D.SKILLS[n.e.unlock], br = D.MAOU_BRANCHES[n.br];
      const state = s.r ? '<span class="tag ok">изучено</span>' : s.can ? '<span class="tag new">доступно</span>' : h.level < n.lv ? `<span class="tag">нужен ур. ${n.lv}</span>` : '<span class="tag">закрыто</span>';
      return `<button class="ccard ${s.r ? 'got' : ''} ${s.can ? 'can' : ''} ${s.lock && !s.r ? 'lock' : ''}" style="--bc:${br.c}" data-act="conceptGo" data-id="${n.id}" data-quiet="1"><div class="cc-h"><span class="cc-ic">${icon(n)}</span><div class="grow tl"><b>${esc(n.n)}</b><div class="small dim">${br.ic} ${esc(br.n)} · ${sk ? 'активный' : 'пассивный'}</div></div>${state}</div>
        <div class="small tl">${esc(n.d || (sk && sk.d) || '')}</div>${n.lore ? `<div class="small lore tl">«${esc(n.lore)}»</div>` : ''}<div class="cc-f small">${sk ? `<span>${costTxt(sk) || ''}</span>` : '<span>всегда действует</span>'}${n.fuse ? `<span class="tfb">⚗️ Преображение: «${esc(nodeById(n.fuse[0]).n)}» → «${esc(n.n)}»</span>` : ''}</div></button>`;
    }).join('');
    return `<div class="card small tl brinfo" style="--bc:#c88aff"><b>✦ Концептуальные навыки</b> — ${got}/${list.length} изучено. Они не усиливают числа, а меняют правила боя. Нажмите на карточку, чтобы перейти к узлу.</div><div class="ccards">${cards}</div>`;
  }
  UI.tabs.skills = function (s) {
    const h = s.hero, k = UI.sub.skills || 'b0', sp = E.sp(h), up = E.up(h);
    if (k === 'echo' || k === 'list') return oldSkills(s);
    const grid = D.MAOU_BRANCHES.map((b, i) => { const p = progress(h, i); return `<button class="bchip ${k === 'b' + i ? 'on' : ''}" style="--bc:${b.c}" data-act="sub" data-k="skills" data-v="b${i}" data-quiet="1"><span class="bi">${b.ic}</span><b>${esc(b.n.split(/ и | и/)[0].replace('Фактор Короля Демонов', 'Фактор').replace('Тирания', 'Тирания'))}</b><i><u style="width:${Math.round(p.ranks / p.tot * 100)}%"></u></i><small>${p.got}/${p.n}</small></button>`; }).join('');
    const tabs = `<div class="seg small"><button class="${k === 'conc' ? 'on' : ''}" data-act="sub" data-k="skills" data-v="conc" data-quiet="1">✦ Концепты</button><button data-act="sub" data-k="skills" data-v="echo" data-quiet="1">🔆 Отголосок</button><button data-act="sub" data-k="skills" data-v="list" data-quiet="1">📜 Приёмы</button></div>`;
    const head = `<div class="row gap"><div class="pts"><b>${sp}</b><small>очков Силы</small></div><div class="pts echo"><b>${up}</b><small>искр Нимба</small></div></div><div class="bgrid">${grid}</div>${tabs}`;
    if (k === 'conc') return head + conceptCards(h);
    const bi = Math.min(NB() - 1, Math.max(0, +k.slice(1) || 0)), br = D.MAOU_BRANCHES[bi], p = progress(h, bi);
    const sel = UI.sub.node && D.NODE_BY_ID[UI.sub.node] && D.NODE_BY_ID[UI.sub.node].br === bi ? UI.sub.node : null;
    const info = `<div class="card small tl brinfo" style="--bc:${br.c}"><b>${br.ic} ${esc(br.n)}</b> <span class="dim">· изучено ${p.got}/${p.n} узлов, ${p.ranks}/${p.tot} рангов</span><div>${esc(br.d)}</div></div>`;
    return head + info + graph(h, bi, sel) + (sel ? detail(h, D.NODE_BY_ID[sel]) : '<div class="card small dim center">Нажмите на узел: ✦ — концепты, ⚗️ — преображения, подсвечены узлы, которые можно изучить сейчас.</div>');
  };
  UI.act.nodeClose = () => { UI.sub.node = null; UI.refresh(); };
  UI.act.conceptGo = (el) => { const n = nodeById(el.dataset.id); UI.sub.skills = 'b' + n.br; UI.sub.node = n.id; UI.refresh(false); const d = $('.ndet'); if (d) d.scrollIntoView({ block: 'nearest' }); };
  // изучение: преображение требует подтверждения
  UI.act.learn = (el) => {
    const s = UI.slot(), h = s.hero, id = el.dataset.id, n = D.TREES.maou.nodes.find((x) => x.id === id), isU = !!el.dataset.u;
    const go = () => { const r = E.learn(h, id); if (r) { UI.toast(r, 'bad'); UI.sfx('err'); return; } UI.sfx('level'); UI.save(true); UI.refresh(); };
    if (!isU && n && n.fuse && !(h.spent[id] > 0)) { UI.confirm('Преобразить навык?', `«${esc(n.n)}» поглотит ${n.fuse.map((q) => '«' + esc(nodeById(q).n) + '»').join(' и ')}. Их эффекты перестанут действовать, пока этот узел изучен. Вернуть можно только сбросом Сил.`, 'Преобразить', go); return; }
    go();
  };
})();
