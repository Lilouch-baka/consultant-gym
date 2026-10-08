// Finance fundamentals track: every JSON file in ./questions/ is merged into one bank.
// To add questions, edit any of those files (or add a new .json file there) – see README.
// Loaded lazily (a separate chunk) so the first screen stays fast.
const files = import.meta.glob('./questions/*.json', { import: 'default' });

export async function loadFundamentals() {
  const keys = Object.keys(files).sort();
  const parts = await Promise.all(keys.map((k) => files[k]()));
  return parts.flat().map((q) => ({ track: 'fundamentals', ...q }));
}
