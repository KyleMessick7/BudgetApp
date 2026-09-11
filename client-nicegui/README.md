# VaultBudget NiceGUI Frontend

Alternative Python-based UI for BudgetApp built with **NiceGUI**, **Quasar**, and **ECharts**.
Shares the exact same SQLite database (`budget.db`) and backend server logic as the React frontend via the shared Python SDK [`budget_client`](../shared/python/budget_client).

---

## Quick Start

### 1. Prerequisites
- Python 3.9+ installed
- Node.js backend running

### 2. Install Python Dependencies
```powershell
pip install -r client-nicegui/requirements.txt
```
*(Or if using the Windows Python launcher: `py -3.9 -m pip install -r client-nicegui/requirements.txt`)*

### 3. Ensure Backend is Running
In one terminal window, ensure the Node/Express backend is running:
```powershell
npm run server
```

### 4. Launch NiceGUI Frontend
In another terminal window:
```powershell
py -3.9 client-nicegui/main.py
```
*(or `python client-nicegui/main.py`)*

The NiceGUI app will launch in your browser at:
👉 **`http://localhost:8080`**

---

## Features
- **Dashboard**: Net Balance, Monthly Income, Monthly Expenses, Net Savings, Interactive ECharts Category Pie chart with click-to-drilldown, Recent Purchases.
- **Transactions**: Full live text search, category filtering, flagged purchases filter, inline category assignment, flagging, deletion, manual purchase modal.
- **Budgets & Goals**: Category cards with visual spent-vs-limit progress bars (color coded by status: On Track, Near Limit, Over Budget), Add/Edit category dialogs.
- **Bank Accounts**: Account cards with masks, balances, and key owner badges (Kyle vs Mallory), Plaid Credential Pool monitor, historical backfill modal, Plaid Link button.
- **Global Bank Sync**: Persistent sync button with spinning feedback indicator.
