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
 * Fully responsive for mobile phones, tablets, and desktops.
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
const toneBg = {
  danger: 'bg-secondary-container/25',
  ok: 'bg-primary-fixed/40',
  frozen: 'bg-blue-50',
  muted: 'bg-surface-container',
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

const EXPIRY_FALLBACK = Number.POSITIVE_INFINITY;
const expiryTime = (iso) => (iso ? new Date(iso).getTime() : EXPIRY_FALLBACK);

export default function InventoryPage() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [smartInputOpen, setSmartInputOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [reserveItemId, setReserveItemId] = useState(null);
  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('All Items');
  const [freshnessFilter, setFreshnessFilter] = useState(null);
  const [sortBy, setSortBy] = useState('expiry');
  const [sortOpen, setSortOpen] = useState(false);
  const [toast, setToast] = useState('');

  // Live counts per zone
  const zoneCounts = useMemo(() => {
    const counts = { 'All Items': items.length };
    for (const label of ZONE_LABELS.slice(1)) {
      counts[label] = items.filter((it) => it.zone === label).length;
    }
    return counts;
  }, [items]);

  // Live counts per freshness bucket
  const freshnessCounts = useMemo(() => {
    const counts = {};
    for (const { label } of FRESHNESS_META) {
      counts[label] = items.filter((it) => it.freshness === label).length;
    }
    return counts;
  }, [items]);

  // Apply zone + freshness + search, then sort
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

  // Quantity stepper adjustments
  const handleIncrement = (id) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const step = it.qtyUnit === 'g' || it.qtyUnit === 'ml' ? 50 : 1;
        const nextTotal = (Number(it.totalQty) || 0) + step;
        const nextStatus = it.status === 'Out of stock' ? 'Well Stocked' : it.status;
        const nextTone = it.tone === 'muted' ? 'ok' : it.tone;
        return ensureQtyFields({
          ...it,
          totalQty: nextTotal,
          qtyValue: nextTotal,
          qty: `${nextTotal}${it.qtyUnit ?? ''}`,
          status: nextStatus,
          tone: nextTone,
        });
      })
    );
  };

  const handleDecrement = (id) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const step = it.qtyUnit === 'g' || it.qtyUnit === 'ml' ? 50 : 1;
        const nextTotal = Math.max((Number(it.totalQty) || 0) - step, 0);
        const nextStatus = nextTotal === 0 ? 'Out of stock' : it.status;
        const nextTone = nextTotal === 0 ? 'muted' : it.tone;
        return ensureQtyFields({
          ...it,
          totalQty: nextTotal,
          qtyValue: nextTotal,
          qty: `${nextTotal}${it.qtyUnit ?? ''}`,
          status: nextStatus,
          tone: nextTone,
        });
      })
    );
  };

  // Bulk insert the finalized Smart Input list into inventory
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

  // Append a single manually-entered item from Add Item modal
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

  const reserveTarget = items.find((it) => it.id === reserveItemId) || null;

  const handleReserve = (id, amount, note) => {
    setItems((prev) => prev.map((it) => (it.id === id ? reserveItem(it, amount, note) : it)));
    const it = items.find((x) => x.id === id);
    showToast(`Reserved ${amount}${it?.qtyUnit ?? ''} of ${it?.name ?? 'item'}${note ? ` for ${note}` : ''}.`);
  };

  const handleClearReservation = (id) => {
    setItems((prev) => prev.map((it) => (it.id === id ? clearReservation(it) : it)));
    const it = items.find((x) => x.id === id);
    showToast(`Released reservation on ${it?.name ?? 'item'}.`);
  };

  const handleCookReserved = (id) => {
    const it = items.find((x) => x.id === id);
    const cooked = it ? Number(it.reservedQty) || 0 : 0;
    setItems((prev) => prev.map((x) => (x.id === id ? cookReserved(x) : x)));
    showToast(`Cooked ${it?.reservedNote || 'reserved meal'} — used ${cooked}${it?.qtyUnit ?? ''} of ${it?.name ?? 'item'}.`);
  };

  return (
    <main className="min-h-screen w-full bg-background text-on-surface antialiased pb-24 sm:pb-12">
      {/* Top nav */}
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur border-b border-outline-variant/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6 sm:gap-8">
            <a className="inline-flex items-center gap-2 group" href="#">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-on-primary shadow-xs">
                <Icon name="kitchen" className="text-[18px]" />
              </span>
              <span className="text-title-md font-bold text-primary">PantryPal</span>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-label-md font-label-md">
              <a className="text-primary font-bold border-b-2 border-primary pb-0.5" href="#">Inventory</a>
              <button className="text-on-surface-variant hover:text-primary transition-colors" onClick={() => setHistoryOpen(true)} type="button">Recipes</button>
              <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Meal Planner</a>
              <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Grocery List</a>
            </nav>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Quick recipe access button on mobile */}
            <button
              className="md:hidden text-on-surface-variant hover:text-primary p-1.5 rounded-lg hover:bg-surface-container transition-colors"
              onClick={() => setHistoryOpen(true)}
              title="Recipe History"
              type="button"
            >
              <Icon name="history" className="text-[20px]" />
            </button>
            <button className="relative text-on-surface-variant hover:text-primary p-1.5 rounded-lg hover:bg-surface-container transition-colors" aria-label="Notifications" type="button">
              <Icon name="notifications" className="text-[21px]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary" />
            </button>
            <span className="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-primary font-bold text-xs shadow-xs">
              <Icon name="person" className="text-[18px]" />
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* Title & Quick Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-headline-lg font-bold text-primary tracking-tight">Pantry Inventory</h1>
            <p className="text-xs sm:text-body-sm text-on-surface-variant mt-1 flex items-center gap-2 flex-wrap">
              <span>{items.length} items tracked</span>
              <span className="w-1 h-1 rounded-full bg-outline-variant" />
              <span className="text-secondary font-medium">{freshnessCounts['Expiring Soon'] ?? 0} expiring soon</span>
              <button className="text-primary hover:underline font-medium" onClick={() => setRecipeOpen(true)} type="button">View recipes →</button>
            </p>
          </div>
          {/* Action buttons (always visible on desktop, quick access on mobile header) */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/70 text-xs sm:text-title-sm font-semibold text-on-surface hover:border-primary/50 hover:bg-surface-container-low transition-colors shadow-xs active:scale-[0.98]"
              onClick={() => setSmartInputOpen(true)}
              type="button"
            >
              <Icon name="auto_awesome" className="text-[16px] sm:text-[18px] text-primary" />
              <span>Smart Input</span>
            </button>
            <button
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-xs sm:text-title-sm font-semibold transition-colors shadow-xs active:scale-[0.98]"
              onClick={() => setAddItemOpen(true)}
              type="button"
            >
              <Icon name="add" className="text-[16px] sm:text-[18px]" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Mobile Filter Chips Bar (Storage Zones + Freshness) — visible on mobile/tablet */}
        <div className="lg:hidden mb-5 space-y-2.5">
          {/* Storage Zone Pills (Horizontal scrollable) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {ZONE_LABELS.map((label) => {
              const active = zoneFilter === label;
              return (
                <button
                  key={label}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    active
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container border border-outline-variant/40'
                  }`}
                  onClick={() => setZoneFilter(label)}
                  type="button"
                >
                  <span>{label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${active ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-outline'}`}>
                    {zoneCounts[label] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Freshness Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {FRESHNESS_META.map((f) => {
              const active = freshnessFilter === f.label;
              return (
                <button
                  key={f.label}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                    active
                      ? 'bg-surface-container-high text-on-surface font-semibold border-2 border-primary/50'
                      : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/50'
                  }`}
                  onClick={() => setFreshnessFilter((prev) => (prev === f.label ? null : f.label))}
                  type="button"
                >
                  <span className={`w-2 h-2 rounded-full ${f.dot}`} />
                  <span>{f.label}</span>
                  <span className="text-[10px] text-outline">({freshnessCounts[f.label] ?? 0})</span>
                </button>
              );
            })}
            {hasActiveFilters && (
              <button
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-secondary hover:bg-secondary-container/20 transition-colors"
                onClick={clearFilters}
                type="button"
              >
                <Icon name="close" className="text-[13px]" />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar (Zones & Freshness) */}
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

            <button
              className="flex items-center gap-2 px-3 text-label-md font-label-md text-primary hover:underline"
              onClick={() => showToast('Exporting grocery list...')}
              type="button"
            >
              <Icon name="download" className="text-[16px]" />
              Export Grocery List
            </button>
          </aside>

          {/* Items Container */}
          <section className="flex-1 min-w-0">
            {/* Search + Sort Controls */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                  <Icon name="search" className="text-[18px]" />
                </span>
                <input
                  className="w-full pl-10 pr-9 py-2 bg-surface-container-lowest border border-outline-variant/70 rounded-lg text-xs sm:text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary-container focus:border-primary-container transition-colors"
                  placeholder="Search items, ingredients, brands..."
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
              <div className="flex items-center gap-3 text-xs sm:text-label-md text-on-surface-variant">
                {/* Sort dropdown */}
                <div className="relative">
                  <button
                    className="flex items-center gap-1 hover:text-primary transition-colors bg-surface-container-low sm:bg-transparent px-2.5 py-1.5 sm:p-0 rounded-lg"
                    onClick={() => setSortOpen((v) => !v)}
                    onBlur={() => setTimeout(() => setSortOpen(false), 150)}
                    type="button"
                  >
                    <span className="text-outline hidden xs:inline">Sort: </span>
                    <span className="text-on-surface font-semibold">{activeSortLabel}</span>
                    <Icon name="expand_more" className="text-[16px]" />
                  </button>
                  {sortOpen && (
                    <ul className="absolute right-0 mt-2 w-44 z-30 bg-surface rounded-lg shadow-xl border border-outline-variant/60 overflow-hidden py-1">
                      {SORT_OPTIONS.map((o) => (
                        <li key={o.value}>
                          <button
                            className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs sm:text-label-md hover:bg-surface-container-low transition-colors ${
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
                <span className="text-outline text-xs hidden sm:inline">Showing {filtered.length} of {items.length}</span>
              </div>
            </div>

            {/* Desktop Table Headers */}
            <div className="hidden sm:grid grid-cols-[2.2fr_1.4fr_1fr_1.3fr_0.9fr] gap-4 px-4 pb-2 text-label-sm font-label-sm uppercase tracking-wider text-outline border-b border-outline-variant/50">
              <span>Item</span>
              <span>Location</span>
              <span>Qty</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
              <div className="px-4 py-12 text-center bg-surface-container-lowest/50 rounded-xl border border-dashed border-outline-variant/60 my-2">
                <Icon name="inventory_2" className="text-[36px] text-outline-variant" />
                <p className="text-title-sm font-semibold text-on-surface mt-2">No items match your filters</p>
                <p className="text-xs sm:text-body-sm text-on-surface-variant mt-1">
                  Try a different zone, freshness, or search term.
                </p>
                {hasActiveFilters && (
                  <button
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-label-md text-primary border border-outline-variant/60 hover:bg-surface-container-low transition-colors"
                    onClick={clearFilters}
                    type="button"
                  >
                    <Icon name="filter_alt_off" className="text-[15px]" />
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* ======================================================= */}
            {/* MOBILE VIEW: Card-based responsive layout (< sm screens) */}
            {/* ======================================================= */}
            <div className="sm:hidden space-y-3">
              {filtered.map((it) => {
                const muted = it.tone === 'muted';
                return (
                  <div
                    key={it.id}
                    className={`p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 shadow-xs space-y-2.5 transition-all ${
                      muted ? 'opacity-65' : ''
                    }`}
                  >
                    {/* Header: Name + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-title-sm font-bold text-on-surface truncate">{it.name}</h4>
                        <p className="text-xs text-outline truncate">{it.meta}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${toneBg[it.tone]} ${toneText[it.tone]}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${toneDot[it.tone]}`} />
                        {it.status}
                      </span>
                    </div>

                    {/* Location & Reservation Badges */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-medium text-[11px]">
                        <Icon name="place" className="text-[13px] text-outline" />
                        {it.location}
                      </span>
                      {hasReservation(it) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary-container/40 text-secondary font-medium text-[11px]">
                          <Icon name="bookmark" className="text-[12px]" />
                          Reserved: {it.reservedQty}{it.qtyUnit}
                          {it.reservedNote ? ` (${it.reservedNote})` : ''}
                        </span>
                      )}
                    </div>

                    {/* Footer Row: Stepper + Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 gap-2">
                      {/* Interactive Quantity Stepper */}
                      <div className="inline-flex items-center bg-surface-container-low rounded-lg p-0.5 border border-outline-variant/40">
                        <button
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface text-on-surface-variant hover:text-on-surface disabled:opacity-30 active:scale-95 transition-all"
                          onClick={() => handleDecrement(it.id)}
                          disabled={muted || (Number(it.totalQty) || 0) <= 0}
                          aria-label="Decrease quantity"
                          type="button"
                        >
                          <Icon name="remove" className="text-[16px]" />
                        </button>
                        <div className="px-2 text-center min-w-[50px]">
                          <span className="text-xs font-bold text-on-surface">{it.qty}</span>
                          {hasReservation(it) && (
                            <span className="block text-[10px] text-primary leading-none font-medium">
                              {availableQty(it)}{it.qtyUnit} free
                            </span>
                          )}
                        </div>
                        <button
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface text-primary disabled:opacity-30 active:scale-95 transition-all"
                          onClick={() => handleIncrement(it.id)}
                          aria-label="Increase quantity"
                          type="button"
                        >
                          <Icon name="add" className="text-[16px]" />
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {muted ? (
                          <button
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container text-xs font-semibold text-secondary hover:underline"
                            onClick={() => showToast(`Added ${it.name} to grocery list.`)}
                            type="button"
                          >
                            <Icon name="add" className="text-[14px]" />
                            Add to List
                          </button>
                        ) : (
                          <>
                            <button
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors active:scale-95"
                              onClick={() => setReserveItemId(it.id)}
                              type="button"
                            >
                              <Icon name={hasReservation(it) ? 'bookmark_added' : 'bookmark_add'} className="text-[14px]" />
                              {hasReservation(it) ? 'Manage' : 'Reserve'}
                            </button>
                            <button
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-fixed/70 text-primary text-xs font-semibold hover:bg-primary-fixed transition-colors active:scale-95"
                              onClick={() => setRecipeOpen(true)}
                              type="button"
                            >
                              <Icon name="skillet" className="text-[14px]" />
                              Cook
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ======================================================= */}
            {/* DESKTOP VIEW: Multi-column table (sm and up)           */}
            {/* ======================================================= */}
            <ul className="hidden sm:block divide-y divide-outline-variant/40">
              {filtered.map((it) => {
                const muted = it.tone === 'muted';
                return (
                  <li
                    key={it.id}
                    className={`grid grid-cols-[2.2fr_1.4fr_1fr_1.3fr_0.9fr] gap-4 items-center px-4 py-3.5 hover:bg-surface-container-low/60 transition-colors ${
                      muted ? 'opacity-60' : ''
                    }`}
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
                      <button
                        className="w-6 h-6 flex items-center justify-center rounded text-outline hover:text-on-surface disabled:opacity-30"
                        onClick={() => handleDecrement(it.id)}
                        disabled={muted || (Number(it.totalQty) || 0) <= 0}
                        aria-label="Decrease quantity"
                        type="button"
                      >
                        <Icon name="remove" className="text-[16px]" />
                      </button>
                      <span className="flex flex-col leading-tight min-w-[48px] text-center">
                        <span className="text-title-sm font-title-sm text-on-surface">{it.qty}</span>
                        {hasReservation(it) && (
                          <span className="text-label-sm font-label-sm text-primary">{availableQty(it)}{it.qtyUnit} free</span>
                        )}
                      </span>
                      <button
                        className="w-6 h-6 flex items-center justify-center rounded text-primary hover:text-primary-container disabled:opacity-30"
                        onClick={() => handleIncrement(it.id)}
                        aria-label="Increase quantity"
                        type="button"
                      >
                        <Icon name="add" className="text-[16px]" />
                      </button>
                    </div>
                    <span className={`flex items-center gap-1.5 text-label-md font-label-md ${toneText[it.tone]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${toneDot[it.tone]}`} />
                      {it.status}
                    </span>
                    <span className="text-right flex flex-col items-end gap-y-0.5">
                      {muted ? (
                        <button
                          className="text-label-md font-label-md text-secondary hover:underline inline-flex items-center gap-1"
                          onClick={() => showToast(`Added ${it.name} to grocery list.`)}
                          type="button"
                        >
                          <Icon name="add" className="text-[14px]" />
                          Add to List
                        </button>
                      ) : (
                        <>
                          <button className="text-label-md font-label-md text-primary hover:underline" onClick={() => setRecipeOpen(true)} type="button">
                            Find Recipes
                          </button>
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
            <div className="flex items-center justify-between pt-5 text-xs sm:text-label-md text-on-surface-variant">
              <span>
                {filtered.length} item{filtered.length === 1 ? '' : 's'}
                {zoneFilter !== 'All Items' && ` in ${zoneFilter}`}
                {freshnessFilter && ` · ${freshnessFilter}`}
              </span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-8 sm:mt-10 pt-6 border-t border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-body-sm text-outline text-center sm:text-left">
          <p><span className="text-primary font-semibold">Pantry Pal</span> · Mindful kitchen inventory</p>
          <div className="flex gap-4">
            <a className="hover:text-primary transition-colors" href="#">Privacy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms</a>
            <a className="hover:text-primary transition-colors" href="#">Help</a>
          </div>
        </footer>
      </div>

      {/* ======================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Fixed on mobile phones)     */}
      {/* ======================================================== */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-outline-variant/60 shadow-xl px-2 py-1 pb-safe flex items-center justify-around">
        {/* Inventory tab */}
        <button
          className="flex flex-col items-center justify-center py-1 px-3 text-primary"
          onClick={() => {
            clearFilters();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          type="button"
        >
          <Icon name="inventory_2" className="text-[22px]" />
          <span className="text-[10px] font-bold mt-0.5">Inventory</span>
        </button>

        {/* Recipes tab */}
        <button
          className="flex flex-col items-center justify-center py-1 px-3 text-on-surface-variant hover:text-primary"
          onClick={() => setRecipeOpen(true)}
          type="button"
        >
          <Icon name="skillet" className="text-[22px]" />
          <span className="text-[10px] font-medium mt-0.5">Cook</span>
        </button>

        {/* Smart Input (Center Hero Floating Button) */}
        <button
          className="flex flex-col items-center justify-center -mt-5 group"
          onClick={() => setSmartInputOpen(true)}
          type="button"
        >
          <span className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg border-2 border-surface group-active:scale-95 transition-transform">
            <Icon name="auto_awesome" className="text-[22px]" />
          </span>
          <span className="text-[10px] font-bold text-primary mt-1">Smart Scan</span>
        </button>

        {/* Recipe History */}
        <button
          className="flex flex-col items-center justify-center py-1 px-3 text-on-surface-variant hover:text-primary"
          onClick={() => setHistoryOpen(true)}
          type="button"
        >
          <Icon name="history" className="text-[22px]" />
          <span className="text-[10px] font-medium mt-0.5">History</span>
        </button>

        {/* Add Item tab */}
        <button
          className="flex flex-col items-center justify-center py-1 px-3 text-on-surface-variant hover:text-primary"
          onClick={() => setAddItemOpen(true)}
          type="button"
        >
          <Icon name="add_circle" className="text-[22px]" />
          <span className="text-[10px] font-medium mt-0.5">Add</span>
        </button>
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary shadow-2xl text-xs sm:text-title-sm font-semibold max-w-[90vw] text-center">
          <Icon name="check_circle" className="text-[18px] shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}

      {/* Modals */}
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
