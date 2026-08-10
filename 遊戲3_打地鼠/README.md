# 五十音打地鼠 修行之卷

以「武俠風 × 浮世繪風格 × 水墨風格」製作的原生網頁學習遊戲，聚焦 `ま～ん` 共 16 個平假名。專案不依賴 React、Vue 或外部套件，直接開啟 `index.html` 即可遊玩。

## 遊戲特色

- 限時 3 分鐘，每題最長 7 秒。
- 固定 6 個洞；前期 1 隻、中期 2 隻、後期最多同時 3 隻，出現速度逐步加快。
- 單角色與多角色模式隨機交替，包含不應點擊的干擾假名。
- 動態出題：答錯較多、反應較慢、出現次數較少的音會提高後續抽中機率。
- 正確得分包含基本分、速度加分與連擊獎勵；錯誤或超時扣分、斷 combo 並失去 1 顆心。
- 以瀏覽器 `SpeechSynthesis API` 播放 `ja-JP` 發音；成功、錯誤與按鈕音效由 Web Audio API 即時合成。
- 結算提供 16 音逐項答題紀錄，並以 `localStorage` 保存最高分、最佳正確率與最高連擊。
- 支援滑鼠、觸控、鍵盤焦點、ARIA 標籤、全螢幕，以及桌機／平板／手機 RWD。

## 操作方式

1. 按「開始三分鐘修行」。
2. 看上方卷軸顯示的羅馬拼音，例如 `ma`。
3. 點擊身上寫著相對應平假名（例如 `ま`）的角色。
4. 干擾角色出現時不要點擊；等待下一波即可。
5. 音效、語音、暫停、重新開始、全螢幕可由畫面圖示控制。鍵盤亦可按 `P` 暫停／繼續。

## 檔案結構

```text
遊戲3_打地鼠/
├─ index.html          # 四個主畫面、暫停視窗與語意結構
├─ style.css           # 完整視覺、動畫與 RWD
├─ script.js           # 遊戲、語音、音效、統計與儲存邏輯
├─ README.md
└─ assets/
   └─ images/          # AI 生成且已實際套用的遊戲美術
```

## assets/images 素材用途

### 風格與背景

- `style_reference.png`：全套素材的風格基準圖。
- `bg_title.png`：開始畫面背景。
- `bg_instruction.png`：說明畫面背景。
- `bg_game.png`：遊戲主畫面背景。
- `bg_result.png`：結算畫面背景。
- `bg_pause.png`：暫停視窗背景。

### 角色

- `guide_fox.png`：開始、說明與結算使用的狐狸女俠師傅。
- `mole_kasa.png`：斗笠地鼠。
- `mole_ninja.png`：忍者地鼠。
- `mole_samurai.png`：武士地鼠。
- `mole_tanuki.png`：狸貓武者地鼠。

### 場上物件與介面

- `hole.png`：六個地鼠洞。
- `target_scroll.png`：本次目標卷軸。
- `ui_panel.png`：時間、分數、combo、生命 HUD 底圖。
- `button_primary.png`、`button_secondary.png`：主要與次要按鈕底圖。
- `title_sign.png`：含「五十音打地鼠 修行之卷」的實際標題牌。
- `stamp_correct.png`、`stamp_wrong.png`：答對與答錯印章。
- `effect_ink_burst.png`、`effect_hit_flash.png`：正確打擊水墨爆散與閃光。
- `heart_full.png`、`heart_empty.png`：生命狀態。
- `icon_audio_on.png`、`icon_audio_off.png`：音效開關。
- `icon_voice_on.png`、`icon_voice_off.png`：日語發音開關。
- `icon_fullscreen.png`、`icon_pause.png`、`icon_restart.png`：遊戲控制。

## 如何執行

最簡單的方法：直接以 Chrome、Edge、Firefox 或 Safari 開啟 `index.html`。

若瀏覽器對本機檔案功能有限，也可在此資料夾啟動任一靜態伺服器，例如：

```powershell
npx serve .
```

再開啟終端顯示的本機網址。首次使用語音合成時，瀏覽器可能需要先經過一次按鈕點擊，遊戲已以「開始」操作滿足此限制。

## 替換美術素材

可直接以同名 PNG 替換 `assets/images` 內任何素材。建議維持原本比例：

- 背景：橫向 3:2。
- 標題、按鈕、卷軸、HUD：橫向透明 PNG。
- 狐狸女俠：直向透明 PNG。
- 地鼠、印章、特效、愛心與控制圖示：方形透明 PNG。

替換時保留檔名即可，不需修改程式碼；也請維持清楚輪廓、足夠對比與透明邊緣，避免遮住平假名徽章。
