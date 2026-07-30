import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, Wallet, PieChart as PieIcon, RefreshCw, ArrowLeft, RotateCcw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function Dashboard({ isSyncing, onSync }) {
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drill-down Pie Chart States
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  const [loadingCategoryTxs, setLoadingCategoryTxs] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, txRes] = await Promise.all([
        fetch('/api/analytics/summary'),
        fetch('/api/transactions?limit=6')
      ]);

      const sumData = await sumRes.json();
      const txData = await txRes.json();

      setSummary(sumData);
      setRecentTransactions(txData.transactions || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (cat) => {
    try {
      if (selectedCategory && selectedCategory.id === cat.id) {
        // Toggle collapse if clicking the same category
        handleResetView();
        return;
      }

      setSelectedCategory(cat);
      setHoveredIndex(null);
      setLoadingCategoryTxs(true);

      const res = await fetch(`/api/analytics/category-transactions/${cat.id}`);
      const transactions = await res.json();
      setCategoryTransactions(transactions || []);
    } catch (err) {
      console.error('Failed to load category transactions:', err);
    } finally {
      setLoadingCategoryTxs(false);
    }
  };

  const handleResetView = () => {
    setSelectedCategory(null);
    setCategoryTransactions([]);
    setHoveredIndex(null);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  if (loading || !summary) {
    return <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Loading dashboard analytics...</div>;
  }

  // Generate dynamic distinct color shades for individual transaction slices in drill-down mode
  const getSubSectionColor = (index, total, baseColor = '#6366f1') => {
    const baseHues = {
      '#6366f1': 239,
      '#f59e0b': 38,
      '#10b981': 160,
      '#ec4899': 330,
      '#8b5cf6': 262,
      '#06b6d4': 188,
      '#22c55e': 142,
      '#6b7280': 220,
    };
    const hue = baseHues[baseColor] !== undefined ? baseHues[baseColor] : (index * 45) % 360;
    const lightness = Math.max(35, 75 - (index % 6) * 8);
    const saturation = 85;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const activeCategoryList = summary.categoryBreakdown || [];

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Financial Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Real-time balance, monthly budget status, and category breakdown
          </p>
        </div>

        <button className="btn btn-secondary" onClick={onSync} disabled={isSyncing}>
          <RefreshCw size={16} className={isSyncing ? 'spin-anim' : ''} />
          <span>{isSyncing ? 'Syncing Purchases...' : 'Sync Bank Purchases'}</span>
        </button>
      </div>

      {/* Summary Cards Row */}
      <div className="grid-4" style={{ marginBottom: '28px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500' }}>Total Net Balance</span>
            <Wallet size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: summary.netBalance >= 0 ? '#fff' : '#f87171' }}>
            {formatCurrency(summary.netBalance)}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
            Across {summary.connectedAccountsCount} connected bank accounts
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500' }}>Monthly Expenses</span>
            <ArrowUpRight size={18} color="#f87171" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#f87171' }}>
            {formatCurrency(summary.monthExpenses)}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
            Spent in current calendar month
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500' }}>Monthly Income</span>
            <ArrowDownRight size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#34d399' }}>
            {formatCurrency(summary.monthIncome)}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
            Received this month
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500' }}>Net Cash Flow</span>
            <DollarSign size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: summary.netSavings >= 0 ? '#34d399' : '#f87171' }}>
            {summary.netSavings >= 0 ? `+${formatCurrency(summary.netSavings)}` : formatCurrency(summary.netSavings)}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
            Income minus monthly expenses
          </div>
        </div>
      </div>

      {/* Main Grid: Category Interactive Pie Chart & Recent Transactions */}
      <div className="grid-2">
        {/* Category Breakdown Chart with Drill-down */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
                {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name} Breakdown` : 'Category Spending Breakdown'}
              </h2>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                {selectedCategory ? 'Click anywhere on pie chart to collapse' : 'Click any category to expand individual purchases'}
              </p>
            </div>

            {selectedCategory && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={handleResetView}
              >
                <ArrowLeft size={14} />
                <span>Back to Overview</span>
              </button>
            )}
          </div>

          {activeCategoryList.length === 0 ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>No spending recorded this month yet.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              {/* Pie Chart Component */}
              <div style={{ width: '230px', height: '230px', cursor: 'pointer' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    {selectedCategory ? (
                      /* Category Subsections Pie Chart (Individual Transactions) */
                      <Pie
                        data={categoryTransactions}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        onClick={handleResetView}
                      >
                        {categoryTransactions.map((entry, index) => (
                          <Cell 
                            key={`sub-cell-${index}`} 
                            fill={getSubSectionColor(index, categoryTransactions.length, selectedCategory.color)}
                            stroke={hoveredIndex === index ? '#ffffff' : 'none'}
                            strokeWidth={hoveredIndex === index ? 3 : 0}
                            style={{
                              transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                              transformOrigin: 'center center',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          />
                        ))}
                      </Pie>
                    ) : (
                      /* Top-Level Categories Overview Pie Chart */
                      <Pie
                        data={activeCategoryList}
                        dataKey="total_spent"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={88}
                        paddingAngle={4}
                      >
                        {activeCategoryList.map((entry, index) => (
                          <Cell 
                            key={`cat-cell-${index}`} 
                            fill={entry.color || '#3b82f6'} 
                            stroke={hoveredIndex === index ? '#ffffff' : 'none'}
                            strokeWidth={hoveredIndex === index ? 3 : 0}
                            style={{
                              transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                              transformOrigin: 'center center',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleCategoryClick(entry)}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          />
                        ))}
                      </Pie>
                    )}
                    <Tooltip 
                      formatter={(val) => formatCurrency(val)}
                      contentStyle={{ background: '#1f2937', borderColor: 'rgba(255,255,255,0.2)', borderRadius: '8px', color: '#ffffff' }}
                      itemStyle={{ color: '#ffffff' }}
                      labelStyle={{ color: '#ffffff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Side Category / Transaction Expanded List */}
              <div style={{ flex: 1, minWidth: '220px', maxHeight: '250px', overflowY: 'auto' }}>
                {selectedCategory ? (
                  /* Expanded Individual Transactions (Largest to Smallest) */
                  loadingCategoryTxs ? (
                    <div style={{ color: '#9ca3af', fontSize: '13px', padding: '20px' }}>Loading purchases...</div>
                  ) : categoryTransactions.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontSize: '13px', padding: '20px' }}>No individual transactions found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase' }}>
                        Purchases (Largest to Smallest)
                      </div>
                      {categoryTransactions.map((tx, index) => {
                        const isHovered = hoveredIndex === index;
                        return (
                          <div 
                            key={tx.id}
                            style={{ 
                              display: 'flex', 
                              justify: 'space-between', 
                              alignItems: 'center', 
                              padding: '8px 10px',
                              borderRadius: '8px',
                              background: isHovered ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                              border: isHovered ? `1px solid ${selectedCategory.color || '#3b82f6'}` : '1px solid transparent',
                              transition: 'all 0.15s ease',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                              <div style={{ 
                                width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                                background: getSubSectionColor(index, categoryTransactions.length, selectedCategory.color) 
                              }} />
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: isHovered ? '#fff' : 'var(--text-main)' }}>
                                  {tx.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{tx.date}</div>
                              </div>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#f87171', marginLeft: '8px', flexShrink: 0 }}>
                              {formatCurrency(tx.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* Top-Level Categories List */
                  activeCategoryList.map((cat, index) => {
                    const isHovered = hoveredIndex === index;
                    return (
                      <div 
                        key={cat.id} 
                        style={{ 
                          display: 'flex', 
                          justify: 'space-between', 
                          alignItems: 'center', 
                          padding: '8px 10px',
                          marginBottom: '6px',
                          borderRadius: '8px',
                          background: isHovered ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                          border: isHovered ? `1px solid ${cat.color || '#3b82f6'}` : '1px solid transparent',
                          transition: 'all 0.15s ease',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleCategoryClick(cat)}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{cat.icon}</span>
                          <span style={{ fontSize: '14px', fontWeight: isHovered ? '700' : '500', color: isHovered ? '#fff' : 'var(--text-main)' }}>
                            {cat.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                          {formatCurrency(cat.total_spent)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Purchases List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Recent Purchases</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {recentTransactions.map((tx) => (
              <div 
                key={tx.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '10px 12px', 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '8px', 
                    background: tx.amount < 0 ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}>
                    {tx.category_icon || '💳'}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{tx.name}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{tx.date} • {tx.category_name || 'Uncategorized'}</div>
                  </div>
                </div>

                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '700',
                  color: tx.amount < 0 ? '#34d399' : '#f87171' 
                }}>
                  {tx.amount < 0 ? `+${formatCurrency(Math.abs(tx.amount))}` : `-${formatCurrency(tx.amount)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
