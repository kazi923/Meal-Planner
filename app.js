/* ===== app.js — Full updated file
   - Adds info box to Add & Select Essentials page (id "selectEssentials", fallback "essentials")
   - Recipe items appear inside each meal card, left-aligned, single-line under the meal name (ellipsis if too long)
   - Add & Select Meals button on Shopping List links to planner (Add & Select Meals page)
   - Slim info box placed on Add & Select Meals page (id "planner")
   - Button sizing/color parity and placement preserved
   - Existing meal/essentials/shopping logic retained
*/

/* ===== Immediately remove any stray Select Meals UI and prevent reinsertion ===== */
(function removeSelectMealsForever(){
  function matchesAndRemove(el){
    if(!el || el.nodeType !== 1) return false;
    try {
      if (el.id === "selectMealsBtn") { el.remove(); return true; }
      if ((el.textContent || "").trim() === "Select Meals") { el.remove(); return true; }
    } catch(e){}
    return false;
  }

  Array.from(document.querySelectorAll("button, a, input[type=button]")).forEach(el => matchesAndRemove(el));

  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (matchesAndRemove(node)) return;
        if (node.querySelectorAll) {
          const descendants = node.querySelectorAll("button, a, input[type=button]");
          for (const d of descendants) if (matchesAndRemove(d)) return;
        }
      }
    }
  });
  obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
})();

/* ===== Default data ===== */
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

/* ===== LocalStorage helpers ===== */
const setLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const getLS = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? fallback : JSON.parse(v);
  } catch { return fallback; }
};

/* ===== Mirror helper (stub for external sync) ===== */
function mirror(keys) {
  if (typeof syncStorageToIndexedDB === "function") syncStorageToIndexedDB(keys);
}

/* ===== State (load from storage) ===== */
let meals = getLS("meals", null);
if (!Array.isArray(meals) || meals.length === 0) {
  meals = defaultMeals.slice();
  setLS("meals", meals);
}

let plan = getLS("plan", null);
if (!Array.isArray(plan) || plan.length !== 7) {
  plan = Array(7).fill(null);
  setLS("plan", plan);
}

let essentials = getLS("essentials", null);
if (!Array.isArray(essentials) || essentials.length === 0) {
  essentials = defaultEssentials.slice();
  setLS("essentials", essentials);
}

/* manual selections and shopping state */
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

  const required = ["mealList","mealName","mealItems","shoppingItems"];
  required.forEach(id => {
    if (!document.getElementById(id)) console.warn(`Missing DOM element id="${id}"`);
  });
}

/* ===== Helpers ===== */
const saveManualSelected = () => {
  setLS("manualSelected", [...manualSelected]);
  mirror(["manualSelected"]);
};

const saveManualEssentials = () => {
  setLS("manualEssentials", [...manualEssentials]);
  mirror(["manualEssentials"]);
};

const saveShoppingState = () => {
  setLS("clearedShopping", [...clearedShopping]);
  setLS("checkedShopping", [...checkedShopping]);
  mirror(["clearedShopping","checkedShopping"]);
};

const computePlanSnapshot = () => JSON.stringify(plan.map(p => (p ? p.name + "||" + p.items : null)));

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

/* ===== Navigation ===== */
function nav(p) {
  document.querySelectorAll(".page").forEach(pg => pg.classList.remove("active"));
  const el = document.getElementById(p);
  if (!el) return;
  el.classList.add("active");

  if (p === "planner") renderMeals();
  if (p === "select") renderManualList();
  if (p === "selectEssentials") renderEssentialSelectList();
  if (p === "essentials") renderEssentials();
  if (p === "shop") renderShoppingList();
}

/* ===== Visual helpers: card styling & normalization ===== */
function norm(s) {
  return s ? s.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/s$/, "") : "";
}

