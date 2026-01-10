/* ===== Refactored app.js — corrected and safe ===== */

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
let manualAdded = new Set(getLS("manualAdded", []));
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
let mealList, mealName, mealItems, manualList, essentialsList, essentialSelectList, shoppingItems;
function bindElements() {
  mealList = document.getElementById("mealList");
  mealName = document.getElementById("mealName");
  mealItems = document.getElementById("mealItems");
  manualList = document.getElementById("manualList");
  essentialsList = document.getElementById("essentialsList");
  essentialSelectList = document.getElementById("essentialSelectList");
  shoppingItems = document.getElementById("shoppingItems");

  // Runtime guard: log any missing IDs so you can spot mismatches quickly
  const required = ["mealList","mealName","mealItems","manualList","essentialsList","essentialSelectList","shoppingItems"];
  required.forEach(id => {
    if (!document.getElementById(id)) console.warn(`Missing DOM element id="${id}"`);
  });
}

/* ===== Helpers ===== */
const saveManualSelected = () => {
  setLS("manualSelected", [...manualSelected]);
  setLS("manualAdded", [...manualAdded]);
  mirror(["manualSelected", "manualAdded"]);
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

function nav(p) {
  document.querySelectorAll(".page").forEach(pg => pg.classList.remove("active"));
  const el = document.getElementById(p);
  if (!el) return;
  el.classList.add("active");

  if (p === "planner") renderMeals();
  if (p === "select") renderManualList();
  if (p === "essentials") renderEssentials();
  if (p === "selectEssentials") renderEssentialSelectList();
  if (p === "shop") renderShoppingList();
}

/* ===== escapeHtml (fixed) ===== */
const escapeHtml = s =>
  s ? s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;") : "";

/* ===== Meals ===== */
function addMeal() {
  const n = (mealName && mealName.value || "").trim();
  const i = (mealItems && mealItems.value || "").trim();
  if (!n || !i) return alert("Enter meal name and items");
  meals.push({ name: n, items: i });
  save();
  if (typeof renderMeals === "function") renderMeals();
  if (typeof renderManualList === "function") renderManualList();
  if (typeof renderShoppingList === "function") renderShoppingList();
  if (mealName) mealName.value = "";
  if (mealItems) mealItems.value = "";
}

function renderMeals() {
  if (!mealList) return;
  mealList.innerHTML = "";
  meals.forEach((m, x) => {
    const d = document.createElement("div");
    d.className = "card";
    const id = `r${x}`;
    d.innerHTML = `
      <strong onclick="toggleRecipe('${id}')" style="cursor:pointer">${escapeHtml(m.name)}</strong>
      <div id="${id}" class="recipe" style="display:none;margin-top:8px;">${escapeHtml(m.items)}</div>
      <div style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="tool-btn" onclick="editMeal(${x})">Edit</button>
        <button class="tool-btn" onclick="deleteMeal(${x})">Delete</button>
      </div>`;
    mealList.appendChild(d);
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
  renderManualList();
  renderShoppingList();
}

function deleteMeal(i) {
  const m = meals[i];
  if (!m) return;
  if (!confirm(`Delete "${m.name}"?`)) return;
  meals.splice(i, 1);
  save();
  renderMeals();
  renderManualList();
  renderShoppingList();
}

/* ===== Select Meals ===== */
function renderManualList() {
  if (!manualList) return;
  manualList.innerHTML = "";
  meals.forEach((m, i) => {
    const row = document.createElement("div");
    row.className = "card";
    const btn = document.createElement("button");
    btn.className = "meal-btn";
    if (manualSelected.has(String(i))) btn.classList.add("selected");
    btn.textContent = m.name;

    btn.onclick = () => {
      const k = String(i);
      m.items.split(",").forEach(it => clearedShopping.delete(norm(it)));
      saveShoppingState();

      manualSelected.has(k) ? manualSelected.delete(k) : manualSelected.add(k);

      saveManualSelected();
      renderManualList();
      renderShoppingList();
    };

    row.appendChild(btn);
    manualList.appendChild(row);
  });
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
  manualAdded = new Set();
  manualEssentials = new Set();
  saveManualSelected();
  setLS("manualEssentials", []);
  mirror(["manualSelected", "manualAdded", "manualEssentials", "clearedShopping", "checkedShopping"]);
  renderManualList();
  renderEssentials();
  renderShoppingList();
}

/* ===== Init on load ===== */
window.onload = () => {
  bindElements();
  renderMeals();
  renderManualList();
  renderEssentials();
  renderEssentialSelectList();
  renderShoppingList();

  mirror([
    "meals","plan","essentials","manualEssentials","manualSelected",
    "manualAdded","clearedShopping","checkedShopping","planSnapshot"
  ]);
};