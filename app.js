/* ===== app.js — Adjusted to remove Select page references =====
   - Removed renderManualList and any nav('select') usage
   - Preserves all other behavior (meals, essentials, shopping, storage mirror)
*/

/* ===== Defaults and storage helpers ===== */
const defaultMeals = [
  { name: "Spaghetti Bolognese", items: "Pasta, Minced Beef, Tomato Sauce, Garlic, Onion" },
  { name: "Grilled Salmon", items: "Salmon Fillet, Lemon, Olive Oil, Herbs" },
  { name: "Chicken Curry", items: "Chicken, Curry Paste, Coconut Milk, Rice" },
  { name: "Vegetable Stir Fry", items: "Broccoli, Carrots, Peppers, Soy Sauce, Noodles" },
  { name: "Beef Tacos", items: "Taco Shells, Beef, Lettuce, Tomato, Cheese" },
  { name: "Margherita Pizza", items: "Pizza Base, Tomato Sauce, Mozzarella, Basil" }
];

const defaultEssentials = [
  "Milk","Bread","Coffee","Sugar","Cereal","Butter","Toilet roll",
  "Toothpaste","Shampoo","Soap","Cheese","Ham","Bananas","Orange Juice"
];

const setLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const getLS = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? fallback : JSON.parse(v);
  } catch { return fallback; }
};

function mirror(keys) {
  if (typeof syncStorageToIndexedDB === "function") syncStorageToIndexedDB(keys);
}

/* ===== App state ===== */
let meals = getLS("meals", null);
if (!Array.isArray(meals) || meals.length === 0) { meals = defaultMeals.slice(); setLS("meals", meals); }

let plan = getLS("plan", null);
if (!Array.isArray(plan) || plan.length !== 7) { plan = Array(7).fill(null); setLS("plan", plan); }

let essentials = getLS("essentials", null);
if (!Array.isArray(essentials) || essentials.length === 0) { essentials = defaultEssentials.slice(); setLS("essentials", essentials); }

let manualSelected = new Set(getLS("manualSelected", []));
let manualEssentials = new Set(getLS("manualEssentials", []));
let clearedShopping = new Set(getLS("clearedShopping", []));
let checkedShopping = new Set(getLS("checkedShopping", []));
let planSnapshot = localStorage.getItem("planSnapshot") || null;

/* ===== DOM bindings ===== */
let mealList, mealName, mealItems, essentialsList, essentialItem, essentialSelectList, shoppingItems;
function bindElements() {
  mealList = document.getElementById("mealList");
  mealName = document.getElementById("mealName");
  mealItems = document.getElementById("mealItems");
  essentialsList = document.getElementById("essentialsList");
  essentialItem = document.getElementById("essentialItem");
  essentialSelectList = document.getElementById("essentialSelectList");
  shoppingItems = document.getElementById("shoppingItems");

  ["mealList","mealName","mealItems","shoppingItems"].forEach(id => {
    if (!document.getElementById(id)) console.warn(`Missing DOM element id="${id}"`);
  });
}

/* ===== Small helpers ===== */
const computePlanSnapshot = () => JSON.stringify(plan.map(p => (p ? p.name + "||" + p.items : null)));

const saveManualSelected = () => { setLS("manualSelected", [...manualSelected]); mirror(["manualSelected"]); };
const saveManualEssentials = () => { setLS("manualEssentials", [...manualEssentials]); mirror(["manualEssentials"]); };
const saveShoppingState = () => { setLS("clearedShopping", [...clearedShopping]); setLS("checkedShopping", [...checkedShopping]); mirror(["clearedShopping","checkedShopping"]); };

function saveAll() {
  setLS("meals", meals);
  setLS("plan", plan);
  setLS("essentials", essentials);
  saveManualEssentials();
  saveManualSelected();

  const snap = computePlanSnapshot();
  if (snap !== planSnapshot) {
    planSnapshot = snap;
    localStorage.setItem("planSnapshot", snap);
    clearedShopping = new Set();
    checkedShopping = new Set();
    saveShoppingState();
  }

  mirror(["meals","plan","essentials","manualEssentials","manualSelected","planSnapshot"]);
  const shopEl = document.getElementById("shop");
  if (shopEl && shopEl.classList.contains("active")) renderShoppingList();
}

