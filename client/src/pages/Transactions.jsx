import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Trash2, Edit3, Tag } from 'lucide-react';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for adding manual purchase
  const [newTx, setNewTx] = useState({
    name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    merchant_name: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchTransactions();
  }, [search, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let url = `/api/transactions?search=${encodeURIComponent(search)}`;
      if (selectedCategory) url += `&category_id=${selectedCategory}`;

      const res = await fetch(url);
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (txId, categoryId) => {
    try {
      const res = await fetch(`/api/transactions/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId }),
      });
      if (res.ok) {
        fetchTransactions();
      }
    } catch (err) {
      console.error('Failed to update transaction category:', err);
    }
  };

  const handleDelete = async (txId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await fetch(`/api/transactions/${txId}`, { method: 'DELETE' });
      fetchTransactions();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newTx.name || !newTx.amount || !newTx.date) return;

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewTx({ name: '', amount: '', date: new Date().toISOString().split('T')[0], category_id: '', merchant_name: '' });
        fetchTransactions();
      }
    } catch (err) {
      console.error('Failed to add transaction:', err);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Transactions & Purchases</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            View, search, and recategorize all synced bank transactions
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          <span>Add Manual Purchase</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: '#9ca3af' }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '40px' }}
              placeholder="Search by merchant, purchase description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ width: '220px' }}>
            <select
              className="input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card" style={{ padding: '0' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Channel / Type</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>
                    No transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ color: '#9ca3af', fontSize: '13px', whiteSpace: 'nowrap' }}>{tx.date}</td>
                    <td>
                      <div style={{ fontWeight: '600', color: '#fff' }}>{tx.name}</div>
                      {tx.merchant_name && tx.merchant_name !== tx.name && (
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{tx.merchant_name}</div>
                      )}
                    </td>
                    <td>
                      <select
                        className="input"
                        style={{ padding: '4px 8px', fontSize: '12px', width: 'auto', background: 'rgba(255,255,255,0.05)' }}
                        value={tx.category_id || ''}
                        onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.icon} {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className="badge badge-yellow" style={{ textTransform: 'capitalize' }}>
                        {tx.payment_channel || 'Online'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: tx.amount < 0 ? '#34d399' : '#f87171' }}>
                      {tx.amount < 0 ? `+${formatCurrency(Math.abs(tx.amount))}` : `-${formatCurrency(tx.amount)}`}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDelete(tx.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Manual Purchase Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ width: '480px', maxWidth: '90%' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Add Manual Purchase</h2>
            
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Purchase Name / Merchant</label>
                <input 
                  type="text" 
                  className="input" 
                  required
                  placeholder="e.g. Local Grocery Store"
                  value={newTx.name} 
                  onChange={(e) => setNewTx({ ...newTx, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Amount ($ USD)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="input" 
                    required
                    placeholder="45.50"
                    value={newTx.amount} 
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Date</label>
                  <input 
                    type="date" 
                    className="input" 
                    required
                    value={newTx.date} 
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Category</label>
                <select
                  className="input"
                  value={newTx.category_id}
                  onChange={(e) => setNewTx({ ...newTx, category_id: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
