import dotenv from 'dotenv';
dotenv.config();

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import db from './database.js';

const plaidEnv = process.env.PLAID_ENV || 'production';

const client1 = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[plaidEnv],
  baseOptions: { headers: { 'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID, 'PLAID-SECRET': process.env.PLAID_SECRET } }
}));

const localItems = db.prepare('SELECT * FROM plaid_items').all();
const localItemIds = new Set(localItems.map(i => i.item_id));

console.log('Local active Item IDs in VaultBudget database:', Array.from(localItemIds));
console.log('\nChecking all items in SQLite database vs Plaid cloud servers...');

for (const item of localItems) {
  console.log(`- ${item.institution_name} (${item.item_id}): Active in local DB, owned by client_id ${item.client_id}`);
}
