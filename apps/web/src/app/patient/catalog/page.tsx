'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiClient } from '../../../lib/api';
import { ScheduleBadge } from '../../../components/Badges';
import { IconShoppingCart, IconSearch, IconCheckCircle, IconAlertTriangle, IconPackage } from '../../../components/Icons';
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

function CatalogContent() {
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get('prescription_id') || null;

  const [search, setSearch] = useState('');
  const [filterSched, setFilterSched] = useState('all');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedToCart, setAddedToCart] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    loadMedicines();
    if (prescriptionId) {
      loadMatches(prescriptionId);
    }
  }, [prescriptionId]);

  async function loadMedicines(query?: string, schedule?: string) {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { limit: 50 };
      if (query) params.q = query;
      if (schedule && schedule !== 'all') params.schedule = schedule;
      const res = await ApiClient.searchMedicines(params);
      setMedicines(res.data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load medicines';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

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
    loadMedicines(search, filterSched);
  };

  const filtered = medicines.filter((m) => {
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.generic_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesSched = filterSched === 'all' || m.schedule === filterSched;
    return matchesSearch && matchesSched;
  });

  const getStockLevel = (stock: number) => {
    if (stock > 50) return { label: 'In Stock', color: 'var(--success)', bg: 'var(--success-bg)' };
    if (stock > 10) return { label: 'Low Stock', color: 'var(--warning)', bg: 'var(--warning-bg)' };
    return { label: 'Almost Gone', color: 'var(--danger)', bg: 'var(--danger-bg)' };
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
  const unmatchedMedicines = filtered.filter(m => !matchedMedicineIds.has(m.medicine_id));

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      <PageHeader
        title="Medicine Catalog"
        subtitle={prescriptionId ? "Prescription medicines matched. Add them to your cart to order." : "Unified catalog merging central inventory and verified partner pharmacy stock."}
      />

      {prescriptionId && (
        <div className="card" style={{ padding: 'var(--sp-4)', background: 'var(--primary-bg)', borderColor: 'var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <IconPackage size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>
                {matchLoading ? 'Matching prescription...' : `${matchedMedicines.length} medicine(s) matched from your prescription`}
              </span>
            </div>
            {matchedMedicines.length > 0 && (
              <button className="btn btn-primary btn-sm" onClick={handleAddAllMatched} disabled={addingAll}>
                {addingAll ? 'Adding...' : <><IconShoppingCart size={14} /> Add All to Cart</>}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap', padding: 'var(--sp-3) var(--sp-4)' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '240px' }}>
          <IconSearch size={16} className="search-icon" />
          <input type="text" className="input" placeholder="Search by brand name or active salt/generic..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} style={{ paddingLeft: '36px' }} />
        </div>
        <select className="select" value={filterSched} onChange={(e) => { setFilterSched(e.target.value); loadMedicines(search, e.target.value); }} style={{ width: '180px', flexShrink: 0 }}>
          <option value="all">All Schedules</option>
          <option value="otc">Schedule OTC</option>
          <option value="h">Schedule H</option>
          <option value="h1">Schedule H1</option>
          <option value="x">Schedule X</option>
        </select>
        <button className="btn btn-primary btn-sm" onClick={handleSearch}>Search</button>
      </div>

      {loading ? (
        <div className="grid-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: '220px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : error ? (
        <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
          <IconAlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-3)' }} onClick={() => loadMedicines()}>Retry</button>
        </div>
      ) : (
        <>
          {prescriptionId && matchedMedicines.length > 0 && (
            <div>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: 'var(--sp-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Matched from Prescription
              </h3>
              <div className="grid-3">
                {matchedMedicines.map((item) => {
                  const stockLevel = getStockLevel(item.total_stock);
                  const isAdded = addedToCart === item.medicine_id;
                  return (
                    <div key={item.medicine_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'var(--sp-5)', border: '2px solid var(--primary)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
                          <ScheduleBadge schedule={item.schedule} />
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-bg)', padding: '2px var(--sp-2)', borderRadius: 'var(--radius-pill)' }}>Matched</span>
                        </div>
                        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--sp-1)', lineHeight: 1.4 }}>{item.name}</h3>
                        <p className="text-caption" style={{ marginBottom: 'var(--sp-4)' }}>{item.generic_name || '—'}</p>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
                          <span className="tabular-nums" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--primary-dark)' }}>
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
                })}
              </div>
            </div>
          )}

          <div>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--sp-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {prescriptionId && matchedMedicines.length > 0 ? 'All Medicines' : 'Browse Catalog'}
            </h3>
            <div className="grid-3">
              {filtered.map((item) => {
                const stockLevel = getStockLevel(item.total_stock);
                const isAdded = addedToCart === item.medicine_id;
                return (
                  <div key={item.medicine_id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'var(--sp-5)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
                        <ScheduleBadge schedule={item.schedule} />
                      </div>
                      <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--sp-1)', lineHeight: 1.4 }}>{item.name}</h3>
                      <p className="text-caption" style={{ marginBottom: 'var(--sp-4)' }}>{item.generic_name || '—'}</p>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
                        <span className="tabular-nums" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--primary-dark)' }}>
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
              })}
            </div>
          </div>
        </>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state" style={{ padding: 'var(--sp-12) var(--sp-6)' }}>
          <div className="empty-state-icon"><IconSearch size={28} /></div>
          <h3>No medicines found</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      )}
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
