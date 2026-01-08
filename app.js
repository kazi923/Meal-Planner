/* ============================================================
   INITIALISATION
   ============================================================ */

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

let meals = JSON.parse(localStorage.getItem("meals") || "null");
if (!Array.isArray(meals) || meals.length === 0) {
  meals = defaultMeals.slice();
  localStorage.setItem("meals", JSON.stringify(meals));
}

let plan = JSON.parse(localStorage.getItem("plan") || "null");
if (!Array.isArray(plan) || plan.length !== 7) {
  plan = Array(7).fill(null);
  localStorage.setItem("plan", JSON.stringify(plan));
}

let manualSelected = new Set(JSON.parse(localStorage.getItem("manualSelected") || "[]"));
let manualAdded = new Set(JSON.parse(localStorage.getItem("manualAdded") || "[]"));
let clearedShopping = new Set(JSON.parse(localStorage.getItem("clearedShopping") || "[]"));
let checkedShopping = new Set(JSON.parse(localStorage.getItem("checkedShopping") || "[]"));
let planSnapshot = localStorage.getItem("planSnapshot") || null;

/* Essentials */
let essentials = JSON.parse(localStorage.getItem("essentials") || "null");
if (!Array.isArray(essentials) || essentials.length === 0) {
  essentials = [
    "Milk","Toilet roll","Coffee","Sugar","Cereal","Bread","Butter",
    "Toothpaste","Peanut Butter","Biscuits","Chocolate Buttons",
    "Cheese","Ham","Red Sauce","Brown Sauce","BBQ Sauce",
    "Bananas","Grapes","Shampoo","Soap","Conditioner",
    "Crisps","Protein Bars","Orange Juice","Blackcurrant Juice"
  ];
  localStorage.setItem("essentials", JSON.stringify(essentials));
}

let manualEssentials = new Set(JSON.parse(localStorage.getItem("manualEssentials") || "[]"));

/* ============================================================
   THEME SYSTEM
   ============================================================ */

const themes = {
  ocean: ["#006994", "#004766"],
  sunset: ["#ff6b6b", "#c44536"],
  forest: ["#2d6a4f", "#1b4332"],
  lavender: ["#7b2cbf", "#5a189a"],
  rose: ["#ff4d6d", "#c9184a"],
  midnight: ["#1b1b3a", "#13132a"],
  gold: ["#e0a106", "#b88600"],
  steel: ["#6c757d", "#495057"],
  mint: ["#2ec4b6", "#1b9e8b"],
  coral: ["#ff7f51", "#cc5c3a"],
  sky: ["#4dabf7", "#1c7ed6"],
  plum: ["#9d4edd", "#7b2cbf"],
  sand: ["#e9c46a", "#c49b42"],
  emerald: ["#2a9d8f", "#1e6f63"],
  ruby: ["#d62828", "#a4161a"],
  sapphire: ["#264653", "#1b2f3a"],
  amber: ["#ffb703", "#e09e00"],
  slate: ["#495057", "#343a40"],
  ice: ["#90e0ef", "#48cae4"],
  flame: ["#e63946", "#b02a37"],
  moss: ["#606c38", "#283618"],
  orchid: ["#c77dff", "#9d4edd"],
  coffee: ["#7f5539", "#5c3d2e"],
  navy: ["#023e8a", "#002855"],
  peach: ["#ffb4a2", "#e5989b"],
  teal: ["#008080", "#005f5f"],
  bronze: ["#cd7f32", "#a66a2c"],
  cherry: ["#d90429", "#9d0208"],
  storm: ["#6c757d", "#495057"],
  arctic: ["#caf0f8", "#90e0ef"],
  desert: ["#e9c46a", "#c49b42"],
  neon: ["#39ff14", "#2ecc71"],
  pastelBlue: ["#a2d2ff", "#7fb3ff"],
  pastelPink: ["#ffc8dd", "#ffafcc"]
};

function applyTheme(name) {
  const t = themes[name];
  if (!t) return;

  document.documentElement.style.setProperty("--btn-main", t[0]);
  document.documentElement.style.setProperty("--btn-main-dark", t[1]);

  localStorage.setItem("theme", name);

  if (typeof syncStorageToIndexedDB === "function") {
    syncStorageToIndexedDB(["theme"]);
  }
}

function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved && themes[saved]) applyTheme(saved);
}

/* ============================================================
   HAMBURGER + DROPDOWN LOGIC
   ============================================================ */

const hamburger = document.getElementById("hamburger");
const dropdown = document.getElementById("dropdownMenu");
const themeToggle = document.getElementById("themeToggle");
const themeGrid = document.getElementById("themeGrid");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

hamburger.onclick = () => {
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  themeGrid.style.display = "none";
};

document.addEventListener("click", e => {
  if (!dropdown.contains(e.target) && e.target !== hamburger) {
    dropdown.style.display = "none";
    themeGrid.style.display = "none";
  }
});

themeToggle.onclick = () => {
  themeGrid.style.display = themeGrid.style.display === "grid" ? "none" : "grid";
};

