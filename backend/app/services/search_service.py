"""Service layer that talks to the AliExpress Affiliate API (sync)."""
from typing import List, Iterable
import requests

from app.config import settings
from app.core.utils import timestamp_shanghai, make_signature
from app.errors import AliexpressError
from app.models.models import ProductSummary, ProductDetail, PromotionLink

# ------------------------------------------------------------------ constants
_HEADERS = {"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"}
MAX_LINKS_PER_CALL = 12        # search page_size AND link-gen batch size
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
    raw_values = [
        u if u.startswith("http")
        else f"https://www.aliexpress.com/item/{u}.html"
        for u in source_urls
    ]
    if len(raw_values) > MAX_LINKS_PER_CALL:
        raise ValueError(f"AliExpress allows max {MAX_LINKS_PER_CALL} URLs per call.")

    params = _base_params("aliexpress.affiliate.link.generate")
    params.update(
        {
            "promotion_link_type": promotion_link_type,
            "source_values": ",".join(raw_values),
            "tracking_id": settings.tracking_id,
        }
    )
    params["sign"] = make_signature(params, settings.app_secret)

    resp = requests.post(settings.base_url, data=params, headers=_HEADERS, timeout=(3, 20))
    resp.raise_for_status()

    wrapper = resp.json().get("aliexpress_affiliate_link_generate_response", {})
    block = wrapper.get("resp_result", {})
    if block.get("resp_code") != 200:
        raise AliexpressError(
            f"Link-gen API error {block.get('resp_code')}: {block.get('resp_msg')}"
        )

    links_raw = (
        block.get("result", {})
        .get("promotion_links", {})
        .get("promotion_link", [])
    )
    promo_links: List[PromotionLink] = []
    for raw in links_raw:
        try:
            promo_links.append(
                PromotionLink(
                    source_value=raw.get("source_value", ""),
                    promotion_link=raw.get("promotion_link", ""),
                )
            )
        except Exception:
            # Skip rows that fail URL validation instead of blowing up
            continue

    return promo_links

# ---------------------------------------------------------------- search
def search_products(query: str) -> List[dict]:
    """Return a list of ProductSummary dicts sorted by recent sales volume."""
    params = _base_params("aliexpress.affiliate.product.query")
    params.update(
        {
            "keywords": query,
            "page_no": 1,
            "page_size": MAX_LINKS_PER_CALL,         # 12
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
    detail_urls = [p["product_detail_url"] for p in products]

    links = generate_affiliate_links(detail_urls)
    link_map = {l.source_value: l.promotion_link for l in links}

    summaries = [
        ProductSummary(
            product_id=str(p["product_id"]),
            title=p["product_title"],
            original_price=float(p["original_price"]),
            sale_price=float(p["sale_price"]),
            image=p["product_main_image_url"],
            detail_url=p["product_detail_url"],
            affiliate_link=link_map.get(p["product_detail_url"], p["product_detail_url"]),
            marketplace="aliexpress",
            sold_count=int(p.get("lastest_volume", 0)), 
        ).dict()
        for p in products
    ]
    return summaries

# ---------------------------------------------------------------- product detail
def fetch_product_detail(product_id: str) -> dict:
    """Return a single ProductDetail dict with an affiliate link."""
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

    item = data.get("result", {}).get("products", {}).get("product", [])[0]

    links = generate_affiliate_links([item["product_detail_url"]])
    affiliate_url = links[0].promotion_link if links else item["product_detail_url"]

    # Extract shop/seller information for AliExpress
    seller_info = {
        "shop_name": item.get("shop_name", ""),
        "shop_url": item.get("shop_url", ""),
        "shop_id": item.get("shop_id", ""),
        "evaluate_rate": item.get("evaluate_rate", ""),  # Customer satisfaction
    }

    # Extract category information
    categories = {
        "first_level": item.get("first_level_category_name", ""),
        "second_level": item.get("second_level_category_name", ""),
        "first_level_id": item.get("first_level_category_id", ""),
        "second_level_id": item.get("second_level_category_id", ""),
    }

    # Extract all available images
    all_images = [item["product_main_image_url"]]
    
    # Add images from image_urls (detailed product images)
    image_urls = item.get("image_urls", {}).get("string", [])
    if isinstance(image_urls, list):
        all_images.extend(image_urls)
    
    # Add small images if available and different
    small_image_urls = item.get("product_small_image_urls", {}).get("string", [])
    if isinstance(small_image_urls, list):
        for img in small_image_urls:
            if img not in all_images:
                all_images.append(img)
    
    # Remove duplicates while preserving order
    all_images = list(dict.fromkeys([img for img in all_images if img]))

    # Extract discount percentage
    discount_str = item.get("discount", "0%")
    try:
        discount_percent = float(discount_str.replace("%", ""))
    except (ValueError, AttributeError):
        discount_percent = 0

    # Calculate evaluate_rate as a rating (convert percentage to 5-star scale)
    rating = None
    if item.get("evaluate_rate"):
        try:
            eval_rate = float(item.get("evaluate_rate", "0").replace("%", ""))
            # Convert percentage to 5-star scale (86.2% = ~4.3 stars)
            rating = round((eval_rate / 100) * 5, 1)
        except (ValueError, AttributeError):
            rating = None

    return ProductDetail(
        product_id=str(item["product_id"]),
        title=item["product_title"],
        original_price=float(item["original_price"]),
        sale_price=float(item["sale_price"]),
        main_image=item["product_main_image_url"],
        images=all_images,
        url=item["product_detail_url"],
        affiliate_link=affiliate_url,
        marketplace="aliexpress",
        sold_count=int(item.get("lastest_volume", 0)),
        rating=rating,
        
        # Enhanced AliExpress-specific fields
        description=None,  # AliExpress doesn't provide detailed description in this API
        condition="New",   # AliExpress products are typically new
        brand=None,        # Not available in this API response
        color=None,        # Not available in this API response
        material=None,     # Not available in this API response
        
        # AliExpress seller info (shop-based)
        seller=seller_info,
        
        # Location info (AliExpress is primarily China-based)
        location={"country": "China", "city": "", "state": ""},
        
        # Shipping info (basic for AliExpress)
        shipping=[{
            "service": "Standard Shipping",
            "cost": 0,  # Often free shipping
            "currency": "USD"
        }],
        
        # Product specifications (not available in detail API, but we can add categories)
        specifications={
            "Category": categories.get("first_level", ""),
            "Subcategory": categories.get("second_level", ""),
            "Marketplace": "AliExpress",
            "Product ID": str(item["product_id"]),
            "Discount": f"{discount_percent}%" if discount_percent > 0 else "No discount"
        },
        
        # Return policy (generic for AliExpress)
        return_policy={
            "returns_accepted": True,  # AliExpress generally accepts returns
            "return_period": "15 days", # Typical AliExpress return period
            "return_method": "Buyer protection"
        },
        
        # Additional metadata
        item_creation_date=None,
        top_rated_seller=False,  # We could enhance this based on evaluate_rate
        
        # AliExpress-specific additional fields
        product_video_url=item.get("product_video_url", ""),
        categories=categories,
        discount_percentage=discount_percent,
        commission_rate=item.get("commission_rate", ""),
    ).dict()