import dotenv from 'dotenv';
dotenv.config();

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import db from './database.js';

const plaidEnv = process.env.PLAID_ENV || 'production';

// Key 1
const client1 = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[plaidEnv],
  baseOptions: { headers: { 'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID, 'PLAID-SECRET': process.env.PLAID_SECRET } }
}));

// Key 2
const client2 = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[plaidEnv],
  baseOptions: { headers: { 'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID_2, 'PLAID-SECRET': process.env.PLAID_SECRET_2 } }
}));

const items = db.prepare('SELECT * FROM plaid_items').all();

console.log(`Checking ownership for ${items.length} items...\n`);

for (const item of items) {
  let owner = 'UNKNOWN';
  
  // Try Key 1
  try {
    await client1.itemGet({ access_token: item.access_token });
    owner = `KEY 1 (${process.env.PLAID_CLIENT_ID?.substring(0, 10)})`;
  } catch (err1) {
    // Try Key 2
    try {
      await client2.itemGet({ access_token: item.access_token });
      owner = `KEY 2 (${process.env.PLAID_CLIENT_ID_2?.substring(0, 10)})`;
    } catch (err2) {
      owner = `ERROR (Key 1: ${err1.message}, Key 2: ${err2.message})`;
    }
  }

  console.log(`Item ID: ${item.item_id}`);
  console.log(`Institution: ${item.institution_name}`);
  console.log(`Created At: ${item.created_at}`);
  console.log(`Owned By: ${owner}\n-----------------------------------`);
}
