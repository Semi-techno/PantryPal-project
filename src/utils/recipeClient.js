/**
 * recipeClient.js
 *
 * API handler for the "Recipe Generator" feature. Sends the user's current
 * pantry inventory to the GROQ API (model: llama-3.3-70b-versatile) and
 * returns STRICT JSON describing one or more recipes the user can cook with
 * what they have on hand.
 *
 * Each recipe includes:
 *   - name          : a human-readable dish name
 *   - ingredients   : every ingredient the recipe needs, each flagged as
 *                     either already in the pantry ("have") or missing
 *                     ("missing"). Missing ingredients carry a suggested
 *                     substitution drawn (when possible) from items the user
 *                     already owns.
 *   - steps         : ordered, plain-language cooking instructions.
 *
 * TRANSPORT
 * ---------
 * Groq exposes an OpenAI-compatible Chat Completions endpoint. We call it with
 * plain fetch (no SDK dependency) and request `response_format:
 * { type: "json_object" }` so the model returns a single strict JSON object.
 *
 * SECURITY NOTE (IMPORTANT)
 * -------------------------
 * This is a client-side Vite SPA with no backend. `VITE_`-prefixed env vars are
 * inlined into the browser bundle by Vite and are therefore NOT secret — the
 * Groq key ships to the client exactly like the old Gemini key did. To truly
 * hide the key you must add a server/edge proxy and move this call there. See
 * the note in .env.local. Groq is normally a server-side API, so a browser
 * call may also be rejected by CORS; if that happens a proxy is the only fix.
 *
 * Configuration (Vite env vars, set in .env.local at the project root):
 *   VITE_GROQ_API_KEY   - Groq API key (REQUIRED - no fallback)
 *   VITE_GROQ_MODEL     - model id (optional; defaults to llama-3.3-70b-versatile)
 */

import { availableQty, formatQty } from './inventory.js';

export const RECIPE_SYSTEM_PROMPT = `You are an expert home chef and meal-planning assistant. You are given a list of ingredients the user currently has AVAILABLE in their pantry/fridge/freezer. Your job is to propose realistic recipes the user can actually cook, prioritizing ingredients that are expiring soon so nothing goes to waste.

RULES FOR CHOOSING RECIPES:
- Build recipes primarily around the ingredients the user ALREADY HAS AVAILABLE.
- Strongly prefer recipes that use items marked as expiring soon or low stock first.
- It is OK for a recipe to need a few common ingredients the user does NOT have, but keep missing items to a minimum and keep them reasonable (common staples, spices, etc.). Do not design recipes that require many missing items.

RULES FOR INGREDIENTS:
- List EVERY ingredient the recipe needs, including quantities.
- For each ingredient set "status" to:
    - "have"    if the user's available list contains it (match generously, e.g. "Baby Spinach" satisfies "spinach").
    - "missing" if it is NOT in the user's available list.
- For EVERY "missing" ingredient, provide a practical "substitution": an alternative the user could use instead. When possible, suggest a substitute the user ALREADY HAS. If no good pantry substitute exists, suggest a common pantry staple and say so. For "have" ingredients, set "substitution" to an empty string "".

RULES FOR STEPS:
- Provide clear, ordered, plain-language cooking instructions a beginner can follow.
- Each step is a single string in the "steps" array. Do not number them yourself.

TOKEN ECONOMY (IMPORTANT):
- Be concise. Keep each step to one short sentence (aim for under 20 words).
- Keep "description" to a single short sentence.
- Do NOT repeat the ingredient list inside the steps.
- Output ONLY the raw JSON object — no markdown fences, no commentary before or after. Compact JSON saves tokens.

Return ONLY a JSON object with this EXACT structure (no extra text, no markdown):

{
  "recipes": [
    {
      "name": "string",
      "description": "one short sentence describing the dish",
      "difficulty": "Easy" | "Medium" | "Hard",
      "time_minutes": number,
      "servings": number,
      "ingredients": [
        {
          "name": "string",
          "quantity": "string",
          "status": "have" | "missing",
          "substitution": "string"
        }
      ],
      "steps": ["string", "string"]
    }
  ]
}`;

const API_KEY = import.meta.env?.VITE_GROQ_API_KEY ?? '';
const PREFERRED_MODEL = import.meta.env?.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export const hasRecipeKey = Boolean(API_KEY);

