/* storage.js — IndexedDB persistent storage layer */

const DB_NAME = "mealPlannerDB";
const DB_VERSION = 1;
let db = null;

/* Open or upgrade the database */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      const stores = [
        "meals",
        "plan",
        "essentials",
        "manualSelected",
        "manualEssentials",
        "clearedShopping",
        "checkedShopping",
        "planSnapshot"
      ];

      stores.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      });
    };

    req.onsuccess = () => {
      db = req.result;
      resolve();
    };

    req.onerror = () => reject(req.error);
  });
}

/* Save a key/value pair into a store */
function idbSet(store, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* Read a key from a store */
function idbGet(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* Sync localStorage → IndexedDB */
async function syncStorageToIndexedDB(keys) {
  if (!db) await openDB();

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      await idbSet(key, "value", raw);
    }
  }
}

/* Restore IndexedDB → localStorage on startup */
async function restoreFromIndexedDB() {
  if (!db) await openDB();

  const keys = [
    "meals",
    "plan",
    "essentials",
    "manualSelected",
    "manualEssentials",
    "clearedShopping",
    "checkedShopping",
    "planSnapshot"
  ];

  for (const key of keys) {
    const stored = await idbGet(key, "value");
    if (stored !== undefined) {
      localStorage.setItem(key, stored);
    }
  }
}

/* Auto-restore on load */
restoreFromIndexedDB();