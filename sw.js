/* Service worker: ядро (html/css/js) — обязательный прекеш с cache:'reload' и повторами; картинки/фоны — по возможности, сбой не срывает установку. Fetch: навигация и js/css — сеть первая, офлайн из кэша; картинки — сначала кэш. */
const VERSION = 'arpg-v2.31.5';
const CORE = `${VERSION}-core`, RUNTIME = `${VERSION}-rt`;
const ASSETS = [
  './', 'index.html', 'manifest.json', 'css/style.css', 'css/vn.css', 'css/demon.css', 'css/mail.css', 'css/gear.css', 'css/craft.css', 'css/crown.css', 'css/artifact.css', 'css/pets.css', 'css/goals.css', 'css/challenge.css', 'css/life.css', 'css/ui28.css', 'css/tekken.css', 'assets/bg/camp.webp', 'assets/bg/expedition.webp', 'assets/bg/throne.webp', 'assets/bg/court.webp', 'assets/vn/hero_demon_neutral.webp', 'fonts/ruslan.woff2', 'fonts/philosopher.woff2',
  'js/data-core.js', 'js/data-stats.js', 'js/data-maou.js', 'js/data-maou2.js', 'js/data-prof.js', 'js/data-world.js', 'js/data-world2.js', 'js/data-crew.js', 'js/data-theme.js', 'js/data-story.js', 'js/data-story2.js', 'js/data-story3.js', 'js/data-romance.js',
  'js/portrait.js', 'js/engine.js', 'js/stats.js', 'js/gear.js', 'js/combat.js', 'js/crew.js', 'js/save.js', 'js/artifact.js', 'js/dungeons-sp.js', 'js/pets.js', 'js/allies.js', 'js/goals.js', 'js/challenge.js', 'js/life.js', 'js/tekken.js', 'js/tekken-roster.js', 'js/tekken-story.js', 'js/tekken-romance.js', 'js/tekken-meet.js', 'js/data-craft-icons.js', 'js/craft.js', 'js/mail.js', 'js/audio.js', 'js/fx.js', 'js/ui.js', 'js/icons.js', 'js/dungeon-art.js', 'img/dungeons/art.webp', 'img/dungeons/gold.webp', 'img/dungeons/mats.webp', 'img/dungeons/tower.webp', 'img/dungeons/arena.webp', 'img/dungeons/train.webp', 'img/tekken/banner.webp', 'img/tekken/bg_arena.webp', 'img/tekken/bg_dojo.webp', 'img/tekken/tk_bolt.webp', 'img/tekken/tk_deviljin.webp', 'img/tekken/tk_event.webp', 'img/tekken/tk_frame.webp', 'img/tekken/tk_frame_dlg.webp', 'img/tekken/tk_gene.webp', 'img/tekken/tk_gloves.webp', 'img/tekken/tk_heihachi.webp', 'img/tekken/tk_hwoarang.webp', 'img/tekken/tk_jin.webp', 'img/tekken/tk_jun.webp', 'img/tekken/tk_kazuya.webp', 'img/tekken/tk_king.webp', 'img/tekken/tk_lars.webp', 'img/tekken/tk_law.webp', 'img/tekken/tk_nina.webp', 'img/tekken/tk_pack_m.webp', 'img/tekken/tk_pack_s.webp', 'img/tekken/tk_paul.webp', 'img/tekken/tk_rec_jin.webp', 'img/tekken/tk_rec_nina.webp', 'img/tekken/tk_title.webp', 'img/tekken/tk_token.webp', 'img/tekken/tk_reina.webp', 'img/tekken/tk_reina_jacket.webp', 'img/tekken/tk_reina_top.webp', 'img/tekken/tk_reina_top_bust.webp', 'img/tekken/tk_alisa.webp', 'img/tekken/tk_anna.webp', 'img/tekken/tk_armorking.webp', 'img/tekken/tk_asuka.webp', 'img/tekken/tk_azucena.webp', 'img/tekken/tk_bob.webp', 'img/tekken/tk_bryan.webp', 'img/tekken/tk_claudio.webp', 'img/tekken/tk_clive.webp', 'img/tekken/tk_dragunov.webp', 'img/tekken/tk_eddy.webp', 'img/tekken/tk_fahkumram.webp', 'img/tekken/tk_feng.webp', 'img/tekken/tk_jack.webp', 'img/tekken/tk_kuma.webp', 'img/tekken/tk_kuni.webp', 'img/tekken/tk_lee.webp', 'img/tekken/tk_leo.webp', 'img/tekken/tk_leroy.webp', 'img/tekken/tk_lidia.webp', 'img/tekken/tk_lili.webp', 'img/tekken/tk_miary.webp', 'img/tekken/tk_panda.webp', 'img/tekken/tk_raven.webp', 'img/tekken/tk_reina_devil.webp', 'img/tekken/tk_roger.webp', 'img/tekken/tk_shaheen.webp', 'img/tekken/tk_steve.webp', 'img/tekken/tk_victor.webp', 'img/tekken/tk_xiaoyu.webp', 'img/tekken/tk_yoshimitsu.webp', 'img/tekken/tk_yujiro.webp', 'img/tekken/tk_zafina.webp', 'img/tekken/tk_azazel.webp', 'img/tekken/tk_boy.webp', 'img/tekken/tk_driver.webp', 'img/tekken/tk_fixer.webp', 'img/tekken/tk_medic.webp', 'img/tekken/tk_vendor.webp', 'img/tekken/tk_ygg.webp', 'img/tekken/bg_awaken.webp', 'img/tekken/bg_coliseum.webp', 'img/tekken/bg_eastgate.webp', 'img/tekken/bg_gcorp.webp', 'img/tekken/bg_helmor.webp', 'img/tekken/bg_jinhall.webp', 'img/tekken/bg_kazbox.webp', 'img/tekken/bg_lawdojo.webp', 'img/tekken/bg_manhattan.webp', 'img/tekken/bg_pier.webp', 'img/tekken/bg_sanctuary.webp', 'img/tekken/bg_service.webp', 'img/tekken/bg_shore.webp', 'js/ui-vn.js', 'js/ui-game.js', 'js/ui-hero.js', 'js/ui-crew.js', 'js/ui-skills.js', 'js/ui-play.js', 'js/ui-mail.js', 'js/ui-craft.js', 'js/ui-artifact.js', 'js/ui-dungeons-sp.js', 'js/ui-pets.js', 'js/ui-allies.js', 'js/ui-goals.js', 'js/ui-challenge.js', 'js/ui-life.js', 'js/ui-tekken.js', 'js/ui28.js', 'js/update.js', 'js/main.js',
  'js/story/cast.js', 'js/story/core.js', 'js/story/enemies.js', 'js/story/ui-story.js', 'js/story/outline.js', 'js/story/arc01.js',
  'js/story/arc02.js', 'js/story/arc03.js', 'js/story/arc04.js', 'js/story/arc05.js', 'js/story/arc06.js', 'js/story/arc07.js', 'js/story/arc08.js', 'js/story/arc09.js', 'js/story/arc10.js', 'js/story/arc11.js', 'js/story/arc12.js', 'js/story/arc13.js', 'js/story/arc14.js', 'js/story/arc15.js', 'js/story/arc16.js', 'js/story/arc17.js', 'js/story/arc18.js', 'js/story/arc19.js', 'js/story/arc20.js', 'js/story/arc21.js', 'js/story/arc22.js', 'js/story/arc23.js', 'js/story/arc24.js', 'js/story/arc25.js', 'js/story/arc26.js', 'js/story/arc27.js', 'js/story/arc28.js', 'js/story/arc29.js', 'js/story/arc30.js',   // все 30 арок в прекэше: офлайн работает на всех 300 главах
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'assets/ui/banner.webp', 'assets/ui/tile_shop.webp', 'assets/ui/tile_forge.webp', 'assets/ui/tile_fire.webp', 'assets/ui/tile_altar.webp', 'assets/ui/hero_bg.webp', 'assets/ui/vn_cathedral.webp', 'assets/ui/vn_cathedral_night.webp', 'assets/ui/vn_ruins.webp', 'assets/gear/eden_light_128.webp', 'assets/gear/eden_light_256.webp', 'assets/gear/eden_light_art.webp',
  'assets/gear/prime_cause_128.webp', 'assets/gear/prime_cause_256.webp', 'assets/gear/prime_cause_art.webp',
  'assets/gear/zero_law_128.webp', 'assets/gear/zero_law_256.webp', 'assets/gear/zero_law_art.webp',
  'assets/gear/first_division_128.webp', 'assets/gear/first_division_256.webp', 'assets/gear/first_division_art.webp',
  'assets/gear/null_possibility_128.webp', 'assets/gear/null_possibility_256.webp', 'assets/gear/null_possibility_art.webp',
  'assets/gear/abyss_dark_128.webp', 'assets/gear/abyss_dark_256.webp', 'assets/gear/abyss_dark_art.webp', 'assets/gear/hell_heart_128.webp', 'assets/gear/hell_heart_256.webp', 'assets/gear/hell_heart_art.webp', 'assets/gear/first_flame_128.webp', 'assets/gear/first_flame_256.webp', 'assets/gear/first_flame_art.webp', 'assets/gear/boundless_source_128.webp', 'assets/gear/boundless_source_256.webp', 'assets/gear/boundless_source_art.webp', 'assets/gear/chronos_128.webp', 'assets/gear/chronos_256.webp', 'assets/gear/chronos_art.webp', 'assets/gear/end_of_all_128.webp', 'assets/gear/end_of_all_256.webp', 'assets/gear/end_of_all_art.webp',
  'assets/ui/locations/mill.webp', 'assets/ui/locations/wood.webp', 'assets/ui/locations/mines.webp', 'assets/ui/locations/swamp.webp',
  'assets/ui/locations/spire.webp', 'assets/ui/locations/cathedral.webp', 'assets/ui/locations/chapel.webp', 'assets/ui/locations/ossuary.webp',
  'assets/ui/locations/crater.webp', 'assets/ui/locations/tempest.webp', 'assets/ui/locations/sunken.webp', 'assets/ui/locations/garden.webp',
  'assets/ui/locations/citadel.webp', 'assets/ui/locations/abyss.webp',
  'assets/ui/locations/nowhere.webp', 'assets/ui/locations/stairs.webp', 'assets/ui/locations/gallery_kings.webp', 'assets/ui/locations/choir_hall.webp', 'assets/ui/locations/threshold.webp',
  'assets/artifacts/comp/asteria.webp', 'assets/artifacts/comp/asteria_av.webp', 'assets/artifacts/comp/grimhild.webp', 'assets/artifacts/comp/grimhild_av.webp',   // v2.17: спутницы Мировых артефактов; иконки артефактов — лениво (рантайм-кэш), UI откатывается на эмодзи
  'assets/vn/manifest.json',
  'assets/pets/t/uncommon_a.webp', 'assets/pets/t/uncommon_b.webp', 'assets/pets/t/uncommon_c.webp', 'assets/pets/t/divine_dragon.webp', 'assets/pets/t/stray_cat.webp', 'assets/pets/t/field_dog.webp', 'assets/pets/t/jelly_slime.webp', 'assets/pets/t/red_fox.webp', 'assets/pets/t/river_otter.webp', 'assets/pets/t/night_owl.webp', 'assets/pets/t/storm_hawk.webp', 'assets/pets/t/frost_wolf.webp', 'assets/pets/t/crystal_slime.webp', 'assets/pets/t/ember_dragon.webp', 'assets/pets/t/glacier_dragon.webp', 'assets/pets/t/phoenix_fledgling.webp', 'assets/pets/t/nimbus_kitsune.webp', 'assets/pets/t/astral_kirin.webp', 'assets/pets/t/concept_dark_dragon.webp', 'assets/pets/t/concept_light_dragon.webp', 'assets/pets/t/concept_astral_dragon.webp', 'assets/pets/t/origin_dragon_cosmos.webp', 'assets/pets/t/preexist_dragon_void.webp', 'assets/pets/t/field_hare.webp', 'assets/pets/t/bear_cub.webp', 'assets/pets/t/ladybug.webp', 'assets/pets/t/burrow_mole.webp', 'assets/pets/t/stubborn_goose.webp', 'assets/pets/t/pebble_crab.webp', 'assets/pets/t/mushroom_sprite.webp', 'assets/pets/t/candle_wisp.webp', 'assets/pets/t/paper_crane.webp', 'assets/pets/t/clay_pup.webp', 'assets/pets/t/fennec_runner.webp', 'assets/pets/t/raccoon_rogue.webp', 'assets/pets/t/jade_mantis.webp', 'assets/pets/t/pearl_oyster.webp', 'assets/pets/t/dandelion_fairy.webp', 'assets/pets/t/tin_songbird.webp', 'assets/pets/t/cloud_lamb.webp', 'assets/pets/t/ink_squid.webp', 'assets/pets/t/swamp_lizard.webp', 'assets/pets/t/lamp_moth.webp', 'assets/pets/t/amber_deer.webp', 'assets/pets/t/armored_lobster.webp', 'assets/pets/t/silver_crane.webp', 'assets/pets/t/glass_jelly.webp', 'assets/pets/t/thorn_roselet.webp', 'assets/pets/t/brass_cat.webp', 'assets/pets/t/dune_gazelle.webp', 'assets/pets/t/lantern_angler.webp', 'assets/pets/t/amber_beetle.webp', 'assets/pets/t/ember_bat.webp', 'assets/pets/t/thunder_stag.webp', 'assets/pets/t/frost_owl.webp', 'assets/pets/t/lava_salamander.webp', 'assets/pets/t/mirror_fox.webp', 'assets/pets/t/coral_golem.webp', 'assets/pets/t/wind_foal.webp', 'assets/pets/t/lantern_ghost_cat.webp', 'assets/pets/t/bamboo_panda.webp', 'assets/pets/t/golden_koi.webp', 'assets/pets/t/crimson_ibis.webp', 'assets/pets/t/tide_dragon.webp', 'assets/pets/t/twilight_dragon.webp', 'assets/pets/t/zephyr_dragon.webp', 'assets/pets/t/sphinx_cub.webp', 'assets/pets/t/moon_hare.webp', 'assets/pets/t/treant_sapling.webp', 'assets/pets/t/kraken_hatchling.webp', 'assets/pets/t/storm_roc.webp', 'assets/pets/t/crystal_stag.webp', 'assets/pets/t/cerberus_pup.webp', 'assets/pets/t/inferno_dragon.webp', 'assets/pets/t/leviathan_dragon.webp', 'assets/pets/t/winter_dragon.webp', 'assets/pets/t/celestial_lion.webp', 'assets/pets/t/world_tree_sprite.webp', 'assets/pets/t/sun_garuda.webp', 'assets/pets/t/void_whale.webp', 'assets/pets/t/time_owl.webp', 'assets/pets/t/ascended_pegasus.webp', 'assets/pets/t/dream_baku.webp', 'assets/pets/t/garden_snail.webp', 'assets/pets/t/tavern_mouse.webp', 'assets/pets/t/pond_duck.webp', 'assets/pets/t/barn_rooster.webp', 'assets/pets/t/moss_turtle.webp', 'assets/pets/t/bat_scout.webp', 'assets/pets/t/hedgehog.webp', 'assets/pets/t/honey_bee.webp', 'assets/pets/t/thief_ferret.webp', 'assets/pets/t/firefly_wisp.webp', 'assets/pets/t/thunder_ram.webp', 'assets/pets/t/shadow_panther.webp', 'assets/pets/t/coral_seahorse.webp', 'assets/pets/t/sand_scorpion.webp', 'assets/pets/t/lucky_rabbit.webp', 'assets/pets/t/iron_boar.webp', 'assets/pets/t/sun_lion.webp', 'assets/pets/t/tide_serpent.webp', 'assets/pets/t/moon_moth.webp', 'assets/pets/t/jackpot_tanuki.webp', 'assets/pets/t/storm_dragon.webp', 'assets/pets/t/verdant_dragon.webp', 'assets/pets/t/golden_griffin.webp', 'assets/pets/t/starlight_unicorn.webp', 'assets/pets/t/obsidian_golem.webp', 'assets/pets/t/dawn_dragon.webp', 'assets/pets/t/star_dragon.webp', 'assets/pets/t/world_turtle.webp', 'assets/pets/t/fenrir_pup.webp', 'assets/pets/t/fortune_cat.webp'   // v2.19: превью питомцев; полный арт — лениво
].concat(Array.from({ length: 200 }, (_, i) => 'assets/craft/icons/t/' + String(i).padStart(3, '0') + '.webp'))
  .concat(['lantern',  'lucky_coin',  'cracked_bell',  'raven_feather',  'ember',  'surf_shell',  'lost_compass',  'moon_fang',  'witch_mirror',  'hourglass',  'first_banner',  'golem_heart',  'thorn_crown',  'thunder_horn',  'quiet_chalice',  'dragon_eye',  'titan_chain',  'fate_quill',  'dawn_lance',  'seven_seas',  'undying_rose',  'halo_shard',  'last_scales',  'creator_tear',  'supernova_heart',  'hoard_key',  'world_seed',  'first_clock',  'first_spark'].map((id) => 'assets/artifacts/icons/t/' + id + '.webp'));   // v2.17.1: превью иконок артефактов 128 px; 512 px — лениво   // v2.16: превью иконок ремесла 128 px — в прекэше; 512 px — лениво, в кэше выполнения
