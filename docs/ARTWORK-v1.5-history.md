歷史素材製作紀錄；本版實際載入清單以根目錄 ARTWORK.md 為準。

# V1.5 美術與動畫來源

遊戲實際使用 15 張透明 RGBA 圖片：13 張 `single-*.png` 獨立素材，加上女巫、鯨魚各 1 張四視角素材。所有圖片均由本次／前次對話的圖像生成功能製作；程式、角色造型和動作未使用 Minecraft 皮膚或第三方遊戲資產。

舊 `cute-cast.png`、`cute-birds.png`、`cute-dragon.png` 已從本版移除。獨立圖片不裁切成相鄰角色格子。鳥和火龍只有單一對翅膀；GLSL 網格連續變形取代上下姿勢透明混合。動畫程式在 `src/animation.js`，資產索引在 `src/artwork.js`。

## 新獨立素材

最先四張的製作規格摘要：

|檔案|規格|
|---|---|
|single-jellyfish.png|單隻淡紫與粉色水母，透明背景；完整傘部及分開的長觸手，無其他角色。|
|single-butterfly.png|單隻藍／青色蝴蝶，垂直置中的身體與對稱張開的雙翼，供翅根變形。|
|single-hero.png|原創青綠服裝與橘披風英雄，後左斜視角，朝右上飛行，無其他角色片段。|
|single-biplane.png|黃色雙翼飛機、駕駛與機鼻輪轂，後左斜視角，省略螺旋槳葉片以交由程式旋轉。|

以下九張保留當時的共同風格提示與各張提示；`ref` 是生成時參考的舊美術，不表示遊戲仍載入該舊檔。

共同提示：

```text
Use the attached image only as an art-style reference. Create ONE isolated production game asset on a truly transparent RGBA background, square canvas. Polished rounded 3D-animation illustration, charming family-friendly fantasy art, warm soft material shading. Absolutely NO sprite sheet, NO grid, NO neighboring subjects, NO scraps, NO labels, NO text, NO floor shadow. Fit the entire subject in the central 76% with generous empty transparent edges. 
```

### single-bird.png

```text
ONE cute teal-blue and cream swallow viewed DIRECTLY FROM BEHIND and slightly above, flying AWAY from camera toward TOP of image. Its body, rounded head, and two long forked tail feathers are aligned on the exact vertical center axis: head at y=35%, tail tip at y=78%. EXACTLY TWO wings spread horizontally to left and right in a neutral T pose, feathers angled gently back. Wing shoulders meet the central body at x=44% and x=56%, y=48%. Wings have a clearly readable root and beautifully layered teal/cream feathers. No raised second pair of wings, no motion blur. This will be continuously animated with a two-shoulder rig, so keep the center body narrow and the left/right wings clearly outside it.
```

### single-robot.png

```text
ONE cute cream-and-teal round postal robot with a brown mail satchel, viewed rear-left three-quarter, flying horizontally toward upper RIGHT. Two jet nozzles at lower-left back emit distinct orange-gold flames trailing toward lower LEFT. Metallic body, friendly round head, antenna. Complete single robot and its own flames only.
```

### single-airship.png

```text
ONE cute cream balloon steampunk airship, wooden gondola, teal fabric fins, golden ropes and warm round windows, viewed rear-left three-quarter, heading upper RIGHT. A short chimney at the rear left, but NO smoke in the image (animated steam added in-game). Single integrated vehicle. Small motor hub at the back with NO propeller blades (animated propeller added in-game).
```

### single-cloudsheep.png

```text
ONE cute fluffy cloud sheep with cream curly wool, tiny chocolate face, curved golden horns, four small clearly separated dangling brown hooves. Rear-left three-quarter view flying toward upper RIGHT. Body in upper half, legs below, ample space around entire sheep. No cloud platform, no background cloud, no other sheep.
```

### single-paperplane.png

```text
ONE cream-and-gold folded paper airplane, viewed from behind and above, flying toward upper RIGHT. Beautiful paper folds, two swept triangular wings. No speed lines, no smoke, no other planes.
```

### single-kite.png

```text
ONE colorful classic diamond kite with a red and gold fabric sail, wooden cross frame, a central bow and a long curving ribbon tail with three small bows. Kite sail in upper half, entire wavy tail in lower half. All completely visible with empty transparent margin. Rear three-quarter angle with face of kite clearly readable. No other kites.
```

### single-balloon.png

