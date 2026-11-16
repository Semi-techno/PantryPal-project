import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import RecipeCard from './RecipeCard.jsx';
import {
  loadHistory,
  removeHistoryEntry,
  clearHistory,
  formatSavedAt,
} from '../utils/recipeHistory.js';

/**
 * Recipe History modal — opened from the "Recipes" navbar link.
 *
 * Shows every recipe the generator has produced (persisted in localStorage via
 * utils/recipeHistory.js), newest first. Each entry is an expandable RecipeCard
 * showing when it was generated, the preferences used, and a delete control.
 * From here the user can also jump straight into generating new recipes.
 *
 * `refreshKey` lets the parent force a reload after a new generation.
 */
export default function RecipeHistoryModal({ open, onClose, onGenerate, refreshKey }) {
  const [entries, setEntries] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [query, setQuery] = useState('');

  // (Re)load from storage whenever the modal opens or the parent bumps refreshKey.
  useEffect(() => {
    if (open) {
      setEntries(loadHistory());
      setExpandedId(null);
      setQuery('');
    }
  }, [open, refreshKey]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const r = e.recipe ?? {};
      return (
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.ingredients?.some((i) => i.name?.toLowerCase().includes(q))
      );
    });
  }, [entries, query]);

  if (!open) return null;

  const handleDelete = (id) => {
    const next = removeHistoryEntry(id);
    setEntries(next);
  };

  const handleClearAll = () => {
    clearHistory();
    setEntries([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface rounded-xl shadow-2xl border border-outline-variant/50 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Recipe history"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/50 bg-surface-container-low">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-on-primary">
              <Icon name="history" className="text-[22px]" />
            </span>
            <div>
              <h2 className="text-title-md font-title-md text-on-surface leading-tight">Recipe History</h2>
              <p className="text-body-sm font-body-sm text-on-surface-variant">
                {entries.length === 0
                  ? 'Recipes you generate will be logged here.'
                  : `${entries.length} recipe${entries.length === 1 ? '' : 's'} generated so far.`}
              </p>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Search (only when there's something to search) */}
        {entries.length > 0 && (
          <div className="px-6 pt-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                <Icon name="search" className="text-[18px]" />
              </span>
              <input
                className="w-full pl-10 pr-9 py-2.5 bg-surface-container-lowest border border-outline-variant/70 rounded-lg text-body-md font-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-colors"
                placeholder="Search past recipes by name or ingredient..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface transition-colors"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  type="button"
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Empty state */}
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center gap-4 py-14">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tertiary-fixed text-primary">
                <Icon name="menu_book" className="text-[32px]" />
              </span>
              <div>
                <p className="text-title-sm font-title-sm text-on-surface">No recipes yet</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant mt-1 max-w-sm">
                  Generate recipes from your pantry and they'll show up here so you can revisit them anytime.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-title-sm font-title-sm transition-colors"
                onClick={() => {
                  onClose?.();
                  onGenerate?.();
                }}
                type="button"
              >
                <Icon name="auto_awesome" className="text-[18px]" />
                Generate recipes
              </button>
            </div>
          )}

          {/* No search matches */}
          {entries.length > 0 && filtered.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Icon name="search_off" className="text-[32px] text-outline-variant" />
              <p className="text-title-sm font-title-sm text-on-surface mt-2">No matches</p>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                Nothing in your history matches "{query}".
              </p>
            </div>
          )}

          {/* History list */}
          {filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((entry) => (
                <RecipeCard
                  key={entry.id}
                  recipe={entry.recipe}
                  open={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  meta={
                    <>
                      <Icon name="schedule" className="text-[15px]" />
                      {formatSavedAt(entry.savedAt)}
                      {entry.notes ? ` · "${entry.notes}"` : ''}
                    </>
                  }
                  actions={
                    <button
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-outline hover:text-error hover:bg-error-container/40 transition-colors"
                      onClick={() => handleDelete(entry.id)}
                      aria-label="Delete from history"
                      type="button"
                    >
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-outline-variant/50 bg-surface-container-low">
          {entries.length > 0 ? (
            <button
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-title-sm font-title-sm text-secondary hover:bg-surface-container transition-colors"
              onClick={handleClearAll}
              type="button"
            >
              <Icon name="delete_sweep" className="text-[18px]" />
              Clear history
            </button>
          ) : (
            <button
              className="px-4 py-2.5 rounded-lg text-title-sm font-title-sm text-on-surface-variant hover:bg-surface-container transition-colors"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          )}

          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-title-sm font-title-sm transition-all active:scale-[0.98] shadow-sm"
            onClick={() => {
              onClose?.();
              onGenerate?.();
            }}
            type="button"
          >
            <Icon name="auto_awesome" className="text-[18px]" />
            Generate new
          </button>
        </div>
      </div>
    </div>
  );
}
