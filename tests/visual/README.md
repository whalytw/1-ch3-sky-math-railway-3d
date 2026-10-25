# 原生動畫驗證

一般測試：在專案根目錄執行 `npm test`。

以下僅供具有 Mesa OpenGL ES 3、EGL、Python ctypes／numpy／Pillow 及 ffmpeg 的驗證環境使用；遊玩遊戲不需要這些套件。

在專案根目錄建立 `qa` 暫存資料夾後執行：

```sh
node tests/visual/export-animation-v15.mjs
python tests/visual/check-deformation-v15.py
python tests/visual/animate-v15.py
```

會輸出 15 種美術的 8 秒動畫與幾個取樣畫面，使用 src 中的實際著色器、共用網格及附件矩陣；相同素材與程式也用於遊戲。450 組變形比對在真實 GPU 管線（此驗證機為 Mesa 軟體實作）執行，並與 CPU 相容模式函式比較。
