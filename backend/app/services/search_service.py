"""Service layer that talks to the AliExpress Affiliate API (sync)."""
from typing import List, Iterable
import requests

from app.config import settings
from app.core.utils import timestamp_shanghai, make_signature
from app.errors import AliexpressError
from app.models.models import ProductSummary, ProductDetail, PromotionLink

# ------------------------------------------------------------------ constants
_HEADERS = {"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"}
MAX_PRODUCTS_PER_PAGE = 50      # Increased from 12 to 50 for more results per search
MAX_AFFILIATE_LINKS_PER_CALL = 50  # AliExpress allows up to 50 URLs per affiliate link call

# Search configuration - easily adjustable
DEFAULT_MAX_PAGES = 2           # Default pages to fetch (2 × 50 = 100 products)
AGGRESSIVE_MAX_PAGES = 4        # For when we want more results (4 × 50 = 200 products)

# ------------------------------------------------------------------ helpers
def _base_params(method: str) -> dict[str, str]:
    """Set the common AliExpress param block."""
    return {
        "app_key": settings.app_key,
        "method": method,
        "sign_method": settings.sign_method,
        "timestamp": timestamp_shanghai(),
        "v": settings.v,
        "format": "json",
        "target_currency": settings.target_currency,
        "target_language": settings.target_language,
    }

# ---------------------------------------------------------------- affiliate links
def generate_affiliate_links(
    source_urls: Iterable[str],
    promotion_link_type: int = 0,
) -> List[PromotionLink]:
    """
    Turn one—or up to 12—AliExpress product URLs into affiliate links.
    Returns a list of PromotionLink Pydantic objects.
    """
    # FIX: Validate input
    if not source_urls:
        return []
        
    raw_values = [
        u if u.startswith("http")
        else f"https://www.aliexpress.com/item/{u}.html"
        for u in source_urls
        if u and u.strip()  # FIX: Filter out empty URLs
    ]
    
    if not raw_values:
        return []
        
    if len(raw_values) > MAX_AFFILIATE_LINKS_PER_CALL:
        raise ValueError(f"AliExpress allows max {MAX_AFFILIATE_LINKS_PER_CALL} URLs per call.")

    params = _base_params("aliexpress.affiliate.link.generate")
    params.update(
        {
            "promotion_link_type": promotion_link_type,
            "source_values": ",".join(raw_values),
            "tracking_id": settings.tracking_id,
        }
    )
    params["sign"] = make_signature(params, settings.app_secret)

    try:
        resp = requests.post(settings.base_url, data=params, headers=_HEADERS, timeout=(3, 20))
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        # FIX: Handle network errors gracefully
        print(f"Failed to generate affiliate links: {e}")
        return []  # Return empty list instead of crashing

    wrapper = resp.json().get("aliexpress_affiliate_link_generate_response", {})
    block = wrapper.get("resp_result", {})
    
    if block.get("resp_code") != 200:
        # FIX: Don't crash on API errors, just return empty list
        print(f"Link-gen API error {block.get('resp_code')}: {block.get('resp_msg')}")
        return []

    links_raw = (
        block.get("result", {})
        .get("promotion_links", {})
        .get("promotion_link", [])
    )
    
    promo_links: List[PromotionLink] = []
    for raw in links_raw:
        try:
            source_value = raw.get("source_value", "")
            promotion_link = raw.get("promotion_link", "")
            
            # FIX: Validate URLs before creating PromotionLink
            if source_value and promotion_link:
                promo_links.append(
                    PromotionLink(
                        source_value=source_value,
                        promotion_link=promotion_link,
                    )
                )
        except Exception as e:
            # FIX: Log specific errors for debugging
            print(f"Failed to create PromotionLink from {raw}: {e}")
            continue

    return promo_links


def generate_affiliate_links_batch(source_urls: List[str]) -> List[PromotionLink]:
    """
    Generate affiliate links for a large number of URLs by batching them.
    
    AliExpress allows max 50 URLs per call, so this function automatically
    splits larger lists into batches and combines the results.
    
    Args:
        source_urls: List of product URLs to convert to affiliate links
        
    Returns:
        List of PromotionLink objects for all URLs
    """
    if not source_urls:
        return []
    
    all_links = []
    batch_size = MAX_AFFILIATE_LINKS_PER_CALL  # 50
    
    # Process URLs in batches of 50
    for i in range(0, len(source_urls), batch_size):
        batch = source_urls[i:i + batch_size]
        print(f"🔗 Generating affiliate links for batch {i//batch_size + 1}: {len(batch)} URLs")
        
        try:
            links = generate_affiliate_links(batch)
            all_links.extend(links)
            print(f"✅ Generated {len(links)} affiliate links for batch {i//batch_size + 1}")
        except Exception as e:
            print(f"❌ Failed to generate affiliate links for batch {i//batch_size + 1}: {e}")
            # Continue with other batches even if one fails
            continue
    
    print(f"🎉 Total affiliate links generated: {len(all_links)} out of {len(source_urls)} URLs")
    return all_links

