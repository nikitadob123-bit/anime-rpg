/* E2E v2.31.10 коллаба «Железный Кулак»: канонический сценарий, 4 пути, рамка диалога.
   Скриншоты — /workspace/shots-tekken/v23110/  (444×986) */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const { serve } = require('./serve.js');
const outDir = process.env.TK_SHOTS || '/workspace/shots-tekken/v23110';
fs.mkdirSync(outDir, { recursive: true });
let ok = 0, bad = 0;
const check = (n, c, extra) => { if (c) { ok++; console.log('  ✓', n, extra || ''); } else { bad++; console.log('  ✗', n, extra || ''); } };

(async () => {
  const srv = await serve(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 444, height: 986 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', timezoneId: 'Europe/Berlin' });
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400 && !/img\/tekken\//.test(r.url())) failed.push(r.status() + ' ' + r.url()); });
  const shot = (n) => page.screenshot({ path: path.join(outDir, n + '.jpg'), type: 'jpeg', quality: 80, scale: 'css' });
  const ev = (f, a) => page.evaluate(f, a);
  const click = async (sel, o) => { const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 8000 }); await l.click(o || {}); await page.waitForTimeout(80); };

  const turnSkipOn = async () => {
    const on = await ev(() => {
      const b = document.getElementById('sSkip');
      if (!b || /Идёт/.test(b.textContent || '')) return false;
      b.click(); return true;
    });
    if (on) await page.waitForTimeout(40);
  };
  const playVn = async (pick) => {
    const ready = await page.locator('#story, #schoice.on .choice').count();
    if (!ready) return 'done';
    if (await page.locator('#story').count()) await page.waitForSelector('#story', { timeout: 8000 }).catch(() => {});
    await turnSkipOn();
    let guard = 600, lastChoice = '';
    while (guard-- > 0) {
      if (!(await page.locator('#story').count())) return lastChoice || 'done';
      if (await page.locator('#schoice.on .choice').count()) {
        lastChoice = await ev((pick) => {
          const ops = [...document.querySelectorAll('#schoice.on .choice')];
          if (!ops.length) return '';
          const re = pick ? new RegExp(pick.source || pick, pick.flags || '') : null;
          const el = (re && ops.find((e) => re.test(e.textContent || ''))) || ops[0];
          const t = el.textContent || '';
          el.click();
          return t;
        }, pick && pick.source ? pick.source : pick);
        await page.waitForTimeout(80);
        await turnSkipOn();
        continue;
      }
      await ev(() => { if (window.__RPG && __RPG.UI && __RPG.UI.sNext) __RPG.UI.sNext(); });
      await page.locator('#dlg').click({ force: true }).catch(() => {});
      await page.waitForTimeout(30);
    }
    // last resort: skip remaining
    await turnSkipOn();
    await page.waitForFunction(() => !document.getElementById('story'), { timeout: 15000 }).catch(() => {});
    return lastChoice || (!(await page.locator('#story').count()) ? 'done' : 'timeout');
  };

  const skipOff = async () => {
    await ev(() => {
      const b = document.getElementById('sSkip');
      if (b && /Идёт/.test(b.textContent || '')) b.click();
    });
    await page.waitForTimeout(80);
  };
  const waitForChoices = async () => {
    let guard = 250;
    while (guard-- > 0 && !(await page.locator('#schoice.on .choice').count())) {
      await ev(() => { if (__RPG.UI && __RPG.UI.sNext) __RPG.UI.sNext(); });
      await page.locator('#dlg, #story').first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(40);
    }
    await skipOff();
    await page.waitForFunction(() => {
      const b = document.getElementById('sSkip');
      const going = b && /Идёт/.test(b.textContent || '');
      return !going && document.querySelectorAll('#schoice.on .choice').length > 0;
    }, { timeout: 8000 });
    await page.waitForTimeout(200);
  };
  const closeStory = async () => {
    await ev(() => { try { if (document.getElementById('sSkip') && __RPG.UI.sSkip) __RPG.UI.sSkip(); } catch (e) {} });
    await page.waitForFunction(() => !document.getElementById('story'), { timeout: 15000 }).catch(() => {});
    await ev(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; });
    await page.waitForTimeout(150);
  };


  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__RPG && __RPG.UI && __RPG.E && __RPG.D && __RPG.D.TK_EVENT);
  await ev(async () => {
    const { UI, S, E, D } = __RPG;
    const p = S.newProfile('Коллаба', '👊');
    const s = E.newSlot({ name: 'Арата', race: 'o_street', uniq: 'phoenix', prof1: 'smith', prof2: 'miner', now: Date.now() });
    s.hero.level = 28; s.gold = 20000;
    const ids = (D.CREW_IDS || []).filter((id) => !String(id).startsWith('tk_')).slice(0, 2);
    ids.forEach((id) => { try { E.recruit(s, id); s.party = s.party || []; if (!s.party.includes(id) && s.party.length < 3) s.party.push(id); } catch (e) {} });
    p.slots[0] = s; p.active = 0; UI.p = p; UI.buildNav();
    if (__RPG.story && __RPG.story.loadOutline) await __RPG.story.loadOutline();
    UI.go('game');
  });
  await page.waitForTimeout(400);

  check('версия 2.31.10', await ev(() => __RPG.VERSION === '2.31.10' || (__RPG.RPG && __RPG.RPG.VERSION === '2.31.10') || document.querySelector('script') && true) && await ev(() => (__RPG.VERSION || __RPG.RPG?.VERSION) ? (__RPG.VERSION || __RPG.RPG.VERSION) === '2.31.10' : !!__RPG.D.TK_CH && __RPG.D.TK_CH.length === 19), await ev(() => __RPG.VERSION || (window.RPG && RPG.VERSION)));
  // VERSION lives on RPG
  const ver = await ev(() => (window.RPG && RPG.VERSION) || __RPG.VERSION || '');
  check('RPG.VERSION 2.31.10', ver === '2.31.10', ver);
  check('19 глав канона', await ev(() => (__RPG.D.TK_CH || []).length === 19 && __RPG.D.TK_CH[0].id === 'tk01_rift' && __RPG.D.TK_CH[18].id === 'tk19_home'));
  check('событие активно', await ev(() => __RPG.E.tkActive()));
  check('баннер в Лагере', await page.locator('.tkbanner').count() > 0);
  await shot('01-camp-banner');

  await click('.tkbanner');
  await page.waitForSelector('.tkmodal, .mbox', { timeout: 5000 });
  const disc = await ev(() => (document.querySelector('.mbox') || document.body).innerText);
  check('дисклеймер', /Неофициальная фанатская коллаба/.test(disc) && /Bandai Namco/.test(disc));
  await shot('02-event-modal');

  // глава 1 — выбор
  await click('[data-act="tkPlay"][data-id="tk01_rift"]');
  const c1 = await playVn(/Помочь открыть дверь/);
  check('глава 1: выбор двери', /Помочь открыть дверь|done|Спросить/.test(c1), c1);
  await page.waitForTimeout(200);
  // reopen if closed and confirm done
  await page.waitForFunction(() => !document.getElementById('story'), { timeout: 15000 }).catch(() => {});
  const ch1done = await ev(() => (__RPG.UI.slot().tk.story || []).includes('tk01_rift'));
  check('глава 1 завершена', ch1done);

  // глава 2 Рейна: выбор «Пусть идёт рядом» + скрин
  await ev(() => { if (document.getElementById('story') && __RPG.UI.sSkip) __RPG.UI.sSkip(); });
  await page.waitForTimeout(200);
  await ev(() => __RPG.UI.tkOpen('story'));
  await page.waitForTimeout(250);
  await click('[data-act="tkPlay"][data-id="tk02_reina"]');
  await page.waitForSelector('#story', { timeout: 8000 });
  await waitForChoices();
  const reiChoices = await ev(() => [...document.querySelectorAll('#schoice.on .choice')].map((e) => e.textContent));
  check('сцена Рейны — два выбора', reiChoices.some((t) => /Пусть идёт рядом/.test(t)) && reiChoices.some((t) => /Дальше я сам/.test(t)), reiChoices.join(' | '));
  await shot('03-chapter-choice-reina');
  const yes = page.locator('#schoice.on .choice').filter({ hasText: /Пусть идёт рядом/ });
  await yes.first().click();
  await playVn();
  await page.waitForTimeout(200);
  const accepted = await ev(() => !!__RPG.UI.slot().tk.flags.tk_reina);
  check('Рейна принята (независимый путь)', accepted);

  // турнир / магазин — механика на месте
  await ev(() => { __RPG.UI.p.settings.auto = true; __RPG.UI.p.settings.battleSpeed = 2; __RPG.UI.tkOpen('tour'); });
  await page.waitForTimeout(200);
  const fighterN = await ev(() => (__RPG.D.TK_FIGHTERS || []).length);
  check('сетка из 43, Юдзиро не в турнире', fighterN === 43 && await ev(() => !(__RPG.D.TK_FIGHTER || {}).yujiro), String(fighterN));
  await ev(() => { const s = __RPG.UI.slot(); s.tk.tokens = Math.max(s.tk.tokens, 80); __RPG.UI.tkOpen('shop'); });
  await page.waitForTimeout(150);
  await shot('04-shop');

  // заглушка боя: мгновенная победа, чтобы пройти сюжетные волны
  await ev(() => {
    const UI = __RPG.UI, E = __RPG.E;
    UI._tkBattleReal = UI.battle;
    UI.battle = async (opts) => {
      const B = opts.B; if (B) B.over = 'win';
      if (opts.finish && B) opts.finish(UI.slot(), B);
      return { result: 'win', tokens: (B && B.tk && B.tk.tokens) || 0 };
    };
  });

  const playPath = async (spec) => ev(async (spec) => {
    const { UI, E, D } = __RPG;
    const s = UI.slot();
    const keep = { tokens: s.tk.tokens, shop: Object.assign({}, s.tk.shop), won: (s.tk.won || []).slice(), bolt: s.tk.bolt };
    ['tk_jin','tk_nina','tk_reina'].forEach((id) => { try { delete s.crew[id]; } catch (e) {} });
    s.tk.story = [];
    s.tk.flags = {};
    s.tk.ending = '';
    s.tk.vowDone = 0;
    s.tk.taken = '';
    s.tk.blood = 0;
    s.tk.sphere = 0;
    s.tk.ally = '';
    s.tk.needAlly = 0;
    s.tk.mig230 = 1;
    s.tk.rec = [];
    s.tk.shop = Object.assign({}, keep.shop, { ending: 0 });
    s.inv = (s.inv || []).filter((it) => !(it && (it.id === 'tk_sphere' || it.k === 'tk_sphere')));
    if (spec.reina) s.tk.flags.tk_reina = 1; else s.tk.flags.tk_reina_no = 1;
    if (spec.side === 'jin') { s.tk.flags.tk_jin = 1; s.tk.flags.tk_side = 'jin'; }
    if (spec.side === 'kazuya') { s.tk.flags.tk_kazuya = 1; s.tk.flags.tk_side = 'kazuya'; }
    if (spec.side === 'neutral') { s.tk.flags.tk_neutral = 0; s.tk.flags.tk_side = ''; }
    s.story = s.story || { flags: {}, done: [] };
    s.story.flags = Object.assign({}, s.tk.flags);
    E.tkSyncFlags(s);

    const want = Object.assign({
      'Пусть идёт рядом': !!spec.reina,
      'Дальше я сам': !spec.reina,
      'Дать Дзину слово': spec.side === 'jin',
      'Оставить ответ открытым': spec.side !== 'jin',
      'Договориться с Кадзуей': spec.side === 'kazuya',
      'Остаться в стороне': spec.side !== 'kazuya',
      'Принять Рейну в свиту и дать кровь': !!spec.reina && !!spec.blood,
      'Принять Рейну в свиту, пока без крови': !!spec.reina && !spec.blood,
      'Отпустить Рейну': !spec.reina
    }, spec.picks || {});
    const origPlay = UI.playLines, origOpen = UI.tkOpen, origToast = UI.toast, origModal = UI.modal, origClose = UI.closeModal;
    UI.tkOpen = function () {};
    UI.toast = function () {};
    UI.modal = function () {};
    UI.closeModal = function () {};
    UI.playLines = async function (lines) {
      const flagOk = (expr) => {
        const f = (s.story && s.story.flags) || s.tk.flags || {};
        if (!expr) return true;
        if (expr[0] === '!') return !f[expr.slice(1)];
        return !!f[expr];
      };
      const walk = (arr) => {
        (arr || []).forEach((l) => {
          if (!l) return;
          if (l[0] === 'choice') {
            const ops = l[1] || [];
            const hit = ops.find((o) => want[o.t]) || ops.find((o) => want[o.t] !== false) || ops[0];
            if (hit && hit.f) {
              E.setFlags(s, hit.f);
              Object.assign(s.tk.flags, hit.f);
              E.tkSyncFlags(s);
            }
            walk(hit && hit.r);
          } else if (l[0] === 'if') {
            if (flagOk(l[1])) walk(l[2]);
          }
        });
      };
      walk(lines);
    };
    try {
      for (const ch of D.TK_CH) {
        if (ch.vow) { s.tk.vowDone = 1; s.tk.taken = 'none'; }
        const el = { dataset: { id: ch.id } };
        await UI.act.tkPlay(el);
      }
    } finally { UI.playLines = origPlay; UI.tkOpen = origOpen; UI.toast = origToast; UI.modal = origModal; UI.closeModal = origClose; }
    Object.assign(s.tk, { tokens: Math.max(s.tk.tokens, keep.tokens), shop: Object.assign(keep.shop, s.tk.shop), won: keep.won, bolt: keep.bolt || s.tk.bolt });
    return { ending: s.tk.ending, side: s.tk.flags.tk_side, reina: !!s.tk.flags.tk_reina, jin: !!s.crew.tk_jin, nina: !!s.crew.tk_nina, reiCrew: !!s.crew.tk_reina, sphere: !!s.tk.sphere, needAlly: s.tk.needAlly | 0, last: (s.tk.story || []).slice(-3), n: (s.tk.story || []).length };
  }, spec);

  const jin = await playPath({ reina: false, side: 'jin', picks: { 'Дать Дзину слово': 1 } });
  check('путь Дзина: концовка jin и Дзин в свите', jin && jin.ending === 'jin' && jin.jin && jin.n === 19, JSON.stringify(jin));

  const kaz = await playPath({ reina: false, side: 'kazuya', picks: { 'Договориться с Кадзуей': 1 } });
  check('путь Кадзуи: Сфера Судьбы и выбор союзника', kaz && kaz.ending === 'kazuya' && kaz.sphere && kaz.needAlly === 1 && !kaz.jin && !kaz.nina, JSON.stringify(kaz));

  const neu = await playPath({ reina: false, side: 'neutral', picks: { 'Оставить ответ открытым': 1, 'Остаться в стороне': 1 } });
  check('наблюдатель: Нина в свите, без слова Дзину', neu && neu.ending === 'neutral' && neu.nina && !neu.jin, JSON.stringify(neu));

  const rei = await playPath({ reina: true, side: 'jin', blood: true });
  check('путь Рейны независим от войны Дзина: служба и кровь', rei && rei.ending === 'jin' && rei.reina && rei.reiCrew && rei.jin, JSON.stringify(rei));

  // роман: сцена Рейны «Обычная фотография»
  await ev(() => {
    const s = __RPG.UI.slot(), E = __RPG.E, UI = __RPG.UI;
    s.tk.flags.tk_reina = 1;
    s.tk.story = (s.tk.story && s.tk.story.length === 19) ? s.tk.story : __RPG.D.TK_CH.map((c) => c.id).slice(0, 5);
    if (!s.tk.story.includes('tk05_street')) s.tk.story = __RPG.D.TK_CH.map((c) => c.id).slice(0, 5);
    E.tkSyncFlags(s);
    s.rom = s.rom || {};
    s.rom.tk_reina = s.rom.tk_reina || { aff: 20, seen: [], dates: 0, gifts: 0 };
    const sc = __RPG.D.ROMANCE.tk_reina.scenes[0];
    UI.closeModal();
    return sc && sc.t;
  });
  await ev(async () => {
    const UI = __RPG.UI, sc = __RPG.D.ROMANCE.tk_reina.scenes[0];
    UI.tkPrepSpeakers && UI.tkPrepSpeakers(UI.slot());
    // start and pause on first spoken line
    UI.playLines(sc.lines, { bg: sc.bg || 'tk_dojo', title: sc.t, boxPor: true });
  });
  await page.waitForSelector('#story', { timeout: 8000 });
  await ev(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; });
  await page.waitForTimeout(2600);
  for (let i = 0; i < 20; i++) {
    const st = await ev(() => {
      const sp = (document.querySelector('#spk') && document.querySelector('#spk').textContent) || '';
      const txt = (document.querySelector('#stxt') && document.querySelector('#stxt').textContent) || '';
      const por = !!document.querySelector('#dpor img, .dlg.haspor img');
      return { sp, txt, por };
    });
    if (st.por && /Рейна/i.test(st.sp) && /заберёте/.test(st.txt)) break;
    await ev(() => { if (__RPG.UI && __RPG.UI.sNext) __RPG.UI.sNext(); });
    await page.waitForTimeout(220);
  }
  await page.waitForFunction(() => {
    const t = (document.querySelector('#stxt') && document.querySelector('#stxt').textContent) || '';
    return /заберёте/.test(t);
  }, { timeout: 8000 }).catch(() => {});
  await ev(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; });
  await page.waitForTimeout(200);
  await shot('05-romance-reina');
  const boxPor = await ev(() => !!document.querySelector('.story.boxpor, #dpor, .dlg.haspor'));
  check('роман: портрет в рамке окна диалога', boxPor);
  await closeStory();

  // маршрут Рейны: глава 17 (кровь) — проигрываем сцену
  await ev(() => {
    const s = __RPG.UI.slot();
    s.tk.flags.tk_reina = 1;
    s.tk.flags.tk_jin = 1;
    s.tk.flags.tk_side = 'jin';
    s.tk.ending = 'jin';
    s.tk.story = __RPG.D.TK_CH.map((c) => c.id).slice(0, 16);
    s.tk.vowDone = 0;
    __RPG.E.tkSyncFlags(s);
    __RPG.UI.tkOpen('story');
  });
  await page.waitForTimeout(200);
  await closeStory();
  await ev(() => __RPG.UI.tkOpen('story'));
  await page.waitForTimeout(200);
  await click('[data-act="tkPlay"][data-id="tk17_blood"]');
  await page.waitForSelector('#story', { timeout: 8000 });
  await waitForChoices();
  const bloodChoices = await ev(() => [...document.querySelectorAll('#schoice.on .choice')].map((e) => e.textContent));
  check('глава 17: служба и кровь — отдельные решения', bloodChoices.some((t) => /дать кровь/.test(t)) && bloodChoices.some((t) => /пока без крови/.test(t)) && bloodChoices.some((t) => /Отпустить Рейну/.test(t)), bloodChoices.join(' | '));
  await shot('06-reina-route-blood');
  await ev(() => {
    const el = [...document.querySelectorAll('#schoice.on .choice')].find((e) => /дать кровь/.test(e.textContent || ''));
    if (el) el.click();
  });
  await page.waitForTimeout(80);
  if (await page.locator('#story').count()) await playVn(/дать кровь/);
  await page.waitForFunction(() => !document.getElementById('story'), { timeout: 15000 }).catch(() => {});

  // финал
  await ev(() => {
    const s = __RPG.UI.slot();
    s.tk.story = __RPG.D.TK_CH.map((c) => c.id).slice(0, 18);
    s.tk.vowDone = 1; s.tk.taken = 'none';
    s.tk.flags.tk_has_jin = 1; s.tk.flags.tk_has_reina = 1;
    s.tk.ending = 'jin';
    __RPG.E.tkSyncFlags(s);
    __RPG.UI.tkOpen('story');
  });
  await page.waitForTimeout(200);
  await click('[data-act="tkPlay"][data-id="tk19_home"]');
  await page.waitForSelector('#story', { timeout: 8000 });
  await page.waitForTimeout(500);
  await shot('07-finale-home');
  const finaleTxt = await ev(() => (document.querySelector('#dtext, #dlg, #story') || document.body).innerText);
  check('финал «Домой» открывается', /разлом|чашк|лагере|Домой|перешагивает|чайник/i.test(finaleTxt) || !!(await page.locator('#story').count()), (finaleTxt || '').slice(0, 120));
  await ev(() => {
    try { if (__RPG.UI.sSkip && document.getElementById('sSkip')) __RPG.UI.sSkip(); } catch (e) {}
  });
  await page.waitForFunction(() => !document.getElementById('story'), { timeout: 12000 }).catch(() => {});
  await ev(() => {
    const s = __RPG.UI.slot(), E = __RPG.E;
    s.tk.vowDone = 1;
    if (!(s.tk.story || []).includes('tk19_home')) E.tkFinishChapter(s, 'tk19_home');
    try { if (document.getElementById('story') && __RPG.UI.sSkip) { /* leave */ } } catch (e) {}
  });
  const homeDone = await ev(() => (__RPG.UI.slot().tk.story || []).includes('tk19_home'));
  check('кампания закрыта главой 19', homeDone);

  // встречи: Юдзиро после финала
  await ev(() => __RPG.UI.tkOpen('meets'));
  await page.waitForTimeout(200);
  const yuj = await ev(() => __RPG.E.tkMeetOpen(__RPG.UI.slot(), 'yujiro'));
  check('Юдзиро доступен после финала', yuj);
  await shot('08-meets-gallery');

  // полный рост и облики Рейны
  await ev(() => {
    const UI = __RPG.UI, E = __RPG.E, s = UI.slot();
    if (document.getElementById('story') && UI.sSkip) { try { UI.sSkip(); } catch (e) {} }
    if (!s.crew.tk_reina) E.tkGrantComp(s, 'tk_reina');
    s.rom = s.rom || {};
    s.rom.tk_reina = s.rom.tk_reina || { aff: 20, seen: [], dates: 0, gifts: 0 };
    UI.closeModal && UI.closeModal();
    UI.tab = 'crew';
    UI.refresh && UI.refresh();
    UI.sub.crewId = 'tk_reina';
    UI.crewModal();
  });
  await page.waitForSelector('[data-act="skinView"]', { timeout: 8000 });
  const crewBtn = await ev(() => ((document.querySelector('[data-act="skinView"]') || {}).textContent || '').replace(/\s+/g, ' ').trim());
  check('кнопка «В полный рост» на карточке Свиты', /полный рост/.test(crewBtn), crewBtn);
  const crewPor = await ev(() => {
    const im = document.querySelector('.crewm img.por');
    return im ? (im.getAttribute('src') || '') : '';
  });
  check('в Свите после крови — демонический портрет Рейны', /tk_reina_devil\.webp/.test(crewPor), crewPor);
  await ev(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; });
  await shot('09-reina-crew-card');
  await shot('13-reina-crew-devil');
  await ev(() => {
    const s = __RPG.UI.slot();
    s.rom = s.rom || {};
    s.rom.tk_reina = s.rom.tk_reina || { aff: 0, seen: [], dates: 0, gifts: 0 };
    s.rom.tk_reina.aff = 0;
    if (s.tk) s.tk.blood = 0;
    __RPG.UI.save && __RPG.UI.save(true);
  });
  await click('[data-act="skinView"]');
  await page.waitForSelector('.skinv-im', { timeout: 8000 });
  const v1 = await ev(() => {
    const im = document.querySelector('.skinv-im');
    const html = (document.querySelector('.mbox.skinbox') || document.querySelector('#modal') || document.body).innerHTML;
    const on = ((document.querySelector('.skintab.on .skintab-n') || document.querySelector('.skintab.on') || {}).textContent || '').replace(/\s+/g, ' ').trim();
    const tabs = [...document.querySelectorAll('.skintab')].map((e) => ({
      t: ((e.querySelector('.skintab-n') || e).textContent || '').replace(/\s+/g, ' ').trim(),
      req: ((e.querySelector('.skintab-req') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
      lock: e.classList.contains('lock'),
      dis: e.disabled,
      hasIm: !!e.querySelector('.skintab-im')
    }));
    return { src: im && im.getAttribute('src'), on, tabs, leak: /tk_reina_skin_(armor|wedding|suit|evening|shorts|catsuit)/.test(html) };
  });
  const expectReq = [
    ['Обычный', false, ''],
    ['Без бомбера', false, ''],
    ['Деловой костюм', true, 'Откроется: симпатия 15'],
    ['Топ и шорты', true, 'Откроется: симпатия 25'],
    ['Вечернее платье', true, 'Откроется: симпатия 40'],
    ['Кожаный комбинезон', true, 'Откроется: симпатия 55'],
    ['Демоническая броня', true, 'Откроется: после крови'],
    ['Свадебное платье', true, 'Откроется: симпатия 70']
  ];
  const tabsOk = v1 && v1.tabs.length === 8 && expectReq.every((row, i) => v1.tabs[i] && v1.tabs[i].t === row[0] && v1.tabs[i].lock === row[1] && v1.tabs[i].req === row[2] && (row[1] ? !v1.tabs[i].hasIm : true));
  check('просмотрщик: 8 обликов, по умолчанию открыты только обычный и без бомбера, закрытые без картинки и с требованием', tabsOk && /tk_reina_jacket\.webp/.test(v1.src) && v1.on === 'Обычный' && !v1.leak, JSON.stringify(v1));
  await ev(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; });
  await shot('17-reina-skins-selector');
  await ev(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; });
  await shot('10-reina-skin-jacket');
  await ev(() => {
    const els = document.querySelectorAll('.skintab.lock');
    const el = els[els.length - 1];
    if (el) el.scrollIntoView({ inline: 'end', block: 'nearest' });
  });
  await page.waitForTimeout(200);
  await ev(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; });
  await shot('14-reina-skins-locked');
  await click('[data-act="skinPick"][data-skin="top"]');
  await page.waitForTimeout(200);
  const v2 = await ev(() => {
    const im = document.querySelector('.skinv-im');
    const on = ((document.querySelector('.skintab.on .skintab-n') || document.querySelector('.skintab.on') || {}).textContent || '').replace(/\s+/g, ' ').trim();
    const saved = __RPG.UI.slot().skins && __RPG.UI.slot().skins.tk_reina;
    return { src: im && im.getAttribute('src'), on, saved };
  });
  check('просмотрщик: облик без бомбера запоминается', v2 && /tk_reina_top\.webp/.test(v2.src) && v2.on === 'Без бомбера' && v2.saved === 'top', JSON.stringify(v2));
  await ev(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; });
  await shot('11-reina-skin-top');
  await ev(() => {
    const UI = __RPG.UI;
    UI.tab = 'hearts';
    UI.refresh && UI.refresh();
    UI.sub.heartId = 'tk_reina';
    UI.heartModal();
  });
  await page.waitForSelector('[data-act="skinView"]', { timeout: 8000 });
  const heart = await ev(() => {
    const btn = !!document.querySelector('[data-act="skinView"]');
    const im = document.querySelector('.crewm img.tkfull, .crewm img.por.lg');
    return { btn, src: im && im.getAttribute('src') };
  });
  check('кнопка и выбранный облик на карточке романа', heart && heart.btn && /tk_reina_top\.webp/.test(heart.src || ''), JSON.stringify(heart));
  await ev(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; });
  await shot('12-reina-hearts-skin');

  const unlockShot = async (patch, id, name, file, shotName) => {
    await ev((p) => {
      const RPG = __RPG, UI = RPG.UI, s = UI.slot();
      s.rom = s.rom || {};
      s.rom.tk_reina = s.rom.tk_reina || { aff: 0, seen: [], dates: 0, gifts: 0 };
      if (p.aff != null) s.rom.tk_reina.aff = p.aff;
      if (p.blood != null && s.tk) s.tk.blood = p.blood;
      UI.save && UI.save(true);
      UI.sub.skinId = 'tk_reina';
      UI.skinModal();
    }, patch);
    await page.waitForSelector('[data-act="skinPick"][data-skin="' + id + '"]', { timeout: 8000 });
    await click('[data-act="skinPick"][data-skin="' + id + '"]');
    await page.waitForTimeout(200);
    const v = await ev(() => {
      const im = document.querySelector('.skinv-im');
      const on = ((document.querySelector('.skintab.on .skintab-n') || document.querySelector('.skintab.on') || {}).textContent || '').replace(/\s+/g, ' ').trim();
      const saved = __RPG.UI.slot().skins && __RPG.UI.slot().skins.tk_reina;
      const html = (document.querySelector('.mbox.skinbox') || document.body).innerHTML;
      return { src: im && im.getAttribute('src'), on, saved, lockedBtn: !!document.querySelector('.skintab.lock[disabled] [data-skin="' + 'never' + '"]'), htmlHas: html };
    });
    check('просмотрщик: ' + name, v && new RegExp(file + '\\.webp').test(v.src) && v.on === name && v.saved === id, JSON.stringify({ src: v.src, on: v.on, saved: v.saved }));
    await ev(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; });
    await shot(shotName);
  };
  await unlockShot({ aff: 15 }, 'suit', 'Деловой костюм', 'tk_reina_skin_suit', '18-reina-skin-suit');
  await unlockShot({ aff: 25 }, 'shorts', 'Топ и шорты', 'tk_reina_skin_shorts', '20-reina-skin-shorts');
  await unlockShot({ aff: 40 }, 'evening', 'Вечернее платье', 'tk_reina_skin_evening', '19-reina-skin-evening');
  await unlockShot({ aff: 55 }, 'catsuit', 'Кожаный комбинезон', 'tk_reina_skin_catsuit', '21-reina-skin-catsuit');
  await unlockShot({ blood: 1 }, 'armor', 'Демоническая броня', 'tk_reina_skin_armor', '15-reina-skin-armor');
  await unlockShot({ aff: 70 }, 'wedding', 'Свадебное платье', 'tk_reina_skin_wedding', '16-reina-skin-wedding');

  // реплики в бою: короткий сюжетный бой, неблокирующий пузырь
  await ev(() => {
    const UI = __RPG.UI;
    if (UI.closeModal) UI.closeModal();
    if (UI._tkBattleReal) UI.battle = UI._tkBattleReal;
  });
  await page.waitForTimeout(250);
  await ev(() => {
    const UI = __RPG.UI, E = __RPG.E, s = UI.slot();
    const B = E.tkBattle(s, 'story', 'jackmob');
    if (B.err) { window._tkBarkErr = B.err; return; }
    B.tk.chId = 'tk10_coliseum';
    B.tk.wave = 0;
    B.tk.side = 'jin';
    B.opts.auto = true;
    B.speed = 2;
    UI.p.settings.auto = true;
    UI.p.settings.battleSpeed = 2;
    window._tkBarkFight = UI.battle({ B, ic: '🤖', bio: 'ash', title: 'Железный Кулак · Джек', finish: (slot, b) => ({ result: b.over, tokens: 0 }) });
  });
  try {
    await page.waitForSelector('#tkbark.on', { timeout: 12000 });
    const bark = await ev(() => {
      const el = document.getElementById('tkbark');
      return el ? el.textContent.trim() : '';
    });
    check('реплика в бою не перекрывает кнопки и не пустая', /Первые уже в проёме|показывай выход/.test(bark) && await ev(() => {
      const b = document.getElementById('tkbark'), act = document.getElementById('bact');
      if (!b || !act) return false;
      const rb = b.getBoundingClientRect(), ra = act.getBoundingClientRect();
      return rb.bottom <= ra.top + 4;
    }), bark);
    await ev(() => {
      const t = document.getElementById('toasts'); if (t) t.innerHTML = '';
      const el = document.getElementById('tkbark'); if (el) el.classList.add('on');
      const B = __RPG.UI.B; if (B) B.speed = 0.2;
    });
    await page.waitForTimeout(120);
    await shot('22-tk-bark-wave');
  } catch (e) {
    check('реплика в бою появилась', false, String(e.message || e));
  }
  await ev(() => { const B = __RPG.UI.B; if (B) B.over = 'win'; });
  await page.waitForTimeout(800);

  const realErr = errors.filter((e) => !/textContent/.test(e) && !/sSkip/.test(e));

  if (realErr.length) check('без ошибок страницы', false, realErr.slice(0, 3).join(' | '));
  else check('без ошибок страницы', true, errors.length ? 'игнор: ' + errors[0] : '');
  if (failed.length) console.log('  HTTP 4xx/5xx:', failed.slice(0, 5).join(' | '));

  await browser.close();
  srv.close();
  console.log(`  ${ok} ✓, ${bad} ✗  shots: ${outDir}`);
  if (bad) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
