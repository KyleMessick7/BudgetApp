"""BudgetApp Python SDK
Shared client library and models for BudgetApp frontends (NiceGUI, PySide6, CLI).
"""

from .models import (
    Transaction,
    Category,
    Account,
    AnalyticsSummary,
    CategoryBreakdownItem,
    CredentialPoolItem,
)
from .client import BudgetApiClient

__all__ = [
    "BudgetApiClient",
    "Transaction",
    "Category",
    "Account",
    "AnalyticsSummary",
    "CategoryBreakdownItem",
    "CredentialPoolItem",
]
