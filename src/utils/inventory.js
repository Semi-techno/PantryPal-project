/**
 * inventory.js
 *
 * Single source of truth for inventory quantity math, including the new
 * Reserved / Booked Ingredients system.
 *
 * QUANTITY MODEL
 * --------------
 * Every item now tracks two numeric fields in its base unit (qtyUnit):
 *   - totalQty    : the physical amount actually in the pantry/fridge/freezer.
 *   - reservedQty : the amount "locked" for a specific upcoming meal.
 *
 * availableQty is ALWAYS derived, never stored:
 *   availableQty = max(totalQty - reservedQty, 0)
 *
 * The recipe generator must only ever "see" availableQty, so reserved stock is
 * invisible to general recipe suggestions even though it's physically present.
 *
 * BACKWARD COMPATIBILITY
 * ----------------------
 * The existing UI renders from the legacy `qtyValue` (number) and `qty`
 * (display string) fields. We keep those in sync with totalQty so none of the
 * current table/sort/search logic has to change. Think of totalQty/reservedQty
 * as the new source of truth and qtyValue/qty as a derived display cache.
 *
 * TypeScript reference (this project is plain JS/JSX, so we express the schema
 * as a JSDoc typedef — it gives editor autocomplete without changing the build):
 *
 * @typedef {Object} InventoryItem
 * @property {string}  id
 * @property {string}  name
 * @property {string}  meta
 * @property {string}  location
 * @property {('Main Pantry'|'Fridge'|'Spices'|'Freezer')} zone
 * @property {string}  qtyUnit                     base unit, e.g. 'g' | 'ml' | 'can'
 * @property {number}  totalQty                    physical stock on hand
 * @property {number}  reservedQty                 amount locked for a meal (>= 0)
 * @property {string}  [reservedNote]              optional label, e.g. "Dinner Plan"
 * @property {string}  qty                         DERIVED display string, e.g. "250g"
 * @property {number}  qtyValue                    DERIVED mirror of totalQty (legacy)
 * @property {string}  status
 * @property {('Expiring Soon'|'Low Stock'|'Well Stocked')} freshness
 * @property {('danger'|'ok'|'frozen'|'muted')} tone
 * @property {string}  expiry                      ISO date or ''
 *
 * // availableQty is computed on demand via availableQty(item), not stored.
 */

/** Clamp a value to a finite, non-negative number. */
function toQty(n) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * The amount free to cook with: physical stock minus whatever is reserved.
 * Never negative.
 * @param {InventoryItem} item
 * @returns {number}
 */
export function availableQty(item) {
  if (!item) return 0;
  const total = toQty(item.totalQty ?? item.qtyValue);
  const reserved = toQty(item.reservedQty);
  return Math.max(total - reserved, 0);
}

/** True when an item has any amount booked for a meal. */
export function hasReservation(item) {
  return toQty(item?.reservedQty) > 0;
}

/**
 * Format a quantity + unit into the display string the table expects.
 * Mirrors the spacing used by the original INITIAL_ITEMS (e.g. "250g", "2 cans").
 * @param {number} value
 * @param {string} unit
 */
export function formatQty(value, unit) {
  const v = toQty(value);
  if (!unit) return `${v}`;
  // Weight/volume units sit flush against the number ("250g", "200ml");
  // countable units read better with a space ("2 cans", "4 pcs").
  const flush = unit === 'g' || unit === 'ml' || unit === 'kg' || unit === 'l';
  const label = v === 1 && unit === 'cans' ? 'can' : unit;
  return flush ? `${v}${label}` : `${v} ${label}`;
}

/**
 * Recompute the derived display fields (qtyValue/qty) from the canonical
 * totalQty. Call this after any mutation of totalQty so the existing table,
 * sort, and search logic keep working unchanged.
 * @param {InventoryItem} item
 * @returns {InventoryItem}
 */
export function syncDerivedQty(item) {
  const total = toQty(item.totalQty ?? item.qtyValue);
  return {
    ...item,
    totalQty: total,
    reservedQty: toQty(item.reservedQty),
    qtyValue: total,
    qty: formatQty(total, item.qtyUnit),
  };
}

/**
 * Reserve (book) an amount of an item for a meal. Reserved amount is clamped so
 * it can never exceed physical stock. Optionally attaches a note/label.
 *
 * @param {InventoryItem} item
 * @param {number} amount            amount to reserve, in the item's unit
 * @param {string} [note]            optional label, e.g. "Sunday Dinner"
 * @param {boolean} [additive=false] when true, add to any existing reservation
 * @returns {InventoryItem}
 */
export function reserveItem(item, amount, note = '', additive = false) {
  const total = toQty(item.totalQty ?? item.qtyValue);
  const base = additive ? toQty(item.reservedQty) : 0;
  const reservedQty = Math.min(base + toQty(amount), total);
  const nextNote = reservedQty > 0 ? note || item.reservedNote || '' : '';
  return syncDerivedQty({ ...item, reservedQty, reservedNote: nextNote });
}

/** Remove a reservation entirely (keeps physical stock untouched). */
export function clearReservation(item) {
  return syncDerivedQty({ ...item, reservedQty: 0, reservedNote: '' });
}

/**
 * Execute / cook a reserved meal: deduct `amount` from physical stock and
 * reduce the reservation by the same amount. Defaults to consuming the entire
 * current reservation.
 *
 * Example: Chicken totalQty=800, reservedQty=500 for "Dinner".
 *   cookReserved(item)        -> totalQty=300, reservedQty=0
 *   cookReserved(item, 200)   -> totalQty=600, reservedQty=300
 *
 * @param {InventoryItem} item
 * @param {number} [amount]  how much of the reservation to cook; defaults to all of it
 * @returns {InventoryItem}
 */
export function cookReserved(item, amount) {
  const total = toQty(item.totalQty ?? item.qtyValue);
  const reserved = toQty(item.reservedQty);
  const consume = Math.min(amount === undefined ? reserved : toQty(amount), reserved, total);

  const nextTotal = Math.max(total - consume, 0);
  const nextReserved = Math.max(reserved - consume, 0);
  const next = syncDerivedQty({ ...item, totalQty: nextTotal, reservedQty: nextReserved });
  if (nextReserved === 0) next.reservedNote = '';
  return next;
}

/**
 * Normalize an item coming from older data / other modals so it always has the
 * totalQty/reservedQty fields. Safe to run on any item.
 * @param {InventoryItem} item
 * @returns {InventoryItem}
 */
export function ensureQtyFields(item) {
  const total = toQty(item.totalQty ?? item.qtyValue);
  return syncDerivedQty({
    ...item,
    totalQty: total,
    reservedQty: toQty(item.reservedQty),
  });
}
