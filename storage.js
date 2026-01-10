/* ============================================================
   HYBRID STORAGE MODULE
   Mirrors individual localStorage keys into IndexedDB
   (No behaviour change to your app logic)
   ============================================================ */

const HYBRID_DB_NAME = "MealPlannerHybridDB";
const HYBRID_DB_VERSION = 1;
const HYBRID_STORE_NAME = "kvStore";

/* Open or create IndexedDB */
function openHybridDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HYBRID_DB_NAME, HYBRID_DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(HYBRID_STORE_NAME)) {
        db.createObjectStore(HYBRID_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* Write a single key/value to IndexedDB */
async function hybridWriteKey(key, value) {
  try {
    const db = await openHybridDB();
    return new Promise(resolve => {
      const tx = db.transaction(HYBRID_STORE_NAME, "readwrite");
      const store = tx.objectStore(HYBRID_STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/* Public: mirror selected localStorage keys into IndexedDB */
async function syncStorageToIndexedDB(keys) {
  try {
    const db = await openHybridDB();
    await Promise.all(
      keys.map(key => {
        const value = localStorage.getItem(key);
        return new Promise(resolve => {
          const tx = db.transaction(HYBRID_STORE_NAME, "readwrite");
          const store = tx.objectStore(HYBRID_STORE_NAME);
          if (value === null || value === undefined) {
            store.delete(key);
          } else {
            store.put(value, key);
          }
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      })
    );
  } catch {
    // Fail silently – never affect app behaviour
  }
}
