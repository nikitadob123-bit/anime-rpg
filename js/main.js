/* Запуск: PWA, навигация, автосохранение */
(function () {
  const RPG = globalThis.RPG, UI = RPG.UI, S = RPG.S, F = RPG.F;
  const boot = () => {
    UI.$('#nav').innerHTML = UI.TABS.map(([t, ic, n]) => `<button data-act="tab" data-t="${t}" data-quiet="1" aria-label="${n}"><span>${ic}</span><em>${n}</em></button>`).join('');
    try { F.init(document.getElementById('fx')); } catch (e) { console.error(e); }
    try { localStorage.setItem('arpg.test', '1'); localStorage.removeItem('arpg.test'); } catch (e) {
      document.getElementById('view').innerHTML = '<div class="screen"><h2>Хранилище недоступно</h2><p class="dim">Браузер запретил localStorage (режим инкогнито или блокировка). Игра не сможет сохраняться.</p></div>'; S.store = (function () { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; })();
    }
    UI.go('title');
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden && UI.p) UI.save(true); });
  window.addEventListener('pagehide', () => { if (UI.p) UI.save(true); });
  window.addEventListener('error', (e) => console.error('window.error', e.message));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => { const nw = reg.installing; if (!nw) return; nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) UI.toast('Доступно обновление — перезапустите игру', 'gold'); }); });
      }).catch((e) => console.warn('sw', e));
    });
  }
  window.__RPG = RPG;
})();
