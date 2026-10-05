# Обновление персонажей

20 персонажей, 55 поясных спрайтов и 20 аватарок. Игровые идентификаторы и наборы эмоций сохранены. Главный герой и его демоническая форма служат эталоном и не изменяются.

Рисунки созданы встроенным imagegen, отдельно для каждого персонажа и эмоции. Основной референс стиля — `assets/vn/hero_neutral.webp`; второй референс — прежний нейтральный портрет соответствующего персонажа. Эмоции редактируются от нового нейтрального портрета.

## Промпт базового портрета

Use case: style-transfer. Production visual novel sprite for anime RPG. Image 1 is STYLE AND WAIST-UP FRAMING reference only; image 2 is character identity reference. Redraw image 2 in the same clean Japanese anime linework, restrained cel shading and naturally proportioned anatomy as image 1. Preserve the character's gender, species, hair/eye/skin colors, recognizable costume and personality. Simplify overcomplicated costume detailing to elegant readable anime design. Single character only, centered upright relaxed pose, fully visible head/hair/ears/horns with ample margin, both shoulders, torso down through belt and hips, arms relaxed. Neutral facial expression. No action pose, no magical effects, no background scenery, no text, no frame, no chibi, no photorealism. True transparent background, clean alpha edges. Portrait 1024x1536. Specific character: 

Описание персонажа дополняется его расой, полом, цветами волос/глаз/кожи и костюмом из второго референса и `js/data-crew.js`. Для нечеловеческой свиты явно сохраняется анатомия гоблина, скелета, беса, орка, тёмного эльфа и гнома.

## Промпт эмоции

Use case: identity-preserve. Edit this exact visual novel sprite into its {mood} emotion variant. Change ONLY facial expression: {expression}. Preserve EXACT character identity, face shape, eye color, hairstyle, body, outfit, pose, hand placement, accessories, lighting, clean anime style, framing and canvas size. Do not move or resize character or head. Do not change costume. Keep the transparent background and clean alpha. One character, one image, no text.

Expressions:
- happy: warm happy smile, relaxed eyebrows and friendly eyes
- angry: angry determined expression, eyebrows lowered, intense gaze and slightly tense mouth
- shy: shy embarrassed expression, soft blush on both cheeks, bashful eyes and small hesitant smile
- sad: sad sorrowful expression, raised inner eyebrows, downcast eyes and small downturned mouth

## Импорт

`python tools/import-cast.py SOURCE_DIR`

Вход: отдельные RGBA PNG 1024×1536 `<actor>_<mood>.png`. Геометрия лица зафиксирована в `tools/data/cast-frames.json`; один поясной кадр на все эмоции персонажа. Скрипт сохраняет исходную альфу и WebP с адаптивным качеством (до 85, не более 88 КБ на спрайт), создаёт аватарки 256×320, обновляет метрики и версию манифеста. Нормализация метрик использует ширину лица 240, как у игрока. Изображения не растягиваются.

Основные файлы: `assets/vn/*`, `assets/vn/manifest.json`. Исходные PNG автоматически сохраняются генератором; в игре используются WebP.