function norm(s) {
  return s ? s.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/s$/, "") : "";
}

/* ===== Shared UI helpers (consolidated) ===== */
function createInfoBox(text) {
  const box = document.createElement("div");
  box.className = "slim-info-box";
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "polite");
  box.style.width = "100%";
  box.style.boxSizing = "border-box";
  box.style.background = "rgba(250,250,250,0.98)";
  box.style.border = "1px solid rgba(0,0,0,0.06)";
  box.style.boxShadow = "0 4px 10px rgba(0,0,0,0.04)";
  box.style.padding = "8px 12px";
  box.style.borderRadius = "10px";
  box.style.margin = "10px 0";
  box.style.textAlign = "center";
  box.style.fontFamily = "Poppins, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial";
  box.style.fontSize = "13px";
  box.style.color = "#333";
  box.textContent = text || "Click on an item below to add or remove in the Shopping List.";
  return box;
}

function styleButton(btn, variant = "accent") {
  try {
    btn.style.background = "var(--accent, #0b76c2)";
    btn.style.color = "#fff";
    btn.style.border = "1px solid rgba(0,0,0,0.06)";
    btn.style.boxShadow = "0 6px 14px rgba(11,118,194,0.12)";
    btn.style.padding = "12px 18px";
    btn.style.borderRadius = "10px";
    btn.style.fontSize = "15px";
    btn.style.fontWeight = "700";
    btn.style.cursor = "pointer";
    btn.style.display = "inline-block";
    btn.style.textAlign = "center";
    btn.style.margin = "0";
  } catch (e) {}
}

function copySizing(fromBtn, toBtn) {
  if (!fromBtn || !toBtn) return;
  const props = [
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "font-size", "font-weight", "border-radius", "width", "height",
    "min-width", "min-height", "box-sizing", "line-height"
  ];
  try {
    const cs = window.getComputedStyle(fromBtn);
    props.forEach(p => {
      const v = cs.getPropertyValue(p);
      if (v) toBtn.style.setProperty(p, v);
    });
    toBtn.style.display = cs.getPropertyValue("display") || "inline-block";
    toBtn.style.boxSizing = cs.getPropertyValue("box-sizing") || "border-box";
  } catch (e) {
    styleButton(toBtn);
  }
}

/* ===== Meals logic ===== */
function addMeal() {
  const n = (mealName && mealName.value || "").trim();
  const i = (mealItems && mealItems.value || "").trim();
  if (!n || !i) return alert("Enter meal name and items");
  meals.push({ name: n, items: i });
  saveAll();
  renderMeals();
  renderShoppingList();
  if (mealName) mealName.value = "";
  if (mealItems) mealItems.value = "";
}

function editMeal(i) {
  const m = meals[i];
  if (!m) return;
  const n = prompt("Edit meal name:", m.name);
  if (n === null) return;
  const it = prompt("Edit recipe items:", m.items);
  if (it === null) return;
  meals[i] = { name: n.trim(), items: it.trim() };
  saveAll();
  renderMeals();
  renderShoppingList();
}

function deleteMeal(i) {
  const m = meals[i];
  if (!m) return;
  if (!confirm(`Delete "${m.name}"?`)) return;
  meals.splice(i, 1);
  saveAll();
  renderMeals();
  renderShoppingList();
}

