from typing import Callable, Optional
from nicegui import ui
import json

class PlaidLinkButton:
    """Plaid Link Button with Key Owner Selection (Kyle's Key vs Mallory's Key)
    and Mock Mode Demo Support.
    """

    def __init__(self, api_client, on_success: Optional[Callable[[], None]] = None):
        self.api = api_client
        self.on_success = on_success
        self.selected_key_index = 1
        self.loading = False
        self.button = None

    def _select_key_and_connect(self, key_idx: int):
        self.selected_key_index = key_idx
        self._start_plaid_flow()

    def _start_plaid_flow(self):
        try:
            ui.notify(f"Initiating connection with Key #{self.selected_key_index}...", type="info", position="top")
            res = self.api.create_link_token(self.selected_key_index)
            is_mock = res.get("is_mock", False)
            link_token = res.get("link_token")
            client_id = res.get("client_id")

            if is_mock or not link_token:
                # Mock Mode demo connection
                exchange_res = self.api.exchange_public_token(
                    public_token="mock_public_token",
                    metadata={
                        "institution": {
                            "name": f"Mock Bank (Key #{self.selected_key_index})",
                            "institution_id": f"ins_mock_{self.selected_key_index}"
                        }
                    },
                    client_id=client_id
                )
                ui.notify("Successfully connected bank account (Mock Mode)!", type="positive", position="top")
                if self.on_success:
                    self.on_success()
            else:
                # Live Plaid Link via client JavaScript
                js_code = f"""
                (function() {{
                    if (typeof Plaid === 'undefined') {{
                        alert('Plaid Link script is loading. Please try again in a moment.');
                        return;
                    }}
                    const handler = Plaid.create({{
                        token: '{link_token}',
                        onSuccess: (public_token, metadata) => {{
                            fetch('/api/plaid/exchange-public-token', {{
                                method: 'POST',
                                headers: {{ 'Content-Type': 'application/json' }},
                                body: JSON.stringify({{
                                    public_token: public_token,
                                    metadata: metadata,
                                    client_id: '{client_id}'
                                }})
                            }}).then(res => res.json()).then(data => {{
                                alert('Bank linked successfully!');
                                window.location.reload();
                            }});
                        }},
                        onExit: (err, metadata) => {{
                            if (err != null) console.error(err);
                        }}
                    }});
                    handler.open();
                }})();
                """
                ui.run_javascript(js_code)
        except Exception as e:
            ui.notify(f"Connection failed: {e}", type="negative", position="top")

    def render(self):
        with ui.row().classes("items-center gap-0 rounded-xl overflow-hidden shadow-lg shadow-indigo-600/20"):
            self.button = ui.button(
                f"Connect Bank (Key #{self.selected_key_index})",
                icon="account_balance",
                on_click=lambda: self._select_key_and_connect(self.selected_key_index)
            ).props("unelevated no-caps").classes(
                "rounded-r-none bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4"
            )

            with ui.button(icon="arrow_drop_down").props("unelevated").classes(
                "rounded-l-none bg-indigo-700 hover:bg-indigo-600 text-white px-2 border-l border-white/20"
            ):
                with ui.menu().classes("bg-[#1e293b] border border-white/10 rounded-xl p-2 text-white min-w-[220px]"):
                    ui.label("SELECT PLAID API KEY OWNER").classes("text-[11px] font-bold text-gray-400 px-3 py-1")
                    ui.menu_item(
                        "🔵 Kyle's Plaid Key (Key #1)",
                        on_click=lambda: self._select_key_and_connect(1)
                    ).classes("text-sm hover:bg-white/10 rounded-lg")
                    ui.menu_item(
                        "💗 Mallory's Plaid Key (Key #2)",
                        on_click=lambda: self._select_key_and_connect(2)
                    ).classes("text-sm hover:bg-white/10 rounded-lg")
