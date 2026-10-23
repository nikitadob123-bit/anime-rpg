/* Перечень иконок фаз 1–3 (и очевидных заглушек): [id, эмодзи-запасной, англ. предмет для промпта]. node tools/icon-list.js → /workspace/icon-requests.json */
const L = [
  ['cur_gold', '🪙', 'a stack of shining gold coins with a demon crown emblem'], ['cur_food', '🍖', 'a juicy roasted meat on the bone, pet food'], ['cur_sig', '🔱', 'a glowing golden trident ascension sigil'],
  ['cur_egg', '🥚', 'a magical speckled creature egg with soft glow'], ['cur_energy', '⚡', 'a crackling violet lightning energy crystal'], ['cur_rating', '🏆', 'a golden arena trophy cup'],
  ['mat_ore_cu', '🟤', 'a chunk of raw copper ore'], ['mat_ore_fe', '⚙️', 'a chunk of raw iron ore with metallic veins'], ['mat_ore_ms', '🌙', 'a chunk of moon silver ore glowing pale blue'],
  ['mat_gem_ae', '💠', 'a faceted cyan ether crystal'], ['mat_gem_fr', '♦️', 'a dark red abyss ruby gem'], ['mat_ing_cu', '🟧', 'a polished copper ingot'], ['mat_ing_fe', '⬜', 'a polished steel ingot'],
  ['mat_ing_ms', '🔷', 'a moon silver ingot with blue shimmer'], ['mat_herb_g', '🌿', 'a bundle of green meadow herb with tiny white flowers'], ['mat_herb_b', '🍃', 'a misty blue-green mistleaf herb'],
  ['mat_herb_r', '🥕', 'a crimson magic root with glowing tips'], ['mat_herb_s', '🌸', 'a starflower blossom with glowing star-shaped petals'], ['mat_hide', '🟫', 'a rolled raw animal hide'],
  ['mat_leather', '🧶', 'a folded piece of tanned leather with stitching'], ['mat_fang', '🦷', 'a large sharp beast fang'], ['mat_silk', '🕸️', 'a spool of shimmering spider silk'],
  ['mat_cloth', '🧵', 'a folded bolt of rough linen cloth'], ['mat_fish_s', '🐟', 'a river perch fish'], ['mat_fish_m', '🐠', 'a swamp catfish with whiskers'], ['mat_fish_i', '🐡', 'an icy blue burbot fish with frost crystals'],
  ['mat_meat', '🍖', 'a raw cut of red meat'], ['mat_dust', '✨', 'a small pile of sparkling magic dust'], ['mat_ess', '🌑', 'a vial of swirling shadow essence'], ['mat_ess_l', '🌟', 'a vial of radiant light essence'],
  ['mat_spice', '🧂', 'a small pouch of colorful spices'], ['mat_prov', '🎒', 'an adventurer provisions backpack'], ['mat_asc_sigil', '🔱', 'a golden ascension sigil medallion'], ['mat_star_ore', '🌠', 'a star ore rock with embedded glowing stars'],
  ['mat_phoenix_f', '🪶', 'a fiery phoenix feather'], ['mat_myth_blood', '🩸', 'a crystal flask of glowing mythic blood'], ['mat_nimbus_shard', '💫', 'a holy halo shard of golden light'],
  ['mat_fish_gold', '🐠', 'a golden koi carp with shining scales'], ['mat_fish_star', '🌟', 'a luminous night fish glowing white and blue with star patterns'], ['mat_seed_g', '🌱', 'a small cloth pouch of seeds with a sprout'],
  ['act_fish', '🎣', 'a fishing rod with a red float over water'], ['act_farm', '🌱', 'a small garden bed with sprouting herbs'], ['act_house', '🏠', 'a cozy fantasy cottage with glowing windows'],
  ['act_merchant', '🧺', 'a wandering merchant basket full of goods'], ['act_tower', '🗼', 'a tall dark trial tower piercing the clouds'], ['act_arena', '⚔️', 'two crossed swords over an arena shield'],
  ['act_train', '🏋️', 'a wooden training dummy with a sword'], ['act_daily', '📅', 'a magic quest scroll with a calendar seal'], ['act_ach', '🏆', 'an ornate achievement medal with ribbon'],
  ['act_afk', '🌙', 'a crescent moon over a campfire, night watch'], ['act_login', '🔥', 'a magical flame of a login streak'], ['act_chest', '🎁', 'an ornate treasure chest overflowing with gold'], ['act_camp', '🏕️', 'a camp tent with a banner and campfire'],
  ['room_garden', '🌳', 'a small magical garden tree with fruits'], ['room_pond', '🎣', 'a tiny pond with lily pads and a koi'], ['room_bed', '🛏️', 'a royal canopy bed with purple drapes'], ['room_work', '🛠️', 'a crafting workbench with hammer and tools'],
  ['ev_fish', '🎣', 'a festival fishing lantern over a lake with leaping fish'], ['ev_harvest', '🌾', 'a harvest festival sheaf of wheat with a pumpkin'], ['ev_fair', '🏮', 'a red paper lantern of the moon fair'], ['ev_stars', '🌠', 'a starfall night sky with shooting stars'],
  ['ph_dawn', '🌅', 'a sunrise over mountains'], ['ph_day', '☀️', 'a bright stylized sun'], ['ph_dusk', '🌇', 'a sunset with orange clouds'], ['ph_night', '🌙', 'a crescent moon with stars'],
  ['ach_kills', '⚔️', 'a demon sword with a dark aura'], ['ach_runs', '🗺️', 'an old adventure map with a route'], ['ach_wins', '👑', 'a defeated boss crown'], ['ach_craft', '⚒️', 'crossed smithing hammers over an anvil'],
  ['ach_gather', '⛏️', 'a pickaxe stuck in a glowing ore'], ['ach_gold', '🪙', 'an overflowing royal treasury chest of gold'], ['ach_level', '⭐', 'a golden star of ascension'], ['ach_story', '📜', 'an ancient chronicle scroll'],
  ['ach_crew', '👥', 'a royal court banner with three silhouettes'], ['ach_pets', '🐾', 'a glowing pet paw print'], ['ach_arts', '🏺', 'an ancient relic urn'], ['ach_power', '💪', 'a demon king fist with dark aura'],
  ['title_king', '🎖️', 'a demon king crown badge'], ['title_slayer', '🎖️', 'a monster slayer badge with claw marks'], ['title_bossbane', '🎖️', 'a boss slayer skull badge'], ['title_rich', '🎖️', 'a golden king coin badge'],
  ['title_chron', '🎖️', 'a quill and book chronicler badge'], ['title_beast', '🎖️', 'a beast master badge with a paw'], ['title_tower50', '🎖️', 'a sky climber badge with a tower and wings'], ['title_tower', '🎖️', 'a tower conqueror badge with a crown on a tower'],
  ['title_arena', '🎖️', 'an arena champion laurel badge'], ['title_angler', '🎖️', 'a sea wolf anchor and fish badge'], ['title_farmer', '🎖️', 'a good master badge with a house and wheat'],
  ['arena_bronze', '🥉', 'a bronze league emblem'], ['arena_silver', '🥈', 'a silver league emblem'], ['arena_gold', '🥇', 'a gold league emblem'], ['arena_plat', '💠', 'a platinum league emblem'], ['arena_diamond', '💎', 'a diamond league emblem']];
if (typeof module !== 'undefined') module.exports = L;
if (require.main === module) {
  const out = L.map(([id, , subj]) => ({ id, targetPath: 'img/icons/' + id + '.webp', prompt: `anime-style fantasy RPG game icon of ${subj}, single centered object, dark navy background, soft rim light, vibrant colors, clean painterly cel shading, crisp outline, no text, square composition` }));
  require('fs').writeFileSync('/workspace/icon-requests.json', JSON.stringify(out, null, 1)); console.log(out.length);
}
