/**
 * recipeHistory.js
 *
 * Lightweight persistence for the "Recipes" history view. Every time the user
 * generates recipes, each recipe is appended here so the Recipes navbar can
 * show a running log of what's been suggested — surviving page reloads via
 * localStorage.
 *
 * Storage is best-effort: if localStorage is unavailable (SSR, privacy mode,
 * quota), reads return [] and writes no-op instead of throwing.
 *
 * Entry shape (a saved recipe + metadata):
 *   {
 *     id:        string,     // unique history id
 *     savedAt:   number,     // epoch ms when generated
 *     model:     string,     // which Gemini model produced it
 *     notes:     string,     // the preferences the user typed (if any)
 *     recipe:    Recipe,     // the full recipe object (name, ingredients, steps, ...)
 *   }
 */

const STORAGE_KEY = 'pantrypal.recipeHistory.v1';
const MAX_ENTRIES = 100; // cap so the log can't grow unbounded

function safeStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Read the full history, newest first. Never throws. */
export function loadHistory() {
  const store = safeStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Overwrite the stored history. Never throws. */
function writeHistory(entries) {
  const store = safeStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* ignore quota / serialization errors */
  }
}

let counter = 0;
function makeId() {
  counter += 1;
  return `rh_${Date.now()}_${counter}`;
}

/**
 * Append a batch of freshly generated recipes to the history.
 *
 * @param {Array} recipes            the recipes array from generateRecipes()
 * @param {object} [meta]
 * @param {string} [meta.model]      model id that produced them
 * @param {string} [meta.notes]      user preference text
 * @returns {Array} the updated history (newest first)
 */
export function addRecipesToHistory(recipes, meta = {}) {
  if (!Array.isArray(recipes) || recipes.length === 0) return loadHistory();
  const savedAt = Date.now();
  const newEntries = recipes.map((recipe) => ({
    id: makeId(),
    savedAt,
    model: meta.model ?? '',
    notes: meta.notes ?? '',
    recipe,
  }));
  const next = [...newEntries, ...loadHistory()].slice(0, MAX_ENTRIES);
  writeHistory(next);
  return next;
}

/** Remove a single history entry by id. Returns the updated history. */
export function removeHistoryEntry(id) {
  const next = loadHistory().filter((e) => e.id !== id);
  writeHistory(next);
  return next;
}

/** Wipe the entire history. */
export function clearHistory() {
  writeHistory([]);
  return [];
}

/**
 * Human-friendly relative timestamp, e.g. "just now", "5 min ago", "2 days ago".
 * Falls back to a locale date string for anything older than a week.
 */
export function formatSavedAt(ms) {
  const diff = Date.now() - Number(ms || 0);
  if (!Number.isFinite(diff) || diff < 0) return '';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  try {
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}
