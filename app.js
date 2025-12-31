/* ======= App data and initialization ======= */
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

/* Shopping UI state */
let manualSelected = new Set(JSON.parse(localStorage.getItem('manualSelected') || '[]'));
let manualAdded = new Set(JSON.parse(localStorage.getItem('manualAdded') || '[]')); // indices added to plan by selection
let clearedShopping = new Set(JSON.parse(localStorage.getItem('clearedShopping') || '[]'));
let checkedShopping = new Set(JSON.parse(localStorage.getItem('checkedShopping') || '[]'));

/* Keep a snapshot of the plan so we can detect changes */
let planSnapshot = localStorage.getItem('planSnapshot') || null;

/* ======= Persistence helpers ===== */
function saveManualSelected() {
  localStorage.setItem('manualSelected', JSON.stringify(Array.from(manualSelected)));
  localStorage.setItem('manualAdded', JSON.stringify(Array.from(manualAdded)));
}
function saveShoppingState() {
  localStorage.setItem('clearedShopping', JSON.stringify(Array.from(clearedShopping)));
  localStorage.setItem('checkedShopping', JSON.stringify(Array.from(checkedShopping)));
}

/* Compute a compact snapshot string for the current plan */
function computePlanSnapshot() {
  try {
    return JSON.stringify(plan.map(p => p ? (p.name + '||' + p.items) : null));
  } catch (e) {
    return null;
  }
}

/* Save meals/plan and reset shopping-state when the plan changes */
function save() {
  localStorage.setItem('meals', JSON.stringify(meals));
  localStorage.setItem('plan', JSON.stringify(plan));

  const newSnapshot = computePlanSnapshot();
  if (newSnapshot !== planSnapshot) {
    planSnapshot = newSnapshot;
    localStorage.setItem('planSnapshot', planSnapshot);

    // Reset cleared/checked shopping state (they apply only to the current plan)
    clearedShopping = new Set();
    checkedShopping = new Set();
    saveShoppingState();
  }

  // If the shopping page is visible, refresh it
  const shopEl = document.getElementById('shop');
  if (shopEl && shopEl.classList.contains('active')) {
    renderShoppingList();
  }
}

