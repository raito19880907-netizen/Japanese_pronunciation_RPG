(() => {
  "use strict";

  /*
   * 五十音抽鬼牌
   * ------------------------------------------------------------
   * 資料與畫面分離：卡牌只保存 id / type / value / pairKey；
   * render() 再把目前狀態投影到 DOM，方便日後增加新行或新難度。
   */

  const PAIRS = [
    { kana: "た", romaji: "ta", key: "ta" },
    { kana: "ち", romaji: "chi", key: "chi" },
    { kana: "つ", romaji: "tsu", key: "tsu" },
    { kana: "て", romaji: "te", key: "te" },
    { kana: "と", romaji: "to", key: "to" },
    { kana: "な", romaji: "na", key: "na" },
    { kana: "に", romaji: "ni", key: "ni" },
    { kana: "ぬ", romaji: "nu", key: "nu" },
    { kana: "ね", romaji: "ne", key: "ne" },
    { kana: "の", romaji: "no", key: "no" },
    { kana: "は", romaji: "ha", key: "ha" },
    { kana: "ひ", romaji: "hi", key: "hi" },
    { kana: "ふ", romaji: "fu", key: "fu" },
    { kana: "へ", romaji: "he", key: "he" },
    { kana: "ほ", romaji: "ho", key: "ho" }
  ];

  const PLAYER_DEFS = [
    { id: 0, name: "玩家", handId: "hand-player", countId: "count-player" },
    { id: 1, name: "電腦1", handId: "hand-cpu1", countId: "count-cpu1" },
    { id: 2, name: "電腦2", handId: "hand-cpu2", countId: "count-cpu2" },
    { id: 3, name: "電腦3", handId: "hand-cpu3", countId: "count-cpu3" }
  ];

  // 畫面位置的順時針順序：下 → 左 → 上 → 右。
  const TURN_ORDER = [0, 2, 1, 3];
  const TOTAL_PAIRS = 30;
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const preloadedImages = new Set();

  function preloadImage(src) {
    if (!src || preloadedImages.has(src)) return;
    preloadedImages.add(src);
    const image = new Image();
    image.onerror = () => { preloadedImages.delete(src); console.warn("Image preload failed:", src); };
    image.src = src;
  }

  function ensureImageSources(container) {
    container?.querySelectorAll("img[data-src]").forEach((image) => {
      if (!image.getAttribute("src")) image.src = image.dataset.src;
    });
  }

  function runWhenIdle(callback) {
    if ("requestIdleCallback" in window) window.requestIdleCallback(callback, { timeout: 1200 });
    else window.setTimeout(callback, 250);
  }

  const elements = {
    startScreen: document.getElementById("startScreen"),
    instructionScreen: document.getElementById("instructionScreen"),
    gameScreen: document.getElementById("gameScreen"),
    startButton: document.getElementById("startButton"),
    instructionStartButton: document.getElementById("instructionStartButton"),
    instructionCloseButton: document.getElementById("instructionCloseButton"),
    turnBanner: document.getElementById("turnBanner"),
    turnName: document.getElementById("turnName"),
    phaseBadge: document.getElementById("phaseBadge"),
    statusText: document.getElementById("statusText"),
    playerHint: document.getElementById("playerHint"),
    matchedPile: document.getElementById("matchedPile"),
    pairCount: document.getElementById("pairCount"),
    drawReveal: document.getElementById("drawReveal"),
    successStamp: document.getElementById("successStamp"),
    toastRegion: document.getElementById("toastRegion"),
    rulesDialog: document.getElementById("rulesDialog"),
    restartDialog: document.getElementById("restartDialog"),
    resultDialog: document.getElementById("resultDialog"),
    resultCard: document.getElementById("resultCard"),
    resultEyebrow: document.getElementById("resultEyebrow"),
    resultTitle: document.getElementById("resultTitle"),
    resultMessage: document.getElementById("resultMessage"),
    resultPlayers: document.getElementById("resultPlayers"),
    restartButton: document.getElementById("restartButton"),
    cancelRestartButton: document.getElementById("cancelRestartButton"),
    confirmRestartButton: document.getElementById("confirmRestartButton"),
    playAgainButton: document.getElementById("playAgainButton")
  };

  let players = createPlayers();
  let runId = 0;
  let speechWarningShown = false;
  let spiritRun = null;

  const state = {
    phase: "idle",
    currentPlayer: 0,
    drawSource: null,
    selectedIds: [],
    pairingIds: new Set(),
    wrongIds: new Set(),
    drawnIds: new Set(),
    matchedPairs: 0,
    matchHistory: [],
    status: "按下開局後開始發牌。",
    gameOver: false
  };

  function createPlayers() {
    return PLAYER_DEFS.map((definition) => ({ ...definition, hand: [] }));
  }

  /* ---------- Web Audio：不依賴外部檔案也能離線播放 ---------- */
  const audio = {
    enabled: true,
    context: null,
    musicTimer: null,
    musicStep: 0,
    warned: false,

    ensure() {
      if (!this.enabled) return false;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        if (!this.warned) {
          this.warned = true;
          showToast("此瀏覽器不支援 Web Audio，將以靜音模式遊玩。", "error");
        }
        return false;
      }
      if (!this.context) this.context = new AudioContextClass();
      if (this.context.state === "suspended") this.context.resume().catch(() => {});
      return true;
    },

    tone(frequency, duration = 0.12, type = "sine", volume = 0.045, delay = 0) {
      if (!this.ensure()) return;
      const start = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.03);
    },

    click() { this.tone(390, 0.07, "triangle", 0.035); },
    draw() {
      this.tone(210, 0.11, "triangle", 0.035);
      this.tone(325, 0.12, "triangle", 0.026, 0.08);
    },
    pair() {
      this.tone(523.25, 0.2, "sine", 0.038);
      this.tone(659.25, 0.24, "sine", 0.034, 0.06);
      this.tone(783.99, 0.3, "sine", 0.03, 0.12);
    },
    wrong() {
      this.tone(155, 0.17, "sawtooth", 0.026);
      this.tone(132, 0.2, "sawtooth", 0.022, 0.09);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((note, index) => this.tone(note, 0.42, "triangle", 0.045, index * 0.13));
    },
    lose() {
      [311.13, 261.63, 196, 146.83].forEach((note, index) => this.tone(note, 0.45, "sine", 0.043, index * 0.16));
    },
    startMusic() {
      this.stopMusic();
      if (!this.enabled || !this.ensure()) return;
      const notes = [146.83, 196, 220, 261.63, 220, 196];
      const playAmbientNote = () => {
        if (!this.enabled || elements.gameScreen.hidden || state.gameOver) return;
        const note = notes[this.musicStep % notes.length];
        this.musicStep += 1;
        this.tone(note, 1.25, "sine", 0.012);
        this.tone(note * 2, 0.72, "triangle", 0.006, 0.16);
      };
      playAmbientNote();
      this.musicTimer = window.setInterval(playAmbientNote, 1750);
    },
    stopMusic() {
      if (this.musicTimer) window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    },
    setEnabled(enabled) {
      this.enabled = enabled;
      if (!enabled) {
        this.stopMusic();
        if (this.context?.state === "running") this.context.suspend().catch(() => {});
      } else {
        this.ensure();
        if (!elements.gameScreen.hidden && !state.gameOver) this.startMusic();
      }
      updateSoundButtons();
    }
  };

  /* ---------- 牌組與配對規則 ---------- */
  function buildDeck() {
    const deck = [];
    PAIRS.forEach((pair) => {
      for (let copy = 1; copy <= 2; copy += 1) {
        deck.push({ id: `${pair.key}-kana-${copy}`, type: "kana", value: pair.kana, pairKey: pair.key });
        deck.push({ id: `${pair.key}-romaji-${copy}`, type: "romaji", value: pair.romaji, pairKey: pair.key });
      }
    });
    deck.push({ id: "joker-1", type: "joker", value: "joker-1", pairKey: null });
    deck.push({ id: "joker-2", type: "joker", value: "joker-2", pairKey: null });
    return deck;
  }

  function shuffle(cards) {
    const result = [...cards];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
    }
    return result;
  }

  function isPair(first, second) {
    if (!first || !second || first.type === "joker" || second.type === "joker") return false;
    const oppositeTypes = first.type !== second.type;
    return oppositeTypes && first.pairKey === second.pairKey;
  }

  function findFirstPair(hand) {
    for (let firstIndex = 0; firstIndex < hand.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < hand.length; secondIndex += 1) {
        if (isPair(hand[firstIndex], hand[secondIndex])) {
          return { first: hand[firstIndex], second: hand[secondIndex] };
        }
      }
    }
    return null;
  }

  function sortHand(hand) {
    const order = new Map(PAIRS.map((pair, index) => [pair.key, index]));
    const typeOrder = { kana: 0, romaji: 1, joker: 2 };
    hand.sort((first, second) => {
      // 先依牌型分成兩側：所有平假名在左、羅馬拼音在右、鬼牌最末。
      const groupOrder = typeOrder[first.type] - typeOrder[second.type];
      if (groupOrder !== 0) return groupOrder;
      const pairOrder = (order.get(first.pairKey) ?? 99) - (order.get(second.pairKey) ?? 99);
      if (pairOrder !== 0) return pairOrder;
      return first.id.localeCompare(second.id);
    });
  }

  function pairKana(pair) {
    return pair.first.type === "kana" ? pair.first.value : pair.second.value;
  }

  function pairRomaji(pair) {
    return pair.first.type === "romaji" ? pair.first.value : pair.second.value;
  }

  function removePairFromHand(hand, pair) {
    const ids = new Set([pair.first.id, pair.second.id]);
    const remaining = hand.filter((card) => !ids.has(card.id));
    hand.splice(0, hand.length, ...remaining);
  }

  /* ---------- 畫面繪製 ---------- */
  function createFaceCard(card, { interactive = true } = {}) {
    const element = document.createElement(interactive ? "button" : "div");
    if (interactive) element.type = "button";
    element.className = `playing-card ${card.type === "joker" ? card.value : card.type}`;
    element.dataset.cardId = card.id;

    if (card.type === "joker") {
      const label = document.createElement("span");
      label.className = "joker-label";
      label.textContent = card.value === "joker-1" ? "妖面鬼牌" : "墨龍鬼牌";
      element.appendChild(label);
      element.setAttribute("aria-label", label.textContent);
    } else {
      const value = document.createElement("span");
      value.className = "card-main";
      value.textContent = card.value;
      const type = document.createElement("span");
      type.className = "card-type";
      type.textContent = card.type === "kana" ? "平假名" : "ROMAJI";
      element.append(value, type);
      element.setAttribute("aria-label", `${type.textContent} ${card.value}`);
    }
    return element;
  }

  function renderPlayerHand() {
    const player = players[0];
    const handElement = document.getElementById(player.handId);
    handElement.replaceChildren();
    sortHand(player.hand);

    const groups = [
      { type: "kana", label: "平假名手牌" },
      { type: "romaji", label: "羅馬拼音手牌" },
      { type: "joker", label: "鬼牌" }
    ];

    groups.forEach((group) => {
      const cards = player.hand.filter((card) => card.type === group.type);
      if (!cards.length) return;
      const groupElement = document.createElement("div");
      groupElement.className = `card-group ${group.type}-group`;
      groupElement.setAttribute("role", "group");
      groupElement.setAttribute("aria-label", group.label);

      cards.forEach((card) => {
        const cardElement = createFaceCard(card);
        cardElement.classList.toggle("selected", state.selectedIds.includes(card.id));
        cardElement.classList.toggle("wrong", state.wrongIds.has(card.id));
        cardElement.classList.toggle("is-pairing", state.pairingIds.has(card.id));
        cardElement.disabled = !["initial-human", "human-pair"].includes(state.phase);
        cardElement.addEventListener("click", () => handlePlayerCard(card.id));
        groupElement.appendChild(cardElement);
      });
      handElement.appendChild(groupElement);
    });
  }

  function renderOpponentHand(player) {
    const handElement = document.getElementById(player.handId);
    handElement.replaceChildren();
    const isTop = player.id === 1;
    const total = player.hand.length;
    const canDraw = state.phase === "human-draw" && state.drawSource === player.id;

    player.hand.forEach((card, index) => {
      const progress = total <= 1 ? 0.5 : index / (total - 1);
      const cardElement = document.createElement("button");
      cardElement.type = "button";
      cardElement.className = "back-card";
      cardElement.dataset.cardId = card.id;
      cardElement.setAttribute("aria-label", `抽取${player.name}的第 ${index + 1} 張牌`);
      cardElement.style.zIndex = String(index + 1);
      if (isTop) {
        cardElement.style.left = `${10 + progress * 80}%`;
        cardElement.style.top = `${2 + Math.abs(progress - 0.5) * 12}px`;
        cardElement.style.transform = `translateX(-50%) rotate(${(progress - 0.5) * 16}deg)`;
      } else {
        cardElement.style.top = `${7 + progress * 82}%`;
        cardElement.style.left = `${player.id === 2 ? 34 + Math.sin(progress * Math.PI) * 12 : 16 + Math.sin(progress * Math.PI) * 12}%`;
        cardElement.style.transform = `translateY(-50%) rotate(${(progress - 0.5) * (player.id === 2 ? 7 : -7)}deg)`;
      }
      cardElement.classList.toggle("can-draw", canDraw);
      cardElement.classList.toggle("is-pairing", state.pairingIds.has(card.id));
      cardElement.classList.toggle("is-drawn", state.drawnIds.has(card.id));
      const ruledOut = Boolean(spiritRun?.meta.ruledOut?.has(card.id));
      cardElement.classList.toggle("kotodama-spirit-muted", ruledOut);
      if (spiritRun?.active && spiritRun.pet.rarity === "N" && card.type === "joker" && Math.random() < .28) {
        cardElement.classList.add("kotodama-spirit-warning");
      }
      cardElement.disabled = !canDraw || ruledOut;
      cardElement.addEventListener("click", () => handleOpponentCard(player.id, card.id));
      handElement.appendChild(cardElement);
    });
  }

  function renderMatchPile() {
    elements.matchedPile.replaceChildren();
    state.matchHistory.slice(0, 9).reverse().forEach((match, index) => {
      const pairElement = document.createElement("div");
      pairElement.className = "matched-pair";
      pairElement.style.setProperty("--pair-tilt", `${(index % 2 ? 2 : -2) + (index % 3)}deg`);

      const kana = document.createElement("span");
      kana.className = "mini-card kana";
      kana.textContent = match.kana;
      const romaji = document.createElement("span");
      romaji.className = "mini-card romaji";
      romaji.textContent = match.romaji;
      pairElement.append(kana, romaji);
      elements.matchedPile.appendChild(pairElement);
    });
  }

  function phaseLabel() {
    const labels = {
      idle: "等待開局",
      dealing: "洗牌發牌",
      "cpu-pair": "電腦配對",
      "initial-human": "整理手牌",
      "human-draw": "點牌抽取",
      "human-pair": "完成配對",
      "cpu-draw": "電腦抽牌",
      busy: "牌局進行",
      ended: "對局終了"
    };
    return labels[state.phase] || "牌局進行";
  }

  function render() {
    players.forEach((player) => {
      document.getElementById(player.countId).textContent = `${player.hand.length} 張`;
      document.getElementById(`seat-${player.id === 0 ? "player" : `cpu${player.id}`}`)
        .classList.toggle("is-turn", !state.gameOver && state.currentPlayer === player.id);
      document.getElementById(`seat-${player.id === 0 ? "player" : `cpu${player.id}`}`)
        .classList.toggle("is-draw-source", state.phase === "human-draw" && state.drawSource === player.id);
    });

    renderPlayerHand();
    players.slice(1).forEach(renderOpponentHand);
    renderMatchPile();

    elements.pairCount.textContent = `${state.matchedPairs} / ${TOTAL_PAIRS}`;
    elements.phaseBadge.textContent = phaseLabel();
    elements.statusText.textContent = state.status;

    const displayedPlayer = ["dealing", "idle"].includes(state.phase) ? null : players[state.currentPlayer];
    elements.turnName.textContent = displayedPlayer ? displayedPlayer.name : state.phase === "dealing" ? "洗牌中" : "準備開局";
    elements.turnBanner.classList.toggle("is-player", state.currentPlayer === 0 && !state.gameOver && state.phase !== "dealing");

    if (state.phase === "human-draw" && state.drawSource !== null) {
      elements.playerHint.textContent = `請從${players[state.drawSource].name}抽一張`;
    } else if (["initial-human", "human-pair"].includes(state.phase)) {
      elements.playerHint.textContent = "選兩張牌完成所有配對";
    } else if (state.phase.startsWith("cpu") || state.phase === "busy") {
      elements.playerHint.textContent = "請稍候，對手正在出招";
    } else {
      elements.playerHint.textContent = state.gameOver ? "本局已結束" : "準備中";
    }
  }

  /* ---------- 遊戲主流程 ---------- */
  async function startGame() {
    const token = ++runId;
    closeDialog(elements.restartDialog);
    closeDialog(elements.resultDialog);
    speechWarningShown = false;
    spiritRun = window.KotodamaCompanion?.begin({ stageId: "joker", expectedPet: "fuwan", assetBase: "../遊戲7_轉蛋機/assets/images" }) || null;
    configureSpiritSkill();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    players = createPlayers();
    Object.assign(state, {
      phase: "dealing",
      currentPlayer: 0,
      drawSource: null,
      selectedIds: [],
      pairingIds: new Set(),
      wrongIds: new Set(),
      drawnIds: new Set(),
      matchedPairs: 0,
      matchHistory: [],
      status: "江湖洗牌中……62 張牌正依序發給四位玩家。",
      gameOver: false
    });

    const deck = shuffle(buildDeck());
    deck.forEach((card, index) => players[index % players.length].hand.push(card));
    players.forEach((player) => sortHand(player.hand));

    ensureImageSources(elements.gameScreen);
    elements.startScreen.hidden = true;
    elements.instructionScreen.hidden = true;
    elements.gameScreen.hidden = false;
    audio.ensure();
    audio.startMusic();
    render();
    await sleep(720);
    if (!isCurrentRun(token)) return;

    // 電腦依順時針順序整理起手牌；真人保留手動學習操作。
    for (const playerIndex of [2, 1, 3]) {
      await autoPairAll(playerIndex, token, true);
      if (!isCurrentRun(token)) return;
    }

    if (checkStandardEnd()) return;
    state.currentPlayer = 0;
    if (players[0].hand.length === 0) {
      finishGame({ immediateWin: true });
      return;
    }
    if (findFirstPair(players[0].hand)) {
      state.phase = "initial-human";
      state.status = "先整理你的起手牌：請把所有假名與對應羅馬拼音配完。";
      showToast("輪到你整理手牌。選兩張可配對的牌。", "success");
      render();
    } else {
      beginHumanDraw();
    }
  }

  function isCurrentRun(token) {
    return token === runId && !state.gameOver;
  }

  async function autoPairAll(playerIndex, token, initial = false) {
    const player = players[playerIndex];
    let pair = findFirstPair(player.hand);
    while (pair && isCurrentRun(token)) {
      state.phase = "cpu-pair";
      state.currentPlayer = playerIndex;
      state.pairingIds = new Set([pair.first.id, pair.second.id]);
      state.status = `${player.name} 配出了「${pairKana(pair)}＋${pairRomaji(pair)}」。`;
      render();
      audio.pair();
      speakKana(pairKana(pair));
      showStamp();
      await sleep(initial ? 310 : 560);
      if (!isCurrentRun(token)) return;
      removePairFromHand(player.hand, pair);
      recordPair(pair, playerIndex);
      state.pairingIds.clear();
      render();
      await sleep(initial ? 110 : 240);
      pair = findFirstPair(player.hand);
    }
  }

  function handlePlayerCard(cardId) {
    if (!["initial-human", "human-pair"].includes(state.phase) || state.gameOver) return;
    audio.click();
    const selectedIndex = state.selectedIds.indexOf(cardId);
    if (selectedIndex >= 0) {
      state.selectedIds.splice(selectedIndex, 1);
      render();
      return;
    }
    if (state.selectedIds.length >= 2) state.selectedIds = [];
    state.selectedIds.push(cardId);
    render();
    if (state.selectedIds.length === 2) resolveHumanSelection(runId);
  }

  async function resolveHumanSelection(token) {
    const originPhase = state.phase;
    const [firstId, secondId] = state.selectedIds;
    const first = players[0].hand.find((card) => card.id === firstId);
    const second = players[0].hand.find((card) => card.id === secondId);
    state.phase = "busy";

    if (!isPair(first, second)) {
      state.wrongIds = new Set([firstId, secondId]);
      state.status = explainWrongPair(first, second);
      audio.wrong();
      showToast(state.status, "error");
      render();
      await sleep(520);
      if (!isCurrentRun(token)) return;
      state.wrongIds.clear();
      state.selectedIds = [];
      state.phase = originPhase;
      render();
      return;
    }

    const pair = { first, second };
    state.pairingIds = new Set([first.id, second.id]);
    state.status = `配對成功：${pairKana(pair)} ＋ ${pairRomaji(pair)}`;
    render();
    audio.pair();
    speakKana(pairKana(pair));
    showStamp();
    await sleep(610);
    if (!isCurrentRun(token)) return;

    removePairFromHand(players[0].hand, pair);
    recordPair(pair, 0);
    state.pairingIds.clear();
    state.selectedIds = [];
    render();

    // 真人先出完手牌時，依規則立即勝利，不必等鬼牌結算。
    if (players[0].hand.length === 0) {
      finishGame({ immediateWin: true });
      return;
    }
    if (checkStandardEnd()) return;

    if (findFirstPair(players[0].hand)) {
      state.phase = originPhase === "initial-human" ? "initial-human" : "human-pair";
      state.status = "手上還有可配對牌，請繼續全部配完。";
      render();
    } else if (originPhase === "initial-human") {
      beginHumanDraw();
    } else {
      await sleep(330);
      advanceTurn(token);
    }
  }

  function explainWrongPair(first, second) {
    if (!first || !second) return "牌面狀態已更新，請重新選牌。";
    if (first.type === "joker" || second.type === "joker") return "鬼牌帶著妖氣，不能與任何牌配對。";
    if (first.type === second.type) return "要用一張平假名搭配一張羅馬拼音。";
    return `讀音不同：${first.value} 不能和 ${second.value} 配對。`;
  }

  function beginHumanDraw() {
    if (state.gameOver) return;
    const source = getNextActivePlayer(0, false);
    if (source === null) {
      checkStandardEnd();
      return;
    }
    state.currentPlayer = 0;
    state.drawSource = source;
    state.phase = "human-draw";
    state.status = `輪到你：請點選${players[source].name}任一張發光的牌背。`;
    render();
  }

  function configureSpiritSkill() {
    if (!spiritRun?.active) return;
    spiritRun.meta.ruledOut = new Set();
    const rarity = spiritRun.pet.rarity;
    if (rarity === "R" || rarity === "SR") {
      spiritRun.setSkill(spiritRun.pet.form.skill, 1, () => {
        if (state.phase !== "human-draw" || state.drawSource === null) {
          showToast("請等到你的抽牌回合再使用言靈技能。", "error");
          return false;
        }
        const hand = players[state.drawSource].hand;
        const safeCards = hand.filter(card => card.type !== "joker" && !spiritRun.meta.ruledOut.has(card.id));
        if (!safeCards.length) return false;
        const count = rarity === "SR" ? Math.max(1, Math.floor(safeCards.length / 2)) : 1;
        safeCards.sort(() => Math.random() - .5).slice(0, count).forEach(card => spiritRun.meta.ruledOut.add(card.id));
        state.status = rarity === "SR" ? "福丸完成吉凶占卜，鬼牌可能範圍縮小了。" : "福丸排除了一張確定不是鬼牌的牌。";
        showToast(state.status, "success");
        render();
        return true;
      });
    }
  }

  async function handleOpponentCard(ownerIndex, cardId) {
    if (state.phase !== "human-draw" || state.drawSource !== ownerIndex || state.gameOver) return;
    const token = runId;
    const owner = players[ownerIndex];
    const cardIndex = owner.hand.findIndex((card) => card.id === cardId);
    if (cardIndex < 0) return;
    const selectedCard = owner.hand[cardIndex];
    if (spiritRun?.active && selectedCard.type === "joker") {
      const rarity = spiritRun.pet.rarity;
      const shouldWarn = (rarity === "SSR" && Math.random() < .5) || (rarity === "UR" && !spiritRun.meta.redrawUsed);
      if (shouldWarn) {
        if (rarity === "UR") spiritRun.meta.redrawUsed = true;
        const cardElement = document.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`);
        cardElement?.classList.add("kotodama-spirit-warning");
        state.status = rarity === "UR" ? "天運改籤發動：這張牌的妖氣被取消，請重新抽牌。" : "大吉警兆：福丸感覺這張牌有強烈妖氣。";
        showToast(state.status, "error");
        render();
        return;
      }
    }

    state.phase = "busy";
    state.drawnIds = new Set([cardId]);
    state.status = `你從${owner.name}手中抽出一張牌……`;
    audio.draw();
    render();
    await sleep(390);
    if (!isCurrentRun(token)) return;

    const [drawnCard] = owner.hand.splice(cardIndex, 1);
    players[0].hand.push(drawnCard);
    sortHand(players[0].hand);
    state.drawnIds.clear();
    state.drawSource = null;
    state.status = `你抽到了「${cardDisplayName(drawnCard)}」。`;
    render();
    showDrawReveal(drawnCard, true);
    await sleep(720);
    if (!isCurrentRun(token)) return;

    if (findFirstPair(players[0].hand)) {
      state.phase = "human-pair";
      state.status = "抽牌後出現可配對牌，請把能配的牌全部打出。";
      render();
    } else {
      state.status = "沒有形成配對，換下一位。";
      render();
      await sleep(380);
      advanceTurn(token);
    }
  }

  async function runCpuTurn(playerIndex, token) {
    if (!isCurrentRun(token)) return;
    const player = players[playerIndex];
    if (player.hand.length === 0) {
      advanceTurn(token);
      return;
    }

    const sourceIndex = getNextActivePlayer(playerIndex, false);
    if (sourceIndex === null) {
      checkStandardEnd();
      return;
    }
    const source = players[sourceIndex];
    state.currentPlayer = playerIndex;
    state.drawSource = sourceIndex;
    state.phase = "cpu-draw";
    state.status = `${player.name}正在觀察${source.name}的手牌……`;
    render();
    await sleep(720);
    if (!isCurrentRun(token)) return;

    const randomIndex = Math.floor(Math.random() * source.hand.length);
    const drawnCard = source.hand[randomIndex];
    state.drawnIds = new Set([drawnCard.id]);
    state.status = `${player.name}從${source.name}手中抽了一張牌。`;
    audio.draw();
    render();
    await sleep(380);
    if (!isCurrentRun(token)) return;

    source.hand.splice(randomIndex, 1);
    player.hand.push(drawnCard);
    sortHand(player.hand);
    state.drawnIds.clear();
    state.drawSource = null;
    render();
    showDrawReveal(drawnCard, false);
    await sleep(620);
    if (!isCurrentRun(token)) return;

    await autoPairAll(playerIndex, token, false);
    if (!isCurrentRun(token)) return;
    if (checkStandardEnd()) return;
    state.status = `${player.name}回合結束。`;
    render();
    await sleep(420);
    advanceTurn(token);
  }

  function advanceTurn(token) {
    if (!isCurrentRun(token) || checkStandardEnd()) return;
    const next = getNextActivePlayer(state.currentPlayer, true);
    if (next === null) {
      checkStandardEnd();
      return;
    }
    state.currentPlayer = next;
    state.drawSource = null;
    if (next === 0) beginHumanDraw();
    else runCpuTurn(next, token);
  }

  /**
   * @param {number} fromIndex 目前玩家編號
   * @param {boolean} includeSelfAfterCycle 換回合時允許繞一圈回自己；找抽牌來源時不允許
   */
  function getNextActivePlayer(fromIndex, includeSelfAfterCycle) {
    const start = TURN_ORDER.indexOf(fromIndex);
    const limit = includeSelfAfterCycle ? TURN_ORDER.length : TURN_ORDER.length - 1;
    for (let step = 1; step <= limit; step += 1) {
      const candidate = TURN_ORDER[(start + step) % TURN_ORDER.length];
      if (players[candidate].hand.length > 0) return candidate;
    }
    return null;
  }

  function recordPair(pair, playerIndex) {
    state.matchedPairs += 1;
    state.matchHistory.unshift({
      kana: pairKana(pair),
      romaji: pairRomaji(pair),
      pairKey: pair.first.pairKey,
      playerIndex
    });
  }

  function checkStandardEnd() {
    if (state.gameOver) return true;
    if (state.matchedPairs >= TOTAL_PAIRS) {
      finishGame({ immediateWin: false });
      return true;
    }
    return false;
  }

  function finishGame({ immediateWin }) {
    if (state.gameOver) return;
    state.gameOver = true;
    state.phase = "ended";
    state.drawSource = null;
    state.selectedIds = [];
    state.pairingIds.clear();
    state.status = immediateWin ? "你的手牌率先歸零，立即獲勝！" : "所有普通牌都已配對，揭曉鬼牌持有者。";
    audio.stopMusic();
    render();

    const losers = players.filter((player) => player.hand.some((card) => card.type === "joker"));
    const humanLost = !immediateWin && losers.some((player) => player.id === 0);
    const won = immediateWin || !humanLost;

    if (won) {
      try { localStorage.setItem("cert_joker", "true"); } catch (_) { /* 憑證儲存失敗不影響原牌局結算。 */ }
      spiritRun?.reward();
    }

    elements.resultCard.classList.toggle("win", won);
    elements.resultCard.classList.toggle("lose", !won);
    elements.resultEyebrow.textContent = immediateWin ? "率先出完手牌" : "妖鬼現形";
    elements.resultTitle.textContent = immediateWin ? "一騎絕塵" : won ? "闖關成功" : "妖鬼纏身";

    if (immediateWin) {
      elements.resultMessage.textContent = "你在所有人之前出完手牌，依規則立即獲勝。這一局的讀音修行漂亮收尾。";
    } else if (won) {
      elements.resultMessage.textContent = `30 組普通牌全部配完；你沒有持有鬼牌。輸家是：${losers.map((player) => player.name).join("、")}。`;
    } else {
      const humanJokers = players[0].hand.filter((card) => card.type === "joker").length;
      elements.resultMessage.textContent = `你最後握有 ${humanJokers} 張鬼牌。持有任一鬼牌者都算輸家。`;
    }

    elements.resultPlayers.replaceChildren();
    if (immediateWin) {
      addResultChip(`完成配對：${state.matchedPairs} / ${TOTAL_PAIRS}`);
      addResultChip("玩家手牌：0 張");
    } else {
      losers.forEach((player) => {
        const jokerCount = player.hand.filter((card) => card.type === "joker").length;
        addResultChip(`輸家：${player.name}（鬼牌 ${jokerCount} 張）`);
      });
      addResultChip("普通牌：30 / 30 組");
    }

    if (won) audio.win(); else audio.lose();
    window.setTimeout(() => {
      if (!elements.resultDialog.open) elements.resultDialog.showModal();
      elements.playAgainButton.focus();
    }, 360);
  }

  function addResultChip(text) {
    const chip = document.createElement("span");
    chip.className = "result-chip";
    chip.textContent = text;
    elements.resultPlayers.appendChild(chip);
  }

  /* ---------- 視覺、語音與提示 ---------- */
  function showDrawReveal(card, revealFace) {
    elements.drawReveal.replaceChildren();
    let cardElement;
    if (revealFace) {
      cardElement = createFaceCard(card, { interactive: false });
    } else {
      cardElement = document.createElement("div");
      cardElement.className = "playing-card";
      cardElement.style.background = "#293a3f url('assets/images/card-back.webp') center / cover no-repeat";
      cardElement.setAttribute("aria-label", "電腦抽到的牌內容保密");
    }
    elements.drawReveal.appendChild(cardElement);
    elements.drawReveal.hidden = false;
    window.setTimeout(() => {
      elements.drawReveal.hidden = true;
      elements.drawReveal.replaceChildren();
    }, 700);
  }

  function showStamp() {
    elements.successStamp.hidden = false;
    elements.successStamp.classList.remove("slam");
    void elements.successStamp.offsetWidth;
    elements.successStamp.classList.add("slam");
    window.setTimeout(() => {
      elements.successStamp.classList.remove("slam");
      elements.successStamp.hidden = true;
    }, 820);
  }

  function speakKana(kana) {
    if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") {
      if (!speechWarningShown) {
        speechWarningShown = true;
        showToast("此瀏覽器沒有日文語音功能；遊戲會繼續正常進行。", "error");
      }
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(kana);
      utterance.lang = "ja-JP";
      utterance.rate = 0.78;
      utterance.pitch = 1;
      const japaneseVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ja"));
      if (japaneseVoice) utterance.voice = japaneseVoice;
      window.speechSynthesis.speak(utterance);
    } catch {
      if (!speechWarningShown) {
        speechWarningShown = true;
        showToast("語音暫時無法播放，但不影響牌局。", "error");
      }
    }
  }

  function cardDisplayName(card) {
    if (card.type === "joker") return card.value === "joker-1" ? "妖面鬼牌" : "墨龍鬼牌";
    return card.value;
  }

  function showToast(message, type = "") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2650);
  }

  function updateSoundButtons() {
    document.querySelectorAll(".sound-toggle").forEach((button) => {
      button.textContent = audio.enabled ? "音效：開" : "音效：關";
      button.setAttribute("aria-pressed", String(!audio.enabled));
    });
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  function showInstruction() {
    audio.click();
    elements.startScreen.hidden = true;
    elements.gameScreen.hidden = true;
    elements.instructionScreen.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => elements.instructionStartButton.focus(), 60);
  }

  function showStartScreen() {
    audio.stopMusic();
    elements.gameScreen.hidden = true;
    elements.instructionScreen.hidden = true;
    elements.startScreen.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => elements.startButton.focus(), 60);
  }

  /* ---------- 事件綁定 ---------- */
  elements.startButton.addEventListener("click", () => {
    audio.click();
    startGame();
  });
  elements.instructionStartButton.addEventListener("click", () => {
    audio.click();
    startGame();
  });
  elements.instructionCloseButton.addEventListener("click", showStartScreen);
  elements.restartButton.addEventListener("click", () => {
    audio.click();
    if (!elements.restartDialog.open) elements.restartDialog.showModal();
  });
  elements.cancelRestartButton.addEventListener("click", () => closeDialog(elements.restartDialog));
  elements.confirmRestartButton.addEventListener("click", () => {
    audio.click();
    startGame();
  });
  elements.playAgainButton.addEventListener("click", () => {
    audio.click();
    startGame();
  });

  document.querySelectorAll("[data-open-rules]").forEach((button) => {
    button.addEventListener("click", () => {
      audio.click();
      if (!elements.rulesDialog.open) elements.rulesDialog.showModal();
    });
  });
  document.querySelectorAll("[data-open-guide]").forEach((button) => {
    button.addEventListener("click", showInstruction);
  });
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(button.closest("dialog")));
  });
  document.querySelectorAll(".sound-toggle").forEach((button) => {
    button.addEventListener("click", () => audio.setEnabled(!audio.enabled));
  });

  [elements.rulesDialog, elements.restartDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.restartDialog.open) closeDialog(elements.restartDialog);
    else if (event.key === "Escape" && !elements.instructionScreen.hidden) showStartScreen();
    // 僅供本機 QA：網址加 #qa 後可快速檢查兩種結果視窗。
    if (location.hash === "#qa" && event.key === "F8") {
      state.gameOver = false;
      finishGame({ immediateWin: true });
    }
    if (location.hash === "#qa" && event.key === "F9") {
      state.gameOver = false;
      if (!players[0].hand.some((card) => card.type === "joker")) {
        players[0].hand.push({ id: "qa-joker", type: "joker", value: "joker-1", pairKey: null });
      }
      finishGame({ immediateWin: false });
    }
  });

  runWhenIdle(() => {
    preloadImage("assets/images/bg-table.webp");
    preloadImage("assets/images/card-back.webp");
  });

  updateSoundButtons();
  render();

  /*
   * 小型唯讀 QA 介面：方便日後自動測試牌數、資料結構與目前狀態。
   * forceResult 僅供網址帶 #qa 時使用，正式遊戲不會顯示測試控制。
   */
  window.__oldMaidGame = {
    buildDeck,
    isPair,
    validateDeck() {
      const deck = buildDeck();
      return {
        total: deck.length,
        kana: deck.filter((card) => card.type === "kana").length,
        romaji: deck.filter((card) => card.type === "romaji").length,
        jokers: deck.filter((card) => card.type === "joker").length,
        allCardsHaveSchema: deck.every((card) => ["id", "type", "value", "pairKey"].every((key) => Object.prototype.hasOwnProperty.call(card, key))),
        uniqueIds: new Set(deck.map((card) => card.id)).size === deck.length
      };
    },
    state() {
      return {
        phase: state.phase,
        currentPlayer: state.currentPlayer,
        matchedPairs: state.matchedPairs,
        handSizes: players.map((player) => player.hand.length),
        totalCardsInPlay: players.reduce((sum, player) => sum + player.hand.length, 0),
        gameOver: state.gameOver
      };
    },
    forceResult(kind = "win") {
      if (location.hash !== "#qa") return false;
      state.gameOver = false;
      finishGame({ immediateWin: kind === "win" });
      return true;
    }
  };
})();
