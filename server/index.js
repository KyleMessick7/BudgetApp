import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './db/database.js';
import { seedMockBankData } from './db/mockData.js';
import plaidRouter from './routes/plaid.js';
import categoriesRouter from './routes/categories.js';
import transactionsRouter from './routes/transactions.js';
import analyticsRouter from './routes/analytics.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
initDatabase();

// Seed mock bank data if in mock mode or database is empty
if (process.env.USE_MOCK_DATA === 'true' || !process.env.PLAID_CLIENT_ID) {
  seedMockBankData();
}

// API Routes
app.use('/api/plaid', plaidRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/analytics', analyticsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), mockMode: process.env.USE_MOCK_DATA === 'true' });
});

// Serve frontend in production if built
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Budgeting Backend Server running on port ${PORT}`);
  console.log(` API Endpoint: http://localhost:${PORT}/api/health`);
  console.log(` Mock Data Mode: ${process.env.USE_MOCK_DATA === 'true' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`==================================================`);
});
