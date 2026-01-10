/* ===== app.js — Select Meals removed; helper bubble strictly placed only on Add Meals page ===== */

/* ===== Immediately remove any Select Meals UI and prevent reinsertion ===== */
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

/* ===== Init ===== */
const defaultMeals = [
  { name: "Spaghetti Bolognese", items: "Pasta, Minced Beef, Tomato Sauce, Garlic, Onion" },
  { name: "Grilled Salmon", items: "Salmon Fillet, Lemon, Olive Oil, Herbs" },
  { name: "Chicken Curry", items: "Chicken, Curry Paste, Coconut Milk, Rice" },
  { name: "Vegetable Stir Fry", items: "Broccoli, Carrots, Peppers, Soy Sauce, Noodles" },
  { name: "Beef Tacos", items: "Taco Shells, Beef, Lettuce, Tomato, Cheese" },
  { name: "Margherita Pizza", items: "Pizza Base, Tomato Sauce, Mozzarella, Basil" },
  { name: "Shepherd's Pie", items: "Minced Lamb, Potatoes, Carrots, Peas, Gravy" },
  { name: "Lamb Steaks with Chips and peas", items: "Lamb Steaks, Chips, Peas, Gravy" }
];

/* --- LocalStorage helpers --- */
const setLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const getLS = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
};

/* --- Mirror helper (centralized) --- */
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

let manualSelected = new Set(getLS("manualSelected", []));
let clearedShopping = new Set(getLS("clearedShopping", []));
let checkedShopping = new Set(getLS("checkedShopping", []));
let planSnapshot = localStorage.getItem("planSnapshot") || null;

let essentials = getLS("essentials", null);
if (!Array.isArray(essentials) || essentials.length === 0) {
  essentials = [
    "Milk","Toilet roll","Coffee","Sugar","Cereal","Bread","Butter",
    "Toothpaste","Peanut Butter","Biscuits","Chocolate Buttons",
    "Cheese","Ham","Red Sauce","Brown Sauce","BBQ Sauce",
    "Bananas","Grapes","Shampoo","Soap","Conditioner",
    "Crisps","Protein Bars","Orange Juice","Blackcurrant Juice"
  ];
  setLS("essentials", essentials);
}

let manualEssentials = new Set(getLS("manualEssentials", []));

/* ===== DOM bindings (safe) ===== */
let mealList, mealName, mealItems, essentialsList, essentialSelectList, shoppingItems;
function bindElements() {
  mealList = document.getElementById("mealList");
  mealName = document.getElementById("mealName");
  mealItems = document.getElementById("mealItems");
  essentialsList = document.getElementById("essentialsList");
  essentialSelectList = document.getElementById("essentialSelectList");
  shoppingItems = document.getElementById("shoppingItems");

  const required = ["mealList","mealName","mealItems","essentialsList","essentialSelectList","shoppingItems"];
  required.forEach(id => {
    if (!document.getElementById(id)) console.warn(`Missing DOM element id="${id}"`);
  });
}

/* ===== Helpers ===== */
const saveManualSelected = () => {
  setLS("manualSelected", [...manualSelected]);
  mirror(["manualSelected"]);
};

const saveShoppingState = () => {
  setLS("clearedShopping", [...clearedShopping]);
  setLS("checkedShopping", [...checkedShopping]);
  mirror(["clearedShopping", "checkedShopping"]);
};

const computePlanSnapshot = () => JSON.stringify(plan.map(p => (p ? p.name + "||" + p.items : null)));

function save() {
  setLS("meals", meals);
  setLS("plan", plan);
  setLS("essentials", essentials);
  setLS("manualEssentials", [...manualEssentials]);

  const snap = computePlanSnapshot();
  if (snap !== planSnapshot) {
    planSnapshot = snap;
    localStorage.setItem("planSnapshot", snap);
    clearedShopping = new Set();
    checkedShopping = new Set();
    saveShoppingState();
  }

  mirror(["meals", "plan", "essentials", "manualEssentials", "planSnapshot"]);

  const shopEl = document.getElementById("shop");
  if (shopEl && shopEl.classList.contains("active")) renderShoppingList();
}

