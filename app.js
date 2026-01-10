/* ===== app.js — Select Essentials page removed; Essentials page remains fully functional ===== */

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

/* manualEssentials remains in state for shopping list logic even though the Select Essentials page is removed */
let manualEssentials = new Set(getLS("manualEssentials", []));

/* ===== DOM bindings (safe) ===== */
let mealList, mealName, mealItems, essentialsList, shoppingItems;
function bindElements() {
  mealList = document.getElementById("mealList");
  mealName = document.getElementById("mealName");
  mealItems = document.getElementById("mealItems");
  essentialsList = document.getElementById("essentialsList");
  shoppingItems = document.getElementById("shoppingItems");

  const required = ["mealList","mealName","mealItems","essentialsList","shoppingItems"];
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

/* ===== Edit essential item ===== */
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
  renderShoppingList();
}

/* ===== renderEssentials: each item has Edit and Delete ===== */
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

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "8px";
    controls.style.alignItems = "center";

    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.className = "tool-btn";
    edit.onclick = () => {
      editEssential(index);
    };

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.className = "tool-btn";

    del.onclick = () => {
      // If deleting, also clear any manualEssentials references and update storage
      essentials.splice(index, 1);
      setLS("essentials", essentials);
      mirror(["essentials"]);

      // Remove any manualEssentials entries that referenced this item index
      const newManual = new Set();
      manualEssentials.forEach(i => {
        const iNum = Number(i);
        if (iNum < index) newManual.add(String(iNum));
        else if (iNum > index) newManual.add(String(iNum - 1));
      });
      manualEssentials = newManual;
      setLS("manualEssentials", [...manualEssentials]);
      mirror(["manualEssentials"]);

      renderEssentials();
      renderShoppingList();
    };

    controls.appendChild(edit);
    controls.appendChild(del);

    row.appendChild(label);
    row.appendChild(controls);
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

  // manualEssentials still contributes to the shopping list even though the Select Essentials page is removed
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

      // If a manual essential matched this item, remove it
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
   Adjusted to avoid referencing the removed Select Essentials page.
*/
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
      } catch (e) {
        if (e === "inside") continue;
      }

      if (el.tagName === "INPUT") el.value = newText;
      else el.textContent = newText;
      break;
    }
  }

  // Rename Add Meals on home/global areas (skip if inside Add Meals page)
  renameIfOutside("Add Meals", "Add & Select Meals", ["#mealList", "#mealName"]);

  // Rename Add Essentials on home/global areas (skip if inside Add Essentials page)
  renameIfOutside("Add Essentials", "Add & Select Items", ["#essentialsList", "#essentialItem"]);
}

/* ===== Helper bubble insertion for Add Meals page =====
   Ensures the small helper bubble is inserted after the centered button group (below both buttons).
*/
(function ensureAddMealHelper_StrictBubble() {
  const HELPER_CLASS = "add-meal-helper";
  const HELPER_TEXT = "Click on a meal below to add or remove in the Shopping List";

  function createBubbleElement() {
    const helper = document.createElement("div");
    helper.className = HELPER_CLASS;
    helper.textContent = HELPER_TEXT;
    helper.style.display = "block";
    helper.style.margin = "10px auto 0 auto";
    helper.style.padding = "8px 14px";
    helper.style.borderRadius = "18px";
    helper.style.background = "var(--accent, #0b76c2)";
    helper.style.border = "1px solid rgba(0,0,0,0.06)";
    helper.style.boxShadow = "0 6px 14px rgba(11,118,194,0.12)";
    helper.style.maxWidth = "92%";
    helper.style.textAlign = "center";
    helper.style.fontSize = "13px";
    helper.style.color = "#fff";
    helper.style.lineHeight = "1.2";
    helper.style.wordBreak = "break-word";
    return helper;
  }

  function findButtonsContainer(addBtn) {
    if (!addBtn) return null;
    let node = addBtn.parentElement;
    while (node && node !== document.body) {
      const hasGo = Array.from(node.querySelectorAll("button, a, input[type=button]")).some(el => {
        const t = (el.textContent || el.value || "").trim();
        return /^Go to Shopping List$/i.test(t);
      });
      if (hasGo) return node;
      node = node.parentElement;
    }
    return null;
  }

  function insertBubble(addBtn) {
    if (!addBtn || !addBtn.parentElement) return false;
    if (document.querySelector(`.${HELPER_CLASS}`)) return true;

    const bubble = createBubbleElement();
    const container = findButtonsContainer(addBtn);
    if (container && container.parentElement) {
      if (container.nextSibling) container.parentElement.insertBefore(bubble, container.nextSibling);
      else container.parentElement.appendChild(bubble);
      return true;
    }

    const next = addBtn.nextElementSibling;
    if (next && /^Go to Shopping List$/i.test((next.textContent || next.value || "").trim())) {
      if (next.nextSibling) addBtn.parentElement.insertBefore(bubble, next.nextSibling);
      else addBtn.parentElement.appendChild(bubble);
      return true;
    }

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
      return /^(?:\+?\s*Add Meal|Add Meal|Add Meals|Add)$/i.test(t);
    });
    return addCandidates.find(b => isInsideAddMealsArea(b)) || null;
  }

  const btn = findAddButtonInAddMealsArea();
  if (btn) insertBubble(btn);

  const observer = new MutationObserver(muts => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (/button|a|input/i.test(node.tagName)) {
          const t = (node.textContent || node.value || "").trim();
          if (/^(?:\+?\s*Add Meal|Add Meal|Add Meals|Add)$/i.test(t) && isInsideAddMealsArea(node)) {
            if (insertBubble(node)) return;
          }
        }
        const descendants = node.querySelectorAll ? node.querySelectorAll("button, a, input[type=button]") : [];
        for (const d of descendants) {
          const t = (d.textContent || d.value || "").trim();
          if (/^(?:\+?\s*Add Meal|Add Meal|Add Meals|Add)$/i.test(t) && isInsideAddMealsArea(d)) {
            if (insertBubble(d)) return;
          }
        }
      }
    }
  });

  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
})();

