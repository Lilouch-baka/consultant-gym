import { openDB } from 'idb';

// All progress lives on the device in IndexedDB.
// Stores:
//   reviews           one record per question: spaced-repetition state + answer history
//   custom_questions  questions saved from the AI mentor
//   mentor_log        graded written answers and challenges
//   kv                settings and meta (streak, last export, ...)
const dbPromise = openDB('consultant-gym', 1, {
  upgrade(db) {
    db.createObjectStore('reviews', { keyPath: 'qid' });
    db.createObjectStore('custom_questions', { keyPath: 'id' });
    db.createObjectStore('mentor_log', { keyPath: 'id', autoIncrement: true });
    db.createObjectStore('kv');
  },
});

export async function getAll(store) {
  return (await dbPromise).getAll(store);
}

export async function put(store, value) {
  return (await dbPromise).put(store, value);
}

export async function del(store, key) {
  return (await dbPromise).delete(store, key);
}

export async function kvGet(key) {
  return (await dbPromise).get('kv', key);
}

export async function kvSet(key, value) {
  return (await dbPromise).put('kv', value, key);
}

export async function replaceAll({ reviews = [], custom_questions = [], mentor_log = [], kv = {} }) {
  const db = await dbPromise;
  const tx = db.transaction(['reviews', 'custom_questions', 'mentor_log', 'kv'], 'readwrite');
  await Promise.all([
    tx.objectStore('reviews').clear(),
    tx.objectStore('custom_questions').clear(),
    tx.objectStore('mentor_log').clear(),
  ]);
  for (const r of reviews) tx.objectStore('reviews').put(r);
  for (const q of custom_questions) tx.objectStore('custom_questions').put(q);
  for (const m of mentor_log) tx.objectStore('mentor_log').put(m);
  for (const [k, v] of Object.entries(kv)) tx.objectStore('kv').put(v, k);
  await tx.done;
}

// Ask the browser not to evict our storage (helps on iOS).
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // not supported
  }
  return false;
}
