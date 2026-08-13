"use strict";

/*
 * 言靈討魔錄：完整遊戲狀態、46 音題庫、回合制戰鬥、商店、背包、
 * 語音、Web Audio 音效與 localStorage 紀錄皆集中在本檔案。
 */

const KANA_SOURCE = [
  ["あ", "a", "a", "a"], ["い", "i", "a", "i"], ["う", "u", "a", "u"], ["え", "e", "a", "e"], ["お", "o", "a", "o"],
  ["か", "ka", "ka", "a"], ["き", "ki", "ka", "i"], ["く", "ku", "ka", "u"], ["け", "ke", "ka", "e"], ["こ", "ko", "ka", "o"],
  ["さ", "sa", "sa", "a"], ["し", "shi", "sa", "i"], ["す", "su", "sa", "u"], ["せ", "se", "sa", "e"], ["そ", "so", "sa", "o"],
  ["た", "ta", "ta", "a"], ["ち", "chi", "ta", "i"], ["つ", "tsu", "ta", "u"], ["て", "te", "ta", "e"], ["と", "to", "ta", "o"],
  ["な", "na", "na", "a"], ["に", "ni", "na", "i"], ["ぬ", "nu", "na", "u"], ["ね", "ne", "na", "e"], ["の", "no", "na", "o"],
  ["は", "ha", "ha", "a"], ["ひ", "hi", "ha", "i"], ["ふ", "fu", "ha", "u"], ["へ", "he", "ha", "e"], ["ほ", "ho", "ha", "o"],
  ["ま", "ma", "ma", "a"], ["み", "mi", "ma", "i"], ["む", "mu", "ma", "u"], ["め", "me", "ma", "e"], ["も", "mo", "ma", "o"],
  ["や", "ya", "ya", "a"], ["ゆ", "yu", "ya", "u"], ["よ", "yo", "ya", "o"],
  ["ら", "ra", "ra", "a"], ["り", "ri", "ra", "i"], ["る", "ru", "ra", "u"], ["れ", "re", "ra", "e"], ["ろ", "ro", "ra", "o"],
  ["わ", "wa", "wa", "a"], ["を", "wo", "wa", "o"], ["ん", "n", "n", "n"]
];

/* 外形混淆組包含指定重點組合，並補足所有假名的可用混淆資料。 */
const VISUAL_GROUPS = [
  ["あ", "お", "ぬ", "め"], ["い", "り", "こ"], ["う", "つ", "ら"], ["え", "て", "ん"],
  ["か", "や", "な"], ["き", "さ", "ち"], ["く", "へ", "し"], ["け", "は", "ほ"],
  ["す", "む", "を"], ["せ", "そ", "と", "ゆ"], ["た", "に", "こ"], ["ね", "れ", "わ"],
  ["の", "ぬ", "め"], ["ひ", "け", "に"], ["ふ", "つ", "う"], ["ま", "も", "よ"],
  ["み", "む", "し"], ["る", "ろ", "そ"]
];

const SPECIAL_PHONETIC = {
  "し": ["ち", "ひ", "す"], "ち": ["し", "き", "に"], "つ": ["す", "ふ", "く"],
  "ふ": ["う", "す", "つ"], "ん": ["な", "ぬ", "の"], "を": ["お", "も", "の"]
};

/* 每一筆題庫物件都具有 kana、romaji、row、vowel、visuallySimilar、phoneticallySimilar。 */
const KANA_DATA = KANA_SOURCE.map(([kana, romaji, row, vowel]) => ({
  kana, romaji, row, vowel, visuallySimilar: [], phoneticallySimilar: []
}));

for (const item of KANA_DATA) {
  const visual = new Set();
  for (const group of VISUAL_GROUPS) {
    if (group.includes(item.kana)) group.filter(kana => kana !== item.kana).forEach(kana => visual.add(kana));
  }
  item.visuallySimilar = [...visual];

  const phonetic = new Set(
    KANA_DATA
      .filter(other => other.kana !== item.kana && (other.row === item.row || other.vowel === item.vowel))
      .map(other => other.kana)
  );
  (SPECIAL_PHONETIC[item.kana] || []).forEach(kana => phonetic.add(kana));
  item.phoneticallySimilar = [...phonetic];
}

const KANA_BY_CHAR = new Map(KANA_DATA.map(item => [item.kana, item]));
const QUESTION_TYPES = {
  listening: "聽力選假名",
  romajiToKana: "羅馬拼音選假名",
  kanaToRomaji: "平假名選羅馬拼音"
};

const STAGES = [
  {
    number: 1,
    title: "竹影山道・墨牙狼",
    enemy: "墨牙狼",
    image: "assets/images/enemy-wolf.png",
    ability: "竹影試煉・熟悉言靈之力"
  },
  {
    number: 2,
    title: "赤砂荒谷・鬼甲毒蠍",
    enemy: "鬼甲毒蠍",
    image: "assets/images/enemy-scorpion.png",
    ability: "毒霧惑音・聽辨相近之音"
  },
  {
    number: 3,
    title: "破寺鳥居・羅生赤鬼",
    enemy: "羅生赤鬼",
    image: "assets/images/enemy-oni.png",
    ability: "赤鬼鐵甲・第一下普通攻擊減傷"
  },
  {
    number: 4,
    title: "蒼浪海崖・雲海蒼龍",
    enemy: "雲海蒼龍",
    image: "assets/images/enemy-dragon.png",
    ability: "潮鳴幻聲・聽力每題最多播放 2 次"
  },
  {
    number: 5,
    title: "無月妖城・無面魔將",
    enemy: "無面魔將",
    image: "assets/images/enemy-demon-general.png",
    ability: "百鬼幻陣・錯題改換題型再現"
  }
];

