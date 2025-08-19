from typing import List
import requests
from urllib.parse import urlencode
import re
from bs4 import BeautifulSoup

from app.config import settings
from app.errors import EbayError
from app.models.models import ProductSummary, ProductDetail
from app.services.ebay_token_manager import ebay_token_manager

def _get_headers() -> dict:
    """Get headers with current valid token."""
    return {
        "Authorization": f"Bearer {ebay_token_manager.get_valid_token()}",
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
        skip_section = False
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            line_lower = line.lower()
            
            # Check for section headers that indicate boilerplate content
            boilerplate_sections = [
                'payment', 'delivery details', 'shipping', 'returns', 'return policy',
                'about return', 'contact us', 'terms of sale', 'feedback', 
                'store category', 'sign up now', 'you may also like',
                'visit my store', 'see other items', 'terms and conditions',
                'shipping and handling', 'estimated delivery', 'shipping cost',
                'international shipping', 'payment method', 'payment options',
                'buyer protection', 'money back guarantee', 'refund policy',
                'customer service', 'business hours', 'we accept'
            ]
            
            # Check if this line starts a boilerplate section
            for section in boilerplate_sections:
                if line_lower.startswith(section) or line_lower == section:
                    skip_section = True
                    break
            
            # Reset skip_section if we encounter a new main section that might be product-related
            product_sections = [
                'description', 'product description', 'features', 'specifications',
                'product details', 'what\'s included', 'package includes',
                'technical specifications', 'dimensions', 'materials', 'overview',
                'attention:', 'note:', 'important:', 'warning:', 'notice:'
            ]
            
            for section in product_sections:
                if line_lower.startswith(section) or line_lower == section:
                    skip_section = False
                    break
            
            if skip_section:
                continue
                
            # Skip lines that are clearly promotional or boilerplate
            skip_keywords = [
                'similar items', 'people also', 'you may like', 'recommended',
                'visit my store', 'see other items', 'browse similar',
                'check out my other', 'free shipping on orders',
                'buy it now', 'best offer', 'add to watchlist',
                'paypal', 'ebay registered', 'rma number', 'business day',
                'satisfactory guarantee', 'ship to us only', 'apo/fpo',
                'excludes:', 'seller are not responsible', 'reasonably priced',
                'amazing customer service', 'do contact us', 'sku:',
                'accept paypal', 'ship to ebay', 'wrong or undeliverable',
                'item returned must be', 'replacement or full refund',
                'normally emails will be', 'purchasing our products',
                'backed by amazing', 'always reasonably priced'
            ]
            
            skip_line = False
            for keyword in skip_keywords:
                if keyword in line_lower:
                    skip_line = True
                    break
            
            # Also skip lines that look like generic seller promises
            generic_patterns = [
                r'^100%\s+satisf', r'^high quality and reliable',
                r'^we have.*guarantee', r'^all items will be',
                r'^when purchasing our products', r'^backed by amazing',
                r'^seller are not responsible', r'^accept\s+paypal',
                r'^ship to.*only', r'^item returned must be'
            ]
            
            for pattern in generic_patterns:
                if re.search(pattern, line_lower):
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
def _search_ebay_single_page(query: str, offset: int = 0, limit: int = 50, min_price: float = None, max_price: float = None) -> tuple[List[dict], bool]:
    """Search a single page of eBay results with optional price filtering.
    
    Args:
        query: Search keywords
        offset: Starting position for results
        limit: Number of results per page
        min_price: Minimum price filter (optional)
        max_price: Maximum price filter (optional)
    
    Returns:
        tuple: (list of products, has_more_pages)
    """
    params = {
        "q": query,
        "limit": limit,
        "offset": offset
    }
    
    # Add price range filtering if provided
    if min_price is not None or max_price is not None:
        price_filters = []
        if min_price is not None:
            price_filters.append(f"price:[{min_price} TO *]")
        if max_price is not None:
            price_filters.append(f"price:[* TO {max_price}]")
        
        # eBay API uses filter parameter for price ranges
        if min_price is not None and max_price is not None:
            params["filter"] = f"price:[{min_price}..{max_price}],priceCurrency:USD"
        elif min_price is not None:
            params["filter"] = f"price:[{min_price}..*],priceCurrency:USD"
        elif max_price is not None:
            params["filter"] = f"price:[*..{max_price}],priceCurrency:USD"
    
    resp = requests.get(f"{settings.ebay_base_url}/buy/browse/v1/item_summary/search",
        params=params, headers=_get_headers(), timeout=(3, 10))
    
    # If we get 401/403, try refreshing token once
    if resp.status_code in [401, 403]:
        ebay_token_manager.force_refresh()
        resp = requests.get(f"{settings.ebay_base_url}/buy/browse/v1/item_summary/search",
            params=params, headers=_get_headers(), timeout=(3, 10))
    
    resp.raise_for_status()
    response_data = resp.json()
    items = response_data.get("itemSummaries", [])
    
    # Check if there are more pages
    total = response_data.get("total", 0)
    has_more = (offset + len(items)) < total
    
    return items, has_more

def search_products_ebay_single_page(query: str, page: int = 1, min_price: float = None, max_price: float = None) -> List[dict]:
    """Search eBay for a single page of results with optional price filtering.
    
    Args:
        query: Search keywords
        page: Page number (1-based)
        min_price: Minimum price filter (optional)
        max_price: Maximum price filter (optional)
    
    Returns:
        List of ProductSummary dicts for that page
    """
    try:
        limit = 50  # eBay's maximum per page
        offset = (page - 1) * limit
        
        items, has_more = _search_ebay_single_page(query, offset, limit, min_price, max_price)
        
        # Process the items
        results = []
        for i in items:
            # Handle image URL safely - convert empty strings to None
            image_url = i.get("image", {}).get("imageUrl", "") 
            image_url = image_url if image_url and image_url.strip() else None
            
            # Handle affiliate link safely
            affiliate_link = i.get("itemAffiliateWebUrl", i.get("itemWebUrl"))
            affiliate_link = affiliate_link if affiliate_link and affiliate_link.strip() else None
            
            # Extract sold count - try multiple possible field names
            sold_count = 0
            for field in ["quantitySold", "soldQuantity", "totalSold", "salesCount", "soldCount"]:
                if field in i and i[field] is not None:
                    try:
                        sold_count = int(i[field])
                        break
                    except (ValueError, TypeError):
                        continue
            
            # Extract rating - try multiple possible field names from eBay API
            rating = None
            rating_fields = [
                "averageStarRating", "starRating", "rating", "averageRating",
                "reviewRating", "feedbackRating", "sellerFeedbackRating"
            ]
            
            # DEBUG: Log available fields for rating analysis (disabled after testing)
            # if len(results) < 2:  # Only log for first couple items to avoid spam
            #     available_fields = list(i.keys())
            #     print(f"🔍 eBay item fields: {available_fields}")
                
            for field in rating_fields:
                if field in i and i[field] is not None:
                    try:
                        rating = float(i[field])
                        # print(f"✅ Found eBay rating: {field} = {rating}")
                        # Ensure rating is within valid range (0-5)
                        if 0 <= rating <= 5:
                            break
                        else:
                            rating = None
                    except (ValueError, TypeError):
                        continue
            
            # If no direct rating, check nested objects
            if rating is None:
                # Check seller feedback
                seller_info = i.get("seller", {})
                if isinstance(seller_info, dict):
                    for field in ["feedbackPercentage", "positiveFeedbackPercent", "feedbackScore"]:
                        if field in seller_info and seller_info[field] is not None:
                            try:
                                feedback = float(seller_info[field])
                                if field in ["feedbackPercentage", "positiveFeedbackPercent"]:
                                    # Convert percentage (0-100) to star rating (0-5)
                                    rating = (feedback / 100) * 5
                                elif field == "feedbackScore":
                                    # Normalize feedback score to 0-5 range (rough estimate)
                                    rating = min(5.0, max(0.0, feedback / 1000 * 5))
                                break
                            except (ValueError, TypeError):
                                continue
            
            # Extract category information from eBay API response
            categories = {
                "first_level": "",
                "second_level": "",
                "first_level_id": "",
                "second_level_id": "",
                "primary_category_id": "",
                "category_path": "",
                "all_categories": []
            }
            
            # Get primary category ID
            if "primaryCategory" in i:
                primary_cat = i["primaryCategory"]
                categories["primary_category_id"] = primary_cat.get("categoryId", "")
                categories["first_level_id"] = primary_cat.get("categoryId", "")
                categories["first_level"] = primary_cat.get("categoryName", "")
            
            # Get categories array (multiple categories per item)
            if "categories" in i and isinstance(i["categories"], list):
                categories["all_categories"] = []
                category_names = []
                
                for cat in i["categories"]:
                    if isinstance(cat, dict):
                        cat_name = cat.get("categoryName", "")
                        cat_id = cat.get("categoryId", "")
                        if cat_name:
                            categories["all_categories"].append({
                                "name": cat_name,
                                "id": cat_id
                            })
                            category_names.append(cat_name)
                
                # Build category path from category names
                if category_names:
                    categories["category_path"] = " > ".join(category_names)
                    
                    # Set first and second level from categories array
                    if len(category_names) >= 1:
                        categories["first_level"] = category_names[0]
                    if len(category_names) >= 2:
                        categories["second_level"] = category_names[1]
                        if len(categories["all_categories"]) >= 2:
                            categories["second_level_id"] = categories["all_categories"][1].get("id", "")
            
            # Fallback: try to extract from categoryPath if available
            if "categoryPath" in i and not categories["category_path"]:
                categories["category_path"] = i["categoryPath"]
                # Split path to get individual levels
                path_parts = i["categoryPath"].split(" > ")
                if len(path_parts) >= 1:
                    categories["first_level"] = path_parts[0].strip()
                if len(path_parts) >= 2:
                    categories["second_level"] = path_parts[1].strip()
            
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
                    sold_count=sold_count,
                    rating=rating,
                    categories=categories,
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

def search_products_ebay(query: str, max_pages: int = 20, min_price: float = None, max_price: float = None) -> List[dict]:
    """Search eBay with multi-page support for thousands of results with optional price filtering.
    
    Args:
        query: Search keywords
        max_pages: Maximum number of pages to fetch (default: 20 for ~1000 results)
        min_price: Minimum price filter (optional)
        max_price: Maximum price filter (optional)
    
    Returns:
        List of ProductSummary dicts from all pages combined
    """
    try:
        all_results = []
        limit = 50  # eBay's maximum per page
        offset = 0
        consecutive_empty_pages = 0
        
        print(f"🔍 Starting eBay multi-page search for '{query}' - fetching up to {max_pages} pages")
        
        for page in range(max_pages):
            try:
                # Add small delay between requests
                if page > 0:
                    import time
                    time.sleep(0.1)
                
                items, has_more = _search_ebay_single_page(query, offset, limit, min_price, max_price)
                
                if not items:
                    consecutive_empty_pages += 1
                    print(f"📭 eBay Page {page + 1}: No products found (consecutive empty: {consecutive_empty_pages})")
                    
                    # Stop if we get 3 consecutive empty pages
                    if consecutive_empty_pages >= 3:
                        print(f"🛑 Stopping eBay search after {consecutive_empty_pages} consecutive empty pages")
                        break
                    
                    offset += limit
                    continue
                else:
                    consecutive_empty_pages = 0
                
                print(f"📦 eBay Page {page + 1}: Found {len(items)} products")
                
                # Process the items for this page
                for i in items:
                    # Handle image URL safely - convert empty strings to None
                    image_url = i.get("image", {}).get("imageUrl", "") 
                    image_url = image_url if image_url and image_url.strip() else None
                    
                    # Handle affiliate link safely
                    affiliate_link = i.get("itemAffiliateWebUrl", i.get("itemWebUrl"))
                    affiliate_link = affiliate_link if affiliate_link and affiliate_link.strip() else None
                    
                    # Extract sold count - try multiple possible field names
                    sold_count = 0
                    for field in ["quantitySold", "soldQuantity", "totalSold", "salesCount", "soldCount"]:
                        if field in i and i[field] is not None:
                            try:
                                sold_count = int(i[field])
                                break
                            except (ValueError, TypeError):
                                continue
                    
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
                            sold_count=sold_count,
                        )
                        all_results.append(product.model_dump())
                    except Exception as validation_error:
                        print(f"eBay product validation error for item {i.get('itemId')}: {validation_error}")
                        # Skip invalid products instead of failing the entire search
                        continue
                
                # Update offset for next page
                offset += limit
                
                # Stop if we've reached the end
                if not has_more:
                    print(f"🏁 eBay search completed: No more results available")
                    break
                    
            except Exception as page_error:
                print(f"❌ Error fetching eBay page {page + 1}: {page_error}")
                consecutive_empty_pages += 1
                
                # Stop if we get too many errors
                if consecutive_empty_pages >= 5:
                    print(f"🛑 Stopping eBay search after {consecutive_empty_pages} consecutive failures")
                    break
                
                offset += limit
                continue
        
        print(f"✅ eBay multi-page search completed: {len(all_results)} total products from {query}")
        return all_results
    except Exception as e:
        print(f"eBay search error: {e}")
        raise EbayError(f"Failed to search eBay: {str(e)}")

