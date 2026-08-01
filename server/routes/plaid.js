import express from 'express';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import db from '../db/database.js';

const router = express.Router();

function getIsMockMode() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  return process.env.USE_MOCK_DATA === 'true' || !clientId || !secret;
}

// 1. Get all configured Plaid credentials from .env
function getCredentialPool() {
  const pool = [];
  const plaidEnv = process.env.PLAID_ENV || 'production';

  // Primary credentials
  if (process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET) {
    pool.push({
      clientId: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      env: plaidEnv,
      keyIndex: 1
    });
  }

  // Secondary credentials (PLAID_CLIENT_ID_2, PLAID_SECRET_2)
  if (process.env.PLAID_CLIENT_ID_2 && process.env.PLAID_SECRET_2) {
    pool.push({
      clientId: process.env.PLAID_CLIENT_ID_2,
      secret: process.env.PLAID_SECRET_2,
      env: plaidEnv,
      keyIndex: 2
    });
  }

  // Tertiary credentials (PLAID_CLIENT_ID_3, PLAID_SECRET_3)
  if (process.env.PLAID_CLIENT_ID_3 && process.env.PLAID_SECRET_3) {
    pool.push({
      clientId: process.env.PLAID_CLIENT_ID_3,
      secret: process.env.PLAID_SECRET_3,
      env: plaidEnv,
      keyIndex: 3
    });
  }

  return pool;
}

// Get PlaidApi client for a specific credential set
function getPlaidClientForCreds(clientId, secret) {
  if (!clientId || !secret) return null;
  const plaidEnv = process.env.PLAID_ENV || 'production';

  const configuration = new Configuration({
    basePath: PlaidEnvironments[plaidEnv] || PlaidEnvironments.production,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  });
  return new PlaidApi(configuration);
}

// Get PlaidApi client for a stored item by looking up its client_id
function getPlaidClientForItem(itemId) {
  const item = db.prepare('SELECT * FROM plaid_items WHERE item_id = ?').get(itemId);
  const pool = getCredentialPool();

  if (item && item.client_id) {
    const match = pool.find(c => c.clientId === item.client_id);
    if (match) return getPlaidClientForCreds(match.clientId, match.secret);
  }

  // Default fallback to primary credential
  const primary = pool[0];
  return primary ? getPlaidClientForCreds(primary.clientId, primary.secret) : null;
}

// Helper to select an available credential set (< 10 connected items)
function getAvailableCredential(requestedKeyIndex = null) {
  const pool = getCredentialPool();
  if (pool.length === 0) return null;

  if (requestedKeyIndex) {
    const match = pool.find(c => c.keyIndex === parseInt(requestedKeyIndex));
    if (match) return match;
  }

  // Count active items per client_id in SQLite
  const itemCounts = db.prepare('SELECT client_id, COUNT(*) as count FROM plaid_items WHERE client_id IS NOT NULL GROUP BY client_id').all();
  const countMap = {};
  for (const row of itemCounts) {
    countMap[row.client_id] = row.count;
  }

  // Return the first credential set with < 10 connected items
  for (const cred of pool) {
    const currentCount = countMap[cred.clientId] || 0;
    if (currentCount < 10) {
      return cred;
    }
  }

  // Fallback to primary if all are full
  return pool[0];
}