/* ======= Navigation and helpers ===== */
function nav(p) {
  document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
  const el = document.getElementById(p);
  if (!el) return;
  el.classList.add('active');
  if (p === 'planner') renderMeals();
  if (p === 'select') renderManualList();
  if (p === 'shop') renderShoppingList();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ======= Meals management ===== */
function addMeal() {
  const n = document.getElementById('mealName').value.trim();
  const i = document.getElementById('mealItems').value.trim();
  const c = document.getElementById('mealCategory').value;
  if (!n || !i) { alert('Enter meal name and items'); return; }
  meals.push({ name: n, items: i, cat: c });
  save();
  renderMeals();
  renderManualList();
  renderShoppingList();
  document.getElementById('mealName').value = "";
  document.getElementById('mealItems').value = "";
}

function renderMeals() {
  const l = document.getElementById('mealList');
  if (!l) return;
  l.innerHTML = "";
  meals.filter(m => m && m.name && m.items).forEach((m, x) => {
    const d = document.createElement('div');
    d.className = 'card';
    const recipeId = `r${x}`;
    d.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <strong onclick="toggleRecipe('${recipeId}')" style="cursor:pointer">${escapeHtml(m.name)}</strong>
        <span style="color:#6b7b88; font-size:13px;">(${escapeHtml(m.cat)})</span>
        <span style="margin-left:auto; color:#6b7b88; font-size:13px;"></span>
      </div>
      <div id="${recipeId}" class="recipe" style="display:none; margin-top:8px;">${escapeHtml(m.items)}</div>
      <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">
        <button class="tool-btn" onclick="editMeal(${x})">Edit</button>
        <button class="tool-btn" onclick="deleteMeal(${x})">Delete</button>
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
  const newName = prompt('Edit meal name:', m.name);
  if (newName === null) return;
  const newItems = prompt('Edit recipe items (comma separated):', m.items);
  if (newItems === null) return;
  const newCat = prompt('Edit category (Breakfast/Lunch/Dinner/Snack):', m.cat);
  if (newCat === null) return;
  const name = newName.trim();
  const items = newItems.trim();
  const cat = (newCat || m.cat).trim();
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
  renderManualList();
  renderShoppingList();
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
  // If any manualAdded indices now point to removed plan entries, clear them
  manualAdded = new Set(Array.from(manualAdded).filter(i => plan[i]));
  saveManualSelected();
  save();
  renderMeals();
  renderPlan();
  renderManualList();
  renderShoppingList();
}

/* ======= Select Meals helpers (buttons instead of checkboxes) ===== */
/* Behavior:
   - Clicking a meal immediately locks it into the plan (adds to first empty slot if needed) and includes its items in the shopping list.
   - Clicking again unlocks/removes the meal from the plan (if it was added by selection) or unlocks it (if it existed previously), and removes its items from the shopping list.
*/
function renderManualList() {
  const container = document.getElementById('manualList');
  if (!container) return;
  container.innerHTML = "";
  if (!meals || meals.length === 0) {
    container.innerHTML = '<div class="card empty">No meals available. Add meals on the Meal Planner page.</div>';
    return;
  }

  meals.forEach((m, idx) => {
    if (!m || !m.name) return;
    const row = document.createElement('div');
    row.className = 'card';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '10px';
    left.style.flex = '1';

    const btn = document.createElement('button');
    btn.className = 'meal-btn';
    if (manualSelected.has(String(idx)) || manualSelected.has(idx)) btn.classList.add('selected');
    btn.textContent = m.name;
    btn.title = m.name;

    btn.addEventListener('click', () => {
      // Normalize stored indices as strings may exist
      const keyIdx = String(idx);
      const wasSelected = manualSelected.has(keyIdx) || manualSelected.has(idx);

      if (wasSelected) {
        // Unselect: remove shopping inclusion and unlock/remove from plan
        manualSelected.delete(keyIdx);
        manualSelected.delete(idx);

        // Find matching plan index (if any)
        const planIdx = plan.findIndex(p => p && p.name === m.name && p.items === m.items);
        if (planIdx !== -1) {
          if (manualAdded.has(planIdx)) {
            // If we added this entry when selecting, remove it entirely
            plan[planIdx] = null;
            manualAdded.delete(planIdx);
          } else {
            // If it was an existing plan entry, just unlock and exclude from shopping
            plan[planIdx].locked = false;
            plan[planIdx].includeInShopping = false;
          }
        }
      } else {
        // Select: add to manualSelected and lock into plan (and include in shopping)
        manualSelected.add(keyIdx);
        manualSelected.add(idx);

        // Check if meal already exists in plan
        let planIdx = plan.findIndex(p => p && p.name === m.name && p.items === m.items);
        if (planIdx !== -1) {
          // If exists, lock it and include in shopping
          plan[planIdx].locked = true;
          plan[planIdx].includeInShopping = true;
        } else {
          // Add to first empty slot
          planIdx = plan.findIndex(p => !p);
          if (planIdx === -1) {
            // No empty slot: replace first non-locked non-manualAdded entry, fallback to index 0
            planIdx = plan.findIndex((p, i) => p && !p.locked && !manualAdded.has(i));
            if (planIdx === -1) planIdx = 0;
          }
          plan[planIdx] = { ...m, locked: true, includeInShopping: true };
          manualAdded.add(planIdx);
        }
      }

      // Persist and update UI
      saveManualSelected();
      save();
      renderManualList();
      renderShoppingList();
    });

    left.appendChild(btn);
    row.appendChild(left);
    container.appendChild(row);
  });
}

/* ======= Weekly plan helpers (kept for compatibility) ===== */
function shufflePlan() {
  if (!meals.length) { alert('Add some meals first'); return; }
  const lockedEntries = plan.map((p, idx) => (p && p.locked) ? { idx, entry: p } : null).filter(Boolean);
  const lockedKeys = new Set(lockedEntries.map(e => (e.entry.name + '||' + e.entry.items)));
  const pool = meals.filter(m => !lockedKeys.has(m.name + '||' + m.items));
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const newPlan = Array(7).fill(null);
  lockedEntries.forEach(e => newPlan[e.idx] = { ...e.entry, locked: true, includeInShopping: (e.entry.includeInShopping !== false) });
  let pIndex = 0;
  for (let i = 0; i < 7; i++) {
    if (newPlan[i]) continue;
    if (pIndex >= shuffled.length) break;
    newPlan[i] = { ...shuffled[pIndex++], locked: false, includeInShopping: true };
  }
  plan = newPlan;
  save();
  renderPlan();
  renderShoppingList();
}

/* Toggle lock by pressing the meal button on plan (keeps previous behavior) */
function toggleLock(i) {
  if (i < 0 || i >= 7) return;
  if (!plan[i]) return;
  plan[i].locked = !plan[i].locked;
  plan[i].includeInShopping = !!plan[i].locked;
  // If toggled off and this index was in manualAdded, remove it from manualAdded
  if (!plan[i].locked && manualAdded.has(i)) {
    manualAdded.delete(i);
  }
  saveManualSelected();
  save();
  renderPlan();
  renderShoppingList();
}

/* ======= Shopping list builder ======= */
function renderShoppingList() {
  function normalizeItem(raw) {
    if (!raw) return "";
    let s = String(raw).trim().toLowerCase();
    s = s.replace(/[^\w\s]/g, "");
    s = s.replace(/\s+/g, ' ').trim();
    if (s.length > 3 && s.endsWith('s')) s = s.slice(0, -1);
    return s;
  }

  const seen = new Map();

  // 1) Items from plan (only days included)
  plan.forEach(m => {
    if (!m || !m.items) return;
    if (m.includeInShopping === false) return;
    m.items.split(",").map(s => s.trim()).filter(Boolean).forEach(it => {
      const key = normalizeItem(it);
      if (!key) return;
      if (!seen.has(key)) seen.set(key, it.replace(/\b\w/g, c => c.toUpperCase()));
    });
  });

  // 2) Items from manually selected meals on Select Meals page
  // Ensure indices are numbers (handles stringified indices from storage)
  Array.from(manualSelected).forEach(rawIdx => {
    const idx = Number(rawIdx);
    if (Number.isNaN(idx)) return;
    const m = meals[idx];
    if (!m || !m.items) return;
    m.items.split(",").map(s => s.trim()).filter(Boolean).forEach(it => {
      const key = normalizeItem(it);
      if (!key) return;
      if (!seen.has(key)) seen.set(key, it.replace(/\b\w/g, c => c.toUpperCase()));
    });
  });

  // Prune clearedShopping so keys that no longer exist in the current combined set are removed
  const currentKeys = new Set(seen.keys());
  const pruned = new Set(Array.from(clearedShopping).filter(k => currentKeys.has(k)));
  if (pruned.size !== clearedShopping.size) {
    clearedShopping = pruned;
    saveShoppingState();
  }

  const l = document.getElementById('shoppingItems');
  if (!l) return;
  l.innerHTML = "";
  if (seen.size === 0) {
    l.innerHTML = '<div class="card empty">No items yet. Select meals or add to your plan first.</div>';
    return;
  }

  const entries = Array.from(seen.entries()).sort((a,b) => a[1].localeCompare(b[1]));
  entries.forEach(([key, pretty]) => {
    if (clearedShopping.has(key)) return; // skip cleared items (shopping-only state)
    const d = document.createElement('div');
    d.className = 'shopping-item';
    d.style.display = 'flex';
    d.style.alignItems = 'center';
    d.style.justifyContent = 'space-between';
    d.style.padding = '6px 0';
    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '8px';
    left.style.flex = '1';
    left.style.cursor = 'pointer';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.style.transform = 'scale(1.05)';
    if (checkedShopping.has(key)) input.checked = true;

    const span = document.createElement('span');
    span.textContent = pretty;
    if (checkedShopping.has(key)) {
      span.style.textDecoration = 'line-through';
      span.style.fontWeight = '700';
    }
    left.appendChild(input);
    left.appendChild(span);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'tool-btn';
    clearBtn.textContent = 'X';

    // Toggle checked state when clicking the left area
    left.addEventListener('click', (ev) => {
      if (ev.target === clearBtn) return;
      const isChecked = checkedShopping.has(key);
      if (isChecked) {
        checkedShopping.delete(key);
        input.checked = false;
        span.style.textDecoration = 'none';
        span.style.fontWeight = '400';
      } else {
        checkedShopping.add(key);
        input.checked = true;
        span.style.textDecoration = 'line-through';
        span.style.fontWeight = '700';
      }
      saveShoppingState();
    });

    input.addEventListener('change', () => {
      if (input.checked) {
        checkedShopping.add(key);
        span.style.textDecoration = 'line-through';
        span.style.fontWeight = '700';
      } else {
        checkedShopping.delete(key);
        span.style.textDecoration = 'none';
        span.style.fontWeight = '400';
      }
      saveShoppingState();
    });

    // clearBtn only affects shopping list state, not the plan or manualSelected
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearedShopping.add(key);
      if (checkedShopping.has(key)) checkedShopping.delete(key);
      saveShoppingState();
      d.remove();
    });

    d.appendChild(left);
    d.appendChild(clearBtn);
    l.appendChild(d);
  });
}

/* ======= New: Clear all shopping items for current combined set ===== */
function clearAllShopping() {
  function normalizeItem(raw) {
    if (!raw) return "";
    let s = String(raw).trim().toLowerCase();
    s = s.replace(/[^\w\s]/g, "");
    s = s.replace(/\s+/g, ' ').trim();
    if (s.length > 3 && s.endsWith('s')) s = s.slice(0, -1);
    return s;
  }
  const currentKeys = new Set();

  plan.forEach(m => {
    if (!m || !m.items) return;
    if (m.includeInShopping === false) return;
    m.items.split(",").map(s => s.trim()).filter(Boolean).forEach(it => {
      const key = normalizeItem(it);
      if (key) currentKeys.add(key);
    });
  });

  Array.from(manualSelected).forEach(rawIdx => {
    const idx = Number(rawIdx);
    if (Number.isNaN(idx)) return;
    const m = meals[idx];
    if (!m || !m.items) return;
    m.items.split(",").map(s => s.trim()).filter(Boolean).forEach(it => {
      const key = normalizeItem(it);
      if (key) currentKeys.add(key);
    });
  });

  currentKeys.forEach(k => clearedShopping.add(k));
  currentKeys.forEach(k => { if (checkedShopping.has(k)) checkedShopping.delete(k); });

  saveShoppingState();
  renderShoppingList();
}

/* ======= Refresh shopping list (rebuild from current plan + manual selections) ===== */
function refreshShoppingList() {
  renderShoppingList();
}

/* ======= Export helper ======= */
function exportShoppingList() {
  const items = Array.from(document.querySelectorAll('#shoppingItems span')).map(el => el.textContent);
  if (!items.length) { alert('No items to export.'); return; }
  const blob = new Blob([items.join("\n")], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shopping-list.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ======= Service worker registration (safe) ===== */
if ('serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.info('ServiceWorker registered', reg.scope))
      .catch(err => console.warn('ServiceWorker registration failed', err));
  } catch (e) {
    console.warn('ServiceWorker registration error', e);
  }
}

/* Optional: scale root font-size for smoother proportional resizing */
(function(){
  function scaleRoot() {
    const w = Math.max(document.documentElement.clientWidth || 320, 320);
    const size = Math.max(14, Math.min(20, 16 * (w / 375)));
    document.documentElement.style.fontSize = size + 'px';
  }
  window.addEventListener('resize', scaleRoot);
  window.addEventListener('orientationchange', scaleRoot);
  scaleRoot();
})();

window.addEventListener('load', () => {
  if (!planSnapshot) {
    planSnapshot = computePlanSnapshot();
    localStorage.setItem('planSnapshot', planSnapshot);
  }
  renderMeals();
  renderManualList();
  renderShoppingList();
});