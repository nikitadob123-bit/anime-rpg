/* v2.18.2 «🔄 Обновить игру»: версия, проверка новой (sw.js с cache:no-store), мгновенное обновление без потери сохранений.
   Сохранения живут в localStorage/IndexedDB — их не трогаем; чистим только Cache Storage (файлы игры). */
(function () {
  const RPG = globalThis.RPG, UI = RPG.UI;
  RPG.VERSION = '2.28.0';   // = package.json = sw.js (проверяет test/run.js)
  const U = RPG.UPD = { latest: null, status: '', busy: false };
  const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
  U.cmp = cmp;
  const paint = () => { const el = document.getElementById('updStat'); if (el) el.innerHTML = U.html(); const b = document.getElementById('updBtn'); if (b) b.disabled = U.busy; };
  const set = (s) => { U.status = s; paint(); };
  U.html = () => `Версия: <b>${RPG.VERSION}</b>${U.latest ? ` · последняя: <b>${U.latest}</b>` : ''}${U.status ? `<br><span class="${/последняя|готово/i.test(U.status) ? 'ok' : /Ошибка|нет сети/i.test(U.status) ? 'dnz' : 'gold'}">${U.status}</span>` : ''}`;
  U.check = async function () {
    set('Проверяю…');
    try {
      const t = await (await fetch('sw.js?v=' + Date.now(), { cache: 'no-store' })).text();
      const m = /arpg-v(\d+\.\d+\.\d+)/.exec(t); if (!m) throw new Error('нет версии');
      U.latest = m[1]; const newer = cmp(U.latest, RPG.VERSION) > 0; set(newer ? 'Доступно обновление' : 'У вас последняя версия'); return newer;
    } catch (e) { set('Не удалось проверить — нет сети?'); return null; }
  };
  U.update = async function () {
    if (U.busy) return; U.busy = true;
    try {
      if (UI.p) UI.save(true);   // 1) сначала — сохранение (localStorage); его не очищаем
      set('Обновляю…');
      const sw = navigator.serviceWorker, reg = sw && await sw.getRegistration();
      let reloaded = false; const go = () => { if (reloaded) return; reloaded = true; if (UI.p) UI.save(true); const u = new URL(location.href); u.searchParams.set('u', Date.now()); location.replace(u.toString()); };
      if (sw) sw.addEventListener('controllerchange', go, { once: true });
      if (reg) {
        try { await reg.update(); } catch (e) { /* офлайн — перезагрузимся тем, что есть */ }
        const w = reg.waiting || reg.installing;
        if (w) { if (w.state !== 'installed') await new Promise((r) => { const f = () => { if (w.state === 'installed' || w.state === 'activated' || w.state === 'redundant') { w.removeEventListener('statechange', f); r(); } }; w.addEventListener('statechange', f); setTimeout(r, 15000); }); (reg.waiting || w).postMessage('SKIP_WAITING'); }
      }
      if (self.caches) { const ks = await caches.keys(); await Promise.all(ks.filter((k) => !(RPG.UPD.latest && k.startsWith('arpg-v' + RPG.UPD.latest))).map((k) => caches.delete(k))); }   // старые кэши файлов игры
      setTimeout(go, reg && reg.waiting ? 4000 : 1200);   // запасной путь, если controllerchange не придёт
    } catch (e) { U.busy = false; set('Ошибка обновления: ' + e.message); }
  };
  UI.act.updCheck = () => U.check();
  UI.act.updGo = async () => { if (U.latest == null) { const n = await U.check(); if (n === false && !confirm('У вас последняя версия. Всё равно перезагрузить игру с очисткой кэша файлов? Сохранения не пострадают.')) return; } U.update(); };
  UI.updCard = () => `<div class="card col gap updcard"><b>🔄 Обновление игры</b><div class="small" id="updStat">${U.html()}</div><div class="row gap wrap"><button class="btn small" id="updBtn" data-act="updGo"${U.busy ? ' disabled' : ''}>🔄 Обновить игру</button><button class="btn ghost small" data-act="updCheck">Проверить</button></div><div class="small dim">Сначала игра сохраняется; сохранения не удаляются — обновляются только файлы игры.</div></div>`;
  // баннер «Доступно обновление» при обнаружении нового SW на запуске
  U.banner = function () {
    if (document.getElementById('updBan')) return;
    const b = document.createElement('button'); b.id = 'updBan'; b.className = 'updban'; b.innerHTML = '🔄 Доступно обновление — <b>Обновить</b>';
    b.onclick = () => { b.remove(); U.update(); }; document.body.appendChild(b); setTimeout(() => b.remove(), 20000);
  };
})();
