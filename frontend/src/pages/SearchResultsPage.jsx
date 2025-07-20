// frontend/src/pages/SearchResultsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import CategoryTreeFilter from "../components/search/CategoryTreeFilter";
import SearchResultsSkeleton, { ProductCardSkeleton, ProductGridSkeleton } from "../components/loading/SearchResultsSkeleton";
import { productService } from "../api/apiServices";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { initSearchPageAnimations } from "../utils/scrollReveal";
import BackButton from "../components/common/BackButton";

/**
 * SearchResultsPage Component with Infinite Scrolling and Full Filters
 *
 * Key React Concepts:
 * 1. Complex State Management - Multiple filter states
 * 2. Derived State - Filters that affect search results
 * 3. useCallback for performance with complex dependencies
 * 4. Controlled Components - All inputs controlled by React state
 */
const SearchResultsPage = () => {
  // Extract search parameters from URL
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  
  // Initialize filter states from URL parameters
  const getInitialPriceRange = () => ({
    min: searchParams.get("min_price") || "",
    max: searchParams.get("max_price") || "",
  });
  
  const getInitialMarketplaceFilters = () => {
    const aliexpress = searchParams.get("aliexpress");
    const ebay = searchParams.get("ebay");
    return {
      aliexpress: aliexpress === null ? true : aliexpress === "true",
      ebay: ebay === null ? true : ebay === "true",
    };
  };
  
  const getInitialSelectedCategories = () => {
    const categoryParam = searchParams.get("categories");
    // Use pipe (|) as delimiter since category names can contain commas
    return categoryParam ? categoryParam.split('|').map(cat => cat.trim()).filter(Boolean) : [];
  };
  const getInitialSortBy = () => searchParams.get("sort") || "price_low";

  // ====== PRODUCT DATA STATE ======
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // Store all products for category tree building
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // ====== UI STATE ======
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isContentReady, setIsContentReady] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState(null);
  

  // ====== FILTER STATE ======
  // Initialize filter states from URL parameters
  const [sortBy, setSortBy] = useState(getInitialSortBy);
  const [priceRange, setPriceRange] = useState(getInitialPriceRange);
  const [marketplaceFilters, setMarketplaceFilters] = useState(getInitialMarketplaceFilters);
  const [selectedCategories, setSelectedCategories] = useState(getInitialSelectedCategories);
  const [availableCategories, setAvailableCategories] = useState([]);

  // ====== FILTER FUNCTIONS ======

  /**
   * Update URL parameters when filters change
   */
  const updateUrlParams = useCallback((newParams) => {
    const currentParams = new URLSearchParams(searchParams);
    
    // Update or remove parameters
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "" || 
          (key === "aliexpress" && value === true) || 
          (key === "ebay" && value === true) ||
          (key === "category_filter" && value === "all") ||
          (key === "sort" && value === "price_low")) {
        // Remove default values to keep URL clean
        currentParams.delete(key);
      } else {
        currentParams.set(key, value.toString());
      }
    });
    
    setSearchParams(currentParams, { replace: true });
  }, [searchParams, setSearchParams]);

  /**
   * Extract categories from products for filter options
   */
  const extractCategories = useCallback((products) => {
    const categorySet = new Set();
    
    products.forEach((product, index) => {
      // Check multiple possible category fields
      const categoryFields = [
        product.categories,
        product.category,
        product.product_category,
        product.item_category
      ];
      
      categoryFields.forEach((categoryData) => {
        if (!categoryData) return;
        
        if (Array.isArray(categoryData)) {
          categoryData.forEach((category) => {
            if (category && typeof category === 'string' && 
                category.trim() !== "" && category !== "N/A" && 
                !category.match(/^\/?\d+\/?\d*$/) && category.length > 1) {
              categorySet.add(category.trim());
            }
          });
        } else if (typeof categoryData === 'object' && categoryData !== null) {
          Object.values(categoryData).forEach((category) => {
            if (category && typeof category === 'string' && 
                category.trim() !== "" && category !== "N/A" && 
                !category.match(/^\/?\d+\/?\d*$/) && category.length > 1) {
              categorySet.add(category.trim());
            }
          });
        } else if (typeof categoryData === 'string') {
          const category = categoryData.trim();
          if (category !== "" && category !== "N/A" && 
              !category.match(/^\/?\d+\/?\d*$/) && category.length > 1) {
            categorySet.add(category);
          }
        }
      });
      
    });
    
    let result = Array.from(categorySet).sort();
    
    // If no categories found, create fallback categories based on common product types
    if (result.length === 0 && products.length > 0) {
      const fallbackCategories = new Set();
      
      products.forEach((product) => {
        const title = (product.title || "").toLowerCase();
        
        // Electronics & Technology
        if (title.includes("cable") || title.includes("charger") || title.includes("adapter") || title.includes("cord") || title.includes("wire")) {
          fallbackCategories.add("Cables & Adapters");
        }
        if (title.includes("phone") || title.includes("mobile") || title.includes("smartphone") || title.includes("iphone") || title.includes("samsung") || title.includes("android")) {
          fallbackCategories.add("Mobile Phones");
        }
        if (title.includes("headphone") || title.includes("earphone") || title.includes("earbuds") || title.includes("airpods") || title.includes("headset")) {
          fallbackCategories.add("Audio & Headphones");
        }
        if (title.includes("case") || title.includes("cover") || title.includes("protector") || title.includes("screen protector") || title.includes("tempered glass")) {
          fallbackCategories.add("Cases & Covers");
        }
        if (title.includes("watch") || title.includes("smartwatch") || title.includes("apple watch") || title.includes("fitbit") || title.includes("garmin")) {
          fallbackCategories.add("Watches & Wearables");
        }
        if (title.includes("laptop") || title.includes("computer") || title.includes("pc") || title.includes("desktop") || title.includes("monitor") || title.includes("keyboard") || title.includes("mouse")) {
          fallbackCategories.add("Computers & Accessories");
        }
        if (title.includes("tablet") || title.includes("ipad") || title.includes("kindle") || title.includes("e-reader")) {
          fallbackCategories.add("Tablets & E-readers");
        }
        if (title.includes("speaker") || title.includes("bluetooth") || title.includes("soundbar") || title.includes("amplifier") || title.includes("subwoofer")) {
          fallbackCategories.add("Speakers & Audio");
        }
        if (title.includes("gaming") || title.includes("game") || title.includes("console") || title.includes("playstation") || title.includes("xbox") || title.includes("nintendo") || title.includes("controller")) {
          fallbackCategories.add("Gaming");
        }
        if (title.includes("camera") || title.includes("photography") || title.includes("lens") || title.includes("tripod") || title.includes("gopro") || title.includes("drone")) {
          fallbackCategories.add("Cameras & Photography");
        }
        if (title.includes("tv") || title.includes("television") || title.includes("projector") || title.includes("streaming") || title.includes("roku") || title.includes("firestick")) {
          fallbackCategories.add("TV & Video");
        }
        if (title.includes("power bank") || title.includes("battery") || title.includes("solar") || title.includes("generator") || title.includes("inverter")) {
          fallbackCategories.add("Power & Batteries");
        }
        if (title.includes("led") || title.includes("lighting") || title.includes("lamp") || title.includes("bulb") || title.includes("strip light") || title.includes("flashlight")) {
          fallbackCategories.add("Lighting");
        }

        // Home & Garden
        if (title.includes("home") || title.includes("kitchen") || title.includes("appliance") || title.includes("microwave") || title.includes("blender") || title.includes("coffee")) {
          fallbackCategories.add("Home & Kitchen");
        }
        if (title.includes("furniture") || title.includes("chair") || title.includes("table") || title.includes("desk") || title.includes("sofa") || title.includes("bed") || title.includes("mattress")) {
          fallbackCategories.add("Furniture");
        }
        if (title.includes("garden") || title.includes("plant") || title.includes("seed") || title.includes("tool") || title.includes("lawn") || title.includes("outdoor")) {
          fallbackCategories.add("Garden & Outdoor");
        }
        if (title.includes("storage") || title.includes("organizer") || title.includes("box") || title.includes("container") || title.includes("shelf") || title.includes("rack")) {
          fallbackCategories.add("Storage & Organization");
        }
        if (title.includes("security") || title.includes("camera") || title.includes("alarm") || title.includes("lock") || title.includes("doorbell") || title.includes("surveillance")) {
          fallbackCategories.add("Security & Surveillance");
        }
        if (title.includes("smart home") || title.includes("alexa") || title.includes("google home") || title.includes("automation") || title.includes("thermostat")) {
          fallbackCategories.add("Smart Home");
        }

        // Fashion & Accessories
        if (title.includes("clothing") || title.includes("shirt") || title.includes("dress") || title.includes("pants") || title.includes("jeans") || title.includes("hoodie") || title.includes("jacket")) {
          fallbackCategories.add("Clothing");
        }
        if (title.includes("shoes") || title.includes("sneakers") || title.includes("boots") || title.includes("sandals") || title.includes("heels") || title.includes("slippers")) {
          fallbackCategories.add("Shoes");
        }
        if (title.includes("bag") || title.includes("backpack") || title.includes("wallet") || title.includes("purse") || title.includes("handbag") || title.includes("luggage") || title.includes("suitcase")) {
          fallbackCategories.add("Bags & Luggage");
        }
        if (title.includes("jewelry") || title.includes("necklace") || title.includes("bracelet") || title.includes("ring") || title.includes("earrings") || title.includes("pendant")) {
          fallbackCategories.add("Jewelry");
        }
        if (title.includes("sunglasses") || title.includes("glasses") || title.includes("eyewear") || title.includes("frames") || title.includes("lens")) {
          fallbackCategories.add("Eyewear");
        }
        if (title.includes("hat") || title.includes("cap") || title.includes("beanie") || title.includes("scarf") || title.includes("gloves") || title.includes("belt")) {
          fallbackCategories.add("Fashion Accessories");
        }

        // Health & Beauty
        if (title.includes("beauty") || title.includes("makeup") || title.includes("cosmetic") || title.includes("lipstick") || title.includes("foundation") || title.includes("mascara")) {
          fallbackCategories.add("Beauty & Cosmetics");
        }
        if (title.includes("skincare") || title.includes("cream") || title.includes("serum") || title.includes("moisturizer") || title.includes("cleanser") || title.includes("mask")) {
          fallbackCategories.add("Skincare");
        }
        if (title.includes("hair") || title.includes("shampoo") || title.includes("conditioner") || title.includes("hair dryer") || title.includes("straightener") || title.includes("curler")) {
          fallbackCategories.add("Hair Care");
        }
        if (title.includes("health") || title.includes("vitamin") || title.includes("supplement") || title.includes("protein") || title.includes("fitness") || title.includes("workout")) {
          fallbackCategories.add("Health & Fitness");
        }
        if (title.includes("massage") || title.includes("spa") || title.includes("aromatherapy") || title.includes("essential oil") || title.includes("diffuser")) {
          fallbackCategories.add("Wellness & Spa");
        }

        // Sports & Recreation
        if (title.includes("sport") || title.includes("exercise") || title.includes("gym") || title.includes("weight") || title.includes("dumbbell") || title.includes("yoga")) {
          fallbackCategories.add("Sports & Exercise");
        }
        if (title.includes("bike") || title.includes("bicycle") || title.includes("cycling") || title.includes("skateboard") || title.includes("scooter")) {
          fallbackCategories.add("Bikes & Cycling");
        }
        if (title.includes("fishing") || title.includes("camping") || title.includes("hiking") || title.includes("tent") || title.includes("sleeping bag") || title.includes("backpack")) {
          fallbackCategories.add("Outdoor Recreation");
        }
        if (title.includes("swimming") || title.includes("pool") || title.includes("beach") || title.includes("swimsuit") || title.includes("goggles")) {
          fallbackCategories.add("Water Sports");
        }

        // Baby & Kids
        if (title.includes("toy") || title.includes("kids") || title.includes("children") || title.includes("doll") || title.includes("puzzle") || title.includes("lego") || title.includes("game")) {
          fallbackCategories.add("Toys & Games");
        }
        if (title.includes("baby") || title.includes("infant") || title.includes("diaper") || title.includes("stroller") || title.includes("car seat") || title.includes("bottle")) {
          fallbackCategories.add("Baby Products");
        }
        if (title.includes("educational") || title.includes("learning") || title.includes("book") || title.includes("school") || title.includes("student") || title.includes("backpack")) {
          fallbackCategories.add("Education & Learning");
        }

        // Automotive
        if (title.includes("car") || title.includes("automotive") || title.includes("vehicle") || title.includes("auto") || title.includes("truck") || title.includes("motorcycle")) {
          fallbackCategories.add("Automotive");
        }
        if (title.includes("tire") || title.includes("wheel") || title.includes("brake") || title.includes("engine") || title.includes("oil") || title.includes("filter")) {
          fallbackCategories.add("Auto Parts");
        }
        if (title.includes("car accessory") || title.includes("phone mount") || title.includes("dash cam") || title.includes("seat cover") || title.includes("floor mat")) {
          fallbackCategories.add("Car Accessories");
        }

        // Tools & Hardware
        if (title.includes("tool") || title.includes("drill") || title.includes("hammer") || title.includes("screwdriver") || title.includes("wrench") || title.includes("saw")) {
          fallbackCategories.add("Tools & Hardware");
        }
        if (title.includes("industrial") || title.includes("construction") || title.includes("safety") || title.includes("equipment") || title.includes("machinery")) {
          fallbackCategories.add("Industrial & Scientific");
        }

        // Crafts & Hobbies
        if (title.includes("craft") || title.includes("sewing") || title.includes("knitting") || title.includes("fabric") || title.includes("thread") || title.includes("needle")) {
          fallbackCategories.add("Crafts & Sewing");
        }
        if (title.includes("art") || title.includes("paint") || title.includes("brush") || title.includes("canvas") || title.includes("drawing") || title.includes("sketch")) {
          fallbackCategories.add("Arts & Crafts");
        }
        if (title.includes("music") || title.includes("instrument") || title.includes("guitar") || title.includes("piano") || title.includes("violin") || title.includes("microphone")) {
          fallbackCategories.add("Musical Instruments");
        }

        // Books & Media
        if (title.includes("book") || title.includes("novel") || title.includes("textbook") || title.includes("ebook") || title.includes("magazine") || title.includes("comic")) {
          fallbackCategories.add("Books & Media");
        }
        if (title.includes("movie") || title.includes("dvd") || title.includes("blu-ray") || title.includes("cd") || title.includes("vinyl") || title.includes("music")) {
          fallbackCategories.add("Movies & Music");
        }

        // Pet Supplies
        if (title.includes("pet") || title.includes("dog") || title.includes("cat") || title.includes("bird") || title.includes("fish") || title.includes("aquarium")) {
          fallbackCategories.add("Pet Supplies");
        }
        if (title.includes("pet food") || title.includes("dog food") || title.includes("cat food") || title.includes("treat") || title.includes("toy") || title.includes("leash")) {
          fallbackCategories.add("Pet Care");
        }

        // Food & Beverages
        if (title.includes("food") || title.includes("snack") || title.includes("tea") || title.includes("coffee") || title.includes("chocolate") || title.includes("candy")) {
          fallbackCategories.add("Food & Beverages");
        }
        if (title.includes("supplement") || title.includes("organic") || title.includes("protein") || title.includes("vitamin") || title.includes("nutrition")) {
          fallbackCategories.add("Health Foods");
        }

        // Office & Business
        if (title.includes("office") || title.includes("desk") || title.includes("chair") || title.includes("printer") || title.includes("paper") || title.includes("pen")) {
          fallbackCategories.add("Office Supplies");
        }
        if (title.includes("business") || title.includes("professional") || title.includes("conference") || title.includes("presentation") || title.includes("meeting")) {
          fallbackCategories.add("Business & Professional");
        }

        // Collectibles & Antiques
        if (title.includes("collectible") || title.includes("vintage") || title.includes("antique") || title.includes("rare") || title.includes("limited edition") || title.includes("memorabilia")) {
          fallbackCategories.add("Collectibles & Antiques");
        }
        if (title.includes("coin") || title.includes("stamp") || title.includes("trading card") || title.includes("figurine") || title.includes("model")) {
          fallbackCategories.add("Collectibles");
        }
      });
      
      result = Array.from(fallbackCategories).sort();
    }
    return result;
  }, []);


  /**
   * Apply client-side filters to products
   * Since your backend doesn't support these filters yet, we'll filter on frontend
   * Later you can move this logic to backend for better performance
   */
  const applyClientFilters = useCallback(
    (products) => {
      return products.filter((product, index) => {
        // Price range filter
        const minPrice = priceRange.min && priceRange.min !== "" ? parseFloat(priceRange.min) : 0;
        const maxPrice = priceRange.max && priceRange.max !== "" ? parseFloat(priceRange.max) : Infinity;
        
        // Get the actual price, ensuring it's a valid number
        let productPrice = parseFloat(product.sale_price || product.original_price || 0);
        if (isNaN(productPrice)) {
          productPrice = 0;
        }

        const priceInRange = productPrice >= minPrice && productPrice <= maxPrice;

        // Marketplace filter - check if this product's marketplace is enabled
        const productMarketplace = product.marketplace?.toLowerCase();
        
        // If no marketplaces are selected, show no products
        const anyMarketplaceEnabled = Object.values(marketplaceFilters).some(enabled => enabled);
        if (!anyMarketplaceEnabled) {
          return false;
        }
        
        // Check if this specific product's marketplace is enabled
        const marketplaceAllowed = marketplaceFilters[productMarketplace] === true;

        // Category filter - handle hierarchical selections
        let categoryMatches = true;
        if (selectedCategories.length > 0) {
          categoryMatches = false;
          
          try {
            // Handle marketplace-specific category hierarchy (same as CategoryTreeFilter)
            let parentCategory = '';
            let childCategory = '';
            
            if (product.categories && typeof product.categories === 'object') {
              if (product.marketplace === 'ebay') {
                // eBay: first_level is child, second_level is parent
                parentCategory = product.categories.second_level || '';
                childCategory = product.categories.first_level || '';
              } else if (product.marketplace === 'aliexpress') {
                // AliExpress: first_level is parent, second_level is child
                parentCategory = product.categories.first_level || '';
                childCategory = product.categories.second_level || '';
              } else {
                // Default fallback for unknown marketplaces
                parentCategory = product.categories.first_level || product.categories.category || '';
                childCategory = product.categories.second_level || '';
              }
            } else if (typeof product.categories === 'string') {
              parentCategory = product.categories;
            } else if (product.category) {
              parentCategory = product.category;
            }
            
            // Clean and validate category names
            parentCategory = parentCategory?.toString().trim() || '';
            childCategory = childCategory?.toString().trim() || '';
            
            
            // Only process valid categories (same validation as CategoryTreeFilter)
            if (parentCategory && parentCategory !== 'N/A' && parentCategory.length > 1) {
                // Check if product matches any selected category paths
                categoryMatches = selectedCategories.some(selectedCategory => {
                  // Handle hierarchical category paths (e.g., "Computer & Office > Laptop Parts & Accessories")
                  if (selectedCategory.includes(' > ')) {
                    const [selectedParent, selectedChild] = selectedCategory.split(' > ');
                    return parentCategory === selectedParent && childCategory === selectedChild;
                  } else {
                    // Handle single-level category selection (parent category)
                    return parentCategory === selectedCategory;
                  }
                });
              }
          } catch (error) {
            console.warn('Category filtering error for product:', product.product_id, error);
            categoryMatches = true; // Include product if category filtering fails
          }
        }

        return priceInRange && marketplaceAllowed && categoryMatches;
      });
    },
    [priceRange.min, priceRange.max, marketplaceFilters.aliexpress, marketplaceFilters.ebay, selectedCategories]
  );

  // ====== SORTING HELPER ======
  
  /**
   * Sort products by price for client-side re-sorting
   */
  const sortProductsByPrice = (products, direction) => {
    const sortedProducts = [...products];
    return sortedProducts.sort((a, b) => {
      const priceA = parseFloat(a.sale_price || a.original_price || 0);
      const priceB = parseFloat(b.sale_price || b.original_price || 0);
      return direction === "high" ? priceB - priceA : priceA - priceB;
    });
  };

  // ====== CORE DATA FETCHING ======

  /**
   * Fetch initial search results (first page)
   * This resets pagination and applies filters
   */
  const fetchInitialProducts = useCallback(async () => {
    if (!query && !category) {
      setProducts([]);
      setAllProducts([]);
      setIsInitialLoading(false);
      setIsContentReady(true);
      return;
    }

    try {
      setIsInitialLoading(true);
      setIsContentReady(false);
      setError(null);
      setCurrentPage(1);
      setHasMore(true);

      const searchQuery = query || category;
      
      // Parse price range values
      const minPrice = priceRange.min ? parseFloat(priceRange.min) : null;
      const maxPrice = priceRange.max ? parseFloat(priceRange.max) : null;
      
      const response = await productService.searchProducts(
        searchQuery,
        sortBy,
        1, // page = 1 for initial load
        50, // LARGER page size to handle thousands of results efficiently
        minPrice,
        maxPrice,
        marketplaceFilters.aliexpress,
        marketplaceFilters.ebay
      );

      // Store all products for category tree building
      setAllProducts(response.results || []);
      
      // Apply client-side filters to the results
      const filteredResults = applyClientFilters(response.results || []);

      setProducts(filteredResults);
      setTotalItems(response.pagination?.total_items || 0);
      setHasMore(response.pagination?.has_next || false);
      
      // Add a small delay to ensure smooth transition
      setTimeout(() => {
        setIsContentReady(true);
        if (isFirstLoad) {
          setIsFirstLoad(false);
        }
      }, 100);
      
    } catch (err) {
      console.error("Error fetching initial products:", err);
      setError(err.message || "Failed to fetch products. Please try again.");
      setProducts([]);
      setAllProducts([]);
      setHasMore(false);
    } finally {
      setIsInitialLoading(false);
    }
  }, [query, category, sortBy, priceRange.min, priceRange.max, marketplaceFilters.aliexpress, marketplaceFilters.ebay, applyClientFilters]);

  /**
   * Fetch more products for infinite scrolling
   * Fetches next page and appends to existing results
   */
  const fetchMoreProducts = useCallback(async () => {
    if (!hasMore || (!query && !category)) {
      return;
    }

    // Add reasonable page limit to prevent infinite loops
    const nextPage = currentPage + 1;
    if (nextPage > 30) {
      console.log('📍 Pagination stopped: Maximum page limit reached (30)');
      setHasMore(false);
      return;
    }

    try {
      const searchQuery = query || category;
      
      // Parse price range values
      const minPrice = priceRange.min ? parseFloat(priceRange.min) : null;
      const maxPrice = priceRange.max ? parseFloat(priceRange.max) : null;
      
      const response = await productService.searchProducts(
        searchQuery,
        sortBy,
        nextPage,
        50, // Same larger page size for efficiency
        minPrice,
        maxPrice,
        marketplaceFilters.aliexpress,
        marketplaceFilters.ebay
      );

      // Check if backend indicates end of results
      const paginationState = response.pagination_state || {};
      
      // If backend indicates end of results, stop pagination
      if (paginationState.end_of_results) {
        console.log('📍 Backend indicates end of results');
        setHasMore(false);
        return;
      }

      // Apply client-side filters to new results
      const filteredNewResults = applyClientFilters(response.results || []);

      // Append filtered results to existing products
      setProducts((prevProducts) => [...prevProducts, ...filteredNewResults]);
      setCurrentPage(nextPage);
      
      // Update hasMore based on backend response
      setHasMore(response.pagination?.has_next || false);
      
    } catch (err) {
      console.error("Error fetching more products:", err);
      
      throw err; // Re-throw for useInfiniteScroll to handle
    }
  }, [query, category, sortBy, currentPage, hasMore, priceRange.min, priceRange.max, marketplaceFilters.aliexpress, marketplaceFilters.ebay, applyClientFilters]);

  // ====== INFINITE SCROLL HOOK ======

  const {
    isLoading: isLoadingMore,
    error: infiniteScrollError,
    targetRef,
    retry: retryInfiniteScroll,
  } = useInfiniteScroll(fetchMoreProducts, {
    enabled: !isInitialLoading && !error,
    hasMore,
    threshold: 400, // Load earlier for smoother experience
  });

  // ====== EFFECTS ======

  /**
   * Refetch when search params or filters change
   * This effect runs when the user changes search, sort, or filters
   */
  useEffect(() => {
    fetchInitialProducts();
  }, [fetchInitialProducts]);

  // Initialize search page animations
  useEffect(() => {
    initSearchPageAnimations();
  }, []);

  // Update available categories when products change
  useEffect(() => {
    const categories = extractCategories(products);
    setAvailableCategories(categories);
  }, [products, extractCategories]);

  // Sync filter state when URL parameters change (for browser back/forward)
  useEffect(() => {
    const urlSort = searchParams.get("sort") || "price_low";
    const urlMinPrice = searchParams.get("min_price") || "";
    const urlMaxPrice = searchParams.get("max_price") || "";
    const urlAliexpress = searchParams.get("aliexpress");
    const urlEbay = searchParams.get("ebay");
    const urlSelectedCategories = searchParams.get("categories");
    // Use pipe (|) as delimiter since category names can contain commas
    const urlCategoriesArray = urlSelectedCategories ? urlSelectedCategories.split('|').map(cat => cat.trim()).filter(Boolean) : [];
    
    // Only update state if values are different to avoid infinite loops
    if (sortBy !== urlSort) setSortBy(urlSort);
    if (priceRange.min !== urlMinPrice || priceRange.max !== urlMaxPrice) {
      setPriceRange({ min: urlMinPrice, max: urlMaxPrice });
    }
    
    const urlMarketplaceFilters = {
      aliexpress: urlAliexpress === null ? true : urlAliexpress === "true",
      ebay: urlEbay === null ? true : urlEbay === "true",
    };
    
    if (marketplaceFilters.aliexpress !== urlMarketplaceFilters.aliexpress || 
        marketplaceFilters.ebay !== urlMarketplaceFilters.ebay) {
      setMarketplaceFilters(urlMarketplaceFilters);
    }
    
    // Check if categories arrays are different
    const categoriesChanged = selectedCategories.length !== urlCategoriesArray.length ||
      selectedCategories.some(cat => !urlCategoriesArray.includes(cat));
    if (categoriesChanged) setSelectedCategories(urlCategoriesArray);
  }, [searchParams.toString()]); // Use toString() to avoid dependency on searchParams object

  // ====== EVENT HANDLERS ======

  /**
   * Handle sort change - refetch from beginning
   */
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    updateUrlParams({ sort: newSortBy });
    // fetchInitialProducts will automatically run due to dependency
  };

  /**
   * Handle price range filter changes
   */
  const handlePriceRangeChange = (field, value) => {
    const newPriceRange = { ...priceRange, [field]: value };
    setPriceRange(newPriceRange);
    updateUrlParams({ 
      min_price: newPriceRange.min, 
      max_price: newPriceRange.max 
    });
    // Effect will trigger re-filter of current results
  };

  /**
   * Handle marketplace filter changes
   */
  const handleMarketplaceChange = (marketplace, checked) => {
    const newMarketplaceFilters = { ...marketplaceFilters, [marketplace]: checked };
    setMarketplaceFilters(newMarketplaceFilters);
    updateUrlParams({ 
      aliexpress: newMarketplaceFilters.aliexpress,
      ebay: newMarketplaceFilters.ebay
    });
    // Effect will trigger re-filter of current results
  };

  /**
   * Handle hierarchical category changes
   */
  const handleCategoryChange = (categories) => {
    setSelectedCategories(categories);
    // Use pipe (|) as delimiter since category names can contain commas
    updateUrlParams({ categories: categories.join('|') });
    // Effect will trigger re-filter of current results
  };

  /**
   * Reset all filters to default state
   */
  const resetFilters = () => {
    const defaultFilters = {
      min: "",
      max: "",
    };
    const defaultMarketplaceFilters = {
      aliexpress: true,
      ebay: true,
    };
    const defaultCategory = "all";
    const defaultSort = "price_low";
    
    setPriceRange(defaultFilters);
    setMarketplaceFilters(defaultMarketplaceFilters);
    setSelectedCategories([]);
    setSortBy(defaultSort);
    
    // Clear all filter parameters from URL
    updateUrlParams({
      min_price: "",
      max_price: "",
      aliexpress: true,
      ebay: true,
      categories: "",
      sort: "price_low"
    });
  };

  /**
   * Retry function for initial load errors
   */
  const handleRetry = () => {
    setError(null);
    fetchInitialProducts();
  };
  

  // ====== DERIVED VALUES ======

  /**
   * Apply client-side sorting to products
   */
  const applySorting = useCallback((products, sortOption) => {
    const sortedProducts = [...products];
    
    switch (sortOption) {
      case "price_low":
        return sortedProducts.sort((a, b) => {
          const priceA = parseFloat(a.sale_price || a.original_price || 0);
          const priceB = parseFloat(b.sale_price || b.original_price || 0);
          return priceA - priceB;
        });
        
      case "price_high":
        return sortedProducts.sort((a, b) => {
          const priceA = parseFloat(a.sale_price || a.original_price || 0);
          const priceB = parseFloat(b.sale_price || b.original_price || 0);
          return priceB - priceA;
        });
        
      case "sold_high":
        return sortedProducts.sort((a, b) => {
          const soldA = parseInt(a.sold_count || 0);
          const soldB = parseInt(b.sold_count || 0);
          return soldB - soldA;
        });
        
      default:
        return sortedProducts;
    }
  }, []);

  /**
   * Apply filters to currently loaded products for display
   * This gives immediate feedback when filters change
   */
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = applyClientFilters(products);
    
    // Apply sorting based on sortBy option
    if (sortBy === "price_high") {
      return sortProductsByPrice(filtered, "high");
    } else if (sortBy === "price_low") {
      return sortProductsByPrice(filtered, "low");
    } else {
      // For other sorting options, just return filtered (backend already sorted)
      return filtered;
    }
  }, [products, applyClientFilters, sortBy]);
  const combinedError = error || infiniteScrollError;

  // Show full page skeleton on first load
  if (isFirstLoad && (isInitialLoading || !isContentReady)) {
    return (
      <div>
        <SearchResultsSkeleton showHeader={true} />
      </div>
    );
  }

  return (
    <div>
      {/* Back Button */}
      <div className="mb-4">
        <BackButton />
      </div>
      
      {/* Search Results Header */}
      <div className="search-results-header mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {query
            ? `Search results for "${query}"`
            : category
            ? `Browsing ${category}`
            : "All Products"}
        </h1>
        <p className="text-gray-600">
          {isInitialLoading
            ? "Searching..."
            : error
            ? "Search failed"
            : "Discover products from multiple marketplaces"}
        </p>
      </div>

      {/* Error State for Initial Load */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={handleRetry}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Search Results Layout */}
      <div className={`flex flex-col md:flex-row gap-6 ${isFirstLoad ? 'fade-in opacity-0' : 'opacity-100'}`}>
        {/* Filters Sidebar - RESTORED ORIGINAL FUNCTIONALITY */}
        <div className={`w-full md:w-1/4 ${isFirstLoad ? 'fade-in stagger-1' : ''}`}>
          <div className="filters-sidebar bg-white rounded-lg shadow p-4">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Filters</h2>
              <button
                onClick={resetFilters}
                className="text-primary text-sm hover:underline"
              >
                Reset all filters
              </button>
            </div>

            {/* Price Range Filter - RESTORED */}
            <div className="price-filter mb-6">
              <h3 className="font-medium mb-2">Price Range</h3>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label
                    htmlFor="min-price"
                    className="block text-sm text-gray-600 mb-1"
                  >
                    Min
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      id="min-price"
                      placeholder="0"
                      value={priceRange.min}
                      onChange={(e) =>
                        handlePriceRangeChange("min", e.target.value)
                      }
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="max-price"
                    className="block text-sm text-gray-600 mb-1"
                  >
                    Max
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      id="max-price"
                      placeholder="Any"
                      value={priceRange.max}
                      onChange={(e) =>
                        handlePriceRangeChange("max", e.target.value)
                      }
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Hierarchical Category Filter */}
            <div className="category-filter mb-6">
              <CategoryTreeFilter 
                searchResults={allProducts}
                selectedCategories={selectedCategories}
                onCategoryChange={handleCategoryChange}
              />
            </div>

            {/* Marketplace Filter - RESTORED */}
            <div className="marketplace-filter mb-6">
              <h3 className="font-medium mb-2">Marketplace</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={marketplaceFilters.aliexpress}
                    onChange={(e) =>
                      handleMarketplaceChange("aliexpress", e.target.checked)
                    }
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">AliExpress</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={marketplaceFilters.ebay}
                    onChange={(e) =>
                      handleMarketplaceChange("ebay", e.target.checked)
                    }
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">eBay</span>
                </label>
              </div>
            </div>

            {/* Apply Filters Button - Visual feedback only since filters apply automatically */}
            <div className="text-center text-sm text-gray-600">
              Filters are applied automatically
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`w-full md:w-3/4 ${isFirstLoad ? 'fade-in stagger-2' : ''}`}>
          {/* Sort Controls - RESTORED original design */}
          <div className="sort-controls flex justify-between items-center mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              {isInitialLoading
                ? "Loading..."
                : hasMore 
                  ? `Found ${filteredAndSortedProducts.length}+ products`
                  : `Found ${filteredAndSortedProducts.length} products`}
            </div>
            <div className="flex items-center">
              <span className="text-sm mr-2">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                disabled={isInitialLoading}
                className="text-sm border-gray-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="sold_high">Most Sold</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {isInitialLoading || !isContentReady ? (
            <ProductGridSkeleton />
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-xl font-medium mb-4">Something went wrong</p>
              <p className="text-gray-600 mb-6">
                We couldn't load the search results. Please try again.
              </p>
              <button
                onClick={handleRetry}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredAndSortedProducts.length > 0 ? (
            <>
              {/* Products Grid */}
              <div className={`search-results-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch fade-in ${isContentReady ? 'opacity-100' : 'opacity-0'}`}>
                {filteredAndSortedProducts.map((product, index) => {
                  
                  return (
                    <div key={`${product.product_id}-${product.marketplace}-${index}`} className={`search-result-item fade-in stagger-${Math.min(index % 4 + 1, 4)}`}>
                      <ProductCard
                        product={product}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Infinite Scroll Target and Loading States */}
              <div className="pagination-area mt-8">
                {hasMore ? (
                  <div
                    ref={targetRef}
                    className="flex justify-center items-center py-8"
                  >
                    {isLoadingMore ? (
                      <div className="w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                          {[...Array(6)].map((_, i) => (
                            <ProductCardSkeleton key={i} />
                          ))}
                        </div>
                        <div className="flex justify-center">
                          <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                            <span className="text-gray-600">
                              Loading more products...
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : infiniteScrollError ? (
                      <div className="text-center">
                        <p className="text-red-600 mb-2">
                          Failed to load more products
                        </p>
                        <button
                          onClick={retryInfiniteScroll}
                          className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : (
                      <div className="h-4 bg-transparent" />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      You've reached the end! 🎉 No more products to show.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-results text-center py-12">
              <p className="text-xl font-medium mb-4">No products found</p>
              <p className="text-gray-600 mb-6">
                Try adjusting your search or filter criteria
              </p>
              <button
                onClick={() => window.history.back()}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
