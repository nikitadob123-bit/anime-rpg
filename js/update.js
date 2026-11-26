/* v2.31.3 «🔄 Обновить игру»: прогресс, сеть для проверки, принудительный сброс кэша файлов если новый SW не встал.
   Сохранения живут в localStorage/IndexedDB — их не трогаем; чистим только Cache Storage (файлы игры). */
(function () {
  const RPG = globalThis.RPG, UI = RPG.UI;
  RPG.VERSION = '2.33.0';  // ранги Рейны
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
    let watchdog;
    try {
      if (UI.p) UI.save(true);   // сначала — сохранение (localStorage); его не очищаем
      set('Обновляю… сохранил игру');
      const sw = navigator.serviceWorker;
      let reloaded = false, finishing = false;
      const go = () => {
        if (reloaded) return; reloaded = true;
        if (watchdog) clearTimeout(watchdog);
        if (UI.p) UI.save(true);
        set('Готово, перезагружаю…');
        const u = new URL(location.href); u.searchParams.set('u', Date.now()); location.replace(u.toString());
      };
      const hard = async () => {
        if (reloaded || finishing) return; finishing = true;
        if (watchdog) clearTimeout(watchdog);
        set('Принудительное обновление… сбрасываю кэш файлов');
        if (UI.p) UI.save(true);
        try { if (sw) { const regs = await sw.getRegistrations(); await Promise.all(regs.map((r) => r.unregister())); } } catch (e) { /* продолжаем сброс кэша */ }
        try { if (self.caches) { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); } } catch (e) { /* перезагрузимся без кэша SW */ }
        const u = new URL(location.href); u.searchParams.set('u', Date.now()); location.replace(u.toString());
      };
      watchdog = setTimeout(hard, 20000);
      if (sw) sw.addEventListener('controllerchange', go, { once: true });
      const reg = sw && await sw.getRegistration();
      if (reg) {
        set('Обновляю… загружаю новую версию');
        try { await reg.update(); } catch (e) { /* офлайн — перезагрузимся тем, что есть */ }
        const w = reg.waiting || reg.installing;
        if (w) {
          set('Обновляю… устанавливаю');
          if (w.state !== 'installed' && w.state !== 'activated') {
            await new Promise((r) => {
              const f = () => { if (w.state === 'installed' || w.state === 'activated' || w.state === 'redundant') { w.removeEventListener('statechange', f); r(); } };
              w.addEventListener('statechange', f); setTimeout(r, 18000);
            });
          }
          if (reg.waiting || w.state === 'installed') (reg.waiting || w).postMessage('SKIP_WAITING');
          set('Обновляю… активирую');
        }
      }
      // Нормальный путь: старые кэши не трогаем до активации нового SW (это делает обработчик activate).
    } catch (e) { if (watchdog) clearTimeout(watchdog); U.busy = false; set('Ошибка обновления: ' + e.message); }
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
