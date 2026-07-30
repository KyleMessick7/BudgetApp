import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, AlertTriangle, Trash2 } from 'lucide-react';
import MonthSelector from '../components/MonthSelector';

export default function Budgets({ selectedMonth, setSelectedMonth }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form States
  const [newCat, setNewCat] = useState({ name: '', icon: '🎯', color: '#6366f1', budget_limit: '300' });
  const [editCat, setEditCat] = useState({ id: null, name: '', icon: '', color: '#3b82f6', budget_limit: '' });

  const colorPresets = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#3b82f6'];

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

  const openEditModal = (cat) => {
    setEditCat({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || '📁',
      color: cat.color || '#3b82f6',
      budget_limit: cat.budget_limit || 0
    });
    setShowEditModal(true);
  };

  const handleEditCategorySubmit = async (e) => {
    e.preventDefault();
    if (!editCat.name || !editCat.id) return;

    try {
      const res = await fetch(`/api/categories/${editCat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCat.name,
          icon: editCat.icon,
          color: editCat.color,
          budget_limit: parseFloat(editCat.budget_limit) || 0
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchCategories();
      }
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (cat.name === 'Income' || cat.name === 'Uncategorized') {
      alert('System categories (Income, Uncategorized) cannot be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${cat.name}"? Any transactions assigned to this category will automatically become Uncategorized.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
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
            Set category target limits, icons, colors, and monitor monthly spending progress
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
            const isSystem = cat.name === 'Income' || cat.name === 'Uncategorized';
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => openEditModal(cat)} 
                        title="Edit Category"
                        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
                      >
                        <Edit2 size={16} />
                      </button>

                      {!isSystem && (
                        <button 
                          onClick={() => handleDeleteCategory(cat)} 
                          title="Delete Category"
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
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
                        <span style={{ fontWeight: '600', color: '#cbd5e1' }}>
                          {limit > 0 ? formatCurrency(limit) : 'No Limit Set'}
                        </span>
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

      {/* Edit Category Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ width: '440px', maxWidth: '90%' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Edit Category Details</h2>
            
            <form onSubmit={handleEditCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Category Name</label>
                <input 
                  type="text" 
                  className="input" 
                  required
                  value={editCat.name} 
                  onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '80px' }}>
                  <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Icon</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={editCat.icon} 
                    onChange={(e) => setEditCat({ ...editCat, icon: e.target.value })}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Monthly Target ($)</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={editCat.budget_limit} 
                    onChange={(e) => setEditCat({ ...editCat, budget_limit: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '8px' }}>Color Theme</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditCat({ ...editCat, color: c })}
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: c, border: editCat.color === c ? '2px solid #ffffff' : 'none',
                        cursor: 'pointer', transform: editCat.color === c ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s ease'
                      }}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={editCat.color}
                    onChange={(e) => setEditCat({ ...editCat, color: e.target.value })}
                    style={{ width: '32px', height: '32px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

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

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '8px' }}>Color Theme</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCat({ ...newCat, color: c })}
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: c, border: newCat.color === c ? '2px solid #ffffff' : 'none',
                        cursor: 'pointer', transform: newCat.color === c ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s ease'
                      }}
                    />
                  ))}
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