// Token-economy knobs (requested): cap output and lower creativity so we stay
// well under the free-tier TPM budget and are less likely to hit 429s.
const MAX_TOKENS = 1200;
const TEMPERATURE = 0.5;

// Retry / backoff tuning for 429 (rate limit) responses on a single model.
const MAX_RETRIES_PER_MODEL = 2; // initial try + 2 retries
const BASE_BACKOFF_MS = 2000; // 2s, then 4s (exponential); capped by MAX_BACKOFF_MS
const MAX_BACKOFF_MS = 8000;

/**
 * Friendly, UI-ready message shown when every model is rate-limited. The UI
 * can detect this via err.code === 'RATE_LIMIT'.
 */
export const RATE_LIMIT_MESSAGE =
  'Kitchen AI is busy right now. Please try again in 30 seconds.';

/**
 * AUTOMATIC MODEL FALLBACK STRATEGY
 * ---------------------------------
 *  1. Primary : llama-3.3-70b-versatile  (best quality)
 *  2. Fallback: llama-3.1-8b-instant     (much higher TPM/RPM on free tier)
 *  3. Safety  : qwen/qwen3.8-27b          (verified available to THIS key)
 *
 * On a 429 for one model we first retry it with backoff; if it's still limited
 * (or the model is unavailable to the key), we advance to the next model.
 *
 * NOTE: at integration time this API key did NOT have access to the Llama
 * models (Groq returned 404 model_not_found), but it does have
 * `qwen/qwen3.8-27b`. Keeping the Llama entries first means the app auto-
 * upgrades the moment the key is granted access, while still working today.
 */
const MODEL_CANDIDATES = [
  PREFERRED_MODEL, // honors VITE_GROQ_MODEL; defaults to the primary below
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'qwen/qwen3.8-27b',
].filter((m, i, arr) => m && arr.indexOf(m) === i);

/** True when a Groq error / status looks like "model not found / unsupported". */
function isModelUnavailable(status, detail) {
  if (status === 404) return true;
  const msg = String(detail ?? '').toLowerCase();
  return msg.includes('model_not_found') || msg.includes('does not exist') || msg.includes('do not have access');
}

/** Pause helper for backoff. */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * How long to wait before a 429 retry. Honors Groq's `Retry-After` header
 * (seconds) when present; otherwise uses exponential backoff (2s, 4s, …).
 * @param {Response} response
 * @param {number} attempt  0-based retry index
 */
function backoffDelayMs(response, attempt) {
  const header = response?.headers?.get?.('retry-after');
  const retryAfterSec = header ? Number(header) : NaN;
  if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
    return Math.min(retryAfterSec * 1000, MAX_BACKOFF_MS);
  }
  return Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
}

/** Build a tagged rate-limit error the UI can recognize. */
function rateLimitError() {
  const err = new Error(RATE_LIMIT_MESSAGE);
  err.code = 'RATE_LIMIT';
  return err;
}

// ── Client-side cache ──────────────────────────────────────────────────────
// Caches successful generations keyed by the exact request (inventory + prefs)
// so repeat clicks and post-429 retries can serve instantly without burning
// quota. In-memory for the session; this is a client SPA with no backend.
const RESULT_CACHE = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheKey(inventoryList, options) {
  const { count = 3, cuisine = '', notes = '' } = options;
  return JSON.stringify({ inventoryList, count, cuisine, notes });
}

