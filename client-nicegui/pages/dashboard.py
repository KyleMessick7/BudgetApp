from datetime import datetime
from typing import Optional, Callable
from nicegui import ui

from components.month_selector import MonthSelector
from theme import format_currency

class DashboardPage:
    def __init__(self, api_client, on_sync_needed: Optional[Callable[[], None]] = None):
        self.api = api_client
        self.on_sync_needed = on_sync_needed
        self.selected_month = datetime.now().strftime("%Y-%m")
        self.selected_category = None
        self.container = None

    def render(self):
        self.container = ui.column().classes("w-full gap-6")
        self.refresh()

    def set_month(self, new_month: str):
        self.selected_month = new_month
        self.selected_category = None
        self.refresh()

    def _on_drilldown(self, cat):
        self.selected_category = cat
        self.refresh()

    def _reset_drilldown(self):
        self.selected_category = None
        self.refresh()

    def refresh(self):
        if not self.container:
            return
        self.container.clear()

        with self.container:
            # Header Row
            with ui.row().classes("w-full justify-between items-center"):
                with ui.column().classes("gap-1"):
                    ui.label("Dashboard Overview").classes("text-2xl font-black text-white")
                    ui.label("Financial health and monthly spending analytics").classes("text-sm text-gray-400")

                # Month Selector
                month_comp = MonthSelector(self.selected_month, on_change=self.set_month)
                month_comp.render()

            try:
                summary = self.api.get_summary(self.selected_month)
                txs, _ = self.api.get_transactions(limit=6)
            except Exception as e:
                with ui.card().classes("w-full budget-card p-6"):
                    ui.label(f"Could not load dashboard data: {e}").classes("text-red-400 font-semibold")
                    ui.label("Make sure the backend server is running ('npm run server')").classes("text-sm text-gray-400 mt-2")
                return

            # 4 Metric Cards
            with ui.grid(columns=4).classes("w-full gap-4"):
                # Total Balance
                with ui.column().classes("metric-card"):
                    with ui.row().classes("w-full justify-between items-center"):
                        ui.label("Net Balance").classes("text-xs font-bold uppercase tracking-wider text-gray-400")
                        with ui.row().classes("w-8 h-8 rounded-lg bg-indigo-500/20 items-center justify-center"):
                            ui.icon("account_balance", color="indigo", size="18px")
                    ui.label(format_currency(summary.net_balance)).classes("text-2xl font-black text-white mt-2")
                    ui.label(f"{summary.connected_accounts_count} Accounts Connected").classes("text-xs text-gray-500 mt-1")

                # Monthly Income
                with ui.column().classes("metric-card"):
                    with ui.row().classes("w-full justify-between items-center"):
                        ui.label("Monthly Income").classes("text-xs font-bold uppercase tracking-wider text-gray-400")
                        with ui.row().classes("w-8 h-8 rounded-lg bg-emerald-500/20 items-center justify-center"):
                            ui.icon("trending_up", color="emerald", size="18px")
                    ui.label(format_currency(summary.month_income)).classes("text-2xl font-black text-emerald-400 mt-2")
                    ui.label("Total inflow this month").classes("text-xs text-gray-500 mt-1")

                # Monthly Expenses
                with ui.column().classes("metric-card"):
                    with ui.row().classes("w-full justify-between items-center"):
                        ui.label("Monthly Expenses").classes("text-xs font-bold uppercase tracking-wider text-gray-400")
                        with ui.row().classes("w-8 h-8 rounded-lg bg-rose-500/20 items-center justify-center"):
                            ui.icon("trending_down", color="rose", size="18px")
                    ui.label(format_currency(summary.month_expenses)).classes("text-2xl font-black text-rose-400 mt-2")
                    ui.label("Total outflow this month").classes("text-xs text-gray-500 mt-1")

                # Net Savings
                savings_color = "emerald" if summary.net_savings >= 0 else "rose"
                with ui.column().classes("metric-card"):
                    with ui.row().classes("w-full justify-between items-center"):
                        ui.label("Net Savings").classes("text-xs font-bold uppercase tracking-wider text-gray-400")
                        with ui.row().classes(f"w-8 h-8 rounded-lg bg-{savings_color}-500/20 items-center justify-center"):
                            ui.icon("savings", color=savings_color, size="18px")
                    ui.label(format_currency(summary.net_savings)).classes(f"text-2xl font-black text-{savings_color}-400 mt-2")
                    ui.label("Income minus expenses").classes("text-xs text-gray-500 mt-1")

            # Main Section: Pie Chart & Recent Transactions
            with ui.grid(columns=2).classes("w-full gap-6"):
                # Left Column: Category Breakdown with Drilldown
                with ui.card().classes("w-full budget-card p-6 flex flex-col justify-between"):
                    with ui.row().classes("w-full justify-between items-center mb-4"):
                        with ui.column().classes("gap-0"):
                            ui.label("Spending Breakdown").classes("text-lg font-bold text-white")
                            subtitle = (
                                f"Drill-down: {self.selected_category.name}" 
                                if self.selected_category 
                                else "Click a category to inspect transactions"
                            )
                            ui.label(subtitle).classes("text-xs text-gray-400")
                        
                        if self.selected_category:
                            ui.button(
                                "Back to Categories", 
                                icon="arrow_back", 
                                on_click=self._reset_drilldown
                            ).props("flat dense no-caps text-color=indigo-4").classes("text-xs")

                    # If in Drill-down mode
                    if self.selected_category:
                        try:
                            cat_txs = self.api.get_category_transactions(self.selected_category.id, self.selected_month)
                        except Exception:
                            cat_txs = []

                        if not cat_txs:
                            ui.label("No transactions found for this category.").classes("text-gray-500 py-8 text-center")
                        else:
                            with ui.column().classes("w-full gap-2 max-h-[340px] overflow-y-auto pr-1"):
                                for ctx in cat_txs:
                                    with ui.row().classes(
                                        "w-full justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5"
                                    ):
                                        with ui.column().classes("gap-0"):
                                            ui.label(ctx.name).classes("font-semibold text-sm text-white")
                                            ui.label(f"{ctx.merchant_name or ''} • {ctx.date}").classes("text-xs text-gray-400")
                                        ui.label(format_currency(ctx.amount)).classes("font-bold text-rose-400")
                    else:
                        # Category Pie Chart using ECharts
                        breakdown = summary.category_breakdown
                        if not breakdown:
                            with ui.column().classes("w-full py-16 items-center justify-center text-center"):
                                ui.icon("pie_chart", size="48px", color="grey-6")
                                ui.label("No expense data recorded for this month").classes("text-gray-400 font-medium mt-2")
                        else:
                            echart_data = [
                                {
                                    "value": round(item.total_spent, 2),
                                    "name": f"{item.icon} {item.name}",
                                    "itemStyle": {"color": item.color}
                                }
                                for item in breakdown
                            ]
                            echart_options = {
                                "backgroundColor": "transparent",
                                "tooltip": {
                                    "trigger": "item",
                                    "formatter": "{b}: ${c} ({d}%)",
                                    "backgroundColor": "#1e293b",
                                    "textStyle": {"color": "#f9fafb"}
                                },
                                "series": [
                                    {
                                        "name": "Expenses",
                                        "type": "pie",
                                        "radius": ["45%", "72%"],
                                        "avoidLabelOverlap": True,
                                        "itemStyle": {
                                            "borderRadius": 8,
                                            "borderColor": "#0f172a",
                                            "borderWidth": 2
                                        },
                                        "label": {"show": False},
                                        "data": echart_data
                                    }
                                ]
                            }
                            ui.echart(echart_options).classes("w-full h-64")

                            # Category Quick List with click-to-drilldown
                            with ui.row().classes("w-full gap-2 flex-wrap mt-2"):
                                for item in breakdown:
                                    ui.button(
                                        f"{item.icon} {item.name} ({format_currency(item.total_spent)})",
                                        on_click=lambda it=item: self._on_drilldown(it)
                                    ).props("dense unelevated no-caps").classes(
                                        "text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-indigo-600/30 text-gray-300 hover:text-white border border-white/5"
                                    )

                # Right Column: Recent Transactions
                with ui.card().classes("w-full budget-card p-6"):
                    with ui.row().classes("w-full justify-between items-center mb-4"):
                        ui.label("Recent Purchases").classes("text-lg font-bold text-white")
                        ui.label("Last 6 transactions").classes("text-xs text-gray-400")

                    if not txs:
                        with ui.column().classes("w-full py-16 items-center justify-center text-center"):
                            ui.icon("receipt_long", size="48px", color="grey-6")
                            ui.label("No transactions recorded yet").classes("text-gray-400 font-medium mt-2")
                    else:
                        with ui.column().classes("w-full gap-2.5"):
                            for tx in txs:
                                with ui.row().classes(
                                    "w-full justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                                ):
                                    with ui.row().classes("items-center gap-3"):
                                        icon_text = tx.category_icon or "💳"
                                        cat_color = tx.category_color or "#6366f1"
                                        with ui.row().classes(
                                            "w-9 h-9 rounded-xl items-center justify-center text-base"
                                        ).style(f"background-color: {cat_color}22; border: 1px solid {cat_color}44;"):
                                            ui.label(icon_text)

                                        with ui.column().classes("gap-0"):
                                            ui.label(tx.name).classes("font-semibold text-sm text-white line-clamp-1")
                                            ui.label(f"{tx.category_name or 'Uncategorized'} • {tx.date}").classes("text-xs text-gray-400")

                                    is_income = tx.amount < 0
                                    display_amount = abs(tx.amount)
                                    amt_color = "text-emerald-400" if is_income else "text-white"
                                    prefix = "+ " if is_income else ""
                                    ui.label(f"{prefix}{format_currency(display_amount)}").classes(f"font-bold text-sm {amt_color}")
