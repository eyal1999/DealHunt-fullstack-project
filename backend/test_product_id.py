#!/usr/bin/env python3
"""
Test script to analyze the problematic product ID and URL encoding/decoding
"""
import urllib.parse

def test_product_id_handling():
    # The problematic URL from the user report
    problematic_url = "http://localhost:5000/product/ebay/v1%7C336064091024%7C0"
    
    # Extract the encoded product ID
    encoded_id = "v1%7C336064091024%7C0"
    
    # Decode it (this is what React Router does automatically)
    decoded_id = urllib.parse.unquote(encoded_id)
    
    print("=== Product ID Analysis ===")
    print(f"Original URL: {problematic_url}")
    print(f"Encoded ID: {encoded_id}")
    print(f"Decoded ID: {decoded_id}")
    print()
    
    # Analyze the decoded ID format
    print("=== Decoded ID Analysis ===")
    print(f"Length: {len(decoded_id)}")
    print(f"Contains pipe characters: {'|' in decoded_id}")
    
    if '|' in decoded_id:
        parts = decoded_id.split('|')
        print(f"Split by pipes: {parts}")
        print(f"Number of parts: {len(parts)}")
        
        if len(parts) == 3:
            version, item_number, variant = parts
            print(f"  Version: '{version}'")
            print(f"  Item Number: '{item_number}'")
            print(f"  Variant: '{variant}'")
            
            # Check if item number is valid
            try:
                int(item_number)
                print(f"  Item number is numeric: ✓")
                print(f"  This appears to be a valid eBay item ID format")
            except ValueError:
                print(f"  Item number is NOT numeric: ✗")
    
    print()
    print("=== Potential Issues ===")
    
    # Check if the eBay API expects a different format
    print("1. eBay API Item ID Format:")
    print("   - Standard eBay item IDs are typically just the numeric part")
    print("   - The 'v1|...|0' format might be a frontend-specific encoding")
    print("   - The eBay API likely expects just '336064091024'")
    
    print()
    print("2. URL Encoding/Decoding:")
    print("   - React Router automatically decodes URL parameters")
    print("   - %7C becomes | in the product ID parameter")
    print("   - Backend receives 'v1|336064091024|0' not 'v1%7C336064091024%7C0'")
    
    print()
    print("3. Possible Solutions:")
    print("   a) Extract just the numeric part for eBay API calls")
    print("   b) Handle the full format and parse it appropriately")
    print("   c) Check if the original ProductCard is generating correct URLs")
    
    # Test extracting just the numeric part
    if '|' in decoded_id:
        parts = decoded_id.split('|')
        if len(parts) >= 2:
            numeric_part = parts[1]
            print(f"\n=== Extracted Numeric Part ===")
            print(f"Numeric part: {numeric_part}")
            print(f"This should be used for eBay API calls")

if __name__ == "__main__":
    test_product_id_handling()