// Route: Get credentials pool status overview
router.get('/credentials-status', (req, res) => {
  try {
    const pool = getCredentialPool();
    const itemCounts = db.prepare('SELECT client_id, COUNT(*) as count FROM plaid_items WHERE client_id IS NOT NULL GROUP BY client_id').all();
    const countMap = {};
    for (const row of itemCounts) countMap[row.client_id] = row.count;

    const status = pool.map(c => ({
      keyIndex: c.keyIndex,
      clientIdPrefix: c.clientId ? `${c.clientId.substring(0, 8)}...` : 'N/A',
      activeItemsCount: countMap[c.clientId] || 0,
      maxItemsLimit: 10,
      hasAvailableSlot: (countMap[c.clientId] || 0) < 10
    }));

    res.json({ success: true, poolStatus: status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch credentials status', details: error.message });
  }
});

// 1. Create Link Token
router.post('/create-link-token', async (req, res) => {
  try {
    const isMock = getIsMockMode();
    if (isMock) {
      return res.json({
        link_token: 'mock_link_token_demo_mode',
        is_mock: true
      });
    }

    const cred = getAvailableCredential(req.body.key_index);
    if (!cred) {
      return res.status(400).json({ error: 'No valid Plaid credentials configured.' });
    }

    const plaidClient = getPlaidClientForCreds(cred.clientId, cred.secret);
    const request = {
      user: { client_user_id: 'user_budget_app' },
      client_name: 'VaultBudget Personal',
      products: ['transactions'],
      transactions: {
        days_requested: 730
      },
      country_codes: ['US'],
      language: 'en',
    };

    const response = await plaidClient.linkTokenCreate(request);
    res.json({ 
      link_token: response.data.link_token, 
      is_mock: false,
      client_id: cred.clientId,
      key_index: cred.keyIndex 
    });
  } catch (error) {
    console.error('Error creating Plaid link token:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create link token', details: error?.response?.data || error.message });
  }
});

// 2. Exchange Public Token
router.post('/exchange-public-token', async (req, res) => {
  try {
    const { public_token, metadata, client_id } = req.body;
    const isMock = getIsMockMode();

    if (isMock || public_token === 'mock_public_token') {
      const mockItemId = `mock_item_${Date.now()}`;
      const institutionName = metadata?.institution?.name || 'Mock Savings Bank';
      
      db.prepare(`
        INSERT INTO plaid_items (item_id, access_token, institution_name, institution_id, client_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(mockItemId, `access_token_${mockItemId}`, institutionName, 'ins_mock', 'mock_client');

      db.prepare(`
        INSERT INTO accounts (plaid_account_id, item_id, name, official_name, type, subtype, mask, current_balance, available_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`acc_${mockItemId}`, mockItemId, `${institutionName} Checking`, `${institutionName} Advantage Checking`, 'depository', 'checking', '9999', 1500.00, 1500.00);

      return res.json({ success: true, message: 'Mock account linked successfully' });
    }

    // Determine active credential set used for this exchange
    const pool = getCredentialPool();
    let activeCred = pool.find(c => c.clientId === client_id);
    if (!activeCred) activeCred = getAvailableCredential();

    const plaidClient = getPlaidClientForCreds(activeCred.clientId, activeCred.secret);
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    const institutionName = metadata?.institution?.name || 'Connected Bank';
    const institutionId = metadata?.institution?.institution_id || null;

    db.prepare(`
      INSERT OR REPLACE INTO plaid_items (item_id, access_token, institution_name, institution_id, client_id, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(itemId, accessToken, institutionName, institutionId, activeCred.clientId);

    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const accounts = accountsResponse.data.accounts;

    console.log(`Plaid returned ${accounts.length} accounts for item ${itemId} using key index ${activeCred.keyIndex}`);

    const insertAccount = db.prepare(`
      INSERT OR REPLACE INTO accounts (plaid_account_id, item_id, name, official_name, type, subtype, mask, current_balance, available_balance, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    for (const acc of accounts) {
      if (acc.mask && acc.name) {
        db.prepare(`
          DELETE FROM accounts 
          WHERE name = ? AND mask = ? AND plaid_account_id != ?
        `).run(acc.name, acc.mask, acc.account_id);
      }

      insertAccount.run(
        acc.account_id,
        itemId,
        acc.name,
        acc.official_name || acc.name,
        acc.type,
        acc.subtype,
        acc.mask,
        acc.balances.current || 0,
        acc.balances.available || acc.balances.current || 0
      );
    }

    // Clean orphaned items and transactions from old account connections
    db.prepare(`DELETE FROM plaid_items WHERE item_id NOT IN (SELECT DISTINCT item_id FROM accounts)`).run();
    db.prepare(`DELETE FROM transactions WHERE account_id NOT IN (SELECT plaid_account_id FROM accounts)`).run();

    await syncTransactionsForItem(itemId, accessToken);
    res.json({ success: true, item_id: itemId, key_index: activeCred.keyIndex });
  } catch (error) {
    console.error('Error exchanging public token:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to exchange token', details: error?.response?.data || error.message });
  }
});

// Helper for transaction sync using item-specific Plaid client
async function syncTransactionsForItem(itemId, accessToken) {
  if (getIsMockMode()) return;

  try {
    const plaidClient = getPlaidClientForItem(itemId);
    if (!plaidClient) return;

    const response = await plaidClient.transactionsSync({ access_token: accessToken });
    const added = response.data.added;

    const categories = db.prepare('SELECT id, name FROM categories').all();
    const uncategorizedId = categories.find(c => c.name === 'Uncategorized')?.id || 1;

    const insertTx = db.prepare(`
      INSERT INTO transactions (plaid_transaction_id, account_id, category_id, amount, date, name, merchant_name, payment_channel, pending)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(plaid_transaction_id) DO UPDATE SET
        amount = excluded.amount,
        pending = excluded.pending,
        date = excluded.date,
        merchant_name = excluded.merchant_name
    `);

    for (const t of added) {
      let catId = uncategorizedId;
      const primaryPlaidCat = t.category ? t.category[0] : '';
      if (primaryPlaidCat.includes('Food') || primaryPlaidCat.includes('Shops')) {
        catId = categories.find(c => c.name.includes('Groceries'))?.id || catId;
      } else if (primaryPlaidCat.includes('Travel') || primaryPlaidCat.includes('Gas')) {
        catId = categories.find(c => c.name.includes('Transportation'))?.id || catId;
      } else if (primaryPlaidCat.includes('Payment') || t.amount < 0) {
        catId = categories.find(c => c.name === 'Income')?.id || catId;
      }

      insertTx.run(
        t.transaction_id,
        t.account_id,
        catId,
        t.amount,
        t.date,
        t.name,
        t.merchant_name || t.name,
        t.payment_channel,
        t.pending ? 1 : 0
      );
    }
  } catch (err) {
    console.error('Error syncing transactions for item', itemId, err?.response?.data || err.message);
  }
}

// 3. Manual Sync All Connected Accounts Endpoint
router.post('/sync', async (req, res) => {
  try {
    const isMock = getIsMockMode();
    const items = db.prepare('SELECT * FROM plaid_items').all();

    if (isMock) {
      const categories = db.prepare('SELECT id FROM categories').all();
      const randomCat = categories[Math.floor(Math.random() * categories.length)].id;
      const randomAmount = (Math.random() * 85 + 5).toFixed(2);
      const todayStr = new Date().toISOString().split('T')[0];

      db.prepare(`
        INSERT INTO transactions (plaid_transaction_id, account_id, category_id, amount, date, name, merchant_name, payment_channel, pending)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `mock_tx_sync_${Date.now()}`,
        'acc_chk_01',
        randomCat,
        parseFloat(randomAmount),
        todayStr,
        'Synced Bank Purchase',
        'Local Merchant',
        'in store',
        0
      );

      return res.json({ success: true, message: 'Mock sync completed: Added 1 new transaction.', syncedItemsCount: items.length });
    }

    for (const item of items) {
      await syncTransactionsForItem(item.item_id, item.access_token);
    }

    res.json({ success: true, message: `Synced ${items.length} accounts successfully.` });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// 4. Fetch Historical Transactions Endpoint
router.post('/fetch-historical', async (req, res) => {
  try {
    const isMock = getIsMockMode();
    const days = parseInt(req.body.days) || 365;
    const items = db.prepare('SELECT * FROM plaid_items').all();

    if (isMock) {
      return res.json({ success: true, message: 'Mock mode active.', importedCount: 0 });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];

    const categories = db.prepare('SELECT id, name FROM categories').all();
    const uncategorizedId = categories.find(c => c.name === 'Uncategorized')?.id || 1;

    const insertTx = db.prepare(`
      INSERT INTO transactions (plaid_transaction_id, account_id, category_id, amount, date, name, merchant_name, payment_channel, pending)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(plaid_transaction_id) DO UPDATE SET
        amount = excluded.amount,
        pending = excluded.pending,
        date = excluded.date,
        merchant_name = excluded.merchant_name
    `);

    let totalImported = 0;

    for (const item of items) {
      const plaidClient = getPlaidClientForItem(item.item_id);
      if (!plaidClient) continue;

      let hasMore = true;
      let offset = 0;
      const countPerPage = 500;

      while (hasMore && offset < 2500) {
        try {
          const response = await plaidClient.transactionsGet({
            access_token: item.access_token,
            start_date: startDateStr,
            end_date: endDateStr,
            options: {
              count: countPerPage,
              offset: offset
            }
          });

          const fetched = response.data.transactions || [];
          totalImported += fetched.length;

          for (const t of fetched) {
            let catId = uncategorizedId;
            const primaryPlaidCat = t.category ? t.category[0] : '';
            if (primaryPlaidCat.includes('Food') || primaryPlaidCat.includes('Shops')) {
              catId = categories.find(c => c.name.includes('Groceries'))?.id || catId;
            } else if (primaryPlaidCat.includes('Travel') || primaryPlaidCat.includes('Gas')) {
              catId = categories.find(c => c.name.includes('Transportation'))?.id || catId;
            } else if (primaryPlaidCat.includes('Payment') || t.amount < 0) {
              catId = categories.find(c => c.name === 'Income')?.id || catId;
            }

            insertTx.run(
              t.transaction_id,
              t.account_id,
              catId,
              t.amount,
              t.date,
              t.name,
              t.merchant_name || t.name,
              t.payment_channel,
              t.pending ? 1 : 0
            );
          }

          if (fetched.length < countPerPage) {
            hasMore = false;
          } else {
            offset += countPerPage;
          }
        } catch (err) {
          console.error(`Historical fetch error for item ${item.item_id}:`, err?.response?.data || err.message);
          hasMore = false;
        }
      }
    }

    res.json({ 
      success: true, 
      message: `Successfully fetched historical transactions from ${startDateStr} to ${endDateStr}.`, 
      importedCount: totalImported,
      daysRequested: days 
    });
  } catch (error) {
    console.error('Historical fetch error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch historical transactions', details: error.message });
  }
});

// 5. Unlink Item & Call Plaid /item/remove API to free up slot on Plaid Dashboard
router.delete('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = db.prepare('SELECT * FROM plaid_items WHERE item_id = ?').get(itemId);

    if (!item) {
      return res.status(404).json({ error: 'Plaid Item not found' });
    }

    // Call Plaid API to permanently revoke item and free up slot on Plaid Dashboard
    if (!getIsMockMode()) {
      try {
        const plaidClient = getPlaidClientForItem(itemId);
        if (plaidClient && item.access_token) {
          await plaidClient.itemRemove({ access_token: item.access_token });
          console.log(`Successfully called Plaid /item/remove for item ${itemId}`);
        }
      } catch (plaidErr) {
        console.error(`Plaid /item/remove API call error for item ${itemId}:`, plaidErr?.response?.data || plaidErr.message);
      }
    }

    // Delete item and associated accounts & orphaned transactions locally from SQLite
    db.prepare('DELETE FROM accounts WHERE item_id = ?').run(itemId);
    db.prepare('DELETE FROM plaid_items WHERE item_id = ?').run(itemId);
    db.prepare('DELETE FROM transactions WHERE account_id NOT IN (SELECT plaid_account_id FROM accounts)').run();

    res.json({ success: true, message: `Successfully unlinked bank item ${itemId} and freed connection slot on Plaid.` });
  } catch (error) {
    console.error('Error unlinking item:', error.message);
    res.status(500).json({ error: 'Failed to unlink bank item', details: error.message });
  }
});

export default router;
