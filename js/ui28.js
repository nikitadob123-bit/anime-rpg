/* v2.28 «Тронный облик»: только оформление. Фон-иллюстрация за каждым разделом (фиксированный слой с виньеткой и медленным дрейфом),
   орнаментальные заголовки. Механики и содержимое не меняются. */
(function () {
  const RPG = globalThis.RPG, UI = RPG.UI;
  const BG = { city: 'camp', mail: 'camp', story: 'camp', dun: 'expedition', hero: 'throne', skills: 'throne', inv: 'throne', prof: 'throne', set: 'throne', crew: 'court', hearts: 'court' };
  UI.BG_OF = BG;
  let layer = null, cur = '';
  const ensure = () => {
    if (layer || typeof document === 'undefined') return layer; layer = document.createElement('div'); layer.id = 'bgl'; layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = ['camp', 'expedition', 'throne', 'court'].map((k) => `<i class="bgi bg-${k}" data-k="${k}"></i>`).join('') + '<b class="bgv"></b>';
    document.body.insertBefore(layer, document.body.firstChild); return layer;
  };
  UI.setBg = function (k) {
    if (!ensure() || k === cur) return; cur = k; document.body.dataset.bg = k || '';
    layer.querySelectorAll('.bgi').forEach((i) => { const on = i.dataset.k === k; if (on && !i.dataset.ld) { i.style.backgroundImage = `url(assets/bg/${k}.webp)`; i.dataset.ld = '1'; } i.classList.toggle('on', on); });
  };
  const _rg = UI.renderGame;
  UI.renderGame = function () { const r = _rg.apply(this, arguments); try { UI.setBg(BG[UI.tab] || 'camp'); } catch (e) { /* ignore */ } return r; };
  const _b = UI.battle;
  if (_b) UI.battle = async function () { const prev = cur; UI.setBg('expedition'); try { return await _b.apply(this, arguments); } finally { UI.setBg(BG[UI.tab] || prev || 'camp'); } };
  // модальные окна Башни/Арены — на фоне пустошей, пока открыты
  ['towerOpen', 'arenaOpen'].forEach((a) => { const f = UI.act[a]; if (f) UI.act[a] = function () { UI.setBg('expedition'); return f.apply(this, arguments); }; });
  const _cm = UI.closeModal; UI.closeModal = function () { const r = _cm.apply(this, arguments); try { if (UI.v === 'game' && !document.getElementById('battle')) UI.setBg(BG[UI.tab] || 'camp'); } catch (e) { /* ignore */ } return r; };
  const _vw = UI.render; if (_vw) UI.render = function () { const r = _vw.apply(this, arguments); try { if (UI.v !== 'game') UI.setBg('throne'); } catch (e) { /* ignore */ } return r; };
})();
/* радужные рамки высокой редкости: вещи от Мифического, питомцы от Легендарного, артефакты от Мифического; сильнее — выше */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, UI = RPG.UI; if (typeof document === 'undefined') return;
  const ARTM = (D.ART_RAR || []).findIndex((r) => r.id === 'mythic');
  const mark = (el, lv) => { if (lv <= 0) return; el.classList.add('irid'); if (lv > 1) el.classList.add('irid2'); };
  const pass = (root) => {
    root.querySelectorAll('.rar').forEach((el) => { const m = /\br(\d+)\b/.exec(el.className); if (m) { const r = +m[1]; mark(el, r >= 7 ? 2 : r >= 6 ? 1 : 0); } });
    root.querySelectorAll('[data-act="petOpen"][data-id]').forEach((el) => { const p = D.PET && D.PET[el.dataset.id]; if (p) mark(el, p.r >= 5 ? 2 : p.r >= 4 ? 1 : 0); });
    root.querySelectorAll('[data-act="artOpen"][data-id]').forEach((el) => { const a = D.ART && D.ART[el.dataset.id]; if (a && ARTM >= 0) mark(el, a.r > ARTM ? 2 : a.r >= ARTM ? 1 : 0); });
  };
  let q = 0; const run = () => { q = 0; ['view', 'modal'].forEach((id) => { const r = document.getElementById(id); if (r) pass(r); }); };
  const start = () => { ['view', 'modal'].forEach((id) => { const r = document.getElementById(id); if (r) new MutationObserver(() => { if (!q) q = requestAnimationFrame(run); }).observe(r, { childList: true, subtree: true }); }); run(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  UI.iridPass = run;
})();
