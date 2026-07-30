import dotenv from 'dotenv';
dotenv.config();

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import db from './database.js';

const plaidEnv = process.env.PLAID_ENV || 'production';
const clientId = process.env.PLAID_CLIENT_ID;
const secret = process.env.PLAID_SECRET;

console.log('Testing Plaid Historical Fetch with env:', plaidEnv, 'ClientID:', clientId?.substring(0, 6));

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
console.log('Found real Plaid items:', items.map(i => ({ item_id: i.item_id, inst: i.institution_name })));

const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 365);

const endDateStr = endDate.toISOString().split('T')[0];
const startDateStr = startDate.toISOString().split('T')[0];

for (const item of items) {
  try {
    console.log(`Fetching historical transactions for item ${item.item_id} from ${startDateStr} to ${endDateStr}...`);
    const response = await plaidClient.transactionsGet({
      access_token: item.access_token,
      start_date: startDateStr,
      end_date: endDateStr,
      options: {
        count: 100,
        offset: 0
      }
    });
    console.log(`Success! Fetched ${response.data.transactions?.length} transactions for item ${item.item_id}`);
  } catch (err) {
    console.error(`Error for item ${item.item_id}:`, JSON.stringify(err?.response?.data || err.message, null, 2));
  }
}
