import React, { useState, useEffect } from 'react';
import { Landmark, CreditCard, ShieldCheck, RefreshCw, Trash2 } from 'lucide-react';
import PlaidLinkButton from '../components/PlaidLinkButton';

export default function Accounts({ isSyncing, onSync }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics/accounts');
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearMockData = async () => {
    if (!window.confirm('Are you sure you want to remove all mock/demo bank accounts and mock transactions? (Your real Plaid connected bank accounts will be kept!).')) {
      return;
    }
    try {
      const res = await fetch('/api/analytics/clear-mock-data', { method: 'POST' });
      if (res.ok) {
        fetchAccounts();
        if (onSync) onSync();
      }
    } catch (err) {
      console.error('Failed to clear mock data:', err);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  const hasMockAccounts = accounts.some(a => a.item_id && a.item_id.startsWith('mock_'));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Connected Bank Accounts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Manage linked checking, savings, and credit cards
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {hasMockAccounts && (
            <button 
              className="btn btn-secondary" 
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              onClick={handleClearMockData}
            >
              <Trash2 size={16} />
              <span>Clear Demo/Mock Data</span>
            </button>
          )}

          <button className="btn btn-secondary" onClick={onSync} disabled={isSyncing}>
            <RefreshCw size={16} />
            <span>Sync Transactions</span>
          </button>

          <PlaidLinkButton onSuccessCallback={fetchAccounts} />
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#9ca3af' }}>Loading connected accounts...</div>
      ) : accounts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Landmark size={48} color="#6366f1" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>No Bank Accounts Linked Yet</h2>
          <p style={{ color: '#9ca3af', marginBottom: '24px', maxWidth: '440px', margin: '0 auto 24px auto' }}>
            Connect your bank accounts securely using Plaid Sandbox or Production to sync your real purchases.
          </p>
          <PlaidLinkButton onSuccessCallback={fetchAccounts} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {accounts.map((acc) => {
            const isCredit = acc.type === 'credit';
            const isMock = acc.item_id && acc.item_id.startsWith('mock_');
            return (
              <div key={acc.id} className="card" style={{ opacity: isMock ? 0.75 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: isCredit ? 'rgba(236, 72, 153, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isCredit ? '#ec4899' : '#6366f1'
                    }}>
                      {isCredit ? <CreditCard size={22} /> : <Landmark size={22} />}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: '700' }}>{acc.name}</h3>
                      <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                        {acc.institution_name || 'Bank'} •••• {acc.mask || '1234'}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${isMock ? 'badge-yellow' : 'badge-green'}`} style={{ textTransform: 'capitalize' }}>
                    <ShieldCheck size={12} />
                    {isMock ? 'Demo Mock' : (acc.subtype || acc.type)}
                  </span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                    {isCredit ? 'Current Balance (Owed)' : 'Available Balance'}
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '700', color: isCredit ? '#f87171' : '#34d399' }}>
                    {formatCurrency(acc.current_balance)}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#6b7280', marginTop: '16px' }}>
                  <span>Plaid Item ID: {acc.item_id?.substring(0, 12)}...</span>
                  <span>Updated: {acc.updated_at ? acc.updated_at.split('T')[0] : 'Today'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
