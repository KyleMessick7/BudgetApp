import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';
import PlaidLinkButton from '../components/PlaidLinkButton';

export default function Dashboard({ onAccountLinked }) {
  const [summary, setSummary] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  if (loading || !summary) {
    return <div style={{ color: '#9ca3af', padding: '40px 0' }}>Loading financial overview...</div>;
  }

  const budgetUsagePercent = summary.totalBudgetLimit > 0 
    ? Math.min(Math.round((summary.monthExpenses / summary.totalBudgetLimit) * 100), 100) 
    : 0;

  return (
    <div>
      {/* Top Banner Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Financial Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Real-time spending overview & connected bank accounts
          </p>
        </div>
        <PlaidLinkButton onSuccessCallback={() => { fetchDashboardData(); if (onAccountLinked) onAccountLinked(); }} />
      </div>

      {/* Overview Metric Cards */}
      <div className="grid-3">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="card-title">Net Bank Balance</span>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px', color: '#6366f1' }}>
              <Wallet size={20} />
            </div>
          </div>
          <div className="card-value">{formatCurrency(summary.netBalance)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#9ca3af', marginTop: '12px' }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>{summary.connectedAccountsCount} Accounts Linked & Synced</span>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="card-title">Monthly Income</span>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '10px', color: '#10b981' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="card-value" style={{ color: '#34d399' }}>{formatCurrency(summary.monthIncome)}</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '12px' }}>
            Current Month Deposits
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="card-title">Monthly Spending</span>
            <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '10px', color: '#ef4444' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="card-value" style={{ color: '#f87171' }}>{formatCurrency(summary.monthExpenses)}</div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
              <span>Target Budget ({formatCurrency(summary.totalBudgetLimit)})</span>
              <span>{budgetUsagePercent}% Used</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${budgetUsagePercent}%`,
                  background: budgetUsagePercent > 90 ? 'var(--accent-red)' : budgetUsagePercent > 75 ? 'var(--accent-yellow)' : 'var(--accent-green)'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Category Chart & Recent Transactions */}
      <div className="grid-2">
        {/* Category Breakdown Chart */}
        <div className="card">
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Category Spending Breakdown</h2>
          {summary.categoryBreakdown.length === 0 ? (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>No spending recorded this month yet.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ width: '220px', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.categoryBreakdown}
                      dataKey="total_spent"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {summary.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val) => formatCurrency(val)}
                      contentStyle={{ background: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                {summary.categoryBreakdown.map((cat) => (
                  <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{cat.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>{cat.name}</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{formatCurrency(cat.total_spent)}</span>
                  </div>
                ))}
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
                  justifySpace: 'between', 
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