/* Build theme circles */
Object.entries(themes).forEach(([name, colors]) => {
  const circle = document.createElement("div");
  circle.className = "theme-circle";
  circle.style.background = colors[0];
  circle.onclick = () => applyTheme(name);
  themeGrid.appendChild(circle);
});

/* Export */
exportBtn.onclick = () => {
  if (typeof exportIndexedDB === "function") exportIndexedDB();
};

/* Import */
importBtn.onclick = () => importFile.click();

importFile.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const json = JSON.parse(evt.target.result);
      if (typeof importIndexedDB === "function") importIndexedDB(json);
    } catch {
      alert("Invalid backup file.");
    }
  };
  reader.readAsText(file);
};
/* ============================================================
   NAVIGATION + SAVE LOGIC
   ============================================================ */

function nav(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(page).classList.add("active");

  if (page === "planner") renderMeals();
  if (page === "select") renderManualList();
  if (page === "essentials") renderEssentials();
  if (page === "selectEssentials") renderEssentialSelectList();
  if (page === "shop") renderShoppingList();
}

function computePlanSnapshot() {
  return JSON.stringify(plan.map(p => (p ? p.name + "||" + p.items : null)));
}

function save() {
  localStorage.setItem("meals", JSON.stringify(meals));
  localStorage.setItem("plan", JSON.stringify(plan));
  localStorage.setItem("essentials", JSON.stringify(essentials));
  localStorage.setItem("manualEssentials", JSON.stringify([...manualEssentials]));

  const snap = computePlanSnapshot();
  if (snap !== planSnapshot) {
    planSnapshot = snap;
    localStorage.setItem("planSnapshot", snap);

    clearedShopping = new Set();
    checkedShopping = new Set();
    saveShoppingState();
  }

  if (typeof syncStorageToIndexedDB === "function") {
    syncStorageToIndexedDB([
      "meals",
      "plan",
      "essentials",
      "manualEssentials",
      "planSnapshot"
    ]);
  }

  if (document.getElementById("shop").classList.contains("active")) {
    renderShoppingList();
  }
}

function saveManualSelected() {
  localStorage.setItem("manualSelected", JSON.stringify([...manualSelected]));
  localStorage.setItem("manualAdded", JSON.stringify([...manualAdded]));

  if (typeof syncStorageToIndexedDB === "function") {
    syncStorageToIndexedDB(["manualSelected", "manualAdded"]);
  }
}

function saveShoppingState() {
  localStorage.setItem("clearedShopping", JSON.stringify([...clearedShopping]));
  localStorage.setItem("checkedShopping", JSON.stringify([...checkedShopping]));

  if (typeof syncStorageToIndexedDB === "function") {
    syncStorageToIndexedDB(["clearedShopping", "checkedShopping"]);
  }
}

/* ============================================================
   MEALS — ADD / EDIT / DELETE
   ============================================================ */

function addMeal() {
  const n = mealName.value.trim();
  const i = mealItems.value.trim();
  if (!n || !i) return alert("Enter meal name and items");

  meals.push({ name: n, items: i });
  save();
  renderMeals();
  renderManualList();
  renderShoppingList();

  mealName.value = "";
  mealItems.value = "";
}

function renderMeals() {
  mealList.innerHTML = "";

  meals.forEach((m, index) => {
    const card = document.createElement("div");
    card.className = "card";

    const recipeId = `recipe_${index}`;

    card.innerHTML = `
      <strong onclick="toggleRecipe('${recipeId}')" style="cursor:pointer;">
        ${escapeHtml(m.name)}
      </strong>

      <div id="${recipeId}" class="recipe" style="display:none;margin-top:8px;">
        ${escapeHtml(m.items)}
      </div>

      <div style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end;">
        <button class="tool-btn" onclick="editMeal(${index})">Edit</button>
        <button class="tool-btn" onclick="deleteMeal(${index})">Delete</button>
      </div>
    `;

    mealList.appendChild(card);
  });
}

function toggleRecipe(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "block" ? "none" : "block";
}

function editMeal(i) {
  const m = meals[i];
  if (!m) return;

  const newName = prompt("Edit meal name:", m.name);
  if (newName === null) return;

  const newItems = prompt("Edit recipe items:", m.items);
  if (newItems === null) return;

  meals[i] = { name: newName.trim(), items: newItems.trim() };
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

/* ============================================================
   MANUAL MEAL SELECTION
   ============================================================ */

function renderManualList() {
  manualList.innerHTML = "";

  meals.forEach((meal, index) => {
    const row = document.createElement("div");
    row.className = "card";

    const btn = document.createElement("button");
    btn.className = "meal-btn";
    btn.textContent = meal.name;

    const key = String(index);
    if (manualSelected.has(key)) btn.classList.add("selected");

    btn.onclick = () => {
      meal.items.split(",").forEach(item => {
        const k = norm(item);
        clearedShopping.delete(k);
      });
      saveShoppingState();

      if (manualSelected.has(key)) {
        manualSelected.delete(key);
      } else {
        manualSelected.add(key);
      }

      saveManualSelected();
      renderManualList();
      renderShoppingList();
    };

    row.appendChild(btn);
    manualList.appendChild(row);
  });
}
/* ============================================================
   ESSENTIALS — ADD / DELETE
   ============================================================ */

function addEssential() {
  const item = document.getElementById("essentialItem").value.trim();
  if (!item) return alert("Enter an item");

  essentials.push(item);
  localStorage.setItem("essentials", JSON.stringify(essentials));

  if (typeof syncStorageToIndexedDB === "function") {
    syncStorageToIndexedDB(["essentials"]);
  }

  renderEssentials();
  document.getElementById("essentialItem").value = "";
}

function renderEssentials() {
  const box = document.getElementById("essentialsList");
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
      localStorage.setItem("essentials", JSON.stringify(essentials));

      if (typeof syncStorageToIndexedDB === "function") {
        syncStorageToIndexedDB(["essentials"]);
      }

      renderEssentials();
    };

    row.appendChild(label);
    row.appendChild(del);
    box.appendChild(row);
  });
}

