import Icon from './Icon.jsx';
import RecipeHeaderCover from './RecipeHeaderCover.jsx';

/**
 * RecipeCard — shared, expandable presentation of a single recipe.
 *
 * Used by both the generator (RecipeModal) and the history view
 * (RecipeHistoryModal) so recipes render identically everywhere. Purely
 * presentational: the parent owns the open/closed state.
 *
 * @param {object}   props
 * @param {Recipe}   props.recipe    normalized recipe ({ name, ingredients, steps, ... })
 * @param {boolean}  props.open      whether the detail section is expanded
 * @param {Function} props.onToggle  called when the header is clicked
 * @param {boolean}  [props.expiringFirst] highlight this card as the "expiring first" pick
 * @param {boolean}  [props.showCover]     render the dynamic SVG cover header (default true)
 * @param {React.ReactNode} [props.meta]    optional extra header line (e.g. "2 days ago")
 * @param {React.ReactNode} [props.actions] optional controls shown in the header (e.g. delete)
 */
const DIFFICULTY_TONE = {
  Easy: 'bg-primary-fixed/50 text-primary',
  Medium: 'bg-secondary-container/40 text-secondary',
  Hard: 'bg-error-container/50 text-error',
};

export default function RecipeCard({ recipe, open, onToggle, meta, actions, expiringFirst = false, showCover = true }) {
  if (!recipe) return null;
  const missingCount = recipe.missingIngredients?.length ?? recipe.ingredients?.filter((i) => i.status === 'missing').length ?? 0;

  return (
    <div className="rounded-xl border border-outline-variant/50 overflow-hidden bg-surface-container-lowest">
      {/* Dynamic SVG illustration header (category icon + pastel gradient) */}
      {showCover && <RecipeHeaderCover recipe={recipe} expiringFirst={expiringFirst} />}

      {/* Header (click to expand) */}
      <div className="flex items-start gap-2">
        <button
          className="flex-1 flex items-start justify-between gap-3 px-4 py-3.5 text-left hover:bg-surface-container-low/60 transition-colors"
          onClick={onToggle}
          type="button"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-title-sm font-title-sm text-on-surface">{recipe.name}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm ${DIFFICULTY_TONE[recipe.difficulty] ?? DIFFICULTY_TONE.Easy}`}>
                {recipe.difficulty}
              </span>
            </div>
            {recipe.description && (
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">{recipe.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-label-md font-label-md text-outline flex-wrap">
              {recipe.time_minutes > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="schedule" className="text-[15px]" />
                  {recipe.time_minutes} min
                </span>
              )}
              {recipe.servings > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="restaurant" className="text-[15px]" />
                  {recipe.servings} serving{recipe.servings === 1 ? '' : 's'}
                </span>
              )}
              {missingCount > 0 && (
                <span className="inline-flex items-center gap-1 text-secondary">
                  <Icon name="shopping_cart" className="text-[15px]" />
                  {missingCount} missing
                </span>
              )}
              {meta && <span className="inline-flex items-center gap-1 text-outline">{meta}</span>}
            </div>
          </div>
          <Icon name={open ? 'expand_less' : 'expand_more'} className="text-[22px] text-outline shrink-0" />
        </button>
        {actions && <div className="pr-3 pt-3.5 shrink-0">{actions}</div>}
      </div>

      {/* Detail */}
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-outline-variant/40">
          {/* Ingredients */}
          {recipe.ingredients?.length > 0 && (
            <div>
              <h4 className="text-label-sm font-label-sm uppercase tracking-wider text-outline mt-3 mb-2">Ingredients</h4>
              <ul className="space-y-1.5">
                {recipe.ingredients.map((ing, i) => {
                  const missing = ing.status === 'missing';
                  return (
                    <li key={i} className="flex items-start gap-2 text-body-md font-body-md">
                      <Icon
                        name={missing ? 'cancel' : 'check_circle'}
                        className={`text-[18px] mt-0.5 shrink-0 ${missing ? 'text-secondary' : 'text-primary'}`}
                      />
                      <span className="min-w-0">
                        <span className="text-on-surface">
                          {ing.quantity && <span className="text-on-surface-variant">{ing.quantity} </span>}
                          {ing.name}
                        </span>
                        {missing && (
                          <span className="block text-body-sm font-body-sm text-secondary">
                            <span className="font-semibold">Missing.</span>{' '}
                            {ing.substitution ? <>Substitute: {ing.substitution}</> : <>Pick this up at the store.</>}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Steps */}
          {recipe.steps?.length > 0 && (
            <div>
              <h4 className="text-label-sm font-label-sm uppercase tracking-wider text-outline mb-2">How to cook</h4>
              <ol className="space-y-2">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-body-md font-body-md text-on-surface">
                    <span className="inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-primary-fixed/60 text-primary text-label-md font-label-md">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
