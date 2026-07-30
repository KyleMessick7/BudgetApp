import React from 'react';
import { LayoutDashboard, ReceiptText, PieChart, Landmark, RefreshCw } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onSync, isSyncing }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'budgets', label: 'Budgets & Goals', icon: PieChart },
    { id: 'accounts', label: 'Bank Accounts', icon: Landmark },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <div className="brand-icon">V</div>
          <div>
            <div className="brand-title">VaultBudget</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Smart Bank Sync</div>
          </div>
        </div>

        <nav className="nav-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ padding: '0 8px' }}>
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '12px' }}
          onClick={onSync}
          disabled={isSyncing}
        >
          <RefreshCw size={16} className={isSyncing ? 'spin-anim' : ''} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Bank Purchases'}</span>
        </button>

        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .spin-anim { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    </aside>
  );
}
