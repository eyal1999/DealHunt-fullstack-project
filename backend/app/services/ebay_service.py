from typing import List
import requests
from urllib.parse import urlencode

from app.config import settings
from app.errors import EbayError
from app.models.models import ProductSummary, ProductDetail

HEADERS = {
    "Authorization": f"Bearer {settings.ebay_token}",
    "Content-Type": "application/json",
    "X-EBAY-C-ENDUSERCTX": f"affiliateCampaignId={settings.ebay_campaign_id}",
}
BROWSE = f"{settings.ebay_base_url}/buy/browse/v1"

# ── SEARCH ─────────────────────────────────────────────────────
def search_products_ebay(query: str) -> List[dict]:
    resp = requests.get(f"{settings.ebay_base_url}/buy/browse/v1/item_summary/search",
        params={"q": query},headers=HEADERS,timeout=(5, 30),)
    resp.raise_for_status()
    items = resp.json().get("itemSummaries", [])
    
    results = [
        ProductSummary(
            product_id=i["itemId"],
            title=i["title"],
            original_price=float(i["price"]["value"]),
            sale_price=float(i["price"]["value"]),
            image=i.get("image", {}).get("imageUrl", ""),
            detail_url=i["itemWebUrl"],
            affiliate_link=i.get("itemAffiliateWebUrl", i["itemWebUrl"]),
            marketplace="ebay",
        ).model_dump()
        for i in items
    ]
    return results

# ── DETAIL ─────────────────────────────────────────────────────
def fetch_product_detail_ebay(item_id: str) -> dict:
    resp = requests.get(f"{settings.ebay_base_url}/buy/browse/v1/item/{item_id}",
        headers=HEADERS,timeout=(5, 30),)
    resp.raise_for_status()
    
    item = resp.json()
    
    # Extract seller information
    seller = item.get("seller", {})
    seller_info = {
        "username": seller.get("username", ""),
        "feedback_percentage": seller.get("feedbackPercentage", ""),
        "feedback_score": seller.get("feedbackScore", 0)
    }
    
    # Extract location information
    location = item.get("itemLocation", {})
    location_info = {
        "city": location.get("city", ""),
        "state": location.get("stateOrProvince", ""),
        "country": location.get("country", "")
    }
    
    # Extract shipping information
    shipping_options = item.get("shippingOptions", [])
    shipping_info = []
    for option in shipping_options:
        shipping_cost = option.get("shippingCost", {})
        shipping_info.append({
            "service": option.get("shippingServiceCode", "Standard"),
            "cost": float(shipping_cost.get("value", 0)) if shipping_cost.get("value") else 0,
            "currency": shipping_cost.get("currency", "USD")
        })
    
    # Extract product specifications from localizedAspects
    specifications = {}
    localized_aspects = item.get("localizedAspects", [])
    for aspect in localized_aspects:
        name = aspect.get("name", "")
        values = aspect.get("value", [])
        if name and values:
            # Join multiple values with commas
            specifications[name] = ", ".join(values) if isinstance(values, list) else str(values)
    
    # Extract additional images
    additional_images = item.get("additionalImages", [])
    all_images = [item.get("image", {}).get("imageUrl", "")]
    all_images.extend([img.get("imageUrl", "") for img in additional_images if img.get("imageUrl")])
    
    # Remove empty images
    all_images = [img for img in all_images if img]
    
    # Extract return policy
    return_terms = item.get("returnTerms", {})
    return_policy = {
        "returns_accepted": return_terms.get("returnsAccepted", False),
        "return_period": return_terms.get("returnPeriod", {}).get("value", ""),
        "return_method": return_terms.get("returnMethod", "")
    }

    return ProductDetail(
        product_id=item["itemId"],
        title=item["title"],
        original_price=float(item["price"]["value"]),
        sale_price=float(item["price"]["value"]),
        main_image=item.get("image", {}).get("imageUrl", ""),
        images=all_images,
        url=item["itemWebUrl"],
        affiliate_link=item.get("itemAffiliateWebUrl", item["itemWebUrl"]),
        marketplace="ebay",
        # Additional eBay-specific fields
        description=item.get("description", item.get("shortDescription", "")),
        condition=item.get("condition", ""),
        brand=item.get("brand", ""),
        color=item.get("color", ""),
        material=item.get("material", ""),
        seller=seller_info,
        location=location_info,
        shipping=shipping_info,
        specifications=specifications,
        return_policy=return_policy,
        item_creation_date=item.get("itemCreationDate", ""),
        top_rated_seller=item.get("topRatedBuyingExperience", False)
    ).model_dump()