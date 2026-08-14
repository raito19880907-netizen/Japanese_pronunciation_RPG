(() => {
  "use strict";
  const core = window.KotodamaGame;
  if (!core) return;
  let currentRun = null;
  let widget = null;
  const compactMedia = window.matchMedia?.("(orientation: landscape) and (max-height: 650px)") || null;

  function removeTransient(selector) { document.querySelectorAll(selector).forEach(node => node.remove()); }
  function asset(run, relative) { return core.joinAsset(run.assetBase, relative); }

  function ensureWidget() {
    if (widget?.isConnected) return widget;
    widget = document.createElement("aside");
    widget.className = "kotodama-companion";
    widget.hidden = true;
    widget.setAttribute("aria-label", "同行言靈");
    widget.innerHTML = `<button class="kotodama-companion-toggle" type="button" aria-expanded="true" aria-label="收合同行言靈面板"><img alt=""></button><div class="kotodama-companion-copy"><span class="kotodama-companion-rarity"></span><strong class="kotodama-companion-name"></strong><span class="kotodama-companion-skill"></span></div><button class="kotodama-skill-button" type="button" hidden></button>`;
    const toggle = widget.querySelector(".kotodama-companion-toggle");
    toggle.addEventListener("click", () => setWidgetExpanded(!widget.classList.contains("is-expanded")));
    document.body.append(widget);
    return widget;
  }

  function compactLayout() {
    return compactMedia?.matches || false;
  }

  function setWidgetExpanded(expanded) {
    const card = ensureWidget();
    const next = compactLayout() ? Boolean(expanded) : true;
    card.classList.toggle("is-expanded", next);
    const toggle = card.querySelector(".kotodama-companion-toggle");
    toggle.setAttribute("aria-expanded", String(next));
    toggle.setAttribute("aria-label", `${next ? "收合" : "展開"}同行言靈面板`);
  }

  compactMedia?.addEventListener?.("change", event => {
    if (widget?.isConnected && !widget.hidden) setWidgetExpanded(!event.matches);
  });

  function showIntro(run) {
    if (!run.pet) return;
    removeTransient(".kotodama-intro-toast");
    const toast = document.createElement("div");
    toast.className = "kotodama-intro-toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `<img src="${asset(run, run.pet.form.image)}" alt="${run.pet.form.name}"><span>言靈同行</span><strong>${run.pet.rarity}｜${run.pet.form.name}</strong><span>技能：${run.pet.form.skill}</span>`;
    document.body.append(toast);
    setTimeout(() => toast.classList.add("is-leaving"), 1700);
    setTimeout(() => toast.remove(), 2100);
  }

  function begin(options = {}) {
    const equipped = core.getEquippedPet();
    const allowed = Boolean(equipped && (options.allowAny || equipped.id === options.expectedPet));
    const run = {
      id: core.makeRunId(options.stageId || "stage"),
      stageId: options.stageId || "stage",
      assetBase: options.assetBase || "",
      pet: allowed ? equipped : null,
      active: allowed,
      rewarded: false,
      meta: Object.create(null),
      setSkill(label, uses, handler) {
        if (!this.active || typeof handler !== "function" || uses <= 0) return;
        const card = ensureWidget();
        const button = card.querySelector(".kotodama-skill-button");
        let remaining = Math.max(0, Math.floor(uses));
        const render = () => { button.textContent = `${label}　${remaining} / ${uses}`; button.disabled = remaining <= 0; };
        button.hidden = false;
        button.onclick = () => {
          if (remaining <= 0) return;
          const result = handler(this);
          if (result === false) return;
          remaining -= 1;
          render();
          if (compactLayout()) setWidgetExpanded(false);
        };
        render();
      },
      reward() {
        if (this.rewarded) return { awarded: false, reason: "run-already-finished", spiritStones: core.getSpiritStoneCount() };
        this.rewarded = true;
        const result = core.awardStageClear(this.id, this.stageId);
        if (result.awarded) showReward(this);
        return result;
      }
    };
    currentRun = run;
    const card = ensureWidget();
    card.querySelector(".kotodama-skill-button").hidden = true;
    card.querySelector(".kotodama-skill-button").onclick = null;
    if (run.pet) {
      card.hidden = false;
      setWidgetExpanded(!compactLayout());
      card.querySelector("img").src = asset(run, run.pet.form.image);
      card.querySelector("img").alt = run.pet.form.name;
      card.querySelector(".kotodama-companion-rarity").textContent = `${run.pet.rarity}｜言靈同行`;
      card.querySelector(".kotodama-companion-name").textContent = run.pet.form.name;
      card.querySelector(".kotodama-companion-skill").textContent = run.pet.form.skill;
      showIntro(run);
    } else {
      card.hidden = true;
    }
    return run;
  }

  function showReward(run = currentRun) {
    removeTransient(".kotodama-reward");
    const reward = document.createElement("div");
    reward.className = "kotodama-reward";
    reward.setAttribute("role", "status");
    const stoneSrc = asset(run || { assetBase: "" }, "spirit-stone.png");
    reward.innerHTML = `<img src="${stoneSrc}" alt="靈石"><span>修練之光凝聚</span><strong>獲得　靈石 ×1</strong><span>目前持有 ${core.getSpiritStoneCount()} 顆</span>`;
    document.body.append(reward);
    setTimeout(() => reward.classList.add("is-leaving"), 1900);
    setTimeout(() => reward.remove(), 2300);
  }

  window.KotodamaCompanion = Object.freeze({ begin, getCurrentRun: () => currentRun, showReward });
})();
