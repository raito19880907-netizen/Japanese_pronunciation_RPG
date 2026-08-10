# 五十音抽鬼牌

以原生 HTML、CSS、JavaScript 製作的四人抽鬼牌學習遊戲。牌組包含 30 張平假名牌、30 張赫本式羅馬拼音牌與 2 張不可配對的鬼牌。

## 執行方式

直接用現代瀏覽器開啟 `index.html` 即可，不需要安裝套件或啟動伺服器。遊戲使用相對路徑，因此整個 `遊戲2_抽鬼牌` 資料夾可一起移動。

## 操作

- 起手時，電腦會自動整理配對；玩家要手動點兩張牌完成所有配對。
- 玩家回合請點下一位電腦手中任一張發光牌背。
- 抽牌後若形成配對，需全部配完才會換人。
- 玩家若率先出完手牌會立即獲勝；否則配完 30 組普通牌後，任何持有鬼牌者都算輸家。
- 音效按鈕可關閉 Web Audio 背景音與效果音。日文發音使用 Web Speech API，不支援時會安靜略過。

## 檔案結構

```text
遊戲2_抽鬼牌/
├─ index.html              # 語意化 UI、四方座位、規則與結果視窗
├─ style.css               # 響應式版面、素材套用與動畫
├─ script.js               # 牌組、配對、抽牌、AI、回合與音效邏輯
├─ ASSET_GUIDE.md          # 美術製作流程、提示詞與替換規則
└─ assets/
   ├─ generated-assets.json
   ├─ images/              # 最終 WebP 遊戲美術
   └─ audio/README.md      # 音訊策略與外部音檔擴充點
```

## 擴充提示

- 增加假名：在 `script.js` 的 `PAIRS` 加入 `{ kana, romaji, key }`。
- 改變玩家數或順序：調整 `PLAYER_DEFS`、`TURN_ORDER` 與對應座位 HTML。
- 替換美術：維持 `assets/images` 中同名檔案與相同比例即可，不必改程式。
- 自動測試：開啟頁面後可從 `window.__oldMaidGame.validateDeck()` 檢查牌組結構。