/* ===== Centered Add Meal + Go to Shopping List controls on Meal Planner (header at top) =====
   Places the "Meal Planner" header at the very top of the planner container,
   removes duplicate planner title instances, and centers the Add controls below it.
*/
(function ensureHeaderAtTopAndCenteredControls() {
  const GO_CLASS = "go-to-shop-btn";
  const WRAPPER_CLASS = "add-meal-controls-centered";
  const GO_LABEL = "Go to Shopping List";
  const HEADER_TEXT = "Meal Planner";
  const HEADER_CLASS = "planner-title-top";

  function createGoButton() {
    const btn = document.createElement("button");
    btn.className = GO_CLASS + " tool-btn";
    btn.type = "button";
    btn.textContent = GO_LABEL;
    btn.style.background = "var(--ocean, #006994)";
    btn.style.color = "#fff";
    btn.style.border = "1px solid rgba(0,0,0,0.06)";
    btn.style.boxShadow = "0 6px 14px rgba(0,105,140,0.12)";
    btn.style.padding = "12px 18px";
    btn.style.borderRadius = "10px";
    btn.style.fontSize = "15px";
    btn.style.fontWeight = "700";
    btn.style.cursor = "pointer";
    btn.style.display = "inline-block";
    btn.style.textAlign = "center";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      try {
        if (typeof nav === "function") nav("shop");
        else {
          const shopEl = document.getElementById("shop");
          if (shopEl) {
            document.querySelectorAll(".page").forEach(pg => pg.classList.remove("active"));
            shopEl.classList.add("active");
            if (typeof renderShoppingList === "function") renderShoppingList();
          } else {
            window.location.hash = "#shop";
          }
        }
      } catch (err) {
        console.error("Go to Shopping List navigation failed", err);
      }
    });
    return btn;
  }

  function styleAddButtonToAccent(addBtn) {
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

  function isInsideAddMealsArea(el) {
    try {
      const page = el.closest(".page") || el.closest("body");
      if (!page) return false;
      return !!(page.querySelector("#mealList") || page.querySelector("#mealName"));
    } catch (e) { return false; }
  }

  function findAddMealButton() {
    const candidates = Array.from(document.querySelectorAll("button, input[type=button], a"));
    const addCandidates = candidates.filter(el => {
      const t = (el.textContent || el.value || "").trim();
      return /^(?:\+?\s*Add Meal|Add Meal|Add Meals|Add)$/i.test(t);
    });
    return addCandidates.find(b => isInsideAddMealsArea(b)) || null;
  }

  function findPageLevelContainer(addBtn) {
    const page = addBtn.closest(".page");
    if (page) return page;
    const main = addBtn.closest("main") || document.querySelector("main");
    if (main) return main;
    return document.body;
  }

  function removeExistingPlannerTitles(container) {
    try {
      // remove any elements that contain the exact header text inside the planner container
      const candidates = Array.from(container.querySelectorAll("*")).filter(el => {
        try { return (el.textContent || "").trim() === HEADER_TEXT; } catch { return false; }
      });
      for (const c of candidates) c.remove();
    } catch (e) {}
  }

  function insertHeaderAtTop(container) {
    // ensure single header at very top of container
    removeExistingPlannerTitles(container);
    let header = container.querySelector(`.${HEADER_CLASS}`);
    if (!header) {
      header = document.createElement("div");
      header.className = HEADER_CLASS;
      header.textContent = HEADER_TEXT;
      header.style.width = "100%";
      header.style.boxSizing = "border-box";
      header.style.textAlign = "center";
      header.style.fontSize = "18px";
      header.style.fontWeight = "800";
      header.style.color = "var(--text, #111)";
      header.style.margin = "6px 0";
      // insert at very top of container content
      container.insertBefore(header, container.firstChild);
    } else {
      // ensure it's at the top
      if (container.firstChild !== header) {
        header.parentElement.removeChild(header);
        container.insertBefore(header, container.firstChild);
      }
    }
    return header;
  }

  function insertCenteredControls(addBtn) {
    if (!addBtn || !addBtn.parentElement) return false;

    // Reuse or create Go button
    let goBtn = Array.from(document.querySelectorAll("button, input[type=button], a"))
      .find(el => ((el.textContent || el.value || "").trim() === GO_LABEL) && isInsideAddMealsArea(el));
    if (goBtn && !(goBtn instanceof HTMLButtonElement)) {
      const newGo = createGoButton();
      goBtn.parentElement.insertBefore(newGo, goBtn.nextSibling);
      goBtn = newGo;
    }
    if (!goBtn) goBtn = createGoButton();

    try {
      const container = findPageLevelContainer(addBtn);

      // Insert header at top of container
      insertHeaderAtTop(container);

      // Remove any stray planner header elements that might remain
      removeExistingPlannerTitles(container);

      // Create wrapper for the two buttons and insert below header
      const wrapper = document.createElement("div");
      wrapper.className = WRAPPER_CLASS;
      wrapper.style.display = "flex";
      wrapper.style.justifyContent = "center";
      wrapper.style.alignItems = "center";
      wrapper.style.gap = "12px";
      wrapper.style.width = "100%";
      wrapper.style.boxSizing = "border-box";
      wrapper.style.margin = "12px 0";

      // Insert wrapper after header
      const headerNow = container.querySelector(`.${HEADER_CLASS}`);
      if (headerNow && headerNow.nextSibling) container.insertBefore(wrapper, headerNow.nextSibling);
      else container.insertBefore(wrapper, container.firstChild);

      // Move addBtn and goBtn into wrapper (this removes them from previous parents)
      wrapper.appendChild(addBtn);
      wrapper.appendChild(goBtn);

      // Style both buttons
      styleAddButtonToAccent(addBtn);
      goBtn.style.background = "var(--ocean, #006994)";
      goBtn.style.color = "#fff";
      goBtn.style.border = "1px solid rgba(0,0,0,0.06)";
      goBtn.style.boxShadow = "0 6px 14px rgba(0,105,140,0.12)";
      goBtn.style.padding = "12px 18px";
      goBtn.style.borderRadius = "10px";
      goBtn.style.fontSize = "15px";
      goBtn.style.fontWeight = "700";
      goBtn.style.cursor = "pointer";
      goBtn.style.display = "inline-block";
      goBtn.style.textAlign = "center";
      goBtn.style.float = "none";
      goBtn.style.margin = "0";

      // Ensure helper bubble (if present) is after the wrapper
      const bubble = document.querySelector(".add-meal-helper");
      if (bubble) {
        if (wrapper.nextSibling) wrapper.parentElement.insertBefore(bubble, wrapper.nextSibling);
        else wrapper.parentElement.appendChild(bubble);
      }
    } catch (e) {
      // fallback: insert goBtn after addBtn and style both
      if (addBtn.nextSibling) addBtn.parentElement.insertBefore(goBtn, addBtn.nextSibling);
      else addBtn.parentElement.appendChild(goBtn);
      styleAddButtonToAccent(addBtn);
      goBtn.style.background = "var(--ocean, #006994)";
    }

    return true;
  }

  // Try immediate insertion
  const addBtn = (function findAddMealButton() {
    const candidates = Array.from(document.querySelectorAll("button, input[type=button], a"));
    const addCandidates = candidates.filter(el => {
      const t = (el.textContent || el.value || "").trim();
      return /^(?:\+?\s*Add Meal|Add Meal|Add Meals|Add)$/i.test(t);
    });
    return addCandidates.find(b => {
      try {
        const page = b.closest(".page") || document.body;
        return !!(page.querySelector("#mealList") || page.querySelector("#mealName"));
      } catch { return false; }
    }) || null;
  })();

  if (addBtn) insertCenteredControls(addBtn);

  // Observe DOM for dynamic insertion and insert only when the Add Meal button appears inside Add Meals area
  const observer = new MutationObserver(muts => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (/button|a|input/i.test(node.tagName)) {
          const t = (node.textContent || node.value || "").trim();
          if (/^(?:\+?\s*Add Meal|Add Meal|Add Meals|Add)$/i.test(t) && isInsideAddMealsArea(node)) {
            if (insertCenteredControls(node)) return;
          }
        }
        const descendants = node.querySelectorAll ? node.querySelectorAll("button, a, input[type=button]") : [];
        for (const d of descendants) {
          const t = (d.textContent || d.value || "").trim();
          if (/^(?:\+?\s*Add Meal|Add Meal|Add Meals|Add)$/i.test(t) && isInsideAddMealsArea(d)) {
            if (insertCenteredControls(d)) return;
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
  renameHomeAddButtonScoped();
  renderMeals();
  renderEssentials();
  renderShoppingList();

  mirror([
    "meals","plan","essentials","manualEssentials","manualSelected",
    "clearedShopping","checkedShopping","planSnapshot"
  ]);
};