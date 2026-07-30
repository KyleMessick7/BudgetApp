import db from './database.js';

export function seedMockBankData() {
  const existingItems = db.prepare('SELECT COUNT(*) as count FROM plaid_items').get().count;
  if (existingItems > 0) {
    return; // Already has items connected
  }

  console.log('Seeding mock bank account data for instant demo/testing...');

  const itemId = 'mock_item_chase_123';
  db.prepare(`
    INSERT INTO plaid_items (item_id, access_token, institution_name, institution_id)
    VALUES (?, ?, ?, ?)
  `).run(itemId, 'mock_access_token_chase', 'Chase Bank', 'ins_1');

  // Add Accounts
  const insertAccount = db.prepare(`
    INSERT INTO accounts (plaid_account_id, item_id, name, official_name, type, subtype, mask, current_balance, available_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAccount.run('acc_chk_01', itemId, 'Total Checking', 'Chase Total Checking', 'depository', 'checking', '4321', 3450.80, 3450.80);
  insertAccount.run('acc_sav_02', itemId, 'Premier Savings', 'Chase Premier Savings', 'depository', 'savings', '8765', 12850.50, 12850.50);
  insertAccount.run('acc_crd_03', itemId, 'Sapphire Reserve', 'Chase Sapphire Reserve', 'credit', 'credit card', '9012', 412.35, 9587.65);

  // Get Category IDs
  const categories = db.prepare('SELECT id, name FROM categories').all();
  const getCatId = (name) => categories.find(c => c.name === name)?.id || categories[0].id;

  // Insert mock transactions for current month and previous month
  const insertTx = db.prepare(`
    INSERT INTO transactions (plaid_transaction_id, account_id, category_id, amount, date, name, merchant_name, payment_channel, pending)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  const formatDate = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const sampleTransactions = [
    { txId: 'tx_101', acc: 'acc_chk_01', cat: getCatId('Income'), amount: -2850.00, daysAgo: 1, name: 'Employer Direct Deposit', merchant: 'Acme Corp', channel: 'online' },
    { txId: 'tx_102', acc: 'acc_chk_01', cat: getCatId('Housing & Utilities'), amount: 1450.00, daysAgo: 3, name: 'Main Street Apartments Rent', merchant: 'Main St Realty', channel: 'online' },
    { txId: 'tx_103', acc: 'acc_chk_01', cat: getCatId('Groceries & Dining'), amount: 142.65, daysAgo: 2, name: 'Trader Joe\'s Supermarket', merchant: 'Trader Joe\'s', channel: 'in store' },
    { txId: 'tx_104', acc: 'acc_crd_03', cat: getCatId('Groceries & Dining'), amount: 68.20, daysAgo: 4, name: 'Chipotle Mexican Grill', merchant: 'Chipotle', channel: 'in store' },
    { txId: 'tx_105', acc: 'acc_chk_01', cat: getCatId('Transportation & Gas'), amount: 48.50, daysAgo: 5, name: 'Shell Oil Gas Station', merchant: 'Shell', channel: 'in store' },
    { txId: 'tx_106', acc: 'acc_crd_03', cat: getCatId('Subscriptions & Services'), amount: 15.99, daysAgo: 6, name: 'Netflix Subscription', merchant: 'Netflix', channel: 'online' },
    { txId: 'tx_107', acc: 'acc_crd_03', cat: getCatId('Shopping & Entertainment'), amount: 124.99, daysAgo: 7, name: 'Amazon Order #114-883', merchant: 'Amazon', channel: 'online' },
    { txId: 'tx_108', acc: 'acc_crd_03', cat: getCatId('Health & Personal Care'), amount: 35.00, daysAgo: 8, name: 'CVS Pharmacy', merchant: 'CVS', channel: 'in store' },
    { txId: 'tx_109', acc: 'acc_chk_01', cat: getCatId('Groceries & Dining'), amount: 89.40, daysAgo: 10, name: 'Whole Foods Market', merchant: 'Whole Foods', channel: 'in store' },
    { txId: 'tx_110', acc: 'acc_crd_03', cat: getCatId('Shopping & Entertainment'), amount: 55.00, daysAgo: 12, name: 'Steam Games Purchase', merchant: 'Valve Steam', channel: 'online' },
    { txId: 'tx_111', acc: 'acc_chk_01', cat: getCatId('Transportation & Gas'), amount: 24.00, daysAgo: 14, name: 'Uber Trip San Francisco', merchant: 'Uber', channel: 'online' },
    { txId: 'tx_112', acc: 'acc_chk_01', cat: getCatId('Income'), amount: -2850.00, daysAgo: 15, name: 'Employer Direct Deposit', merchant: 'Acme Corp', channel: 'online' },
    { txId: 'tx_113', acc: 'acc_chk_01', cat: getCatId('Housing & Utilities'), amount: 112.40, daysAgo: 18, name: 'Pacific Gas & Electric', merchant: 'PG&E', channel: 'online' }
  ];

  for (const t of sampleTransactions) {
    insertTx.run(t.txId, t.acc, t.cat, t.amount, formatDate(t.daysAgo), t.name, t.merchant, t.channel, 0);
  }

  console.log('Mock bank accounts and transactions seeded.');
}
