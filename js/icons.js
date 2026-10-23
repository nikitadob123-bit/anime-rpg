/* v2.27.1: аниме-иконки для систем фаз 1–3. Если img/icons/<id>.webp есть (список ниже обновляет tools/icons-index.js) — картинка,
   иначе — прежний эмодзи. Перечень и промпты — tools/icon-list.js. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, UI = RPG.UI;
  D.ICON_HAVE = []; // @icons-have
  const have = new Set(D.ICON_HAVE);
  UI.hasIcon = (id) => have.has(id);
  UI.gi = (id, emo, cls) => (have.has(id) ? `<img class="gic ${cls || ''}" src="img/icons/${id}.webp" alt="" draggable="false" loading="lazy" decoding="async">` : `<span class="gie ${cls || ''}">${emo || ''}</span>`);
  UI.matIc = (m, cls) => UI.gi('mat_' + m, D.MATS[m] ? D.MATS[m].ic : '', cls);
})();
