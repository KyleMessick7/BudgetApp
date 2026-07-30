import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import MonthSelector from '../components/MonthSelector';

export default function Budgets({ selectedMonth, setSelectedMonth }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editLimit, setEditLimit] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newCat, setNewCat] = useState({ name: '', icon: '🎯', color: '#6366f1', budget_limit: '300' });

  useEffect(() => {
    fetchCategories();
  }, [selectedMonth]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const activeMonth = selectedMonth || new Date().toISOString().slice(0, 7);
      const res = await fetch(`/api/categories?month=${activeMonth}`);
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditLimit(cat.budget_limit || 0);
  };

  const saveEdit = async (catId) => {
    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget_limit: parseFloat(editLimit) || 0 }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchCategories();
      }
    } catch (err) {
      console.error('Failed to save budget limit:', err);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCat.name) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCat, budget_limit: parseFloat(newCat.budget_limit) || 0 }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewCat({ name: '', icon: '🎯', color: '#6366f1', budget_limit: '300' });
        fetchCategories();
      }
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Monthly Budgets & Category Targets</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Set category target limits and monitor monthly spending progress
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <MonthSelector selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />

          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            <span>New Budget Category</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {loading ? (
          <div style={{ color: '#9ca3af' }}>Loading budget categories...</div>
        ) : (
          categories.map((cat) => {
            const spent = cat.spent_current_month || 0;
            const limit = cat.budget_limit || 0;
            const isIncome = cat.name === 'Income';
            const percent = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
            const isOver = limit > 0 && spent > limit;

            return (
              <div key={cat.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '12px',
                        background: cat.color ? `${cat.color}25` : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                      }}>
                        {cat.icon || '📁'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{cat.name}</h3>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{cat.transaction_count || 0} Transactions in Month</div>
                      </div>
                    </div>

                    {!isIncome && (
                      editingId === cat.id ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => saveEdit(cat.id)} style={{ background: '#10b981', border: 'none', borderRadius: '6px', padding: '4px', color: '#fff', cursor: 'pointer' }}>
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', padding: '4px', color: '#fff', cursor: 'pointer' }}>
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(cat)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                          <Edit2 size={16} />
                        </button>
                      )
                    )}
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                      <span style={{ color: '#9ca3af' }}>Spent in month:</span>
                      <span style={{ fontWeight: '700', color: isIncome ? '#34d399' : '#fff' }}>
                        {formatCurrency(spent)}
                      </span>
                    </div>

                    {!isIncome && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                        <span style={{ color: '#9ca3af' }}>Monthly Limit:</span>
                        {editingId === cat.id ? (
                          <input
                            type="number"
                            className="input"
                            style={{ width: '100px', padding: '4px 8px', fontSize: '13px' }}
                            value={editLimit}
                            onChange={(e) => setEditLimit(e.target.value)}
                          />
                        ) : (
                          <span style={{ fontWeight: '600', color: '#cbd5e1' }}>
                            {limit > 0 ? formatCurrency(limit) : 'No Limit Set'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {!isIncome && limit > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: isOver ? '#f87171' : '#9ca3af', marginBottom: '6px' }}>
                      <span>{isOver ? 'OVER BUDGET' : 'Target Progress'}</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${percent}%`,
                          background: isOver ? '#ef4444' : percent > 80 ? '#f59e0b' : cat.color || '#6366f1'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add New Category Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ width: '420px', maxWidth: '90%' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Create Budget Category</h2>
            
            <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Category Name</label>
                <input 
                  type="text" 
                  className="input" 
                  required
                  placeholder="e.g. Subscriptions & Tech"
                  value={newCat.name} 
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '80px' }}>
                  <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Icon</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="🎮"
                    value={newCat.icon} 
                    onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Monthly Target ($)</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="250"
                    value={newCat.budget_limit} 
                    onChange={(e) => setNewCat({ ...newCat, budget_limit: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