const ITEMS = {
  potion: {
    name: "回春丹",
    price: 30,
    image: "assets/images/item-potion.png",
    effect: "戰鬥中恢復 50 HP，不會超過 100 HP；不消耗作答回合。"
  },
  magatama: {
    name: "破邪勾玉",
    price: 40,
    image: "assets/images/item-magatama.png",
    effect: "套用到目前題目；答對造成 50 傷害，答錯則直接失效。"
  },
  charm: {
    name: "替身御守",
    price: 80,
    image: "assets/images/item-charm.png",
    effect: "HP 歸零時自動復活至 1，並展開可抵擋下一次答錯傷害的結界。"
  }
};

const STORAGE_KEY = "kotodamaHiraganaRpgRecordsV1";
const defaultRecords = {
  highestStage: 1,
  bestAccuracy: 0,
  totalWrong: 0,
  kanaWrong: {},
  sound: true,
  voice: true
};

const records = loadRecords();
let audioContext = null;
let japaneseVoices = [];
let pendingTimer = null;
let lastFocusedElement = null;
let spiritRun = null;

const state = {
  stage: 1,
  playerHp: 100,
  stones: 0,
  monsterHp: 100,
  inventory: { potion: 0, magatama: 0, charm: 0 },
  usedItems: { potion: 0, magatama: 0, charm: 0 },
  total: 0,
  correct: 0,
  wrong: 0,
  runWrongCounts: {},
  wrongHistory: [],
  usedKana: new Set(),
  typeDeck: [],
  questionNumber: 0,
  currentQuestion: null,
  locked: false,
  bagOpen: false,
  magatamaActive: false,
  oniArmor: false,
  barrier: false,
  gameEnded: false
};

const dom = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  const ids = [
    "gameApp", "battleScreen", "shopScreen", "endScreen", "stageBadge", "stageTitle", "abilityText",
    "stoneCount", "soundToggle", "voiceToggle", "playerPanel", "enemyPanel", "playerHpText", "playerHpBar",
    "enemyHpText", "enemyHpBar", "enemyName", "enemyImage", "armorBadge", "barrierBadge", "magatamaAura",
    "stampEffect", "stampText", "questionTypeLabel", "questionCounter", "questionPrompt", "listenButton",
    "listenButtonText", "playCountText", "voiceNotice", "tutorialHint", "answerGrid", "bagButton",
    "battleMessage", "shopHp", "shopStoneCount", "shopItems", "shopMessage", "continueButton", "bagOverlay",
    "bagDialog", "bagClose", "bagItems", "endTitle", "endKicker", "endSummary", "statsList",
    "wrongKanaList", "restartButton", "srStatus"
  ];
  ids.forEach(id => { dom[id] = document.getElementById(id); });

  dom.soundToggle.addEventListener("click", toggleSound);
  dom.voiceToggle.addEventListener("click", toggleVoice);
  dom.listenButton.addEventListener("click", () => playCurrentKana(false));
  dom.bagButton.addEventListener("click", openBag);
  dom.bagClose.addEventListener("click", closeBag);
  dom.bagOverlay.addEventListener("click", event => {
    if (event.target === dom.bagOverlay) closeBag();
  });
  dom.continueButton.addEventListener("click", continueJourney);
  dom.restartButton.addEventListener("click", startNewGame);
  document.addEventListener("keydown", handleKeyboard);

  setupSpeechVoices();
  updateSettingButtons();
  startNewGame();
}

/* localStorage 不可用時吞掉例外，遊戲仍完整運作。 */
function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultRecords, ...(parsed || {}), kanaWrong: { ...(parsed?.kanaWrong || {}) } };
  } catch {
    return { ...defaultRecords, kanaWrong: {} };
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 儲存失敗不干擾遊戲流程。
  }
}

function startNewGame() {
  clearTimeout(pendingTimer);
  window.speechSynthesis?.cancel();
  Object.assign(state, {
    stage: 1,
    playerHp: 100,
    stones: 0,
    monsterHp: 100,
    inventory: { potion: 0, magatama: 0, charm: 0 },
    usedItems: { potion: 0, magatama: 0, charm: 0 },
    total: 0,
    correct: 0,
    wrong: 0,
    runWrongCounts: {},
    wrongHistory: [],
    usedKana: new Set(),
    typeDeck: [],
    questionNumber: 0,
    currentQuestion: null,
    locked: false,
    bagOpen: false,
    magatamaActive: false,
    oniArmor: false,
    barrier: false,
    gameEnded: false
  });
  spiritRun = window.KotodamaCompanion?.begin({ stageId: "rpg", allowAny: true, assetBase: "../遊戲7_轉蛋機/assets/images" }) || null;
  configureRpgSpirit();

  dom.bagOverlay.hidden = true;
  dom.endScreen.hidden = true;
  dom.endScreen.classList.remove("is-victory");
  dom.shopScreen.hidden = true;
  dom.battleScreen.hidden = false;
  startStage(1);
}