function renderMeals() {
  if (!mealList) return;
  mealList.innerHTML = "";
  meals.forEach((m, x) => {
    const idx = String(x);
    const card = document.createElement("div");
    card.className = "meal-card card";
    card.style.display = "flex";
    card.style.alignItems = "center";
    card.style.justifyContent = "space-between";
    card.style.gap = "12px";
    card.style.padding = "12px";
    card.style.borderRadius = "10px";
    card.style.background = "var(--accent, #0b76c2)";
    card.style.color = "#fff";

    if (manualSelected.has(idx)) {
      card.style.filter = "brightness(0.88)";
      card.style.borderColor = "rgba(0,0,0,0.08)";
    }

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "flex-start";
    left.style.gap = "10px";
    left.style.flex = "1";
    left.style.minWidth = "0";

    const checkBadge = document.createElement("div");
    checkBadge.className = "meal-check-badge";
    checkBadge.style.width = "28px";
    checkBadge.style.height = "28px";
    checkBadge.style.borderRadius = "50%";
    checkBadge.style.display = "inline-flex";
    checkBadge.style.alignItems = "center";
    checkBadge.style.justifyContent = "center";
    checkBadge.style.fontWeight = "700";
    checkBadge.style.color = "#fff";
    if (manualSelected.has(idx)) {
      checkBadge.style.background = "rgba(255,255,255,0.18)";
      checkBadge.textContent = "✓";
    } else {
      checkBadge.style.background = "transparent";
      checkBadge.style.border = "2px solid rgba(255,255,255,0.18)";
      checkBadge.textContent = "";
    }

    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.flex = "1";
    content.style.minWidth = "0";

    const title = document.createElement("div");
    title.textContent = m.name;
    title.style.fontWeight = "700";
    title.style.fontSize = "16px";
    title.style.color = "#fff";
    title.style.whiteSpace = "nowrap";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";

    const recipeDiv = document.createElement("div");
    recipeDiv.id = `r${x}`;
    recipeDiv.className = "recipe";
    recipeDiv.style.display = "none";
    recipeDiv.style.marginTop = "6px";
    recipeDiv.style.color = "rgba(255,255,255,0.92)";
    recipeDiv.style.fontSize = "13px";
    recipeDiv.style.fontWeight = "500";
    recipeDiv.style.whiteSpace = "nowrap";
    recipeDiv.style.overflow = "hidden";
    recipeDiv.style.textOverflow = "ellipsis";
    recipeDiv.style.maxWidth = "100%";
    recipeDiv.textContent = m.items.split(",").map(s => s.trim()).join(", ");

    content.appendChild(title);
    content.appendChild(recipeDiv);

    left.appendChild(checkBadge);
    left.appendChild(content);

    const controls = document.createElement("div");
    controls.className = "meal-controls";
    controls.style.display = "flex";
    controls.style.gap = "8px";
    controls.style.alignItems = "center";
    controls.style.flex = "none";

    const showBtn = document.createElement("button");
    showBtn.className = "tool-btn";
    showBtn.textContent = "Show Recipe";
    showBtn.style.background = "rgba(255,255,255,0.12)";
    showBtn.style.color = "#fff";
    showBtn.style.border = "none";
    showBtn.style.padding = "6px 8px";
    showBtn.style.borderRadius = "6px";
    showBtn.onclick = (e) => {
      e.stopPropagation();
      if (recipeDiv.style.display === "block") {
        recipeDiv.style.display = "none";
        showBtn.textContent = "Show Recipe";
      } else {
        recipeDiv.style.display = "block";
        showBtn.textContent = "Hide Recipe";
      }
    };

    const editBtn = document.createElement("button");
    editBtn.className = "tool-btn";
    editBtn.textContent = "Edit";
    editBtn.style.background = "rgba(255,255,255,0.08)";
    editBtn.style.color = "#fff";
    editBtn.style.padding = "6px 8px";
    editBtn.style.borderRadius = "6px";
    editBtn.onclick = (e) => { e.stopPropagation(); editMeal(x); };

    const delBtn = document.createElement("button");
    delBtn.className = "tool-btn";
    delBtn.textContent = "Delete";
    delBtn.style.background = "rgba(255,255,255,0.08)";
    delBtn.style.color = "#fff";
    delBtn.style.padding = "6px 8px";
    delBtn.style.borderRadius = "6px";
    delBtn.onclick = (e) => { e.stopPropagation(); deleteMeal(x); };

    controls.appendChild(showBtn);
    controls.appendChild(editBtn);
    controls.appendChild(delBtn);

    card.onclick = (e) => {
      if (e.target.closest && e.target.closest(".meal-controls")) return;
      if (manualSelected.has(idx)) manualSelected.delete(idx);
      else manualSelected.add(idx);
      m.items.split(",").forEach(it => clearedShopping.delete(norm(it)));
      saveManualSelected();
      saveShoppingState();
      renderMeals();
      renderShoppingList();
    };

    card.appendChild(left);
    card.appendChild(controls);
    mealList.appendChild(card);
  });
}

