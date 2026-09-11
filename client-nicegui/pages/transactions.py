from datetime import datetime
from typing import Optional
from nicegui import ui

from theme import format_currency

class TransactionsPage:
    def __init__(self, api_client):
        self.api = api_client
        self.search_query = ""
        self.selected_category_id: Optional[int] = None
        self.flagged_only = False
        self.current_page = 1
        self.page_size = 50
        self.total_count = 0
        self.categories = []
        self.table_container = None
        self.pagination_label = None

    def render(self):
        with ui.column().classes("w-full gap-6"):
            # Header Row
            with ui.row().classes("w-full justify-between items-center"):
                with ui.column().classes("gap-1"):
                    ui.label("Transactions").classes("text-2xl font-black text-white")
                    ui.label("Search, filter, categorize, and flag bank purchases").classes("text-sm text-gray-400")

                ui.button(
                    "Add Purchase",
                    icon="add",
                    on_click=self._open_add_dialog
                ).props("unelevated no-caps").classes(
                    "bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30"
                )

            # Filter Toolbar
            with ui.card().classes("w-full budget-card p-4"):
                with ui.row().classes("w-full items-center justify-between gap-4 flex-wrap"):
                    # Search Input
                    search_input = ui.input(
                        placeholder="Search purchases or merchants...",
                        on_change=lambda e: self._on_search_change(e.value)
                    ).props("outlined dense dark clearable").classes("w-72 bg-white/5 rounded-xl")
                    search_input.add_slot("prepend", '<i class="q-icon material-icons text-gray-400">search</i>')

                    # Category Dropdown Filter
                    try:
                        self.categories = self.api.get_categories()
                    except Exception:
                        self.categories = []

                    cat_options = {0: "All Categories"}
                    for c in self.categories:
                        cat_options[c.id] = f"{c.icon} {c.name}"

                    ui.select(
                        options=cat_options,
                        value=0,
                        on_change=lambda e: self._on_category_change(e.value)
                    ).props("outlined dense dark").classes("w-52 bg-white/5 rounded-xl")

                    # Flagged Only Toggle
                    ui.checkbox(
                        "Flagged Only",
                        value=self.flagged_only,
                        on_change=lambda e: self._on_flagged_toggle(e.value)
                    ).props("dark color=amber").classes("text-gray-300 font-semibold")

            # Table Container
            self.table_container = ui.column().classes("w-full gap-2")

            # Pagination Bar
            with ui.row().classes("w-full justify-between items-center py-2 px-1"):
                self.pagination_label = ui.label("").classes("text-xs text-gray-400")
                with ui.row().classes("items-center gap-2"):
                    ui.button(icon="chevron_left", on_click=self._prev_page).props("flat dense round color=grey-4")
                    ui.button(icon="chevron_right", on_click=self._next_page).props("flat dense round color=grey-4")

        self.refresh_table()

    def _on_search_change(self, val):
        self.search_query = val or ""
        self.current_page = 1
        self.refresh_table()

    def _on_category_change(self, cat_id):
        self.selected_category_id = cat_id if cat_id != 0 else None
        self.current_page = 1
        self.refresh_table()

    def _on_flagged_toggle(self, is_flagged):
        self.flagged_only = bool(is_flagged)
        self.current_page = 1
        self.refresh_table()

    def _prev_page(self):
        if self.current_page > 1:
            self.current_page -= 1
            self.refresh_table()

    def _next_page(self):
        max_pages = max(1, (self.total_count + self.page_size - 1) // self.page_size)
        if self.current_page < max_pages:
            self.current_page += 1
            self.refresh_table()

    def _toggle_flag(self, tx):
        new_status = not bool(tx.flagged)
        try:
            self.api.update_transaction(tx.id, flagged=new_status)
            tx.flagged = 1 if new_status else 0
            self.refresh_table()
        except Exception as e:
            ui.notify(f"Failed to update flag: {e}", type="negative")

    def _update_tx_category(self, tx_id, new_category_id):
        try:
            self.api.update_transaction(tx_id, category_id=new_category_id)
            ui.notify("Category updated", type="positive", position="top")
        except Exception as e:
            ui.notify(f"Failed to update category: {e}", type="negative")

    def _delete_tx(self, tx_id):
        try:
            self.api.delete_transaction(tx_id)
            ui.notify("Transaction deleted", type="info", position="top")
            self.refresh_table()
        except Exception as e:
            ui.notify(f"Failed to delete transaction: {e}", type="negative")

    def _open_add_dialog(self):
        with ui.dialog() as dialog, ui.card().classes("budget-card p-6 min-w-[420px] gap-4"):
            ui.label("Add Manual Purchase").classes("text-lg font-bold text-white")

            name_input = ui.input("Description / Item Name").props("outlined dense dark").classes("w-full")
            merchant_input = ui.input("Merchant Name (Optional)").props("outlined dense dark").classes("w-full")
            amount_input = ui.number("Amount ($)", value=0.0, format="%.2f").props("outlined dense dark").classes("w-full")
            date_input = ui.input("Date (YYYY-MM-DD)", value=datetime.now().strftime("%Y-%m-%d")).props("outlined dense dark").classes("w-full")

            cat_select_options = {c.id: f"{c.icon} {c.name}" for c in self.categories}
            cat_select = ui.select(options=cat_select_options, label="Category").props("outlined dense dark").classes("w-full")

            def save():
                if not name_input.value or not amount_input.value or not date_input.value:
                    ui.notify("Please fill in name, amount, and date.", type="warning")
                    return
                try:
                    self.api.add_transaction(
                        name=name_input.value,
                        amount=float(amount_input.value),
                        date=date_input.value,
                        category_id=cat_select.value,
                        merchant_name=merchant_input.value or name_input.value
                    )
                    ui.notify("Purchase added successfully!", type="positive")
                    dialog.close()
                    self.refresh_table()
                except Exception as e:
                    ui.notify(f"Failed to save purchase: {e}", type="negative")

            with ui.row().classes("w-full justify-end gap-2 mt-4"):
                ui.button("Cancel", on_click=dialog.close).props("flat dense color=grey")
                ui.button("Save Purchase", on_click=save).props("unelevated dense color=indigo")

        dialog.open()

    def refresh_table(self):
        if not self.table_container:
            return
        self.table_container.clear()

        offset = (self.current_page - 1) * self.page_size
        try:
            txs, total = self.api.get_transactions(
                limit=self.page_size,
                offset=offset,
                search=self.search_query,
                category_id=self.selected_category_id,
                flagged=self.flagged_only
            )
            self.total_count = total
        except Exception as e:
            with self.table_container:
                ui.label(f"Error loading transactions: {e}").classes("text-red-400 p-4")
            return

        if self.pagination_label:
            start_num = offset + 1 if total > 0 else 0
            end_num = min(offset + self.page_size, total)
            self.pagination_label.text = f"Showing {start_num}-{end_num} of {total} transactions"

        with self.table_container:
            if not txs:
                with ui.card().classes("w-full budget-card p-12 items-center justify-center text-center"):
                    ui.icon("search_off", size="48px", color="grey-6")
                    ui.label("No transactions matching your filter criteria").classes("text-gray-400 font-semibold mt-2")
                return

            with ui.card().classes("w-full budget-card p-0 overflow-hidden"):
                # Table Header
                with ui.row().classes(
                    "w-full px-5 py-3 border-b border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider items-center justify-between"
                ):
                    ui.label("Date").classes("w-24")
                    ui.label("Description / Merchant").classes("flex-1")
                    ui.label("Category").classes("w-44")
                    ui.label("Amount").classes("w-28 text-right")
                    ui.label("Actions").classes("w-24 text-center")

                # Table Rows
                cat_choices = {c.id: f"{c.icon} {c.name}" for c in self.categories}
                for tx in txs:
                    with ui.row().classes(
                        "w-full px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-all items-center justify-between"
                    ):
                        # Date
                        ui.label(tx.date).classes("w-24 text-xs font-mono text-gray-400")

                        # Description
                        with ui.column().classes("flex-1 gap-0 pr-4"):
                            ui.label(tx.name).classes("text-sm font-semibold text-white line-clamp-1")
                            if tx.merchant_name and tx.merchant_name != tx.name:
                                ui.label(tx.merchant_name).classes("text-xs text-gray-500")

                        # Category Dropdown
                        with ui.row().classes("w-44"):
                            curr_val = tx.category_id if tx.category_id in cat_choices else None
                            ui.select(
                                options=cat_choices,
                                value=curr_val,
                                on_change=lambda e, tid=tx.id: self._update_tx_category(tid, e.value)
                            ).props("outlined dense dark").classes("w-full text-xs")

                        # Amount
                        is_income = tx.amount < 0
                        display_amount = abs(tx.amount)
                        amt_color = "text-emerald-400" if is_income else "text-white"
                        prefix = "+ " if is_income else ""
                        with ui.row().classes("w-28 justify-end"):
                            ui.label(f"{prefix}{format_currency(display_amount)}").classes(f"text-sm font-bold {amt_color}")

                        # Actions: Flag & Delete
                        with ui.row().classes("w-24 justify-center items-center gap-1"):
                            flag_color = "amber" if tx.flagged else "grey-6"
                            ui.button(
                                icon="flag" if tx.flagged else "outlined_flag",
                                on_click=lambda t=tx: self._toggle_flag(t)
                            ).props(f"flat dense round color={flag_color}").tooltip("Flag for review")

                            ui.button(
                                icon="delete",
                                on_click=lambda tid=tx.id: self._delete_tx(tid)
                            ).props("flat dense round color=grey-6 hover:color=red-4").tooltip("Delete transaction")
