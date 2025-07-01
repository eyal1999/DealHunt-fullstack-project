# backend/app/routers/search.py
from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.providers import search as provider_search, detail as provider_detail
from app.models.models import SearchResponse, ProductDetail
from app.errors import AliexpressError, EbayError

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
    page_size: int = Query(50, ge=1, le=200, description="Items per page (1-200)")
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

    try:
        # Search across all providers with page-based loading
        all_results = provider_search(query, page=page)
        
        # Validate results structure
        if not isinstance(all_results, list):
            raise HTTPException(status_code=500, detail="Invalid search results format")
        
        # Sort all results first
        sorted_items = _sort_results(all_results, sort)
        
        # Apply pagination
        paginated_data = _paginate_results(sorted_items, page, page_size)
        
        # Return response with pagination info
        return SearchResponse(
            query=query,
            results=paginated_data["items"],
            pagination=paginated_data["pagination"]
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
        raise HTTPException(status_code=503, detail=f"eBay service error: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")
    except Exception as exc:
        import logging
        logging.error(f"Unexpected error in get_product_detail: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Product detail service temporarily unavailable. Please try again later."
        )