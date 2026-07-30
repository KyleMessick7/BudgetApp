import express from 'express';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import db from '../db/database.js';

const router = express.Router();

function getIsMockMode() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  return process.env.USE_MOCK_DATA === 'true' || !clientId || !secret;
}

function getPlaidClient() {
  const plaidEnv = process.env.PLAID_ENV || 'sandbox';
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  if (!clientId || !secret) return null;

  const configuration = new Configuration({
    basePath: PlaidEnvironments[plaidEnv] || PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  });
  return new PlaidApi(configuration);
}

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

    const plaidClient = getPlaidClient();
    const request = {
      user: { client_user_id: 'user_budget_app' },
      client_name: 'VaultBudget Personal',
      products: ['auth', 'transactions'],
      country_codes: ['US'],
      language: 'en',
    };

    const response = await plaidClient.linkTokenCreate(request);
    res.json({ link_token: response.data.link_token, is_mock: false });
  } catch (error) {
    console.error('Error creating Plaid link token:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create link token', details: error?.response?.data || error.message });
  }
});

// 2. Exchange Public Token
router.post('/exchange-public-token', async (req, res) => {
  try {
    const { public_token, metadata } = req.body;
    const isMock = getIsMockMode();

    if (isMock || public_token === 'mock_public_token') {
      const mockItemId = `mock_item_${Date.now()}`;
      const institutionName = metadata?.institution?.name || 'Mock Savings Bank';
      
      db.prepare(`
        INSERT INTO plaid_items (item_id, access_token, institution_name, institution_id)
        VALUES (?, ?, ?, ?)
      `).run(mockItemId, `access_token_${mockItemId}`, institutionName, 'ins_mock');

      db.prepare(`
        INSERT INTO accounts (plaid_account_id, item_id, name, official_name, type, subtype, mask, current_balance, available_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`acc_${mockItemId}`, mockItemId, `${institutionName} Checking`, `${institutionName} Advantage Checking`, 'depository', 'checking', '9999', 1500.00, 1500.00);

      return res.json({ success: true, message: 'Mock account linked successfully' });
    }

    const plaidClient = getPlaidClient();
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    const institutionName = metadata?.institution?.name || 'Connected Bank';
    const institutionId = metadata?.institution?.institution_id || null;

    db.prepare(`
      INSERT OR REPLACE INTO plaid_items (item_id, access_token, institution_name, institution_id, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(itemId, accessToken, institutionName, institutionId);

    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const accounts = accountsResponse.data.accounts;

    const insertAccount = db.prepare(`
      INSERT OR REPLACE INTO accounts (plaid_account_id, item_id, name, official_name, type, subtype, mask, current_balance, available_balance, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    for (const acc of accounts) {
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

    await syncTransactionsForItem(itemId, accessToken);
    res.json({ success: true, item_id: itemId });
  } catch (error) {
    console.error('Error exchanging public token:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to exchange token', details: error?.response?.data || error.message });
  }
});

// Helper for transaction sync
async function syncTransactionsForItem(itemId, accessToken) {
  if (getIsMockMode()) return;

  try {
    const plaidClient = getPlaidClient();
    const response = await plaidClient.transactionsSync({ access_token: accessToken });
    const added = response.data.added;

    const categories = db.prepare('SELECT id, name FROM categories').all();
    const uncategorizedId = categories.find(c => c.name === 'Uncategorized')?.id || 1;

    const insertTx = db.prepare(`
      INSERT OR REPLACE INTO transactions (plaid_transaction_id, account_id, category_id, amount, date, name, merchant_name, payment_channel, pending)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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

export default router;
