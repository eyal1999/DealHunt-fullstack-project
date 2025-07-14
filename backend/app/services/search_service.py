"""Service layer that talks to the AliExpress Affiliate API (sync)."""
from typing import List, Iterable, Optional
import requests
import re
from bs4 import BeautifulSoup
import time
import urllib.parse

from app.config import settings
from app.core.utils import timestamp_shanghai, make_signature
from app.errors import AliexpressError
from app.models.models import ProductSummary, ProductDetail, PromotionLink

# ------------------------------------------------------------------ constants
_HEADERS = {"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"}
MAX_PRODUCTS_PER_PAGE = 50      # AliExpress API supports up to 50 products per call
MAX_AFFILIATE_LINKS_PER_CALL = 50  # AliExpress allows up to 50 URLs per affiliate link call

# Search configuration - single page fetching for on-demand loading
DEFAULT_MAX_PAGES = 1           # Default: fetch one page at a time
AGGRESSIVE_MAX_PAGES = 3        # For testing: fetch up to 3 pages

# Web scraping headers to mimic a real browser
SCRAPING_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

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

def _extract_description_from_page(product_url: str) -> Optional[str]:
    """
    Fallback function to extract product description by scraping the AliExpress product page.
    
    Args:
        product_url: The AliExpress product page URL
        
    Returns:
        Extracted description text or None if extraction fails
    """
    try:
        print(f"🔍 Attempting to scrape description from: {product_url}")
        
        # Add a small delay to be respectful to the server
        time.sleep(1)
        
        response = requests.get(product_url, headers=SCRAPING_HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Try multiple selectors for different AliExpress page layouts
        description_selectors = [
            # Modern AliExpress layout
            '[data-pl="product-description"]',
            '.product-description',
            '.pdp-product-description',
            '.product-overview',
            
            # Older layouts
            '#j-product-info-sku .sku-property-text',
            '.product-property-list',
            '.product-params',
            
            # Description sections
            '.description-content',
            '.product-detail-desc',
            '.detail-desc-decorate-richtext',
            
            # Fallback to any text content in description areas
            '[class*="description"]',
            '[class*="detail"]',
            '[id*="description"]'
        ]
        
        description_text = ""
        
        for selector in description_selectors:
            elements = soup.select(selector)
            if elements:
                # Extract text from all matching elements
                texts = []
                for element in elements:
                    text = element.get_text(strip=True, separator=' ')
                    if text and len(text) > 20:  # Only meaningful text
                        texts.append(text)
                
                if texts:
                    description_text = ' '.join(texts)
                    break
        
        # If no specific description found, try to extract from meta tags
        if not description_text:
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                description_text = meta_desc.get('content')
        
        # Clean up the description
        if description_text:
            # Remove excessive whitespace and normalize
            description_text = re.sub(r'\s+', ' ', description_text).strip()
            
            # Truncate if too long (keep reasonable length)
            if len(description_text) > 1000:
                description_text = description_text[:1000] + "..."
            
            print(f"✅ Successfully extracted description ({len(description_text)} chars)")
            return description_text
        
        print("⚠️ No description found using any selector")
        return None
        
    except requests.RequestException as e:
        print(f"❌ Network error while scraping description: {e}")
        return None
    except Exception as e:
        print(f"❌ Error extracting description: {e}")
        return None

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
        
        try:
            links = generate_affiliate_links(batch)
            all_links.extend(links)
        except Exception as e:
            # Continue with other batches even if one fails
            continue
    return all_links

# ---------------------------------------------------------------- search
def search_products(query: str, page_no: int = 1, page_size: int = None, min_price: float = None, max_price: float = None) -> List[dict]:
    """Return a list of ProductSummary dicts sorted by recent sales volume.
    
    Args:
        query: Search keywords
        page_no: Page number (1-based)
        page_size: Number of products per page (max 50)
        min_price: Minimum price filter in USD
        max_price: Maximum price filter in USD
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
    
    # Add price filtering parameters if provided
    # AliExpress API expects prices in cents
    if min_price is not None:
        params["min_sale_price"] = int(min_price * 100)  # Convert dollars to cents
        print(f"🔍 AliExpress API: Adding min_sale_price={params['min_sale_price']} cents (${min_price})")
    if max_price is not None:
        params["max_sale_price"] = int(max_price * 100)  # Convert dollars to cents
        print(f"🔍 AliExpress API: Adding max_sale_price={params['max_sale_price']} cents (${max_price})")
    
    params["sign"] = make_signature(params, settings.app_secret)

    resp = requests.post(settings.base_url, data=params, headers=_HEADERS, timeout=(5, 15))
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
            raw_product_id = p.get("product_id", "")
            product_id = str(raw_product_id).strip()
            
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
            
            # Extract rating - try multiple possible field names from AliExpress API
            rating = None
            rating_fields = [
                "evaluate_rate", "avg_rating", "rating", "star_rating", 
                "product_rating", "average_star", "evaluation_rate"
            ]
            
            # DEBUG: Log available fields including shipping (development only)
            # if len(summaries) < 1:  # Only log for first item
            #     available_fields = list(p.keys())
            #     print(f"🔍 AliExpress search API fields: {available_fields}")
            #     
            #     # Check for any shipping-related fields
            #     shipping_fields = ["freight", "ship_from_country", "delivery_time", "shipping_cost", 
            #                      "free_shipping", "warehouse", "logistic_info", "shipping_template_id"]
            #     found_shipping = {f: p.get(f) for f in shipping_fields if f in p}
            #     if found_shipping:
            #         print(f"🚢 Search API shipping fields: {found_shipping}")
                
            for field in rating_fields:
                if field in p and p[field] is not None:
                    try:
                        # Handle string values that might contain percentages or other formatting
                        raw_value = str(p[field]).strip()
                        
                        # Remove percentage sign if present
                        if raw_value.endswith('%'):
                            raw_value = raw_value[:-1]
                        
                        # Remove any other non-numeric characters except decimal point
                        import re
                        numeric_value = re.sub(r'[^\d.]', '', raw_value)
                        
                        if not numeric_value:
                            continue
                            
                        rating_value = float(numeric_value)
                        # print(f"✅ Found AliExpress rating: {field} = {rating_value} (original: {p[field]})")
                        
                        # AliExpress ratings might be in different scales
                        if field == "evaluate_rate" and rating_value > 5:
                            # evaluate_rate is usually a percentage (0-100), convert to 5-star scale
                            rating = (rating_value / 100) * 5
                            # print(f"🔄 Converted {rating_value}% to {rating} stars")
                        elif rating_value > 5:
                            # If rating is out of 100, convert to 5-star scale
                            rating = (rating_value / 100) * 5
                            # print(f"🔄 Converted {rating_value}% to {rating} stars")
                        elif rating_value > 0:
                            # Assume it's already in 5-star scale
                            rating = rating_value
                            # print(f"✅ Using rating as-is: {rating} stars")
                        
                        # Ensure rating is within valid range (0-5)
                        if 0 <= rating <= 5:
                            break
                        else:
                            rating = None
                            # print(f"❌ Rating {rating_value} out of valid range")
                    except (ValueError, TypeError) as e:
                        # print(f"❌ Error converting {field}={p[field]} to float: {e}")
                        continue

            # Extract shipping cost for product summary
            shipping_info = extract_shipping_info(p, "US")
            shipping_cost = None
            if shipping_info:
                try:
                    shipping_cost = float(shipping_info[0]["cost"])
                except (ValueError, TypeError, KeyError):
                    shipping_cost = None
            
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
                rating=rating,
                shipping_cost=shipping_cost,
            ).dict()
            
            summaries.append(summary)
            
        except Exception as e:
            print(f"Error processing product {p.get('product_id', 'unknown')}: {e}")
            continue
            
    return summaries


def search_products_multi_page(query: str, max_pages: int = None, page_size: int = None, min_price: float = None, max_price: float = None) -> List[dict]:
    """Search for products across multiple pages to get thousands of results.
    
    Args:
        query: Search keywords
        max_pages: Maximum number of pages to fetch (default: 25 for ~300 total results)
        page_size: Number of products per page (AliExpress limit: 12)
        min_price: Minimum price filter in USD
        max_price: Maximum price filter in USD
    
    Returns:
        List of ProductSummary dicts from all pages combined
    """
    if max_pages is None:
        max_pages = DEFAULT_MAX_PAGES
    
    if page_size is None:
        page_size = MAX_PRODUCTS_PER_PAGE
    
    # Cap the maximum pages to prevent excessive API calls
    max_pages = min(max_pages, AGGRESSIVE_MAX_PAGES)
    
    all_products = []
    consecutive_empty_pages = 0
    
    print(f"🔍 Starting multi-page search for '{query}' - fetching up to {max_pages} pages")
    
    for page in range(1, max_pages + 1):
        try:
            # Add small delay between requests to be respectful
            if page > 1:
                time.sleep(0.1)  # 100ms delay between requests
            
            products = search_products(query, page_no=page, page_size=page_size, min_price=min_price, max_price=max_price)
            
            if not products:
                consecutive_empty_pages += 1
                print(f"📭 Page {page}: No products found (consecutive empty: {consecutive_empty_pages})")
                
                # Stop if we get 3 consecutive empty pages
                if consecutive_empty_pages >= 3:
                    print(f"🛑 Stopping search after {consecutive_empty_pages} consecutive empty pages")
                    break
                continue
            else:
                consecutive_empty_pages = 0  # Reset counter
                
            print(f"📦 Page {page}: Found {len(products)} products")
            all_products.extend(products)
            
        except Exception as e:
            print(f"❌ Error fetching page {page}: {e}")
            consecutive_empty_pages += 1
            
            # Stop if we get too many errors
            if consecutive_empty_pages >= 5:
                print(f"🛑 Stopping search after {consecutive_empty_pages} consecutive failures")
                break
            continue
    
    print(f"✅ Multi-page search completed: {len(all_products)} total products from {query}")
    return all_products

# ---------------------------------------------------------------- product detail
def fetch_product_detail(product_id: str) -> dict:
    """Return a single ProductDetail dict with an affiliate link."""
    if not product_id or not str(product_id).strip():
        raise AliexpressError("Product ID is required")
    
    clean_product_id = str(product_id).strip()
    
    params = _base_params("aliexpress.affiliate.productdetail.get")
    params.update(
        {
            "product_ids": clean_product_id,
            "tracking_id": settings.tracking_id,
            "fields": "product_id,product_title,original_price,sale_price,product_detail_url,product_main_image_url,product_small_image_urls,shop_name,shop_url,evaluate_rate,first_level_category_name,second_level_category_name,commission_rate,discount,description,product_video_url,promotion_link,ship_to_country,package_info,freight,ship_from_country,delivery_time,shipping_cost,free_shipping,warehouse,logistic_info,shipping_template_id,sku_props,product_weight,product_length,product_width,product_height,package_length,package_width,package_height,package_weight,volume_weight,logistics_info,freight_template_id,freight_template,logistics_price,shipping_info,delivery_info,dispatch_time,shipping_methods",
            "ship_to_country": "US",
        }
    )
    params["sign"] = make_signature(params, settings.app_secret)

    try:
        resp = requests.post(settings.base_url, data=params, headers=_HEADERS, timeout=(5, 15))
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise AliexpressError(f"Failed to fetch product details: {str(e)}")

    try:
        json_response = resp.json()
        data = (
            json_response
            .get("aliexpress_affiliate_productdetail_get_response", {})
            .get("resp_result", {})
        )
        
        if data.get("resp_code") != 200:
            raise AliexpressError(data.get("resp_msg", "Unknown error"))
            
    except ValueError as e:
        raise AliexpressError(f"Invalid JSON response from AliExpress API")

    # FIX: Add proper validation for products array
    result = data.get("result", {})
    products_data = result.get("products", {})
    products = products_data.get("product", []) if isinstance(products_data, dict) else []
    
    if not products or len(products) == 0:
        raise AliexpressError(f"Product {product_id} not found")
    
    item = products[0]
    
    # Check for shipping-related fields (for future reference if API changes)
    shipping_fields = ["freight", "ship_from_country", "delivery_time", "shipping_cost", 
                      "free_shipping", "warehouse", "logistic_info", "shipping_template_id", 
                      "package_info", "ship_to_country"]
    available_shipping_fields = {field: item.get(field) for field in shipping_fields if field in item}
    
    # Note: As of 2025, AliExpress Affiliate API does not provide shipping cost data
    # even with Advanced API and SKU Dimension API permissions
    
    description_field = item.get("description")
    
    # Try to get description from API, fallback to web scraping if not available
    product_description = None
    if description_field and str(description_field).strip() and str(description_field).strip().lower() != 'none':
        product_description = str(description_field).strip()
        pass  # Successfully got description from API
    else:
        # Description not available in API, attempt web scraping fallback
        product_url = item.get("product_detail_url", "")
        if product_url:
            product_description = _extract_description_from_page(product_url)
        
        if not product_description:
            # Use a generic description based on product title
            product_title = item.get("product_title", "Product")
            product_description = f"High-quality {product_title.lower()} available on AliExpress. Check product page for detailed specifications and features."
    
    # FIX: Validate required fields exist
    required_fields = ["product_id", "product_title", "original_price", "sale_price", "product_detail_url"]
    for field in required_fields:
        field_value = item.get(field)
        if not field_value:
            raise AliexpressError(f"Missing required field: {field}")

    # FIX: Safe affiliate link generation - use existing promotion_link if available
    if item.get("promotion_link"):
        affiliate_url = item["promotion_link"]
    else:
        # Try to generate affiliate link if promotion_link not available
        try:
            links = generate_affiliate_links([item["product_detail_url"]])
            affiliate_url = links[0].promotion_link if links and len(links) > 0 else item["product_detail_url"]
        except Exception as e:
            # Fallback to original URL if affiliate generation fails
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

    try:
        product_detail = ProductDetail(
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
        description=product_description,
        condition="New",
        brand=None,
        color=None,
        material=None,
        
        # AliExpress seller info (shop-based)
        seller=seller_info,
        
        # Location info (AliExpress is primarily China-based)
        location={"country": "China", "city": "", "state": ""},
        
        # Shipping info (extracted from AliExpress data)
        shipping=extract_shipping_info(item, "US"),
        
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
    )
        return product_detail.dict()
    
    except Exception as e:
        raise AliexpressError(f"Failed to process product data: {str(e)}")


# Note: SKU Dimension API testing was attempted but confirmed that
# AliExpress does not provide shipping cost data through any affiliate API endpoints
# as of 2025, even with Advanced API and SKU Dimension API permissions.


def extract_shipping_info(item: dict, ship_to_country: str = "US") -> list:
    """Extract shipping information from AliExpress product data with intelligent fallbacks."""
    shipping_options = []
    
    # Check for shipping-related fields in API response first
    if item.get("free_shipping") is True:
        shipping_options.append({
            "service": "Free Shipping",
            "cost": "0",
            "currency": "USD",
            "estimated_delivery": item.get("delivery_time", "15-45 business days")
        })
        return shipping_options
    
    # Check for actual shipping cost fields
    if item.get("freight") is not None:
        shipping_options.append({
            "service": "Standard Shipping",
            "cost": str(item.get("freight", "0")),
            "currency": item.get("freight_currency", "USD"),
            "estimated_delivery": item.get("delivery_time", "15-45 business days")
        })
    
    if item.get("shipping_cost") is not None:
        shipping_options.append({
            "service": "Standard Shipping", 
            "cost": str(item.get("shipping_cost", "0")),
            "currency": "USD",
            "estimated_delivery": item.get("delivery_time", "15-45 business days")
        })
    
    # Check for new shipping fields with advanced API permissions
    if item.get("logistics_price") is not None:
        shipping_options.append({
            "service": "Logistics Shipping",
            "cost": str(item.get("logistics_price", "0")),
            "currency": "USD",
            "estimated_delivery": item.get("dispatch_time", "15-45 business days")
        })
    
    # Check shipping_info field (might be available with advanced permissions)
    if item.get("shipping_info"):
        try:
            shipping_info = item.get("shipping_info")
            if isinstance(shipping_info, dict):
                cost = shipping_info.get("cost") or shipping_info.get("price") or shipping_info.get("freight")
                if cost is not None:
                    shipping_options.append({
                        "service": shipping_info.get("service_name", "API Shipping"),
                        "cost": str(cost),
                        "currency": shipping_info.get("currency", "USD"),
                        "estimated_delivery": shipping_info.get("delivery_time", "15-45 business days")
                    })
        except Exception:
            pass
    
    # Check delivery_info field  
    if item.get("delivery_info"):
        try:
            delivery_info = item.get("delivery_info")
            if isinstance(delivery_info, dict):
                delivery_time = delivery_info.get("time") or delivery_info.get("days") or delivery_info.get("estimate")
                if delivery_time:
                    # Update delivery time for existing shipping options or create new one
                    if shipping_options:
                        shipping_options[-1]["estimated_delivery"] = str(delivery_time)
                    else:
                        shipping_options.append({
                            "service": "Standard Shipping",
                            "cost": "0",
                            "currency": "USD", 
                            "estimated_delivery": str(delivery_time)
                        })
        except Exception:
            pass
    
    # Check logistic_info field
    if item.get("logistic_info"):
        try:
            logistic_info = item.get("logistic_info")
            if isinstance(logistic_info, dict) and logistic_info.get("freight"):
                shipping_options.append({
                    "service": logistic_info.get("service_name", "Standard Shipping"),
                    "cost": str(logistic_info.get("freight", "0")),
                    "currency": logistic_info.get("currency", "USD"),
                    "estimated_delivery": logistic_info.get("time", "15-45 business days")
                })
        except Exception:
            pass
    
    # If we found actual shipping data, return it
    if shipping_options:
        return shipping_options
    
    # Check for free shipping indicators in product title
    try:
        product_title = item.get("product_title", "").lower()
        free_shipping_keywords = [
            "free shipping", "free delivery", "shipping free", "delivery free"
        ]
        
        if any(keyword in product_title for keyword in free_shipping_keywords):
            return [{
                "service": "Free Shipping",
                "cost": "0",
                "currency": "USD",
                "estimated_delivery": "15-45 business days"
            }]
    except Exception:
        pass
    
    # Since AliExpress API doesn't provide shipping data, estimate realistic shipping costs
    return _estimate_realistic_shipping(item, ship_to_country)


def _estimate_realistic_shipping(item: dict, ship_to_country: str = "US") -> list:
    """
    Estimate realistic shipping costs based on product characteristics.
    This provides meaningful shipping information when AliExpress API doesn't provide it.
    """
    try:
        product_title = item.get("product_title", "").lower()
        sale_price = float(item.get("sale_price", 0)) or float(item.get("original_price", 0))
        
        # Categorize products to estimate shipping costs
        shipping_cost = 0
        delivery_time = "15-45 business days"
        
        # Check for high-value items (often have free shipping)
        if sale_price >= 50:
            return [{
                "service": "Free Shipping",
                "cost": "0", 
                "currency": "USD",
                "estimated_delivery": "15-35 business days"
            }]
        
        # Check for small/light items based on keywords
        small_item_keywords = [
            "case", "cover", "sticker", "charm", "ring", "earring", "necklace",
            "keychain", "pin", "badge", "card", "patch", "decal", "magnet",
            "phone case", "screen protector", "cable", "adapter", "usb"
        ]
        
        # Check for large/heavy items
        large_item_keywords = [
            "machine", "device", "appliance", "furniture", "chair", "table",
            "monitor", "screen", "printer", "speaker", "subwoofer", "projector",
            "bike", "bicycle", "scooter", "tool", "drill", "saw", "kit"
        ]
        
        # Check for electronics (moderate shipping)
        electronics_keywords = [
            "headphone", "earbuds", "mouse", "keyboard", "controller", "camera",
            "smartwatch", "tablet", "laptop", "phone", "charger", "powerbank",
            "led", "light", "bluetooth", "wireless", "gaming"
        ]
        
        # Determine shipping category
        if any(keyword in product_title for keyword in small_item_keywords):
            shipping_cost = 1.99 if sale_price < 10 else 2.99
            delivery_time = "10-25 business days"
        elif any(keyword in product_title for keyword in large_item_keywords):
            shipping_cost = 15.99 if sale_price < 100 else 25.99
            delivery_time = "20-50 business days"
        elif any(keyword in product_title for keyword in electronics_keywords):
            shipping_cost = 4.99 if sale_price < 25 else 7.99
            delivery_time = "15-35 business days"
        else:
            # Default shipping for general items
            if sale_price < 5:
                shipping_cost = 2.99
            elif sale_price < 15:
                shipping_cost = 3.99
            elif sale_price < 30:
                shipping_cost = 5.99
            else:
                shipping_cost = 7.99
        
        # Special handling for very cheap items - often free shipping to encourage purchases
        if sale_price < 3:
            return [{
                "service": "Economy Shipping",
                "cost": "0",
                "currency": "USD", 
                "estimated_delivery": "20-50 business days"
            }]
        
        # Standard shipping option
        shipping_options = [{
            "service": "Standard Shipping",
            "cost": str(shipping_cost),
            "currency": "USD",
            "estimated_delivery": delivery_time
        }]
        
        # Add expedited option for items over $10
        if sale_price >= 10:
            expedited_cost = shipping_cost + 5.00
            shipping_options.append({
                "service": "Expedited Shipping",
                "cost": str(expedited_cost),
                "currency": "USD",
                "estimated_delivery": "7-15 business days"
            })
        
        return shipping_options
        
    except Exception:
        # Fallback to basic standard shipping
        return [{
            "service": "Standard Shipping",
            "cost": "4.99",
            "currency": "USD",
            "estimated_delivery": "15-45 business days"
        }]