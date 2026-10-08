import { openDB } from 'idb';

// All progress lives on the device in IndexedDB.
// Stores:
//   reviews           one record per question: spaced-repetition state + answer history
//   custom_questions  questions saved from the AI mentor
//   mentor_log        graded written answers (score 0-3, error tag, reason)
//   kv                settings, meta (streak, last export), token usage, weekly diagnosis,
//                     and the encrypted API key (see secrets.js)
//   drafts            (v2) half-written answers and unfinished sessions, keyed by a string
//   partner_attempts  (v2) one record per partner-question attempt (scorecard, error patterns)
//
// Upgrades only ever ADD stores. Existing data is never cleared.
const dbPromise = openDB('consultant-gym', 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      db.createObjectStore('reviews', { keyPath: 'qid' });
      db.createObjectStore('custom_questions', { keyPath: 'id' });
      db.createObjectStore('mentor_log', { keyPath: 'id', autoIncrement: true });
      db.createObjectStore('kv');
    }
    if (oldVersion < 2) {
      db.createObjectStore('drafts');
      db.createObjectStore('partner_attempts', { keyPath: 'id', autoIncrement: true });
    }
  },
});

export async function get(store, key) {
  return (await dbPromise).get(store, key);
}

export async function putKey(store, key, value) {
  return (await dbPromise).put(store, value, key);
}

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

export async function kvDel(key) {
  return (await dbPromise).delete('kv', key);
}

// Used only by an explicit import that the user confirmed.
export async function replaceAll({ reviews = [], custom_questions = [], mentor_log = [], partner_attempts = [], kv = {} }) {
  const db = await dbPromise;
  const tx = db.transaction(['reviews', 'custom_questions', 'mentor_log', 'partner_attempts', 'kv'], 'readwrite');
  await Promise.all([
    tx.objectStore('reviews').clear(),
    tx.objectStore('custom_questions').clear(),
    tx.objectStore('mentor_log').clear(),
    tx.objectStore('partner_attempts').clear(),
  ]);
  for (const r of reviews) tx.objectStore('reviews').put(r);
  for (const q of custom_questions) tx.objectStore('custom_questions').put(q);
  for (const m of mentor_log) tx.objectStore('mentor_log').put(m);
  for (const a of partner_attempts) tx.objectStore('partner_attempts').put(a);
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