/** Strip markdown code fences the model sometimes wraps JSON in. */
function stripCodeFences(text) {
  return String(text)
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

/**
 * Turn the inventory items into a compact, readable ingredient list for the
 * prompt.
 *
 * RESERVED-AWARE FILTER (Reserved / Booked Ingredients System):
 * the generator ONLY ever sees AVAILABLE stock (totalQty - reservedQty). Any
 * item with availableQty <= 0 is completely filtered out here, so reserved
 * stock is invisible to recipe generation even though it physically remains.
 *
 * @param {Array} items - inventory items ({ name, totalQty, reservedQty, freshness, ... })
 * @returns {string} a newline-separated bullet list of AVAILABLE items
 */
export function buildInventoryList(items) {
  if (!Array.isArray(items)) return '';
  return items
    .filter((it) => it && it.name)
    .map((it) => ({ it, avail: availableQty(it) }))
    // Completely drop anything with no available quantity.
    .filter(({ avail }) => avail > 0)
    .map(({ it, avail }) => {
      const qtyStr = formatQty(avail, it.qtyUnit) || it.qty || '';
      const qty = qtyStr ? ` — ${qtyStr} available` : '';
      const fresh = it.freshness ? ` (${it.freshness})` : '';
      return `- ${it.name}${qty}${fresh}`;
    })
    .join('\n');
}

/**
 * Coerce the model's JSON into our strict recipe shape. Never throws on bad
 * data; always returns a valid object so the UI can render what came back.
 *
 * @param {string|object} raw
 * @returns {{recipes: Array}}
 */
export function normalizeRecipeResult(raw) {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(stripCodeFences(raw));
    } catch {
      data = {};
    }
  }
  data = data && typeof data === 'object' ? data : {};

  // Accept either { recipes: [...] } or a single recipe object.
  const list = Array.isArray(data.recipes)
    ? data.recipes
    : data.name
      ? [data]
      : [];

  const recipes = list
    .map((r) => {
      const name = String(r?.name ?? '').trim();
      if (!name) return null;

      const ingredientsRaw = Array.isArray(r?.ingredients) ? r.ingredients : [];
      const ingredients = ingredientsRaw
        .map((ing) => {
          const ingName = String(ing?.name ?? '').trim();
          if (!ingName) return null;
          const status = ing?.status === 'missing' ? 'missing' : 'have';
          const substitution =
            status === 'missing' ? String(ing?.substitution ?? '').trim() : '';
          return {
            name: ingName,
            quantity: String(ing?.quantity ?? '').trim(),
            status,
            substitution,
          };
        })
        .filter(Boolean);

      const steps = (Array.isArray(r?.steps) ? r.steps : [])
        .map((s) => String(s ?? '').trim())
        .filter(Boolean);

      const difficulty = ['Easy', 'Medium', 'Hard'].includes(r?.difficulty)
        ? r.difficulty
        : 'Easy';
      const tRaw = Number(r?.time_minutes);
      const time_minutes = Number.isFinite(tRaw) && tRaw > 0 ? Math.round(tRaw) : 0;
      const sRaw = Number(r?.servings);
      const servings = Number.isFinite(sRaw) && sRaw > 0 ? Math.round(sRaw) : 0;

      return {
        name,
        description: String(r?.description ?? '').trim(),
        difficulty,
        time_minutes,
        servings,
        ingredients,
        steps,
        // Convenience: the list of ingredients the user needs to buy.
        missingIngredients: ingredients.filter((i) => i.status === 'missing'),
      };
    })
    .filter(Boolean);

  return { recipes };
}

/**
 * Generate recipes from the user's current inventory list via Groq.
 *
 * Only ingredients with availableQty > 0 are sent (see buildInventoryList).
 * Throws if no API key is configured or the request fails.
 *
 * @param {Array} items - inventory items from InventoryPage
 * @param {object} [options]
 * @param {number} [options.count=3]   - how many recipes to request
 * @param {string} [options.cuisine]   - optional cuisine preference
 * @param {string} [options.notes]     - optional free-text preferences (e.g. "vegetarian")
 * @returns {Promise<{recipes: Array, model: string}>}
 */
