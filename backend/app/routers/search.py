from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.providers import search as provider_search, detail as provider_detail
from app.models.models import SearchResponse, ProductDetail

router = APIRouter(prefix="/search", tags=["Search"])

VALID_SORT = {"price_low", "price_high"}

def _sort_results(items: List[dict], mode: str) -> List[dict]:
    if mode == "price_low":
        return sorted(items, key=lambda x: x.get("sale_price", float("inf")))
    if mode == "price_high":
        return sorted(items, key=lambda x: x.get("sale_price", 0), reverse=True)
    # if mode == "sales":
    #     return sorted(items, key=lambda x: x.get("sold_count") or 0, reverse=True)
    # return items


@router.get("/", response_model=SearchResponse)
def search_products(
    q: str = Query(..., min_length=1),
    sort: str = Query("price_low", description="price_low | price_high"),
):
    if sort not in VALID_SORT:
        raise HTTPException(400, detail=f"Invalid sort mode: {sort}")

    try:
        results = provider_search(q)
        sorted_items = _sort_results(results, sort)
        return {"query": q, "results": sorted_items}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/detail/{marketplace}/{product_id}", response_model=ProductDetail)
def product_detail(marketplace: str, product_id: str):
    try:
        return provider_detail(marketplace, product_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc))
