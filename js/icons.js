/* v2.27.1: аниме-иконки для систем фаз 1–3. Если img/icons/<id>.webp есть (список ниже обновляет tools/icons-index.js) — картинка,
   иначе — прежний эмодзи. Перечень и промпты — tools/icon-list.js. */
(function () {
  const RPG = globalThis.RPG, D = RPG.D, UI = RPG.UI;
  D.ICON_HAVE = ["ach_arts","ach_craft","ach_crew","ach_gather","ach_gold","ach_kills","ach_level","ach_pets","ach_power","ach_runs","ach_story","ach_wins","act_ach","act_afk","act_arena","act_camp","act_chest","act_daily","act_farm","act_fish","act_house","act_login","act_merchant","act_tower","act_train","arena_bronze","arena_diamond","arena_gold","arena_plat","arena_silver","cur_egg","cur_energy","cur_food","cur_gold","cur_rating","cur_sig","ev_fair","ev_fish","ev_harvest","ev_stars","mat_asc_sigil","mat_cloth","mat_dust","mat_ess","mat_ess_l","mat_fang","mat_fish_gold","mat_fish_i","mat_fish_m","mat_fish_s","mat_fish_star","mat_gem_ae","mat_gem_fr","mat_herb_b","mat_herb_g","mat_herb_r","mat_herb_s","mat_hide","mat_ing_cu","mat_ing_fe","mat_ing_ms","mat_leather","mat_meat","mat_myth_blood","mat_nimbus_shard","mat_ore_cu","mat_ore_fe","mat_ore_ms","mat_phoenix_f","mat_prov","mat_seed_g","mat_silk","mat_spice","mat_star_ore","ph_dawn","ph_day","ph_dusk","ph_night","room_bed","room_garden","room_pond","room_work","title_angler","title_arena","title_beast","title_bossbane","title_chron","title_farmer","title_king","title_rich","title_slayer","title_tower","title_tower50"]; // @icons-have
  const have = new Set(D.ICON_HAVE);
  UI.hasIcon = (id) => have.has(id);
  UI.gi = (id, emo, cls) => (have.has(id) ? `<img class="gic ${cls || ''}" src="img/icons/${id}.webp" alt="" draggable="false" loading="lazy" decoding="async">` : `<span class="gie ${cls || ''}">${emo || ''}</span>`);
  UI.matIc = (m, cls) => UI.gi('mat_' + m, D.MATS[m] ? D.MATS[m].ic : '', cls);
})();