export async function generateRecipes(items, options = {}) {
  if (!hasRecipeKey) {
    throw new Error(
      'Groq API key is not configured. Set VITE_GROQ_API_KEY in your .env.local file to enable recipe generation.',
    );
  }

  const inventoryList = buildInventoryList(items);
  if (!inventoryList) {
    throw new Error('No available ingredients. Add stock (or free up reserved items) before generating recipes.');
  }

  // Serve from cache when the same pantry + preferences were requested
  // recently. This also shields the user from transient 429s.
  const key = cacheKey(inventoryList, options);
  const cached = RESULT_CACHE.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ...cached.value, cached: true };
  }

  const { count = 3, cuisine = '', notes = '' } = options;
  const preferenceLines = [
    `Suggest ${count} recipe${count === 1 ? '' : 's'}.`,
    cuisine ? `Preferred cuisine: ${cuisine}.` : '',
    notes ? `Additional preferences: ${notes}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const userPrompt = `Here is my current AVAILABLE pantry inventory (name — quantity available (freshness)):

${inventoryList}

${preferenceLines}

Prioritize using the items that are "Expiring Soon" first. For any ingredient a recipe needs that is NOT in my available list, mark it "missing" and suggest a substitution I could use instead (ideally something already available to me).`;

  const messages = [
    { role: 'system', content: RECIPE_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  let lastErr = null;
  let sawRateLimit = false;

  // Walk the model chain: primary → lighter fallback → safety model.
  for (const model of MODEL_CANDIDATES) {
    const outcome = await requestModelWithRetry(model, messages);

    if (outcome.ok) {
      const value = { ...normalizeRecipeResult(outcome.content), model: outcome.model };
      RESULT_CACHE.set(key, { at: Date.now(), value });
      return value;
    }

    // Hard-stop errors (bad key, CORS/network) should not try other models.
    if (outcome.fatal) throw outcome.error;

    if (outcome.rateLimited) sawRateLimit = true;
    lastErr = outcome.error;
    // Otherwise (429 after retries, model unavailable, empty response) fall
    // through to the next model in the chain.
  }

  // Every model failed. If rate limiting was the cause anywhere, surface the
  // friendly, UI-ready message instead of a raw 429.
  if (sawRateLimit) throw rateLimitError();

  throw new Error(
    `No available Groq model could generate recipes. Tried: ${MODEL_CANDIDATES.join(', ')}. ` +
      `Last error: ${lastErr?.message ?? lastErr}`,
  );
}

/**
 * Issue a single-model Chat Completion, retrying that model with backoff on
 * 429 before giving up on it. Returns a tagged outcome object rather than
 * throwing for recoverable cases, so the caller can decide whether to advance
 * to the next model.
 *
 * @param {string} model
 * @param {Array}  messages
 * @returns {Promise<
 *   | { ok: true, content: string, model: string }
 *   | { ok: false, fatal?: boolean, rateLimited?: boolean, error: Error }
 * >}
 */
async function requestModelWithRetry(model, messages) {
  const body = {
    model,
    messages,
    response_format: { type: 'json_object' },
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
  };

  for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
    let response;
    try {
      response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      // Network / CORS failures are not model-specific → fatal.
      return {
        ok: false,
        fatal: true,
        error: new Error(
          `Could not reach the Groq API (network or CORS error). Groq is a server-side API, so browser calls may be blocked. ${err?.message ?? err}`,
        ),
      };
    }

    if (response.ok) {
      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content ?? '';
      if (!content) {
        // Empty generation (some models do this under strict JSON) → try next model.
        return { ok: false, error: new Error(`Model "${model}" returned an empty response.`) };
      }
      return { ok: true, content, model: payload?.model || model };
    }

    // Read error detail once.
    let detail = '';
    try {
      const errJson = await response.json();
      detail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      detail = await response.text().catch(() => '');
    }

    if (response.status === 401) {
      return {
        ok: false,
        fatal: true,
        error: new Error('Groq API rejected the key (401 Unauthorized). Check VITE_GROQ_API_KEY in .env.local.'),
      };
    }

    if (isModelUnavailable(response.status, detail)) {
      // No point retrying this model; let the caller advance to the next one.
      return { ok: false, error: new Error(`Model "${model}" unavailable: ${detail}`) };
    }

    if (response.status === 429) {
      // RETRY WITH BACKOFF before giving up on this model.
      if (attempt < MAX_RETRIES_PER_MODEL) {
        const wait = backoffDelayMs(response, attempt);
        // eslint-disable-next-line no-console
        console.warn(`Groq 429 on "${model}" — retrying in ${wait}ms (attempt ${attempt + 1}/${MAX_RETRIES_PER_MODEL}).`);
        await delay(wait);
        continue; // retry same model
      }
      // Exhausted retries for this model → signal rate limit, advance model.
      return { ok: false, rateLimited: true, error: new Error(`Model "${model}" rate limited (429).`) };
    }

    // Any other HTTP error for this model → try the next model.
    return { ok: false, error: new Error(`Groq API error (${response.status}): ${detail || response.statusText}`) };
  }

  // Loop exhausted without returning (shouldn't happen) → treat as rate limited.
  return { ok: false, rateLimited: true, error: new Error(`Model "${model}" rate limited (429).`) };
}