/* ===== Navigation simplified (Select page removed) ===== */
function nav(p) {
  document.querySelectorAll(".page").forEach(pg => pg.classList.remove("active"));
  const el = document.getElementById(p);
  if (!el) return;
  el.classList.add("active");

  if (p === "planner") renderMeals();
  if (p === "essentials") renderEssentials();
  if (p === "selectEssentials") renderEssentialSelectList();
  if (p === "shop") renderShoppingList();
}

/* ===== escapeHtml ===== */
const escapeHtml = s =>
  s ? s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;") : "";

/* ===== Meals ===== */
function addMeal() {
  const n = (mealName && mealName.value || "").trim();
  const i = (mealItems && mealItems.value || "").trim();
  if (!n || !i) return alert("Enter meal name and items");
  meals.push({ name: n, items: i });
  save();
  renderMeals();
  renderShoppingList();
  if (mealName) mealName.value = "";
  if (mealItems) mealItems.value = "";
}

/* ===== renderMeals: selectable meal cards ===== */
function renderMeals() {
  if (!mealList) return;
  mealList.innerHTML = "";

  meals.forEach((m, x) => {
    const idx = String(x);
    const card = document.createElement("div");
    card.className = "meal-card card";
    if (manualSelected.has(idx)) card.classList.add("selected");

    card.onclick = () => {
      if (manualSelected.has(idx)) manualSelected.delete(idx);
      else manualSelected.add(idx);

      m.items.split(",").forEach(it => clearedShopping.delete(norm(it)));
      saveManualSelected();
      saveShoppingState();
      renderMeals();
      renderShoppingList();
    };

    const left = document.createElement("div");
    left.style.flex = "1";
    left.style.display = "flex";
    left.style.flexDirection = "column";
    left.style.gap = "6px";
    left.style.alignItems = "flex-start";

    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.alignItems = "center";
    titleRow.style.gap = "8px";

    const checkBadge = document.createElement("div");
    checkBadge.className = "check-badge";
    checkBadge.style.width = "28px";
    checkBadge.style.height = "28px";
    checkBadge.style.borderRadius = "50%";
    checkBadge.style.display = "inline-flex";
    checkBadge.style.alignItems = "center";
    checkBadge.style.justifyContent = "center";
    checkBadge.style.fontWeight = "700";
    checkBadge.style.color = "#fff";
    checkBadge.style.background = "rgba(255,255,255,0.15)";
    checkBadge.style.border = "2px solid rgba(255,255,255,0.12)";
    checkBadge.textContent = manualSelected.has(idx) ? "✓" : "";

    if (manualSelected.has(idx)) {
      checkBadge.style.background = "var(--ocean, #006994)";
      checkBadge.style.borderColor = "rgba(0,0,0,0.06)";
    }

    const title = document.createElement("div");
    title.textContent = m.name;
    title.style.fontWeight = "700";
    title.style.fontSize = "16px";
    title.style.cursor = "pointer";

    titleRow.appendChild(checkBadge);
    titleRow.appendChild(title);
    left.appendChild(titleRow);

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "8px";
    controls.style.alignItems = "center";

    const showBtn = document.createElement("button");
    showBtn.className = "tool-btn";
    showBtn.textContent = "Show Recipe";
    showBtn.style.background = "var(--ocean, #006994)";
    showBtn.style.color = "#fff";
    showBtn.style.border = "none";
    showBtn.style.padding = "6px 8px";
    showBtn.style.borderRadius = "6px";
    showBtn.onclick = (e) => {
      e.stopPropagation();
      toggleRecipe(`r${x}`);
    };

    const editBtn = document.createElement("button");
    editBtn.className = "tool-btn";
    editBtn.textContent = "Edit";
    editBtn.style.padding = "6px 8px";
    editBtn.style.borderRadius = "6px";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      editMeal(x);
    };

    const delBtn = document.createElement("button");
    delBtn.className = "tool-btn";
    delBtn.textContent = "Delete";
    delBtn.style.padding = "6px 8px";
    delBtn.style.borderRadius = "6px";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      deleteMeal(x);
    };

    controls.appendChild(showBtn);
    controls.appendChild(editBtn);
    controls.appendChild(delBtn);

    const recipeDiv = document.createElement("div");
    recipeDiv.id = `r${x}`;
    recipeDiv.className = "recipe";
    recipeDiv.style.display = "none";
    recipeDiv.style.marginTop = "8px";
    recipeDiv.textContent = m.items;

    card.appendChild(left);
    card.appendChild(controls);
    card.appendChild(recipeDiv);
    mealList.appendChild(card);
  });
}

