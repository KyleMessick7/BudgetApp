from typing import Callable
from nicegui import ui

class Sidebar:
    """Navigation Sidebar matching VaultBudget styling."""

    def __init__(
        self,
        active_tab: str,
        on_tab_change: Callable[[str], None],
        on_sync: Callable[[], None],
    ):
        self.active_tab = active_tab
        self.on_tab_change = on_tab_change
        self.on_sync = on_sync
        self.nav_buttons = {}
        self.sync_button = None
        self.is_syncing = False

    def set_syncing(self, syncing: bool):
        self.is_syncing = syncing
        if self.sync_button:
            if syncing:
                self.sync_button.props("loading")
            else:
                self.sync_button.props(remove="loading")

    def select_tab(self, tab_id: str):
        self.active_tab = tab_id
        for tid, btn in self.nav_buttons.items():
            if tid == tab_id:
                btn.classes("bg-indigo-600/30 text-white border-l-4 border-indigo-500", remove="text-gray-400")
            else:
                btn.classes("text-gray-400 hover:text-white hover:bg-white/5", remove="bg-indigo-600/30 text-white border-l-4 border-indigo-500")
        self.on_tab_change(tab_id)

    def render(self):
        with ui.column().classes(
            "w-64 h-screen bg-[#0f172a]/90 backdrop-blur border-r border-white/10 p-5 flex flex-col justify-between fixed top-0 left-0 z-50"
        ):
            # Top: Brand & Nav
            with ui.column().classes("w-full gap-6"):
                # Brand
                with ui.row().classes("items-center gap-3 px-2"):
                    with ui.row().classes(
                        "w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 items-center justify-center shadow-lg shadow-indigo-500/30"
                    ):
                        ui.label("V").classes("text-xl font-black text-white")
                    with ui.column().classes("gap-0"):
                        ui.label("VaultBudget").classes("text-lg font-bold text-white leading-tight")
                        ui.label("Smart Bank Sync").classes("text-xs text-gray-400")

                # Nav Menu
                menu_items = [
                    ("dashboard", "Dashboard", "dashboard"),
                    ("transactions", "Transactions", "receipt_long"),
                    ("budgets", "Budgets & Goals", "pie_chart"),
                    ("accounts", "Bank Accounts", "account_balance"),
                ]

                with ui.column().classes("w-full gap-1.5"):
                    for tab_id, label, icon_name in menu_items:
                        is_active = (self.active_tab == tab_id)
                        btn = ui.button(
                            label,
                            icon=icon_name,
                            on_click=lambda t=tab_id: self.select_tab(t)
                        ).props("flat align=left no-caps").classes(
                            "w-full rounded-xl py-2.5 px-3 font-semibold transition-all text-left justify-start gap-3 "
                            + ("bg-indigo-600/30 text-white border-l-4 border-indigo-500" if is_active else "text-gray-400 hover:text-white hover:bg-white/5")
                        )
                        self.nav_buttons[tab_id] = btn

            # Bottom: Global Sync Bank Button
            with ui.column().classes("w-full px-1"):
                self.sync_button = ui.button(
                    "Sync Bank Purchases",
                    icon="sync",
                    on_click=self.on_sync
                ).props("unelevated no-caps").classes(
                    "w-full py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                )