# ---------------------------------------------------------------- search
def search_products(query: str, page_no: int = 1, page_size: int = None) -> List[dict]:
    """Return a list of ProductSummary dicts sorted by recent sales volume.
    
    Args:
        query: Search keywords
        page_no: Page number (1-based)
        page_size: Number of products per page (max 50)
    """
    if page_size is None:
        page_size = MAX_PRODUCTS_PER_PAGE
    
    # Ensure page_size doesn't exceed our maximum
    page_size = min(page_size, MAX_PRODUCTS_PER_PAGE)
    
    params = _base_params("aliexpress.affiliate.product.query")
    params.update(
        {
            "keywords": query,
            "page_no": page_no,
            "page_size": page_size,
            "sort": "LAST_VOLUME_DESC",
            "tracking_id": settings.tracking_id,
        }
    )
    params["sign"] = make_signature(params, settings.app_secret)

    resp = requests.post(settings.base_url, data=params, headers=_HEADERS, timeout=(15, 30))
    resp.raise_for_status()

    data = (
        resp.json()
        .get("aliexpress_affiliate_product_query_response", {})
        .get("resp_result", {})
    )
    if data.get("resp_code") != 200:
        raise AliexpressError(data.get("resp_msg", "Unknown error"))

    products = data.get("result", {}).get("products", {}).get("product", [])
    
    # FIX: Handle empty products list
    if not products:
        return []
        
    detail_urls = [p["product_detail_url"] for p in products if p.get("product_detail_url")]

    # Use batched affiliate link generation for better handling of larger result sets
    links = generate_affiliate_links_batch(detail_urls)
    link_map = {l.source_value: l.promotion_link for l in links}

    summaries = []
    for p in products:
        try:
            # FIX: Validate required fields and safe type conversions
            product_id = str(p.get("product_id", ""))
            if not product_id:
                continue
                
            title = p.get("product_title", "Unknown Product")
            detail_url = p.get("product_detail_url", "")
            main_image = p.get("product_main_image_url", "")
            
            # Safe price conversions
            try:
                original_price = float(p.get("original_price", 0))
            except (ValueError, TypeError):
                original_price = 0.0
                
            try:
                sale_price = float(p.get("sale_price", 0))
            except (ValueError, TypeError):
                sale_price = original_price
                
            # Safe sold count conversion
            try:
                sold_count = int(p.get("lastest_volume", 0))
            except (ValueError, TypeError):
                sold_count = 0

            summary = ProductSummary(
                product_id=product_id,
                title=title,
                original_price=original_price,
                sale_price=sale_price,
                image=main_image,
                detail_url=detail_url,
                affiliate_link=link_map.get(detail_url, detail_url),
                marketplace="aliexpress",
                sold_count=sold_count, 
            ).dict()
            
            summaries.append(summary)
            
        except Exception as e:
            print(f"Error processing product {p.get('product_id', 'unknown')}: {e}")
            continue
            
    return summaries


def search_products_multi_page(query: str, max_pages: int = None, page_size: int = None) -> List[dict]:
    """Search for products across multiple pages to get more results.
    
    Args:
        query: Search keywords
        max_pages: Maximum number of pages to fetch (default: 2 for 100 total results)
        page_size: Number of products per page (max 50)
    
    Returns:
        List of ProductSummary dicts from all pages combined
    """
    if max_pages is None:
        max_pages = DEFAULT_MAX_PAGES
    
    if page_size is None:
        page_size = MAX_PRODUCTS_PER_PAGE
    
    all_products = []
    
    for page in range(1, max_pages + 1):
        try:
            print(f"📄 Fetching page {page} of {max_pages} for query: '{query}'")
            products = search_products(query, page_no=page, page_size=page_size)
            
            if not products:
                print(f"✅ No more results found on page {page}, stopping pagination")
                break
                
            all_products.extend(products)
            print(f"✅ Page {page}: Found {len(products)} products (Total: {len(all_products)})")
            
        except Exception as e:
            print(f"❌ Error fetching page {page}: {e}")
            # Continue with other pages even if one fails
            continue
    
    print(f"🎉 Multi-page search completed: {len(all_products)} total products found")
    return all_products

