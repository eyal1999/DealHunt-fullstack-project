# backend/app/routers/search.py
from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.providers import search as provider_search, detail as provider_detail
from app.models.models import SearchResponse, ProductDetail
from app.errors import AliexpressError, EbayError
from app.cache import failure_tracker
from app.services.hot_products_service import get_featured_deals, get_mixed_featured_deals

router = APIRouter(prefix="/search", tags=["Search"])

VALID_SORT = {"price_low", "price_high", "sold_high"}
VALID_MARKETPLACES = {"aliexpress", "ebay"}

def _sort_results(items: List[dict], mode: str) -> List[dict]:
    """Sort search results by the specified mode."""
    if mode == "price_low":
        return sorted(items, key=lambda x: x.get("sale_price", float("inf")))
    if mode == "price_high":
        return sorted(items, key=lambda x: x.get("sale_price", 0), reverse=True)
    if mode == "sold_high":
        return sorted(items, key=lambda x: x.get("sold_count") or 0, reverse=True)
    return items

def _paginate_results(items: List[dict], page: int, page_size: int) -> dict:
    """
    Paginate results and return pagination info.
    
    Args:
        items: List of all items
        page: Current page (1-based)
        page_size: Number of items per page
    
    Returns:
        Dictionary with paginated results and metadata
    """
    total_items = len(items)
    total_pages = (total_items + page_size - 1) // page_size  # Ceiling division
    
    # Ensure we don't go beyond available pages
    if page > total_pages and total_pages > 0:
        page = total_pages
    
    # Calculate start and end indices for current page
    start_index = (page - 1) * page_size
    end_index = min(start_index + page_size, total_items)  # Don't exceed total items
    
    # Get items for current page
    paginated_items = items[start_index:end_index]
    
    # For better UX, always assume more pages are available up to a reasonable limit
    # This creates a smooth infinite scroll experience
    max_supported_pages = 100  # Support up to 100 pages
    has_next = page < max_supported_pages and len(paginated_items) > 0
    
    # Since we fetch per-page from APIs, we don't know the total
    # We'll estimate based on current results
    estimated_total = page * page_size + (page_size if has_next else len(paginated_items))
    
    return {
        "items": paginated_items,
        "pagination": {
            "current_page": page,
            "page_size": page_size,
            "total_items": estimated_total,  # Estimated based on current page
            "total_pages": max_supported_pages,  # Maximum supported
            "has_next": has_next,
            "has_previous": page > 1,
            "items_on_page": len(paginated_items)
        }
    }

@router.get("/", response_model=SearchResponse)
def search_products(
    q: str = Query(..., min_length=1, description="Search query"),
    sort: str = Query("price_low", description="Sort order: price_low | price_high | sold_high"),
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page (1-200)"),
    min_price: float = Query(None, ge=0, description="Minimum price filter"),
    max_price: float = Query(None, ge=0, description="Maximum price filter"),
    aliexpress: bool = Query(True, description="Include AliExpress results"),
    ebay: bool = Query(True, description="Include eBay results")
):
    """Search for products across all supported marketplaces with pagination."""
    # Validate sort parameter
    if sort not in VALID_SORT:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid sort mode: {sort}. Valid options: {', '.join(VALID_SORT)}"
        )

    # Validate and sanitize query
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")
    
    query = q.strip()
    if len(query) > 200:  # Reasonable query length limit
        raise HTTPException(status_code=400, detail="Search query too long (max 200 characters)")
    
    # Validate price range
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=400, detail="Minimum price cannot be greater than maximum price")

    # Validate marketplace selection
    if not aliexpress and not ebay:
        raise HTTPException(status_code=400, detail="At least one marketplace must be selected")

    try:
        # Search across all providers with page-based loading and price filtering
        search_result = provider_search(query, page=page, min_price=min_price, max_price=max_price, 
                                        aliexpress=aliexpress, ebay=ebay)
        
        # Extract results and pagination state from the new response format
        if isinstance(search_result, dict):
            all_results = search_result.get("results", [])
            pagination_state = search_result.get("pagination_state", {})
        else:
            # Backward compatibility - treat as list of results
            all_results = search_result if isinstance(search_result, list) else []
            pagination_state = {}
        
        # Validate results structure
        if not isinstance(all_results, list):
            raise HTTPException(status_code=500, detail="Invalid search results format")
        
        # Sort all results first
        sorted_items = _sort_results(all_results, sort)
        
        # Apply pagination
        paginated_data = _paginate_results(sorted_items, page, page_size)
        
        # Enhanced pagination info with failure tracking
        pagination_info = paginated_data["pagination"]
        
        # Add failure tracking information from provider search
        if pagination_state:
            pagination_info.update({
                "end_of_results": pagination_state.get("end_of_results", False),
                "consecutive_failures": pagination_state.get("consecutive_failures", 0),
                "retry_suggested": pagination_state.get("retry_suggested", False),
                "failure_reason": pagination_state.get("failure_reason", None)
            })
            
            # If we've reached end of results, adjust has_next
            if pagination_state.get("end_of_results", False):
                pagination_info["has_next"] = False
        
        # Return response with enhanced pagination info
        return SearchResponse(
            query=query,
            results=paginated_data["items"],
            pagination=pagination_info
        )
        
    except AliexpressError as e:
        raise HTTPException(status_code=503, detail=f"AliExpress service error: {str(e)}")
    except EbayError as e:
        raise HTTPException(status_code=503, detail=f"eBay service error: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")
    except Exception as exc:
        import logging
        logging.error(f"Unexpected error in search_products: {exc}")
        raise HTTPException(
            status_code=500, 
            detail="Search service temporarily unavailable. Please try again later."
        )