const toggleRecipe = id => {
  const e = document.getElementById(id);
  if (!e) return;
  e.style.display = e.style.display === "block" ? "none" : "block";
};

function editMeal(i) {
  const m = meals[i];
  if (!m) return;
  const n = prompt("Edit meal name:", m.name);
  if (n === null) return;
  const it = prompt("Edit recipe items:", m.items);
  if (it === null) return;
  meals[i] = { name: n.trim(), items: it.trim() };
  save();
  renderMeals();
  renderShoppingList();
}

function deleteMeal(i) {
  const m = meals[i];
  if (!m) return;
  if (!confirm(`Delete "${m.name}"?`)) return;
  meals.splice(i, 1);
  save();
  renderMeals();
  renderShoppingList();
}

/* ===== Essentials ===== */
function addEssential() {
  const itemEl = document.getElementById("essentialItem");
  const item = (itemEl && itemEl.value || "").trim();
  if (!item) return alert("Enter an item");

  essentials.push(item);
  setLS("essentials", essentials);
  mirror(["essentials"]);

  renderEssentials();
  if (itemEl) itemEl.value = "";
}

function renderEssentials() {
  const box = document.getElementById("essentialsList");
  if (!box) return;
  box.innerHTML = "";

  essentials.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "card";
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";

    const label = document.createElement("div");
    label.textContent = item;
    label.style.fontWeight = "600";
    label.style.padding = "8px 0";

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.className = "tool-btn";

    del.onclick = () => {
      essentials.splice(index, 1);
      setLS("essentials", essentials);
      mirror(["essentials"]);
      renderEssentials();
    };

    row.appendChild(label);
    row.appendChild(del);
    box.appendChild(row);
  });
}

/* ===== Select Essentials ===== */
function renderEssentialSelectList() {
  const box = document.getElementById("essentialSelectList");
  if (!box) return;
  box.innerHTML = "";

  essentials.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "card";

    const btn = document.createElement("button");
    btn.className = "meal-btn";
    btn.textContent = item;

    if (manualEssentials.has(String(index))) btn.classList.add("selected");

    btn.onclick = () => {
      const key = String(index);
      clearedShopping.delete(norm(item));
      saveShoppingState();

      if (manualEssentials.has(key)) manualEssentials.delete(key);
      else manualEssentials.add(key);

      setLS("manualEssentials", [...manualEssentials]);
      mirror(["manualEssentials"]);

      renderEssentialSelectList();
      renderShoppingList();
    };

    row.appendChild(btn);
    box.appendChild(row);
  });
}

/* ===== Shopping List ===== */
function norm(s) {
  return s ? s.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/s$/, "") : "";
}

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

      setLS("manualEssentials", [...manualEssentials]);
      mirror(["manualEssentials", "clearedShopping", "checkedShopping"]);

      renderEssentials();
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
  setLS("manualEssentials", []);
  mirror(["manualSelected", "manualEssentials", "clearedShopping", "checkedShopping"]);
  renderMeals();
  renderEssentials();
  renderShoppingList();
}

/* ===== Home button rename (scoped) =====
   Renames "Add Meals" to "Add & Select Meals" only for buttons outside Add Meals area.
*/
function renameHomeAddButtonScoped() {
  const candidates = Array.from(document.querySelectorAll("button, a, input[type=button]"));
  for (const el of candidates) {
    const txt = (el.textContent || el.value || "").trim();
    if (txt !== "Add Meals") continue;

    try {
      const page = el.closest(".page") || el.closest("body");
      if (page && (page.querySelector("#mealList") || page.querySelector("#mealName"))) continue;
    } catch (e) {}

    if (el.tagName === "INPUT") el.value = "Add & Select Meals";
    else el.textContent = "Add & Select Meals";
    break;
  }
}

