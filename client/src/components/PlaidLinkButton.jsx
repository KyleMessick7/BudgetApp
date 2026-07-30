import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { PlusCircle, Landmark } from 'lucide-react';

export default function PlaidLinkButton({ onSuccessCallback }) {
  const [token, setToken] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLinkToken();
  }, []);

  const fetchLinkToken = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/plaid/create-link-token', { method: 'POST' });
      const data = await response.json();
      if (data.link_token) {
        setToken(data.link_token);
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
        body: JSON.stringify({ public_token: publicToken, metadata }),
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

  const handleConnectClick = () => {
    if (isMock) {
      // Connect a simulated bank account in Mock Mode
      exchangePublicToken('mock_public_token', {
        institution: { name: 'Capital Bank (Mock)', institution_id: 'ins_mock_2' },
      });
    } else if (ready && open) {
      open();
    }
  };

  return (
    <button 
      className="btn btn-primary" 
      onClick={handleConnectClick} 
      disabled={loading || (!isMock && !ready)}
    >
      <Landmark size={18} />
      <span>{loading ? 'Connecting...' : isMock ? 'Connect Bank (Mock Demo Mode)' : 'Connect Bank with Plaid'}</span>
    </button>
  );
}