function configureRpgSpirit() {
  if (!spiritRun?.active) return;
  const petId = spiritRun.pet.id;
  const rarity = spiritRun.pet.rarity;
  const uses = ["SSR", "UR"].includes(rarity) ? 2 : 1;
  if (petId === "xiaomo") {
    spiritRun.setSkill("弱點洞察", uses, () => {
      if (!state.currentQuestion || state.locked) return false;
      const correctIndex = state.currentQuestion.choices.findIndex(choice => choice.correct);
      dom.answerGrid.querySelectorAll("button")[correctIndex]?.classList.add("kotodama-spirit-focus");
      dom.battleMessage.textContent = rarity === "UR" ? `天書啟示：答案的弱點落在 ${["A", "B", "C", "D"][correctIndex]} 區。` : "小墨察覺到正確答案附近的墨光。";
      setTimeout(() => document.querySelectorAll(".kotodama-spirit-focus").forEach(node => node.classList.remove("kotodama-spirit-focus")), 1800);
      return true;
    });
  } else if (petId === "jifeng") {
    spiritRun.setSkill("疾風護時", uses, () => {
      if (state.locked || state.gameEnded) return false;
      spiritRun.meta.delayGuard = rarity === "UR" ? 3000 : 1800;
      dom.battleMessage.textContent = `疾風展開護時結界，敵人的反擊將延後 ${(spiritRun.meta.delayGuard / 1000).toFixed(1)} 秒。`;
      return true;
    });
  } else if (petId === "wenyue") {
    spiritRun.setSkill("萬卷辨識", uses, () => {
      if (!state.currentQuestion || state.locked) return false;
      const wrongIndex = state.currentQuestion.choices.findIndex(choice => !choice.correct && !dom.answerGrid.querySelectorAll("button")[state.currentQuestion.choices.indexOf(choice)]?.disabled);
      const button = dom.answerGrid.querySelectorAll("button")[wrongIndex];
      if (!button) return false;
      button.disabled = true;
      button.classList.add("kotodama-spirit-muted");
      dom.battleMessage.textContent = "文月翻動天書，排除了一個錯誤答案。";
      return true;
    });
  } else if (petId === "xuanxuan") {
    spiritRun.setSkill("時序守護", uses, () => {
      if (state.locked || state.gameEnded) return false;
      spiritRun.meta.damageGuard = rarity === "UR" ? 15 : rarity === "SSR" ? 10 : 5;
      dom.battleMessage.textContent = `玄玄展開時序護甲，下次傷害減少 ${spiritRun.meta.damageGuard}。`;
      return true;
    });
  }
}

function startStage(stageNumber) {
  clearTimeout(pendingTimer);
  state.stage = stageNumber;
  state.monsterHp = 100;
  state.usedKana = new Set();
  state.typeDeck = [];
  state.questionNumber = 0;
  state.currentQuestion = null;
  state.locked = false;
  state.magatamaActive = false;
  state.oniArmor = stageNumber === 3;

  records.highestStage = Math.max(records.highestStage, stageNumber);
  saveRecords();

  const stage = STAGES[stageNumber - 1];
  dom.gameApp.className = `game-shell stage-${stageNumber}`;
  dom.stageBadge.textContent = `第${toChineseNumber(stageNumber)}關`;
  dom.stageTitle.textContent = stage.title;
  dom.abilityText.textContent = stage.ability;
  dom.enemyName.textContent = stage.enemy;
  dom.enemyImage.src = stage.image;
  dom.enemyImage.alt = `${stage.enemy}戰鬥立繪`;
  dom.enemyPanel.className = "fighter enemy-fighter";
  dom.playerPanel.className = "fighter player-fighter";
  dom.armorBadge.hidden = !state.oniArmor;
  dom.barrierBadge.hidden = !state.barrier;
  dom.magatamaAura.hidden = true;
  dom.shopScreen.hidden = true;
  dom.endScreen.hidden = true;
  dom.battleScreen.hidden = false;
  dom.battleMessage.textContent = stageNumber === 1 ? "竹影試煉開始，選出正確答案！" : `${stage.enemy}現身，凝神應戰！`;
  updateHud();
  nextQuestion();
}

function nextQuestion() {
  if (state.gameEnded || state.monsterHp <= 0) return;
  state.locked = false;
  state.magatamaActive = false;
  dom.magatamaAura.hidden = true;
  dom.bagButton.disabled = false;
  dom.enemyPanel.classList.remove("hit", "attack");
  dom.playerPanel.classList.remove("hit", "attack", "critical");
  dom.stampEffect.classList.remove("show");
  dom.battleMessage.textContent = "凝神辨音，選出正確答案！";

  const type = drawQuestionType();
  const correctItem = chooseCorrectItem(type);
  state.usedKana.add(correctItem.kana);
  state.questionNumber += 1;
  state.currentQuestion = buildQuestion(correctItem, type);
  renderQuestion();
}

/* 四題牌組固定為 2 聓力、1 羅馬拼音選假名、1 假名選羅馬拼音，再以 Fisher–Yates 洗牌。 */
function drawQuestionType() {
  if (state.typeDeck.length === 0) {
    state.typeDeck = fisherYates(["listening", "listening", "romajiToKana", "kanaToRomaji"]);
  }
  return state.typeDeck.shift();
}

function chooseCorrectItem(type) {
  const available = KANA_DATA.filter(item => !state.usedKana.has(item.kana));
  if (available.length === 0) {
    state.usedKana.clear();
    return randomItem(KANA_DATA);
  }

  if (state.stage === 5) {
    const latestWrongType = new Map();
    state.wrongHistory.forEach(record => latestWrongType.set(record.kana, record.type));
    const reviewCandidates = available.filter(item => latestWrongType.has(item.kana) && latestWrongType.get(item.kana) !== type);
    if (reviewCandidates.length) return randomItem(reviewCandidates);
  }

  return randomItem(available);
}

function buildQuestion(item, type) {
  const distractors = chooseDistractors(item, type, state.stage);
  const valueFor = data => type === "kanaToRomaji" ? data.romaji : data.kana;
  const choices = fisherYates([
    { value: valueFor(item), correct: true, kana: item.kana },
    ...distractors.map(data => ({ value: valueFor(data), correct: false, kana: data.kana }))
  ]);

  return {
    item,
    type,
    choices,
    plays: 0,
    maxPlays: state.stage >= 4 ? 2 : Infinity,
    convertedFromListening: false
  };
}