/* ===== Strict helper bubble insertion: only inside Add Meals page/container ===== */
(function ensureAddMealHelper_StrictBubble() {
  const HELPER_CLASS = "add-meal-helper";
  const HELPER_TEXT = "Click on a meal below to add or remove in the Shopping List";

  function createBubbleElement() {
    const helper = document.createElement("div");
    helper.className = HELPER_CLASS;
    helper.textContent = HELPER_TEXT;
    // Inline bubble styling matched to button color (uses CSS variable if available)
    helper.style.display = "block";
    helper.style.margin = "8px auto 0 auto";
    helper.style.padding = "6px 12px";
    helper.style.borderRadius = "18px";
    helper.style.background = "var(--accent, #0b76c2)"; // match accent color
    helper.style.border = "1px solid rgba(0,0,0,0.06)";
    helper.style.boxShadow = "0 6px 14px rgba(11,118,194,0.12)";
    helper.style.maxWidth = "92%";
    helper.style.textAlign = "center";
    helper.style.fontSize = "13px";
    helper.style.color = "#fff"; // white text to match buttons
    helper.style.lineHeight = "1.2";
    helper.style.wordBreak = "break-word";
    return helper;
  }

  function insertBubble(addBtn) {
    if (!addBtn || !addBtn.parentElement) return false;
    // avoid duplicates
    if (addBtn.parentElement.querySelector(`.${HELPER_CLASS}`)) return true;
    const bubble = createBubbleElement();
    if (addBtn.nextSibling) addBtn.parentElement.insertBefore(bubble, addBtn.nextSibling);
    else addBtn.parentElement.appendChild(bubble);
    return true;
  }

  function isInsideAddMealsArea(el) {
    try {
      const page = el.closest(".page") || el.closest("body");
      if (!page) return false;
      return !!(page.querySelector("#mealList") || page.querySelector("#mealName"));
    } catch (e) { return false; }
  }

  function findAddButtonInAddMealsArea() {
    const candidates = Array.from(document.querySelectorAll("button, input[type=button], a"));
    const addCandidates = candidates.filter(el => {
      const t = (el.textContent || el.value || "").trim();
      return /^(?:\+?\s*Add Meal|Add Meals|Add)$/i.test(t);
    });
    return addCandidates.find(b => isInsideAddMealsArea(b)) || null;
  }

  // Try immediate insertion
  const btn = findAddButtonInAddMealsArea();
  if (btn) insertBubble(btn);

  // Observe DOM for dynamic insertion and insert only when the button is inside Add Meals area
  const observer = new MutationObserver(muts => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (/button|a|input/i.test(node.tagName)) {
          const t = (node.textContent || node.value || "").trim();
          if (/^(?:\+?\s*Add Meal|Add Meals|Add)$/i.test(t) && isInsideAddMealsArea(node)) {
            if (insertBubble(node)) return;
          }
        }
        const descendants = node.querySelectorAll ? node.querySelectorAll("button, a, input[type=button]") : [];
        for (const d of descendants) {
          const t = (d.textContent || d.value || "").trim();
          if (/^(?:\+?\s*Add Meal|Add Meals|Add)$/i.test(t) && isInsideAddMealsArea(d)) {
            if (insertBubble(d)) return;
          }
        }
      }
    }
  });

  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
})();

/* ===== Init on load ===== */
window.onload = () => {
  bindElements();
  // scoped rename for Home button (won't affect Add Meals area)
  renameHomeAddButtonScoped();
  // strict bubble insertion runs independently and will place helper only in Add Meals area
  renderMeals();
  renderEssentials();
  renderEssentialSelectList();
  renderShoppingList();

  mirror([
    "meals","plan","essentials","manualEssentials","manualSelected",
    "clearedShopping","checkedShopping","planSnapshot"
  ]);
};