import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all categories with calculated spent amount for specified month ?month=YYYY-MM
router.get('/', (req, res) => {
  try {
    const defaultMonth = new Date().toISOString().slice(0, 7);
    const monthPrefix = req.query.month || defaultMonth;

    const categories = db.prepare(`
      SELECT 
        c.id, 
        c.name, 
        c.icon, 
        c.color, 
        c.budget_limit,
        COALESCE(SUM(CASE WHEN t.amount > 0 AND t.date LIKE ? THEN t.amount ELSE 0 END), 0) as spent_current_month,
        COUNT(CASE WHEN t.date LIKE ? THEN t.id END) as transaction_count
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
      GROUP BY c.id
      ORDER BY c.id ASC
    `).all(`${monthPrefix}%`, `${monthPrefix}%`);

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
  }
});

// Create new category
router.post('/', (req, res) => {
  try {
    const { name, icon, color, budget_limit } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const stmt = db.prepare('INSERT INTO categories (name, icon, color, budget_limit) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, icon || '📁', color || '#3b82f6', budget_limit || 0);

    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category', details: error.message });
  }
});

// Update category target limit or icon/name/color
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, color, budget_limit } = req.body;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    db.prepare(`
      UPDATE categories 
      SET name = ?, icon = ?, color = ?, budget_limit = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name : existing.name,
      icon !== undefined ? icon : existing.icon,
      color !== undefined ? color : existing.color,
      budget_limit !== undefined ? budget_limit : existing.budget_limit,
      id
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category', details: error.message });
  }
});

// Delete category
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category', details: error.message });
  }
});

export default router;
