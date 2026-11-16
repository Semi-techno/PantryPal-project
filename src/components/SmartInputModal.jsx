import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { analyzeImage, hasVisionKey } from '../utils/visionClient.js';

/**
 * Smart Input — single auto-detecting image upload.
 *
 * Flow (phase): idle -> processing -> review | error
 *  - idle:        one upload area "Upload Image (Receipt / Product)"
 *  - processing:  loading indicator while the AI Vision call runs
 *  - review:      type badge (Detected: Receipt/Product) + editable list
 *  - error:       retry
 *
 * The AI auto-detects receipt vs product; the user never picks a type.
 * Items are editable (name / quantity / price), deletable, and new rows
 * can be added manually. "Save to Inventory" performs a bulk insert via
 * the onSave callback.
 */
export default function SmartInputModal({ open, onClose, onSave }) {
  const [phase, setPhase] = useState('idle');
  const [imageUrl, setImageUrl] = useState('');
  const [imageType, setImageType] = useState(null); // 'receipt' | 'product'
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const rowId = useRef(0);
  const nextRowId = () => `row_${rowId.current++}`;

  const reset = useCallback(() => {
    setPhase('idle');
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
    setImageType(null);
    setItems([]);
    setError('');
    setDragging(false);
    setSaving(false);
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

  // Upload + auto-analyze in one step — no manual type selection.
  const handleFile = async (file) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image is larger than 10MB. Try a smaller or cropped photo.');
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setPhase('processing');

    try {
      const result = await analyzeImage(file); // { image_type, items: [{name, quantity, price}] }
      setImageType(result.image_type);
      setItems(result.items.map((it) => ({ id: nextRowId(), ...it })));
      setPhase('review');
      if (result.items.length === 0) {
        setError('No items could be extracted. Add rows manually or try a clearer image.');
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to analyze the image. Please try again.');
      setPhase('error');
    }
  };

  const onFileInput = (e) => handleFile(e.target.files?.[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const updateItem = (id, patch) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));
  const addItem = () =>
    setItems((prev) => [...prev, { id: nextRowId(), name: '', quantity: 1, price: 0 }]);

  const validItems = items.filter((it) => it.name.trim());

  const handleSave = async () => {
    if (validItems.length === 0) return;
    setSaving(true);
    const payload = validItems.map(({ id, ...rest }) => ({
      ...rest,
      name: rest.name.trim(),
      quantity: Number(rest.quantity) || 0,
      price: Number(rest.price) || 0,
    }));
    try {
      // Bulk insert into the database (delegated to the parent/inventory layer).
      await onSave?.({ image_type: imageType, items: payload });
      handleClose();
    } catch (err) {
      console.error(err);
      setError('Could not save to inventory. Please try again.');
      setSaving(false);
    }
  };

  if (!open) return null;

  const badge =
    imageType === 'receipt'
      ? { label: 'Detected: Receipt', icon: 'receipt_long', classes: 'bg-secondary-container/40 text-secondary' }
      : { label: 'Detected: Product', icon: 'inventory_2', classes: 'bg-primary-fixed/50 text-primary' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface rounded-xl shadow-2xl border border-outline-variant/50 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Smart Input - upload image"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/50 bg-surface-container-low">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-on-primary">
              <Icon name="auto_awesome" className="text-[22px]" />
            </span>
            <div>
              <h2 className="text-title-md font-title-md text-on-surface leading-tight">Smart Input</h2>
              <p className="text-body-sm font-body-sm text-on-surface-variant">
                Upload a photo — we auto-detect receipt or product and extract the items.
              </p>
            </div>
          </div>
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            onClick={handleClose}
            aria-label="Close"
            type="button"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step: idle — single upload area */}
          {phase === 'idle' && (
            <div className="space-y-4">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex flex-col items-center justify-center text-center gap-3 w-full py-16 px-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                  dragging ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant hover:border-primary/60 bg-surface-container-lowest'
                }`}
              >
                <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tertiary-fixed text-primary">
                  <Icon name="upload" className="text-[32px]" />
                </span>
                <div>
                  <p className="text-title-sm font-title-sm text-on-surface">Upload Image (Receipt / Product)</p>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                    Drop a photo here or click to browse. JPG, PNG or WEBP up to 10MB.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full bg-primary-container text-on-primary text-label-md font-label-md">
                  <Icon name="auto_awesome" className="text-[16px]" />
                  Auto-detect type
                </span>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileInput} />
              </label>

              {!hasVisionKey && (
                <p className="text-body-sm font-body-sm text-error flex items-center gap-1.5">
                  <Icon name="warning" className="text-[16px]" />
                  Vision API key missing. Set VITE_GEMINI_API_KEY in your .env.local to enable real extraction.
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

          {/* Step: processing — loading indicator */}
          {phase === 'processing' && (
            <div className="flex flex-col items-center justify-center text-center gap-5 py-12">
              {imageUrl && (
                <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-outline-variant/60">
                  <img src={imageUrl} alt="Analyzing" className="w-full h-full object-cover opacity-70" />
                  <div className="absolute inset-x-0 h-0.5 bg-primary-container shadow-[0_0_12px_2px] shadow-primary-container animate-scanline" />
                </div>
              )}
              <div className="flex items-center gap-2 text-title-sm font-title-sm text-on-surface">
                <Icon name="progress_activity" className="text-[20px] animate-spin text-primary" />
                Analyzing image with AI Vision...
              </div>
              <p className="text-body-sm font-body-sm text-on-surface-variant max-w-sm">
                Detecting whether this is a receipt or a product photo and extracting items.
              </p>
            </div>
          )}

          {/* Step: error */}
          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center text-center gap-4 py-12">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-error-container text-error">
                <Icon name="report" className="text-[28px]" />
              </span>
              <p className="text-title-sm font-title-sm text-on-surface max-w-md">{error}</p>
              <button
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-title-sm font-title-sm transition-colors"
                onClick={reset}
                type="button"
              >
                <Icon name="refresh" className="text-[18px]" />
                Upload another image
              </button>
            </div>
          )}

          {/* Step: review — type badge + editable list */}
          {phase === 'review' && (
            <div className="space-y-4">
              {/* Type badge */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-title-sm font-title-sm ${badge.classes}`}>
                  <Icon name={badge.icon} className="text-[18px]" />
                  {badge.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-label-md font-label-md text-on-surface-variant">
                    {validItems.length} item{validItems.length === 1 ? '' : 's'}
                  </span>
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md font-label-md text-on-surface border border-outline-variant/60 hover:bg-surface-container transition-colors"
                    onClick={reset}
                    type="button"
                  >
                    <Icon name="cached" className="text-[16px]" />
                    New image
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-body-sm font-body-sm text-secondary flex items-center gap-1.5">
                  <Icon name="info" className="text-[16px]" />
                  {error}
                </p>
              )}

              {/* Editable list */}
              <div className="rounded-xl border border-outline-variant/50 overflow-hidden">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_72px_90px_40px] gap-2 px-3 py-2 bg-surface-container-low text-label-sm font-label-sm uppercase tracking-wider text-outline">
                  <span>Item Name</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Price</span>
                  <span />
                </div>

                <ul className="divide-y divide-outline-variant/40">
                  {items.length === 0 && (
                    <li className="px-3 py-6 text-center text-body-md font-body-md text-on-surface-variant">
                      No items. Click "Add item" to create one.
                    </li>
                  )}
                  {items.map((it) => (
                    <li key={it.id} className="grid grid-cols-[1fr_72px_90px_40px] gap-2 items-center px-3 py-2 bg-surface-container-lowest">
                      <input
                        className="min-w-0 bg-transparent px-2 py-1.5 rounded text-body-md font-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:bg-surface-container-low focus:ring-1 focus:ring-primary-container"
                        value={it.name}
                        placeholder="Item name"
                        onChange={(e) => updateItem(it.id, { name: e.target.value })}
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="w-full text-center bg-surface-container-low px-2 py-1.5 rounded text-body-sm font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
                        value={it.quantity}
                        onChange={(e) => updateItem(it.id, { quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                      />
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-outline text-body-sm pointer-events-none">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full text-right bg-surface-container-low pl-5 pr-2 py-1.5 rounded text-body-sm font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container"
                          value={it.price}
                          onChange={(e) => updateItem(it.id, { price: e.target.value === '' ? '' : Number(e.target.value) })}
                        />
                      </div>
                      <button
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-outline hover:text-error hover:bg-error-container/40 transition-colors"
                        onClick={() => removeItem(it.id)}
                        aria-label="Delete item"
                        type="button"
                      >
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Add new item */}
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-label-md font-label-md text-primary border border-dashed border-outline-variant/70 hover:border-primary/60 hover:bg-surface-container-low transition-colors w-full justify-center"
                onClick={addItem}
                type="button"
              >
                <Icon name="add" className="text-[18px]" />
                Add item manually
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-outline-variant/50 bg-surface-container-low">
          <button
            className="px-4 py-2.5 rounded-lg text-title-sm font-title-sm text-on-surface-variant hover:bg-surface-container transition-colors"
            onClick={handleClose}
            type="button"
          >
            Cancel
          </button>

          {phase === 'review' && (
            <button
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-title-sm font-title-sm transition-all active:scale-[0.98] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={validItems.length === 0 || saving}
              type="button"
            >
              <Icon name={saving ? 'progress_activity' : 'inventory'} className={`text-[18px] ${saving ? 'animate-spin' : ''}`} />
              {saving ? 'Saving...' : `Save ${validItems.length} to Inventory`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
