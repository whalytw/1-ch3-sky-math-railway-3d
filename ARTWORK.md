# V1.4 遊戲角色美術

本版五張 PNG 是本次以使用者提供的遊戲截圖為參考，新生成並實際放入遊戲的原創角色圖集。不是成品預覽圖；`src/artwork.js` 負責圖集、視角與拍翼，`src/renderer.js` 在共用世界中繪製。未使用 Minecraft 人物、皮膚或其他現成遊戲角色資產。

| 素材 | 圖集 | 用途 |
|---|---|---|
| cute-witch.png | 2 × 2 | 跨坐掃把的女巫，四個斜視角 |
| cute-birds.png | 4 × 2 | 四個斜視角 × 上下拍翼；三隻獨立飛鳥 |
| cute-whale.png | 2 × 2 | 微笑鯨魚，四個斜視角 |
| cute-dragon.png | 4 × 2 | 四個斜視角 × 上下拍翼；橘色火龍 |
| cute-cast.png | 4 × 3 | 雙翼飛機、原創披風英雄、機器人、飛船、雲朵綿羊、水母、彩蝶、紙飛機、風箏、熱氣球、浮空花園、螢火蟲 |

所有圖檔保留透明背景。圖片原檔直接納入專案，不對角色素材另作程式去背、拼圖或重繪。四視角圖依鏡頭與前進方向切換；部分配角使用後側視圖並依左右方向鏡射。實際 3D 幾何使用輕量透明平面，而非完整體積的模型。

## 生成提示詞

以下保留本次實際送出的五組完整提示詞，便於之後維持美術風格。每組均使用使用者的遊戲截圖作參考，要求輸出可直接載入遊戲的透明圖集。

### cute-witch.png

```text
Use case: precise-object-edit / production game sprite. Edit target: the provided exact screenshot, specifically its badly modeled purple flying witch. Completely rebuild that witch into an appealing original cozy storybook 3D character and extract her into a TRANSPARENT PRODUCTION SPRITE ATLAS that will actually be loaded in the game. Remove all screenshot UI, tracks and landscape in the output. One consistent adorable young adult witch, rounded face with expressive eyes, warm smile, purple pointed hat with bent tip, chestnut bob hair, plum dress, short flowing cape, brown ankle boots, warm wooden broom with golden bristles. CRITICAL RIDING ANATOMY: she SITS ASTRIDE the broom handle like riding a horse, broom between both thighs, left and right knees on opposite sides, both lower legs and boots hang BELOW the broom. Lean torso a little forward, both hands gripping the broom handle in front of her; never standing on the broom or balancing on it. No cheering arms, no primitive stick limbs. A polished rounded 3D animation-film game render with soft warm lighting, subtle material textures and clean silhouette, matching a cute illustrated fantasy racing game. Output a precise 2x2 equal-cell atlas, ideally 2048 square, four images of the SAME witch and pose at the SAME size, each centered with generous transparent margins, no shadows outside the subject: top-left camera rear-left three-quarter (see her back and left side, she flies AWAY from viewer toward upper right); top-right camera rear-right three-quarter (back and right side, flies AWAY toward upper left); bottom-left front-left three-quarter (face and left side); bottom-right front-right three-quarter (face and right side). Each cell contains the entire witch, both dangling boots, hat tip, full broom and bristles, with no cropping and no overlap across cells. The two upper cells must clearly show flight in the same forward/away direction as a following minecart camera. Truly transparent background, no checkerboard painted into image, no frame lines, no text, no watermark.
```

### cute-birds.png

```text
Use case: precise-object-edit / production animated game sprite. Edit target: the provided exact screenshot, specifically the strange flat objects in front of the middle minecart that were meant to be birds. Completely redesign ONE charming little teal-and-cream swallow into an appealing original rounded 3D animated-film game bird, and extract it as a TRANSPARENT PRODUCTION ANIMATION ATLAS. Remove all screenshot UI and scenery. The bird has a clear rounded head, glossy small black eyes, tiny golden beak, cream belly, rich blue/teal back, graceful rounded feathered wings, a two-feather forked tail, and small tucked feet. Friendly and believable, no flat triangle scraps, no disconnected parts. Polished warm soft-lit 3D storybook render, clean silhouette. Precise 4-column by 2-row equal-cell atlas, ideally 2048x1024: columns are four views of the SAME bird: 1 rear-left three-quarter flying AWAY toward upper right, 2 rear-right three-quarter flying AWAY toward upper left, 3 front-left three-quarter, 4 front-right three-quarter. Top row shows WINGS RAISED at the top of an upstroke; bottom row shows the same poses with WINGS LOWERED at the bottom of a downstroke. Keep identity, head, body position, camera view, lighting and scale perfectly consistent between the two rows; only wing pose changes. Every cell contains the entire single bird with wings, tail, head and beak, centered at the same scale with transparent margins, no cropping, no overlap between cells. No flock baked in; the game will place three individual birds. Truly transparent background, no painted checkerboard, no ground shadows, no text, no grid lines, no watermark.
```

