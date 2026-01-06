/* ===== Init ===== */
const defaultMeals = [
  { name: "Spaghetti Bolognese", items: "Pasta, Minced Beef, Tomato Sauce, Garlic, Onion", cat: "Dinner" },
  { name: "Grilled Salmon", items: "Salmon Fillet, Lemon, Olive Oil, Herbs", cat: "Dinner" },
  { name: "Chicken Curry", items: "Chicken, Curry Paste, Coconut Milk, Rice", cat: "Dinner" },
  { name: "Vegetable Stir Fry", items: "Broccoli, Carrots, Peppers, Soy Sauce, Noodles", cat: "Dinner" },
  { name: "Beef Tacos", items: "Taco Shells, Beef, Lettuce, Tomato, Cheese", cat: "Dinner" },
  { name: "Margherita Pizza", items: "Pizza Base, Tomato Sauce, Mozzarella, Basil", cat: "Dinner" },
  { name: "Shepherd's Pie", items: "Minced Lamb, Potatoes, Carrots, Peas, Gravy", cat: "Dinner" },
  { name: "Lamb Steaks with Chips and peas", items: "Lamb Steaks, Chips, Peas, Gravy", cat: "Dinner" }
];

let meals = JSON.parse(localStorage.getItem('meals') || "null");
if (!Array.isArray(meals) || meals.length === 0) {
  meals = defaultMeals.slice();
  localStorage.setItem('meals', JSON.stringify(meals));
}

let plan = JSON.parse(localStorage.getItem('plan') || "null");
if (!Array.isArray(plan) || plan.length !== 7) {
  plan = Array(7).fill(null);
  localStorage.setItem('plan', JSON.stringify(plan));
}

let manualSelected = new Set(JSON.parse(localStorage.getItem('manualSelected') || '[]'));
let manualAdded = new Set(JSON.parse(localStorage.getItem('manualAdded') || '[]'));
let clearedShopping = new Set(JSON.parse(localStorage.getItem('clearedShopping') || '[]'));
let checkedShopping = new Set(JSON.parse(localStorage.getItem('checkedShopping') || '[]'));
let planSnapshot = localStorage.getItem('planSnapshot') || null;

/* ===== Helpers ===== */
const saveManualSelected = () => {
  localStorage.setItem('manualSelected', JSON.stringify([...manualSelected]));
  localStorage.setItem('manualAdded', JSON.stringify([...manualAdded]));
};
const saveShoppingState = () => {
  localStorage.setItem('clearedShopping', JSON.stringify([...clearedShopping]));
  localStorage.setItem('checkedShopping', JSON.stringify([...checkedShopping]));
};
const computePlanSnapshot = () => JSON.stringify(plan.map(p => p ? (p.name + '||' + p.items) : null));

function save() {
  localStorage.setItem('meals', JSON.stringify(meals));
  localStorage.setItem('plan', JSON.stringify(plan));
  const snap = computePlanSnapshot();
  if (snap !== planSnapshot) {
    planSnapshot = snap;
    localStorage.setItem('planSnapshot', snap);
    clearedShopping = new Set();
    checkedShopping = new Set();
    saveShoppingState();
  }
  if (document.getElementById('shop').classList.contains('active')) renderShoppingList();
}

function nav(p) {
  document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
  document.getElementById(p).classList.add('active');
  if (p === "planner") renderMeals();
  if (p === "select") renderManualList();
  if (p === "shop") renderShoppingList();
}

const escapeHtml = s => s ? s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;") : "";

/* ===== Meals ===== */
function addMeal() {
  const n = mealName.value.trim(), i = mealItems.value.trim(), c = mealCategory.value;
  if (!n || !i) return alert("Enter meal name and items");
  meals.push({ name: n, items: i, cat: c });
  save(); renderMeals(); renderManualList(); renderShoppingList();
  mealName.value = ""; mealItems.value = "";
}

function renderMeals() {
  mealList.innerHTML = "";
  meals.forEach((m, x) => {
    const d = document.createElement('div'); d.className = 'card';
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
  e.style.display = e.style.display === "block" ? "none" : "block";
};

function editMeal(i) {
  const m = meals[i]; if (!m) return;
  const n = prompt("Edit meal name:", m.name); if (n === null) return;
  const it = prompt("Edit recipe items:", m.items); if (it === null) return;
  const c = prompt("Edit category:", m.cat); if (c === null) return;
  meals[i] = { name: n.trim(), items: it.trim(), cat: c.trim() };
  save(); renderMeals(); renderManualList(); renderShoppingList();
}

function deleteMeal(i) {
  const m = meals[i]; if (!m) return;
  if (!confirm(`Delete "${m.name}"?`)) return;
  meals.splice(i, 1);
  save(); renderMeals(); renderManualList(); renderShoppingList();
}

/* ===== Select Meals ===== */
function renderManualList() {
  manualList.innerHTML = "";
  meals.forEach((m, i) => {
    const row = document.createElement('div'); row.className = 'card';
    const btn = document.createElement('button');
    btn.className = 'meal-btn';
    if (manualSelected.has(String(i))) btn.classList.add('selected');
    btn.textContent = m.name;
    btn.onclick = () => {
      const k = String(i);
      manualSelected.has(k) ? manualSelected.delete(k) : manualSelected.add(k);
      saveManualSelected(); renderManualList(); renderShoppingList();
    };
    row.appendChild(btn); manualList.appendChild(row);
  });
}

/* ===== Shopping List ===== */
function renderShoppingList() {
  const seen = new Map();
  const norm = s => s ? s.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/s$/, "") : "";

  plan.forEach(m => m?.items?.split(",").forEach(it => {
    const k = norm(it); if (!seen.has(k)) seen.set(k, it.trim());
  }));

  manualSelected.forEach(i => {
    const m = meals[+i];
    m?.items?.split(",").forEach(it => {
      const k = norm(it); if (!seen.has(k)) seen.set(k, it.trim());
    });
  });

  shoppingItems.innerHTML = "";
  seen.forEach((pretty, key) => {
    if (clearedShopping.has(key)) return;
    const d = document.createElement('div'); d.className = 'shopping-item';
    const left = document.createElement('div'); left.style.display = 'flex'; left.style.gap = '8px'; left.style.cursor = 'pointer';

    const input = document.createElement('input'); input.type = 'checkbox';
    if (checkedShopping.has(key)) { input.checked = true; d.classList.add('collected'); }

    const span = document.createElement('span'); span.textContent = pretty;
    left.appendChild(input); left.appendChild(span);

    left.onclick = () => {
      if (checkedShopping.has(key)) {
        checkedShopping.delete(key); input.checked = false; d.classList.remove('collected');
      } else {
        checkedShopping.add(key); input.checked = true; d.classList.add('collected');
      }
      saveShoppingState();
    };

    d.appendChild(left); shoppingItems.appendChild(d);
  });
}

function clearAllShopping() {
  clearedShopping = new Set();
  checkedShopping = new Set();
  manualSelected = new Set();
  manualAdded = new Set();
  plan = Array(7).fill(null); // ← this line clears the meal plan
  save();
  saveManualSelected();
  saveShoppingState();
  renderManualList();
  renderShoppingList();
}

  window.onload = () => {
  renderMeals();
  renderManualList();
  renderShoppingList();
};

