import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get financial analytics summary with optional ?month=YYYY-MM
router.get('/summary', (req, res) => {
  try {
    const defaultMonth = new Date().toISOString().slice(0, 7);
    const monthPrefix = req.query.month || defaultMonth;

    // Total accounts balance
    const accounts = db.prepare('SELECT * FROM accounts').all();
    const totalBalance = accounts.reduce((sum, acc) => {
      if (acc.type === 'credit') return sum - (acc.current_balance || 0);
      return sum + (acc.current_balance || 0);
    }, 0);

    // Selected month expenses (positive amounts)
    const expensesResult = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE amount > 0 AND date LIKE ?
    `).get(`${monthPrefix}%`);

    // Selected month income (negative amounts in Plaid representation)
    const incomeResult = db.prepare(`
      SELECT COALESCE(SUM(ABS(amount)), 0) as total 
      FROM transactions 
      WHERE amount < 0 AND date LIKE ?
    `).get(`${monthPrefix}%`);

    // Total budget limit set across categories
    const budgetLimitResult = db.prepare(`
      SELECT COALESCE(SUM(budget_limit), 0) as total 
      FROM categories 
      WHERE name != 'Income'
    `).get();

    // Spend breakdown by category for selected month
    const categoryBreakdown = db.prepare(`
      SELECT 
        c.id, c.name, c.icon, c.color, c.budget_limit,
        COALESCE(SUM(t.amount), 0) as total_spent
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id AND t.amount > 0 AND t.date LIKE ?
      WHERE c.name != 'Income'
      GROUP BY c.id
      HAVING total_spent > 0
      ORDER BY total_spent DESC
    `).all(`${monthPrefix}%`);

    res.json({
      netBalance: totalBalance,
      monthExpenses: expensesResult.total,
      monthIncome: incomeResult.total,
      netSavings: incomeResult.total - expensesResult.total,
      totalBudgetLimit: budgetLimitResult.total,
      categoryBreakdown,
      connectedAccountsCount: accounts.length,
      selectedMonth: monthPrefix
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics summary', details: error.message });
  }
});

// Get transactions for a specific category for selected month sorted largest to smallest
router.get('/category-transactions/:categoryId', (req, res) => {
  try {
    const { categoryId } = req.params;
    const defaultMonth = new Date().toISOString().slice(0, 7);
    const monthPrefix = req.query.month || defaultMonth;

    // Try fetching selected month transactions first
    let transactions = db.prepare(`
      SELECT t.id, t.name, t.merchant_name, t.amount, t.date, t.payment_channel, t.flagged
      FROM transactions t
      WHERE t.category_id = ? AND t.amount > 0 AND t.date LIKE ?
      ORDER BY t.amount DESC, t.date DESC
    `).all(categoryId, `${monthPrefix}%`);

    // Fallback if no transactions in selected month
    if (transactions.length === 0) {
      transactions = db.prepare(`
        SELECT t.id, t.name, t.merchant_name, t.amount, t.date, t.payment_channel, t.flagged
        FROM transactions t
        WHERE t.category_id = ? AND t.amount > 0
        ORDER BY t.amount DESC, t.date DESC
        LIMIT 100
      `).all(categoryId);
    }

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category transactions', details: error.message });
  }
});

// Get accounts list
router.get('/accounts', (req, res) => {
  try {
    const accounts = db.prepare(`
      SELECT a.*, pi.institution_name 
      FROM accounts a
      LEFT JOIN plaid_items pi ON a.item_id = pi.item_id
    `).all();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts', details: error.message });
  }
});

// Purge all mock accounts and mock transactions from SQLite
router.post('/clear-mock-data', (req, res) => {
  try {
    db.prepare(`
      DELETE FROM transactions 
      WHERE plaid_transaction_id LIKE 'tx_%' 
         OR plaid_transaction_id LIKE 'mock_%' 
         OR account_id LIKE 'acc_chk_%' 
         OR account_id LIKE 'acc_sav_%' 
         OR account_id LIKE 'acc_crd_%'
         OR account_id LIKE 'acc_mock_%'
    `).run();

    db.prepare(`
      DELETE FROM accounts 
      WHERE item_id LIKE 'mock_%' 
         OR plaid_account_id LIKE 'acc_chk_%' 
         OR plaid_account_id LIKE 'acc_sav_%' 
         OR plaid_account_id LIKE 'acc_crd_%'
         OR plaid_account_id LIKE 'acc_mock_%'
    `).run();

    db.prepare(`DELETE FROM plaid_items WHERE item_id LIKE 'mock_%'`).run();

    res.json({ success: true, message: 'Mock data purged successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear mock data', details: error.message });
  }
});

export default router;
