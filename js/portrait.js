/* Процедурные аниме-портреты (SVG). Один и тот же код: рисует и файлы assets/portraits/*.webp (tools/gen-portraits.js),
   и запасной вариант, если картинка ещё не загружена. Все персонажи оригинальные. */
(function () {
  const RPG = globalThis.RPG || (globalThis.RPG = {});
  let uid = 0;
  const clampc = (v) => Math.max(0, Math.min(255, Math.round(v)));
  function hex2rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return '#' + [0, 1, 2].map(i => clampc(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0')).join(''); }
  const dark = (c, t) => mix(c, '#05060f', t), light = (c, t) => mix(c, '#ffffff', t);

  const RACES = {
    human: { bg: ['#2b3a67', '#0e1530'], skin: ['#f6d5bd', '#eec2a0', '#d9a07d'], acc: '#e9c46a', cloth: ['#3a5ba0', '#7a3b3b', '#2f6b5a'] },
    elf: { bg: ['#1f5b57', '#08202a'], skin: ['#f7e3d3', '#f3d6c4', '#ecd0c6'], acc: '#8ff0c0', cloth: ['#2e7d6a', '#5b4aa0', '#9bb8e8'] },
    dwarf: { bg: ['#6b3a22', '#1e0f0a'], skin: ['#e6b08c', '#d99f78', '#c88a64'], acc: '#ff9d4a', cloth: ['#8a4b2a', '#4a5568', '#7a2f2f'] },
    beast: { bg: ['#6b4a1f', '#1a1209'], skin: ['#f3cfa8', '#e9bd92', '#f0d4b8'], acc: '#ffd36b', cloth: ['#b4691f', '#3f7a4b', '#7a4a9a'] },
    demon: { bg: ['#5a1f3d', '#12060f'], skin: ['#d8a8b4', '#c79ab6', '#cfa09a'], acc: '#ff5a7a', cloth: ['#4a2a6a', '#7a1f2f', '#2b2f45'] }
  };
  RPG.RACE_PAL = RACES;

  // 30 портретов: 5 рас × 2 пола × 3 варианта
  const V = {
    human: {
      m: [{ n: 'Рэйн', hs: 'spike', hc: '#3b2a4a', ec: '#5aa0ff' }, { n: 'Альдо', hs: 'swept', hc: '#7a4a24', ec: '#7bd88a' }, { n: 'Каэль', hs: 'tail', hc: '#c9c6d6', ec: '#d89aff', acc: 'earring' }],
      f: [{ n: 'Сэла', hs: 'long', hc: '#d96a8a', ec: '#ff9ad0' }, { n: 'Нора', hs: 'twin', hc: '#e8c15a', ec: '#5ac8ff' }, { n: 'Мина', hs: 'bob', hc: '#2a2f4a', ec: '#ffb35a', acc: 'hairpin' }]
    },
    elf: {
      m: [{ n: 'Иллиан', hs: 'tail', hc: '#e9f2ff', ec: '#7ae8ff' }, { n: 'Тэйлис', hs: 'swept', hc: '#7bd88a', ec: '#f0e060' }, { n: 'Орвель', hs: 'spike', hc: '#355a88', ec: '#a8f0ff', acc: 'circlet' }],
      f: [{ n: 'Лиарэн', hs: 'long', hc: '#d9c8ff', ec: '#9a7aff', acc: 'circlet' }, { n: 'Фэйра', hs: 'twin', hc: '#8fe8b0', ec: '#ff8fb8' }, { n: 'Ниэль', hs: 'bob', hc: '#f4e9c8', ec: '#5ac8a0' }]
    },
    dwarf: {
      m: [{ n: 'Торгрим', hs: 'bald', hc: '#b4421f', ec: '#e8a040', beard: 'full' }, { n: 'Гарт', hs: 'swept', hc: '#3a2a22', ec: '#7a9aff', beard: 'braid' }, { n: 'Бальдур', hs: 'spike', hc: '#8a8a94', ec: '#9ae0a0', beard: 'stubble', acc: 'goggles' }],
      f: [{ n: 'Дагна', hs: 'long', hc: '#c9582a', ec: '#ffd35a', acc: 'braids' }, { n: 'Хельга', hs: 'bob', hc: '#4a3a2a', ec: '#6ac0ff', acc: 'freckles' }, { n: 'Руна', hs: 'twin', hc: '#7a4a9a', ec: '#ff9a5a', acc: 'goggles' }]
    },
    beast: {
      m: [{ n: 'Рагхар', hs: 'spike', hc: '#8a8f9a', ec: '#ffd35a', ears: 'wolf' }, { n: 'Лэйо', hs: 'swept', hc: '#e0883a', ec: '#7aff9a', ears: 'fox' }, { n: 'Миро', hs: 'tail', hc: '#2a2a35', ec: '#ff7a7a', ears: 'cat' }],
      f: [{ n: 'Кицуна', hs: 'long', hc: '#f0a040', ec: '#ffe070', ears: 'fox' }, { n: 'Аура', hs: 'twin', hc: '#e8e8f4', ec: '#7ad0ff', ears: 'wolf' }, { n: 'Нэко', hs: 'bob', hc: '#5a3a2a', ec: '#a0ff7a', ears: 'cat' }]
    },
    demon: {
      m: [{ n: 'Азраил', hs: 'swept', hc: '#1f1f2e', ec: '#ff4a4a', horns: 'ram' }, { n: 'Вэрн', hs: 'spike', hc: '#e8e0e0', ec: '#ff9a3a', horns: 'up' }, { n: 'Нокс', hs: 'tail', hc: '#6a1f3a', ec: '#ffd35a', horns: 'curve' }],
      f: [{ n: 'Лилит', hs: 'long', hc: '#c4204a', ec: '#ffd35a', horns: 'curve' }, { n: 'Эмбер', hs: 'twin', hc: '#3a1f5a', ec: '#ff6ad0', horns: 'up' }, { n: 'Сэйра', hs: 'bob', hc: '#e8c0d0', ec: '#ff5a5a', horns: 'ram' }]
    }
  };
  RPG.RACE_IDS = ['human', 'elf', 'dwarf', 'beast', 'demon'];
  RPG.PORTRAITS = [];
  RPG.RACE_IDS.forEach(r => ['m', 'f'].forEach(s => V[r][s].forEach((v, i) => RPG.PORTRAITS.push(Object.assign({ id: r + '_' + s + '_' + (i + 1), race: r, sex: s, v: i }, v)))));
  RPG.PORTRAIT_BY_ID = {}; RPG.PORTRAITS.forEach(p => RPG.PORTRAIT_BY_ID[p.id] = p);

  // NPC (оригинальные герои сюжета)
  RPG.NPC_LOOK = {
    kairen: { race: 'human', sex: 'm', hs: 'swept', hc: '#8d93a3', ec: '#6aa0d8', skin: '#e3b494', scar: 1, beard: 'stubble', cloth: '#3d4458', old: 1 },
    tika: { race: 'beast', sex: 'f', hs: 'bob', hc: '#f08a3a', ec: '#7aff9a', ears: 'fox', acc: 'hairpin', cloth: '#2f6b5a' },
    irel: { race: 'elf', sex: 'f', hs: 'long', hc: '#cbbcf5', ec: '#8a7aff', acc: 'circlet', cloth: '#e8e4f8' },
    eydran: { race: 'human', sex: 'm', hs: 'tail', hc: '#f2f2f8', ec: '#9aa4b8', skin: '#efe2dc', cloth: '#1c1c28', blind: 1 },
    mara: { race: 'demon', sex: 'f', hs: 'twin', hc: '#c4204a', ec: '#ffd35a', horns: 'curve', cloth: '#2b2f45' },
    brum: { race: 'dwarf', sex: 'm', hs: 'bald', hc: '#b4421f', ec: '#e8a040', beard: 'full', acc: 'goggles', cloth: '#6a4a3a' }
  };


  // Запасные образы для новых персонажей (когда арт ещё не загружен)
  Object.assign(RPG.NPC_LOOK, {
    hero: { race: 'human', sex: 'm', hs: 'spike', hc: '#1a1a24', ec: '#9a6aff', cloth: '#3a2a4a' },
    sister: { race: 'human', sex: 'f', hs: 'long', hc: '#7a4a2a', ec: '#c98a4a', cloth: '#8a6a4a' },
    gen1: { race: 'demon', sex: 'f', hs: 'long', hc: '#f4f4fa', ec: '#ff3a4a', horns: 'curve', cloth: '#1c1c28' },
    gen2: { race: 'beast', sex: 'f', hs: 'tail', hc: '#e8501f', ec: '#ffb35a', ears: 'fox', cloth: '#8a3a2a' },
    gen3: { race: 'human', sex: 'f', hs: 'bob', hc: '#7a4aa8', ec: '#d89aff', acc: 'goggles', cloth: '#3a2a5a' },
    gen4: { race: 'elf', sex: 'f', hs: 'long', hc: '#6ad88a', ec: '#a0ff7a', cloth: '#2e7d6a' },
    gen5: { race: 'beast', sex: 'f', hs: 'bob', hc: '#2a2a35', ec: '#ffd35a', ears: 'cat', skin: '#c88a64', cloth: '#2b2f45' },
    gen6: { race: 'human', sex: 'f', hs: 'tail', hc: '#e8c15a', ec: '#7ad0ff', cloth: '#aab0c0' },
    gen7: { race: 'elf', sex: 'f', hs: 'long', hc: '#7ad0ff', ec: '#5ac8ff', acc: 'circlet', cloth: '#9bb8e8' },
    gen8: { race: 'human', sex: 'f', hs: 'twin', hc: '#ff8ac0', ec: '#ff5ad0', cloth: '#7a3b6a' },
    gen9: { race: 'human', sex: 'f', hs: 'long', hc: '#15151f', ec: '#b08aff', skin: '#efe2dc', cloth: '#2a1f3a' },
    hero1: { race: 'human', sex: 'f', hs: 'long', hc: '#f0c850', ec: '#7ad0ff', cloth: '#e8e4f8' },
    hero2: { race: 'human', sex: 'f', hs: 'bob', hc: '#cfd6e8', ec: '#9aa4b8', cloth: '#e0e4f0' },
    hero3: { race: 'human', sex: 'f', hs: 'twin', hc: '#e8d49a', ec: '#a0c8ff', cloth: '#f0ece0' },
    apostle: { race: 'elf', sex: 'm', hs: 'long', hc: '#ffe9a0', ec: '#ffd35a', acc: 'circlet', cloth: '#f8f4e0' },
    sub_grak: { race: 'beast', sex: 'm', hs: 'bald', hc: '#6aa84a', ec: '#ffd35a', skin: '#8ac86a', cloth: '#5a4a2a' },
    sub_skril: { race: 'human', sex: 'm', hs: 'bald', hc: '#e8e8f0', ec: '#7ad0ff', skin: '#e8e4dc', cloth: '#3a3f55' },
    sub_tik: { race: 'demon', sex: 'm', hs: 'spike', hc: '#9a5ad8', ec: '#ffd35a', skin: '#a87ad0', horns: 'up', cloth: '#5a2a7a' },
    sub_garm: { race: 'dwarf', sex: 'm', hs: 'bald', hc: '#3a5a2a', ec: '#ff9a5a', skin: '#7a9a5a', beard: 'stubble', cloth: '#6a3a2a' },
    sub_vesper: { race: 'elf', sex: 'm', hs: 'swept', hc: '#cfd6e8', ec: '#d89aff', skin: '#6a5a8a', cloth: '#1c1c28' },
    sub_brum: { race: 'dwarf', sex: 'm', hs: 'bald', hc: '#b4421f', ec: '#e8a040', beard: 'full', acc: 'goggles', cloth: '#6a4a3a' }
  });

  const OPEN = { n: 1, h: 1, s: 1, x: 1 };

  function portraitSVG(o) {
    o = Object.assign({ mood: 'n', size: null }, o);
    const R = RACES[o.race], id = 'p' + (++uid), F = o.sex === 'f';
    const skin = o.skin || R.skin[(o.v || 0) % 3];
    const skinS = dark(skin, 0.16), skinH = light(skin, 0.25);
    const hair = o.hc, hairD = dark(hair, 0.35), hairL = light(hair, 0.4);
    const ec = o.ec, ecD = dark(ec, 0.5), ecL = light(ec, 0.55);
    const cloth = o.cloth || R.cloth[(o.v || 0) % 3], clothD = dark(cloth, 0.4), clothL = light(cloth, 0.3);
    const line = '#1a1020';
    const mood = o.mood || 'n';
    const hs = o.hs;
    let s = '';
    const P = (d, fill, extra) => { s += `<path d="${d}" fill="${fill}" ${extra || ''}/>`; };
    const mirror = (inner) => `<g transform="translate(256,0) scale(-1,1)">${inner}</g>`;
    // фон
    s += `<defs>
      <radialGradient id="${id}bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${light(R.bg[0], 0.12)}"/><stop offset="0.6" stop-color="${R.bg[0]}"/><stop offset="1" stop-color="${R.bg[1]}"/></radialGradient>
      <radialGradient id="${id}ir" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="${ecL}"/><stop offset="0.45" stop-color="${ec}"/><stop offset="1" stop-color="${ecD}"/></radialGradient>
      <linearGradient id="${id}hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hairL}"/><stop offset="0.35" stop-color="${hair}"/><stop offset="1" stop-color="${hairD}"/></linearGradient>
      <linearGradient id="${id}sk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${skinS}"/><stop offset="0.28" stop-color="${skin}"/><stop offset="0.75" stop-color="${skin}"/><stop offset="1" stop-color="${skinS}"/></linearGradient>
      <linearGradient id="${id}cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${clothL}"/><stop offset="1" stop-color="${clothD}"/></linearGradient>
    </defs>`;
    s += `<rect width="256" height="320" fill="url(#${id}bg)"/>`;
    s += `<circle cx="128" cy="130" r="108" fill="none" stroke="${R.acc}" stroke-opacity=".13" stroke-width="2"/><circle cx="128" cy="130" r="92" fill="${R.acc}" fill-opacity=".05"/>`;
    const sp = [[30, 40, 2], [220, 60, 2.4], [48, 250, 1.6], [214, 220, 2], [24, 150, 1.5], [236, 130, 1.4], [190, 20, 1.6], [70, 18, 1.4]];
    sp.forEach(([x, y, r]) => { s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${R.acc}" fill-opacity=".55"/>`; });
    // задние волосы / хвосты
    const tailPath = (side) => {
      return side;
    };
    if (hs === 'long') P('M 62 96 C 36 150, 40 250, 66 300 L 190 300 C 216 250, 220 150, 194 96 Z', 'url(#' + id + 'hg)');
    if (hs === 'bob') P('M 66 104 C 54 160, 60 196, 84 208 L 172 208 C 196 196, 202 160, 190 104 Z', 'url(#' + id + 'hg)');
    if (hs === 'twin') { P('M 74 82 C 30 96, 20 190, 44 262 C 70 250, 82 190, 90 100 Z', 'url(#' + id + 'hg)'); P('M 182 82 C 226 96, 236 190, 212 262 C 186 250, 174 190, 166 100 Z', 'url(#' + id + 'hg)'); }
    if (hs === 'tail') { P('M 176 70 C 232 70, 244 150, 226 230 C 214 190, 204 150, 178 120 Z', 'url(#' + id + 'hg)'); P('M 70 110 C 62 150, 70 184, 92 194 L 164 194 C 186 184, 194 150, 186 110 Z', hairD); }
    if (hs === 'swept') P('M 68 108 C 58 150, 68 186, 92 194 L 164 194 C 188 186, 198 150, 188 108 Z', hairD);
    if (hs === 'spike') P('M 70 108 C 62 140, 70 172, 90 182 L 166 182 C 186 172, 194 140, 186 108 Z', hairD);
    // рога / уши зверя — позади головы
    if (o.horns) {
      const hornCol = '#2b1a2a', hornL = '#6a3a50';
      const H = { ram: 'M 84 82 C 40 70, 22 112, 52 130 C 40 108, 62 92, 92 100 Z', up: 'M 92 76 C 82 40, 90 14, 104 4 C 104 30, 110 52, 112 72 Z', curve: 'M 88 78 C 56 54, 52 24, 76 10 C 70 34, 92 50, 106 66 Z' }[o.horns];
      const hg = `<linearGradient id="${id}hn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hornL}"/><stop offset="1" stop-color="${hornCol}"/></linearGradient>`;
      s += `<defs>${hg}</defs>` + `<path d="${H}" fill="url(#${id}hn)" stroke="${line}" stroke-width="1.5"/>` + mirror(`<path d="${H}" fill="url(#${id}hn)" stroke="${line}" stroke-width="1.5"/>`);
    }
    // тело
    P('M 14 320 C 18 272, 56 252, 100 244 L 156 244 C 200 252, 238 272, 242 320 Z', 'url(#' + id + 'cl)', `stroke="${line}" stroke-width="2"`);
    // шея
    P('M 108 196 L 108 250 C 116 262, 140 262, 148 250 L 148 196 Z', 'url(#' + id + 'sk)');
    P('M 108 226 C 120 240, 136 240, 148 226 L 148 200 L 108 200 Z', skinS, 'opacity=".45"');
    // детали одежды
    const outfit = (o.v || 0) % 3;
    if (o.race === 'dwarf' || outfit === 1) {
      P('M 14 320 C 16 286, 34 266, 58 258 L 84 262 C 70 280, 64 300, 62 320 Z', clothD, `stroke="${line}" stroke-width="1.5"`);
      mirror('');
      s += mirror(`<path d="M 14 320 C 16 286, 34 266, 58 258 L 84 262 C 70 280, 64 300, 62 320 Z" fill="${clothD}" stroke="${line}" stroke-width="1.5"/>`);
      s += `<circle cx="64" cy="270" r="5" fill="${R.acc}" stroke="${line}"/><circle cx="192" cy="270" r="5" fill="${R.acc}" stroke="${line}"/>`;
    }
    P('M 100 246 L 128 288 L 156 246 L 146 244 L 128 270 L 110 244 Z', R.acc, `stroke="${line}" stroke-width="1.2" opacity=".9"`);
    if (outfit === 2) P('M 96 244 C 110 262, 146 262, 160 244 L 168 258 C 146 280, 110 280, 88 258 Z', light(cloth, 0.45), `stroke="${line}" stroke-width="1.5"`);
    if (o.old) P('M 40 300 L 216 300 L 226 320 L 30 320 Z', dark(cloth, 0.2), 'opacity=".6"');
    // уши
    if (o.race === 'elf') {
      const E = `<path d="M 82 136 L 28 108 L 40 124 L 30 130 L 84 162 Z" fill="${skin}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/><path d="M 78 140 L 44 122 L 80 152 Z" fill="${skinS}" opacity=".5"/>`;
      s += E + mirror(E);
    } else if (o.race === 'demon') {
      const E = `<path d="M 82 138 L 48 122 L 56 140 L 84 160 Z" fill="${skin}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/>`;
      s += E + mirror(E);
    } else if (o.race === 'beast') {
      /* уши на макушке рисуются позже */
    } else {
      const big = o.race === 'dwarf' ? 1.2 : 1;
      const E = `<ellipse cx="78" cy="146" rx="${7 * big}" ry="${12 * big}" fill="${skin}" stroke="${line}" stroke-width="1.6"/><ellipse cx="79" cy="147" rx="3" ry="6" fill="${skinS}" opacity=".6"/>`;
      s += E + mirror(E);
    }
    // голова
    const jaw = F ? { cx: 12, y: 206 } : { cx: 22, y: 208 };
    const fw = o.race === 'dwarf' ? 4 : 0;
    const face = `M 128 60 C ${172 + fw} 60, ${180 + fw} 100, ${180 + fw} 132 C ${180 + fw} ${F ? 168 : 170}, ${128 + jaw.cx + 8} ${jaw.y - 2}, ${128 + jaw.cx} ${jaw.y} L ${128 - jaw.cx} ${jaw.y} C ${128 - jaw.cx - 8} ${jaw.y - 2}, ${76 - fw} ${F ? 168 : 170}, ${76 - fw} 132 C ${76 - fw} 100, ${84 - fw} 60, 128 60 Z`;
    P(face, 'url(#' + id + 'sk)', `stroke="${line}" stroke-width="2.2" stroke-linejoin="round"`);
    // тени под чёлкой и скулы
    P('M 86 100 C 100 120, 156 120, 170 100 L 172 128 C 150 134, 106 134, 84 128 Z', skinS, 'opacity=".35"');
    if (o.race === 'demon') {
      s += `<path d="M 92 166 L 100 178 M 164 166 L 156 178 M 128 80 L 128 96" stroke="${R.acc}" stroke-width="2.2" stroke-linecap="round" opacity=".85"/><circle cx="128" cy="108" r="3" fill="${R.acc}"/>`;
    }
    if (o.race === 'beast') {
      s += `<g stroke="${dark(skin, 0.45)}" stroke-width="1.4" stroke-linecap="round" opacity=".7"><path d="M 84 170 L 100 172 M 84 178 L 100 176 M 172 170 L 156 172 M 172 178 L 156 176"/></g>`;
    }
    if (o.acc === 'freckles' || o.race === 'dwarf' && F) {
      [[98, 170], [106, 174], [114, 170], [142, 170], [150, 174], [158, 170]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="1.7" fill="${dark(skin, 0.4)}" opacity=".7"/>`; });
    }
    // глаза
    const eyes = (cx, side) => {
      // side: -1 левый, 1 правый
      let e = '';
      const ry = F ? 15 : 13.5, rx = 16;
      const tiltBase = mood === 's' ? 7 : mood === 'x' ? -6 : (F ? 0 : 2);
      const tilt = tiltBase * (side * -1); // внутренний угол ниже при 's'
      const cy = 142;
      if (mood === 'h') {
        e += `<path d="M ${cx - 15} ${cy + 4} Q ${cx} ${cy - 16} ${cx + 15} ${cy + 4}" fill="none" stroke="${line}" stroke-width="4.2" stroke-linecap="round"/>`;
        e += `<path d="M ${cx - 15} ${cy + 4} Q ${cx} ${cy - 16} ${cx + 15} ${cy + 4}" fill="none" stroke="${ecL}" stroke-width="1" opacity=".0"/>`;
        return e;
      }
      e += `<clipPath id="${id}c${side > 0 ? 'r' : 'l'}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>`;
      e += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fdfdff" stroke="${line}" stroke-width="1"/>`;
      e += `<g clip-path="url(#${id}c${side > 0 ? 'r' : 'l'})">`;
      e += `<ellipse cx="${cx + side * -0.5}" cy="${cy + 1}" rx="10.8" ry="${ry + 1}" fill="url(#${id}ir)"/>`;
      e += `<ellipse cx="${cx}" cy="${cy + 2}" rx="${o.race === 'demon' ? 2.4 : 5.2}" ry="${o.race === 'demon' ? 11 : 7.5}" fill="#120a1c"/>`;
      e += `<ellipse cx="${cx}" cy="${cy + 11}" rx="9" ry="4" fill="${ecL}" opacity=".35"/>`;
      e += `<circle cx="${cx - 3.8}" cy="${cy - 5}" r="3.8" fill="#fff"/><circle cx="${cx + 4.5}" cy="${cy + 5}" r="1.9" fill="#fff" opacity=".9"/>`;
      // верхнее веко (цвет кожи) задаёт выражение
      const cover = mood === 's' ? 7 : mood === 'x' ? 3 : (F ? 1 : 3.5);
      const yl = cy - ry + cover;
      const inner = cx - side * rx, outer = cx + side * rx; // внутренний угол к носу
      e += `<path d="M ${cx - rx - 2} ${cy - ry - 4} L ${cx + rx + 2} ${cy - ry - 4} L ${outer + side * 2} ${yl - tilt * -0.0 - (mood === 's' ? -2 : 0)} Q ${cx} ${yl - 2 + (mood === 's' ? 2 : 0)} ${inner - side * 2} ${yl + tilt} Z" fill="${skin}"/>`;
      e += `</g>`;
      // ресницы
      const lw = F ? 4 : 3.4;
      e += `<path d="M ${inner - side * 1} ${yl + tilt + 1} Q ${cx} ${yl - 4} ${outer + side * 2.5} ${yl - 1 - (mood === 's' ? -1 : 0)}" fill="none" stroke="${line}" stroke-width="${lw}" stroke-linecap="round"/>`;
      if (F) e += `<path d="M ${outer + side * 2.5} ${yl - 1} l ${side * 6} -4 M ${outer + side * 1} ${yl + 3} l ${side * 6} -1" stroke="${line}" stroke-width="2.2" stroke-linecap="round"/>`;
      // нижнее веко
      e += `<path d="M ${cx - rx + 3} ${cy + ry - 1} Q ${cx} ${cy + ry + 2.5} ${cx + rx - 3} ${cy + ry - 1}" fill="none" stroke="${dark(skin, 0.45)}" stroke-width="1" opacity=".6"/>`;
      return e;
    };
    s += eyes(100, -1) + eyes(156, 1);
    // брови
    const bw = (o.race === 'dwarf' ? 4.4 : F ? 2.4 : 3.4), browC = o.old ? '#9aa0b0' : dark(hair, 0.15);
    const bt = mood === 's' ? 7 : mood === 'x' ? -5 : mood === 'h' ? -3 : 0;
    const brow = (cx, side) => { const iy = 112 + bt * 0.7 + (mood === 's' ? 3 : 0), oy = 112 - (mood === 's' ? 2 : 0) - (mood === 'x' ? 0 : 0) + (mood === 'x' ? 5 : 0); const ix = cx - side * 14, ox = cx + side * 16; return `<path d="M ${ix} ${iy} Q ${cx} ${iy - 8 - (mood === 's' ? 0 : 0)} ${ox} ${oy + 2}" fill="none" stroke="${browC}" stroke-width="${bw}" stroke-linecap="round"/>`; };
    s += brow(100, -1) + brow(156, 1);
    // нос, рот
    s += `<path d="M 126 166 Q 124 172 129 173" fill="none" stroke="${dark(skin, 0.4)}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`;
    if (mood === 'h') s += `<path d="M 112 182 Q 128 200 144 182 Q 128 188 112 182 Z" fill="#7a1f33" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/><path d="M 118 185 Q 128 190 138 185 L 136 187 Q 128 192 120 187 Z" fill="#fff"/>`;
    else if (mood === 's') s += `<path d="M 116 188 Q 128 183 140 188" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round"/>`;
    else if (mood === 'x') s += `<ellipse cx="128" cy="188" rx="5" ry="6" fill="#7a1f33" stroke="${line}" stroke-width="1.6"/>`;
    else s += `<path d="M 117 184 Q 128 192 139 184" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round"/>`;
    if (o.race === 'demon' || o.race === 'beast') { if (mood === 'h' || mood === 's') s += `<path d="M 119 186 l 2 5 l 3 -5 M 137 186 l -2 5 l -3 -5" fill="#fff" stroke="${line}" stroke-width="1" /> `; }
    if (F || mood === 'h') { s += `<ellipse cx="88" cy="168" rx="11" ry="6" fill="#ff7a9a" opacity="${F ? 0.32 : 0.18}"/><ellipse cx="168" cy="168" rx="11" ry="6" fill="#ff7a9a" opacity="${F ? 0.32 : 0.18}"/>`; }
    if (mood === 'x') s += `<path d="M 168 154 q 3 8 0 12 q -4 -4 0 -12 Z" fill="#9ad8ff" opacity=".85"/>`;
    if (o.scar) s += `<path d="M 160 118 L 150 172" stroke="#b4636b" stroke-width="2.6" stroke-linecap="round" opacity=".85"/><path d="M 156 136 l 8 2 M 154 148 l 8 2" stroke="#7a3a42" stroke-width="1.4"/>`;
    // борода гнома/щетина
    if (o.beard === 'full') {
      P('M 80 150 C 74 210, 100 262, 128 272 C 156 262, 182 210, 176 150 C 170 176, 150 186, 128 190 C 106 186, 86 176, 80 150 Z', 'url(#' + id + 'hg)', `stroke="${line}" stroke-width="2"`);
      P('M 110 190 C 118 184, 138 184, 146 190 C 140 196, 116 196, 110 190 Z', hairD);
      s += `<path d="M 100 214 C 108 236, 116 248, 128 256 M 156 214 C 148 236, 140 248, 128 256" stroke="${hairL}" stroke-width="2" fill="none" opacity=".6"/>`;
    } else if (o.beard === 'braid') {
      P('M 82 166 C 86 196, 108 200, 128 198 C 148 200, 170 196, 174 166 C 160 184, 100 184, 82 166 Z', 'url(#' + id + 'hg)', `stroke="${line}" stroke-width="1.6"`);
      P('M 116 196 L 140 196 L 136 232 L 128 262 L 120 232 Z', 'url(#' + id + 'hg)', `stroke="${line}" stroke-width="1.6"`);
      s += `<path d="M 120 210 L 136 214 M 121 224 L 135 228 M 124 240 L 132 244" stroke="${hairD}" stroke-width="2"/><rect x="118" y="244" width="20" height="6" rx="2" fill="${R.acc}" stroke="${line}"/>`;
    } else if (o.beard === 'stubble') {
      P('M 84 160 C 90 192, 110 204, 128 204 C 146 204, 166 192, 172 160 C 160 182, 100 182, 84 160 Z', o.old ? '#a0a6b4' : hairD, 'opacity=".45"');
    }
    // чёлка / волосы спереди
    const front = (hs) => {
      const cap = 'M 70 136 C 56 70, 92 28, 128 28 C 164 28, 200 70, 186 136 C 184 120, 178 108, 172 100';
      let edge, side = '', extra = '';
      if (hs === 'spike') edge = 'L 166 124 L 158 100 L 148 128 L 138 102 L 128 130 L 118 102 L 108 128 L 98 102 L 90 124 L 84 100';
      else if (hs === 'swept') edge = 'C 160 126, 126 134, 112 102 C 106 120, 94 122, 84 100';
      else if (hs === 'tail') edge = 'C 150 112, 138 116, 128 104 C 118 124, 100 120, 84 100';
      else if (hs === 'long') { edge = 'L 164 112 Q 150 120 138 104 Q 128 124 116 104 Q 104 118 92 112 L 84 100'; side = `<path d="M 76 112 C 62 170, 66 236, 80 272 C 94 232, 92 170, 92 114 Z" fill="url(#${id}hg)"/><path d="M 180 112 C 194 170, 190 236, 176 272 C 162 232, 164 170, 164 114 Z" fill="url(#${id}hg)"/>`; }
      else if (hs === 'twin') { edge = 'C 150 106, 134 108, 128 94 C 122 108, 106 106, 86 100'; side = `<path d="M 78 106 C 70 150, 72 176, 82 190 C 92 164, 92 130, 92 108 Z" fill="url(#${id}hg)"/><path d="M 178 106 C 186 150, 184 176, 174 190 C 164 164, 164 130, 164 108 Z" fill="url(#${id}hg)"/>`; extra = `<circle cx="76" cy="92" r="7" fill="${R.acc}" stroke="${line}"/><circle cx="180" cy="92" r="7" fill="${R.acc}" stroke="${line}"/>`; }
      else if (hs === 'bob') { edge = 'L 166 110 Q 150 120 140 106 Q 128 122 114 106 Q 104 116 90 110 L 84 100'; side = `<path d="M 74 112 C 62 150, 64 184, 82 200 C 92 170, 90 140, 90 114 Z" fill="url(#${id}hg)"/><path d="M 182 112 C 194 150, 192 184, 174 200 C 164 170, 166 140, 166 114 Z" fill="url(#${id}hg)"/>`; extra = `<path d="M 128 30 C 118 6, 148 2, 140 -6" stroke="${hair}" stroke-width="5" fill="none" stroke-linecap="round"/>`; }
      else { return ''; }
      const d = cap + ' ' + edge + ' C 80 114, 74 126, 70 136 Z';
      return side.replace(/fill="url/g, `stroke="${line}" stroke-width="1.6" fill="url`) + `<path d="${d}" fill="url(#${id}hg)" stroke="${line}" stroke-width="2" stroke-linejoin="round"/><path d="M 92 64 C 108 44, 150 42, 168 62" fill="none" stroke="${hairL}" stroke-width="5" stroke-linecap="round" opacity=".45"/><path d="M 100 76 C 112 62, 142 60, 154 72" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".25"/>` + extra;
    };
    if (hs === 'bald') {
      P('M 80 112 C 84 70, 172 70, 176 112 C 160 92, 96 92, 80 112 Z', skinS, 'opacity=".4"');
      if (o.beard !== 'full') {} else { P('M 80 112 C 76 100, 84 88, 92 90 L 96 110 Z', 'url(#' + id + 'hg)'); }
      s += `<path d="M 98 70 C 112 58, 144 58, 158 70" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".35"/>`;
      if (o.beard === 'full') s += `<path d="M 88 118 C 100 100, 156 100, 168 118" stroke="${hair}" stroke-width="10" fill="none" stroke-linecap="round"/>`;
    } else s += front(hs);
    // хвост (завязка)
    if (hs === 'tail') s += `<rect x="168" y="82" width="14" height="9" rx="3" transform="rotate(-18 175 86)" fill="${R.acc}" stroke="${line}"/>`;
    // уши зверя
    if (o.ears) {
      const T = {
        fox: { o: 'M 78 82 L 62 6 L 120 50 Z', i: 'M 82 70 L 72 28 L 108 52 Z' },
        wolf: { o: 'M 76 84 L 70 22 L 122 52 Z', i: 'M 82 72 L 78 40 L 108 54 Z' },
        cat: { o: 'M 74 86 C 66 40, 72 22, 80 18 C 100 28, 116 42, 124 56 Z', i: 'M 82 74 C 78 50, 80 38, 84 34 C 96 42, 104 50, 108 58 Z' }
      }[o.ears];
      const earC = hair;
      const EAR = `<path d="${T.o}" fill="${earC}" stroke="${line}" stroke-width="2" stroke-linejoin="round"/><path d="${T.i}" fill="${o.ears === 'wolf' ? dark(hair, 0.25) : '#f2a0a8'}" opacity=".9"/>`;
      s += EAR + mirror(EAR);
    }
    // аксессуары
    if (o.acc === 'circlet') s += `<path d="M 86 92 Q 128 76 170 92" fill="none" stroke="${R.acc}" stroke-width="3.4" stroke-linecap="round"/><path d="M 128 76 l 6 10 l -6 10 l -6 -10 Z" fill="${ecL}" stroke="${line}" stroke-width="1.3"/>`;
    if (o.acc === 'hairpin') s += `<path d="M 168 96 l 12 -6 M 168 102 l 12 0" stroke="${R.acc}" stroke-width="3" stroke-linecap="round"/><circle cx="182" cy="92" r="4.2" fill="${R.acc}" stroke="${line}"/>`;
    if (o.acc === 'earring') s += `<circle cx="79" cy="164" r="4.2" fill="${R.acc}" stroke="${line}"/>`;
    if (o.acc === 'braids') { const B = `<path d="M 84 150 C 70 190, 70 214, 76 244" stroke="${hair}" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M 80 180 l 10 3 M 76 200 l 10 2 M 74 220 l 10 1" stroke="${hairD}" stroke-width="2"/><circle cx="76" cy="246" r="6" fill="${R.acc}" stroke="${line}"/>`; s += B + mirror(B); }
    if (o.acc === 'goggles') s += `<path d="M 76 80 C 100 66, 156 66, 180 80" stroke="#3a2a20" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="108" cy="72" r="13" fill="#9ad8ff" fill-opacity=".55" stroke="#caa56a" stroke-width="4"/><circle cx="148" cy="72" r="13" fill="#9ad8ff" fill-opacity=".55" stroke="#caa56a" stroke-width="4"/><path d="M 100 66 l 8 -4" stroke="#fff" stroke-width="2.4" opacity=".7"/>`;
    if (o.blind) s += `<path d="M 74 128 L 182 128 L 182 152 L 74 152 Z" fill="#14141f" stroke="${line}" stroke-width="2"/><path d="M 74 138 L 182 138" stroke="#c0c4e0" stroke-width="1.4" opacity=".6"/><path d="M 100 140 l 8 -3 l 8 3 M 140 140 l 8 -3 l 8 3" stroke="#aab2e0" stroke-width="1.6" fill="none" opacity=".7"/>`;
    // виньетка
    s += `<rect width="256" height="320" fill="none" stroke="${dark(R.bg[1], 0.3)}" stroke-width="6"/>`;
    const sz = o.size ? ` width="${o.size[0]}" height="${o.size[1]}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 320"${sz}>${s}</svg>`;
  }
  RPG.portraitSVG = portraitSVG;
  RPG.portraitSpec = (id) => RPG.PORTRAIT_BY_ID[id] || null;
  
/* Маппинг настроений реплики (n,h,a,s,d,m) → имя файла-настроения арта. Общий для плеера и тестов. */
RPG.MOOD_NAMES = { n: 'neutral', h: 'happy', a: 'angry', s: 'shy', d: 'sad' };
RPG.HERO_MOOD_NAMES = { n: 'neutral', h: 'smirk', a: 'angry', d: 'despair', m: 'demon', s: 'neutral' };
RPG.moodName = (art, mood) => (art === 'hero' ? RPG.HERO_MOOD_NAMES : RPG.MOOD_NAMES)[mood || 'n'] || 'neutral';
/* Итоговое имя файла из манифеста с откатом: настроение → neutral → null (тогда рисуется SVG) */
RPG.artFileOf = (manifest, art, mood) => { const m = manifest && manifest.portraits && manifest.portraits[art]; if (!m) return null; return m[RPG.moodName(art, mood)] || m.neutral || null; };

/* Геометрия сцены новеллы (чистые функции — тестируются в node).
   Метрики портрета: {w,h,fx,fy,fw} — размер файла, центр лица и ширина лица (px). Высота h>720 означает продление бюста вниз (затухание под диалогом).
   Кадр актёра: ширина 1800, центр лица эталона в x=900, сверху запас 220; позиция и размер кадра задаются одним transform (translate+scale). */
RPG.VN = { FR_W: 1800, FR_CX: 900, FR_T: 220, BUST: 720, SLOTS: { 1: [0.5], 2: [0.3, 0.7], 3: [0.2, 0.5, 0.8] }, FACE_K: { 1: 0.5, 2: 0.42, 3: 0.35 } };
RPG.artMetricsOf = (manifest, art, mood) => {
  const f = RPG.artFileOf(manifest, art, mood), d = f && manifest.dim && manifest.dim[f];
  if (d && d.length >= 6) return { w: d[0], h: d[1], fx: d[3], fy: d[4], fw: d[5], img: true };
  if (d) return { w: d[0], h: d[1], fx: d[0] / 2, fy: d[1] * 0.18, fw: d[0] * 0.32, img: true };
  return { w: 256, h: 320, fx: 128, fy: 100, fw: 130, img: false };
};
RPG.vnLayout = (refs, W, Yb) => {
  const V = RPG.VN, n = refs.length; if (!n) return [];
  let Ft = V.FACE_K[Math.min(3, n)] * W;
  refs.forEach((r) => { const bust = r.h > V.BUST ? V.BUST : r.h; Ft = Math.min(Ft, ((Yb - 58) / ((bust - r.fy) + 0.75 * r.fw)) * r.fw); });   // голова не уходит за верх экрана
  return refs.map((r, i) => {
    const s = Ft / r.fw, ext = r.h > V.BUST ? r.h - V.BUST : 0, frH = V.FR_T + r.h, slot = V.SLOTS[Math.min(3, n)][Math.min(2, i)];
    return { s, x: slot * W - V.FR_CX * s, y: Yb + ext * s - frH * s, frH, face: Ft };
  });
};
RPG.vnPlaceRect = (ref, m) => { const V = RPG.VN, r = ref.fw / m.fw; return { left: V.FR_CX - m.fx * r, top: V.FR_T + ref.fy - m.fy * r, width: m.w * r, height: m.h * r, r }; };
if (typeof module !== 'undefined') module.exports = RPG;
})();
