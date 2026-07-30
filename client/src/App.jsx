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

  // Shared Month Selector State (Defaults to current calendar month on launch)
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

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
