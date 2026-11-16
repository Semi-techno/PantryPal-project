/**
 * visionClient.js
 *
 * API handler for the "Smart Input" feature. Sends an uploaded image to the
 * Google Gemini Vision API (via the official @google/genai SDK) and returns a
 * STRICT JSON payload classifying the image as a receipt or product photo and
 * listing the actually-extracted items.
 *
 * IMPORTANT: There is NO mock / dummy data path. Every call hits the live
 * Gemini API. If the key is missing or the request fails, analyzeImage throws
 * so the UI can surface a real error instead of silently showing fake items.
 *
 * The image is Base64-encoded (via fileToBase64) before being sent, because
 * Gemini's inlineData field needs the raw pixel bytes to "see" it.
 *
 * MODEL 404 NOTE:
 *   Google has retired the gemini-1.5-* line for many API keys, which surfaces
 *   as: "404 models/gemini-1.5-flash is not found for API version v1beta".
 *   We therefore default to the `gemini-flash-latest` alias and automatically
 *   fall back through a list of current flash models until one works.
 *
 * Expected response shape (validated by normalizeVisionResult):
 *   {
 *     "image_type": "receipt" | "product",
 *     "items": [ { "name": string, "quantity": number, "price": number } ]
 *   }
 *
 * Configuration (Vite env vars, set in a .env.local file at the project root):
 *   VITE_GEMINI_API_KEY   - Google AI Studio API key (REQUIRED - no fallback)
 *   VITE_GEMINI_MODEL     - preferred model (optional; tried first)
 */

import { GoogleGenAI } from '@google/genai';

export const VISION_SYSTEM_PROMPT = `You are an expert grocery and pantry assistant with strong vision and OCR skills. Analyze ONLY what is actually shown in the provided image. Do not invent items that are not visible.

STEP 1 — Classify the image:
- "receipt" if it is a printed/handwritten receipt, invoice, or bill listing purchased items.
- "product" if it is a photo of one or more physical grocery/pantry products (packaged goods, produce, bottles, cans, boxes, etc.).

STEP 2 — Extract items:

If it is a RECEIPT:
- Read the printed text carefully. Extract each line item's exact name, quantity, and price as written.
- If a price is unreadable or not shown, use 0.

If it is a PRODUCT photo:
- Identify each distinct product you can actually see. Use clearly visible cues: brand name and text on the label, the product category/type (e.g. "Milk", "Eggs", "Instant Noodles"), packaging shape, and color.
- Give each product a concise, human-readable name. Prefer "Brand + Product" when the brand is legible (e.g. "Indomie Fried Noodles"); otherwise use the generic product name (e.g. "Bananas").
- Set quantity to the number of that same product visible in the image (e.g. 3 identical cans = quantity 3). If unsure, use 1.
- Product photos usually have no price. Set price to 0 unless a price tag is clearly visible.

RULES:
- Base every item on visible evidence in THIS image. Never list a product that is not actually there.
- If the image is too blurry or unclear to identify anything, return an empty items array.

Return ONLY a JSON object with this exact structure (no extra text):

{
  "image_type": "receipt" | "product",
  "items": [
    {
      "name": "string",
      "quantity": number,
      "price": number
    }
  ]
}`;

const API_KEY = import.meta.env?.VITE_GEMINI_API_KEY ?? '';
const PREFERRED_MODEL = import.meta.env?.VITE_GEMINI_MODEL ?? '';

export const hasVisionKey = Boolean(API_KEY);

/**
 * Candidate models, tried in order. `gemini-flash-latest` is an alias that
 * always resolves to the current flash model, which sidesteps the 1.5 404s.
 * A user-provided VITE_GEMINI_MODEL (if any) is tried first.
 */
const MODEL_CANDIDATES = [
  PREFERRED_MODEL,
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
].filter(Boolean);

// Lazily-created singleton SDK client.
let aiClient = null;
function getClient() {
  if (!hasVisionKey) {
    throw new Error(
      'Vision API key is not configured. Set VITE_GEMINI_API_KEY in your .env.local file to enable real extraction.',
    );
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: API_KEY });
  }
  return aiClient;
}

