const fs = require("fs");
const vm = require("vm");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sharedScript = fs.readFileSync(path.join(root, "..", "assets", "js", "kotodama-system.js"), "utf8");
const script = html.match(/<script id="kotodamaGachaCore">([\s\S]*?)<\/script>/)[1];

const storage = new Map();
const makeElement = () => ({
  style: {}, className: "", hidden: false, disabled: false, dataset: {},
  classList: { add() {}, remove() {}, contains() { return false; } },
  setAttribute() {}, addEventListener() {}, focus() {}, remove() {},
  appendChild() {}, querySelectorAll() { return []; },
  querySelector() { return makeElement(); },
  innerHTML: "", textContent: ""
});

const context = {
  console,
  Math: Object.create(Math),
  Date,
  JSON,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Promise,
  CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
  setTimeout,
  clearTimeout,
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  document: {
    body: makeElement(),
    querySelector() { return makeElement(); },
    createElement() { return makeElement(); },
    addEventListener() {}
  }
};
context.window = context;
context.dispatchEvent = () => true;
vm.createContext(context);
vm.runInContext(sharedScript, context, { filename: "kotodama-system.js" });
vm.runInContext(script, context, { filename: "index.html" });

function run(code) { return vm.runInContext(code, context); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function reset() { run("gameData.gacha = createDefaultGachaData()") }

const rarityOrder = ["N", "R", "SR", "SSR", "UR"];
const capsulePaths = rarityOrder.map(rarity => run(`RARITY_CONFIG["${rarity}"].capsule`));
assert(new Set(capsulePaths).size === rarityOrder.length, "Each rarity must use its own capsule artwork");
for (const capsulePath of capsulePaths) {
  assert(fs.existsSync(path.join(root, ...capsulePath.split("/"))), `Missing capsule artwork: ${capsulePath}`);
}

for (const pityCount of [0, 49, 50, 59, 60, 69, 70, 79]) {
  run(`gameData.gacha.pityCount = ${pityCount}`);
  const total = run("Object.values(getCurrentRates(false)).reduce((sum, value) => sum + value, 0)");
  assert(Math.abs(total - 100) < 1e-9, `Pity ${pityCount}: rates must total 100`);
}

reset();
run("Math.random = () => 0");
const ten = run("performTenPull().map(result => result.rarity)");
assert(ten.length === 10, "Ten pull must produce ten results");
assert(["SR", "SSR", "UR"].includes(ten[9]), "Tenth pull must guarantee SR+ when first nine are below SR");

reset();
run("gameData.gacha.pityCount = 79; Math.random = () => 0.999999");
const hardPity = run("performPull(false)");
assert(hardPity.rarity === "UR", "80th pull must be UR");
assert(run("gameData.gacha.pityCount") === 0, "UR must reset pity count");

reset();
run('gameData.gacha.pets.xiaomo = { rarity: "SR", fragments: 0 }');
const duplicate = run('receivePet("xiaomo", "R")');
assert(duplicate.outcome === "duplicate" && duplicate.fragments === 10, "Lower duplicate must convert to configured fragments");
assert(run("gameData.gacha.pets.xiaomo.fragments") === 10, "Fragments must be added to the correct pet");
const upgrade = run('receivePet("xiaomo", "SSR")');
assert(upgrade.outcome === "upgrade" && run("gameData.gacha.pets.xiaomo.rarity") === "SSR", "Higher rarity must directly upgrade");
run("gameData.gacha.pets.xiaomo.fragments = 80");
const evolution = run('evolvePet("xiaomo")');
assert(evolution.to === "UR", "SSR must evolve to UR with enough fragments");
assert(run("gameData.gacha.pets.xiaomo.fragments") === 0, "Evolution must consume fragments");
assert(run('gameData.gacha.collection["xiaomo-UR"]') === true, "Evolution must unlock the evolved form in collection");

reset();
const firstAward = run('awardStageClear("run-check-1", "stage-check")');
const secondAward = run('awardStageClear("run-check-1", "stage-check")');
const repeatAward = run('awardStageClear("run-check-2", "stage-check")');
assert(firstAward.awarded && !secondAward.awarded && repeatAward.awarded, "One run may only award once while a new run may award again");
assert(run("gameData.gacha.spiritStones") === 2, "Same-run duplicate must not add a stone; a repeat clear must add one");

const apiNames = ["addSpiritStone", "getSpiritStoneCount", "getOwnedPets", "getPetData", "getEquippedPet", "setEquippedPet", "awardStageClear", "saveGameData", "loadGameData"];
for (const name of apiNames) assert(typeof context.window[name] === "function", `Missing global integration API: ${name}`);
assert(context.window.KotodamaGacha && apiNames.every(name => typeof context.window.KotodamaGacha[name] === "function"), "Namespaced integration API is incomplete");

reset();
run('gameData.gacha.spiritStones = 7; gameData.gacha.pityCount = 42; gameData.gacha.pets.wenyue = { rarity: "SR", fragments: 35 }; gameData.gacha.collection["wenyue-SR"] = true; saveGameData()');
run('gameData.gacha = createDefaultGachaData(); loadGameData()');
assert(run("gameData.gacha.spiritStones") === 7, "Spirit stones must survive reload");
assert(run("gameData.gacha.pityCount") === 42, "Pity must survive reload");
assert(run('gameData.gacha.pets.wenyue.fragments') === 35, "Pet fragments must survive reload");
assert(run('gameData.gacha.collection["wenyue-SR"]') === true, "Collection must survive reload");

storage.set("kotodamaGameData", JSON.stringify({ version: 1, gacha: { spiritStones: 4, pityCount: 57, awardedStages: { legacy: "2025-01-01" }, standaloneStageCounter: 9 } }));
run("loadGameData()");
assert(run("gameData.gacha.spiritStones") === 4, "Legacy spirit stones must migrate");
assert(run("gameData.gacha.pityCount") === 57, "Legacy pity must migrate without reset");
assert(run("Boolean(gameData.gacha.awardedRuns.legacy)") === true, "Legacy award records must migrate");
assert(run('Object.prototype.hasOwnProperty.call(gameData.gacha, "standaloneStageCounter")') === false, "Standalone reward counter must be removed");

console.log(JSON.stringify({
  status: "PASS",
  checks: ["five rarity capsule artworks", "probability totals", "ten-pull SR guarantee", "80th-pull UR guarantee", "UR reset", "duplicates", "direct upgrades", "evolution", "collection", "per-run reward dedupe", "repeat-clear reward", "storage round-trip", "legacy migration", "global API", "namespaced API"]
}, null, 2));
