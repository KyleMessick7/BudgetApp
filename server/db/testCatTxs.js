import db from './database.js';

const currentMonthPrefix = new Date().toISOString().slice(0, 7);
console.log('Current Month Prefix:', currentMonthPrefix);

const txs = db.prepare(`
  SELECT id, name, amount, date 
  FROM transactions 
  WHERE category_id = ? AND amount > 0 AND date LIKE ? 
  ORDER BY amount DESC
`).all(2, `${currentMonthPrefix}%`);

console.log('Txs found for Category 2 (Groceries):', txs.length);
console.table(txs.slice(0, 10));
