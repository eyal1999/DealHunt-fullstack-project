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
    origin_items = resp.json()
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

    return ProductDetail(
        product_id=item["itemId"],
        title=item["title"],
        original_price=float(item["price"]["value"]),
        sale_price=float(item["price"]["value"]),
        main_image=item.get("image", {}).get("imageUrl", ""),
        images=[img["imageUrl"] for img in item.get("additionalImages", [])],
        url=item["itemWebUrl"],
        affiliate_link=item.get("itemAffiliateWebUrl", item["itemWebUrl"]),
        marketplace="ebay",
    ).model_dump()