/* ===== Essentials logic ===== */
function addEssential() {
  const val = (essentialItem && essentialItem.value || "").trim();
  if (!val) return alert("Enter an item");
  essentials.push(val);
  setLS("essentials", essentials);
  mirror(["essentials"]);
  if (essentialItem) essentialItem.value = "";
  renderEssentials();
  renderEssentialSelectList();
  renderShoppingList();
}

function editEssential(index) {
  const current = essentials[index];
  if (typeof current === "undefined") return;
  const updated = prompt("Edit essential item name:", current);
  if (updated === null) return;
  const trimmed = updated.trim();
  if (!trimmed) return alert("Item name cannot be empty");
  essentials[index] = trimmed;
  setLS("essentials", essentials);
  mirror(["essentials"]);
  renderEssentials();
  renderEssentialSelectList();
  renderShoppingList();
}

function renderEssentials() {
  if (!essentialsList) return;
  essentialsList.innerHTML = "";
  essentials.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "card";
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.marginBottom = "8px";
    row.style.padding = "10px";
    row.style.borderRadius = "10px";
    row.style.background = "var(--accent, #0b76c2)";
    row.style.color = "#fff";

    const label = document.createElement("div");
    label.textContent = item;
    label.style.fontWeight = "600";
    label.style.padding = "8px 0";
    label.style.color = "#fff";

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "8px";
    controls.style.alignItems = "center";

    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.className = "tool-btn";
    edit.style.background = "rgba(255,255,255,0.08)";
    edit.style.color = "#fff";
    edit.onclick = () => editEssential(index);

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.className = "tool-btn";
    del.style.background = "rgba(255,255,255,0.08)";
    del.style.color = "#fff";
    del.onclick = () => {
      essentials.splice(index, 1);
      setLS("essentials", essentials);
      mirror(["essentials"]);
      const newManual = new Set();
      manualEssentials.forEach(i => {
        const iNum = Number(i);
        if (iNum < index) newManual.add(String(iNum));
        else if (iNum > index) newManual.add(String(iNum - 1));
      });
      manualEssentials = newManual;
      saveManualEssentials();
      renderEssentials();
      renderEssentialSelectList();
      renderShoppingList();
    };

    controls.appendChild(edit);
    controls.appendChild(del);

    row.appendChild(label);
    row.appendChild(controls);
    essentialsList.appendChild(row);
  });
}

