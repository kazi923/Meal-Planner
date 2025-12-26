/* ======= App data and initialization ======= */
const defaultMeals = [
  { name:"Spaghetti Bolognese", items:"Pasta, Minced Beef, Tomato Sauce, Garlic, Onion", cat:"Dinner" },
  { name:"Grilled Salmon", items:"Salmon Fillet, Lemon, Olive Oil, Herbs", cat:"Dinner" },
  { name:"Chicken Curry", items:"Chicken, Curry Paste, Coconut Milk, Rice", cat:"Dinner" },
  { name:"Vegetable Stir Fry", items:"Broccoli, Carrots, Peppers, Soy Sauce, Noodles", cat:"Dinner" },
  { name:"Beef Tacos", items:"Taco Shells, Beef, Lettuce, Tomato, Cheese", cat:"Dinner" },
  { name:"Margherita Pizza", items:"Pizza Base, Tomato Sauce, Mozzarella, Basil", cat:"Dinner" },
  { name:"Shepherd's Pie", items:"Minced Lamb, Potatoes, Carrots, Peas, Gravy", cat:"Dinner" }
];

let meals;
try { meals = JSON.parse(localStorage.getItem('meals')); } catch (e) { meals = null; }
if (!Array.isArray(meals) || meals.length === 0) {
  meals = defaultMeals.slice();
  localStorage.setItem('meals', JSON.stringify(meals));
}

let plan;
try { plan = JSON.parse(localStorage.getItem('plan')); } catch (e) { plan = null; }
if (!Array.isArray(plan) || plan.length !== 7) {
  plan = Array(7).fill(null);
  localStorage.setItem('plan', JSON.stringify(plan));
}

let manualSelected = new Set();
let clearedShopping = new Set(JSON.parse(localStorage.getItem('clearedShopping') || '[]'));
let checkedShopping = new Set(JSON.parse(localStorage.getItem('checkedShopping') || '[]'));

function save() {
  localStorage.setItem('meals', JSON.stringify(meals));
  localStorage.setItem('plan',  JSON.stringify(plan));
}
function saveShoppingState() {
  localStorage.setItem('clearedShopping', JSON.stringify(Array.from(clearedShopping)));
  localStorage.setItem('checkedShopping', JSON.stringify(Array.from(checkedShopping)));
}

/* ======= Navigation and helpers ===== */
function nav(p) {
  document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
  const el = document.getElementById(p);
  if (!el) return;
  el.classList.add('active');
  if (p === 'planner') renderMeals();
  if (p === 'seven')   renderPlan();
  if (p === 'shop')    renderShoppingList();
  if (p === 'manual')  renderManualList();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

/* ======= Meals management ===== */
function addMeal() {
  const n = document.getElementById('mealName').value.trim();
  const i = document.getElementById('mealItems').value.trim();
  const c = document.getElementById('mealCategory').value;
  if (!n || !i) { alert('Enter meal name and items'); return; }
  meals.push({ name:n, items:i, cat:c });
  save();
  renderMeals();
  document.getElementById('mealName').value = '';
  document.getElementById('mealItems').value = '';
}

function renderMeals() {
  const l = document.getElementById('mealList');
  l.innerHTML = '';
  meals.filter(m => m && m.name && m.items).forEach((m,x) => {
    const d = document.createElement('div');
    d.className = 'card';
    const recipeId = `r${x}`;
    d.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <strong onclick="toggleRecipe('${recipeId}')" style="cursor:pointer">${escapeHtml(m.name)}</strong>
        <span style="color:#6b7b88; font-size:13px;">(${escapeHtml(m.cat)})</span>
        <span style="margin-left:auto; color:#6b7b88; font-size:13px;">▼</span>
      </div>
      <div id="${recipeId}" class="recipe" style="display:none; margin-top:8px;">${escapeHtml(m.items)}</div>
      <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">
        <button class="tool-btn" onclick="editMeal(${x})">✏️ Edit</button>
        <button class="tool-btn" onclick="deleteMeal(${x})">🗑️ Delete</button>
      </div>`;
    l.appendChild(d);
  });
}

function toggleRecipe(id) {
  const e = document.getElementById(id);
  if (e) e.style.display = (e.style.display === 'block' ? 'none' : 'block');
}

function editMeal(index) {
  const m = meals[index];
  if (!m) return;
  const newName  = prompt('Edit meal name:', m.name);
  if (newName === null) return;
  const newItems = prompt('Edit recipe items (comma separated):', m.items);
  if (newItems === null) return;
  const newCat   = prompt('Edit category (Breakfast/Lunch/Dinner/Snack):', m.cat);
  if (newCat === null) return;

  const name  = newName.trim();
  const items = newItems.trim();
  const cat   = (newCat || m.cat).trim();
  if (!name || !items) { alert('Meal name and items cannot be empty.'); return; }

  meals[index] = { name, items, cat };
  save();
  renderMeals();

  plan = plan.map(p => {
    if (!p) return p;
    const same = (p.name === m.name && p.items === m.items);
    return same ? { ...p, name, items, cat } : p;
  });
  save();
  renderPlan();
}

function deleteMeal(index) {
  const m = meals[index];
  if (!m) return;
  const ok = confirm(`Delete "${m.name}"?`);
  if (!ok) return;

  meals.splice(index, 1);

  plan = plan.map(p => {
    if (!p) return p;
    const same = (p.name === m.name && p.items === m.items);
    return same ? null : p;
  });

  save();
  renderMeals();
  renderPlan();
}