function chooseDistractors(answer, type, stageNumber) {
  const selected = [];
  const addFrom = (items, count) => {
    for (const item of fisherYates([...items])) {
      if (selected.length >= count) break;
      if (item.kana !== answer.kana && !selected.some(existing => existing.kana === item.kana)) selected.push(item);
    }
  };

  const allOthers = KANA_DATA.filter(item => item.kana !== answer.kana);
  const visual = answer.visuallySimilar.map(kana => KANA_BY_CHAR.get(kana)).filter(Boolean);
  const phonetic = answer.phoneticallySimilar.map(kana => KANA_BY_CHAR.get(kana)).filter(Boolean);
  const sameRowOrVowel = allOthers.filter(item => item.row === answer.row || item.vowel === answer.vowel);
  const highConfusion = uniqueItems([...visual, ...phonetic, ...sameRowOrVowel]);

  if (stageNumber === 1) {
    const clearlyDifferent = allOthers.filter(item =>
      !answer.visuallySimilar.includes(item.kana) &&
      !answer.phoneticallySimilar.includes(item.kana) &&
      item.row !== answer.row && item.vowel !== answer.vowel
    );
    addFrom(clearlyDifferent, 3);
  } else if (stageNumber === 2) {
    addFrom(type === "listening" ? uniqueItems([...phonetic, ...sameRowOrVowel]) : highConfusion, type === "listening" ? 2 : 1);
  } else if (stageNumber === 3) {
    addFrom(visual, 2);
    addFrom(highConfusion, 3);
  } else if (stageNumber === 4 && type === "listening") {
    addFrom(uniqueItems([...sameRowOrVowel, ...phonetic]), 3);
  } else if (stageNumber === 5) {
    addFrom(highConfusion, 2);
  } else {
    addFrom(highConfusion, 2);
  }

  addFrom(allOthers, 3);
  return selected.slice(0, 3);
}

function renderQuestion() {
  const question = state.currentQuestion;
  const { item, type } = question;
  dom.questionTypeLabel.textContent = QUESTION_TYPES[type];
  dom.questionCounter.textContent = `本關第 ${state.questionNumber} 題`;
  dom.voiceNotice.hidden = true;
  dom.voiceNotice.textContent = "";
  dom.questionPrompt.classList.remove("is-instruction");

  if (type === "listening") {
    dom.questionPrompt.textContent = "聽發音，選出正確的平假名";
    dom.questionPrompt.classList.add("is-instruction");
    dom.listenButton.hidden = false;
    updatePlayCount();
  } else if (type === "romajiToKana") {
    dom.questionPrompt.textContent = item.romaji;
    dom.listenButton.hidden = true;
    dom.playCountText.textContent = "看羅馬拼音，選出對應的平假名";
  } else {
    dom.questionPrompt.textContent = item.kana;
    dom.listenButton.hidden = true;
    dom.playCountText.textContent = "看平假名，選出正確的羅馬拼音";
  }

  dom.tutorialHint.hidden = !(state.stage === 1 && state.questionNumber === 1);
  renderChoices();

  if (type === "listening") prepareListeningQuestion();
}

function renderChoices() {
  dom.answerGrid.replaceChildren();
  const labels = ["A", "B", "C", "D"];
  state.currentQuestion.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.dataset.index = String(index);
    button.setAttribute("aria-label", `${labels[index]}：${choice.value}`);
    button.innerHTML = `<span class="keycap" aria-hidden="true">${labels[index]}</span><span>${choice.value}</span>`;
    button.addEventListener("click", () => answerQuestion(index));
    dom.answerGrid.append(button);
  });
}

function prepareListeningQuestion() {
  if (!records.voice) {
    convertListeningToText("語音已關閉，本題自動改為文字題。");
    return;
  }

  const voice = getJapaneseVoice();
  if (voice) {
    setTimeout(() => playCurrentKana(true), 180);
    return;
  }

  state.locked = true;
  setChoiceButtonsDisabled(true);
  dom.listenButton.disabled = true;
  dom.voiceNotice.hidden = false;
  dom.voiceNotice.textContent = "正在尋找可用的日文語音…";
  const questionRef = state.currentQuestion;
  setTimeout(() => {
    if (state.currentQuestion !== questionRef || questionRef.type !== "listening") return;
    const delayedVoice = getJapaneseVoice();
    state.locked = false;
    setChoiceButtonsDisabled(false);
    if (delayedVoice) {
      dom.voiceNotice.hidden = true;
      playCurrentKana(true);
    } else {
      convertListeningToText("找不到日文語音，本題已自動改為文字題。");
    }
  }, 800);
}

function convertListeningToText(message) {
  const question = state.currentQuestion;
  if (!question || question.type !== "listening") return;
  /*
   * 第五關若錯題原本就是「平假名選羅馬拼音」，語音降級時改採另一種
   * 文字題，確保無日文語音的瀏覽器也遵守「錯題須更換題型」。
   */
  const previousWrong = [...state.wrongHistory].reverse().find(record => record.kana === question.item.kana);
  const fallbackType = state.stage === 5 && previousWrong?.type === "kanaToRomaji"
    ? "romajiToKana"
    : "kanaToRomaji";
  question.type = fallbackType;
  question.convertedFromListening = true;
  question.choices = fisherYates([
    {
      value: fallbackType === "kanaToRomaji" ? question.item.romaji : question.item.kana,
      correct: true,
      kana: question.item.kana
    },
    ...chooseDistractors(question.item, fallbackType, state.stage).map(item => ({
      value: fallbackType === "kanaToRomaji" ? item.romaji : item.kana,
      correct: false,
      kana: item.kana
    }))
  ]);
  state.locked = false;
  dom.questionTypeLabel.textContent = fallbackType === "kanaToRomaji"
    ? "語音替代・平假名選羅馬拼音"
    : "語音替代・羅馬拼音選假名";
  dom.questionPrompt.textContent = fallbackType === "kanaToRomaji" ? question.item.kana : question.item.romaji;
  dom.questionPrompt.classList.remove("is-instruction");
  dom.listenButton.hidden = true;
  dom.listenButton.disabled = false;
  // 題幹下方已清楚說明作答方向；語音降級時只保留一行狀態提示，
  // 避免小螢幕把重複說明擠出卷軸的安全文字區。
  dom.playCountText.textContent = "";
  dom.voiceNotice.hidden = false;
  dom.voiceNotice.textContent = message;
  renderChoices();
  announce(message);
}

