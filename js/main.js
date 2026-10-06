/* Запуск: PWA, навигация, автосохранение */
(function () {
  const RPG = globalThis.RPG, UI = RPG.UI, S = RPG.S, F = RPG.F;
  const NAV_PRIMARY = ['city', 'story', 'hero', 'crew'];
  const NAV_IC = {'city': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20h16M6 20V10l6-4 6 4v10M10 20v-5h4v5"/><path d="M9 10h.01M15 10h.01"/></svg>', 'story': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 4h9a3 3 0 0 1 3 3v13H8a2 2 0 0 0-2 2V4z"/><path d="M6 4a2 2 0 0 0-2 2v14"/><path d="M9 8h6M9 12h6"/></svg>', 'hero': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3 14.5 7H19l-3 3.2L17.5 15 12 12.2 6.5 15 8 10.2 5 7h4.5L12 3z"/><path d="M8 18h8M7 21h10"/></svg>', 'crew': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="2.5"/><circle cx="6.5" cy="9.5" r="2"/><circle cx="17.5" cy="9.5" r="2"/><path d="M4 19c0-2.5 2-4.5 4.5-4.5.9 0 1.7.3 2.4.7M20 19c0-2.5-2-4.5-4.5-4.5-.9 0-1.7.3-2.4.7M12 13.5c-2.8 0-5 2-5 5.5h10c0-3.5-2.2-5.5-5-5.5z"/></svg>', 'mail': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="m3.8 7.2 8.2 6.3 8.2-6.3"/></svg>', 'more': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/></svg>', 'dun': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 21V10l4-3 4 3v11"/><path d="M5 21h14M10 14h4"/></svg>', 'skills': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3.5 13.6 9H19l-4.2 3.2L16.4 18 12 14.8 7.6 18l1.6-5.8L5 9h5.4L12 3.5z"/></svg>', 'hearts': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20.2 4.8 13.5c-1.8-1.9-1.8-4.9.2-6.6 1.8-1.5 4.5-.2 5.8 1.4L12 10l1.2-1.7c1.3-1.6 4-2.9 5.8-1.4 2 1.7 2 4.7.2 6.6L12 20.2z"/></svg>', 'prof': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 18h16M7 18V9l5-4 5 4v9"/><path d="M10 18v-4h4v4"/></svg>', 'inv': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>', 'set': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6"/></svg>'};
  // thin gold line icons; «Ещё» открывает остальные вкладки, скрытые кнопки остаются в #nav для e2e
  UI.buildNav = function () {
    const labels = Object.fromEntries(UI.TABS.map(([t, , n]) => [t, n]));
    labels.city = 'Лагерь'; labels.more = 'Ещё';
    const btn = (t, extra) => `<button data-act="tab" data-t="${t}" data-quiet="1" aria-label="${labels[t] || t}" class="${extra || ''}"><span class="nic">${NAV_IC[t] || '·'}</span><em>${labels[t] || t}</em></button>`;
    const primary = NAV_PRIMARY.map((t) => btn(t)).join('');
    const more = `<button data-act="navMore" data-quiet="1" aria-label="Ещё" class="nav-more"><span class="nic">${NAV_IC.more}</span><em>Ещё</em></button>`;
    const ghost = UI.TABS.filter(([t]) => !NAV_PRIMARY.includes(t)).map(([t]) => btn(t, 'navx')).join('');
    UI.$('#nav').innerHTML = primary + more + ghost;
  };
  UI.act.navMore = function () {
    const labels = Object.fromEntries(UI.TABS.map(([t, , n]) => [t, n]));
    const rest = UI.TABS.filter(([t]) => !NAV_PRIMARY.includes(t));
    const rows = rest.map(([t]) => `<button class="card tap moreitem" data-act="tab" data-t="${t}" data-quiet="1"><span class="nic">${NAV_IC[t] || ''}</span><b>${labels[t]}</b>${t === 'mail' && UI.mailCount && UI.mailCount() ? `<span class="nb mnb">${UI.mailCount()}</span>` : ''}<span class="chev">›</span></button>`).join('');
    UI.modal(`<h3>Ещё</h3><div class="col gap morelist">${rows}</div><button class="btn ghost wide" data-act="closeModal">Закрыть</button>`);
  };
  // закрыть «Ещё» при переключении вкладки из меню
  const tab0 = UI.act.tab;
  UI.act.tab = function (el) {
    if (document.getElementById('modal') && document.getElementById('modal').classList.contains('on')) UI.closeModal();
    return tab0.call(UI, el);
  };
  const boot = () => {
    UI.buildNav();
    try { F.init(document.getElementById('fx')); } catch (e) { console.error(e); }
    try { localStorage.setItem('arpg.test', '1'); localStorage.removeItem('arpg.test'); } catch (e) {
      document.getElementById('view').innerHTML = '<div class="screen"><h2>Хранилище недоступно</h2><p class="dim">Браузер запретил localStorage (режим инкогнито или блокировка). Игра не сможет сохраняться.</p></div>'; S.store = (function () { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; })();
    }
    UI.loadManifest().finally(() => { const f = UI.cgFile('halo_city'); if (f) document.body.style.setProperty('--title-cg', `url(${new URL('assets/vn/' + f, location.href).href})`); UI.go('title'); });
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
