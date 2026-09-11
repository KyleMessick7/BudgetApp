import os
import sys
from pathlib import Path

# Ensure shared/python is on Python path
REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED_PYTHON = REPO_ROOT / "shared" / "python"
CLIENT_NICEGUI = REPO_ROOT / "client-nicegui"

for p in [str(REPO_ROOT), str(SHARED_PYTHON), str(CLIENT_NICEGUI)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from nicegui import ui, app, run

from budget_client import BudgetApiClient
from theme import apply_theme
from components.sidebar import Sidebar
from pages.dashboard import DashboardPage
from pages.transactions import TransactionsPage
from pages.budgets import BudgetsPage
from pages.accounts import AccountsPage

# Initialize API Client to Node backend
api = BudgetApiClient(base_url=os.getenv("BUDGET_API_URL", "http://localhost:3001"))

@ui.page("/")
def main_app():
    apply_theme()

    active_tab = "dashboard"
    sidebar_instance = None
    content_area = None

    dashboard_page = DashboardPage(api)
    transactions_page = TransactionsPage(api)
    budgets_page = BudgetsPage(api)
    accounts_page = AccountsPage(api)

    def render_content():
        if not content_area:
            return
        content_area.clear()
        with content_area:
            if active_tab == "dashboard":
                dashboard_page.render()
            elif active_tab == "transactions":
                transactions_page.render()
            elif active_tab == "budgets":
                budgets_page.render()
            elif active_tab == "accounts":
                accounts_page.render()

    def on_tab_change(tab_id: str):
        nonlocal active_tab
        active_tab = tab_id
        render_content()

    async def handle_global_sync():
        if sidebar_instance:
            sidebar_instance.set_syncing(True)
        ui.notify("Syncing latest transactions with Plaid...", type="info", position="top")

        try:
            res = await run.io_bound(api.trigger_sync)
            added = res.get("added", 0)
            modified = res.get("modified", 0)
            removed = res.get("removed", 0)
            ui.notify(f"Sync complete! +{added} added, ~{modified} updated, -{removed} removed", type="positive", position="top")
        except Exception as e:
            ui.notify(f"Sync failed: {e}", type="negative", position="top")
        finally:
            if sidebar_instance:
                sidebar_instance.set_syncing(False)
            render_content()

    # Pass sync handler to pages
    dashboard_page.on_sync_needed = handle_global_sync
    accounts_page.on_sync_needed = handle_global_sync

    # Layout: Sidebar + Main Area
    with ui.row().classes("w-full min-h-screen no-wrap"):
        sidebar_instance = Sidebar(
            active_tab=active_tab,
            on_tab_change=on_tab_change,
            on_sync=handle_global_sync
        )
        sidebar_instance.render()

        with ui.column().classes("flex-1 ml-64 p-8 max-w-[1400px] w-full min-h-screen") as content_area:
            render_content()

if __name__ in {"__main__", "__mp_main__"}:
    print("==================================================")
    print(" VaultBudget NiceGUI Frontend")
    print(" Connecting to API: http://localhost:3001")
    print(" UI running at: http://localhost:8080")
    print("==================================================")
    ui.run(
        title="VaultBudget (NiceGUI)",
        port=8080,
        dark=True,
        reload=False,
        show=True
    )
