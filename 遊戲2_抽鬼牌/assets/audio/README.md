# 音訊規劃

目前版本可完全離線執行：`script.js` 使用 Web Audio API 合成背景五聲音階、按鈕、抽牌、配對、勝利與失敗音效；成功配對的日文讀音則使用 Web Speech API（`ja-JP`）。兩者都包含不支援時的 graceful fallback。

若後續要換成錄音檔，可在本資料夾加入：

- `bgm-dojo.ogg`：循環背景音樂
- `button.ogg`：按鈕
- `draw.ogg`：抽牌
- `pair.ogg`：配對出牌
- `win.ogg`：勝利
- `lose.ogg`：失敗

再把 `script.js` 的 `audio` 物件方法改為預先載入的 `HTMLAudioElement` 或 AudioBuffer。保留目前合成音作為載入失敗的備援即可。

