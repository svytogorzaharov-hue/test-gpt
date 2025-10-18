import type { CharacterDTO } from "../domain/types";

const DB_NAME = "cer-roster";
const STORE_NAME = "state";
const VERSION = 1;

interface PersistedState {
  characters: CharacterDTO[];
  factors: string[];
  fatigue: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

export async function saveState(state: PersistedState): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(state, "app");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Failed to save state"));
    });
    db.close();
  } catch (error) {
    console.warn("Falling back to localStorage for persistence", error);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORE_NAME, JSON.stringify(state));
    }
  }
}

export async function loadState(): Promise<PersistedState | undefined> {
  try {
    const db = await openDatabase();
    const result = await new Promise<PersistedState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get("app");
      request.onsuccess = () => resolve(request.result as PersistedState | undefined);
      request.onerror = () => reject(request.error ?? new Error("Failed to load state"));
    });
    db.close();
    return result;
  } catch (error) {
    console.warn("IndexedDB load failed, attempting localStorage", error);
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORE_NAME);
      return raw ? (JSON.parse(raw) as PersistedState) : undefined;
    }
    return undefined;
  }
}

export async function clearState(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete("app");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Failed to clear state"));
    });
    db.close();
  } catch (error) {
    console.warn("Failed to clear IndexedDB state", error);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORE_NAME);
    }
  }
}
