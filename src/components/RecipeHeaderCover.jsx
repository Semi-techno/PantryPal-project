import {
  Soup,
  Salad,
  Drumstick,
  Wheat,
  Croissant,
  Fish,
  UtensilsCrossed,
  CheckCheck,
  Flame,
  Vegan,
} from 'lucide-react';

/**
 * RecipeHeaderCover
 *
 * A lightweight, dependency-free (no external image APIs) visual header for a
 * recipe card. It derives a category from the recipe's title + ingredients and
 * renders a soft pastel CSS gradient with a central Lucide food icon, a subtle
 * watermark icon, and status badges overlaid in the corners.
 *
 * This file is plain JSX (the project is JS, not TS). The TypeScript-style
 * contract is expressed via JSDoc typedefs so editors still get autocomplete:
 *
 * @typedef {'soup'|'salad'|'meat'|'grain'|'bakery'|'default'} RecipeCategory
 *
 * @typedef {Object} RecipeVisualTheme
 * @property {RecipeCategory}  category   matched category key
 * @property {string}          label      human label, e.g. "Salad"
 * @property {React.ComponentType} Icon   main Lucide icon component
 * @property {React.ComponentType} Accent watermark Lucide icon component
 * @property {string}          gradient   tailwind gradient classes (from-* to-*)
 * @property {string}          iconColor  tailwind text color for the icon
 */

/**
 * Keyword tables per category. Order matters: the first category with a keyword
 * hit (scanned title first, then ingredients) wins, except we let the strongest
 * signal win via a simple score so e.g. "Chicken Noodle Soup" reads as soup.
 */
