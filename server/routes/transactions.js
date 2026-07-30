import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get transactions with optional search, category filter, and pagination
router.get('/', (req, res) => {
  try {
    const { search, category_id, account_id, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        t.*, 
        c.name as category_name, 
        c.icon as category_icon, 
        c.color as category_color,
        a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.plaid_account_id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (t.name LIKE ? OR t.merchant_name LIKE ? OR t.notes LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (category_id) {
      query += ` AND t.category_id = ?`;
      params.push(category_id);
    }

    if (account_id) {
      query += ` AND t.account_id = ?`;
      params.push(account_id);
    }

    query += ` ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const transactions = db.prepare(query).all(...params);

    // Get total count for pagination UI
    const countQuery = `SELECT COUNT(*) as total FROM transactions t WHERE 1=1`;
    const total = db.prepare(countQuery).get().total;

    res.json({ transactions, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions', details: error.message });
  }
});

// Create manual transaction
router.post('/', (req, res) => {
  try {
    const { account_id, category_id, amount, date, name, merchant_name, notes } = req.body;

    if (!amount || !date || !name) {
      return res.status(400).json({ error: 'Amount, date, and name are required' });
    }

    const defaultAccount = account_id || 'acc_chk_01';
    const stmt = db.prepare(`
      INSERT INTO transactions (plaid_transaction_id, account_id, category_id, amount, date, name, merchant_name, payment_channel, pending, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const manualId = `manual_tx_${Date.now()}`;
    const info = stmt.run(manualId, defaultAccount, category_id || null, parseFloat(amount), date, name, merchant_name || name, 'manual', 0, notes || null);

    const created = db.prepare(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color 
      FROM transactions t 
      LEFT JOIN categories c ON t.category_id = c.id 
      WHERE t.id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction', details: error.message });
  }
});

// Update transaction category or notes
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, notes } = req.body;

    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    db.prepare(`
      UPDATE transactions 
      SET category_id = ?, notes = ?
      WHERE id = ?
    `).run(
      category_id !== undefined ? category_id : existing.category_id,
      notes !== undefined ? notes : existing.notes,
      id
    );

    const updated = db.prepare(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color 
      FROM transactions t 
      LEFT JOIN categories c ON t.category_id = c.id 
      WHERE t.id = ?
    `).get(id);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction', details: error.message });
  }
});

// Delete transaction
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction', details: error.message });
  }
});

export default router;
