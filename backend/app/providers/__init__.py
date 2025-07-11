"""
Provider registry – gives services a single import target.

Example:
    from app.providers import search, detail

    results = search("laptop stand")
"""
from importlib import import_module
from typing import Callable, Dict, List, Any
import asyncio
import concurrent.futures
import logging
from app.cache import search_cache, failure_tracker

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

def search(query: str, page: int = 1, min_price: float = None, max_price: float = None, 
           aliexpress: bool = True, ebay: bool = True) -> Dict[str, Any]:
    """Run search on selected providers concurrently for a specific page with optional price filtering.
    
    Returns:
        Dictionary with 'results' and 'pagination_state' keys
    """
    if not query or not query.strip():
        return {"results": [], "pagination_state": {"end_of_results": False, "consecutive_failures": 0}}
    
    # Filter providers based on marketplace selection
    selected_providers = {}
    if aliexpress and "aliexpress" in _registry:
        selected_providers["aliexpress"] = _registry["aliexpress"]
    if ebay and "ebay" in _registry:
        selected_providers["ebay"] = _registry["ebay"]
    
    if not selected_providers:
        return {"results": [], "pagination_state": {"end_of_results": False, "consecutive_failures": 0}}
    
    # Create cache key with page number, price range, and marketplaces
    price_suffix = ""
    if min_price is not None or max_price is not None:
        price_suffix = f":price:{min_price or 0}-{max_price or 'inf'}"
    
    marketplace_suffix = ""
    marketplaces = []
    if aliexpress:
        marketplaces.append("ae")
    if ebay:
        marketplaces.append("eb")
    if marketplaces:
        marketplace_suffix = f":markets:{''.join(marketplaces)}"
    
    cache_key = f"{query}:page:{page}{price_suffix}{marketplace_suffix}"
    filters_key = f"{price_suffix}{marketplace_suffix}"
    
    # Check if we should stop pagination due to consecutive failures
    failure_count = failure_tracker.get_failure_count(query, page, filters_key)
    if failure_tracker.should_stop_pagination(query, page, filters_key):
        logger.info(f"Stopping pagination for query: {query[:50]}... page: {page} due to {failure_count} consecutive failures")
        return {
            "results": [],
            "pagination_state": {
                "end_of_results": True,
                "consecutive_failures": failure_count,
                "retry_suggested": True
            }
        }
    
    # Check cache first
    cached_results = search_cache.get(cache_key)
    if cached_results is not None:
        logger.info(f"Cache hit for query: {query[:50]}... page: {page} ({len(cached_results)} results)")
        failure_tracker.record_success(query, page, filters_key)  # Cache hit is a success
        return {
            "results": cached_results,
            "pagination_state": {
                "end_of_results": False,
                "consecutive_failures": 0,
                "retry_suggested": False
            }
        }
    
    logger.info(f"Cache miss for query: {query[:50]}... page: {page} - Fetching from providers")
    
    # Use ThreadPoolExecutor for concurrent API calls
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(selected_providers)) as executor:
        # Submit provider searches for the specific page with price filtering
        future_to_provider = {
            executor.submit(_search_provider, name, provider, query, page, min_price, max_price): name 
            for name, provider in selected_providers.items()
        }
        
        # Collect results as they complete
        all_results: List[dict] = []
        providers_attempted = 0
        providers_with_raw_results = 0
        
        for future in concurrent.futures.as_completed(future_to_provider, timeout=20):  # Reduced timeout for single page
            provider_name = future_to_provider[future]
            providers_attempted += 1
            try:
                provider_results = future.result()
                if provider_results:  # Count providers that returned something before filtering
                    providers_with_raw_results += 1
                all_results.extend(provider_results)
            except Exception as e:
                logger.error(f"Error getting results from {provider_name}: {e}")
    
    logger.info(f"Total search results for page {page}: {len(all_results)}")
    
    # Enhanced failure detection logic
    # Consider it a failure if we get 0 results in any of these cases:
    # 1. No results at all from any provider
    # 2. Any page returns 0 results (indicates end of available data or restrictive filters)
    # 3. High page numbers (>20) that likely exceed natural data limits
    
    has_active_filters = min_price is not None or max_price is not None
    is_early_page = page <= 3  # Only first 3 pages are considered "early" for filter detection
    is_very_high_page = page > 20  # Pages beyond 20 are likely beyond natural limits
    
    # Enhanced failure detection: 0 results OR suspiciously high page numbers
    is_effective_failure = (
        len(all_results) == 0 or 
        (is_very_high_page and has_active_filters)  # High page + filters = likely beyond real data
    )
    
    if all_results and not is_effective_failure:
        # Success - reset failure count and cache results
        failure_tracker.record_success(query, page, filters_key)
        search_cache.set(cache_key, all_results, ttl=300)  # Cache for 5 minutes per page
        logger.info(f"Cached results for query: {query[:50]}... page: {page}")
        
        return {
            "results": all_results,
            "pagination_state": {
                "end_of_results": False,
                "consecutive_failures": 0,
                "retry_suggested": False
            }
        }
    else:
        # Failure - record failure and return appropriate state
        new_failure_count = failure_tracker.record_failure(query, page, filters_key)
        
        # Create appropriate failure message based on context
        if has_active_filters and is_early_page:
            # Early pages with filters likely indicate restrictive criteria
            if max_price is not None:
                failure_reason = f"No results found within ${max_price} price range. Try increasing the maximum price or removing filters."
            elif min_price is not None:
                failure_reason = f"No results found above ${min_price} price range. Try decreasing the minimum price or removing filters."
            else:
                failure_reason = f"No results found with current filters. Try relaxing the filter criteria."
        elif is_very_high_page and has_active_filters:
            # Very high page numbers with filters = beyond realistic data
            failure_reason = f"You've reached the end of available results (page {page}). All matching products have been shown."
        elif page > 3:
            # Later pages with no results likely indicate end of available data
            if has_active_filters:
                failure_reason = f"Reached end of available results for your search criteria. Try broadening your filters for more results."
            else:
                failure_reason = f"Reached end of available results for this search."
        else:
            # General failure message
            failure_reason = f"No results found from product sources"
        
        logger.warning(f"{failure_reason} for query: {query[:50]}... page: {page} (failure #{new_failure_count})")
        
        # Check if we've hit the failure threshold
        if new_failure_count >= failure_tracker.max_failures:
            return {
                "results": [],
                "pagination_state": {
                    "end_of_results": True,
                    "consecutive_failures": new_failure_count,
                    "retry_suggested": True,
                    "failure_reason": failure_reason
                }
            }
        else:
            return {
                "results": [],
                "pagination_state": {
                    "end_of_results": False,
                    "consecutive_failures": new_failure_count,
                    "retry_suggested": False,
                    "failure_reason": failure_reason
                }
            }


def detail(marketplace: str, product_id: str) -> dict:
    return _registry[marketplace]["detail"](product_id)