@router.get("/detail/{marketplace}/{product_id}", response_model=ProductDetail)
def get_product_detail(
    marketplace: str,
    product_id: str
):
    """Get detailed information for a specific product."""
    # Validate marketplace
    if marketplace not in VALID_MARKETPLACES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid marketplace: {marketplace}. Valid options: {', '.join(VALID_MARKETPLACES)}"
        )
    
    # Validate product ID
    if not product_id or not product_id.strip():
        raise HTTPException(status_code=400, detail="Product ID cannot be empty")
    
    try:
        # Get product details from the provider
        product_detail = provider_detail(marketplace, product_id.strip())
        
        if not product_detail:
            raise HTTPException(
                status_code=404,
                detail=f"Product not found: {marketplace}/{product_id}"
            )
        
        return product_detail
        
    except AliexpressError as e:
        raise HTTPException(status_code=503, detail=f"AliExpress service error: {str(e)}")
    except EbayError as e:
        # For eBay products that can't be fetched, provide more helpful error message
        print(f"eBay detail failed for {marketplace}/{product_id}: {str(e)}")
        raise HTTPException(
            status_code=404, 
            detail=f"eBay product details unavailable. Product may have been removed or ID format changed."
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")
    except Exception as exc:
        import logging
        logging.error(f"Unexpected error in get_product_detail: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Product detail service temporarily unavailable. Please try again later."
        )

@router.post("/retry")
def retry_search(
    q: str = Query(..., min_length=1, description="Search query to retry"),
    page: int = Query(..., ge=1, description="Page number to retry"),
    min_price: float = Query(None, ge=0, description="Minimum price filter"),
    max_price: float = Query(None, ge=0, description="Maximum price filter"),
    aliexpress: bool = Query(True, description="Include AliExpress results"),
    ebay: bool = Query(True, description="Include eBay results")
):
    """Reset failure tracking for a specific search query and page, allowing pagination to continue."""
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")
    
    query = q.strip()
    
    # Create the same filters key used in provider search
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
    
    filters_key = f"{price_suffix}{marketplace_suffix}"
    
    # Clear failure tracking for this search
    failure_tracker.record_success(query, page, filters_key)
    
    return {
        "message": f"Failure tracking cleared for query '{query}' on page {page}",
        "query": query,
        "page": page,
        "filters": filters_key,
        "status": "ready_to_retry"
    }

@router.get("/featured-deals")
def get_featured_deals_endpoint(
    limit: int = Query(12, ge=1, le=50, description="Maximum number of featured deals to return"),
    page: int = Query(1, ge=1, le=10, description="Page number for pagination (1-10)"),
    marketplace: str = Query("mixed", description="Marketplace filter: 'mixed', 'aliexpress', or 'ebay'")
):
    """
    Get featured deals for homepage display with pagination support.
    Supports both AliExpress and eBay hot products with mixed display.
    
    Args:
        limit: Number of deals per page
        page: Page number for pagination
        marketplace: Which marketplace(s) to include
    
    Returns:
        List of featured deal products with pagination info
    """
    try:
        # Calculate offset for pagination
        offset = (page - 1) * limit
        
        # Determine which marketplace(s) to fetch from
        if marketplace.lower() == "aliexpress":
            deals = get_featured_deals(limit=limit)
            source = "AliExpress hot products"
        elif marketplace.lower() == "ebay":
            from app.services.ebay_hot_products_service import get_ebay_featured_deals
            deals = get_ebay_featured_deals(limit=limit)
            source = "eBay trending products"
        else:  # mixed (default)
            # For pagination with mixed results, we need to get more deals and slice
            total_needed = page * limit
            all_deals = get_mixed_featured_deals(limit=total_needed)
            deals = all_deals[offset:offset + limit] if len(all_deals) > offset else []
            source = "Mixed AliExpress + eBay hot products"
        
        # Add pagination metadata
        has_next_page = len(deals) == limit and page < 10  # Limit to 10 pages max
        
        if not deals:
            message = f"No more featured deals available" if page > 1 else "No featured deals available at the moment"
            return {
                "deals": [],
                "count": 0,
                "page": page,
                "limit": limit,
                "has_next_page": False,
                "marketplace": marketplace,
                "message": message
            }
        
        return {
            "deals": deals,
            "count": len(deals),
            "page": page,
            "limit": limit,
            "has_next_page": has_next_page,
            "marketplace": marketplace,
            "source": source,
            "message": f"Featured deals loaded successfully (page {page})"
        }
        
    except Exception as e:
        print(f"Error fetching featured deals: {e}")
        import traceback
        traceback.print_exc()
        
        # Don't fail the homepage, just return empty deals
        return {
            "deals": [],
            "count": 0,
            "page": page,
            "limit": limit,
            "has_next_page": False,
            "marketplace": marketplace,
            "message": "Featured deals temporarily unavailable"
        }