/* ============================================================
   SELECT ESSENTIALS
   ============================================================ */

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

    const key = String(index);
    if (manualEssentials.has(key)) {
      btn.classList.add("selected");
    }

    btn.onclick = () => {
      const k = String(index);

      clearedShopping.delete(norm(item));
      saveShoppingState();

      if (manualEssentials.has(k)) {
        manualEssentials.delete(k);
      } else {
        manualEssentials.add(k);
      }

      localStorage.setItem("manualEssentials", JSON.stringify([...manualEssentials]));

      if (typeof syncStorageToIndexedDB === "function") {
        syncStorageToIndexedDB(["manualEssentials"]);
      }

      renderEssentialSelectList();
      renderShoppingList();
    };

    row.appendChild(btn);
    box.appendChild(row);
  });
}
/* ============================================================
   SHOPPING LIST
   ============================================================ */

function norm(s) {
  return s
    ? s.toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, "")
        .replace(/s$/, "")
    : "";
}

function renderShoppingList() {
  const seen = new Map();

  /* Meals from weekly plan */
  plan.forEach(m => {
    if (!m) return;
    m.items.split(",").forEach(it => {
      const k = norm(it);
      if (!seen.has(k)) seen.set(k, it.trim());
    });
  });

  /* Manually selected meals */
  manualSelected.forEach(i => {
    const m = meals[+i];
    if (!m) return;
    m.items.split(",").forEach(it => {
      const k = norm(it);
      if (!seen.has(k)) seen.set(k, it.trim());
    });
  });

  /* Manually selected essentials */
  manualEssentials.forEach(i => {
    const item = essentials[+i];
    if (!item) return;
    const k = norm(item);
    if (!seen.has(k)) seen.set(k, item.trim());
  });

  /* Render */
  shoppingItems.innerHTML = "";

  seen.forEach((pretty, key) => {
    if (clearedShopping.has(key)) return;

    const row = document.createElement("div");
    row.className = "shopping-item";

    /* Left side: checkbox + label */
    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.gap = "8px";
    left.style.cursor = "pointer";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    if (checkedShopping.has(key)) {
      checkbox.checked = true;
      row.classList.add("collected");
    }

    const label = document.createElement("span");
    label.textContent = pretty;

    left.appendChild(checkbox);
    left.appendChild(label);

    /* Toggle collected state */
    left.onclick = () => {
      if (checkedShopping.has(key)) {
        checkedShopping.delete(key);
        checkbox.checked = false;
        row.classList.remove("collected");
      } else {
        checkedShopping.add(key);
        checkbox.checked = true;
        row.classList.add("collected");
      }
      saveShoppingState();
    };

    /* Right side: Clear button */
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear";
    clearBtn.className = "tool-btn";

    clearBtn.onclick = () => {
      clearedShopping.add(key);
      saveShoppingState();
      renderShoppingList();
    };

    row.appendChild(left);
    row.appendChild(clearBtn);
    shoppingItems.appendChild(row);
  });
}

/* Clear ALL shopping items */
function clearAllShopping() {
  if (!confirm("Clear the entire shopping list?")) return;

  const seen = new Map();

  plan.forEach(m => {
    if (!m) return;
    m.items.split(",").forEach(it => {
      const k = norm(it);
      seen.set(k, true);
    });
  });

  manualSelected.forEach(i => {
    const m = meals[+i];
    if (!m) return;
    m.items.split(",").forEach(it => {
      const k = norm(it);
      seen.set(k, true);
    });
  });

  manualEssentials.forEach(i => {
    const item = essentials[+i];
    if (!item) return;
    const k = norm(item);
    seen.set(k, true);
  });

  seen.forEach((_, key) => clearedShopping.add(key));

  saveShoppingState();
  renderShoppingList();
}
/* ============================================================
   HELPER FUNCTIONS
   ============================================================ */

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ============================================================
   INITIAL LOAD
   ============================================================ */

window.onload = () => {
  loadTheme();          // Apply saved theme
  renderMeals();        // Prepare planner page
  renderManualList();   // Prepare meal selection
  renderEssentials();   // Prepare essentials page
  renderEssentialSelectList();
  renderShoppingList(); // Prepare shopping list
};