function answerQuestion(index) {
  if (state.locked || state.bagOpen || state.gameEnded) return;
  const choice = state.currentQuestion?.choices[index];
  if (!choice) return;

  state.locked = true;
  dom.bagButton.disabled = true;
  setChoiceButtonsDisabled(true);
  state.total += 1;

  if (choice.correct) handleCorrectAnswer(index);
  else handleWrongAnswer(index);
}

function handleCorrectAnswer(index) {
  state.correct += 1;
  state.stones += 5;
  playSfx("correct");
  showStamp("正解");
  markChoice(index, true);

  const critical = state.magatamaActive;
  let damage = critical ? 50 : 25;
  if (state.stage === 3 && state.oniArmor && !critical) damage = 15;

  if (state.stage === 3 && state.oniArmor) {
    state.oniArmor = false;
    dom.armorBadge.hidden = true;
  }

  dom.playerPanel.classList.add(critical ? "critical" : "attack");
  playSfx(critical ? "critical" : "attack");
  dom.battleMessage.textContent = critical
    ? `破邪一擊！造成 ${damage} 傷害，獲得 5 靈石。`
    : `答對！造成 ${damage} 傷害，獲得 5 靈石。`;

  state.magatamaActive = false;
  dom.magatamaAura.hidden = true;
  updateHud();

  setTimeout(() => {
    state.monsterHp = Math.max(0, state.monsterHp - damage);
    dom.enemyPanel.classList.add("hit");
    updateHud();
    if (state.monsterHp <= 0) completeStage();
  }, 310);

  if (state.monsterHp > damage) {
    pendingTimer = setTimeout(nextQuestion, 1080);
  }
}

function handleWrongAnswer(index) {
  const question = state.currentQuestion;
  state.wrong += 1;
  state.runWrongCounts[question.item.kana] = (state.runWrongCounts[question.item.kana] || 0) + 1;
  records.totalWrong += 1;
  records.kanaWrong[question.item.kana] = (records.kanaWrong[question.item.kana] || 0) + 1;
  if (state.stage <= 4) {
    state.wrongHistory.push({ kana: question.item.kana, type: question.type, stage: state.stage });
  }
  saveRecords();

  const lostMagatama = state.magatamaActive;
  state.magatamaActive = false;
  dom.magatamaAura.hidden = true;
  markChoice(index, false);
  revealCorrectChoice();
  playSfx("wrong");

  const correctText = question.type === "kanaToRomaji"
    ? `${question.item.kana} ＝ ${question.item.romaji}`
    : `${question.item.romaji} ＝ ${question.item.kana}`;
  dom.battleMessage.textContent = `答錯了。正確答案：${correctText}${lostMagatama ? "；勾玉失效。" : ""}`;
  announce(`答錯。正確答案是 ${correctText}`);

  const retaliationDelay = 430 + (spiritRun?.meta.delayGuard || 0);
  if (spiritRun?.meta.delayGuard) spiritRun.meta.delayGuard = 0;
  setTimeout(() => {
    dom.enemyPanel.classList.add("attack");
    dom.playerPanel.classList.add("hit");
    playSfx("attack");

    if (state.barrier) {
      state.barrier = false;
      dom.barrierBadge.hidden = true;
      playSfx("charm");
      dom.battleMessage.textContent += " 護命結界擋下了傷害！";
      updateHud();
      pendingTimer = setTimeout(nextQuestion, 1570);
      return;
    }

    const baseDamage = state.stage === 5 ? 25 : 20;
    let damage = Math.max(0, baseDamage - (spiritRun?.meta.damageGuard || 0));
    if (spiritRun?.meta.damageGuard) spiritRun.meta.damageGuard = 0;
    if (spiritRun?.active && spiritRun.pet.id === "fuwan") {
      const rarity = spiritRun.pet.rarity;
      const evadeChance = { N: .08, R: .12, SR: .16, SSR: .22, UR: .25 }[rarity] || 0;
      const guaranteedAvailable = rarity === "UR" && !spiritRun.meta.guaranteedEvadeUsed;
      if (guaranteedAvailable || Math.random() < evadeChance) {
        damage = 0;
        if (guaranteedAvailable) spiritRun.meta.guaranteedEvadeUsed = true;
        dom.battleMessage.textContent += " 福丸帶來大吉之運，成功迴避攻擊！";
      }
    }
    state.playerHp = Math.max(0, state.playerHp - damage);
    playSfx("hurt");
    updateHud();

    if (state.playerHp <= 0) {
      if (state.inventory.charm > 0) {
        state.inventory.charm -= 1;
        state.usedItems.charm += 1;
        state.playerHp = 1;
        state.barrier = true;
        dom.barrierBadge.hidden = false;
        playSfx("charm");
        updateHud();
        dom.battleMessage.textContent += " 替身御守發動：復活至 1 HP，護命結界展開！";
        announce("替身御守發動，復活至一點生命，護命結界展開");
        pendingTimer = setTimeout(nextQuestion, 1570);
      } else {
        pendingTimer = setTimeout(showGameOver, 1570);
      }
    } else {
      pendingTimer = setTimeout(nextQuestion, 1570);
    }
  }, retaliationDelay);
}