# ---------------------------------------------------------------- product detail
def fetch_product_detail(product_id: str) -> dict:
    """Return a single ProductDetail dict with an affiliate link."""
    if not product_id or not str(product_id).strip():
        raise AliexpressError("Product ID is required")
        
    params = _base_params("aliexpress.affiliate.productdetail.get")
    params.update(
        {
            "product_ids": str(product_id),
            "tracking_id": settings.tracking_id,
        }
    )
    params["sign"] = make_signature(params, settings.app_secret)

    resp = requests.post(settings.base_url, data=params, headers=_HEADERS, timeout=(15, 30))
    resp.raise_for_status()

    data = (
        resp.json()
        .get("aliexpress_affiliate_productdetail_get_response", {})
        .get("resp_result", {})
    )
    if data.get("resp_code") != 200:
        raise AliexpressError(data.get("resp_msg", "Unknown error"))

    # FIX: Add proper validation for products array
    products = data.get("result", {}).get("products", {}).get("product", [])
    if not products or len(products) == 0:
        raise AliexpressError(f"Product {product_id} not found")
    
    item = products[0]
    
    # FIX: Validate required fields exist
    required_fields = ["product_id", "product_title", "original_price", "sale_price", "product_detail_url"]
    for field in required_fields:
        if not item.get(field):
            raise AliexpressError(f"Missing required field: {field}")

    # FIX: Safe affiliate link generation
    try:
        links = generate_affiliate_links([item["product_detail_url"]])
        affiliate_url = links[0].promotion_link if links and len(links) > 0 else item["product_detail_url"]
    except Exception as e:
        # Fallback to original URL if affiliate generation fails
        print(f"Failed to generate affiliate link: {e}")
        affiliate_url = item["product_detail_url"]

    # Extract shop/seller information for AliExpress
    seller_info = {
        "shop_name": item.get("shop_name", ""),
        "shop_url": item.get("shop_url", ""),
        "shop_id": item.get("shop_id", ""),
        "evaluate_rate": item.get("evaluate_rate", ""),
    }

    # Extract category information
    categories = {
        "first_level": item.get("first_level_category_name", ""),
        "second_level": item.get("second_level_category_name", ""),
        "first_level_id": item.get("first_level_category_id", ""),
        "second_level_id": item.get("second_level_category_id", ""),
    }

    # FIX: Complete image processing logic
    all_images = []
    
    # Add main image if exists
    main_image = item.get("product_main_image_url", "")
    if main_image:
        all_images.append(main_image)
    
    # Add images from image_urls (detailed product images)
    image_urls = item.get("image_urls", {}).get("string", [])
    if isinstance(image_urls, list):
        all_images.extend(image_urls)  # FIX: This was truncated before
    
    # Add small images if available and different
    small_image_urls = item.get("product_small_image_urls", {}).get("string", [])
    if isinstance(small_image_urls, list):
        for img in small_image_urls:
            if img and img not in all_images:
                all_images.append(img)
    
    # Remove duplicates while preserving order and filter out empty strings
    all_images = list(dict.fromkeys([img for img in all_images if img and img.strip()]))

    # FIX: Safe discount percentage extraction
    discount_str = item.get("discount", "0%")
    try:
        if isinstance(discount_str, str) and "%" in discount_str:
            discount_percent = float(discount_str.replace("%", ""))
        else:
            discount_percent = float(discount_str) if discount_str else 0
    except (ValueError, TypeError):
        discount_percent = 0

    # FIX: Safe rating calculation
    rating = None
    eval_rate_str = item.get("evaluate_rate", "")
    if eval_rate_str:
        try:
            if isinstance(eval_rate_str, str) and "%" in eval_rate_str:
                eval_rate = float(eval_rate_str.replace("%", ""))
            else:
                eval_rate = float(eval_rate_str)
            
            if 0 <= eval_rate <= 100:
                # Convert percentage to 5-star scale (86.2% = ~4.3 stars)
                rating = round((eval_rate / 100) * 5, 1)
        except (ValueError, TypeError):
            rating = None

    # FIX: Safe type conversions
    try:
        original_price = float(item.get("original_price", 0))
    except (ValueError, TypeError):
        original_price = 0.0
        
    try:
        sale_price = float(item.get("sale_price", 0))
    except (ValueError, TypeError):
        sale_price = original_price  # Fallback to original price
        
    try:
        sold_count = int(item.get("lastest_volume", 0))
    except (ValueError, TypeError):
        sold_count = 0

    return ProductDetail(
        product_id=str(item["product_id"]),
        title=item.get("product_title", "Unknown Product"),
        original_price=original_price,
        sale_price=sale_price,
        main_image=main_image or "https://via.placeholder.com/400x300?text=No+Image",
        images=all_images or ["https://via.placeholder.com/400x300?text=No+Image"],
        url=item["product_detail_url"],
        affiliate_link=affiliate_url,
        marketplace="aliexpress",
        sold_count=sold_count,
        rating=rating,
        
        # Enhanced AliExpress-specific fields
        description=None,
        condition="New",
        brand=None,
        color=None,
        material=None,
        
        # AliExpress seller info (shop-based)
        seller=seller_info,
        
        # Location info (AliExpress is primarily China-based)
        location={"country": "China", "city": "", "state": ""},
        
        # Shipping info (basic for AliExpress)
        shipping=[{
            "service": "Standard Shipping",
            "cost": 0,
            "currency": "USD"
        }],
        
        # Product specifications
        specifications={
            "Category": categories.get("first_level", ""),
            "Subcategory": categories.get("second_level", ""),
            "Marketplace": "AliExpress",
            "Product ID": str(item["product_id"]),
            "Discount": f"{discount_percent}%" if discount_percent > 0 else "No discount"
        },
        
        # Return policy (generic for AliExpress)
        return_policy={
            "returns_accepted": True,
            "return_period": "15 days",
            "return_method": "Buyer protection"
        },
        
        # Additional metadata
        item_creation_date=None,
        top_rated_seller=False,
        
        # AliExpress-specific additional fields
        product_video_url=item.get("product_video_url", ""),
        categories=categories,
        discount_percentage=discount_percent,
        commission_rate=item.get("commission_rate", ""),
    ).dict()