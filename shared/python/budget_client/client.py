import json
from typing import Optional, List, Dict, Any, Tuple
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from .models import (
    Transaction,
    Category,
    Account,
    AnalyticsSummary,
    CredentialPoolItem,
)

class BudgetApiClient:
    """Universal client for BudgetApp REST API.
    Works with both NiceGUI, PySide6, and CLI scripts.
    Uses standard library urllib as default to ensure zero-dependency portability,
    with optional httpx integration.
    """

    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url.rstrip("/")

    def _request(
        self, 
        method: str, 
        path: str, 
        params: Optional[Dict[str, Any]] = None, 
        body: Optional[Dict[str, Any]] = None
    ) -> Any:
        url = f"{self.base_url}{path}"
        if params:
            query = urlencode({k: v for k, v in params.items() if v is not None})
            if query:
                url = f"{url}?{query}"

        data = None
        headers = {"Accept": "application/json"}
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = Request(url, data=data, headers=headers, method=method)
        try:
            with urlopen(req, timeout=15) as resp:
                resp_text = resp.read().decode("utf-8")
                return json.loads(resp_text) if resp_text else {}
        except HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                err_json = json.loads(err_body)
                raise RuntimeError(err_json.get("error") or err_json.get("details") or f"HTTP {e.code}: {e.reason}")
            except Exception:
                raise RuntimeError(f"HTTP {e.code}: {err_body or e.reason}")
        except URLError as e:
            raise RuntimeError(f"Failed to connect to BudgetApp server at {self.base_url}. Ensure 'npm run server' is running. ({e.reason})")

    # --- Health Check ---
    def health_check(self) -> Dict[str, Any]:
        return self._request("GET", "/api/health")

    # --- Analytics & Summary ---
    def get_summary(self, month: Optional[str] = None) -> AnalyticsSummary:
        params = {"month": month} if month else None
        data = self._request("GET", "/api/analytics/summary", params=params)
        return AnalyticsSummary.from_dict(data)

    def get_category_transactions(self, category_id: int, month: Optional[str] = None) -> List[Transaction]:
        params = {"month": month} if month else None
        data = self._request("GET", f"/api/analytics/category-transactions/{category_id}", params=params)
        return [Transaction.from_dict(item) for item in data]

    def get_accounts(self) -> List[Account]:
        data = self._request("GET", "/api/analytics/accounts")
        return [Account.from_dict(item) for item in data]

    # --- Transactions ---
    def get_transactions(
        self,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        flagged: Optional[bool] = None,
        account_id: Optional[str] = None,
    ) -> Tuple[List[Transaction], int]:
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if search:
            params["search"] = search
        if category_id:
            params["category_id"] = category_id
        if flagged:
            params["flagged"] = "1"
        if account_id:
            params["account_id"] = account_id

        data = self._request("GET", "/api/transactions", params=params)
        txs = [Transaction.from_dict(t) for t in data.get("transactions", [])]
        total = data.get("total", len(txs))
        return txs, total

    def add_transaction(
        self,
        name: str,
        amount: float,
        date: str,
        category_id: Optional[int] = None,
        merchant_name: Optional[str] = None,
        notes: Optional[str] = None,
        flagged: bool = False,
        account_id: Optional[str] = None,
    ) -> Transaction:
        body = {
            "name": name,
            "amount": amount,
            "date": date,
            "category_id": category_id,
            "merchant_name": merchant_name or name,
            "notes": notes,
            "flagged": flagged,
            "account_id": account_id or "acc_chk_01",
        }
        data = self._request("POST", "/api/transactions", body=body)
        return Transaction.from_dict(data)

    def update_transaction(
        self,
        transaction_id: int,
        category_id: Optional[int] = None,
        notes: Optional[str] = None,
        flagged: Optional[bool] = None,
    ) -> Transaction:
        body: Dict[str, Any] = {}
        if category_id is not None:
            body["category_id"] = category_id
        if notes is not None:
            body["notes"] = notes
        if flagged is not None:
            body["flagged"] = flagged

        data = self._request("PATCH", f"/api/transactions/{transaction_id}", body=body)
        return Transaction.from_dict(data)

    def delete_transaction(self, transaction_id: int) -> bool:
        data = self._request("DELETE", f"/api/transactions/{transaction_id}")
        return bool(data.get("success", False))

    # --- Categories ---
    def get_categories(self, month: Optional[str] = None) -> List[Category]:
        params = {"month": month} if month else None
        data = self._request("GET", "/api/categories", params=params)
        return [Category.from_dict(c) for c in data]

    def add_category(
        self,
        name: str,
        icon: str = "📁",
        color: str = "#3b82f6",
        budget_limit: float = 0.0,
    ) -> Category:
        body = {
            "name": name,
            "icon": icon,
            "color": color,
            "budget_limit": budget_limit,
        }
        data = self._request("POST", "/api/categories", body=body)
        return Category.from_dict(data)

    def update_category(
        self,
        category_id: int,
        name: Optional[str] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None,
        budget_limit: Optional[float] = None,
    ) -> Category:
        body: Dict[str, Any] = {}
        if name is not None:
            body["name"] = name
        if icon is not None:
            body["icon"] = icon
        if color is not None:
            body["color"] = color
        if budget_limit is not None:
            body["budget_limit"] = budget_limit

        data = self._request("PUT", f"/api/categories/{category_id}", body=body)
        return Category.from_dict(data)

    def delete_category(self, category_id: int) -> bool:
        data = self._request("DELETE", f"/api/categories/{category_id}")
        return bool(data.get("success", False))

    # --- Plaid Integration ---
    def trigger_sync(self) -> Dict[str, Any]:
        return self._request("POST", "/api/plaid/sync")

    def get_credentials_status(self) -> List[CredentialPoolItem]:
        data = self._request("GET", "/api/plaid/credentials-status")
        pool = data.get("poolStatus", [])
        return [CredentialPoolItem.from_dict(p) for p in pool]

    def fetch_historical(self, days: int = 365) -> Dict[str, Any]:
        return self._request("POST", "/api/plaid/fetch-historical", body={"days": days})

    def unlink_item(self, item_id: str) -> bool:
        data = self._request("DELETE", f"/api/plaid/items/{item_id}")
        return bool(data.get("success", False))

    def create_link_token(self, key_index: int = 1) -> Dict[str, Any]:
        return self._request("POST", "/api/plaid/create-link-token", body={"key_index": key_index})

    def exchange_public_token(
        self, 
        public_token: str, 
        metadata: Dict[str, Any], 
        client_id: Optional[str] = None
    ) -> Dict[str, Any]:
        body = {
            "public_token": public_token,
            "metadata": metadata,
            "client_id": client_id,
        }
        return self._request("POST", "/api/plaid/exchange-public-token", body=body)