function renderEssentialSelectList() {
  if (!essentialSelectList) return;
  essentialSelectList.innerHTML = "";
  essentials.forEach((item, index) => {
    const key = String(index);
    const row = document.createElement("div");
    row.className = "card";
    row.style.marginBottom = "8px";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.padding = "10px 12px";
    row.style.borderRadius = "10px";
    row.style.background = "var(--ocean, #006994)";
    row.style.color = "#fff";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "10px";
    left.style.flex = "1";

    const checkBadge = document.createElement("div");
    checkBadge.className = "essential-check-badge";
    checkBadge.style.width = "28px";
    checkBadge.style.height = "28px";
    checkBadge.style.borderRadius = "50%";
    checkBadge.style.display = "inline-flex";
    checkBadge.style.alignItems = "center";
    checkBadge.style.justifyContent = "center";
    checkBadge.style.fontWeight = "700";
    checkBadge.style.color = "#fff";
    if (manualEssentials.has(key)) {
      checkBadge.style.background = "rgba(255,255,255,0.18)";
      checkBadge.textContent = "✓";
    } else {
      checkBadge.style.background = "transparent";
      checkBadge.style.border = "2px solid rgba(255,255,255,0.18)";
      checkBadge.textContent = "";
    }

    const label = document.createElement("div");
    label.textContent = item;
    label.style.fontWeight = "700";
    label.style.color = "#fff";
    label.style.flex = "1";
    label.style.textAlign = "left";

    left.appendChild(checkBadge);
    left.appendChild(label);

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "8px";
    controls.style.alignItems = "center";

    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.className = "tool-btn";
    edit.style.background = "rgba(255,255,255,0.08)";
    edit.style.color = "#fff";
    edit.style.padding = "6px 8px";
    edit.style.borderRadius = "6px";
    edit.onclick = (e) => { e.stopPropagation(); editEssential(index); };

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.className = "tool-btn";
    del.style.background = "rgba(255,255,255,0.08)";
    del.style.color = "#fff";
    del.style.padding = "6px 8px";
    del.style.borderRadius = "6px";
    del.onclick = (e) => {
      e.stopPropagation();
      essentials.splice(index, 1);
      setLS("essentials", essentials);
      mirror(["essentials"]);
      const newManual = new Set();
      manualEssentials.forEach(i => {
        const iNum = Number(i);
        if (iNum < index) newManual.add(String(iNum));
        else if (iNum > index) newManual.add(String(iNum - 1));
      });
      manualEssentials = newManual;
      saveManualEssentials();
      renderEssentials();
      renderEssentialSelectList();
      renderShoppingList();
    };

    controls.appendChild(edit);
    controls.appendChild(del);

    row.onclick = (e) => {
      if (e.target.closest && e.target.closest("button")) return;
      if (manualEssentials.has(key)) manualEssentials.delete(key);
      else manualEssentials.add(key);
      clearedShopping.delete(norm(item));
      saveManualEssentials();
      saveShoppingState();
      renderEssentialSelectList();
      renderShoppingList();
    };

    if (manualEssentials.has(key)) row.style.filter = "brightness(0.88)";

    row.appendChild(left);
    row.appendChild(controls);
    essentialSelectList.appendChild(row);
  });
}

/* ===== Shopping list rendering & interactions ===== */
function renderShoppingList() {
  if (!shoppingItems) return;
  const seen = new Map();

  plan.forEach(m => m?.items?.split(",").forEach(it => {
    const k = norm(it);
    if (!seen.has(k)) seen.set(k, it.trim());
  }));

  manualSelected.forEach(i => {
    const m = meals[+i];
    m?.items?.split(",").forEach(it => {
      const k = norm(it);
      if (!seen.has(k)) seen.set(k, it.trim());
    });
  });

  manualEssentials.forEach(i => {
    const item = essentials[+i];
    if (!item) return;
    const k = norm(item);
    if (!seen.has(k)) seen.set(k, item.trim());
  });

  shoppingItems.innerHTML = "";
  seen.forEach((pretty, key) => {
    if (clearedShopping.has(key)) return;

    const d = document.createElement("div");
    d.className = "shopping-item";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.gap = "8px";
    left.style.cursor = "pointer";
    left.style.alignItems = "center";

    const input = document.createElement("input");
    input.type = "checkbox";
    if (checkedShopping.has(key)) {
      input.checked = true;
      d.classList.add("collected");
    }

    const span = document.createElement("span");
    span.textContent = pretty;

    left.appendChild(input);
    left.appendChild(span);

    left.onclick = () => {
      if (checkedShopping.has(key)) {
        checkedShopping.delete(key);
        input.checked = false;
        d.classList.remove("collected");
      } else {
        checkedShopping.add(key);
        input.checked = true;
        d.classList.add("collected");
      }
      saveShoppingState();
    };

    const del = document.createElement("button");
    del.textContent = "X";
    del.className = "tool-btn";
    del.style.marginLeft = "10px";

    del.onclick = e => {
      e.stopPropagation();
      clearedShopping.add(key);
      saveShoppingState();
      manualEssentials.forEach(i => {
        const item = essentials[+i];
        if (!item) return;
        if (item.toLowerCase() === pretty.toLowerCase()) manualEssentials.delete(i);
      });
      saveManualEssentials();
      renderShoppingList();
    };

    d.appendChild(left);
    d.appendChild(del);
    shoppingItems.appendChild(d);
  });
}

