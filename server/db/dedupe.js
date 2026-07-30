import db from './database.js';

console.log('Deduplicating accounts table...');

// Find duplicate accounts sharing the same mask and name
const accounts = db.prepare('SELECT id, plaid_account_id, item_id, name, mask, updated_at FROM accounts ORDER BY id ASC').all();

const seen = new Map();
const toDelete = [];

for (const acc of accounts) {
  const key = `${acc.name}_${acc.mask}`;
  if (seen.has(key)) {
    // Keep the newer one (seen value), mark older for deletion
    const olderId = seen.get(key);
    toDelete.push(olderId);
    seen.set(key, acc.id);
  } else {
    seen.set(key, acc.id);
  }
}

if (toDelete.length > 0) {
  const deleteStmt = db.prepare(`DELETE FROM accounts WHERE id = ?`);
  for (const id of toDelete) {
    deleteStmt.run(id);
  }
  console.log(`Successfully removed ${toDelete.length} duplicate account entries.`);
} else {
  console.log('No duplicate accounts found.');
}

// Also delete orphaned plaid_items that have 0 remaining accounts
db.prepare(`
  DELETE FROM plaid_items 
  WHERE item_id NOT IN (SELECT DISTINCT item_id FROM accounts)
`).run();

const finalAccounts = db.prepare('SELECT id, name, type, mask, plaid_account_id FROM accounts').all();

console.log('\n========================================');
console.log(`FINAL CLEAN ACCOUNTS LIST (${finalAccounts.length} Total):`);
console.table(finalAccounts);
console.log('========================================');