function completeStage() {
  clearTimeout(pendingTimer);
  state.locked = true;
  dom.enemyPanel.classList.add("defeated");
  showStamp("討伐");
  playSfx("defeat");
  const drop = randomInteger(20, 50);
  state.stones += drop;
  updateHud();

  setTimeout(() => {
    playSfx("stone");
    dom.battleMessage.textContent = `${STAGES[state.stage - 1].enemy}已討伐！掉落 ${drop} 靈石。`;
    announce(`怪物已討伐，掉落 ${drop} 靈石`);
  }, 460);

  if (state.stage < 5) pendingTimer = setTimeout(showShop, 1750);
  else pendingTimer = setTimeout(showVictory, 1900);
}

function showShop() {
  dom.battleScreen.hidden = true;
  dom.shopScreen.hidden = false;
  dom.shopMessage.textContent = "挑選需要的道具吧。";
  renderShop();
  dom.continueButton.focus({ preventScroll: true });
}

function renderShop() {
  dom.shopHp.textContent = state.playerHp;
  dom.shopStoneCount.textContent = state.stones;
  dom.shopItems.replaceChildren();

  Object.entries(ITEMS).forEach(([key, item]) => {
    const card = document.createElement("article");
    card.className = "item-card";
    const canBuy = state.stones >= item.price && state.inventory[key] < 3;
    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}圖示">
      <h3>${item.name}</h3>
      <p>${item.effect}</p>
      <div class="item-price"><img src="assets/images/icon-spirit-stone.png" alt=""><span>${item.price} 靈石</span></div>
      <div class="owned-count">持有 ${state.inventory[key]} / 3</div>
    `;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "buy-button";
    button.textContent = state.inventory[key] >= 3 ? "持有已滿" : state.stones < item.price ? "靈石不足" : "購買";
    button.disabled = !canBuy;
    button.setAttribute("aria-label", `購買${item.name}，價格 ${item.price} 靈石`);
    button.addEventListener("click", () => buyItem(key));
    card.append(button);
    dom.shopItems.append(card);
  });
}

function buyItem(key) {
  const item = ITEMS[key];
  if (!item || state.stones < item.price || state.inventory[key] >= 3) return;
  state.stones -= item.price;
  state.inventory[key] += 1;
  playSfx("purchase");
  dom.shopMessage.textContent = `購入 ${item.name}！目前持有 ${state.inventory[key]} 個。`;
  renderShop();
}

function continueJourney() {
  if (state.stage >= 5) return;
  dom.shopScreen.hidden = true;
  dom.battleScreen.hidden = false;
  startStage(state.stage + 1);
}

function openBag() {
  if (state.locked || state.gameEnded || dom.battleScreen.hidden) return;
  state.bagOpen = true;
  lastFocusedElement = document.activeElement;
  window.speechSynthesis?.cancel();
  renderBag();
  dom.bagOverlay.hidden = false;
  dom.bagClose.focus();
  announce("背包已開啟，作答暫停");
}

function closeBag() {
  if (!state.bagOpen) return;
  state.bagOpen = false;
  dom.bagOverlay.hidden = true;
  lastFocusedElement?.focus();
  announce("背包已關閉");
}

function renderBag() {
  dom.bagItems.replaceChildren();
  Object.entries(ITEMS).forEach(([key, item]) => {
    const card = document.createElement("article");
    card.className = "bag-item";
    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}圖示">
      <h3>${item.name}</h3>
      <p>${item.effect}</p>
      <div class="bag-count">持有 ${state.inventory[key]} / 3</div>
    `;
    if (key !== "charm") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "use-button";
      button.textContent = "使用";
      button.setAttribute("aria-label", `使用${item.name}`);
      button.disabled = state.inventory[key] <= 0 ||
        (key === "potion" && state.playerHp >= 100) ||
        (key === "magatama" && state.magatamaActive);
      button.addEventListener("click", () => useItem(key));
      card.append(button);
    } else {
      const note = document.createElement("strong");
      note.textContent = "死亡時自動發動";
      card.append(note);
    }
    dom.bagItems.append(card);
  });
}

function useItem(key) {
  if (state.inventory[key] <= 0) return;
  if (key === "potion") {
    if (state.playerHp >= 100) return;
    state.inventory.potion -= 1;
    state.usedItems.potion += 1;
    state.playerHp = Math.min(100, state.playerHp + 50);
    playSfx("heal");
    updateHud();
    dom.battleMessage.textContent = "使用回春丹，恢復 50 HP！";
  } else if (key === "magatama") {
    if (state.magatamaActive) return;
    state.inventory.magatama -= 1;
    state.usedItems.magatama += 1;
    state.magatamaActive = true;
    dom.magatamaAura.hidden = false;
    playSfx("critical");
    dom.battleMessage.textContent = "破邪勾玉已啟動：本題答對將造成 50 傷害。";
  }
  closeBag();
}

