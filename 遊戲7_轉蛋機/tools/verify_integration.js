"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
let failures = 0;

function check(condition, label) {
  if (condition) console.log(`PASS  ${label}`);
  else {
    console.error(`FAIL  ${label}`);
    failures += 1;
  }
}

const stages = [
  ["遊戲1_消除遊戲/kana-ink-link-game/index.html", "match", "xiaomo", "cert_match"],
  ["遊戲2_抽鬼牌/index.html", "joker", "fuwan", "cert_joker"],
  ["遊戲3_打地鼠/index.html", "mole", "jifeng", "cert_mole"],
  ["遊戲4_拖曳分類/index.html", "sorting", "wenyue", "cert_sorting"],
  ["遊戲5_排序/index.html", "order", "xuanxuan", "cert_order"],
  ["遊戲6_RPG打怪/index.html", "rpg", null, "cert_warrior"]
];

const scripts = {
  "遊戲2_抽鬼牌/index.html": read("遊戲2_抽鬼牌/script.js"),
  "遊戲3_打地鼠/index.html": read("遊戲3_打地鼠/script.js"),
  "遊戲6_RPG打怪/index.html": read("遊戲6_RPG打怪/script.js")
};

for (const [htmlPath, stageId, petId, certificate] of stages) {
  const html = read(htmlPath);
  const logic = html + "\n" + (scripts[htmlPath] || "");
  check(html.includes("kotodama-system.js") && html.includes("kotodama-companion.js"), `${stageId}: 載入共用言靈模組`);
  check(logic.includes(`stageId: "${stageId}"`), `${stageId}: 使用正確關卡識別`);
  check(petId ? logic.includes(`expectedPet: "${petId}"`) : logic.includes("allowAny: true"), `${stageId}: 攜帶言靈限制正確`);
  check(logic.includes("spiritRun?.reward()"), `${stageId}: 真正通關流程發放靈石`);
  check(logic.includes(certificate), `${stageId}: 保留原有通關憑證`);
}

const shared = read("assets/js/kotodama-system.js");
check(shared.includes('const STORAGE_KEY = "kotodamaGameData"'), "全專案使用單一轉蛋資料 key");
check(["xiaomo", "fuwan", "jifeng", "wenyue", "xuanxuan"].every(id => shared.includes(`${id}: Object.freeze`)), "五系言靈共用設定完整");
check(shared.includes("awardedRuns") && shared.includes("awardStageClear"), "同局防重複獎勵機制存在");
check(shared.includes("awardedStages") && shared.includes("standaloneStageCounter"), "舊版測試資料具遷移處理");

const map = read("大冒險地圖/index.html");
check(map.includes("../遊戲7_轉蛋機/index.html"), "大地圖使用明確相對路徑進入轉蛋機");
check(map.includes('id="mapStoneCount"') && map.includes("getSpiritStoneCount"), "大地圖同步顯示共用靈石");
check(map.includes('"kotodamaGameData"') && map.includes("sessionStorage.removeItem"), "重新冒險會重置轉蛋與序章 session");
check(map.includes("certificates.slice(0, index).every(Boolean)"), "循序解鎖要求所有前置試煉完成");

const gacha = read("遊戲7_轉蛋機/index.html");
check(gacha.includes("SHARED_GAME.getPetConfig"), "轉蛋機沿用共用 PET_CONFIG");
check(!gacha.includes("stageRewardBtn") && !gacha.includes("standaloneStageCounter"), "移除獨立測試領獎入口");
check(!gacha.includes('id="clearBtn"') && !gacha.includes('id="confirmModal"'), "移除轉蛋機獨立清除進度入口");
check(gacha.includes("../大冒險地圖/index.html"), "轉蛋機可返回大地圖");

const petRoot = path.join(root, "遊戲7_轉蛋機", "assets", "images", "pets");
const petFiles = fs.readdirSync(petRoot).filter(name => name.endsWith(".png"));
check(petFiles.length === 25, "25 張五系言靈圖片完整保留");
for (const file of petFiles) {
  const data = fs.readFileSync(path.join(petRoot, file));
  check(data.length > 24 && data.subarray(1, 4).toString("ascii") === "PNG", `圖片可讀：${file}`);
}

const integratedFiles = [
  "assets/js/kotodama-system.js",
  "assets/js/kotodama-companion.js",
  "大冒險地圖/index.html",
  "遊戲7_轉蛋機/index.html",
  ...stages.map(item => item[0]),
  "遊戲2_抽鬼牌/script.js",
  "遊戲3_打地鼠/script.js",
  "遊戲6_RPG打怪/script.js"
];
check(integratedFiles.every(file => !read(file).includes("localStorage.clear(")), "整合程式未使用 localStorage.clear()");

if (failures) {
  console.error(`\n${failures} 項整合檢查未通過。`);
  process.exitCode = 1;
} else {
  console.log("\n全部言靈整合靜態檢查通過。");
}
