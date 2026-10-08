// Loads every JSON file in ./questions/ and merges them into one bank.
// To add questions, edit any of those files (or add a new .json file there) – see README.
const files = import.meta.glob('./questions/*.json', { eager: true, import: 'default' });

export const SEED_QUESTIONS = Object.keys(files)
  .sort()
  .flatMap((k) => files[k]);