const CORE_RE = /^(?:\.\/|index\.html|manifest\.json)$|\.(?:js|css|woff2)$|^(?:js|css|fonts)\//;
const CORE_ASSETS = ASSETS.filter((u) => CORE_RE.test(u));
const EXTRA_ASSETS = ASSETS.filter((u) => !CORE_RE.test(u));

async function putRetry(cache, url, tries) {
  let last;
  for (let i = 0; i < (tries || 3); i++) {
    try {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!res || !res.ok) throw new Error(String(res && res.status));
      await cache.put(url, res);
      return;
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw last || new Error('fail ' + url);
}
async function addCore(cache, urls, batch) {
  batch = batch || 8;
  for (let i = 0; i < urls.length; i += batch) {
    await Promise.all(urls.slice(i, i + batch).map((u) => putRetry(cache, u, 3)));
  }
}
async function addExtra(cache, urls, batch) {
  batch = batch || 8;
  for (let i = 0; i < urls.length; i += batch) {
    await Promise.allSettled(urls.slice(i, i + batch).map(async (u) => {
      try {
        const res = await fetch(new Request(u, { cache: 'reload' }));
        if (res && res.ok) await cache.put(u, res);
      } catch (err) { /* картинка подтянется при показе */ }
    }));
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CORE);
    await addCore(c, CORE_ASSETS);
    await addExtra(c, EXTRA_ASSETS);
    try {
      const m = await (await fetch('assets/vn/manifest.json', { cache: 'no-cache' })).json();
      await Promise.allSettled((m.pre || []).map(async (f) => {
        try {
          const u = 'assets/vn/' + f;
          const res = await fetch(new Request(u, { cache: 'reload' }));
          if (res && res.ok) await c.put(u, res);
        } catch (err) {}
      }));
    } catch (err) { /* арт подтянется при первом показе */ }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (/\/mail\//.test(url.pathname)) return;   // почта: всегда из сети, без кэша (офлайн — игра покажет уже полученные письма)
  const isNav = req.mode === 'navigate' || /(?:\/|\/index\.html)$/.test(url.pathname);
  const isCode = isNav || /\.(?:js|css)$/i.test(url.pathname);
  if (isCode) {
    e.respondWith((async () => {
      try {
        const net = await fetch(req, { cache: 'no-cache' });
        if (net && net.ok) {
          const cp = net.clone();
          caches.open(CORE).then((c) => c.put(req, cp)).catch(() => {});
          return net;
        }
      } catch (err) { /* офлайн — из кэша */ }
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (isNav) {
        const idx = await caches.match('index.html', { ignoreSearch: true }) || await caches.match('./', { ignoreSearch: true });
        if (idx) return idx;
      }
      return Response.error();
    })());
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    if (hit) return hit;
    return fetch(req).then((res) => {
      if (res && res.ok && (/\/assets\/vn\//.test(url.pathname) || /\/assets\/craft\/icons\//.test(url.pathname) || /\/assets\/pets\//.test(url.pathname) || /\/js\/story\/arc\d+\.js$/.test(url.pathname))) { const cp = res.clone(); caches.open(RUNTIME).then((c) => c.put(req, cp)); }
      return res;
    }).catch(() => Response.error());
  }));
});
