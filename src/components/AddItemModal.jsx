import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * AddItemModal — manual single-item entry for the pantry inventory.
 *
 * Fields: Item Name, Category / Storage Zone, Quantity & Unit, Expiry Date,
 * and Status. On submit it calls onSave with a normalized payload; the parent
 * (InventoryPage) is responsible for appending it to inventory state.
 *
 * The modal derives presentation hints (tone + freshness bucket) from the
 * chosen Status so the new row renders consistently with the rest of the table.
 */

// Storage zones shown in the sidebar filter. Keep in sync with InventoryPage ZONES.
export const STORAGE_ZONES = ['Main Pantry', 'Fridge', 'Spices', 'Freezer'];

// Category (food group) options — shown in the item meta line.
export const CATEGORIES = [
  'Produce & Fresh',
  'Dairy & Eggs',
  'Grains & Pasta',
  'Canned & Jarred',
  'Oils & Condiments',
  'Herbs & Spices',
  'Meat & Seafood',
  'Frozen',
  'Snacks & Other',
];

export const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'pack', 'can', 'bottle', 'bunch'];

// Status options. Each maps to a display tone and a freshness filter bucket.
export const STATUS_OPTIONS = [
  { value: 'Expiring Soon', tone: 'danger', freshness: 'Expiring Soon' },
  { value: 'Low Stock', tone: 'muted', freshness: 'Low Stock' },
  { value: 'Well Stocked', tone: 'ok', freshness: 'Well Stocked' },
  { value: 'Frozen', tone: 'frozen', freshness: 'Well Stocked' },
  { value: 'Out of stock', tone: 'muted', freshness: 'Low Stock' },
];

const EMPTY = {
  name: '',
  category: CATEGORIES[0],
  zone: STORAGE_ZONES[0],
  quantity: '1',
  unit: UNITS[0],
  expiry: '',
  status: STATUS_OPTIONS[0].value,
};

export default function AddItemModal({ open, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  // Reset the form whenever the modal is opened fresh.
  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setError('');
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Item name is required.');
      return;
    }
    const qtyNum = Number(form.quantity);
    if (!Number.isFinite(qtyNum) || qtyNum < 0) {
      setError('Enter a valid quantity (0 or more).');
      return;
    }

    const statusMeta =
      STATUS_OPTIONS.find((s) => s.value === form.status) ?? STATUS_OPTIONS[0];

    onSave?.({
      name,
      category: form.category,
      zone: form.zone,
      quantity: qtyNum,
      unit: form.unit,
      expiry: form.expiry, // 'YYYY-MM-DD' or ''
      status: form.status,
      tone: statusMeta.tone,
      freshness: statusMeta.freshness,
    });
    onClose?.();
  };

  const field =
    'block w-full py-2.5 px-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors';
  const labelCls = 'block text-label-md font-label-md text-on-surface mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-surface rounded-t-2xl sm:rounded-xl shadow-2xl border border-outline-variant/50 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Add item to inventory"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-outline-variant/50 bg-surface-container-low">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary text-on-primary shrink-0">
              <Icon name="add_box" className="text-[20px] sm:text-[22px]" />
            </span>
            <div>
              <h2 className="text-title-sm sm:text-title-md font-bold text-on-surface leading-tight">Add Item</h2>
              <p className="text-xs sm:text-body-sm text-on-surface-variant">
                Manually add a product to your pantry inventory.
              </p>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-3.5 sm:space-y-4">
          {/* Item name */}
          <div>
            <label className={labelCls} htmlFor="item-name">Item Name</label>
            <input
              id="item-name"
              className={field}
              placeholder="e.g. Button Mushrooms"
              value={form.name}
              onChange={(e) => {
                update({ name: e.target.value });
                if (error) setError('');
              }}
              autoFocus
            />
          </div>

          {/* Category + Zone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelCls} htmlFor="item-category">Category</label>
              <select
                id="item-category"
                className={field}
                value={form.category}
                onChange={(e) => update({ category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="item-zone">Storage Zone</label>
              <select
                id="item-zone"
                className={field}
                value={form.zone}
                onChange={(e) => update({ zone: e.target.value })}
              >
                {STORAGE_ZONES.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 sm:grid-cols-[1fr_120px] gap-3 sm:gap-4">
            <div>
              <label className={labelCls} htmlFor="item-qty">Quantity</label>
              <input
                id="item-qty"
                type="number"
                min="0"
                step="any"
                className={field}
                value={form.quantity}
                onChange={(e) => {
                  update({ quantity: e.target.value });
                  if (error) setError('');
                }}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="item-unit">Unit</label>
              <select
                id="item-unit"
                className={field}
                value={form.unit}
                onChange={(e) => update({ unit: e.target.value })}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expiry + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={labelCls} htmlFor="item-expiry">Expiry Date</label>
              <input
                id="item-expiry"
                type="date"
                className={field}
                value={form.expiry}
                onChange={(e) => update({ expiry: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="item-status">Status</label>
              <select
                id="item-status"
                className={field}
                value={form.status}
                onChange={(e) => update({ status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.value}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-body-sm font-body-sm text-error flex items-center gap-1.5">
              <Icon name="error" className="text-[16px]" />
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-outline-variant/50 bg-surface-container-low">
          <button
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-title-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-xs sm:text-title-sm font-semibold transition-all active:scale-[0.98] shadow-sm"
            onClick={handleSubmit}
            type="button"
          >
            <Icon name="add" className="text-[16px] sm:text-[18px]" />
            Add to Inventory
          </button>
        </div>
      </div>
    </div>
  );
}
