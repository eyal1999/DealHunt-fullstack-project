from typing import List
import requests
from urllib.parse import urlencode
import re
from bs4 import BeautifulSoup

from app.config import settings
from app.errors import EbayError
from app.models.models import ProductSummary, ProductDetail

HEADERS = {
    "Authorization": f"Bearer {settings.ebay_token}",
    "Content-Type": "application/json",
    "X-EBAY-C-ENDUSERCTX": f"affiliateCampaignId={settings.ebay_campaign_id}",
}
BROWSE = f"{settings.ebay_base_url}/buy/browse/v1"

def clean_ebay_description(description: str) -> str:
    """
    Clean eBay description by removing unwanted HTML content,
    suggestions, and promotional material while preserving actual product info.
    
    This function addresses the common issue where eBay descriptions include
    embedded suggestions for similar items, promotional content, and ads.
    """
    if not description:
        return ""
    
    try:
        # Parse HTML content using BeautifulSoup
        soup = BeautifulSoup(description, 'html.parser')
        
        # Remove elements that commonly contain suggestions or promotional content
        unwanted_selectors = [
            # Common class names and IDs used for suggestions
            'div[class*="similar"]',
            'div[class*="suggestion"]', 
            'div[class*="recommend"]',
            'div[class*="related"]',
            'div[class*="also-bought"]',
            'div[class*="you-may-like"]',
            'div[class*="promotional"]',
            'div[class*="advertisement"]',
            'div[class*="ads"]',
            'div[class*="sponsor"]',
            
            # Common promotional sections
            'div[id*="promotion"]',
            'div[id*="similar"]',
            'div[id*="related"]',
            
            # eBay-specific promotional elements
            'div[class*="ebay-suggest"]',
            'div[class*="ebay-recommend"]',
            'div[class*="vi-acc-del-range"]',  # eBay's "People also bought" section
            'div[class*="vi-acc-del"]',
            'table[class*="similar"]',
            
            # Generic promotional containers
            'aside',
            'div[class*="widget"]',
            'div[class*="sidebar"]',
        ]
        
        # Remove unwanted elements
        for selector in unwanted_selectors:
            elements = soup.select(selector)
            for element in elements:
                element.decompose()
        
        # Remove any remaining script or style tags
        for tag in soup(['script', 'style', 'noscript']):
            tag.decompose()
        
        # Look for text patterns that indicate suggestions/recommendations
        unwanted_text_patterns = [
            r'.*similar\s+items?.*',
            r'.*people\s+also\s+(bought|viewed|liked).*',
            r'.*you\s+may\s+also\s+like.*',
            r'.*recommended\s+for\s+you.*',
            r'.*other\s+items\s+from\s+this\s+seller.*',
            r'.*visit\s+my\s+ebay\s+store.*',
            r'.*see\s+other\s+items.*',
            r'.*browse\s+similar.*',
            r'.*check\s+out\s+my\s+other.*',
        ]
        
        # Remove paragraphs or divs containing unwanted text patterns
        for element in soup.find_all(['p', 'div', 'span']):
            if element.string:
                text_content = element.string.lower().strip()
                for pattern in unwanted_text_patterns:
                    if re.match(pattern, text_content, re.IGNORECASE):
                        element.decompose()
                        break
        
        # Get cleaned text content
        cleaned_text = soup.get_text(separator='\n', strip=True)
        
        # Additional text cleaning
        lines = cleaned_text.split('\n')
        clean_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Skip lines that are clearly promotional
            line_lower = line.lower()
            skip_line = False
            
            promotional_keywords = [
                'similar items', 'people also', 'you may like', 'recommended',
                'visit my store', 'see other items', 'browse similar',
                'check out my other', 'free shipping on orders',
                'buy it now', 'best offer', 'add to watchlist'
            ]
            
            for keyword in promotional_keywords:
                if keyword in line_lower:
                    skip_line = True
                    break
            
            if not skip_line and len(line) > 5:  # Avoid very short, meaningless lines
                clean_lines.append(line)
        
        # Join lines and clean up extra whitespace
        cleaned_description = '\n'.join(clean_lines)
        cleaned_description = re.sub(r'\n{3,}', '\n\n', cleaned_description)  # Max 2 consecutive newlines
        cleaned_description = cleaned_description.strip()
        
        # If cleaning removed too much content (less than 20 characters), 
        # fall back to basic HTML tag removal
        if len(cleaned_description) < 20 and len(description) > 50:
            # Basic fallback: just remove HTML tags
            soup_fallback = BeautifulSoup(description, 'html.parser')
            cleaned_description = soup_fallback.get_text(separator=' ', strip=True)
            # Clean up excessive whitespace
            cleaned_description = re.sub(r'\s+', ' ', cleaned_description).strip()
        
        return cleaned_description
        
    except Exception as e:
        # If HTML parsing fails, fall back to basic text cleaning
        print(f"Error cleaning description: {e}")
        # Remove basic HTML tags
        text_only = re.sub(r'<[^>]+>', '', description)
        # Clean up whitespace
        text_only = re.sub(r'\s+', ' ', text_only).strip()
        return text_only

