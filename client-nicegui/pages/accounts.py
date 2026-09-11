import inspect
from typing import Optional, Callable
from nicegui import ui, run

from components.plaid_link import PlaidLinkButton
from theme import format_currency

class AccountsPage:
    def __init__(self, api_client, on_sync_needed: Optional[Callable[[], None]] = None):
        self.api = api_client
        self.on_sync_needed = on_sync_needed
        self.container = None

    def render(self):
        self.container = ui.column().classes("w-full gap-6")
        self.refresh()

    def _open_historical_modal(self):
        with ui.dialog() as dialog, ui.card().classes("budget-card p-6 min-w-[380px] gap-4"):
            ui.label("Import Historical Transactions").classes("text-lg font-bold text-white")
            ui.label("Pull past transactions from connected banks via Plaid.").classes("text-xs text-gray-400")

            days_input = ui.number("Number of Days to Backfill", value=365, format="%d").props("outlined dense dark").classes("w-full")

            async def run_import():
                try:
                    ui.notify("Importing historical data from Plaid...", type="info")
                    res = await run.io_bound(self.api.fetch_historical, days=int(days_input.value or 365))
                    count = res.get("importedCount", 0)
                    ui.notify(f"Successfully imported {count} historical transactions!", type="positive")
                    dialog.close()
                    if self.on_sync_needed:
                        sync_res = self.on_sync_needed()
                        if inspect.isawaitable(sync_res):
                            await sync_res
                    self.refresh()
                except Exception as e:
                    ui.notify(f"Historical import failed: {e}", type="negative")

            with ui.row().classes("w-full justify-end gap-2 mt-4"):
                ui.button("Cancel", on_click=dialog.close).props("flat dense color=grey")
                ui.button("Start Import", on_click=run_import).props("unelevated dense color=indigo")

        dialog.open()

    async def _unlink_account(self, acc):
        try:
            await run.io_bound(self.api.unlink_item, acc.item_id)
            ui.notify(f"Unlinked account '{acc.name}'", type="info")
            self.refresh()
        except Exception as e:
            ui.notify(f"Failed to unlink account: {e}", type="negative")

    def refresh(self):
        if not self.container:
            return
        self.container.clear()

        with self.container:
            # Header Row
            with ui.row().classes("w-full justify-between items-center"):
                with ui.column().classes("gap-1"):
                    ui.label("Bank Accounts & Credentials").classes("text-2xl font-black text-white")
                    ui.label("Manage connected institutions and Plaid credential pools").classes("text-sm text-gray-400")

                with ui.row().classes("items-center gap-3"):
                    ui.button(
                        "Pull History",
                        icon="history",
                        on_click=self._open_historical_modal
                    ).props("unelevated no-caps").classes(
                        "bg-white/10 hover:bg-white/15 text-white font-semibold py-2 px-4 rounded-xl border border-white/10"
                    )

                    plaid_btn = PlaidLinkButton(self.api, on_success=self.refresh)
                    plaid_btn.render()

            # Plaid Credential Pool Status
            try:
                creds = self.api.get_credentials_status()
            except Exception:
                creds = []

            if creds:
                with ui.grid(columns=2).classes("w-full gap-4"):
                    for c in creds:
                        badge_color = "emerald" if c.status == "active" else "amber"
                        with ui.card().classes("budget-card p-4 flex flex-row justify-between items-center"):
                            with ui.row().classes("items-center gap-3"):
                                icon_color = "indigo" if c.key_index == 1 else "pink"
                                with ui.row().classes(f"w-10 h-10 rounded-xl bg-{icon_color}-500/20 items-center justify-center"):
                                    ui.icon("vpn_key", color=icon_color, size="20px")
                                with ui.column().classes("gap-0"):
                                    ui.label(f"{c.key_owner}'s Plaid Key (Key #{c.key_index})").classes("font-bold text-sm text-white")
                                    ui.label(f"Client ID: {c.client_id_prefix}...").classes("text-xs font-mono text-gray-400")

                            with ui.column().classes("items-end gap-1"):
                                ui.label(c.status.upper()).classes(f"text-xs font-black px-2 py-0.5 rounded-full bg-{badge_color}-500/20 text-{badge_color}-400")
                                ui.label(f"{c.active_items_count} linked banks").classes("text-xs text-gray-500")

            # Accounts List
            try:
                accounts = self.api.get_accounts()
            except Exception as e:
                ui.label(f"Failed to load accounts: {e}").classes("text-red-400 p-4")
                return

            if not accounts:
                with ui.card().classes("w-full budget-card p-12 items-center justify-center text-center"):
                    ui.icon("account_balance", size="48px", color="grey-6")
                    ui.label("No bank accounts connected yet").classes("text-gray-400 font-semibold mt-2")
                    ui.label("Use the 'Connect Bank' button above to link your first account").classes("text-xs text-gray-500 mt-1")
            else:
                with ui.grid(columns=3).classes("w-full gap-5"):
                    for acc in accounts:
                        is_credit = acc.type == "credit"
                        balance_color = "text-rose-400" if is_credit else "text-emerald-400"
                        key_badge_color = "indigo" if acc.key_index == 1 else "pink"

                        with ui.card().classes("budget-card p-5 gap-3 flex flex-col justify-between"):
                            # Top: Institution & Mask
                            with ui.row().classes("w-full justify-between items-start"):
                                with ui.column().classes("gap-0"):
                                    ui.label(acc.institution_name or "Connected Bank").classes("text-xs font-bold uppercase tracking-wider text-gray-400")
                                    ui.label(acc.name).classes("font-bold text-base text-white line-clamp-1")
                                    mask_text = f"•••• {acc.mask}" if acc.mask else acc.type.capitalize()
                                    ui.label(mask_text).classes("text-xs text-gray-500 font-mono")

                                ui.label(f"{acc.key_owner}").classes(f"text-xs font-bold px-2 py-0.5 rounded-md bg-{key_badge_color}-500/20 text-{key_badge_color}-300")

                            # Balance
                            with ui.column().classes("w-full gap-0 my-2"):
                                ui.label("Current Balance").classes("text-xs text-gray-500")
                                ui.label(format_currency(acc.current_balance)).classes(f"text-2xl font-black {balance_color}")

                            # Footer: Unlink Action
                            with ui.row().classes("w-full justify-end pt-2 border-t border-white/5"):
                                ui.button(
                                    "Unlink Account",
                                    icon="link_off",
                                    on_click=lambda a=acc: self._unlink_account(a)
                                ).props("flat dense no-caps color=grey-5 hover:color=red-4").classes("text-xs")
