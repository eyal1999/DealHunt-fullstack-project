"""
Provider registry – gives services a single import target.

Example:
    from app.providers import search, detail

    results = search("laptop stand")
"""
from importlib import import_module
from typing import Callable, Dict, List

ProviderFn = Callable[..., object]
_registry: Dict[str, Dict[str, ProviderFn]] = {}


def _register(name: str, mod_path: str) -> None:
    mod = import_module(mod_path)
    _registry[name] = {
        "search": getattr(mod, "search"),
        "detail": getattr(mod, "detail"),
    }


# Register built‑ins
_register("aliexpress", "app.providers.aliexpress")
_register("ebay", "app.providers.ebay")
# _register("amazon", "app.providers.amazon")  # ★ Sprint 2


def search(query: str) -> List[dict]:
    """Run search on every registered provider and merge."""
    results: List[dict] = []
    for p in _registry.values():
        results.extend(p["search"](query))
    return results


def detail(marketplace: str, product_id: str) -> dict:
    return _registry[marketplace]["detail"](product_id)
