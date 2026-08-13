(() => {
  "use strict";

  const GAME_DURATION_MS = 180_000;
  const QUESTION_DURATION_MS = 7_000;
  const MAX_LIVES = 5;
  const ASSET_ROOT = "assets/images/";
  const STORAGE_KEY = "kanaMoleBestV1";

  // 本卷固定使用的 16 個平假名與赫本式羅馬拼音。
  const KANA = [
    { kana: "ま", romaji: "ma" }, { kana: "み", romaji: "mi" },
    { kana: "む", romaji: "mu" }, { kana: "め", romaji: "me" },
    { kana: "も", romaji: "mo" }, { kana: "や", romaji: "ya" },
    { kana: "ゆ", romaji: "yu" }, { kana: "よ", romaji: "yo" },
    { kana: "ら", romaji: "ra" }, { kana: "り", romaji: "ri" },
    { kana: "る", romaji: "ru" }, { kana: "れ", romaji: "re" },
    { kana: "ろ", romaji: "ro" }, { kana: "わ", romaji: "wa" },
    { kana: "を", romaji: "wo" }, { kana: "ん", romaji: "n" }
  ];

  const MOLE_ART = ["mole_kasa.png", "mole_ninja.png", "mole_samurai.png", "mole_tanuki.png"];

  const dom = {};
  const settings = { audio: true, voice: true };
  let animationFrame = 0;
  let statusTimer = 0;
  let spiritRun = null;

  const state = {
    active: false,
    paused: false,
    score: 0,
    lives: MAX_LIVES,
    combo: 0,
    maxCombo: 0,
    correct: 0,
    wrong: 0,
    gameStartedAt: 0,
    gameEndsAt: 0,
    pauseStartedAt: 0,
    questionStartedAt: 0,
    questionDeadline: 0,
    nextQuestionAt: 0,
    waveHideAt: 0,
    nextWaveAt: 0,
    pendingEndAt: 0,
    questionResolved: true,
    target: null,
    stats: new Map(),
    previousTarget: null
  };

  // 以 Web Audio 即時合成短音效，不需額外載入音訊檔。
  class AudioEngine {
    constructor() { this.context = null; }

    ensure() {
      if (!settings.audio) return null;
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      if (!this.context) this.context = new Context();
      if (this.context.state === "suspended") this.context.resume();
      return this.context;
    }

    tone(frequency, duration, type = "sine", volume = 0.1, delay = 0) {
      const ctx = this.ensure();
      if (!ctx) return;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.025);
    }

    button() { this.tone(520, 0.08, "sine", 0.045); }
    success() {
      this.tone(660, 0.13, "sine", 0.09);
      this.tone(880, 0.17, "triangle", 0.085, 0.1);
      this.tone(1180, 0.2, "sine", 0.055, 0.2);
    }
    wrong() {
      this.tone(235, 0.18, "triangle", 0.075);
      this.tone(175, 0.24, "sine", 0.065, 0.12);
    }
  }

  const audio = new AudioEngine();

  // 發音固定指定 ja-JP；回呼用來確保答對時先發音、後播成功音。
  function speakKana(kana, onEnd) {
    if (!settings.voice || !("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(kana);
    utterance.lang = "ja-JP";
    utterance.rate = 0.78;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    const finish = () => { if (onEnd) onEnd(); };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  }

  // ---------- 畫面初始化與共用控制 ----------
  function cacheDom() {
    const ids = [
      "start-screen", "instruction-screen", "game-screen", "result-screen", "pause-overlay",
      "start-button", "instructions-button", "instruction-start-button", "back-to-start-button",
      "play-again-button", "result-home-button", "resume-button", "pause-restart-button", "pause-home-button",
      "best-score", "best-accuracy", "best-combo", "kana-map", "target-romaji", "question-time",
      "game-time", "score", "combo", "hearts", "status-message", "mole-grid", "game-progress",
      "result-score", "result-accuracy", "result-correct", "result-wrong", "result-combo",
      "result-reaction", "result-hardest", "result-table", "encouragement"
    ];
    ids.forEach((id) => { dom[toCamel(id)] = document.getElementById(id); });
  }

  function toCamel(value) { return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()); }

  function init() {
    cacheDom();
    renderKanaMap();
    buildMoleGrid();
    buildControls(document.getElementById("start-controls"), ["audio", "voice", "fullscreen"]);
    buildControls(document.getElementById("game-controls"), ["audio", "voice", "pause", "restart", "fullscreen"]);
    bindEvents();
    renderBestRecords();
    renderHearts();
    preloadGameplayArt();
  }

  function bindEvents() {
    dom.startButton.addEventListener("click", startGame);
    dom.instructionStartButton.addEventListener("click", startGame);
    dom.instructionsButton.addEventListener("click", () => { audio.button(); showScreen("instruction"); });
    dom.backToStartButton.addEventListener("click", goHome);
    dom.playAgainButton.addEventListener("click", startGame);
    dom.resultHomeButton.addEventListener("click", goHome);
    dom.resumeButton.addEventListener("click", resumeGame);
    dom.pauseRestartButton.addEventListener("click", startGame);
    dom.pauseHomeButton.addEventListener("click", goHome);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", updateControlIcons);
    window.addEventListener("pagehide", () => {
      if (state.active && !state.paused) pauseGame();
    });
  }

  function renderKanaMap() {
    dom.kanaMap.innerHTML = KANA.map((item) =>
      `<div class="kana-chip"><strong lang="ja">${item.kana}</strong><span>${item.romaji}</span></div>`
    ).join("");
  }

  function buildMoleGrid() {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 6; index += 1) {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "mole-slot";
      slot.dataset.index = String(index);
      slot.tabIndex = -1;
      slot.setAttribute("aria-label", `第 ${index + 1} 個洞，沒有角色`);
      slot.innerHTML = `
        <div class="mole-body" aria-hidden="true">
          <img class="mole-art" src="${ASSET_ROOT}${MOLE_ART[index % MOLE_ART.length]}" alt="">
          <span class="kana-badge" lang="ja"></span>
        </div>
        <img class="hole-art" src="${ASSET_ROOT}hole.png" alt="" aria-hidden="true">`;
      slot.addEventListener("click", () => hitMole(slot));
      fragment.appendChild(slot);
    }
    dom.moleGrid.appendChild(fragment);
  }

  function buildControls(container, actions) {
    actions.forEach((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "icon-button";
      button.dataset.action = action;
      button.innerHTML = `<img alt=""><span class="sr-only"></span>`;
      button.addEventListener("click", () => handleControl(action));
      container.appendChild(button);
    });
    updateControlIcons();
  }

  function handleControl(action) {
    if (action === "audio") {
      if (settings.audio) audio.button();
      settings.audio = !settings.audio;
    } else if (action === "voice") {
      audio.button();
      settings.voice = !settings.voice;
      if (!settings.voice && "speechSynthesis" in window) window.speechSynthesis.cancel();
    } else if (action === "pause") {
      audio.button();
      pauseGame();
    } else if (action === "restart") {
      audio.button();
      startGame();
    } else if (action === "fullscreen") {
      audio.button();
      toggleFullscreen();
    }
    updateControlIcons();
  }

  function updateControlIcons() {
    const fullscreen = Boolean(document.fullscreenElement);
    document.querySelectorAll(".icon-button").forEach((button) => {
      const action = button.dataset.action;
      const img = button.querySelector("img");
      const label = button.querySelector("span");
      let file = "";
      let text = "";
      let pressed = null;
      if (action === "audio") {
        file = settings.audio ? "icon_audio_on.png" : "icon_audio_off.png";
        text = settings.audio ? "關閉音效" : "開啟音效";
        pressed = settings.audio;
      } else if (action === "voice") {
        file = settings.voice ? "icon_voice_on.png" : "icon_voice_off.png";
        text = settings.voice ? "關閉日語發音" : "開啟日語發音";
        pressed = settings.voice;
      } else if (action === "fullscreen") {
        file = "icon_fullscreen.png";
        text = fullscreen ? "離開全螢幕" : "進入全螢幕";
      } else if (action === "pause") {
        file = "icon_pause.png";
        text = "暫停遊戲";
      } else if (action === "restart") {
        file = "icon_restart.png";
        text = "重新開始";
      }
      img.src = ASSET_ROOT + file;
      img.alt = text;
      label.textContent = text;
      button.setAttribute("aria-label", text);
      if (pressed !== null) button.setAttribute("aria-pressed", String(pressed));
    });
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {
      showStatus("此瀏覽器目前無法切換全螢幕", "wrong", 1500);
    }
  }

  function showScreen(name) {
    const screens = {
      start: dom.startScreen,
      instruction: dom.instructionScreen,
      game: dom.gameScreen,
      result: dom.resultScreen
    };
    Object.entries(screens).forEach(([key, screen]) => {
      const active = key === name;
      screen.hidden = !active;
      screen.classList.toggle("is-active", active);
      if (active) screen.scrollTop = 0;
    });
    document.body.dataset.screen = name;
    const focusTarget = screens[name].querySelector("button, [tabindex='0']");
    if (focusTarget) window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 40);
  }

  // ---------- 遊戲生命週期與計時 ----------
  function startGame() {
    audio.button();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    dom.pauseOverlay.hidden = true;
    resetState();
    spiritRun = window.KotodamaCompanion?.begin({ stageId: "mole", expectedPet: "jifeng", assetBase: "../遊戲7_轉蛋機/assets/images" }) || null;
    showScreen("game");
    renderHud();
    clearMoles(true);
    showStatus("凝神準備……", "", 900);
    const now = performance.now();
    state.gameStartedAt = now;
    state.gameEndsAt = now + GAME_DURATION_MS;
    state.nextQuestionAt = now + 650;
    state.active = true;
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(gameLoop);
    configureSpiritSkill();
  }

  function spiritQuestionBonus() {
    if (!spiritRun?.active) return 0;
    if (spiritRun.pet.rarity === "N") return 300;
    if (spiritRun.pet.rarity === "R") return 500;
    return 0;
  }

  function configureSpiritSkill() {
    if (!spiritRun?.active || spiritRun.pet.rarity !== "UR") return;
    spiritRun.setSkill(spiritRun.pet.form.skill, 1, () => {
      if (!state.active || state.paused) return false;
      const bonus = 2500;
      state.gameEndsAt += bonus;
      if (state.questionDeadline) state.questionDeadline += bonus;
      showStatus("天雷止時：倒數停住 2.5 秒！", "correct", 1800);
      return true;
    });
  }

  function resetState() {
    state.active = false;
    state.paused = false;
    state.score = 0;
    state.lives = MAX_LIVES;
    state.combo = 0;
    state.maxCombo = 0;
    state.correct = 0;
    state.wrong = 0;
    state.gameStartedAt = 0;
    state.gameEndsAt = 0;
    state.pauseStartedAt = 0;
    state.questionStartedAt = 0;
    state.questionDeadline = 0;
    state.nextQuestionAt = 0;
    state.waveHideAt = 0;
    state.nextWaveAt = 0;
    state.pendingEndAt = 0;
    state.questionResolved = true;
    state.target = null;
    state.previousTarget = null;
    state.stats = new Map(KANA.map((item) => [item.kana, {
      appearances: 0,
      correct: 0,
      wrong: 0,
      reactionTotal: 0,
      reactionCount: 0
    }]));
  }

  function gameLoop(now) {
    if (!state.active) return;
    if (!state.paused) {
      const remaining = Math.max(0, state.gameEndsAt - now);
      dom.gameTime.textContent = formatClock(remaining);
      dom.gameProgress.style.transform = `scaleX(${remaining / GAME_DURATION_MS})`;

      if (remaining <= 0) {
        endGame("time");
        return;
      }
      if (state.pendingEndAt && now >= state.pendingEndAt) {
        endGame("lives");
        return;
      }
      if (state.nextQuestionAt && now >= state.nextQuestionAt) startQuestion(now);
      if (!state.questionResolved && state.questionDeadline) {
        const questionRemaining = Math.max(0, state.questionDeadline - now);
        dom.questionTime.textContent = (questionRemaining / 1000).toFixed(1);
        if (questionRemaining <= 0) handleTimeout(now);
      }
      if (!state.questionResolved && state.waveHideAt && now >= state.waveHideAt) concealWave(now);
      if (!state.questionResolved && state.nextWaveAt && now >= state.nextWaveAt) spawnWave(now);
    }
    animationFrame = requestAnimationFrame(gameLoop);
  }

  function startQuestion(now) {
    state.nextQuestionAt = 0;
    state.questionResolved = false;
    state.target = chooseTarget();
    state.previousTarget = state.target.kana;
    state.questionStartedAt = now;
    state.questionDeadline = now + QUESTION_DURATION_MS + spiritQuestionBonus();
    state.waveHideAt = 0;
    state.nextWaveAt = 0;
    const stat = state.stats.get(state.target.kana);
    stat.appearances += 1;
    dom.targetRomaji.textContent = state.target.romaji;
    dom.questionTime.textContent = ((QUESTION_DURATION_MS + spiritQuestionBonus()) / 1000).toFixed(1);
    showStatus(`尋找「${state.target.romaji}」`, "", 700);
    spawnWave(now);
  }

  // 錯誤多、反應慢、出現少的音會獲得較高抽題權重。
  function chooseTarget() {
    const appearances = [...state.stats.values()].map((stat) => stat.appearances);
    const minimum = Math.min(...appearances);
    const weighted = KANA.map((item) => {
      const stat = state.stats.get(item.kana);
      const average = stat.reactionCount ? stat.reactionTotal / stat.reactionCount : 0;
      let weight = 1 + stat.wrong * 1.8;
      if (stat.appearances === minimum) weight += 2.1;
      if (average > 3000) weight += Math.min(2.2, (average - 3000) / 1400);
      if (item.kana === state.previousTarget) weight *= 0.32;
      return { item, weight };
    });
    let roll = Math.random() * weighted.reduce((sum, entry) => sum + entry.weight, 0);
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.item;
    }
    return weighted.at(-1).item;
  }

  // 依三分鐘進度調整同時出現數量與停留速度。
  function spawnWave(now) {
    state.nextWaveAt = 0;
    clearMoles(true);
    const progress = Math.min(1, Math.max(0, (now - state.gameStartedAt) / GAME_DURATION_MS));
    const maxActors = progress < 0.34 ? 1 : progress < 0.7 ? 2 : 3;
    const singleMode = maxActors === 1 || Math.random() < (progress < 0.5 ? 0.58 : 0.38);
    const count = singleMode ? 1 : randomInt(2, maxActors);
    const waveKana = [];

    if (singleMode) {
      const targetChance = 0.56 + progress * 0.12;
      waveKana.push(Math.random() < targetChance ? state.target : randomDistractor([state.target.kana]));
    } else {
      waveKana.push(state.target);
      while (waveKana.length < count) {
        const next = randomDistractor(waveKana.map((item) => item.kana));
        waveKana.push(next);
      }
      shuffle(waveKana);
    }

    const holes = shuffle([0, 1, 2, 3, 4, 5]).slice(0, count);
    holes.forEach((holeIndex, index) => revealMole(holeIndex, waveKana[index]));
    if (spiritRun?.active && spiritRun.pet.rarity === "SR" && Math.random() < .34) {
      const targetSlot = [...dom.moleGrid.children].find(slot => slot.dataset.kana === state.target.kana);
      targetSlot?.classList.add("kotodama-spirit-focus");
      window.setTimeout(() => targetSlot?.classList.remove("kotodama-spirit-focus"), 650);
    }
    state.waveHideAt = now + Math.round(1550 - progress * 620);
  }

  function revealMole(index, item) {
    const slot = dom.moleGrid.children[index];
    const art = slot.querySelector(".mole-art");
    const badge = slot.querySelector(".kana-badge");
    art.src = ASSET_ROOT + MOLE_ART[randomInt(0, MOLE_ART.length - 1)];
    badge.textContent = item.kana;
    slot.dataset.kana = item.kana;
    slot.dataset.romaji = item.romaji;
    slot.classList.remove("is-hiding", "is-angry");
    slot.classList.add("is-active");
    slot.tabIndex = 0;
    slot.setAttribute("aria-label", `${item.kana}，羅馬拼音 ${item.romaji}`);
  }

  function concealWave(now) {
    state.waveHideAt = 0;
    [...dom.moleGrid.children].forEach((slot) => {
      if (slot.classList.contains("is-active")) {
        slot.classList.remove("is-active");
        slot.classList.add("is-hiding");
        slot.tabIndex = -1;
      }
    });
    window.setTimeout(() => {
      [...dom.moleGrid.children].forEach((slot) => slot.classList.remove("is-hiding"));
    }, 190);
    state.nextWaveAt = now + 300;
  }

  function clearMoles(immediate = false) {
    [...dom.moleGrid.children].forEach((slot, index) => {
      slot.classList.remove("is-active", "is-angry");
      slot.classList.toggle("is-hiding", !immediate);
      slot.tabIndex = -1;
      slot.removeAttribute("data-kana");
      slot.removeAttribute("data-romaji");
      slot.setAttribute("aria-label", `第 ${index + 1} 個洞，沒有角色`);
      if (immediate) slot.classList.remove("is-hiding");
    });
  }

  // ---------- 命中判定、回饋與計分 ----------
  function hitMole(slot) {
    if (!state.active || state.paused || state.questionResolved || !slot.classList.contains("is-active")) return;
    slot.blur();
    dom.gameScreen.scrollTop = 0;
    const clickedKana = slot.dataset.kana;
    if (clickedKana === state.target.kana) handleCorrect(slot, performance.now());
    else handleWrong(slot, clickedKana, performance.now());
  }

  function handleCorrect(slot, now) {
    state.questionResolved = true;
    state.waveHideAt = 0;
    state.nextWaveAt = 0;
    const reaction = Math.max(0, now - state.questionStartedAt);
    const stat = state.stats.get(state.target.kana);
    stat.correct += 1;
    stat.reactionTotal += reaction;
    stat.reactionCount += 1;
    state.correct += 1;
    state.combo += 1;
    if (spiritRun?.active && spiritRun.pet.rarity === "SSR" && state.combo > 0 && state.combo % 5 === 0) {
      state.gameEndsAt += 2000;
      showStatus("疾風連擊：額外獲得 2 秒！", "correct", 950);
    }
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    const speedBonus = Math.max(0, Math.floor((QUESTION_DURATION_MS - reaction) / 700));
    const comboBonus = Math.min(20, Math.floor(state.combo / 3) * 2);
    const gained = 10 + speedBonus + comboBonus;
    state.score += gained;
    showStatus(`命中！＋${gained} 分 · ${state.target.kana}（${state.target.romaji}）`, "correct", 850);
    addEffect(slot, "effect_ink_burst.png", "hit-effect");
    addEffect(slot, "effect_hit_flash.png", "hit-effect hit-effect--flash");
    addEffect(slot, "stamp_correct.png", "hit-effect hit-effect--stamp");
    slot.classList.remove("is-active");
    slot.classList.add("is-hiding");
    speakKana(state.target.kana, () => audio.success());
    renderHud();
    state.nextQuestionAt = now + 900;
  }

  function handleWrong(slot, clickedKana, now) {
    state.questionResolved = true;
    state.waveHideAt = 0;
    state.nextWaveAt = 0;
    registerMiss();
    slot.classList.add("is-angry");
    addEffect(slot, "stamp_wrong.png", "hit-effect hit-effect--stamp");
    showStatus(`打錯了：${clickedKana} 不是 ${state.target.romaji}`, "wrong", 1050);
    audio.wrong();
    window.setTimeout(() => speakKana(clickedKana), 170);
    renderHud();
    state.nextQuestionAt = now + 1100;
    if (state.lives <= 0) {
      state.nextQuestionAt = 0;
      state.pendingEndAt = now + 1100;
    }
  }

  function handleTimeout(now) {
    if (state.questionResolved) return;
    state.questionResolved = true;
    state.questionDeadline = 0;
    state.waveHideAt = 0;
    state.nextWaveAt = 0;
    registerMiss();
    const activeSlot = [...dom.moleGrid.children].find((slot) => slot.classList.contains("is-active"));
    if (activeSlot) addEffect(activeSlot, "stamp_wrong.png", "hit-effect hit-effect--stamp");
    showStatus(`超時！答案是 ${state.target.kana}（${state.target.romaji}）`, "wrong", 1100);
    audio.wrong();
    window.setTimeout(() => speakKana(state.target.kana), 170);
    clearMoles();
    renderHud();
    state.nextQuestionAt = now + 1150;
    if (state.lives <= 0) {
      state.nextQuestionAt = 0;
      state.pendingEndAt = now + 1150;
    }
  }

  function registerMiss() {
    const stat = state.stats.get(state.target.kana);
    stat.wrong += 1;
    state.wrong += 1;
    state.combo = 0;
    state.lives = Math.max(0, state.lives - 1);
    state.score = Math.max(0, state.score - 5);
  }

  function addEffect(slot, file, className) {
    const image = document.createElement("img");
    image.src = ASSET_ROOT + file;
    image.alt = "";
    image.className = className;
    image.setAttribute("aria-hidden", "true");
    slot.appendChild(image);
    window.setTimeout(() => image.remove(), 850);
  }

  function renderHud() {
    dom.score.textContent = String(state.score);
    dom.combo.textContent = String(state.combo);
    renderHearts();
  }

  function renderHearts() {
    if (!dom.hearts) return;
    dom.hearts.innerHTML = "";
    for (let index = 0; index < MAX_LIVES; index += 1) {
      const full = index < state.lives;
      const image = document.createElement("img");
      image.className = "heart-icon";
      image.src = ASSET_ROOT + (full ? "heart_full.png" : "heart_empty.png");
      image.alt = full ? "剩餘生命" : "已失去生命";
      dom.hearts.appendChild(image);
    }
  }

  function showStatus(message, type = "", duration = 0) {
    window.clearTimeout(statusTimer);
    dom.statusMessage.textContent = message;
    dom.statusMessage.classList.toggle("is-correct", type === "correct");
    dom.statusMessage.classList.toggle("is-wrong", type === "wrong");
    if (duration) {
      statusTimer = window.setTimeout(() => {
        dom.statusMessage.classList.remove("is-correct", "is-wrong");
      }, duration);
    }
  }

  // ---------- 暫停、結算與紀錄 ----------
  function pauseGame() {
    if (!state.active || state.paused) return;
    state.paused = true;
    state.pauseStartedAt = performance.now();
    dom.pauseOverlay.hidden = false;
    dom.resumeButton.focus();
  }

  function resumeGame() {
    if (!state.active || !state.paused) return;
    audio.button();
    const delta = performance.now() - state.pauseStartedAt;
    ["gameEndsAt", "questionStartedAt", "questionDeadline", "nextQuestionAt", "waveHideAt", "nextWaveAt", "pendingEndAt"]
      .forEach((key) => { if (state[key]) state[key] += delta; });
    state.paused = false;
    state.pauseStartedAt = 0;
    dom.pauseOverlay.hidden = true;
    const activeMole = dom.moleGrid.querySelector(".mole-slot.is-active");
    (activeMole || document.querySelector("#game-controls .icon-button[data-action='pause']"))?.focus();
  }

  function goHome() {
    audio.button();
    state.active = false;
    state.paused = false;
    cancelAnimationFrame(animationFrame);
    dom.pauseOverlay.hidden = true;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    clearMoles(true);
    renderBestRecords();
    showScreen("start");
  }

  function endGame(reason) {
    if (!state.active) return;
    state.active = false;
    state.paused = false;
    state.pendingEndAt = 0;
    cancelAnimationFrame(animationFrame);
    clearMoles(true);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    fillResults(reason);
    saveBestRecords();
    if (reason === "time") {
      try { localStorage.setItem("cert_mole", "true"); } catch (_) { /* 憑證儲存失敗不影響原遊戲結算。 */ }
      spiritRun?.reward();
    }
    showScreen("result");
  }

  function fillResults(reason) {
    const answered = state.correct + state.wrong;
    const accuracy = answered ? state.correct / answered * 100 : 0;
    const totalReaction = [...state.stats.values()].reduce((sum, stat) => sum + stat.reactionTotal, 0);
    const reactionCount = [...state.stats.values()].reduce((sum, stat) => sum + stat.reactionCount, 0);
    const average = reactionCount ? totalReaction / reactionCount : 0;
    const hardest = [...state.stats.entries()].sort((a, b) => {
      if (b[1].wrong !== a[1].wrong) return b[1].wrong - a[1].wrong;
      const aAvg = a[1].reactionCount ? a[1].reactionTotal / a[1].reactionCount : 0;
      const bAvg = b[1].reactionCount ? b[1].reactionTotal / b[1].reactionCount : 0;
      return bAvg - aAvg;
    })[0];

    dom.resultScore.textContent = String(state.score);
    dom.resultAccuracy.textContent = formatPercent(accuracy);
    dom.resultCorrect.textContent = String(state.correct);
    dom.resultWrong.textContent = String(state.wrong);
    dom.resultCombo.textContent = String(state.maxCombo);
    dom.resultReaction.textContent = average ? `${(average / 1000).toFixed(2)} 秒` : "—";
    dom.resultHardest.textContent = hardest && hardest[1].wrong
      ? `${hardest[0]}（${KANA.find((item) => item.kana === hardest[0]).romaji}）`
      : "本次全數答對";

    if (accuracy >= 90) dom.encouragement.textContent = "「好身手！你的假名眼力已像劍光一樣俐落。」";
    else if (accuracy >= 70) dom.encouragement.textContent = "「步伐穩健，再磨幾回便能融會貫通！」";
    else dom.encouragement.textContent = "「失手也是線索；記住難音，下回就能破關。」";
    if (reason === "lives") dom.encouragement.textContent += " 先歇口氣，再來挑戰。";

    dom.resultTable.innerHTML = KANA.map((item) => {
      const stat = state.stats.get(item.kana);
      const avg = stat.reactionCount ? `${(stat.reactionTotal / stat.reactionCount / 1000).toFixed(2)} 秒` : "—";
      return `<tr><td lang="ja">${item.kana}</td><td>${item.romaji}</td><td>${stat.appearances}</td><td>${stat.correct}</td><td>${stat.wrong}</td><td>${avg}</td></tr>`;
    }).join("");
  }

  function saveBestRecords() {
    const answered = state.correct + state.wrong;
    const accuracy = answered ? state.correct / answered * 100 : 0;
    const current = readBestRecords();
    const next = {
      score: Math.max(current.score, state.score),
      accuracy: Math.max(current.accuracy, accuracy),
      combo: Math.max(current.combo, state.maxCombo)
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (_) { /* 私密模式可能停用儲存 */ }
  }

  function readBestRecords() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        score: Number.isFinite(saved.score) ? saved.score : 0,
        accuracy: Number.isFinite(saved.accuracy) ? saved.accuracy : 0,
        combo: Number.isFinite(saved.combo) ? saved.combo : 0
      };
    } catch (_) {
      return { score: 0, accuracy: 0, combo: 0 };
    }
  }

  function renderBestRecords() {
    const best = readBestRecords();
    dom.bestScore.textContent = String(best.score);
    dom.bestAccuracy.textContent = formatPercent(best.accuracy);
    dom.bestCombo.textContent = String(best.combo);
  }

  function onKeyDown(event) {
    if ((event.key === "p" || event.key === "P") && state.active) {
      event.preventDefault();
      state.paused ? resumeGame() : pauseGame();
    }
    if (event.key === "Escape" && state.active && !document.fullscreenElement) {
      event.preventDefault();
      state.paused ? resumeGame() : pauseGame();
    }
  }

  // ---------- 小型工具函式 ----------
  function randomDistractor(excluded) {
    const candidates = KANA.filter((item) => !excluded.includes(item.kana));
    return candidates[randomInt(0, candidates.length - 1)];
  }

  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function shuffle(array) {
    for (let index = array.length - 1; index > 0; index -= 1) {
      const next = randomInt(0, index);
      [array[index], array[next]] = [array[next], array[index]];
    }
    return array;
  }

  function formatClock(milliseconds) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatPercent(value) {
    return `${value.toFixed(value % 1 ? 1 : 0)}%`;
  }

  function preloadGameplayArt() {
    const files = [
      ...MOLE_ART, "hole.png", "target_scroll.png", "ui_panel.png", "stamp_correct.png",
      "stamp_wrong.png", "effect_ink_burst.png", "effect_hit_flash.png", "heart_full.png", "heart_empty.png"
    ];
    files.forEach((file) => { const image = new Image(); image.src = ASSET_ROOT + file; });
  }

  if (location.hash === "#qa") {
    window.__gameDebug = Object.freeze({
      finishSuccess() {
        if (!state.active) startGame();
        endGame("time");
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "F7") window.__gameDebug.finishSuccess();
    });
  }

  window.addEventListener("DOMContentLoaded", init);
})();
