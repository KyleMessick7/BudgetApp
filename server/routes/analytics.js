import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get financial analytics summary
router.get('/summary', (req, res) => {
  try {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);

    // Total accounts balance
    const accounts = db.prepare('SELECT * FROM accounts').all();
    const totalBalance = accounts.reduce((sum, acc) => {
      if (acc.type === 'credit') return sum - (acc.current_balance || 0);
      return sum + (acc.current_balance || 0);
    }, 0);

    // Current month expenses (positive amounts)
    const expensesResult = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE amount > 0 AND date LIKE ?
    `).get(`${currentMonthPrefix}%`);

    // Current month income (negative amounts in Plaid representation)
    const incomeResult = db.prepare(`
      SELECT COALESCE(SUM(ABS(amount)), 0) as total 
      FROM transactions 
      WHERE amount < 0 AND date LIKE ?
    `).get(`${currentMonthPrefix}%`);

    // Total budget limit set across categories
    const budgetLimitResult = db.prepare(`
      SELECT COALESCE(SUM(budget_limit), 0) as total 
      FROM categories 
      WHERE name != 'Income'
    `).get();

    // Spend breakdown by category
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
    `).all(`${currentMonthPrefix}%`);

    res.json({
      netBalance: totalBalance,
      monthExpenses: expensesResult.total,
      monthIncome: incomeResult.total,
      netSavings: incomeResult.total - expensesResult.total,
      totalBudgetLimit: budgetLimitResult.total,
      categoryBreakdown,
      connectedAccountsCount: accounts.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics summary', details: error.message });
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

export default router;
