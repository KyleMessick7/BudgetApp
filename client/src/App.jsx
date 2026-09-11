import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Accounts from './pages/Accounts';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);

  // Shared Month Selector State (Defaults to current calendar month on launch)
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const showToast = (message, type = 'info', duration = 5000) => {
    setToast({ message, type });
    if (duration > 0) {
      setTimeout(() => {
        setToast((current) => (current && current.message === message ? null : current));
      }, duration);
    }
  };

  const handleGlobalSync = async () => {
    try {
      setIsSyncing(true);
      showToast('Syncing latest transactions with Plaid...', 'info', 0);
      const res = await fetch('/api/plaid/sync', { method: 'POST' });
      const data = await res.json();
      console.log('Sync result:', data);

      if (!res.ok || data.error) {
        showToast(`Sync failed: ${data.details || data.error || 'Unknown error'}`, 'error', 6000);
      } else {
        const added = data.added || 0;
        const modified = data.modified || 0;
        const removed = data.removed || 0;
        const msg = (added > 0 || modified > 0 || removed > 0)
          ? `Sync complete! +${added} added, ~${modified} updated, -${removed} removed`
          : (data.message || 'Sync complete! All accounts are up to date.');
        showToast(msg, 'success', 5000);
      }
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error('Failed to sync bank purchases:', err);
      showToast(`Sync failed: ${err.message}`, 'error', 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="app-container">
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '32px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          borderRadius: '12px',
          backdropFilter: 'blur(16px)',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          border: toast.type === 'error' 
            ? '1px solid rgba(239, 68, 68, 0.4)'
            : toast.type === 'success'
              ? '1px solid rgba(16, 185, 129, 0.4)'
              : '1px solid rgba(99, 102, 241, 0.4)',
          background: toast.type === 'error'
            ? 'rgba(127, 29, 29, 0.95)'
            : toast.type === 'success'
              ? 'rgba(6, 78, 59, 0.95)'
              : 'rgba(30, 27, 75, 0.95)',
          color: '#ffffff',
        }}>
          {toast.type === 'info' && <RefreshCw size={16} className="spin-anim" style={{ color: '#818cf8' }} />}
          {toast.type === 'success' && <CheckCircle2 size={18} style={{ color: '#34d399' }} />}
          {toast.type === 'error' && <AlertCircle size={18} style={{ color: '#f87171' }} />}
          <span>{toast.message}</span>
          <button 
            onClick={() => setToast(null)} 
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 2, display: 'flex', marginLeft: '6px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onSync={handleGlobalSync}
        isSyncing={isSyncing}
      />

      <main className="main-wrapper" key={refreshKey}>
        {activeTab === 'dashboard' && (
          <Dashboard 
            onAccountLinked={handleGlobalSync} 
            isSyncing={isSyncing} 
            onSync={handleGlobalSync}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        )}
        {activeTab === 'transactions' && <Transactions />}
        {activeTab === 'budgets' && (
          <Budgets 
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        )}
        {activeTab === 'accounts' && <Accounts isSyncing={isSyncing} onSync={handleGlobalSync} />}
      </main>
    </div>
  );
}