# ── DETAIL ─────────────────────────────────────────────────────
def extract_ebay_item_id(item_id: str) -> str:
    """Extract numeric item ID from complex eBay item ID formats like 'v1|336064091024|0'."""
    if '|' in item_id:
        parts = item_id.split('|')
        if len(parts) >= 2:
            return parts[1]  # Return the numeric part
    return item_id  # Return as-is if no pipes found

def fetch_product_detail_ebay(item_id: str) -> dict:
    try:
        # Try multiple ID formats to handle eBay API compatibility issues
        id_formats_to_try = []
        
        # Always try original ID first
        id_formats_to_try.append(item_id)
        
        # If it's a complex ID, also try the extracted numeric part
        if '|' in item_id:
            clean_item_id = extract_ebay_item_id(item_id)
            id_formats_to_try.append(clean_item_id)
        
        print(f"eBay detail lookup for: {item_id} (trying {len(id_formats_to_try)} ID formats)")
        
        resp = None
        for i, id_to_try in enumerate(id_formats_to_try):
            print(f"  Attempt {i+1}: {id_to_try}")
            
            try:
                resp = requests.get(f"{settings.ebay_base_url}/buy/browse/v1/item/{id_to_try}",
                    headers=_get_headers(),timeout=(3, 10),)
                
                # If we get 401/403, try refreshing token once
                if resp.status_code in [401, 403]:
                    ebay_token_manager.force_refresh()
                    resp = requests.get(f"{settings.ebay_base_url}/buy/browse/v1/item/{id_to_try}",
                        headers=_get_headers(),timeout=(3, 10),)
                
                # If successful, break and use this response
                if resp.status_code == 200:
                    print(f"  ✅ Success with ID format: {id_to_try}")
                    break
                elif resp.status_code == 404:
                    print(f"  ❌ 404 with ID format: {id_to_try}")
                    continue
                else:
                    print(f"  ⚠️ HTTP {resp.status_code} with ID format: {id_to_try}")
                    continue
                    
            except Exception as e:
                print(f"  ❌ Error with ID format {id_to_try}: {e}")
                continue
        
        # If no format worked, raise the last response or a generic error
        if not resp or resp.status_code != 200:
            print(f"❌ All ID formats failed for eBay item: {item_id}")
            if resp:
                resp.raise_for_status()
            else:
                raise EbayError(f"eBay item not found with any ID format: {item_id}")
        
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
        
        # Extract sold count - try multiple possible field names
        sold_count = 0
        for field in ["quantitySold", "soldQuantity", "totalSold", "salesCount", "soldCount"]:
            if field in item and item[field] is not None:
                try:
                    sold_count = int(item[field])
                    break
                except (ValueError, TypeError):
                    continue
        
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
            top_rated_seller=item.get("topRatedBuyingExperience", False),
            sold_count=sold_count
        ).model_dump()
        
    except Exception as e:
        print(f"eBay detail error: {e}")
        raise EbayError(f"Failed to fetch eBay product details: {str(e)}")