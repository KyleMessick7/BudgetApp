import db from './database.js';

const rows = db.prepare(`
  SELECT id, plaid_transaction_id, account_id, name, amount, date 
  FROM transactions
  WHERE name LIKE '%Marriott%' OR name LIKE '%VASA%'
  ORDER BY name, date, id
`).all();

console.table(rows);
