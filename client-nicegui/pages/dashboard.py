from datetime import datetime
from typing import Optional, Callable
from nicegui import ui

from components.month_selector import MonthSelector
from theme import format_currency, get_sub_section_color

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
        if self.selected_category and self.selected_category.id == cat.id:
            self._reset_drilldown()
            return
        self.selected_category = cat
        self.refresh()

    def _reset_drilldown(self):
        if self.selected_category is not None:
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
                            title_text = (
                                f"{self.selected_category.icon} {self.selected_category.name} Breakdown"
                                if self.selected_category
                                else "Category Spending Breakdown"
                            )
                            ui.label(title_text).classes("text-lg font-bold text-white")
                            subtitle = (
                                "Click anywhere on pie chart to collapse"
                                if self.selected_category
                                else "Click any category to expand individual purchases"
                            )
                            ui.label(subtitle).classes("text-xs text-gray-400")

                        if self.selected_category:
                            ui.button(
                                "Back to Overview",
                                icon="arrow_back",
                                on_click=self._reset_drilldown
                            ).props("flat dense no-caps text-color=indigo-4").classes("text-xs")

                    breakdown = summary.category_breakdown

                    # If in Drill-down mode
                    if self.selected_category:
                        try:
                            cat_txs = self.api.get_category_transactions(self.selected_category.id, self.selected_month)
                        except Exception:
                            cat_txs = []

                        if not cat_txs:
                            with ui.column().classes("w-full py-16 items-center justify-center text-center"):
                                ui.icon("receipt_long", size="48px", color="grey-6")
                                ui.label("No purchases found for this category.").classes("text-gray-400 font-medium mt-2")
                        else:
                            with ui.row().classes("w-full items-start gap-4 flex-wrap sm:flex-nowrap"):
                                # Sub-Pie Chart broken down by individual purchases
                                sub_data = [
                                    {
                                        "value": round(abs(float(tx.amount)), 2),
                                        "name": tx.name or tx.merchant_name or "Purchase",
                                        "itemStyle": {
                                            "color": get_sub_section_color(i, len(cat_txs), self.selected_category.color)
                                        }
                                    }
                                    for i, tx in enumerate(cat_txs)
                                ]
                                sub_echart_options = {
                                    "backgroundColor": "transparent",
                                    "tooltip": {
                                        "trigger": "item",
                                        "formatter": "{b}: ${c} ({d}%)",
                                        "backgroundColor": "#1e293b",
                                        "borderColor": "rgba(255,255,255,0.2)",
                                        "textStyle": {"color": "#f9fafb"}
                                    },
                                    "series": [
                                        {
                                            "name": self.selected_category.name,
                                            "type": "pie",
                                            "radius": ["45%", "75%"],
                                            "avoidLabelOverlap": True,
                                            "itemStyle": {
                                                "borderRadius": 6,
                                                "borderColor": "#0f172a",
                                                "borderWidth": 2
                                            },
                                            "emphasis": {
                                                "scale": True,
                                                "scaleSize": 8,
                                                "itemStyle": {
                                                    "borderColor": "#ffffff",
                                                    "borderWidth": 2
                                                }
                                            },
                                            "label": {"show": False},
                                            "data": sub_data
                                        }
                                    ]
                                }
                                with ui.column().classes("w-[230px] h-[240px] shrink-0 items-center justify-center cursor-pointer").on(
                                    "click", lambda _: self._reset_drilldown()
                                ):
                                    ui.echart(
                                        sub_echart_options,
                                        on_point_click=lambda _: self._reset_drilldown()
                                    ).classes("w-[230px] h-[240px] cursor-pointer")

                                # Expanded Individual Transactions List
                                with ui.column().classes("flex-1 min-w-[200px] max-h-[250px] overflow-y-auto gap-1.5 pr-1"):
                                    ui.label("Purchases (Largest to Smallest)").classes(
                                        "text-xs font-bold text-gray-400 uppercase tracking-wider mb-1"
                                    )
                                    for i, ctx in enumerate(cat_txs):
                                        slice_color = get_sub_section_color(i, len(cat_txs), self.selected_category.color)
                                        with ui.row().classes(
                                            "w-full justify-between items-center px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/10 "
                                            "border border-white/5 hover:border-white/20 transition-all"
                                        ):
                                            with ui.row().classes("items-center gap-2.5 flex-1 overflow-hidden"):
                                                ui.element("div").classes("w-2.5 h-2.5 rounded-full shrink-0").style(
                                                    f"background-color: {slice_color};"
                                                )
                                                with ui.column().classes("gap-0 overflow-hidden"):
                                                    ui.label(ctx.name).classes("font-semibold text-xs text-white truncate max-w-[160px]")
                                                    merchant_or_date = (
                                                        f"{ctx.merchant_name} • {ctx.date}"
                                                        if ctx.merchant_name and ctx.merchant_name != ctx.name
                                                        else ctx.date
                                                    )
                                                    ui.label(merchant_or_date).classes("text-[11px] text-gray-400 truncate max-w-[160px]")
                                            ui.label(format_currency(ctx.amount)).classes("text-xs font-bold text-rose-400 shrink-0 ml-2")

                    else:
                        # Category Overview mode
                        if not breakdown:
                            with ui.column().classes("w-full py-16 items-center justify-center text-center"):
                                ui.icon("pie_chart", size="48px", color="grey-6")
                                ui.label("No expense data recorded for this month").classes("text-gray-400 font-medium mt-2")
                        else:
                            def handle_category_click(e):
                                idx = getattr(e, "data_index", None)
                                if idx is None and isinstance(e, dict):
                                    idx = e.get("dataIndex") or e.get("data_index")

                                if idx is not None and 0 <= idx < len(breakdown):
                                    self._on_drilldown(breakdown[idx])
                                    return

                                e_data = getattr(e, "data", None)
                                if e_data is None and isinstance(e, dict):
                                    e_data = e.get("data")
                                if isinstance(e_data, dict) and "category_id" in e_data:
                                    cat_id = e_data["category_id"]
                                    cat = next((c for c in breakdown if c.id == cat_id), None)
                                    if cat:
                                        self._on_drilldown(cat)

                            echart_data = [
                                {
                                    "value": round(item.total_spent, 2),
                                    "name": f"{item.icon} {item.name}",
                                    "category_id": item.id,
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
                                    "borderColor": "rgba(255,255,255,0.2)",
                                    "textStyle": {"color": "#f9fafb"}
                                },
                                "series": [
                                    {
                                        "name": "Expenses",
                                        "type": "pie",
                                        "radius": ["48%", "76%"],
                                        "avoidLabelOverlap": True,
                                        "itemStyle": {
                                            "borderRadius": 6,
                                            "borderColor": "#0f172a",
                                            "borderWidth": 2
                                        },
                                        "emphasis": {
                                            "scale": True,
                                            "scaleSize": 8,
                                            "itemStyle": {
                                                "borderColor": "#ffffff",
                                                "borderWidth": 2
                                            }
                                        },
                                        "label": {"show": False},
                                        "data": echart_data
                                    }
                                ]
                            }

                            with ui.row().classes("w-full items-start gap-4 flex-wrap sm:flex-nowrap"):
                                # Category Pie Chart with click-to-drilldown
                                with ui.column().classes("w-[230px] h-[240px] shrink-0 items-center justify-center"):
                                    ui.echart(
                                        echart_options,
                                        on_point_click=handle_category_click
                                    ).classes("w-[230px] h-[240px] cursor-pointer")

                                # Category Side List with click-to-drilldown
                                with ui.column().classes("flex-1 min-w-[200px] max-h-[250px] overflow-y-auto gap-1.5 pr-1"):
                                    for item in breakdown:
                                        with ui.row().classes(
                                            "w-full justify-between items-center px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/10 "
                                            "border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                                        ).on("click", lambda _, it=item: self._on_drilldown(it)):
                                            with ui.row().classes("items-center gap-2.5"):
                                                ui.label(item.icon).classes("text-base")
                                                ui.label(item.name).classes("text-sm font-medium text-white truncate max-w-[160px]")
                                            ui.label(format_currency(item.total_spent)).classes("text-sm font-bold text-white shrink-0")


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