function showGameOver() {
  state.gameEnded = true;
  updateRunHistory();
  dom.battleScreen.hidden = true;
  dom.shopScreen.hidden = true;
  dom.endScreen.hidden = false;
  dom.endScreen.classList.remove("is-victory");
  dom.endKicker.textContent = "討伐中止";
  dom.endTitle.textContent = "Game Over";
  dom.endSummary.textContent = "符劍士力竭倒下。沒有御守時，只能從第一關重新出發。";
  const accuracy = calculateAccuracy();
  renderStats([
    ["目前到達關卡", `第 ${state.stage} 關`],
    ["本次答對題數", `${state.correct} 題`],
    ["正確率", `${accuracy}%`]
  ]);
  dom.wrongKanaList.replaceChildren();
  dom.restartButton.textContent = "從第一關重新開始";
  dom.endTitle.tabIndex = -1;
  dom.endTitle.focus({ preventScroll: true });
}

function showVictory() {
  state.gameEnded = true;
  try { localStorage.setItem("cert_warrior", "true"); } catch (_) { /* 憑證儲存失敗不影響原遊戲結算。 */ }
  spiritRun?.reward();
  updateRunHistory();
  playSfx("victory");
  dom.battleScreen.hidden = true;
  dom.shopScreen.hidden = true;
  dom.endScreen.hidden = false;
  dom.endScreen.classList.add("is-victory");
  dom.endKicker.textContent = "五關平定";
  dom.endTitle.textContent = "討伐完成";
  dom.endSummary.textContent = "五十音化作言靈，無面魔將已被封印。以下是本次完整修練記錄。";
  renderStats([
    ["總題數", `${state.total} 題`],
    ["答對題數", `${state.correct} 題`],
    ["答錯題數", `${state.wrong} 題`],
    ["正確率", `${calculateAccuracy()}%`],
    ["剩餘 HP", `${state.playerHp}`],
    ["剩餘靈石", `${state.stones}`],
    ["使用回春丹", `${state.usedItems.potion} 個`],
    ["使用破邪勾玉", `${state.usedItems.magatama} 個`],
    ["發動替身御守", `${state.usedItems.charm} 個`]
  ]);
  renderWrongKanaSummary();
  dom.restartButton.textContent = "重新討伐";
  dom.endTitle.tabIndex = -1;
  dom.endTitle.focus({ preventScroll: true });
  announce("恭喜通關，五關討伐完成");
}

function renderStats(rows) {
  dom.statsList.replaceChildren();
  rows.forEach(([label, value]) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    dom.statsList.append(dt, dd);
  });
}

function renderWrongKanaSummary() {
  dom.wrongKanaList.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = "最常答錯假名（最多 5 個）";
  dom.wrongKanaList.append(title);
  const entries = Object.entries(state.runWrongCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))
    .slice(0, 5);
  if (!entries.length) {
    const perfect = document.createElement("p");
    perfect.textContent = "本次沒有錯題。";
    dom.wrongKanaList.append(perfect);
    return;
  }
  const chips = document.createElement("div");
  chips.className = "wrong-kana-chips";
  entries.forEach(([kana, count]) => {
    const chip = document.createElement("span");
    chip.className = "wrong-chip";
    chip.textContent = `${kana} × ${count}`;
    chips.append(chip);
  });
  dom.wrongKanaList.append(chips);
}

function updateRunHistory() {
  records.highestStage = Math.max(records.highestStage, state.stage);
  records.bestAccuracy = Math.max(records.bestAccuracy, calculateAccuracy());
  saveRecords();
}

function calculateAccuracy() {
  return state.total === 0 ? 0 : Math.round((state.correct / state.total) * 100);
}

function updateHud() {
  dom.stoneCount.textContent = state.stones;
  dom.playerHpText.textContent = `HP ${state.playerHp} / 100`;
  dom.enemyHpText.textContent = `HP ${state.monsterHp} / 100`;
  dom.playerHpBar.style.width = `${state.playerHp}%`;
  dom.enemyHpBar.style.width = `${state.monsterHp}%`;
  dom.playerHpBar.classList.toggle("low", state.playerHp <= 30);
  dom.enemyHpBar.classList.toggle("low", state.monsterHp <= 30);
  dom.playerHpBar.parentElement.setAttribute("aria-valuenow", String(state.playerHp));
  dom.enemyHpBar.parentElement.setAttribute("aria-valuenow", String(state.monsterHp));
  dom.barrierBadge.hidden = !state.barrier;
}

function markChoice(index, correct) {
  const buttons = [...dom.answerGrid.querySelectorAll(".answer-button")];
  buttons[index]?.classList.add(correct ? "correct-choice" : "wrong-choice");
}

function revealCorrectChoice() {
  const buttons = [...dom.answerGrid.querySelectorAll(".answer-button")];
  const correctIndex = state.currentQuestion.choices.findIndex(choice => choice.correct);
  buttons[correctIndex]?.classList.add("correct-choice");
}

function setChoiceButtonsDisabled(disabled) {
  dom.answerGrid.querySelectorAll("button").forEach(button => { button.disabled = disabled; });
}

function showStamp(text) {
  dom.stampText.textContent = text;
  dom.stampEffect.classList.remove("show");
  void dom.stampEffect.offsetWidth;
  dom.stampEffect.classList.add("show");
}

function handleKeyboard(event) {
  if (event.key === "Escape" && state.bagOpen) {
    event.preventDefault();
    closeBag();
    return;
  }
  if (state.bagOpen || state.locked || state.gameEnded || dom.battleScreen.hidden) return;
  const key = event.key.toUpperCase();
  const index = ["A", "B", "C", "D"].indexOf(key);
  if (index >= 0) {
    event.preventDefault();
    dom.answerGrid.querySelectorAll("button")[index]?.click();
  }
}

/* SpeechSynthesis：只接受 ja-JP 或 ja 開頭語音；無日文語音即改題型。 */
function setupSpeechVoices() {
  if (!("speechSynthesis" in window)) return;
  const refresh = () => {
    japaneseVoices = window.speechSynthesis.getVoices().filter(voice => /^ja(?:-|$)/i.test(voice.lang));
  };
  refresh();
  window.speechSynthesis.addEventListener?.("voiceschanged", refresh);
}

