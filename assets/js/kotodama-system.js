(() => {
  "use strict";

  const STORAGE_KEY = "kotodamaGameData";
  const DATA_VERSION = 2;
  const RARITY_ORDER = Object.freeze(["N", "R", "SR", "SSR", "UR"]);
  const RARITY_CONFIG = Object.freeze({
    N: Object.freeze({ label: "普通", baseRate: 50, fragments: 5 }),
    R: Object.freeze({ label: "不錯", baseRate: 28, fragments: 10 }),
    SR: Object.freeze({ label: "稀有", baseRate: 14, fragments: 20 }),
    SSR: Object.freeze({ label: "史詩", baseRate: 6, fragments: 40 }),
    UR: Object.freeze({ label: "傳說", baseRate: 2, fragments: 80 })
  });
  const EVOLUTION_CONFIG = Object.freeze({ N: 10, R: 20, SR: 40, SSR: 80 });
  const GACHA_CONFIG = Object.freeze({
    singleCost: 1,
    tenCost: 10,
    hardPity: 80,
    tenPullGuarantee: Object.freeze({ SR: 70, SSR: 25, UR: 5 })
  });

  const PET_CONFIG = Object.freeze({
    xiaomo: Object.freeze({
      id: "xiaomo", family: "墨靈狐・小墨", stageId: "match", game: "消除遊戲", talent: "觀察、配對",
      forms: Object.freeze({
        N: Object.freeze({ name: "墨點狐", skill: "墨跡尋蹤", ability: "每局一次，短暫提示一組正確配對。", appearance: "米白色小狐狸，耳尖與尾巴末端有淡墨暈染，尾巴像毛筆。", image: "pets/xiaomo-n.png" }),
        R: Object.freeze({ name: "墨尾狐", skill: "雙尾墨引", ability: "每局可以提示兩次。", appearance: "體型稍大，背小卷軸，額頭有墨紋。", image: "pets/xiaomo-r.png" }),
        SR: Object.freeze({ name: "靈墨狐", skill: "靈墨指引", ability: "提示時額外標示其中一個正確目標。", appearance: "兩尾靈狐，身旁漂浮墨滴與紙片。", image: "pets/xiaomo-sr.png" }),
        SSR: Object.freeze({ name: "九墨靈狐", skill: "靈墨指引", ability: "連續答錯時，自動發動一次靈墨指引。", appearance: "大型多尾靈狐，墨流、符文與古卷環繞。", image: "pets/xiaomo-ssr.png" }),
        UR: Object.freeze({ name: "天書九尾", skill: "天書啟示", ability: "每局第一次陷入困難時，自動標示一組正確配對。", appearance: "九尾完全展開，巨大發光天書與金色書法光粒環繞。", image: "pets/xiaomo-ur.png" })
      })
    }),
    fuwan: Object.freeze({
      id: "fuwan", family: "運籤狸・福丸", stageId: "joker", game: "抽鬼牌", talent: "運氣、判斷、風險控制",
      forms: Object.freeze({
        N: Object.freeze({ name: "小福狸", skill: "妖氣微動", ability: "鬼牌偶爾輕微抖動。", appearance: "圓滾小狸貓，戴小斗笠並抱著迷你籤筒。", image: "pets/fuwan-n.png" }),
        R: Object.freeze({ name: "籤運狸", skill: "排除惡籤", ability: "每局一次，排除一張不是鬼牌的牌。", appearance: "佩戴鈴鐺、籤袋與小籤，尾巴帶金色紋樣。", image: "pets/fuwan-r.png" }),
        SR: Object.freeze({ name: "招福狸", skill: "吉凶占卜", ability: "每局一次吉凶占卜，縮小鬼牌可能範圍。", appearance: "抱著福字牌與大籤筒，漂浮符紙環繞。", image: "pets/fuwan-sr.png" }),
        SSR: Object.freeze({ name: "大吉福狸", skill: "大吉警兆", ability: "即將抽到鬼牌時，有一定機率警告。", appearance: "穿和風外袍，斗笠有金紋，身後浮現大吉籤影。", image: "pets/fuwan-ssr.png" }),
        UR: Object.freeze({ name: "天運神狸", skill: "天運改籤", ability: "每局一次，抽到鬼牌時可以取消並重新抽一次。", appearance: "金棕神使狸，神社光環、紙垂與神器籤筒環繞。", image: "pets/fuwan-ur.png" })
      })
    }),
    jifeng: Object.freeze({
      id: "jifeng", family: "雷迅鼬・疾風", stageId: "mole", game: "打地鼠", talent: "反應速度",
      forms: Object.freeze({
        N: Object.freeze({ name: "迅鼬", skill: "迅風延時", ability: "目標停留時間 +0.3 秒。", appearance: "身形輕巧的茶金小鼬，足邊僅有淡淡風痕。", image: "pets/jifeng-n.png" }),
        R: Object.freeze({ name: "風鼬", skill: "風行延時", ability: "目標停留時間 +0.5 秒。", appearance: "戴青色風巾與護腕，身上的風紋更清晰。", image: "pets/jifeng-r.png" }),
        SR: Object.freeze({ name: "雷迅鼬", skill: "雷光尋標", ability: "正確目標偶爾出現短暫提示光圈。", appearance: "雷紋發光，風葉與細小電弧在身旁盤旋。", image: "pets/jifeng-sr.png" }),
        SSR: Object.freeze({ name: "迅雷獸", skill: "疾風連擊", ability: "連續答對後進入疾風模式，取得額外時間。", appearance: "大型迅雷靈獸，披風、雷環與疾風光帶環繞。", image: "pets/jifeng-ssr.png" }),
        UR: Object.freeze({ name: "天雷神鼬", skill: "天雷止時", ability: "每局一次，可停止倒數約 2～3 秒。", appearance: "傳說雷神鼬，巨大雷鼓光環與金色雷霆神器完全顯現。", image: "pets/jifeng-ur.png" })
      })
    }),
    wenyue: Object.freeze({
      id: "wenyue", family: "卷書貓・文月", stageId: "sorting", game: "拖曳分類", talent: "分類、整理、判斷",
      forms: Object.freeze({
        N: Object.freeze({ name: "書卷貓", skill: "卷頁小箋", ability: "每局一次，提示某項可能的分類。", appearance: "奶茶色小貓，背著一卷簡單書卷。", image: "pets/wenyue-n.png" }),
        R: Object.freeze({ name: "學士貓", skill: "學士寬免", ability: "一次錯誤拖曳不會中斷連擊。", appearance: "戴學士小帽，佩帶筆架與分類木牌。", image: "pets/wenyue-r.png" }),
        SR: Object.freeze({ name: "文庫靈貓", skill: "文庫微光", ability: "停滯太久時，正確分類區域微微發光。", appearance: "浮空書頁、發光書紋與小型卷軸靈氣環繞。", image: "pets/wenyue-sr.png" }),
        SSR: Object.freeze({ name: "萬卷賢貓", skill: "萬卷辨誤", ability: "連續答錯後排除一個錯誤分類區。", appearance: "大型賢者靈貓，萬卷書環與智慧光輪展開。", image: "pets/wenyue-ssr.png" }),
        UR: Object.freeze({ name: "天書神貓", skill: "天書定域", ability: "每局一次，只保留可能的正確分類區。", appearance: "天書神器完全展開，金色文字光粒與巨大書頁光環環繞。", image: "pets/wenyue-ur.png" })
      })
    }),
    xuanxuan: Object.freeze({
      id: "xuanxuan", family: "時巡龜・玄玄", stageId: "order", game: "排序遊戲", talent: "順序、邏輯、時間",
      forms: Object.freeze({
        N: Object.freeze({ name: "小玄龜", skill: "時序一點", ability: "每局一次，提示一個項目的正確位置。", appearance: "青黑小龜，龜甲上只有簡單時刻紋。", image: "pets/xuanxuan-n.png" }),
        R: Object.freeze({ name: "時刻龜", skill: "前後時刻", ability: "提示兩個項目的前後關係。", appearance: "龜甲增加日晷刻度與小型時輪配件。", image: "pets/xuanxuan-r.png" }),
        SR: Object.freeze({ name: "時巡玄龜", skill: "錯位巡查", ability: "排序錯誤時指出其中一個錯誤位置。", appearance: "發光時間紋、浮動沙漏與細小星盤環繞。", image: "pets/xuanxuan-sr.png" }),
        SSR: Object.freeze({ name: "歲月玄武", skill: "歲月留痕", ability: "提交錯誤時保留所有已經放對的位置。", appearance: "大型玄武神獸，歲月光環與古老時盤展開。", image: "pets/xuanxuan-ssr.png" }),
        UR: Object.freeze({ name: "時界玄武", skill: "時界鎖定", ability: "每局一次，直接鎖定兩個正確位置。", appearance: "傳說時界玄武，巨大環形時輪、星辰沙漏與金色時間光粒環繞。", image: "pets/xuanxuan-ur.png" })
      })
    })
  });

  function createDefaultGachaData() {
    return {
      spiritStones: 0,
      pityCount: 0,
      totalPulls: 0,
      pets: {},
      collection: {},
      equippedPet: null,
      awardedRuns: {},
      history: [],
      soundEnabled: true
    };
  }

  function createDefaultData() { return { version: DATA_VERSION, gacha: createDefaultGachaData() }; }

  function sanitizeGachaData(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const result = { ...createDefaultGachaData(), ...source };
    result.spiritStones = Math.max(0, Math.floor(Number(result.spiritStones) || 0));
    result.pityCount = Math.min(79, Math.max(0, Math.floor(Number(result.pityCount) || 0)));
    result.totalPulls = Math.max(0, Math.floor(Number(result.totalPulls) || 0));
    result.pets = result.pets && typeof result.pets === "object" ? result.pets : {};
    result.collection = result.collection && typeof result.collection === "object" ? result.collection : {};
    result.awardedRuns = result.awardedRuns && typeof result.awardedRuns === "object" ? result.awardedRuns : {};
    if (source.awardedStages && typeof source.awardedStages === "object") {
      Object.assign(result.awardedRuns, source.awardedStages);
    }
    result.history = Array.isArray(result.history) ? result.history.slice(0, 100) : [];
    result.soundEnabled = result.soundEnabled !== false;
    Object.keys(result.pets).forEach(petId => {
      const state = result.pets[petId];
      if (!PET_CONFIG[petId] || !state || !RARITY_ORDER.includes(state.rarity)) {
        delete result.pets[petId];
        return;
      }
      state.fragments = Math.max(0, Math.floor(Number(state.fragments) || 0));
    });
    if (result.equippedPet && !result.pets[result.equippedPet]) result.equippedPet = null;
    const runEntries = Object.entries(result.awardedRuns).slice(-300);
    result.awardedRuns = Object.fromEntries(runEntries);
    delete result.awardedStages;
    delete result.standaloneStageCounter;
    return result;
  }

  function loadGameData() {
    let data = createDefaultData();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") data = { ...parsed };
      }
    } catch (_) {}
    data.version = Math.max(DATA_VERSION, Number(data.version) || 0);
    data.gacha = sanitizeGachaData(data.gacha);
    return data;
  }

  function saveGameData(data) {
    const safe = data && typeof data === "object" ? data : createDefaultData();
    safe.version = Math.max(DATA_VERSION, Number(safe.version) || 0);
    safe.gacha = sanitizeGachaData(safe.gacha);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
      window.dispatchEvent(new CustomEvent("kotodama:data-changed", { detail: { data: safe } }));
      return true;
    } catch (_) { return false; }
  }

  function update(mutator) {
    const data = loadGameData();
    const value = mutator(data);
    saveGameData(data);
    return value;
  }

  function addSpiritStone(amount = 1) {
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
    return update(data => (data.gacha.spiritStones += safeAmount));
  }

  function getSpiritStoneCount() { return loadGameData().gacha.spiritStones; }

  function makeRunId(stageId) {
    const safeStage = String(stageId || "stage").replace(/[^a-z0-9_-]/gi, "-");
    const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${safeStage}:${random}`;
  }

  function awardStageClear(runId, stageId = "stage") {
    const normalized = String(runId || "").trim();
    if (!normalized) return { awarded: false, reason: "invalid-run-id", spiritStones: getSpiritStoneCount() };
    let response;
    update(data => {
      if (data.gacha.awardedRuns[normalized]) {
        response = { awarded: false, reason: "already-awarded", spiritStones: data.gacha.spiritStones };
        return;
      }
      data.gacha.awardedRuns[normalized] = { stageId: String(stageId), at: new Date().toISOString() };
      data.gacha.spiritStones += 1;
      response = { awarded: true, runId: normalized, stageId: String(stageId), amount: 1, spiritStones: data.gacha.spiritStones };
    });
    return response;
  }

  function getPetData(petId) {
    const data = loadGameData();
    const config = PET_CONFIG[petId];
    if (!config) return null;
    const state = data.gacha.pets[petId] || null;
    return {
      id: petId,
      family: config.family,
      stageId: config.stageId,
      game: config.game,
      talent: config.talent,
      owned: Boolean(state),
      rarity: state?.rarity || null,
      fragments: state?.fragments || 0,
      equipped: data.gacha.equippedPet === petId,
      form: state ? { ...config.forms[state.rarity] } : null
    };
  }

  function getOwnedPets() { return Object.keys(PET_CONFIG).map(getPetData).filter(pet => pet?.owned); }
  function getEquippedPet() {
    const equippedId = loadGameData().gacha.equippedPet;
    return equippedId ? getPetData(equippedId) : null;
  }
  function setEquippedPet(petId) {
    return update(data => {
      if (petId === null) { data.gacha.equippedPet = null; return true; }
      if (!PET_CONFIG[petId] || !data.gacha.pets[petId]) return false;
      data.gacha.equippedPet = petId;
      return true;
    });
  }

  function joinAsset(base, relative) {
    return `${String(base || "").replace(/\/$/, "")}/${String(relative || "").replace(/^\//, "")}`;
  }
  function getPetConfig(assetBase = "") {
    return Object.fromEntries(Object.entries(PET_CONFIG).map(([petId, pet]) => [petId, {
      ...pet,
      forms: Object.fromEntries(Object.entries(pet.forms).map(([rarity, form]) => [rarity, { ...form, image: joinAsset(assetBase, form.image) }]))
    }]));
  }

  const api = Object.freeze({
    STORAGE_KEY,
    DATA_VERSION,
    RARITY_ORDER,
    RARITY_CONFIG,
    GACHA_CONFIG,
    EVOLUTION_CONFIG,
    PET_CONFIG,
    createDefaultData,
    createDefaultGachaData,
    sanitizeGachaData,
    loadGameData,
    saveGameData,
    addSpiritStone,
    getSpiritStoneCount,
    makeRunId,
    awardStageClear,
    getOwnedPets,
    getPetData,
    getEquippedPet,
    setEquippedPet,
    getPetConfig,
    joinAsset
  });
  window.KotodamaGame = api;
})();