# ── SEARCH ─────────────────────────────────────────────────────
def search_products_ebay(query: str) -> List[dict]:
    try:
        resp = requests.get(f"{settings.ebay_base_url}/buy/browse/v1/item_summary/search",
            params={"q": query},headers=HEADERS,timeout=(5, 30),)
        resp.raise_for_status()
        items = resp.json().get("itemSummaries", [])
        
        results = []
        for i in items:
            # Handle image URL safely - convert empty strings to None
            image_url = i.get("image", {}).get("imageUrl", "") 
            image_url = image_url if image_url and image_url.strip() else None
            
            # Handle affiliate link safely
            affiliate_link = i.get("itemAffiliateWebUrl", i["itemWebUrl"])
            affiliate_link = affiliate_link if affiliate_link and affiliate_link.strip() else None
            
            try:
                product = ProductSummary(
                    product_id=i["itemId"],
                    title=i["title"],
                    original_price=float(i["price"]["value"]),
                    sale_price=float(i["price"]["value"]),
                    image=image_url,
                    detail_url=i["itemWebUrl"],
                    affiliate_link=affiliate_link,
                    marketplace="ebay",
                )
                results.append(product.model_dump())
            except Exception as validation_error:
                print(f"eBay product validation error for item {i.get('itemId')}: {validation_error}")
                # Skip invalid products instead of failing the entire search
                continue
        return results
    except Exception as e:
        print(f"eBay search error: {e}")
        raise EbayError(f"Failed to search eBay: {str(e)}")

# ── DETAIL ─────────────────────────────────────────────────────
def fetch_product_detail_ebay(item_id: str) -> dict:
    try:
        resp = requests.get(f"{settings.ebay_base_url}/buy/browse/v1/item/{item_id}",
            headers=HEADERS,timeout=(5, 30),)
        resp.raise_for_status()
        
        item = resp.json()
        
        # Extract seller information
        seller_info = {}
        if "seller" in item:
            seller = item["seller"]
            seller_info = {
                "username": seller.get("username", ""),
                "feedback_percentage": seller.get("feedbackPercentage", ""),
                "feedback_score": seller.get("feedbackScore", "")
            }
        
        # Extract location information
        location_info = {}
        if "itemLocation" in item:
            location = item["itemLocation"]
            location_info = {
                "country": location.get("country", ""),
                "city": location.get("city", ""),
                "state_or_province": location.get("stateOrProvince", ""),
                "postal_code": location.get("postalCode", "")
            }
        
        # Extract shipping information
        shipping_info = []
        if "shippingOptions" in item:
            for option in item["shippingOptions"]:
                shipping_option = {
                    "type": option.get("shippingServiceCode", ""),
                    "cost": option.get("shippingCost", {}).get("value", "0"),
                    "currency": option.get("shippingCost", {}).get("currency", "USD"),
                    "estimated_delivery": option.get("maxEstimatedDeliveryDate", "")
                }
                shipping_info.append(shipping_option)
        
        # Extract product specifications with proper formatting
        specifications = {}
        if "localizedAspects" in item:
            for aspect in item["localizedAspects"]:
                name = aspect.get("name", "")
                raw_values = aspect.get("value", [])
                
                if name and raw_values:
                    # Handle different value formats from eBay API
                    if isinstance(raw_values, list):
                        # Filter out empty values and ensure they're strings
                        clean_values = []
                        for val in raw_values:
                            if isinstance(val, str) and val.strip():
                                clean_values.append(val.strip())
                            elif val is not None:
                                # Convert non-string values to string
                                str_val = str(val).strip()
                                if str_val:
                                    clean_values.append(str_val)
                        
                        if clean_values:
                            # Join multiple values with ", " but avoid comma-separated characters
                            specifications[name] = ", ".join(clean_values)
                    elif isinstance(raw_values, str) and raw_values.strip():
                        # Single string value
                        specifications[name] = raw_values.strip()
                    elif raw_values is not None:
                        # Convert other types to string
                        str_val = str(raw_values).strip()
                        if str_val:
                            specifications[name] = str_val
        
        # Handle images
        all_images = []
        if item.get("image"):
            all_images = [item.get("image", {}).get("imageUrl", "")]
        
        # Add additional images
        additional_images = item.get("additionalImages", [])
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
        
        # FIXED: Clean the description to remove suggestions and promotional content
        raw_description = item.get("description", item.get("shortDescription", ""))
        cleaned_description = clean_ebay_description(raw_description)

        # Handle main image URL safely
        main_image_url = item.get("image", {}).get("imageUrl", "")
        main_image_url = main_image_url if main_image_url and main_image_url.strip() else None
        
        # Handle affiliate link safely
        affiliate_link = item.get("itemAffiliateWebUrl", item["itemWebUrl"])
        affiliate_link = affiliate_link if affiliate_link and affiliate_link.strip() else None
        
        # Filter out empty image URLs from all_images list
        filtered_images = [img for img in all_images if img and img.strip()]
        
        return ProductDetail(
            product_id=item["itemId"],
            title=item["title"],
            original_price=float(item["price"]["value"]),
            sale_price=float(item["price"]["value"]),
            main_image=main_image_url,
            images=filtered_images,
            url=item["itemWebUrl"],
            affiliate_link=affiliate_link,
            marketplace="ebay",
            # FIXED: Use cleaned description instead of raw
            description=cleaned_description,
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
        
    except Exception as e:
        print(f"eBay detail error: {e}")
        raise EbayError(f"Failed to fetch eBay product details: {str(e)}")