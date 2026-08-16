(() => {
  "use strict";

  const GAME_START_URL = "../大冒險地圖/index.html";
  const GACHA_URL = "../遊戲7_轉蛋機/index.html";
  const RARITIES = ["N", "R", "SR", "SSR", "UR"];

  const STAGES = [
    {
      number: "STAGE 01",
      name: "言靈之森",
      game: "假名配對／消除",
      learning: "あ行・か行・さ行",
      difficulty: "初傳",
      seal: "配對之印",
      story: "文字精靈棲息的古老森林。讓相應之音相連，喚醒沉睡的配對之印。",
      key: "cert_match",
      href: "../遊戲1_消除遊戲/kana-ink-link-game/index.html"
    },
    {
      number: "STAGE 02",
      name: "妖牌茶屋",
      game: "四人抽鬼牌",
      learning: "た行・な行・は行",
      difficulty: "入魂",
      seal: "識音之印",
      story: "妖札在古茶屋中輪轉。辨清成雙之音，避開徘徊牌間的兩道妖影。",
      key: "cert_joker",
      href: "../遊戲2_抽鬼牌/index.html"
    },
    {
      number: "STAGE 03",
      name: "狸貓原野",
      game: "三分鐘打地鼠",
      learning: "ま行～ん・共 16 音",
      difficulty: "迅練",
      seal: "迅捷之印",
      story: "狸貓與假名武者藏身原野。聽準鼓點、看清目標，在七秒內果斷出招。",
      key: "cert_mole",
      href: "../遊戲3_打地鼠/index.html"
    },
    {
      number: "STAGE 04",
      name: "分類道場",
      game: "拖曳／點選分類",
      learning: "平假名 46 音・11 行",
      difficulty: "辨卷",
      seal: "辨識之印",
      story: "十一門派各守一卷。把散落的假名符紙送回正確音行，證明你的辨識真功。",
      key: "cert_sorting",
      href: "../遊戲4_拖曳分類/index.html"
    },
    {
      number: "STAGE 05",
      name: "五十音石階",
      game: "假名排序",
      learning: "あ行～わ行・ん",
      difficulty: "登階",
      seal: "秩序之印",
      story: "十階山路記錄著五十音的秩序。找回每一音前後的位置，一步步登上皆傳之門。",
      key: "cert_order",
      href: "../遊戲5_排序/index.html"
    },
    {
      number: "STAGE 06",
      name: "魔王城",
      game: "回合制 RPG 戰鬥",
      learning: "完整平假名 46 音",
      difficulty: "最終",
      seal: "勇者之印",
      story: "穿越五處妖域，以言靈斬擊突破百鬼幻陣，直面斬斷言脈的無面魔將。",
      key: "cert_warrior",
      href: "../遊戲6_RPG打怪/index.html"
    }
  ];

  const FALLBACK_PETS = {
    xiaomo: {
      id: "xiaomo", family: "墨靈狐・小墨", game: "消除遊戲", talent: "觀察、配對",
      forms: {
        N: { name: "墨點狐", skill: "墨跡尋蹤", ability: "每局一次，短暫提示一組正確配對。", image: "../遊戲7_轉蛋機/assets/images/pets/xiaomo-n.png" },
        R: { name: "墨尾狐", skill: "雙尾墨引", ability: "每局可以提示兩次。", image: "../遊戲7_轉蛋機/assets/images/pets/xiaomo-r.png" },
        SR: { name: "靈墨狐", skill: "靈墨指引", ability: "提示時額外標示其中一個正確目標。", image: "../遊戲7_轉蛋機/assets/images/pets/xiaomo-sr.png" },
        SSR: { name: "九墨靈狐", skill: "靈墨指引", ability: "連續答錯時，自動發動一次靈墨指引。", image: "../遊戲7_轉蛋機/assets/images/pets/xiaomo-ssr.png" },
        UR: { name: "天書九尾", skill: "天書啟示", ability: "每局第一次陷入困難時，自動標示一組正確配對。", image: "../遊戲7_轉蛋機/assets/images/pets/xiaomo-ur.png" }
      }
    },
    fuwan: {
      id: "fuwan", family: "運籤狸・福丸", game: "抽鬼牌", talent: "運氣、判斷、風險控制",
      forms: {
        N: { name: "小福狸", skill: "妖氣微動", ability: "鬼牌偶爾輕微抖動。", image: "../遊戲7_轉蛋機/assets/images/pets/fuwan-n.png" },
        R: { name: "籤運狸", skill: "排除惡籤", ability: "每局一次，排除一張不是鬼牌的牌。", image: "../遊戲7_轉蛋機/assets/images/pets/fuwan-r.png" },
        SR: { name: "招福狸", skill: "吉凶占卜", ability: "每局一次吉凶占卜，縮小鬼牌可能範圍。", image: "../遊戲7_轉蛋機/assets/images/pets/fuwan-sr.png" },
        SSR: { name: "大吉福狸", skill: "大吉警兆", ability: "即將抽到鬼牌時，有一定機率警告。", image: "../遊戲7_轉蛋機/assets/images/pets/fuwan-ssr.png" },
        UR: { name: "天運神狸", skill: "天運改籤", ability: "每局一次，抽到鬼牌時可以取消並重新抽一次。", image: "../遊戲7_轉蛋機/assets/images/pets/fuwan-ur.png" }
      }
    },
    jifeng: {
      id: "jifeng", family: "雷迅鼬・疾風", game: "打地鼠", talent: "反應速度",
      forms: {
        N: { name: "迅鼬", skill: "迅風延時", ability: "目標停留時間 +0.3 秒。", image: "../遊戲7_轉蛋機/assets/images/pets/jifeng-n.png" },
        R: { name: "風鼬", skill: "風行延時", ability: "目標停留時間 +0.5 秒。", image: "../遊戲7_轉蛋機/assets/images/pets/jifeng-r.png" },
        SR: { name: "雷迅鼬", skill: "雷光尋標", ability: "正確目標偶爾出現短暫提示光圈。", image: "../遊戲7_轉蛋機/assets/images/pets/jifeng-sr.png" },
        SSR: { name: "迅雷獸", skill: "疾風連擊", ability: "連續答對後進入疾風模式，取得額外時間。", image: "../遊戲7_轉蛋機/assets/images/pets/jifeng-ssr.png" },
        UR: { name: "天雷神鼬", skill: "天雷止時", ability: "每局一次，可停止倒數約 2～3 秒。", image: "../遊戲7_轉蛋機/assets/images/pets/jifeng-ur.png" }
      }
    },
    wenyue: {
      id: "wenyue", family: "卷書貓・文月", game: "拖曳分類", talent: "分類、整理、判斷",
      forms: {
        N: { name: "書卷貓", skill: "卷頁小箋", ability: "每局一次，提示某項可能的分類。", image: "../遊戲7_轉蛋機/assets/images/pets/wenyue-n.png" },
        R: { name: "學士貓", skill: "學士寬免", ability: "一次錯誤拖曳不會中斷連擊。", image: "../遊戲7_轉蛋機/assets/images/pets/wenyue-r.png" },
        SR: { name: "文庫靈貓", skill: "文庫微光", ability: "停滯太久時，正確分類區域微微發光。", image: "../遊戲7_轉蛋機/assets/images/pets/wenyue-sr.png" },
        SSR: { name: "萬卷賢貓", skill: "萬卷辨誤", ability: "連續答錯後排除一個錯誤分類區。", image: "../遊戲7_轉蛋機/assets/images/pets/wenyue-ssr.png" },
        UR: { name: "天書神貓", skill: "天書定域", ability: "每局一次，只保留可能的正確分類區。", image: "../遊戲7_轉蛋機/assets/images/pets/wenyue-ur.png" }
      }
    },
    xuanxuan: {
      id: "xuanxuan", family: "時巡龜・玄玄", game: "排序遊戲", talent: "順序、邏輯、時間",
      forms: {
        N: { name: "小玄龜", skill: "時序一點", ability: "每局一次，提示一個項目的正確位置。", image: "../遊戲7_轉蛋機/assets/images/pets/xuanxuan-n.png" },
        R: { name: "時刻龜", skill: "前後時刻", ability: "提示兩個項目的前後關係。", image: "../遊戲7_轉蛋機/assets/images/pets/xuanxuan-r.png" },
        SR: { name: "時巡玄龜", skill: "錯位巡查", ability: "排序錯誤時指出其中一個錯誤位置。", image: "../遊戲7_轉蛋機/assets/images/pets/xuanxuan-sr.png" },
        SSR: { name: "歲月玄武", skill: "歲月留痕", ability: "提交錯誤時保留所有已經放對的位置。", image: "../遊戲7_轉蛋機/assets/images/pets/xuanxuan-ssr.png" },
        UR: { name: "時界玄武", skill: "時界鎖定", ability: "每局一次，直接鎖定兩個正確位置。", image: "../遊戲7_轉蛋機/assets/images/pets/xuanxuan-ur.png" }
      }
    }
  };

  const RARITY_LABELS = { N: "普通", R: "不錯", SR: "稀有", SSR: "史詩", UR: "傳說" };
  const PET_GLOWS = {
    xiaomo: "rgba(184,151,103,.28)",
    fuwan: "rgba(218,159,58,.29)",
    jifeng: "rgba(86,157,190,.28)",
    wenyue: "rgba(161,119,185,.27)",
    xuanxuan: "rgba(76,130,146,.28)"
  };

  const core = window.KotodamaGame || null;
  const petConfig = core?.getPetConfig?.("../遊戲7_轉蛋機/assets/images") || FALLBACK_PETS;
  let playerData = readPlayerData();
  let activePetId = getInitialPetId();
  let activeRarity = getInitialRarity(activePetId);

  const loadingScreen = document.getElementById("loadingScreen");
  const siteHeader = document.getElementById("siteHeader");
  const menuToggle = document.getElementById("menuToggle");
  const primaryNav = document.getElementById("primaryNav");
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;

  function readPlayerData() {
    if (core?.loadGameData) return core.loadGameData();
    try {
      const parsed = JSON.parse(localStorage.getItem("kotodamaGameData") || "null");
      return parsed && typeof parsed === "object" ? parsed : { gacha: {} };
    } catch (_) {
      return { gacha: {} };
    }
  }

  function safeStorageValue(key) {
    try { return { available: true, value: localStorage.getItem(key) }; }
    catch (_) { return { available: false, value: null }; }
  }

  function getInitialPetId() {
    const equipped = playerData?.gacha?.equippedPet;
    return equipped && petConfig[equipped] ? equipped : "xiaomo";
  }

  function getInitialRarity(petId) {
    const rarity = playerData?.gacha?.pets?.[petId]?.rarity;
    return RARITIES.includes(rarity) ? rarity : "N";
  }

  function hideLoadingScreen() {
    requestAnimationFrame(() => loadingScreen?.classList.add("is-hidden"));
  }

  if (document.readyState === "complete") hideLoadingScreen();
  else window.addEventListener("load", hideLoadingScreen, { once: true });

  function closeMenu(returnFocus = false) {
    primaryNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "開啟導覽選單");
    document.body.classList.remove("menu-open");
    if (returnFocus) menuToggle.focus({ preventScroll: true });
  }

  menuToggle?.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "關閉導覽選單" : "開啟導覽選單");
    primaryNav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  });

  primaryNav?.addEventListener("click", event => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && primaryNav?.classList.contains("is-open")) closeMenu(true);
  });

  let scrollFrame = 0;
  function handleScroll() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      const top = window.scrollY || document.documentElement.scrollTop;
      siteHeader?.classList.toggle("is-scrolled", top > 24);
      if (!reduceMotion && window.innerWidth > 768) {
        const heroBackdrop = document.querySelector(".hero-backdrop");
        if (heroBackdrop && top < window.innerHeight * 1.15) {
          heroBackdrop.style.translate = `0 ${Math.min(70, top * .09)}px`;
        }
      }
      scrollFrame = 0;
    });
  }
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();

  const revealItems = [...document.querySelectorAll(".reveal")];
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(item => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: .08 });
    revealItems.forEach(item => revealObserver.observe(item));
  }

  if ("IntersectionObserver" in window) {
    const navLinks = [...document.querySelectorAll('.primary-nav a[href^="#"]')];
    const sections = navLinks.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => {
          const active = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("is-current", active);
          if (active) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-28% 0px -62%", threshold: 0 });
    sections.forEach(section => sectionObserver.observe(section));
  }

  const mapElements = {
    number: document.getElementById("mapStageNumber"),
    name: document.getElementById("mapStageName"),
    story: document.getElementById("mapStageStory"),
    game: document.getElementById("mapStageGame"),
    learning: document.getElementById("mapStageLearning"),
    difficulty: document.getElementById("mapStageDifficulty"),
    progress: document.getElementById("mapStageProgress"),
    link: document.getElementById("mapStageLink")
  };

  function getStageState(index) {
    const target = safeStorageValue(STAGES[index].key);
    if (!target.available) return { label: "瀏覽器無法讀取", complete: false };
    if (target.value === "true") return { label: `${STAGES[index].seal}已取得`, complete: true };
    const teacherMode = safeStorageValue("adventure_teacher_mode").value === "true";
    const previousComplete = index === 0 || STAGES.slice(0, index).every(stage => safeStorageValue(stage.key).value === "true");
    return { label: teacherMode || previousComplete ? "已解鎖・待挑戰" : "完成前一關後解鎖", complete: false };
  }

  function renderMapStage(index) {
    const stage = STAGES[index];
    if (!stage) return;
    const state = getStageState(index);
    mapElements.number.textContent = stage.number;
    mapElements.name.textContent = stage.name;
    mapElements.story.textContent = stage.story;
    mapElements.game.textContent = stage.game;
    mapElements.learning.textContent = stage.learning;
    mapElements.difficulty.textContent = stage.difficulty;
    mapElements.progress.textContent = state.label;
    mapElements.progress.classList.toggle("is-complete", state.complete);
    mapElements.link.href = stage.href;
    mapElements.link.setAttribute("aria-label", `前往${stage.name}關卡`);
    document.querySelectorAll(".map-pin").forEach((pin, pinIndex) => {
      pin.classList.toggle("is-active", pinIndex === index);
      pin.setAttribute("aria-pressed", String(pinIndex === index));
    });
  }

  document.querySelectorAll(".map-pin").forEach((pin, index) => {
    pin.addEventListener("click", () => renderMapStage(index));
    pin.addEventListener("pointerenter", event => {
      if (event.pointerType === "mouse") renderMapStage(index);
    });
  });

  function renderStageJourneyProgress() {
    document.querySelectorAll(".stage-feature").forEach((feature, index) => {
      const state = getStageState(index);
      feature.classList.toggle("is-cleared", state.complete);
      const indexLabel = feature.querySelector(".stage-index");
      if (indexLabel) {
        indexLabel.dataset.baseLabel ||= indexLabel.textContent;
        indexLabel.textContent = state.complete ? `${indexLabel.dataset.baseLabel} · 已完成` : indexLabel.dataset.baseLabel;
      }
    });
  }

  function renderPet(petId, rarity = "N") {
    const pet = petConfig[petId];
    const safeRarity = RARITIES.includes(rarity) ? rarity : "N";
    const form = pet?.forms?.[safeRarity];
    if (!pet || !form) return;
    activePetId = petId;
    activeRarity = safeRarity;

    document.querySelectorAll(".pet-tab").forEach(tab => {
      const active = tab.dataset.pet === petId;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    const detail = document.getElementById("petDetail");
    detail?.style.setProperty("--pet-glow", PET_GLOWS[petId] || PET_GLOWS.xiaomo);
    document.getElementById("petRarity").textContent = `${safeRarity} · ${RARITY_LABELS[safeRarity]}`;
    document.getElementById("petFamily").textContent = pet.family;
    document.getElementById("petName").textContent = form.name;
    document.getElementById("petTalent").textContent = pet.talent;
    document.getElementById("petGame").textContent = pet.game;
    document.getElementById("petSkill").textContent = form.skill;
    document.getElementById("petAbility").textContent = form.ability;
    const image = document.getElementById("petImage");
    image.src = form.image;
    image.alt = `${safeRarity} 型態 ${form.name}`;

    const formNav = document.getElementById("petForms");
    formNav.replaceChildren(...RARITIES.map(formRarity => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = formRarity;
      button.className = formRarity === safeRarity ? "is-active" : "";
      button.setAttribute("aria-label", `查看 ${pet.forms[formRarity].name}`);
      button.addEventListener("click", () => renderPet(petId, formRarity));
      return button;
    }));
  }

  document.querySelectorAll(".pet-tab").forEach(tab => {
    tab.addEventListener("click", () => renderPet(tab.dataset.pet, getInitialRarity(tab.dataset.pet)));
    tab.addEventListener("keydown", event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const tabs = [...document.querySelectorAll(".pet-tab")];
      const current = tabs.indexOf(tab);
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const next = tabs[(current + offset + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
  });

  function renderPlayerCollection() {
    playerData = readPlayerData();
    const gacha = playerData?.gacha || {};
    const collection = gacha.collection && typeof gacha.collection === "object" ? gacha.collection : {};
    const unlockedKeys = Object.keys(collection).filter(key => collection[key] === true);
    const collectionGrid = document.getElementById("collectionGrid");
    if (!collectionGrid) return;
    const fragment = document.createDocumentFragment();

    Object.values(petConfig).forEach(pet => {
      RARITIES.forEach(rarity => {
        const form = pet.forms[rarity];
        const unlocked = Boolean(collection[`${pet.id}-${rarity}`]);
        const entry = document.createElement("article");
        entry.className = `collection-entry${unlocked ? "" : " is-locked"}`;
        entry.setAttribute("aria-label", unlocked ? `${rarity} ${form.name}，已解鎖` : `${pet.family} ${rarity} 型態，尚未解鎖`);
        const rarityTag = document.createElement("span");
        rarityTag.textContent = rarity;
        entry.append(rarityTag);
        if (unlocked) {
          const image = document.createElement("img");
          image.loading = "lazy";
          image.src = form.image;
          image.alt = form.name;
          entry.append(image);
          const name = document.createElement("small");
          name.textContent = form.name;
          entry.append(name);
        } else {
          const unknown = document.createElement("b");
          unknown.textContent = "???";
          entry.append(unknown);
        }
        fragment.append(entry);
      });
    });
    collectionGrid.replaceChildren(fragment);
    document.getElementById("collectionUnlocked").textContent = String(Math.min(25, unlockedKeys.length));
    document.getElementById("stoneCount").textContent = String(Math.max(0, Math.floor(Number(gacha.spiritStones) || 0)));
  }

  const galleryTrack = document.getElementById("galleryTrack");
  const gallerySlides = [...document.querySelectorAll(".gallery-slide")];
  const galleryImages = gallerySlides.map(slide => slide.querySelector("img[data-gallery-src]")).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const galleryImageObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const image = entry.target;
        image.src = image.dataset.gallerySrc;
        image.removeAttribute("data-gallery-src");
        galleryImageObserver.unobserve(image);
      });
    }, { rootMargin: "250px", threshold: .01 });
    galleryImages.forEach(image => galleryImageObserver.observe(image));
  } else {
    galleryImages.forEach(image => {
      image.src = image.dataset.gallerySrc;
      image.removeAttribute("data-gallery-src");
    });
  }

  document.querySelector(".gallery-control.prev")?.addEventListener("click", () => {
    galleryTrack.scrollBy({ left: -galleryTrack.clientWidth * .82, behavior: reduceMotion ? "auto" : "smooth" });
  });
  document.querySelector(".gallery-control.next")?.addEventListener("click", () => {
    galleryTrack.scrollBy({ left: galleryTrack.clientWidth * .82, behavior: reduceMotion ? "auto" : "smooth" });
  });

  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCaption = document.getElementById("lightboxCaption");
  let lightboxReturnFocus = null;
  gallerySlides.forEach(slide => {
    slide.addEventListener("click", () => {
      lightboxReturnFocus = slide;
      lightboxImage.src = slide.dataset.full;
      lightboxImage.alt = slide.querySelector("img").alt;
      lightboxCaption.textContent = slide.dataset.caption;
      lightbox.showModal();
      document.body.classList.add("dialog-open");
      lightbox.querySelector(".lightbox-close").focus({ preventScroll: true });
    });
  });
  function closeLightbox() {
    if (!lightbox.open) return;
    lightbox.close();
  }
  lightbox?.querySelector(".lightbox-close")?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", event => {
    const rect = lightbox.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeLightbox();
  });
  lightbox?.addEventListener("close", () => {
    document.body.classList.remove("dialog-open");
    lightboxImage.removeAttribute("src");
    lightboxReturnFocus?.focus({ preventScroll: true });
  });

  document.querySelectorAll(".faq-list details").forEach(details => {
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      document.querySelectorAll(".faq-list details[open]").forEach(other => {
        if (other !== details) other.open = false;
      });
    });
  });

  function refreshReadOnlyProgress() {
    renderMapStage(Number(document.querySelector(".map-pin.is-active")?.dataset.stage || 0));
    renderStageJourneyProgress();
    renderPlayerCollection();
    const ownedRarity = getInitialRarity(activePetId);
    if (playerData?.gacha?.pets?.[activePetId] && activeRarity === "N") renderPet(activePetId, ownedRarity);
  }

  window.addEventListener("pageshow", refreshReadOnlyProgress);
  window.addEventListener("storage", refreshReadOnlyProgress);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshReadOnlyProgress();
  });

  document.querySelectorAll(`a[href="${GAME_START_URL}"]`).forEach(link => link.dataset.destination = "adventure-map");
  document.querySelectorAll(`a[href="${GACHA_URL}"]`).forEach(link => link.dataset.destination = "kotodama-gacha");

  renderMapStage(0);
  renderStageJourneyProgress();
  renderPet(activePetId, activeRarity);
  renderPlayerCollection();
})();
