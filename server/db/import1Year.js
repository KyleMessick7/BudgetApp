import dotenv from 'dotenv';
dotenv.config();

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import db from './database.js';

const plaidEnv = process.env.PLAID_ENV || 'production';
const clientId = process.env.PLAID_CLIENT_ID;
const secret = process.env.PLAID_SECRET;

const configuration = new Configuration({
  basePath: PlaidEnvironments[plaidEnv] || PlaidEnvironments.production,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': clientId,
      'PLAID-SECRET': secret,
    },
  },
});
const plaidClient = new PlaidApi(configuration);

const items = db.prepare("SELECT * FROM plaid_items WHERE item_id NOT LIKE 'mock_%'").all();

const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 365); // 1 Year back

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
  let hasMore = true;
  let offset = 0;
  const countPerPage = 500;

  console.log(`Starting 1-Year Historical Import for Chase (${item.item_id}) from ${startDateStr} to ${endDateStr}...`);

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
      const totalAvailable = response.data.total_transactions || fetched.length;
      console.log(`Page offset ${offset}: Received ${fetched.length} of ${totalAvailable} total available bank transactions...`);

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
        totalImported++;
      }

      if (offset + fetched.length >= totalAvailable || fetched.length === 0) {
        hasMore = false;
      } else {
        offset += countPerPage;
      }
    } catch (err) {
      console.error(`Historical fetch error at offset ${offset}:`, err?.response?.data || err.message);
      hasMore = false;
    }
  }
}

console.log('\n==================================================');
console.log(`SUCCESSFULLY IMPORTED ${totalImported} HISTORICAL PURCHASES!`);
const totalTxsInDb = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
const earliestTx = db.prepare('SELECT date, name, amount FROM transactions ORDER BY date ASC LIMIT 1').get();
console.log(`Total transactions now in SQLite: ${totalTxsInDb}`);
console.log(`Earliest transaction date in DB: ${earliestTx?.date} (${earliestTx?.name})`);
console.log('==================================================');
