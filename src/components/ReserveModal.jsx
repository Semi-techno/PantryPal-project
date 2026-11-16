import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { availableQty } from '../utils/inventory.js';

/**
 * Reserve Ingredient modal.
 *
 * Lets the user "lock" a quantity of a single inventory item for an upcoming
 * meal and attach an optional note/label (e.g. "Sunday Dinner"). Reserved stock
 * stays physically in the pantry but is hidden from the Generate Recipe engine.
 *
 * The modal is purely presentational: it collects { amount, note } and hands
 * them to onReserve. All quantity math lives in utils/inventory.js.
 */
export default function ReserveModal({ open, item, onClose, onReserve, onClear, onCook }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const total = Number(item?.totalQty ?? item?.qtyValue) || 0;
  const reserved = Number(item?.reservedQty) || 0;
  const avail = item ? availableQty(item) : 0;
  const unit = item?.qtyUnit ?? '';

  // Seed the form from the item's current reservation whenever it changes.
  useEffect(() => {
    if (open && item) {
      setAmount(reserved > 0 ? String(reserved) : '');
      setNote(item.reservedNote ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const amountNum = Number(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0 && amountNum <= total;

  // Preview how availability changes if this reservation is applied.
  const previewAvailable = useMemo(
    () => Math.max(total - (amountValid ? amountNum : 0), 0),
    [total, amountNum, amountValid],
  );

  if (!open || !item) return null;

  const handleReserve = () => {
    if (!amountValid) return;
    onReserve?.(item.id, amountNum, note.trim());
    onClose?.();
  };

  const handleClear = () => {
    onClear?.(item.id);
    onClose?.();
  };

  const handleCook = () => {
    onCook?.(item.id); // consume the whole reservation
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
      <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        className="relative z-10 w-full max-w-md max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-surface rounded-t-2xl sm:rounded-xl shadow-2xl border border-outline-variant/50 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Reserve ingredient"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-outline-variant/50 bg-surface-container-low">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary text-on-primary shrink-0">
              <Icon name="bookmark_added" className="text-[20px] sm:text-[22px]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-title-sm sm:text-title-md font-bold text-on-surface leading-tight truncate">Reserve Ingredient</h2>
              <p className="text-xs sm:text-body-sm text-on-surface-variant truncate">{item.name}</p>
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
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {/* Stock summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-surface-container-low px-2 py-2.5">
              <p className="text-label-sm font-label-sm uppercase tracking-wider text-outline">Total</p>
              <p className="text-title-sm font-title-sm text-on-surface mt-0.5">{total}{unit}</p>
            </div>
            <div className="rounded-lg bg-secondary-container/30 px-2 py-2.5">
              <p className="text-label-sm font-label-sm uppercase tracking-wider text-outline">Reserved</p>
              <p className="text-title-sm font-title-sm text-secondary mt-0.5">{reserved}{unit}</p>
            </div>
            <div className="rounded-lg bg-primary-fixed/40 px-2 py-2.5">
              <p className="text-label-sm font-label-sm uppercase tracking-wider text-outline">Available</p>
              <p className="text-title-sm font-title-sm text-primary mt-0.5">{avail}{unit}</p>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1.5">
              Amount to reserve ({unit || 'units'})
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max={total}
                step="any"
                className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/70 rounded-lg text-body-md font-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-colors"
                placeholder={`Max ${total}${unit}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReserve()}
              />
              {unit && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline text-body-sm pointer-events-none">{unit}</span>
              )}
            </div>
            {amount !== '' && !amountValid && (
              <p className="text-body-sm font-body-sm text-error mt-1.5 flex items-center gap-1">
                <Icon name="error" className="text-[15px]" />
                Enter an amount between 1 and {total}{unit}.
              </p>
            )}
            {amountValid && (
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1.5">
                Recipes will then see <span className="font-semibold text-primary">{previewAvailable}{unit}</span> available.
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-1.5">
              Note / meal label (optional)
            </label>
            <input
              className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/70 rounded-lg text-body-md font-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-colors"
              placeholder="e.g. Sunday Dinner, Birthday Cake..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReserve()}
            />
          </div>

          {/* Cook reserved — only when there's an existing reservation */}
          {reserved > 0 && (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-surface-container-low">
              <p className="text-body-sm font-body-sm text-on-surface-variant">
                Cooked this meal? Deduct {reserved}{unit} from stock.
              </p>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md font-label-md text-on-primary bg-primary-container hover:bg-primary transition-colors shrink-0"
                onClick={handleCook}
                type="button"
              >
                <Icon name="skillet" className="text-[16px]" />
                Cook it
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-outline-variant/50 bg-surface-container-low">
          {reserved > 0 ? (
            <button
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-title-sm font-semibold text-secondary hover:bg-surface-container transition-colors"
              onClick={handleClear}
              type="button"
            >
              <Icon name="bookmark_remove" className="text-[17px] sm:text-[18px]" />
              Clear reservation
            </button>
          ) : (
            <button
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-title-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
          )}

          <button
            className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-xs sm:text-title-sm font-semibold transition-all active:scale-[0.98] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleReserve}
            disabled={!amountValid}
            type="button"
          >
            <Icon name="bookmark_added" className="text-[16px] sm:text-[18px]" />
            {reserved > 0 ? 'Update' : 'Reserve'}
          </button>
        </div>
      </div>
    </div>
  );
}