function clearAllShopping() {
  clearedShopping = new Set();
  checkedShopping = new Set();
  saveShoppingState();
  manualSelected = new Set();
  manualEssentials = new Set();
  saveManualSelected();
  saveManualEssentials();
  mirror(["manualSelected","manualEssentials","clearedShopping","checkedShopping"]);
  renderMeals();
  renderShoppingList();
}

/* ===== Navigation ===== */
function nav(p) {
  document.querySelectorAll(".page").forEach(pg => pg.classList.remove("active"));
  const el = document.getElementById(p);
  if (!el) return;
  el.classList.add("active");

  if (p === "planner") renderMeals();
  // removed: if (p === "select") renderManualList();
  if (p === "selectEssentials") renderEssentialSelectList();
  if (p === "essentials") renderEssentials();
  if (p === "shop") renderShoppingList();
}

/* ===== Label normalization (merged) ===== */
function normalizeLabels() {
  Array.from(document.querySelectorAll("button, a, .tool-btn, .btn, input[type=button]")).forEach(el => {
    const t = (el.textContent || el.value || "").trim().toLowerCase();
    if (["add & select essentials","add & select items","add & select","add essentials","add & select items"].includes(t)) {
      if (el.tagName === "INPUT") el.value = "Essentials"; else el.textContent = "Essentials";
    }
    if (t === "add meals") {
      if (el.tagName === "INPUT") el.value = "Main Meals"; else el.textContent = "Main Meals";
    }
  });
}

/* ===== UI ensures consolidated under one observer ===== */
function ensurePlannerControls() {
  const planner = document.getElementById("planner");
  if (!planner) return;
  const addBtn = Array.from(planner.querySelectorAll("button, .btn")).find(el => {
    const t = (el.textContent || el.value || "").trim();
    return /^\+?\s*Add Meal$/i.test(t);
  });
  if (addBtn) styleButton(addBtn);
  // Intentionally do not add a Shopping List button on planner.
}

function ensureInfoBoxes() {
  const planner = document.getElementById("planner");
  if (planner && !planner.querySelector(".slim-info-box")) {
    const mealContainer = planner.querySelector("#mealList, .meals-container");
    const info = createInfoBox("Click on an item below to add or remove in the Shopping List.");
    if (mealContainer && mealContainer.parentElement) mealContainer.parentElement.insertBefore(info, mealContainer);
    else planner.insertBefore(info, planner.firstChild);
  }
  const ess = document.getElementById("selectEssentials") || document.getElementById("essentials");
  if (ess && !ess.querySelector(".slim-info-box")) {
    const essentialsContainer = ess.querySelector("#essentialSelectList, #essentialsList, .essentials-container");
    const info = createInfoBox("Click on an item below to add or remove in the Shopping List.");
    if (essentialsContainer && essentialsContainer.parentElement) essentialsContainer.parentElement.insertBefore(info, essentialsContainer);
    else ess.insertBefore(info, ess.firstChild);
  }
}

/* ===== Single MutationObserver to keep UI in sync ===== */
const uiObserver = new MutationObserver((mutations) => {
  ensurePlannerControls();
  ensureInfoBoxes();
  normalizeLabels();
});

function startObserver() {
  uiObserver.observe(document.documentElement || document.body, { childList: true, subtree: true });
}

/* ===== Init on load ===== */
window.addEventListener("load", () => {
  bindElements();
  normalizeLabels();
  renderMeals();
  // renderManualList removed
  renderEssentials();
  renderEssentialSelectList();
  renderShoppingList();
  mirror(["meals","plan","essentials","manualEssentials","manualSelected","clearedShopping","checkedShopping","planSnapshot"]);
  startObserver();
});