from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.providers import search as provider_search, detail as provider_detail
from app.models.models import SearchResponse, ProductDetail
from app.errors import AliexpressError, EbayError

router = APIRouter(prefix="/search", tags=["Search"])

VALID_SORT = {"price_low", "price_high"}
VALID_MARKETPLACES = {"aliexpress", "ebay"}

def _sort_results(items: List[dict], mode: str) -> List[dict]:
    """Sort search results by the specified mode."""
    if mode == "price_low":
        return sorted(items, key=lambda x: x.get("sale_price", float("inf")))
    if mode == "price_high":
        return sorted(items, key=lambda x: x.get("sale_price", 0), reverse=True)
    return items


@router.get("/", response_model=SearchResponse)
def search_products(
    q: str = Query(..., min_length=1, description="Search query"),
    sort: str = Query("price_low", description="Sort order: price_low | price_high"),
):
    """Search for products across all supported marketplaces."""
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
        # Search across all providers
        results = provider_search(query)
        
        # Validate results structure
        if not isinstance(results, list):
            raise HTTPException(status_code=500, detail="Invalid search results format")
        
        # Sort results
        sorted_items = _sort_results(results, sort)
        
        return SearchResponse(query=query, results=sorted_items)
        
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
def product_detail(marketplace: str, product_id: str):
    """Get detailed information for a specific product."""
    
    # Basic validation only
    if not marketplace or marketplace.lower() not in VALID_MARKETPLACES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid marketplace: {marketplace}. Valid options: {', '.join(VALID_MARKETPLACES)}"
        )
    
    # Normalize marketplace name
    marketplace = marketplace.lower()
    
    # Basic product ID validation - just check it's not empty
    if not product_id or not product_id.strip():
        raise HTTPException(status_code=400, detail="Product ID is required")
    
    product_id = product_id.strip()
    
    # REMOVED: Strict format validation - let the services handle their own validation
    # The services know better what constitutes a valid ID for their platform
    
    try:
        # Get product details from the appropriate provider
        product_data = provider_detail(marketplace, product_id)
        
        # Validate response structure
        if not product_data or not isinstance(product_data, dict):
            raise HTTPException(status_code=404, detail="Product not found")
        
        return product_data
        
    except AliexpressError as e:
        # Handle AliExpress-specific errors
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=f"Product not found on AliExpress")
        else:
            raise HTTPException(status_code=503, detail=f"AliExpress service error: {error_msg}")
            
    except EbayError as e:
        # Handle eBay-specific errors
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=f"Product not found on eBay")
        else:
            raise HTTPException(status_code=503, detail=f"eBay service error: {error_msg}")
            
    except KeyError as e:
        # Handle missing marketplace in provider registry
        raise HTTPException(
            status_code=400, 
            detail=f"Marketplace '{marketplace}' not supported"
        )
        
    except ValueError as e:
        # Handle input validation errors
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")
        
    except Exception as exc:
        # Log the actual error for debugging but don't expose internal details
        import logging
        logging.error(f"Unexpected error in product_detail for {marketplace}/{product_id}: {exc}")
        raise HTTPException(
            status_code=500, 
            detail="Product service temporarily unavailable. Please try again later."
        )