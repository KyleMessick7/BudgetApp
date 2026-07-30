import db from './database.js';

console.log('Purging mock data...');

const delTx = db.prepare(`
  DELETE FROM transactions 
  WHERE plaid_transaction_id LIKE 'tx_%' 
     OR plaid_transaction_id LIKE 'mock_%' 
     OR account_id LIKE 'acc_chk_%' 
     OR account_id LIKE 'acc_sav_%' 
     OR account_id LIKE 'acc_crd_%'
     OR account_id LIKE 'acc_mock_%'
`).run();

const delAcc = db.prepare(`
  DELETE FROM accounts 
  WHERE item_id LIKE 'mock_%' 
     OR plaid_account_id LIKE 'acc_chk_%' 
     OR plaid_account_id LIKE 'acc_sav_%' 
     OR plaid_account_id LIKE 'acc_crd_%'
     OR plaid_account_id LIKE 'acc_mock_%'
`).run();

const delItem = db.prepare(`DELETE FROM plaid_items WHERE item_id LIKE 'mock_%'`).run();

console.log(`Deleted ${delTx.changes} mock transactions.`);
console.log(`Deleted ${delAcc.changes} mock accounts.`);
console.log(`Deleted ${delItem.changes} mock items.`);

const remaining = db.prepare('SELECT id, name, type, mask, plaid_account_id FROM accounts').all();
console.log('\n========================================');
console.log('REMAINING REAL ACCOUNTS IN DATABASE:');
console.table(remaining);
console.log('========================================');
