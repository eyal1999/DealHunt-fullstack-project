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

    return ProductDetail(
        product_id=str(item["product_id"]),
        title=item["product_title"],
        original_price=float(item["original_price"]),
        sale_price=float(item["sale_price"]),
        main_image=item["product_main_image_url"],
        images=item.get("image_urls", {}).get("string", []),
        url=item["product_detail_url"],
        affiliate_link=affiliate_url,
        marketplace="aliexpress",
        sold_count=int(item.get("lastest_volume", 0)), 
    ).dict()