function styleCardAsButton(cardEl, variant = "accent") {
  try {
    const root = getComputedStyle(document.documentElement);
    const accent = root.getPropertyValue("--accent").trim() || "#0b76c2";
    const ocean = root.getPropertyValue("--ocean").trim() || "#006994";
    const bg = variant === "ocean" ? ocean : accent;
    cardEl.style.background = bg;
    cardEl.style.color = "#fff";
    cardEl.style.border = "1px solid rgba(0,0,0,0.06)";
    cardEl.style.boxShadow = "0 6px 14px rgba(0,0,0,0.06)";
    cardEl.style.padding = "12px";
    cardEl.style.borderRadius = "10px";
  } catch (e) {
    cardEl.style.background = variant === "ocean" ? "#006994" : "#0b76c2";
    cardEl.style.color = "#fff";
    cardEl.style.borderRadius = "10px";
    cardEl.style.padding = "12px";
  }
}

/* ===== Meals: add / render / edit / delete ===== */
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

/* Render meals: recipe items appear inside the card under the meal name in one line (ellipsis) */
function renderMeals() {
  if (!mealList) return;
  mealList.innerHTML = "";

  meals.forEach((m, x) => {
    const idx = String(x);
    const card = document.createElement("div");
    card.className = "meal-card card";
    styleCardAsButton(card, "accent");

    // selected visual state
    if (manualSelected.has(idx)) {
      card.style.filter = "brightness(0.88)";
      card.style.borderColor = "rgba(0,0,0,0.08)";
    }

    // layout: left area (tick + content) and right controls
    card.style.display = "flex";
    card.style.alignItems = "center";
    card.style.justifyContent = "space-between";
    card.style.gap = "12px";

    // left: tick + content (content stacks title and recipe)
    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "flex-start";
    left.style.gap = "10px";
    left.style.flex = "1";
    left.style.minWidth = "0"; // allow ellipsis

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

    // content container stacks title and recipe
    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.flex = "1";
    content.style.minWidth = "0"; // allow child ellipsis

    const title = document.createElement("div");
    title.textContent = m.name;
    title.style.fontWeight = "700";
    title.style.fontSize = "16px";
    title.style.color = "#fff";
    title.style.whiteSpace = "nowrap";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";

    // recipe line: hidden by default; when visible it sits under the title in one line with ellipsis
    const recipeDiv = document.createElement("div");
    recipeDiv.id = `r${x}`;
    recipeDiv.className = "recipe";
    recipeDiv.style.display = "none"; // toggled by Show Recipe
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

    // right-side controls (Show Recipe toggles recipeDiv display)
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
      // toggle recipe visibility inside the card (one-line)
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

    // clicking the card (outside controls) toggles selection for shopping list
    card.onclick = (e) => {
      if (e.target.closest && e.target.closest(".meal-controls")) return;
      if (manualSelected.has(idx)) manualSelected.delete(idx);
      else manualSelected.add(idx);

      // ensure items reappear in shopping list if previously cleared
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

function toggleRecipe(id) {
  const e = document.getElementById(id);
  if (!e) return;
  e.style.display = e.style.display === "block" ? "none" : "block";
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

/* ===== Essentials: add / render / edit / delete / select ===== */
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
    styleCardAsButton(row, "accent");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.marginBottom = "8px";

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
      // adjust manualEssentials indices
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

/* ===== Updated: renderEssentialSelectList uses circular tick like meals ===== */
function renderEssentialSelectList() {
  if (!essentialSelectList) return;
  essentialSelectList.innerHTML = "";
  essentials.forEach((item, index) => {
    const key = String(index);
    const row = document.createElement("div");
    row.className = "card";
    styleCardAsButton(row, "ocean");
    row.style.marginBottom = "8px";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.padding = "10px 12px";

    // left area: circular tick + label
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

    // right area: small tool buttons
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
      // adjust manualEssentials indices
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

    // clicking the row toggles selection
    row.onclick = (e) => {
      if (e.target.closest && e.target.closest("button")) return;
      if (manualEssentials.has(key)) manualEssentials.delete(key);
      else manualEssentials.add(key);

      // ensure item reappears in shopping list if previously cleared
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

/* ===== Manual meals list (Select Meals page) ===== */
function renderManualList() {
  const box = document.getElementById("manualList");
  if (!box) return;
  box.innerHTML = "";
  meals.forEach((m, i) => {
    const btn = document.createElement("button");
    btn.className = "meal-btn";
    btn.textContent = m.name;
    if (manualSelected.has(String(i))) btn.classList.add("selected");
    btn.onclick = () => {
      if (manualSelected.has(String(i))) manualSelected.delete(String(i));
      else manualSelected.add(String(i));
      saveManualSelected();
      renderManualList();
      renderShoppingList();
    };
    box.appendChild(btn);
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
      // remove matching manualEssentials entries
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

/* ===== Home button rename (scoped) ===== */
function renameHomeAddButtonScoped() {
  const candidates = Array.from(document.querySelectorAll("button, a, input[type=button]"));
  function renameIfOutside(originalText, newText, anchorSelectors) {
    for (const el of candidates) {
      const txt = (el.textContent || el.value || "").trim();
      if (txt !== originalText) continue;
      try {
        const page = el.closest(".page") || el.closest("body");
        if (page) {
          for (const sel of anchorSelectors) {
            if (page.querySelector(sel)) throw "inside";
          }
        }
      } catch (e) { if (e === "inside") continue; }
      if (el.tagName === "INPUT") el.value = newText;
      else el.textContent = newText;
      break;
    }
  }
  renameIfOutside("Add Meals", "Add & Select Meals", ["#mealList", "#mealName"]);
  renameIfOutside("Add Essentials", "Add & Select Items", ["#essentialSelectList", "#essentialItem"]);
}

/* ===== ensurePlannerHasGoButton (match Add button position & size) ===== */
(function ensurePlannerHasGoButton() {
  const GO_LABEL = "Go to Shopping List";
  const WRAPPER_CLASS = "add-meal-controls-centered";

  function createGoButton() {
    const btn = document.createElement("button");
    btn.className = "go-to-shop-btn tool-btn";
    btn.type = "button";
    btn.textContent = GO_LABEL;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      try { if (typeof nav === "function") nav("shop"); else window.location.hash = "#shop"; }
      catch (err) { console.error("Go to Shopping List navigation failed", err); }
    });
    return btn;
  }

  function styleAddButton(addBtn) {
    try {
      addBtn.style.background = "var(--accent, #0b76c2)";
      addBtn.style.color = "#fff";
      addBtn.style.border = "1px solid rgba(0,0,0,0.06)";
      addBtn.style.boxShadow = "0 6px 14px rgba(11,118,194,0.12)";
      addBtn.style.padding = "12px 18px";
      addBtn.style.borderRadius = "10px";
      addBtn.style.fontSize = "15px";
      addBtn.style.fontWeight = "700";
      addBtn.style.cursor = "pointer";
      addBtn.style.display = "inline-block";
      addBtn.style.textAlign = "center";
      addBtn.style.float = "none";
      addBtn.style.margin = "0";
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
      styleAddButton(toBtn);
    }
  }

  function findAddMealButton() {
    const planner = document.getElementById("planner");
    if (!planner) return null;
    const candidates = Array.from(planner.querySelectorAll("button, .btn"));
    return candidates.find(el => {
      const t = (el.textContent || el.value || "").trim();
      return /^\+?\s*Add Meal$/i.test(t);
    }) || null;
  }

  function insertControls(addBtn) {
    if (!addBtn || !addBtn.closest) return false;
    const planner = document.getElementById("planner") || addBtn.closest(".page") || document.body;

    let wrapper = planner.querySelector(`.${WRAPPER_CLASS}`);
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = WRAPPER_CLASS;
      wrapper.style.display = "flex";
      wrapper.style.justifyContent = "center";
      wrapper.style.alignItems = "center";
      wrapper.style.gap = "12px";
      wrapper.style.width = "100%";
      wrapper.style.boxSizing = "border-box";
      wrapper.style.margin = "12px 0";
    }

    const inputsBlock = planner.querySelector(".inputs");
    if (inputsBlock && inputsBlock.parentElement) {
      if (inputsBlock.nextSibling !== wrapper) {
        if (wrapper.parentElement) wrapper.parentElement.removeChild(wrapper);
        if (inputsBlock.nextSibling) inputsBlock.parentElement.insertBefore(wrapper, inputsBlock.nextSibling);
        else inputsBlock.parentElement.appendChild(wrapper);
      }
    } else {
      if (!planner.firstChild || planner.firstChild === wrapper) planner.appendChild(wrapper);
      else planner.insertBefore(wrapper, planner.firstChild);
    }

    if (addBtn.parentElement !== wrapper) wrapper.appendChild(addBtn);

    let goBtn = wrapper.querySelector(".go-to-shop-btn");
    if (!goBtn) {
      goBtn = createGoButton();
      wrapper.appendChild(goBtn);
    }

    styleAddButton(addBtn);
    copySizing(addBtn, goBtn);

    try {
      const cs = window.getComputedStyle(addBtn);
      goBtn.style.background = cs.getPropertyValue("background-color") || addBtn.style.background;
      goBtn.style.color = cs.getPropertyValue("color") || addBtn.style.color;
      goBtn.style.border = cs.getPropertyValue("border") || addBtn.style.border;
      goBtn.style.boxShadow = cs.getPropertyValue("box-shadow") || addBtn.style.boxShadow;
    } catch (e) {}

    return true;
  }

  const addBtn = findAddMealButton();
  if (addBtn) insertControls(addBtn);

  const observer = new MutationObserver(() => {
    const add = findAddMealButton();
    if (add) insertControls(add);
  });
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
})();

/* ===== Insert Add & Select Meals button on Shopping List page, match Add & Select Essentials button exactly, place under Home button ===== */
(function ensureShopHasAddSelectMealsButton() {
  const SHOP_PAGE_ID = "shop";
  const ESSENTIALS_SELECTOR = "#essentialSelectList, #essentialsList";
  const BTN_CLASS = "add-select-meals-btn";

  function createButton() {
    const btn = document.createElement("button");
    btn.className = BTN_CLASS + " tool-btn";
    btn.type = "button";
    btn.textContent = "Add & Select Meals";
    // base styling (will be overridden by copySizing if reference found)
    try {
      btn.style.background = "var(--accent, #0b76c2)";
      btn.style.color = "#fff";
      btn.style.border = "1px solid rgba(0,0,0,0.06)";
      btn.style.boxShadow = "0 6px 14px rgba(11,118,194,0.12)";
      btn.style.padding = "10px 14px";
      btn.style.borderRadius = "10px";
      btn.style.fontSize = "15px";
      btn.style.fontWeight = "700";
      btn.style.cursor = "pointer";
      btn.style.display = "block";
      btn.style.width = "100%";
      btn.style.boxSizing = "border-box";
      btn.style.margin = "8px 0";
    } catch (e) {}

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      try {
        // PREFER the Add & Select Meals page (planner) — do not link to the legacy Select page
        if (typeof nav === "function") {
          if (document.getElementById("planner")) nav("planner");
          else if (document.getElementById("select")) nav("select");
          else nav("planner");
        } else {
          if (document.getElementById("planner")) window.location.hash = "#planner";
          else if (document.getElementById("select")) window.location.hash = "#select";
          else window.location.hash = "#planner";
        }
      } catch (err) {
        console.error("Navigation to Add & Select Meals failed", err);
      }
    });

    return btn;
  }

  function copySizingAndVisuals(fromBtn, toBtn) {
    if (!fromBtn || !toBtn) return;
    // properties to copy to ensure exact parity
    const props = [
      "display", "width", "min-width", "max-width", "height", "min-height", "max-height",
      "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
      "font-size", "font-weight", "border-radius", "box-sizing", "line-height",
      "margin", "background-color", "color", "border", "box-shadow", "text-align"
    ];
    try {
      const cs = window.getComputedStyle(fromBtn);
      props.forEach(p => {
        const v = cs.getPropertyValue(p);
        if (v) toBtn.style.setProperty(p, v);
      });
      // ensure exact pixel width if computed
      const computedWidth = cs.getPropertyValue("width");
      if (computedWidth && computedWidth !== "auto") toBtn.style.width = computedWidth;
      // ensure same display
      const display = cs.getPropertyValue("display");
      if (display) toBtn.style.display = display;
      // ensure box-sizing parity
      const box = cs.getPropertyValue("box-sizing");
      if (box) toBtn.style.boxSizing = box;
    } catch (e) {
      // fallback minimal styling
      try {
        toBtn.style.padding = "10px 14px";
        toBtn.style.fontSize = "15px";
        toBtn.style.borderRadius = "10px";
        toBtn.style.width = "100%";
        toBtn.style.boxSizing = "border-box";
      } catch (err) {}
    }
  }

  function findEssentialsButton(shop) {
    if (!shop) return null;
    // 1) exact text match candidates
    const textCandidates = Array.from(shop.querySelectorAll("button, .tool-btn, .btn")).filter(el => {
      const t = (el.textContent || el.value || "").trim().toLowerCase();
      return t === "add & select essentials" || t === "add & select items" || t === "add & select";
    });
    if (textCandidates.length) return textCandidates[0];

    // 2) fuzzy text match
    const fuzzy = Array.from(shop.querySelectorAll("button, .tool-btn, .btn")).find(el => {
      const t = (el.textContent || el.value || "").trim().toLowerCase();
      return /\b(add|select|essentials|items)\b/.test(t) && t.length < 40;
    });
    if (fuzzy) return fuzzy;

    // 3) fallback: first visible prominent button near essentials area
    const candidates = Array.from(shop.querySelectorAll("button, .tool-btn, .btn"));
    const visible = candidates.find(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 40 && rect.height > 24;
    });
    return visible || null;
  }

  function findHomeButton(shop) {
    if (!shop) return null;
    const byClass = shop.querySelector(".home-btn, #homeBtn, #home");
    if (byClass) return byClass;
    const byText = Array.from(shop.querySelectorAll("button, a")).find(el => {
      const t = (el.textContent || el.value || "").trim().toLowerCase();
      return t === "home" || t === "home page" || t === "back home";
    });
    if (byText) return byText;
    const candidates = Array.from(shop.querySelectorAll("button, a")).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20;
    });
    return candidates.length ? candidates[0] : null;
  }

  function insertButton() {
    const shop = document.getElementById(SHOP_PAGE_ID);
    if (!shop) return false;

    // avoid duplicate button
    if (shop.querySelector(`.${BTN_CLASS}`)) return true;

    const btn = createButton();

    // find the Add & Select Essentials button to copy sizing from
    const essentialsBtn = findEssentialsButton(shop);
    if (essentialsBtn) {
      copySizingAndVisuals(essentialsBtn, btn);
    }

    // find Home button and insert under it; otherwise insert above essentials or at top
    const homeBtn = findHomeButton(shop);
    if (homeBtn && homeBtn.parentElement) {
      // insert after the home button
      if (homeBtn.nextSibling) homeBtn.parentElement.insertBefore(btn, homeBtn.nextSibling);
      else homeBtn.parentElement.appendChild(btn);
      return true;
    }

    const target = shop.querySelector(ESSENTIALS_SELECTOR);
    const container = target || shop.querySelector(".essentials-container") || shop;
    container.insertBefore(btn, target || container.firstChild);
    return true;
  }

  // initial attempt
  insertButton();

  // keep it present if the page updates dynamically
  const observer = new MutationObserver(() => insertButton());
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
})();

/* ===== Insert slim info box on Add & Select Meals page only (id "planner") ===== */
(function ensureMealsInfoBoxOnPlannerOnly() {
  const TARGET_ID = "planner";
  const INFO_CLASS = "meals-info-box";
  const INFO_TEXT = "Click on an item below to add or remove in the Shopping List.";

  function createInfoBox() {
    const box = document.createElement("div");
    box.className = INFO_CLASS;
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
    box.textContent = INFO_TEXT;
    return box;
  }

  function findButtonsBlock(pageEl) {
    const candidates = Array.from(pageEl.querySelectorAll("div, section, header"));
    for (const c of candidates) {
      const btns = c.querySelectorAll("button, a, .tool-btn, .btn");
      if (btns.length >= 2) return c;
    }
    return pageEl;
  }

  function insertInfo() {
    const targetPage = document.getElementById(TARGET_ID);
    if (!targetPage) return false;

    if (targetPage.querySelector(`.${INFO_CLASS}`)) return true;

    const buttonsBlock = findButtonsBlock(targetPage);
    const info = createInfoBox();

    if (buttonsBlock && buttonsBlock !== targetPage) {
      if (buttonsBlock.nextSibling) buttonsBlock.parentElement.insertBefore(info, buttonsBlock.nextSibling);
      else buttonsBlock.parentElement.appendChild(info);
      return true;
    }

    const mealContainer = targetPage.querySelector("#mealList, #manualList, .meals-container");
    if (mealContainer && mealContainer.parentElement) {
      mealContainer.parentElement.insertBefore(info, mealContainer);
      return true;
    }

    targetPage.insertBefore(info, targetPage.firstChild);
    return true;
  }

  // initial attempt
  insertInfo();

  // keep it present if the page updates dynamically
  const observer = new MutationObserver(() => insertInfo());
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
})();

/* ===== Insert slim info box on Add & Select Essentials page (id "selectEssentials", fallback "essentials") ===== */
(function ensureEssentialsInfoBox() {
  const TARGET_IDS = ["selectEssentials", "essentials"];
  const INFO_CLASS = "essentials-info-box";
  const INFO_TEXT = "Click on an item below to add or remove in the Shopping List.";

  function createInfoBox() {
    const box = document.createElement("div");
    box.className = INFO_CLASS;
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
    box.textContent = INFO_TEXT;
    return box;
  }

  function findButtonsBlock(pageEl) {
    const candidates = Array.from(pageEl.querySelectorAll("div, section, header"));
    for (const c of candidates) {
      const btns = c.querySelectorAll("button, a, .tool-btn, .btn");
      if (btns.length >= 2) return c;
    }
    return pageEl;
  }

  function insertInfo() {
    let targetPage = null;
    for (const id of TARGET_IDS) {
      const el = document.getElementById(id);
      if (el) { targetPage = el; break; }
    }
    if (!targetPage) return false;

    // avoid duplicate
    if (targetPage.querySelector(`.${INFO_CLASS}`)) return true;

    const buttonsBlock = findButtonsBlock(targetPage);
    const info = createInfoBox();

    // Insert after the buttons block if possible, otherwise before the essentials list
    if (buttonsBlock && buttonsBlock !== targetPage) {
      if (buttonsBlock.nextSibling) buttonsBlock.parentElement.insertBefore(info, buttonsBlock.nextSibling);
      else buttonsBlock.parentElement.appendChild(info);
      return true;
    }

    // fallback: insert above essentialSelectList or essentialsList if present
    const essentialsContainer = targetPage.querySelector("#essentialSelectList, #essentialsList, .essentials-container");
    if (essentialsContainer && essentialsContainer.parentElement) {
      essentialsContainer.parentElement.insertBefore(info, essentialsContainer);
      return true;
    }

    // final fallback: append to top of targetPage
    targetPage.insertBefore(info, targetPage.firstChild);
    return true;
  }

  // initial attempt
  insertInfo();

  // keep it present if the page updates dynamically
  const observer = new MutationObserver(() => insertInfo());
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
})();

/* ===== Init on load ===== */
window.onload = () => {
  bindElements();
  renameHomeAddButtonScoped();
  renderMeals();
  renderManualList();
  renderEssentials();
  renderEssentialSelectList();
  renderShoppingList();
  mirror(["meals","plan","essentials","manualEssentials","manualSelected","clearedShopping","checkedShopping","planSnapshot"]);
};