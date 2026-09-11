from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

@dataclass
class Transaction:
    id: int
    plaid_transaction_id: Optional[str] = None
    account_id: Optional[str] = None
    category_id: Optional[int] = None
    amount: float = 0.0
    date: str = ""
    name: str = ""
    merchant_name: Optional[str] = None
    payment_channel: Optional[str] = None
    pending: int = 0
    notes: Optional[str] = None
    flagged: int = 0
    category_name: Optional[str] = None
    category_icon: Optional[str] = None
    category_color: Optional[str] = None
    account_name: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Transaction':
        return cls(
            id=data.get('id', 0),
            plaid_transaction_id=data.get('plaid_transaction_id'),
            account_id=data.get('account_id'),
            category_id=data.get('category_id'),
            amount=float(data.get('amount', 0.0)),
            date=str(data.get('date', '')),
            name=str(data.get('name', '')),
            merchant_name=data.get('merchant_name'),
            payment_channel=data.get('payment_channel'),
            pending=int(data.get('pending', 0)),
            notes=data.get('notes'),
            flagged=int(data.get('flagged', 0)),
            category_name=data.get('category_name'),
            category_icon=data.get('category_icon'),
            category_color=data.get('category_color'),
            account_name=data.get('account_name'),
        )

@dataclass
class Category:
    id: int
    name: str
    icon: str = "📁"
    color: str = "#3b82f6"
    budget_limit: float = 0.0
    spent_current_month: float = 0.0
    transaction_count: int = 0

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Category':
        return cls(
            id=data.get('id', 0),
            name=str(data.get('name', '')),
            icon=str(data.get('icon', '📁')),
            color=str(data.get('color', '#3b82f6')),
            budget_limit=float(data.get('budget_limit', 0.0) or 0.0),
            spent_current_month=float(data.get('spent_current_month', 0.0) or 0.0),
            transaction_count=int(data.get('transaction_count', 0) or 0),
        )

@dataclass
class Account:
    id: int
    plaid_account_id: str
    item_id: str
    name: str
    mask: Optional[str] = None
    type: str = "depository"
    subtype: Optional[str] = None
    current_balance: float = 0.0
    available_balance: Optional[float] = None
    iso_currency_code: Optional[str] = "USD"
    institution_name: Optional[str] = None
    client_id: Optional[str] = None
    key_owner: str = "Kyle"
    key_index: int = 1

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Account':
        return cls(
            id=data.get('id', 0),
            plaid_account_id=str(data.get('plaid_account_id', '')),
            item_id=str(data.get('item_id', '')),
            name=str(data.get('name', '')),
            mask=data.get('mask'),
            type=str(data.get('type', 'depository')),
            subtype=data.get('subtype'),
            current_balance=float(data.get('current_balance', 0.0) or 0.0),
            available_balance=float(data.get('available_balance', 0.0)) if data.get('available_balance') is not None else None,
            iso_currency_code=data.get('iso_currency_code', 'USD'),
            institution_name=data.get('institution_name'),
            client_id=data.get('client_id'),
            key_owner=str(data.get('key_owner', 'Kyle')),
            key_index=int(data.get('key_index', 1)),
        )

@dataclass
class CategoryBreakdownItem:
    id: int
    name: str
    icon: str
    color: str
    budget_limit: float
    total_spent: float

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CategoryBreakdownItem':
        return cls(
            id=data.get('id', 0),
            name=str(data.get('name', '')),
            icon=str(data.get('icon', '📁')),
            color=str(data.get('color', '#6366f1')),
            budget_limit=float(data.get('budget_limit', 0.0) or 0.0),
            total_spent=float(data.get('total_spent', 0.0) or 0.0),
        )

@dataclass
class AnalyticsSummary:
    net_balance: float = 0.0
    month_expenses: float = 0.0
    month_income: float = 0.0
    net_savings: float = 0.0
    total_budget_limit: float = 0.0
    connected_accounts_count: int = 0
    selected_month: str = ""
    category_breakdown: List[CategoryBreakdownItem] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AnalyticsSummary':
        breakdown = [
            CategoryBreakdownItem.from_dict(item) 
            for item in data.get('categoryBreakdown', [])
        ]
        return cls(
            net_balance=float(data.get('netBalance', 0.0) or 0.0),
            month_expenses=float(data.get('monthExpenses', 0.0) or 0.0),
            month_income=float(data.get('monthIncome', 0.0) or 0.0),
            net_savings=float(data.get('netSavings', 0.0) or 0.0),
            total_budget_limit=float(data.get('totalBudgetLimit', 0.0) or 0.0),
            connected_accounts_count=int(data.get('connectedAccountsCount', 0) or 0),
            selected_month=str(data.get('selectedMonth', '')),
            category_breakdown=breakdown,
        )

@dataclass
class CredentialPoolItem:
    key_index: int
    key_owner: str
    status: str
    active_items_count: int
    client_id_prefix: str
    notes: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CredentialPoolItem':
        return cls(
            key_index=int(data.get('keyIndex', 1)),
            key_owner=str(data.get('keyOwner', '')),
            status=str(data.get('status', 'offline')),
            active_items_count=int(data.get('activeItemsCount', 0)),
            client_id_prefix=str(data.get('client_id_prefix', '')),
            notes=str(data.get('notes', '')),
        )
