import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import RecipeCard from './RecipeCard.jsx';
import { generateRecipes, hasRecipeKey, RATE_LIMIT_MESSAGE } from '../utils/recipeClient.js';
import { addRecipesToHistory } from '../utils/recipeHistory.js';

/**
 * Recipe Generator modal.
 *
 * Takes the current pantry `items` (from InventoryPage) and asks Gemini for
 * recipes the user can cook. Each recipe shows:
 *   - its name, a short description, difficulty / time / servings
 *   - a full ingredient list, with every item tagged "In pantry" or "Missing"
 *   - a suggested substitution for each missing ingredient
 *   - ordered cooking steps
 *
 * Flow (phase): idle -> loading -> results | error
 */
export default function RecipeModal({ open, onClose, items = [], onHistoryChange }) {
  const [phase, setPhase] = useState('idle');
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState('');
  const [isRateLimit, setIsRateLimit] = useState(false);
  const [notes, setNotes] = useState('');
  const [expanded, setExpanded] = useState(0); // index of the open recipe card

  const reset = useCallback(() => {
    setPhase('idle');
    setRecipes([]);
    setError('');
    setIsRateLimit(false);
    setNotes('');
    setExpanded(0);
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleGenerate = async () => {
    setError('');
    setIsRateLimit(false);
    setPhase('loading');
    try {
      const result = await generateRecipes(items, { count: 3, notes: notes.trim() });
      setRecipes(result.recipes);
      setExpanded(0);
      setPhase('results');
      if (result.recipes.length === 0) {
        setError('No recipes could be generated. Try adding more items or adjusting your preferences.');
      } else {
        // Log every generated recipe to the persistent history so the
        // "Recipes" navbar can show what's been suggested over time.
        addRecipesToHistory(result.recipes, { model: result.model, notes: notes.trim() });
        onHistoryChange?.();
      }
    } catch (err) {
      console.error(err);
      const rateLimited = err?.code === 'RATE_LIMIT' || err?.message === RATE_LIMIT_MESSAGE;
      setIsRateLimit(rateLimited);
      setError(
        rateLimited
          ? RATE_LIMIT_MESSAGE
          : err?.message || 'Failed to generate recipes. Please try again.',
      );
      setPhase('error');
    }
  };

  if (!open) return null;

  const availableCount = items.filter((it) => it?.qtyValue === undefined || it.qtyValue > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-surface rounded-t-2xl sm:rounded-xl shadow-2xl border border-outline-variant/50 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Generate recipes from your pantry"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-outline-variant/50 bg-surface-container-low">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary text-on-primary shrink-0">
              <Icon name="skillet" className="text-[20px] sm:text-[22px]" />
            </span>
            <div>
              <h2 className="text-title-sm sm:text-title-md font-bold text-on-surface leading-tight">Recipe Ideas</h2>
              <p className="text-xs sm:text-body-sm text-on-surface-variant">
                Cook something with what's in your pantry — we flag anything you're missing.
              </p>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            onClick={handleClose}
            aria-label="Close"
            type="button"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          {/* Step: idle */}
          {phase === 'idle' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-container-low text-body-sm font-body-sm text-on-surface-variant">
                <Icon name="inventory_2" className="text-[18px] text-primary" />
                Using <span className="font-semibold text-on-surface">{availableCount}</span> available item{availableCount === 1 ? '' : 's'} from your pantry. We'll prioritize anything expiring soon.
              </div>

              <div>
                <label className="block text-label-md font-label-md text-on-surface mb-1.5">
                  Any preferences? (optional)
                </label>
                <input
                  className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/70 rounded-lg text-body-md font-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-colors"
                  placeholder="e.g. vegetarian, quick dinner, Italian..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
              </div>

              {!hasRecipeKey && (
                <p className="text-body-sm font-body-sm text-error flex items-center gap-1.5">
                  <Icon name="warning" className="text-[16px]" />
                  Groq API key missing. Set VITE_GROQ_API_KEY in your .env.local to enable recipe generation.
                </p>
              )}
              {error && (
                <p className="text-body-sm font-body-sm text-error flex items-center gap-1.5">
                  <Icon name="error" className="text-[16px]" />
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Step: loading */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center text-center gap-5 py-14">
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tertiary-fixed text-primary">
                <Icon name="skillet" className="text-[32px] animate-pulse" />
              </span>
              <div className="flex items-center gap-2 text-title-sm font-title-sm text-on-surface">
                <Icon name="progress_activity" className="text-[20px] animate-spin text-primary" />
                Cooking up recipe ideas...
              </div>
              <p className="text-body-sm font-body-sm text-on-surface-variant max-w-sm">
                Matching your pantry ingredients and finding substitutions for anything missing.
              </p>
            </div>
          )}

          {/* Step: error */}
          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center text-center gap-4 py-12">
              {isRateLimit ? (
                <>
                  <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary-container/50 text-secondary">
                    <Icon name="hourglass_top" className="text-[28px]" />
                  </span>
                  <div>
                    <p className="text-title-sm font-title-sm text-on-surface">The kitchen's a little busy</p>
                    <p className="text-body-sm font-body-sm text-on-surface-variant mt-1 max-w-sm">{error}</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-error-container text-error">
                    <Icon name="report" className="text-[28px]" />
                  </span>
                  <p className="text-title-sm font-title-sm text-on-surface max-w-md">{error}</p>
                </>
              )}
              <button
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-title-sm font-title-sm transition-colors"
                onClick={reset}
                type="button"
              >
                <Icon name="refresh" className="text-[18px]" />
                Try again
              </button>
            </div>
          )}

          {/* Step: results */}
          {phase === 'results' && (
            <div className="space-y-4">
              {error && (
                <p className="text-body-sm font-body-sm text-secondary flex items-center gap-1.5">
                  <Icon name="info" className="text-[16px]" />
                  {error}
                </p>
              )}

              {recipes.map((recipe, idx) => (
                <RecipeCard
                  key={`${recipe.name}-${idx}`}
                  recipe={recipe}
                  open={expanded === idx}
                  onToggle={() => setExpanded(expanded === idx ? -1 : idx)}
                  expiringFirst={idx === 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-outline-variant/50 bg-surface-container-low">
          <button
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-title-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
            onClick={handleClose}
            type="button"
          >
            Close
          </button>

          {(phase === 'idle' || phase === 'results') && (
            <button
              className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-xs sm:text-title-sm font-semibold transition-all active:scale-[0.98] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleGenerate}
              disabled={availableCount === 0}
              type="button"
            >
              <Icon name="auto_awesome" className="text-[16px] sm:text-[18px]" />
              {phase === 'results' ? 'Regenerate' : 'Generate Recipes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
