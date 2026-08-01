import dotenv from 'dotenv';
dotenv.config();
import db from './database.js';

const key1ClientId = process.env.PLAID_CLIENT_ID;
console.log('Backfilling client_id with Key 1:', key1ClientId);

const info = db.prepare("UPDATE plaid_items SET client_id = ? WHERE client_id IS NULL OR client_id = ''").run(key1ClientId);
console.log('Updated rows count:', info.changes);

const items = db.prepare('SELECT id, item_id, institution_name, client_id FROM plaid_items').all();
console.table(items);
