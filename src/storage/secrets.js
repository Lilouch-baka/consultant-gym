// Encrypted storage for the Anthropic API key.
//
// A web app cannot reach the iPhone Keychain, so this is the closest equivalent the browser offers:
// - an AES-GCM key is generated on the device with `extractable: false`, so no script (including
//   this app) can ever read its raw bytes; the browser keeps it in IndexedDB as an opaque CryptoKey;
// - the API key is stored only as ciphertext, encrypted with that device key;
// - nothing here is part of the progress export, and the key is never logged.
// Anyone who can run code inside this app on an unlocked phone could still ask the browser to
// decrypt it, which is why the README recommends a spend limit on the key.
import { kvDel, kvGet, kvSet } from './db.js';

const DEVICE_KEY = 'secret_device_key';
const CIPHER = 'secret_api_key';

async function deviceKey() {
  let key = await kvGet(DEVICE_KEY);
  if (!key) {
    key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await kvSet(DEVICE_KEY, key);
  }
  return key;
}

export async function saveApiKey(plain) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await deviceKey(), new TextEncoder().encode(plain));
  await kvSet(CIPHER, { iv, data });
}

export async function loadApiKey() {
  const stored = await kvGet(CIPHER);
  if (!stored) return '';
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: stored.iv }, await deviceKey(), stored.data);
    return new TextDecoder().decode(plain);
  } catch {
    // Device key lost or data corrupted: treat as no key.
    return '';
  }
}

export async function clearApiKey() {
  await kvDel(CIPHER);
}
