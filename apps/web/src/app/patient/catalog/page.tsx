'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiClient } from '../../../lib/api';
import { ScheduleBadge } from '../../../components/Badges';
import { IconShoppingCart, IconSearch, IconCheckCircle, IconAlertTriangle, IconPackage, IconHelpCircle, IconLoader } from '../../../components/Icons';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { PageHeader } from '../../../components/PageHeader';
import { useToast } from '../../../components/Toast';
import { Medicine } from '../../../lib/types';

interface MatchItem {
  field_id: string;
  field_name: string;
  extracted_value: string;
  medicine_id?: string;
  medicine_name?: string;
  match_type: string;
  confidence_score: number;
  auto_addable: boolean;
}

const BATCH_SIZE = 12;

function CatalogContent() {
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get('prescription_id') || null;

  const [search, setSearch] = useState('');
  const [filterSched, setFilterSched] = useState('all');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSearch, setActiveSearch] = useState('');
  const [activeSchedule, setActiveSchedule] = useState('');
  const { addToast } = useToast();
  const observerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  // Load first batch or search
  const loadInitial = useCallback(async (q?: string, schedule?: string) => {
    setLoading(true);
    setError('');
    setMedicines([]);
    setNextCursor(null);
    setHasMore(true);
    loadingRef.current = false;
    try {
      const params: Record<string, string | number> = { limit: BATCH_SIZE };
      if (q) params.q = q;
      if (schedule && schedule !== 'all') params.schedule = schedule;
      const res = await ApiClient.searchMedicines(params);
      setMedicines(res.data || []);
      setNextCursor(res.next_cursor || null);
      setHasMore(Boolean(res.has_more));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load medicines';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more (next batch)
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || !nextCursor) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const params: Record<string, string | number> = { limit: BATCH_SIZE, cursor: nextCursor };
      if (activeSearch) params.q = activeSearch;
      if (activeSchedule && activeSchedule !== 'all') params.schedule = activeSchedule;
      const res = await ApiClient.searchMedicines(params);
      setMedicines(prev => [...prev, ...(res.data || [])]);
      setNextCursor(res.next_cursor || null);
      setHasMore(Boolean(res.has_more));
    } catch {
      // silent fail for load more
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [nextCursor, hasMore, activeSearch, activeSchedule]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current && !loading) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loading]);

  useEffect(() => {
    loadInitial();
    if (prescriptionId) loadMatches(prescriptionId);
  }, [prescriptionId, loadInitial]);

  async function loadMatches(rxId: string) {
    setMatchLoading(true);
    try {
      const res = await ApiClient.matchPrescription(rxId);
      setMatches(res.matches || []);
    } catch {
      setMatches([]);
    } finally {
      setMatchLoading(false);
    }
  }

  const handleSearch = () => {
    setActiveSearch(search);
    setActiveSchedule(filterSched);
    loadInitial(search || undefined, filterSched !== 'all' ? filterSched : undefined);
  };

  const handleFilterChange = (sched: string) => {
    setFilterSched(sched);
    setActiveSearch(search);
    setActiveSchedule(sched !== 'all' ? sched : '');
    loadInitial(search || undefined, sched !== 'all' ? sched : undefined);
  };

  const handleAddToCart = async (item: Medicine) => {
    setAddingToCart(item.medicine_id);
    try {
      let cartId = localStorage.getItem('ipmd_cart_id');
      if (!cartId) {
        const cartRes = await ApiClient.createCart();
        cartId = cartRes.cart_id;
        localStorage.setItem('ipmd_cart_id', cartId);
      }
      await ApiClient.addCartItem(cartId, item.medicine_id, 1, prescriptionId || undefined);
      setAddedToCart(item.medicine_id);
      addToast('success', 'Added to Cart', `${item.name} has been added to your cart.`);
      setTimeout(() => setAddedToCart(null), 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to add to cart';
      addToast('error', 'Add Failed', msg);
    } finally {
      setAddingToCart(null);
    }
  };

  const handleAddAllMatched = async () => {
    const matchedMeds = matches.filter(m => m.auto_addable && m.medicine_id);
    if (matchedMeds.length === 0) {
      addToast('info', 'No Matches', 'No matched medicines to add.');
      return;
    }
    setAddingAll(true);
    try {
      let cartId = localStorage.getItem('ipmd_cart_id');
      if (!cartId) {
        const cartRes = await ApiClient.createCart();
        cartId = cartRes.cart_id;
        localStorage.setItem('ipmd_cart_id', cartId);
      }
      let added = 0;
      for (const m of matchedMeds) {
        if (m.medicine_id) {
          try {
            await ApiClient.addCartItem(cartId, m.medicine_id, 1, prescriptionId || undefined);
            added++;
          } catch {}
        }
      }
      addToast('success', 'Added to Cart', `${added} matched medicine(s) added to your cart.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to add medicines';
      addToast('error', 'Add Failed', msg);
    } finally {
      setAddingAll(false);
    }
  };

  const matchedMedicineIds = new Set(matches.filter(m => m.auto_addable && m.medicine_id).map(m => m.medicine_id));
  const matchedMedicines = medicines.filter(m => matchedMedicineIds.has(m.medicine_id));

  const MedicineCard = ({ item, matched = false }: { item: Medicine; matched?: boolean }) => {
    const stockLevel = item.total_stock > 50
      ? { label: 'In Stock', color: 'var(--success)', bg: 'var(--success-bg)' }
      : item.total_stock > 10
        ? { label: 'Low Stock', color: 'var(--warning)', bg: 'var(--warning-bg)' }
        : { label: 'Almost Gone', color: 'var(--danger)', bg: 'var(--danger-bg)' };
    const isAdded = addedToCart === item.medicine_id;
    const isExpanded = expandedId === item.medicine_id;
    const hasDetail = item.manufacturer || item.dosage_form || item.strength || item.description;
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: matched ? 'var(--sp-4)' : 'var(--sp-5)', border: matched ? '2px solid var(--primary)' : undefined }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: matched ? 'var(--sp-2)' : 'var(--sp-3)' }}>
            <ScheduleBadge schedule={item.schedule} />
            {matched && <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-bg)', padding: '2px var(--sp-2)', borderRadius: 'var(--radius-pill)' }}>Matched</span>}
          </div>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--sp-1)', lineHeight: 1.4 }}>{item.name}</h3>
          <p className="text-caption" style={{ marginBottom: 'var(--sp-3)' }}>{item.generic_name || '—'}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-1)', marginBottom: matched ? 'var(--sp-2)' : 'var(--sp-3)' }}>
            {item.dosage_form && <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 'var(--radius-pill)' }}>{item.dosage_form}</span>}
            {item.strength && <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 'var(--radius-pill)' }}>{item.strength}</span>}
            {item.pack_size && <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 'var(--radius-pill)' }}>{item.pack_size}</span>}
            {item.manufacturer && <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 'var(--radius-pill)' }}>{item.manufacturer}</span>}
          </div>
          {hasDetail && (
            <button onClick={() => setExpandedId(isExpanded ? null : item.medicine_id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 'var(--text-xs)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0, marginBottom: matched ? 'var(--sp-2)' : 'var(--sp-3)' }}>
              <IconHelpCircle size={12} />
              {isExpanded ? 'Less info' : 'More info'}
            </button>
          )}
          {isExpanded && (
            <div style={{ padding: 'var(--sp-2)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: matched ? 'var(--sp-2)' : 'var(--sp-3)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              {item.description && <div style={{ color: 'var(--text-primary)', marginBottom: 'var(--sp-1)' }}><strong>Description:</strong> {item.description}</div>}
              {item.manufacturer && <div style={{ color: 'var(--text-secondary)' }}><strong>Manufacturer:</strong> {item.manufacturer}</div>}
              {item.dosage_form && <div style={{ color: 'var(--text-secondary)' }}><strong>Form:</strong> {item.dosage_form}</div>}
              {item.strength && <div style={{ color: 'var(--text-secondary)' }}><strong>Strength:</strong> {item.strength}</div>}
              {item.pack_size && <div style={{ color: 'var(--text-secondary)' }}><strong>Pack Size:</strong> {item.pack_size}</div>}
            </div>
          )}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: matched ? 'var(--sp-3)' : 'var(--sp-4)' }}>
            <span className="tabular-nums" style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--primary-dark)' }}>
              {item.price != null ? `₹${item.price.toFixed(2)}` : '—'}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: stockLevel.color, background: stockLevel.bg, padding: '2px var(--sp-2)', borderRadius: 'var(--radius-pill)' }}>
              {stockLevel.label} ({item.total_stock})
            </span>
          </div>
          <button className={`btn ${isAdded ? 'btn-secondary' : 'btn-primary'}`} style={{ width: '100%' }} onClick={() => handleAddToCart(item)} disabled={addingToCart === item.medicine_id}>
            {addingToCart === item.medicine_id ? 'Adding...' : isAdded ? <><IconCheckCircle size={16} />Added</> : <><IconShoppingCart size={16} />Add to Cart</>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader
        title="Medicine Catalog"
        subtitle={prescriptionId ? "Prescription medicines matched. Add them to your cart to order." : "Unified catalog merging central inventory and verified partner pharmacy stock."}
      />

      {prescriptionId && (
        <div className="card" style={{ padding: 'var(--sp-5)', background: 'var(--primary-bg)', borderColor: 'var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
            <IconPackage size={22} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--primary-dark)' }}>
              {matchLoading ? 'Matching prescription medicines...' : 'Prescription Medicines'}
            </span>
            {!matchLoading && matchedMedicines.length > 0 && (
              <button className="btn btn-primary btn-sm" onClick={handleAddAllMatched} disabled={addingAll} style={{ marginLeft: 'auto' }}>
                {addingAll ? 'Adding...' : <><IconShoppingCart size={14} /> Add All to Cart</>}
              </button>
            )}
          </div>
          {!matchLoading && matchedMedicines.length === 0 && (
            <div style={{ padding: 'var(--sp-6) var(--sp-4)', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
              <IconSearch size={32} style={{ color: 'var(--text-muted)', marginBottom: 'var(--sp-3)' }} />
              <p style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)', marginBottom: 'var(--sp-1)' }}>0 medicines matched from your prescription</p>
              <p className="text-caption">The medicines in your prescription were not found in our catalog. Browse below to find alternatives or search manually.</p>
            </div>
          )}
          {!matchLoading && matchedMedicines.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--sp-3)' }}>
              {matchedMedicines.map((item) => <MedicineCard key={item.medicine_id} item={item} matched />)}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap', padding: 'var(--sp-3) var(--sp-4)' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '240px' }}>
          <IconSearch size={16} className="search-icon" />
          <input type="text" className="input" placeholder="Search by brand name or active salt/generic..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} style={{ paddingLeft: '36px' }} />
        </div>
        <select className="select" value={filterSched} onChange={(e) => handleFilterChange(e.target.value)} style={{ width: '180px', flexShrink: 0 }}>
          <option value="all">All Schedules</option>
          <option value="otc">Schedule OTC</option>
          <option value="h">Schedule H</option>
          <option value="h1">Schedule H1</option>
          <option value="x">Schedule X</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={handleSearch}>Search</button>
      </div>

      {loading ? (
        <LoadingSpinner size={36} text="Loading medicines..." />
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={() => loadInitial()}>Retry</button>
        </div>
      ) : medicines.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--sp-12) var(--sp-6)' }}>
          <div className="empty-state-icon"><IconSearch size={28} /></div>
          <h3>No medicines found</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {prescriptionId ? 'Continue Shopping' : 'Browse Catalog'}
            </h3>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{medicines.length} loaded</span>
          </div>
          <div className="grid-3">
            {medicines.map((item) => <MedicineCard key={item.medicine_id} item={item} />)}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={observerRef} style={{ height: '1px' }} />

          {loadingMore && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-4)' }}>
              <IconLoader size={20} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginLeft: 'var(--sp-2)' }}>Loading more medicines...</span>
            </div>
          )}

          {!hasMore && medicines.length > 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--sp-4)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              You've seen all {medicines.length} medicines
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>Loading catalog...</div>}>
      <CatalogContent />
    </Suspense>
  );
}
