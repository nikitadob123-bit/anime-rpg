/* v2.28.1: арты особых подземелий и испытаний. Если img/dungeons/<id>.webp есть (список обновляет tools/dungeon-art-index.js) — картинка, иначе прежняя заглушка. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, UI = RPG.UI;
  D.DUN_ART_HAVE = ["arena","art","gold","mats","tower","train"]; // @dun-art-have
  const have = new Set(D.DUN_ART_HAVE);
  UI.hasDunArt = (id) => have.has(id);
  UI.dunArt = (id, emo) => (have.has(id)
    ? `<img src="img/dungeons/${id}.webp" alt="" width="512" height="512" loading="lazy" decoding="async" draggable="false">`
    : `<span>${emo || ''}</span>`);
  UI.dunArtBox = (id, emo) => `<div class="dic adic${have.has(id) ? ' hasart' : ''}">${UI.dunArt(id, emo)}</div>`;
})();