/**
 * Convert a File/Blob into a RAW Base64 string (no "data:...;base64," prefix).
 * This is exactly the format Gemini's inlineData.data field expects.
 * e.g. "iVBORw0KGgoAAAANSUhEUgAA..."
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a File/Blob into a full Base64 data URL, including the MIME prefix.
 * e.g. "data:image/png;base64,iVBORw0KGgo..." (handy for previews).
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.readAsDataURL(file);
  });
}

/** Strip markdown code fences the model sometimes wraps JSON in. */
function stripCodeFences(text) {
  return String(text)
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

/**
 * Coerce the model's JSON into our strict shape. Never throws on bad data;
 * always returns a valid object so the UI can render what the model returned.
 * Note: this does NOT invent items — an empty/invalid response yields [].
 */
export function normalizeVisionResult(raw) {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(stripCodeFences(raw));
    } catch {
      data = {};
    }
  }
  data = data && typeof data === 'object' ? data : {};

  const image_type = data.image_type === 'receipt' || data.image_type === 'product' ? data.image_type : 'product';

  const items = Array.isArray(data.items) ? data.items : [];
  const normItems = items
    .map((it) => {
      const name = String(it?.name ?? '').trim();
      if (!name) return null;
      // Preserve what the model actually read. Only clamp invalid numbers;
      // do not substitute values that would misrepresent the image.
      const qRaw = Number(it?.quantity);
      const quantity = Number.isFinite(qRaw) && qRaw > 0 ? qRaw : 1;
      const pRaw = Number(it?.price);
      const price = Number.isFinite(pRaw) && pRaw >= 0 ? pRaw : 0;
      return { name, quantity, price };
    })
    .filter(Boolean);

  return { image_type, items: normItems };
}

/** True when an SDK error looks like a "model not found / unsupported" 404. */
function isModelNotFound(err) {
  const msg = String(err?.message ?? err ?? '').toLowerCase();
  return msg.includes('not found') || msg.includes('not supported') || msg.includes('404');
}

/**
 * True when an error is a quota / rate-limit (429 RESOURCE_EXHAUSTED). Many
 * free-tier keys have a per-model quota (often 0 for "pro" models), so when one
 * model is exhausted we try the next candidate instead of failing outright.
 */
function isQuotaExceeded(err) {
  const msg = String(err?.message ?? err ?? '').toLowerCase();
  return msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota');
}

/**
 * Lists models available to the configured key. Useful for debugging 404s.
 * @returns {Promise<string[]>} model names (e.g. "models/gemini-2.5-flash")
 */
export async function listModels() {
  const ai = getClient();
  const names = [];
  const pager = await ai.models.list();
  for await (const m of pager) {
    if (m?.name) names.push(m.name);
  }
  return names;
}

/**
 * Send the Base64-encoded image to the live Gemini Vision API and return
 * normalized JSON. Tries each candidate model until one succeeds. Throws if
 * no API key is configured or all candidates fail.
 *
 * @param {File} file - the uploaded image file
 * @returns {Promise<{image_type: 'receipt'|'product', items: Array, model: string}>}
 */
export async function analyzeImage(file) {
  if (!file) throw new Error('No image provided.');
  const ai = getClient();

  // CRITICAL: Base64-encode the image so Gemini receives the actual pixels.
  const base64 = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  // Request payload shared across model attempts. The SDK handles the
  // "models/" prefix internally, so we pass the bare model id.
  const request = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Extract only what is actually visible in this image. Do not add items that are not present.' },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
    config: {
      systemInstruction: VISION_SYSTEM_PROMPT,
      // Enforce a JSON response from Gemini.
      responseMimeType: 'application/json',
      // Low (but not zero) temperature: grounded reading while still allowing
      // the model enough leeway to correctly identify products visually.
      temperature: 0.1,
    },
  };

  let lastErr = null;
  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await ai.models.generateContent({ model, ...request });
      const text = (response?.text ?? '').trim();

      if (!text) {
        const blockReason = response?.promptFeedback?.blockReason;
        throw new Error(blockReason ? `Gemini blocked the request (${blockReason}).` : 'Gemini returned an empty response.');
      }

      return { ...normalizeVisionResult(text), model };
    } catch (err) {
      lastErr = err;
      // Fall through to the next candidate when the model is unavailable (404)
      // or this model's quota is exhausted (429). Any other error (bad key,
      // safety block, malformed request) should surface immediately.
      if (isModelNotFound(err) || isQuotaExceeded(err)) continue;
      throw new Error(`Gemini API error: ${err?.message ?? err}`);
    }
  }

  // If we got here, every candidate failed. Give a clearer message when the
  // root cause was quota so the user knows it's billing/limits, not the app.
  if (isQuotaExceeded(lastErr)) {
    throw new Error(
      'Gemini API quota exceeded for all available models. Your API key has hit its free-tier rate limit. ' +
        'Please wait a few minutes and try again, or enable billing on your Google AI Studio project. ' +
        `(Tried: ${MODEL_CANDIDATES.join(', ')})`,
    );
  }

  throw new Error(
    `No available Gemini model could process the image. Tried: ${MODEL_CANDIDATES.join(', ')}. ` +
      `Last error: ${lastErr?.message ?? lastErr}`,
  );
}
