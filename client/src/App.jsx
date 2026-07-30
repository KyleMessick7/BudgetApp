import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Accounts from './pages/Accounts';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGlobalSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/plaid/sync', { method: 'POST' });
      const data = await res.json();
      console.log('Sync result:', data);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error('Failed to sync bank purchases:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onSync={handleGlobalSync}
        isSyncing={isSyncing}
      />

      <main className="main-wrapper" key={refreshKey}>
        {activeTab === 'dashboard' && <Dashboard onAccountLinked={handleGlobalSync} />}
        {activeTab === 'transactions' && <Transactions />}
        {activeTab === 'budgets' && <Budgets />}
        {activeTab === 'accounts' && <Accounts isSyncing={isSyncing} onSync={handleGlobalSync} />}
      </main>
    </div>
  );
}