function getJapaneseVoice() {
  if (!("speechSynthesis" in window)) return null;
  if (!japaneseVoices.length) {
    japaneseVoices = window.speechSynthesis.getVoices().filter(voice => /^ja(?:-|$)/i.test(voice.lang));
  }
  return japaneseVoices.find(voice => /^ja-JP$/i.test(voice.lang)) || japaneseVoices[0] || null;
}

function playCurrentKana(isAutomatic) {
  const question = state.currentQuestion;
  if (!question || question.type !== "listening" || state.bagOpen || state.gameEnded) return;
  if (!records.voice) {
    convertListeningToText("語音已關閉，本題自動改為文字題。");
    return;
  }
  if (question.plays >= question.maxPlays) return;
  const voice = getJapaneseVoice();
  if (!voice) {
    convertListeningToText("找不到日文語音，本題已自動改為文字題。");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(question.item.kana);
  utterance.lang = voice.lang || "ja-JP";
  utterance.voice = voice;
  utterance.rate = .72;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  question.plays += 1;
  updatePlayCount();
  if (!isAutomatic) announce(`已播放 ${question.item.kana} 的發音`);
}

function updatePlayCount() {
  const question = state.currentQuestion;
  if (!question || question.type !== "listening") return;
  if (Number.isFinite(question.maxPlays)) {
    const remaining = Math.max(0, question.maxPlays - question.plays);
    dom.playCountText.textContent = `剩餘播放次數：${remaining}`;
    dom.listenButtonText.textContent = remaining > 0 ? "播放發音" : "已達播放上限";
    dom.listenButton.disabled = remaining <= 0;
  } else {
    dom.playCountText.textContent = "本關可不限次數重播";
    dom.listenButtonText.textContent = "播放發音";
    dom.listenButton.disabled = false;
  }
}

function toggleSound() {
  records.sound = !records.sound;
  saveRecords();
  updateSettingButtons();
  if (records.sound) playSfx("purchase");
}

function toggleVoice() {
  records.voice = !records.voice;
  saveRecords();
  updateSettingButtons();
  if (!records.voice) {
    window.speechSynthesis?.cancel();
    if (state.currentQuestion?.type === "listening" && !state.locked) {
      convertListeningToText("語音已關閉，本題自動改為文字題。");
    }
  }
}

function updateSettingButtons() {
  dom.soundToggle.setAttribute("aria-pressed", String(records.sound));
  dom.voiceToggle.setAttribute("aria-pressed", String(records.voice));
  dom.soundToggle.setAttribute("aria-label", records.sound ? "關閉音效" : "開啟音效");
  dom.voiceToggle.setAttribute("aria-label", records.voice ? "關閉語音" : "開啟語音");
}

/* Web Audio API 即時合成十一種遊戲音效，不載入任何外部音檔。 */
function getAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioContext = new AudioCtx();
  }
  if (audioContext?.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

function tone(ctx, frequency, start, duration, type = "sine", volume = .08, endFrequency = null) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .015);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + .03);
}

function noiseBurst(ctx, start, duration, volume = .045) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  gain.gain.value = volume;
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(start);
}

function playSfx(name) {
  if (!records.sound) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime + .01;

  const sequences = {
    correct: [[523, 0, .11, "sine"], [659, .09, .12, "sine"], [784, .18, .2, "triangle"]],
    wrong: [[310, 0, .15, "square", 250], [230, .13, .24, "sawtooth", 120]],
    attack: [[540, 0, .08, "sawtooth", 110]],
    hurt: [[150, 0, .18, "square", 75], [95, .08, .22, "sawtooth", 55]],
    critical: [[392, 0, .1, "triangle"], [784, .08, .14, "square"], [1175, .19, .3, "sine"]],
    stone: [[880, 0, .08, "sine"], [1175, .08, .1, "sine"], [1568, .17, .2, "triangle"]],
    purchase: [[440, 0, .08, "triangle"], [660, .08, .16, "sine"]],
    heal: [[330, 0, .12, "sine"], [440, .1, .15, "sine"], [660, .22, .28, "sine"]],
    charm: [[262, 0, .22, "sine"], [523, .07, .32, "triangle"], [1046, .18, .38, "sine"]],
    defeat: [[220, 0, .16, "sawtooth", 170], [170, .14, .2, "sawtooth", 100], [100, .31, .35, "triangle", 45]],
    victory: [[392, 0, .15, "triangle"], [523, .13, .15, "triangle"], [659, .26, .15, "triangle"], [784, .39, .45, "sine"]]
  };

  (sequences[name] || sequences.purchase).forEach(([frequency, offset, duration, type, endFrequency]) => {
    tone(ctx, frequency, now + offset, duration, type, name === "victory" ? .095 : .07, endFrequency);
  });
  if (["attack", "hurt", "critical", "defeat"].includes(name)) noiseBurst(ctx, now, name === "defeat" ? .34 : .15);
}

function announce(message) {
  dom.srStatus.textContent = "";
  setTimeout(() => { dom.srStatus.textContent = message; }, 15);
}

function fisherYates(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function uniqueItems(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item || seen.has(item.kana)) return false;
    seen.add(item.kana);
    return true;
  });
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toChineseNumber(number) {
  return ["零", "一", "二", "三", "四", "五"][number] || String(number);
}

if (location.hash === "#qa") {
  window.__gameDebug = Object.freeze({
    finishSuccess() { showVictory(); }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "F7") window.__gameDebug.finishSuccess();
  });
}
