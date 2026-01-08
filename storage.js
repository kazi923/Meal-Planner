/* ============================================================
   HYBRID STORAGE MODULE
   Mirrors individual localStorage keys into IndexedDB
   + Export / Import backup system
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

/* ============================================================
   EXPORT INDEXEDDB
   ============================================================ */
async function exportIndexedDB() {
  try {
    const db = await openHybridDB();
    const tx = db.transaction(HYBRID_STORE_NAME, "readonly");
    const store = tx.objectStore(HYBRID_STORE_NAME);

    const exportData = {};

    return new Promise(resolve => {
      const request = store.openCursor();

      request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          exportData[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: "application/json"
          });

          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "mealplanner-backup.json";
          a.click();
          URL.revokeObjectURL(url);

          resolve(true);
        }
      };

      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/* ============================================================
   IMPORT INDEXEDDB
   ============================================================ */
async function importIndexedDB(jsonData) {
  try {
    const db = await openHybridDB();

    // Clear existing DB
    await new Promise(resolve => {
      const tx = db.transaction(HYBRID_STORE_NAME, "readwrite");
      tx.objectStore(HYBRID_STORE_NAME).clear();
      tx.oncomplete = () => resolve(true);
    });

    // Write imported keys
    await Promise.all(
      Object.entries(jsonData).map(([key, value]) =>
        hybridWriteKey(key, value)
      )
    );

    // Reload app to apply restored data
    location.reload();
  } catch {
    alert("Import failed. Invalid file or corrupted data.");
  }
}