const CATEGORY_RULES = [
  {
    category: 'soup',
    label: 'Soup',
    Icon: Soup,
    Accent: Soup,
    gradient: 'from-amber-100 to-orange-200',
    iconColor: 'text-orange-500',
    keywords: ['soup', 'stew', 'broth', 'chowder', 'bisque', 'ramen', 'pho', 'curry'],
  },
  {
    category: 'salad',
    label: 'Salad',
    Icon: Salad,
    Accent: Vegan,
    gradient: 'from-emerald-100 to-teal-200',
    iconColor: 'text-emerald-600',
    keywords: ['salad', 'veggie', 'vegetable', 'vegan', 'vegetarian', 'greens', 'spinach', 'lettuce', 'kale', 'slaw'],
  },
  {
    category: 'meat',
    label: 'Protein',
    Icon: Drumstick,
    Accent: Flame,
    gradient: 'from-rose-100 to-orange-100',
    iconColor: 'text-rose-500',
    keywords: ['chicken', 'poultry', 'beef', 'pork', 'steak', 'meat', 'lamb', 'turkey', 'bacon', 'sausage', 'drumstick', 'protein'],
  },
  {
    category: 'grain',
    label: 'Pasta & Grains',
    Icon: Wheat,
    Accent: Wheat,
    gradient: 'from-yellow-100 to-amber-200',
    iconColor: 'text-amber-600',
    keywords: ['pasta', 'noodle', 'spaghetti', 'macaroni', 'risotto', 'rice', 'grain', 'quinoa', 'couscous', 'lentil', 'bean', 'linguine', 'penne'],
  },
  {
    category: 'bakery',
    label: 'Bakery',
    Icon: Croissant,
    Accent: Croissant,
    gradient: 'from-stone-100 to-amber-100',
    iconColor: 'text-amber-700',
    keywords: ['bread', 'pastry', 'bakery', 'cake', 'cookie', 'muffin', 'croissant', 'bun', 'roll', 'pie', 'tart', 'dough', 'pancake', 'waffle'],
  },
  {
    category: 'seafood',
    label: 'Seafood',
    Icon: Fish,
    Accent: Fish,
    gradient: 'from-sky-100 to-indigo-100',
    iconColor: 'text-sky-600',
    keywords: ['fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'seafood', 'crab', 'lobster', 'cod', 'squid', 'clam', 'mussel', 'oyster'],
  },
];

const DEFAULT_THEME = {
  category: 'default',
  label: 'Dish',
  Icon: UtensilsCrossed,
  Accent: UtensilsCrossed,
  gradient: 'from-sky-100 to-indigo-100',
  iconColor: 'text-indigo-500',
};

/**
 * Analyze a recipe's title + ingredient names and return a matching visual
 * theme (Lucide icon + pastel gradient). Keyword hits in the TITLE count double
 * so the dish name dominates (a "Beef Noodle Soup" reads as soup/meat by the
 * strongest signal, title-weighted).
 *
 * @param {string}   title       recipe name
 * @param {string[]} ingredients list of ingredient names
 * @returns {RecipeVisualTheme}
 */
export function getRecipeVisualTheme(title = '', ingredients = []) {
  const titleText = String(title).toLowerCase();
  const ingredientText = (Array.isArray(ingredients) ? ingredients : [])
    .map((i) => String(i ?? '').toLowerCase())
    .join(' ');

  let best = null;
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (titleText.includes(kw)) score += 2; // title signal is stronger
      if (ingredientText.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }

  const theme = best && bestScore > 0 ? best : DEFAULT_THEME;
  const { keywords, ...rest } = theme; // don't leak the keyword list to callers
  return rest;
}

/**
 * Small pill badge overlaid on the cover.
 * @param {{ icon?: React.ComponentType, children: React.ReactNode, className?: string }} props
 */
function CoverBadge({ icon: BadgeIcon, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm shadow-sm text-[11px] font-semibold leading-none ${className}`}
    >
      {BadgeIcon && <BadgeIcon className="w-3 h-3" strokeWidth={2.5} />}
      {children}
    </span>
  );
}

/**
 * RecipeHeaderCover component.
 *
 * @param {Object}   props
 * @param {Object}   props.recipe    normalized recipe ({ name, ingredients, ... })
 * @param {boolean}  [props.expiringFirst] show an "Expiring first" badge (top-left)
 * @param {string}   [props.className]
 */
export default function RecipeHeaderCover({ recipe, expiringFirst = false, className = '' }) {
  const ingredients = recipe?.ingredients ?? [];
  const ingredientNames = ingredients.map((i) => i?.name ?? '');
  const theme = getRecipeVisualTheme(recipe?.name ?? '', ingredientNames);
  const { Icon, Accent } = theme;

  // Match quality: share of ingredients the user already has.
  const total = ingredients.length;
  const have = ingredients.filter((i) => i?.status === 'have').length;
  const matchPct = total > 0 ? Math.round((have / total) * 100) : 0;

  // Treat salad/veggie dishes with no meat/seafood as "Vegan"-ish for the badge.
  const isVeg = theme.category === 'salad';

  return (
    <div
      className={`relative h-28 sm:h-36 w-full rounded-t-xl overflow-hidden bg-gradient-to-br ${theme.gradient} ${className}`}
    >
      {/* Subtle geometric watermark accents */}
      <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/30" />
        <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-white/20" />
        <Accent
          className="absolute bottom-2 sm:bottom-3 right-3 sm:right-4 w-16 h-16 sm:w-20 sm:h-20 text-white/40"
          strokeWidth={1.25}
          aria-hidden="true"
        />
      </div>

      {/* Centered main icon with circular backdrop */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="p-2 sm:p-3 bg-white/70 backdrop-blur-sm rounded-full shadow-sm">
          <Icon className={`w-8 h-8 sm:w-10 sm:h-10 ${theme.iconColor}`} strokeWidth={1.75} aria-hidden="true" />
        </span>
      </div>

      {/* Top-left badges */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5">
        {expiringFirst && (
          <CoverBadge icon={Flame} className="text-orange-700">
            Expiring first
          </CoverBadge>
        )}
        {isVeg && (
          <CoverBadge icon={Vegan} className="text-emerald-700">
            Vegan
          </CoverBadge>
        )}
      </div>

      {/* Top-right badges */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {total > 0 && (
          <CoverBadge
            icon={CheckCheck}
            className={matchPct === 100 ? 'text-emerald-700' : 'text-slate-700'}
          >
            {matchPct}% match
          </CoverBadge>
        )}
      </div>

      {/* Category label, bottom-left */}
      <span className="absolute bottom-3 left-3 text-[11px] font-semibold uppercase tracking-wider text-white/90 drop-shadow-sm">
        {theme.label}
      </span>
    </div>
  );
}
