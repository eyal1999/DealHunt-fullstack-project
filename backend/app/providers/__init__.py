"""
Provider registry – gives services a single import target.

Example:
    from app.providers import search, detail

    results = search("laptop stand")
"""
from importlib import import_module
from typing import Callable, Dict, List
import asyncio
import concurrent.futures
import logging
from app.cache import search_cache

logger = logging.getLogger(__name__)

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


def _search_provider(provider_name: str, provider: Dict[str, ProviderFn], query: str, page: int, min_price: float = None, max_price: float = None) -> List[dict]:
    """Search a single provider with error handling for a specific page with optional price filtering."""
    try:
        logger.info(f"Starting search for {provider_name} - page {page} (price range: ${min_price or 0}-${max_price or '∞'})")
        
        # Call search function with page and price parameters
        results = provider["search"](query, page, min_price, max_price)
        
        logger.info(f"Completed search for {provider_name} - page {page}: {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"Search failed for {provider_name} - page {page}: {e}")
        return []

def search(query: str, page: int = 1, min_price: float = None, max_price: float = None) -> List[dict]:
    """Run search on every registered provider concurrently for a specific page with optional price filtering."""
    if not query or not query.strip():
        return []
    
    # Create cache key with page number and price range
    price_suffix = ""
    if min_price is not None or max_price is not None:
        price_suffix = f":price:{min_price or 0}-{max_price or 'inf'}"
    cache_key = f"{query}:page:{page}{price_suffix}"
    
    # Check cache first
    cached_results = search_cache.get(cache_key)
    if cached_results is not None:
        logger.info(f"Cache hit for query: {query[:50]}... page: {page} ({len(cached_results)} results)")
        return cached_results
    
    logger.info(f"Cache miss for query: {query[:50]}... page: {page} - Fetching from providers")
    
    if not _registry:
        return []
    
    # Use ThreadPoolExecutor for concurrent API calls
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(_registry)) as executor:
        # Submit provider searches for the specific page with price filtering
        future_to_provider = {
            executor.submit(_search_provider, name, provider, query, page, min_price, max_price): name 
            for name, provider in _registry.items()
        }
        
        # Collect results as they complete
        all_results: List[dict] = []
        for future in concurrent.futures.as_completed(future_to_provider, timeout=20):  # Reduced timeout for single page
            provider_name = future_to_provider[future]
            try:
                provider_results = future.result()
                all_results.extend(provider_results)
            except Exception as e:
                logger.error(f"Error getting results from {provider_name}: {e}")
    
    logger.info(f"Total search results for page {page}: {len(all_results)}")
    
    # Cache the results (only if we got some results)
    if all_results:
        search_cache.set(cache_key, all_results, ttl=300)  # Cache for 5 minutes per page
        logger.info(f"Cached results for query: {query[:50]}... page: {page}")
    
    return all_results


def detail(marketplace: str, product_id: str) -> dict:
    return _registry[marketplace]["detail"](product_id)
