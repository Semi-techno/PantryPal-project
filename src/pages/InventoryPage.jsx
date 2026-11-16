import { useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import SmartInputModal from '../components/SmartInputModal.jsx';
import AddItemModal from '../components/AddItemModal.jsx';
import RecipeModal from '../components/RecipeModal.jsx';
import RecipeHistoryModal from '../components/RecipeHistoryModal.jsx';
import ReserveModal from '../components/ReserveModal.jsx';
import {
  availableQty,
  hasReservation,
  reserveItem,
  clearReservation,
  cookReserved,
  ensureQtyFields,
} from '../utils/inventory.js';

/**
 * Each item carries both DISPLAY fields (qty, status, tone — used to render the
 * row exactly as designed) and STRUCTURED fields (zone, freshness, expiry,
 * qtyUnit) that power real filtering, search, and sorting.
 *
 * QUANTITY SOURCE OF TRUTH (see utils/inventory.js):
 *   - totalQty    : physical stock on hand (canonical number).
 *   - reservedQty : amount locked for an upcoming meal (hidden from recipes).
 *   - qtyValue/qty: DERIVED from totalQty, kept in sync for legacy rendering.
 * availableQty = max(totalQty - reservedQty, 0) and is computed on demand.
 */
const INITIAL_ITEMS = [
  { id: 'i1', name: 'Button Mushrooms', meta: 'Produce & Fresh · White Whole', location: 'Fridge Crisper', zone: 'Fridge', qty: '250g', qtyValue: 250, totalQty: 250, reservedQty: 0, qtyUnit: 'g', status: 'Expires in 48h', freshness: 'Expiring Soon', tone: 'danger', expiry: '2026-10-23' },
  { id: 'i2', name: 'Baby Spinach', meta: 'Produce & Fresh · Washed Pre-packed', location: 'Fridge Crisper', zone: 'Fridge', qty: '150g', qtyValue: 150, totalQty: 150, reservedQty: 0, qtyUnit: 'g', status: 'Expires Tomorrow', freshness: 'Expiring Soon', tone: 'danger', expiry: '2026-10-22' },
  { id: 'i3', name: 'Organic Heavy Cream', meta: 'Dairy & Eggs · Grassfed 36%', location: 'Fridge Door', zone: 'Fridge', qty: '200ml', qtyValue: 200, totalQty: 200, reservedQty: 150, reservedNote: 'Pasta Night', qtyUnit: 'ml', status: 'Expires in 3 days', freshness: 'Expiring Soon', tone: 'danger', expiry: '2026-10-24' },
  { id: 'i4', name: 'Arborio Rice', meta: 'Grains & Pasta · Risotto Grade', location: 'Dry Pantry Shelf 2', zone: 'Main Pantry', qty: '1200g', qtyValue: 1200, totalQty: 1200, reservedQty: 0, qtyUnit: 'g', status: 'Good for 6 mos', freshness: 'Well Stocked', tone: 'ok', expiry: '2027-04-15' },
  { id: 'i5', name: 'Cannellini Beans', meta: 'Canned & Jarred · White Kidney', location: 'Dry Pantry Shelf 1', zone: 'Main Pantry', qty: '2 cans', qtyValue: 2, totalQty: 2, reservedQty: 2, reservedNote: 'Weekend Chili', qtyUnit: 'can', status: 'Pantry Staple', freshness: 'Well Stocked', tone: 'ok', expiry: '2027-12-01' },
  { id: 'i6', name: 'Extra Virgin Olive Oil', meta: 'Oils & Condiments · Cold Pressed', location: 'Countertop / Pantry', zone: 'Main Pantry', qty: '750ml', qtyValue: 750, totalQty: 750, reservedQty: 0, qtyUnit: 'ml', status: 'Well Stocked', freshness: 'Well Stocked', tone: 'ok', expiry: '2027-02-10' },
  { id: 'i7', name: 'Garlic & Shallots', meta: 'Produce & Fresh · Purple French', location: 'Cool Dark Bin', zone: 'Main Pantry', qty: '4 pcs', qtyValue: 4, totalQty: 4, reservedQty: 0, qtyUnit: 'pcs', status: 'Good for 2 wks', freshness: 'Well Stocked', tone: 'ok', expiry: '2026-11-04' },
  { id: 'i8', name: 'Red Lentils', meta: 'Grains & Pasta · Split Dried', location: 'Dry Pantry Shelf 2', zone: 'Main Pantry', qty: '500g', qtyValue: 500, totalQty: 500, reservedQty: 0, qtyUnit: 'g', status: 'Good for 8 mos', freshness: 'Well Stocked', tone: 'ok', expiry: '2027-06-20' },
  { id: 'i9', name: 'Puff Pastry Sheets', meta: 'Freezer · All-Butter Rolled', location: 'Freezer Drawer', zone: 'Freezer', qty: '1 pack', qtyValue: 1, totalQty: 1, reservedQty: 0, qtyUnit: 'pack', status: 'Frozen', freshness: 'Well Stocked', tone: 'frozen', expiry: '2027-01-30' },
  { id: 'i10', name: 'Fresh Rosemary', meta: 'Herbs · Sprigs', location: 'Fridge', zone: 'Spices', qty: '0g', qtyValue: 0, totalQty: 0, reservedQty: 0, qtyUnit: 'g', status: 'Out of stock', freshness: 'Low Stock', tone: 'muted', expiry: '' },
];

const toneDot = {
  danger: 'bg-secondary',
  ok: 'bg-primary-container',
  frozen: 'bg-[#4A90D9]',
  muted: 'bg-outline-variant',
};
const toneText = {
  danger: 'text-secondary',
  ok: 'text-primary',
  frozen: 'text-[#2F6DAE]',
  muted: 'text-outline',
};

// Sidebar zone labels (All Items + the four real storage zones).
const ZONE_LABELS = ['All Items', 'Main Pantry', 'Fridge', 'Spices', 'Freezer'];

// Freshness buckets and their indicator dot colors.
const FRESHNESS_META = [
  { label: 'Expiring Soon', dot: 'bg-secondary' },
  { label: 'Low Stock', dot: 'bg-[#C8902A]' },
  { label: 'Well Stocked', dot: 'bg-primary-container' },
];

// Sort options wired to the dropdown.
const SORT_OPTIONS = [
  { value: 'expiry', label: 'Expiry date' },
  { value: 'name', label: 'Name' },
  { value: 'qty', label: 'Qty' },
];

// Items with no expiry date sort last when sorting by expiry.
const EXPIRY_FALLBACK = Number.POSITIVE_INFINITY;
const expiryTime = (iso) => (iso ? new Date(iso).getTime() : EXPIRY_FALLBACK);

export default function InventoryPage() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [smartInputOpen, setSmartInputOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0); // bump to refresh history view
  const [reserveItemId, setReserveItemId] = useState(null);
  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('All Items');
  const [freshnessFilter, setFreshnessFilter] = useState(null); // null = no freshness filter
  const [sortBy, setSortBy] = useState('expiry');
  const [sortOpen, setSortOpen] = useState(false);
  const [toast, setToast] = useState('');

  // Live counts per zone, derived from current items.
  const zoneCounts = useMemo(() => {
    const counts = { 'All Items': items.length };
    for (const label of ZONE_LABELS.slice(1)) {
      counts[label] = items.filter((it) => it.zone === label).length;
    }
    return counts;
  }, [items]);

  // Live counts per freshness bucket.
  const freshnessCounts = useMemo(() => {
    const counts = {};
    for (const { label } of FRESHNESS_META) {
      counts[label] = items.filter((it) => it.freshness === label).length;
    }
    return counts;
  }, [items]);

  // Apply zone + freshness + search, then sort.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let result = items.filter((it) => {
      const zoneOk = zoneFilter === 'All Items' || it.zone === zoneFilter;
      const freshnessOk = !freshnessFilter || it.freshness === freshnessFilter;
      const searchOk =
        !q || it.name.toLowerCase().includes(q) || it.meta.toLowerCase().includes(q);
      return zoneOk && freshnessOk && searchOk;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'qty') return (b.qtyValue ?? 0) - (a.qtyValue ?? 0);
      // Default: expiry date (soonest first).
      return expiryTime(a.expiry) - expiryTime(b.expiry);
    });

    return result;
  }, [items, query, zoneFilter, freshnessFilter, sortBy]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const activeSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Expiry date';

  const hasActiveFilters = zoneFilter !== 'All Items' || freshnessFilter || query.trim();

  const clearFilters = () => {
    setZoneFilter('All Items');
    setFreshnessFilter(null);
    setQuery('');
  };

  // Bulk insert the finalized Smart Input list into the inventory "database".
  const handleSmartInputSave = async ({ image_type, items: saved }) => {
    const sourceLabel = image_type === 'receipt' ? 'Receipt' : 'Product';
    const mapped = saved.map((s, idx) =>
      ensureQtyFields({
        id: `scan_${Date.now()}_${idx}`,
        name: s.name,
        meta: `Smart Input · ${sourceLabel}${s.price ? ` · $${s.price.toFixed(2)}` : ''}`,
        location: 'Unassigned',
        zone: 'Main Pantry',
        qtyValue: Number(s.quantity) || 0,
        totalQty: Number(s.quantity) || 0,
        reservedQty: 0,
        qtyUnit: 'pcs',
        status: 'Newly added',
        freshness: 'Well Stocked',
        tone: 'ok',
        expiry: '',
      }),
    );
    setItems((prev) => [...mapped, ...prev]);
    showToast(`Saved ${mapped.length} item${mapped.length === 1 ? '' : 's'} from ${sourceLabel.toLowerCase()} to your pantry.`);
  };

  // Append a single manually-entered item from the Add Item modal.
  const handleAddItem = (data) => {
    const newItem = ensureQtyFields({
      id: `manual_${Date.now()}`,
      name: data.name,
      meta: `${data.category} · Manually added`,
      location: data.zone,
      zone: data.zone,
      qtyValue: data.quantity,
      totalQty: data.quantity,
      reservedQty: 0,
      qtyUnit: data.unit,
      status: data.status,
      freshness: data.freshness,
      tone: data.tone,
      expiry: data.expiry,
    });
    setItems((prev) => [newItem, ...prev]);
    showToast(`Added "${data.name}" to ${data.zone}.`);
  };

  // ── Reserved / Booked Ingredients handlers ────────────────────────────────
  // All quantity math is delegated to utils/inventory.js so the rules
  // (clamp to stock, derived display fields, available = total - reserved)
  // live in exactly one place.

  const reserveTarget = items.find((it) => it.id === reserveItemId) || null;

  // Lock `amount` of an item for a meal, with an optional note.
  const handleReserve = (id, amount, note) => {
    setItems((prev) => prev.map((it) => (it.id === id ? reserveItem(it, amount, note) : it)));
    const it = items.find((x) => x.id === id);
    showToast(`Reserved ${amount}${it?.qtyUnit ?? ''} of ${it?.name ?? 'item'}${note ? ` for ${note}` : ''}.`);
  };

  // Release a reservation (physical stock untouched).
  const handleClearReservation = (id) => {
    setItems((prev) => prev.map((it) => (it.id === id ? clearReservation(it) : it)));
    const it = items.find((x) => x.id === id);
    showToast(`Released reservation on ${it?.name ?? 'item'}.`);
  };

  // Cook the reserved meal: deduct from totalQty and clear the reservation.
  const handleCookReserved = (id) => {
    const it = items.find((x) => x.id === id);
    const cooked = it ? Number(it.reservedQty) || 0 : 0;
    setItems((prev) => prev.map((x) => (x.id === id ? cookReserved(x) : x)));
    showToast(`Cooked ${it?.reservedNote || 'reserved meal'} — used ${cooked}${it?.qtyUnit ?? ''} of ${it?.name ?? 'item'}.`);
  };

  return (
    <main className="min-h-screen w-full bg-background text-on-surface antialiased">
      {/* Top nav */}
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-outline-variant/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a className="inline-flex items-center gap-2" href="#">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-on-primary">
                <Icon name="kitchen" className="text-[18px]" />
              </span>
              <span className="text-title-md font-title-md text-primary">Pantry Pal</span>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-label-md font-label-md">
              <a className="text-on-surface font-semibold" href="#">Inventory</a>
              <button className="text-on-surface-variant hover:text-primary transition-colors" onClick={() => setHistoryOpen(true)} type="button">Recipes</button>
              <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Meal Planner</a>
              <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Grocery List</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-on-surface-variant hover:text-primary transition-colors" aria-label="Notifications" type="button">
              <Icon name="notifications" className="text-[22px]" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-secondary" />
            </button>
            <span className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-primary">
              <Icon name="person" className="text-[20px]" />
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Title row */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-headline-lg font-headline-lg text-primary tracking-tight">Pantry Inventory</h1>
            <p className="text-body-sm font-body-sm text-on-surface-variant mt-1 flex items-center gap-2 flex-wrap">
              <span>{items.length} items tracked across 4 zones</span>
              <span className="w-1 h-1 rounded-full bg-outline-variant" />
              <span className="text-secondary">{freshnessCounts['Expiring Soon'] ?? 0} items expiring soon</span>
              <button className="text-primary hover:underline" onClick={() => setRecipeOpen(true)} type="button">View recipes →</button>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/70 text-title-sm font-title-sm text-on-surface hover:border-primary/50 hover:bg-surface-container-low transition-colors shadow-sm active:scale-[0.98]"
              onClick={() => setSmartInputOpen(true)}
              type="button"
            >
              <Icon name="auto_awesome" className="text-[18px] text-primary" />
              Smart Input
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-title-sm font-title-sm transition-colors shadow-sm active:scale-[0.98]"
              onClick={() => setAddItemOpen(true)}
              type="button"
            >
              <Icon name="add" className="text-[18px]" />
              Add Item
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block w-56 shrink-0 space-y-6">
            <div>
              <h3 className="text-label-sm font-label-sm uppercase tracking-wider text-outline mb-2">Storage Zones</h3>
              <ul className="space-y-0.5">
                {ZONE_LABELS.map((label) => {
                  const active = zoneFilter === label;
                  return (
                    <li key={label}>
                      <button
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-label-md font-label-md transition-colors ${
                          active ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-on-surface-variant hover:bg-surface-container-low'
                        }`}
                        onClick={() => setZoneFilter(label)}
                        type="button"
                      >
                        <span>{label}</span>
                        <span className="text-outline">{zoneCounts[label] ?? 0}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="text-label-sm font-label-sm uppercase tracking-wider text-outline mb-2">Filter Freshness</h3>
              <ul className="space-y-0.5">
                {FRESHNESS_META.map((f) => {
                  const active = freshnessFilter === f.label;
                  return (
                    <li key={f.label}>
                      <button
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-label-md font-label-md transition-colors ${
                          active ? 'bg-surface-container-high text-on-surface font-semibold' : 'text-on-surface-variant hover:bg-surface-container-low'
                        }`}
                        onClick={() => setFreshnessFilter((prev) => (prev === f.label ? null : f.label))}
                        type="button"
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${f.dot}`} />
                          {f.label}
                        </span>
                        <span className="text-outline">{freshnessCounts[f.label] ?? 0}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {hasActiveFilters && (
              <button
                className="flex items-center gap-2 px-3 text-label-md font-label-md text-secondary hover:underline"
                onClick={clearFilters}
                type="button"
              >
                <Icon name="filter_alt_off" className="text-[16px]" />
                Clear filters
              </button>
            )}

            <button className="flex items-center gap-2 px-3 text-label-md font-label-md text-primary hover:underline" type="button">
              <Icon name="download" className="text-[16px]" />
              Export Grocery List
            </button>
          </aside>

          {/* Table */}
          <section className="flex-1 min-w-0">
            {/* Search + sort */}
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                  <Icon name="search" className="text-[18px]" />
                </span>
                <input
                  className="w-full pl-10 pr-9 py-2.5 bg-surface-container-lowest border border-outline-variant/70 rounded-lg text-body-md font-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-colors"
                  placeholder="Filter items by name, brand, or tag..."
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
              <div className="flex items-center gap-4 text-label-md font-label-md text-on-surface-variant">
                {/* Sort dropdown */}
                <div className="relative">
                  <button
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                    onClick={() => setSortOpen((v) => !v)}
                    onBlur={() => setTimeout(() => setSortOpen(false), 150)}
                    type="button"
                  >
                    Sort: <span className="text-on-surface font-semibold">{activeSortLabel}</span>
                    <Icon name="expand_more" className="text-[16px]" />
                  </button>
                  {sortOpen && (
                    <ul className="absolute right-0 mt-2 w-44 z-30 bg-surface rounded-lg shadow-xl border border-outline-variant/60 overflow-hidden py-1">
                      {SORT_OPTIONS.map((o) => (
                        <li key={o.value}>
                          <button
                            className={`w-full flex items-center justify-between px-3 py-2 text-left text-label-md font-label-md hover:bg-surface-container-low transition-colors ${
                              sortBy === o.value ? 'text-primary font-semibold' : 'text-on-surface'
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSortBy(o.value);
                              setSortOpen(false);
                            }}
                            type="button"
                          >
                            {o.label}
                            {sortBy === o.value && <Icon name="check" className="text-[16px]" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="text-outline">Showing {filtered.length} of {items.length}</span>
              </div>
            </div>

            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[2.2fr_1.4fr_1fr_1.3fr_0.9fr] gap-4 px-4 pb-2 text-label-sm font-label-sm uppercase tracking-wider text-outline border-b border-outline-variant/50">
              <span>Item</span>
              <span>Location</span>
              <span>Qty</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Rows */}
            <ul className="divide-y divide-outline-variant/40">
              {filtered.length === 0 && (
                <li className="px-4 py-12 text-center">
                  <Icon name="inventory_2" className="text-[32px] text-outline-variant" />
                  <p className="text-title-sm font-title-sm text-on-surface mt-2">No items match your filters</p>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                    Try a different zone, freshness, or search term.
                  </p>
                  {hasActiveFilters && (
                    <button
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md font-label-md text-primary border border-outline-variant/60 hover:bg-surface-container-low transition-colors"
                      onClick={clearFilters}
                      type="button"
                    >
                      <Icon name="filter_alt_off" className="text-[16px]" />
                      Clear filters
                    </button>
                  )}
                </li>
              )}
              {filtered.map((it) => {
                const muted = it.tone === 'muted';
                return (
                  <li
                    key={it.id}
                    className={`grid grid-cols-1 sm:grid-cols-[2.2fr_1.4fr_1fr_1.3fr_0.9fr] gap-1 sm:gap-4 items-center px-4 py-3.5 hover:bg-surface-container-low/60 transition-colors ${muted ? 'opacity-60' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="text-title-sm font-title-sm text-on-surface truncate">{it.name}</p>
                      <p className="text-body-sm font-body-sm text-outline truncate">{it.meta}</p>
                      {hasReservation(it) && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary text-label-sm font-label-sm">
                          <Icon name="bookmark" className="text-[13px]" />
                          Reserved: {it.reservedQty}{it.qtyUnit}
                          {it.reservedNote ? ` for ${it.reservedNote}` : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-body-md font-body-md text-on-surface-variant">{it.location}</span>
                    <div className="flex items-center gap-2">
                      {!muted && <Icon name="remove" className="text-[16px] text-outline cursor-pointer hover:text-on-surface" />}
                      <span className="flex flex-col leading-tight">
                        <span className="text-title-sm font-title-sm text-on-surface">{it.qty}</span>
                        {hasReservation(it) && (
                          <span className="text-label-sm font-label-sm text-primary">{availableQty(it)}{it.qtyUnit} free</span>
                        )}
                      </span>
                      {!muted && <Icon name="add" className="text-[16px] text-primary cursor-pointer hover:text-primary-container" />}
                    </div>
                    <span className={`flex items-center gap-1.5 text-label-md font-label-md ${toneText[it.tone]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${toneDot[it.tone]}`} />
                      {it.status}
                    </span>
                    <span className="sm:text-right flex sm:flex-col items-start sm:items-end gap-x-3 gap-y-0.5 flex-wrap">
                      {muted ? (
                        <a className="text-label-md font-label-md text-secondary hover:underline inline-flex items-center gap-1" href="#">
                          <Icon name="add" className="text-[14px]" />
                          Add to List
                        </a>
                      ) : (
                        <>
                          <button className="text-label-md font-label-md text-primary hover:underline" onClick={() => setRecipeOpen(true)} type="button">Find Recipes</button>
                          <button
                            className="text-label-md font-label-md text-on-surface-variant hover:text-secondary hover:underline inline-flex items-center gap-1"
                            onClick={() => setReserveItemId(it.id)}
                            type="button"
                          >
                            <Icon name={hasReservation(it) ? 'bookmark_added' : 'bookmark_add'} className="text-[14px]" />
                            {hasReservation(it) ? 'Manage' : 'Reserve'}
                          </button>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Result summary */}
            <div className="flex items-center justify-between pt-5 text-label-md font-label-md text-on-surface-variant">
              <span>
                {filtered.length} item{filtered.length === 1 ? '' : 's'}
                {zoneFilter !== 'All Items' && ` in ${zoneFilter}`}
                {freshnessFilter && ` · ${freshnessFilter}`}
              </span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-outline-variant/40 flex items-center justify-between text-body-sm font-body-sm text-outline">
          <p><span className="text-primary font-semibold">Pantry Pal</span> · Mindful kitchen inventory</p>
          <div className="flex gap-4">
            <a className="hover:text-primary transition-colors" href="#">Privacy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms</a>
            <a className="hover:text-primary transition-colors" href="#">Help</a>
          </div>
        </footer>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-primary text-on-primary shadow-2xl text-title-sm font-title-sm">
          <Icon name="check_circle" className="text-[18px]" />
          {toast}
        </div>
      )}

      <SmartInputModal open={smartInputOpen} onClose={() => setSmartInputOpen(false)} onSave={handleSmartInputSave} />
      <AddItemModal open={addItemOpen} onClose={() => setAddItemOpen(false)} onSave={handleAddItem} />
      <RecipeModal
        open={recipeOpen}
        onClose={() => setRecipeOpen(false)}
        items={items}
        onHistoryChange={() => setHistoryVersion((v) => v + 1)}
      />
      <RecipeHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onGenerate={() => setRecipeOpen(true)}
        refreshKey={historyVersion}
      />
      <ReserveModal
        open={reserveItemId !== null}
        item={reserveTarget}
        onClose={() => setReserveItemId(null)}
        onReserve={handleReserve}
        onClear={handleClearReservation}
        onCook={handleCookReserved}
      />
    </main>
  );
}