### cute-whale.png

```text
Use case: precise-object-edit / production game art. The provided exact screenshot is the edit source for replacing its crude flying scenery. Output only the rebuilt transparent production sprite atlas; remove all game UI and environment. Original adorable rounded 3D animated-film fantasy game style, soft warm lighting, subtly textured materials, clean expressive silhouettes, consistent identity and scale, each subject entirely contained within its equal cell with transparent padding, no clipping, no baked shadows, no text, no borders, no watermark, no painted checkerboard. Create ONE charming sky-blue flying whale with cream belly, happy expressive eyes, friendly curved smile, rounded pectoral fins, broad sculpted tail flukes and tiny sparkling water puff from its blowhole. A real coherent animal body, no loose geometric pieces. Precise 2x2 atlas of four views: top-left rear-left three-quarter (swimming/flying AWAY toward upper right), top-right rear-right three-quarter (AWAY toward upper left), bottom-left front-left three-quarter (face visible), bottom-right front-right three-quarter. Same whale and gentle swimming pose, show entire tail, both fins and body in each cell, no scenery or extra whales. Ideally 1536 square.
```

### cute-dragon.png

```text
Use case: precise-object-edit / production game art. The provided exact screenshot is the edit source for replacing its crude flying scenery. Output only the rebuilt transparent production sprite atlas; remove all game UI and environment. Original adorable rounded 3D animated-film fantasy game style, soft warm lighting, subtly textured materials, clean expressive silhouettes, consistent identity and scale, each subject entirely contained within its equal cell with transparent padding, no clipping, no baked shadows, no text, no borders, no watermark, no painted checkerboard. Create ONE adorable orange-red young flying fire dragon with warm cream belly, rounded face, large friendly eyes, small curved horns, sturdy torso, two small forearms, two tucked hind legs, long expressive tail and broad bat wings with golden-orange membranes and clear connected wing fingers. Cute confident companion, no aggression. Precise 4-column x 2-row equal-cell atlas: columns 1 rear-left three-quarter flying AWAY upper right, 2 rear-right three-quarter flying AWAY upper left, 3 front-left three-quarter, 4 front-right three-quarter. Top row WINGS RAISED, bottom row SAME views with WINGS LOWERED; keep head, body, tail, size and camera consistent, only wings change. Full wings and tail within every cell. Ideally 2048x1024.
```

### cute-cast.png

```text
Use case: precise-object-edit / production game art. The provided exact screenshot is the edit source for replacing its crude flying scenery. Output only the rebuilt transparent production sprite atlas; remove all game UI and environment. Original adorable rounded 3D animated-film fantasy game style, soft warm lighting, subtly textured materials, clean expressive silhouettes, consistent identity and scale, each subject entirely contained within its equal cell with transparent padding, no clipping, no baked shadows, no text, no borders, no watermark, no painted checkerboard. Make a precise 4-column by 3-row atlas of TWELVE distinct cute original flight props, one subject per cell. All are rendered from a rear-left three-quarter following-camera view, traveling AWAY from the viewer toward the upper right (same forward direction as a minecart), with clear side details, uniformly readable scale. Row1 left to right: 1 rounded golden vintage BIPLANE with two pairs of wings, pilot cockpit and front propeller; 2 original teal-suited CAPED HERO in a genuine horizontal forward flying pose, one arm forward, legs trailing, orange cape flowing behind (no trademarks or logos); 3 smiling brass-and-teal MAIL ROBOT with short limbs, mail satchel and small twin jetpack flames, leaning forward in flight; 4 cozy cream-and-gold STEAMPUNK AIRSHIP with oval envelope and detailed wooden gondola. Row2: 1 fluffy CLOUD SHEEP with a friendly sheep face and four small dangling hooves; 2 luminous pastel lavender SKY JELLYFISH with a smooth dome and gently curling connected tentacles; 3 a small coherent group of three colorful BUTTERFLIES with visible bodies and soft wing patterns; 4 a formation of three clean cream-and-gold folded PAPER PLANES. Row3: 1 a short train of four colorful fabric KITES with bows and connected tails; 2 one cheerful red-and-gold HOT AIR BALLOON with woven basket and ropes; 3 a small FLOATING GARDEN ISLAND with grass, flowering tree, tiny waterfall and stone underside; 4 a small cluster of glowing golden FIREFLIES with visible round insect bodies and tiny transparent wings. Charming polished 3D storybook game art, not primitive geometry. No shared scenery, no labels. Entire subject and accessories in each cell, generous transparent margins. Ideally 2048x1536.
```


