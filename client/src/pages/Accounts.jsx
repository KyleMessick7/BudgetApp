import React, { useState, useEffect } from 'react';
import { Landmark, CreditCard, ShieldCheck, RefreshCw, Trash2, Calendar, History, Unlink, User, Key } from 'lucide-react';
import PlaidLinkButton from '../components/PlaidLinkButton';

export default function Accounts({ isSyncing, onSync }) {
  const [accounts, setAccounts] = useState([]);
  const [keyPoolStatus, setKeyPoolStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [historyDays, setHistoryDays] = useState('365');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyStatus, setHistoryStatus] = useState(null);

  useEffect(() => {
    fetchAccounts();
    fetchCredentialsStatus();
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

  const fetchCredentialsStatus = async () => {
    try {
      const res = await fetch('/api/plaid/credentials-status');
      const data = await res.json();
      if (data.success) {
        setKeyPoolStatus(data.poolStatus || []);
      }
    } catch (err) {
      console.error('Failed to load credentials status:', err);
    }
  };

  const handleFetchHistorical = async () => {
    try {
      setFetchingHistory(true);
      setHistoryStatus('Connecting to Plaid and pulling historical transactions...');
      const res = await fetch('/api/plaid/fetch-historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: parseInt(historyDays) }),
      });
      const data = await res.json();
      if (data.success) {
        setHistoryStatus(`Success! Imported ${data.importedCount} historical transactions.`);
        if (onSync) onSync();
        setTimeout(() => {
          setShowHistoryModal(false);
          setHistoryStatus(null);
        }, 2500);
      } else {
        setHistoryStatus(`Error: ${data.error || 'Fetch failed'}`);
      }
    } catch (err) {
      console.error('Failed to fetch historical transactions:', err);
      setHistoryStatus('Failed to fetch historical transactions.');
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleUnlinkItem = async (itemId, bankName) => {
    if (!window.confirm(`Are you sure you want to unlink ${bankName}? This will revoke access on Plaid's servers to free up a connection slot.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/plaid/items/${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchAccounts();
        fetchCredentialsStatus();
        if (onSync) onSync();
      } else {
        alert(`Failed to unlink bank: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to unlink bank item:', err);
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
        fetchCredentialsStatus();
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
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Connected Bank Accounts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Manage linked checking, savings, and credit cards across Plaid API keys
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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

          <button className="btn btn-secondary" onClick={() => setShowHistoryModal(true)}>
            <History size={16} />
            <span>Pull Older History</span>
          </button>

          <button className="btn btn-secondary" onClick={onSync} disabled={isSyncing}>
            <RefreshCw size={16} className={isSyncing ? 'spin-anim' : ''} />
            <span>Sync Transactions</span>
          </button>

          <PlaidLinkButton onSuccessCallback={() => { fetchAccounts(); fetchCredentialsStatus(); }} />
        </div>
      </div>

      {/* Key Pool Capacity Overview Bar */}
      {keyPoolStatus.length > 0 && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: '28px', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Key size={18} color="#6366f1" />
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>Plaid Trial API Key Capacity Pool</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {keyPoolStatus.map((cred) => {
              const ownerName = cred.keyIndex === 1 ? 'Kyle' : cred.keyIndex === 2 ? 'Mallory' : `Key #${cred.keyIndex}`;
              const themeColor = cred.keyIndex === 1 ? '#6366f1' : cred.keyIndex === 2 ? '#ec4899' : '#8b5cf6';
              const percent = Math.min(Math.round((cred.activeItemsCount / cred.maxItemsLimit) * 100), 100);

              return (
                <div key={cred.keyIndex} style={{
                  padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(0,0,0,0.2)', border: `1px solid ${themeColor}40`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color={themeColor} /> {ownerName}'s Plaid Key
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: cred.hasAvailableSlot ? '#34d399' : '#f87171' }}>
                      {cred.activeItemsCount} / {cred.maxItemsLimit} Banks
                    </span>
                  </div>

                  <div className="progress-bar-bg" style={{ height: '6px' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${percent}%`,
                        background: themeColor
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connected Accounts Cards Grid */}
      {loading ? (
        <div style={{ color: '#9ca3af' }}>Loading connected accounts...</div>
      ) : accounts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Landmark size={48} color="#6366f1" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>No Bank Accounts Linked Yet</h2>
          <p style={{ color: '#9ca3af', marginBottom: '24px', maxWidth: '440px', margin: '0 auto 24px auto' }}>
            Connect your bank accounts securely using Plaid Sandbox or Production to sync your real purchases.
          </p>
          <PlaidLinkButton onSuccessCallback={() => { fetchAccounts(); fetchCredentialsStatus(); }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {accounts.map((acc) => {
            const isCredit = acc.type === 'credit';
            const isMock = acc.item_id && acc.item_id.startsWith('mock_');
            const ownerName = acc.key_owner || 'Kyle';
            const isMallory = ownerName === 'Mallory';
            const ownerThemeColor = isMallory ? '#ec4899' : '#6366f1';

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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Key Owner Badge */}
                    <span 
                      style={{ 
                        fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px',
                        background: `${ownerThemeColor}20`, color: ownerThemeColor, border: `1px solid ${ownerThemeColor}40`,
                        display: 'inline-flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <User size={10} /> {ownerName}'s Key
                    </span>

                    <button 
                      onClick={() => handleUnlinkItem(acc.item_id, acc.institution_name || acc.name)}
                      title="Unlink Bank & Free Plaid Slot"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    >
                      <Unlink size={16} />
                    </button>
                  </div>
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

      {/* Fetch Older History Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ width: '460px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <History size={24} color="#6366f1" />
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Fetch Historical Bank History</h2>
            </div>
            
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
              Select how far back you want Plaid to retrieve past transactions from your connected bank accounts:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '8px' }}>Historical Timeframe</label>
                <select
                  className="input"
                  value={historyDays}
                  onChange={(e) => setHistoryDays(e.target.value)}
                  disabled={fetchingHistory}
                >
                  <option value="90" style={{ color: '#000000', backgroundColor: '#ffffff' }}>Past 90 Days (~3 Months)</option>
                  <option value="180" style={{ color: '#000000', backgroundColor: '#ffffff' }}>Past 180 Days (~6 Months)</option>
                  <option value="365" style={{ color: '#000000', backgroundColor: '#ffffff' }}>Past 1 Year (365 Days - Recommended)</option>
                  <option value="730" style={{ color: '#000000', backgroundColor: '#ffffff' }}>Past 2 Years (730 Days - Plaid Limit)</option>
                </select>
              </div>

              {historyStatus && (
                <div style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  background: 'rgba(99, 102, 241, 0.15)', 
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  fontSize: '13px',
                  color: '#fff'
                }}>
                  {historyStatus}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowHistoryModal(false)}
                  disabled={fetchingHistory}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleFetchHistorical}
                  disabled={fetchingHistory}
                >
                  <History size={16} className={fetchingHistory ? 'spin-anim' : ''} />
                  <span>{fetchingHistory ? 'Fetching History...' : 'Fetch Historical Purchases'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
