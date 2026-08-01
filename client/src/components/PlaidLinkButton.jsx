import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { PlusCircle, Landmark, ChevronDown, User } from 'lucide-react';

export default function PlaidLinkButton({ onSuccessCallback, selectedKeyIndex = null }) {
  const [token, setToken] = useState(null);
  const [activeClientId, setActiveClientId] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedKey, setSelectedKey] = useState(selectedKeyIndex || 1);

  useEffect(() => {
    fetchLinkToken(selectedKey);
  }, [selectedKey]);

  const fetchLinkToken = async (keyIdx) => {
    try {
      setLoading(true);
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_index: keyIdx }),
      });
      const data = await response.json();
      if (data.link_token) {
        setToken(data.link_token);
        setActiveClientId(data.client_id);
        setIsMock(data.is_mock);
      }
    } catch (err) {
      console.error('Failed to get Plaid link token:', err);
    } finally {
      setLoading(false);
    }
  };

  const exchangePublicToken = async (publicToken, metadata) => {
    try {
      setLoading(true);
      const res = await fetch('/api/plaid/exchange-public-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken, metadata, client_id: activeClientId }),
      });
      const result = await res.json();
      if (result.success) {
        if (onSuccessCallback) onSuccessCallback();
      }
    } catch (err) {
      console.error('Error exchanging token:', err);
    } finally {
      setLoading(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: isMock ? null : token,
    onSuccess: (public_token, metadata) => exchangePublicToken(public_token, metadata),
  });

  const handleConnectClick = (keyIdx) => {
    setShowDropdown(false);
    setSelectedKey(keyIdx);
    if (isMock) {
      exchangePublicToken('mock_public_token', {
        institution: { name: 'Capital Bank (Mock)', institution_id: 'ins_mock_2' },
      });
    } else if (ready && open) {
      open();
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ display: 'inline-flex', borderRadius: '10px', overflow: 'hidden' }}>
        <button 
          className="btn btn-primary" 
          onClick={() => handleConnectClick(selectedKey)} 
          disabled={loading || (!isMock && !ready)}
          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, paddingRight: '12px' }}
        >
          <Landmark size={18} />
          <span>
            {loading ? 'Connecting...' : isMock ? 'Connect Bank (Mock Demo Mode)' : `Connect Bank (${selectedKey === 1 ? "Kyle's Key" : "Mallory's Key"})`}
          </span>
        </button>

        <button 
          className="btn btn-primary" 
          onClick={() => setShowDropdown(!showDropdown)} 
          disabled={loading}
          style={{ 
            borderTopLeftRadius: 0, borderBottomLeftRadius: 0, 
            paddingLeft: '8px', paddingRight: '8px', borderLeft: '1px solid rgba(255,255,255,0.2)' 
          }}
          title="Select Plaid API Key Owner"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '6px',
          background: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 100, width: '220px', padding: '6px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', padding: '6px 10px', textTransform: 'uppercase' }}>
            Select Plaid API Key Owner
          </div>
          <button
            onClick={() => handleConnectClick(1)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px',
              background: selectedKey === 1 ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer', textAlign: 'left'
            }}
          >
            <User size={14} color="#6366f1" />
            <span>🔵 Kyle's Plaid Key (Key #1)</span>
          </button>
          <button
            onClick={() => handleConnectClick(2)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px',
              background: selectedKey === 2 ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
              border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer', textAlign: 'left', marginTop: '4px'
            }}
          >
            <User size={14} color="#ec4899" />
            <span>💗 Mallory's Plaid Key (Key #2)</span>
          </button>
        </div>
      )}
    </div>
  );
}
