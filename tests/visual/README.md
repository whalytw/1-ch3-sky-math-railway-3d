# V1.6.1 實際渲染驗證

一般回歸測試在專案根目錄執行 `npm test`，不需要額外套件。

以下是開發者的離屏渲染工具，需要 Node.js、`@napi-rs/canvas`、Mesa EGL／OpenGL ES 3、Python ctypes／numpy／Pillow。遊戲本身不依賴它們。請在專案根目錄執行：

```sh
mkdir -p qa
node tests/visual/capture.mjs
python tests/visual/replay.py qa/replay/day.json
python tests/visual/replay.py qa/replay/night.json
python tests/visual/replay.py qa/replay/bridge.json
node tests/visual/fallback.mjs
node tests/visual/export-deformation.mjs
python tests/visual/check-deformation.py
```

capture 會載入真正的美術圖片、呼叫生產版四視角分離／打包函式，再讓 SharedRenderer 產生繪圖呼叫、貼圖和緩衝資料。replay 在實際 OpenGL ES 3 管線執行這些呼叫，逐次檢查 GL 錯誤，輸出三張 PNG。fallback 直接使用 CanvasFallbackRenderer 產生三種相容模式畫面。

這些畫面使用固定測試位置，同時放入代表性物件，沒有題目 UI；不代表一般遊玩時的隨機事件排列。變形測試以 540 組輸入比對 GPU transform feedback 與 CPU deformArt 的輸出。

這些是渲染與演算法驗證，不替代真實瀏覽器互動、硬體幀率或實體多人觸控測試。`qa/` 是可重新產生的暫存資料，不隨遊戲打包。
