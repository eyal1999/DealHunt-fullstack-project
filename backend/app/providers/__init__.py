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


def _search_provider(provider_name: str, provider: Dict[str, ProviderFn], query: str) -> List[dict]:
    """Search a single provider with error handling."""
    try:
        logger.info(f"Starting search for {provider_name}")
        results = provider["search"](query)
        logger.info(f"Completed search for {provider_name}: {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"Search failed for {provider_name}: {e}")
        return []

def search(query: str) -> List[dict]:
    """Run search on every registered provider concurrently and merge with caching."""
    if not query or not query.strip():
        return []
    
    # Check cache first
    cached_results = search_cache.get(query)
    if cached_results is not None:
        logger.info(f"Cache hit for query: {query[:50]}... ({len(cached_results)} results)")
        return cached_results
    
    logger.info(f"Cache miss for query: {query[:50]}... Fetching from providers")
    
    if not _registry:
        return []
    
    # Use ThreadPoolExecutor for concurrent API calls
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(_registry)) as executor:
        # Submit all provider searches
        future_to_provider = {
            executor.submit(_search_provider, name, provider, query): name 
            for name, provider in _registry.items()
        }
        
        # Collect results as they complete
        all_results: List[dict] = []
        for future in concurrent.futures.as_completed(future_to_provider, timeout=20):
            provider_name = future_to_provider[future]
            try:
                provider_results = future.result()
                all_results.extend(provider_results)
            except Exception as e:
                logger.error(f"Error getting results from {provider_name}: {e}")
    
    logger.info(f"Total search results: {len(all_results)}")
    
    # Cache the results (only if we got some results)
    if all_results:
        search_cache.set(query, all_results, ttl=300)  # Cache for 5 minutes
        logger.info(f"Cached results for query: {query[:50]}...")
    
    return all_results


def detail(marketplace: str, product_id: str) -> dict:
    return _registry[marketplace]["detail"](product_id)
