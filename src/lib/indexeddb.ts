// Minimal IndexedDB helper using native API wrapped in Promises
export interface Entry {
  id?: number;
  title: string;
  notes?: string;
  created: number;
}

const DB_NAME = 'pwa-jbcs-db';
const STORE_NAME = 'entries';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addEntry(entry: Omit<Entry, 'id' | 'created'>) {
  const db = await openDB();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const now = Date.now();
    const req = store.add({ ...entry, created: now });
    req.onsuccess = () => {
      console.log('[indexeddb] addEntry success, id=', req.result, 'title=', entry.title);
      resolve(req.result as number);
    };
    req.onerror = () => {
      console.error('[indexeddb] addEntry error', req.error);
      reject(req.error);
    };
  });
}

export async function getAllEntries(): Promise<Entry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      console.log('[indexeddb] getAllEntries count=', (req.result || []).length);
      resolve(req.result as Entry[]);
    };
    req.onerror = () => {
      console.error('[indexeddb] getAllEntries error', req.error);
      reject(req.error);
    };
  });
}

export async function clearEntries() {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => {
      console.log('[indexeddb] clearEntries success');
      resolve();
    };
    req.onerror = () => {
      console.error('[indexeddb] clearEntries error', req.error);
      reject(req.error);
    };
  });
}
  
export async function deleteEntry(id: number) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => {
      console.log('[indexeddb] deleteEntry success id=', id);
      resolve();
    };
    req.onerror = () => {
      console.error('[indexeddb] deleteEntry error id=', id, req.error);
      reject(req.error);
    };
  });
}
