from datetime import datetime
from nicegui import ui

from components.month_selector import MonthSelector
from theme import format_currency

class BudgetsPage:
    def __init__(self, api_client):
        self.api = api_client
        self.selected_month = datetime.now().strftime("%Y-%m")
        self.container = None

    def render(self):
        self.container = ui.column().classes("w-full gap-6")
        self.refresh()

    def set_month(self, new_month: str):
        self.selected_month = new_month
        self.refresh()

    def _open_add_category_dialog(self):
        with ui.dialog() as dialog, ui.card().classes("budget-card p-6 min-w-[380px] gap-4"):
            ui.label("Add New Category").classes("text-lg font-bold text-white")

            name_input = ui.input("Category Name").props("outlined dense dark").classes("w-full")
            icon_input = ui.input("Emoji Icon (e.g. 🍔, 🚗, 🎮)", value="🎯").props("outlined dense dark").classes("w-full")
            color_input = ui.input("Color Hex", value="#6366f1").props("outlined dense dark").classes("w-full")
            limit_input = ui.number("Monthly Budget Limit ($)", value=300.0, format="%.2f").props("outlined dense dark").classes("w-full")

            def save():
                if not name_input.value:
                    ui.notify("Category name is required", type="warning")
                    return
                try:
                    self.api.add_category(
                        name=name_input.value,
                        icon=icon_input.value or "📁",
                        color=color_input.value or "#6366f1",
                        budget_limit=float(limit_input.value or 0.0)
                    )
                    ui.notify("Category created!", type="positive")
                    dialog.close()
                    self.refresh()
                except Exception as e:
                    ui.notify(f"Failed to create category: {e}", type="negative")

            with ui.row().classes("w-full justify-end gap-2 mt-4"):
                ui.button("Cancel", on_click=dialog.close).props("flat dense color=grey")
                ui.button("Create Category", on_click=save).props("unelevated dense color=indigo")

        dialog.open()

    def _open_edit_category_dialog(self, cat):
        with ui.dialog() as dialog, ui.card().classes("budget-card p-6 min-w-[380px] gap-4"):
            ui.label(f"Edit Category: {cat.name}").classes("text-lg font-bold text-white")

            name_input = ui.input("Category Name", value=cat.name).props("outlined dense dark").classes("w-full")
            icon_input = ui.input("Emoji Icon", value=cat.icon).props("outlined dense dark").classes("w-full")
            color_input = ui.input("Color Hex", value=cat.color).props("outlined dense dark").classes("w-full")
            limit_input = ui.number("Monthly Budget Limit ($)", value=cat.budget_limit, format="%.2f").props("outlined dense dark").classes("w-full")

            def save():
                try:
                    self.api.update_category(
                        category_id=cat.id,
                        name=name_input.value,
                        icon=icon_input.value,
                        color=color_input.value,
                        budget_limit=float(limit_input.value or 0.0)
                    )
                    ui.notify("Category updated!", type="positive")
                    dialog.close()
                    self.refresh()
                except Exception as e:
                    ui.notify(f"Failed to update category: {e}", type="negative")

            with ui.row().classes("w-full justify-end gap-2 mt-4"):
                ui.button("Cancel", on_click=dialog.close).props("flat dense color=grey")
                ui.button("Save Changes", on_click=save).props("unelevated dense color=indigo")

        dialog.open()

    def _delete_category(self, cat):
        if cat.name in ("Income", "Uncategorized"):
            ui.notify("System categories cannot be deleted", type="warning")
            return
        try:
            self.api.delete_category(cat.id)
            ui.notify(f"Deleted '{cat.name}'", type="info")
            self.refresh()
        except Exception as e:
            ui.notify(f"Failed to delete: {e}", type="negative")

    def refresh(self):
        if not self.container:
            return
        self.container.clear()

        with self.container:
            # Header Row
            with ui.row().classes("w-full justify-between items-center"):
                with ui.column().classes("gap-1"):
                    ui.label("Budgets & Goals").classes("text-2xl font-black text-white")
                    ui.label("Track monthly spending limits and category allowances").classes("text-sm text-gray-400")

                with ui.row().classes("items-center gap-3"):
                    month_comp = MonthSelector(self.selected_month, on_change=self.set_month)
                    month_comp.render()

                    ui.button(
                        "Add Category",
                        icon="add",
                        on_click=self._open_add_category_dialog
                    ).props("unelevated no-caps").classes(
                        "bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl shadow-lg shadow-indigo-600/30"
                    )

            try:
                categories = self.api.get_categories(month=self.selected_month)
            except Exception as e:
                ui.label(f"Failed to load categories: {e}").classes("text-red-400 p-4")
                return

            # Display category cards
            # Filter out Income category from budget limits view
            budget_cats = [c for c in categories if c.name != "Income"]

            with ui.grid(columns=2).classes("w-full gap-5"):
                for cat in budget_cats:
                    spent = cat.spent_current_month
                    limit = cat.budget_limit
                    pct = min(100.0, (spent / limit * 100)) if limit > 0 else 0.0

                    # Status color
                    if limit > 0 and spent > limit:
                        bar_color = "#ef4444"
                        status_text = "Over Budget"
                        status_badge_bg = "bg-rose-500/20 text-rose-400"
                    elif limit > 0 and pct >= 80:
                        bar_color = "#f59e0b"
                        status_text = "Near Limit"
                        status_badge_bg = "bg-amber-500/20 text-amber-400"
                    else:
                        bar_color = cat.color or "#10b981"
                        status_text = "On Track"
                        status_badge_bg = "bg-emerald-500/20 text-emerald-400"

                    with ui.card().classes("w-full budget-card p-5 gap-3"):
                        # Card Header
                        with ui.row().classes("w-full justify-between items-center"):
                            with ui.row().classes("items-center gap-3"):
                                with ui.row().classes(
                                    "w-10 h-10 rounded-xl items-center justify-center text-lg shadow-sm"
                                ).style(f"background-color: {cat.color}25; border: 1px solid {cat.color}50;"):
                                    ui.label(cat.icon or "📁")

                                with ui.column().classes("gap-0"):
                                    ui.label(cat.name).classes("font-bold text-base text-white")
                                    ui.label(f"{cat.transaction_count} purchases").classes("text-xs text-gray-500")

                            with ui.row().classes("items-center gap-2"):
                                ui.label(status_text).classes(f"text-xs font-bold px-2.5 py-0.5 rounded-full {status_badge_bg}")

                                ui.button(
                                    icon="edit",
                                    on_click=lambda c=cat: self._open_edit_category_dialog(c)
                                ).props("flat dense round color=grey-4").tooltip("Edit Category")

                                if cat.name != "Uncategorized":
                                    ui.button(
                                        icon="delete",
                                        on_click=lambda c=cat: self._delete_category(c)
                                    ).props("flat dense round color=grey-6 hover:color=red-4").tooltip("Delete Category")

                        # Spend vs Limit Text
                        with ui.row().classes("w-full justify-between items-baseline mt-1"):
                            with ui.row().classes("items-baseline gap-1.5"):
                                ui.label(format_currency(spent)).classes("text-xl font-black text-white")
                                ui.label(f"/ {format_currency(limit)}").classes("text-sm text-gray-400 font-semibold")

                            if limit > 0:
                                ui.label(f"{pct:.1f}%").classes("text-sm font-bold text-gray-300")
                            else:
                                ui.label("No limit set").classes("text-xs text-gray-500 italic")

                        # Progress Bar
                        with ui.row().classes("w-full h-2.5 bg-white/10 rounded-full overflow-hidden"):
                            ui.row().classes("h-full rounded-full transition-all duration-500").style(
                                f"width: {pct}%; background-color: {bar_color};"
                            )