```text
ONE adorable hot air balloon with a red and cream striped round envelope, golden ropes, a small wicker basket and a cute helmeted traveler inside. Rear-left three-quarter, drifting toward upper RIGHT. All ropes and basket clearly visible. Small bright burner glow above basket. Empty transparent margin around whole balloon, nothing else.
```

### single-island.png

```text
ONE small whimsical floating garden island, a rounded grass-covered rock, one pink blossoming tree, a tiny wooden fence and ONE narrow blue waterfall pouring from center-right edge down below the rock. The entire tree, island and waterfall fit inside the image with transparent margins. No flying birds, no other islands, no cloud, no surrounding landscape.
```

### single-dragon.png

```text
ONE cute orange baby dragon flying AWAY toward the TOP of the image, viewed DIRECTLY from behind and slightly above. Symmetric wing rig reference pose: narrow plump orange torso and round head on exact vertical center axis, head at y=32%, feet at y=65%, long tail extending down to y=83%. EXACTLY TWO bat-like gold membrane wings spread horizontally left and right, roots at x=43%,57% and y=45%, tips at x=15%,85%,y=32%. Horns and head readable, folded little legs under torso. Soft adorable sculpted material matching reference. No overlapping duplicate wings, no motion blur. This single image will be rigged for continuous flapping.
```

## 沿用且重新檢查的素材

### cute-witch.png

```text
Use case: precise-object-edit / production game sprite. Edit target: the provided exact screenshot, specifically its badly modeled purple flying witch. Completely rebuild that witch into an appealing original cozy storybook 3D character and extract her into a TRANSPARENT PRODUCTION SPRITE ATLAS that will actually be loaded in the game. Remove all screenshot UI, tracks and landscape in the output. One consistent adorable young adult witch, rounded face with expressive eyes, warm smile, purple pointed hat with bent tip, chestnut bob hair, plum dress, short flowing cape, brown ankle boots, warm wooden broom with golden bristles. CRITICAL RIDING ANATOMY: she SITS ASTRIDE the broom handle like riding a horse, broom between both thighs, left and right knees on opposite sides, both lower legs and boots hang BELOW the broom. Lean torso a little forward, both hands gripping the broom handle in front of her; never standing on the broom or balancing on it. No cheering arms, no primitive stick limbs. A polished rounded 3D animation-film game render with soft warm lighting, subtle material textures and clean silhouette, matching a cute illustrated fantasy racing game. Output a precise 2x2 equal-cell atlas, ideally 2048 square, four images of the SAME witch and pose at the SAME size, each centered with generous transparent margins, no shadows outside the subject: top-left camera rear-left three-quarter (see her back and left side, she flies AWAY from viewer toward upper right); top-right camera rear-right three-quarter (back and right side, flies AWAY toward upper left); bottom-left front-left three-quarter (face and left side); bottom-right front-right three-quarter (face and right side). Each cell contains the entire witch, both dangling boots, hat tip, full broom and bristles, with no cropping and no overlap across cells. The two upper cells must clearly show flight in the same forward/away direction as a following minecart camera. Truly transparent background, no checkerboard painted into image, no frame lines, no text, no watermark.
```

### cute-whale.png

```text
Use case: precise-object-edit / production game art. The provided exact screenshot is the edit source for replacing its crude flying scenery. Output only the rebuilt transparent production sprite atlas; remove all game UI and environment. Original adorable rounded 3D animated-film fantasy game style, soft warm lighting, subtly textured materials, clean expressive silhouettes, consistent identity and scale, each subject entirely contained within its equal cell with transparent padding, no clipping, no baked shadows, no text, no borders, no watermark, no painted checkerboard. Create ONE charming sky-blue flying whale with cream belly, happy expressive eyes, friendly curved smile, rounded pectoral fins, broad sculpted tail flukes and tiny sparkling water puff from its blowhole. A real coherent animal body, no loose geometric pieces. Precise 2x2 atlas of four views: top-left rear-left three-quarter (swimming/flying AWAY toward upper right), top-right rear-right three-quarter (AWAY toward upper left), bottom-left front-left three-quarter (face visible), bottom-right front-right three-quarter. Same whale and gentle swimming pose, show entire tail, both fins and body in each cell, no scenery or extra whales. Ideally 1536 square.
```


## 實作限制

飛行美術是置於共用 3D 世界中的可變形透明網格，依距離縮放並接受深度遮擋。它保留插畫細節，並非完整可環繞的體積模型。女巫與鯨魚保留四個視角，其餘單張素材以跟隨鏡頭的角度呈現。
