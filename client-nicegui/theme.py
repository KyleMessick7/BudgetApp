"""BudgetApp Theme and Styling Utilities for NiceGUI.
Matches the glassmorphic dark theme and styling of the React application.
"""

from nicegui import ui

APP_CSS = """
:root {
  --bg-primary: #0b0f19;
  --bg-card: #111827;
  --bg-card-hover: #1f2937;
  --border-subtle: rgba(255, 255, 255, 0.08);
  --accent-primary: #6366f1;
  --accent-green: #10b981;
  --accent-yellow: #f59e0b;
  --accent-red: #ef4444;
  --text-main: #f9fafb;
  --text-muted: #9ca3af;
}

body.body--dark {
  background-color: #0b0f19 !important;
  color: #f9fafb !important;
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
}

.budget-card {
  background: rgba(17, 24, 39, 0.8) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 14px !important;
  backdrop-filter: blur(12px) !important;
}

.budget-card:hover {
  border-color: rgba(99, 102, 241, 0.25) !important;
}

.metric-card {
  background: rgba(17, 24, 39, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 20px;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  border-color: rgba(99, 102, 241, 0.35);
}

.brand-gradient {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
}

.brand-text {
  background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.q-table__card {
  background: rgba(17, 24, 39, 0.75) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 14px !important;
}

.q-table th {
  font-weight: 700 !important;
  text-transform: uppercase !important;
  font-size: 11px !important;
  letter-spacing: 0.05em !important;
  color: #9ca3af !important;
}
"""

def apply_theme():
    """Applies global dark mode and custom CSS to the NiceGUI app."""
    ui.dark_mode(True)
    ui.add_head_html(f"<style>{APP_CSS}</style>")
    ui.add_head_html('<link rel="preconnect" href="https://fonts.googleapis.com">')
    ui.add_head_html('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">')
    ui.add_head_html('<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>')

def format_currency(amount: float) -> str:
    """Format floating point number into clean currency string."""
    try:
        val = float(amount or 0.0)
        return f"${val:,.2f}"
    except (ValueError, TypeError):
        return "$0.00"
