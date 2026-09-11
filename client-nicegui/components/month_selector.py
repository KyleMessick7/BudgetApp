from datetime import datetime
from typing import Callable
from nicegui import ui

class MonthSelector:
    """Month Selector component for NiceGUI.
    Allows navigating months with < and > arrows or choosing directly.
    """

    def __init__(self, current_month: str, on_change: Callable[[str], None]):
        self.current_month = current_month or datetime.now().strftime("%Y-%m")
        self.on_change = on_change
        self.label = None

    def _get_label_text(self) -> str:
        dt = datetime.strptime(self.current_month, "%Y-%m")
        return dt.strftime("%B %Y")

    def _prev_month(self):
        year, month = map(int, self.current_month.split("-"))
        if month == 1:
            self.current_month = f"{year - 1}-12"
        else:
            self.current_month = f"{year}-{month - 1:02d}"
        if self.label:
            self.label.text = self._get_label_text()
        self.on_change(self.current_month)

    def _next_month(self):
        year, month = map(int, self.current_month.split("-"))
        if month == 12:
            self.current_month = f"{year + 1}-01"
        else:
            self.current_month = f"{year}-{month + 1:02d}"
        if self.label:
            self.label.text = self._get_label_text()
        self.on_change(self.current_month)

    def set_month(self, month_str: str):
        self.current_month = month_str
        if self.label:
            self.label.text = self._get_label_text()
        self.on_change(self.current_month)

    def render(self):
        with ui.row().classes(
            "items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5"
        ):
            ui.button(icon="chevron_left", on_click=self._prev_month).props(
                "flat dense round color=grey-4"
            ).tooltip("Previous Month")

            with ui.row().classes("items-center gap-1.5 cursor-pointer"):
                ui.icon("event", color="indigo", size="18px")
                self.label = ui.label(self._get_label_text()).classes(
                    "text-sm font-bold text-white min-w-[110px] text-center select-none"
                )

            ui.button(icon="chevron_right", on_click=self._next_month).props(
                "flat dense round color=grey-4"
            ).tooltip("Next Month")
