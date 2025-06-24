// frontend/src/pages/SearchResultsPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import { productService } from "../api/apiServices";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";

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
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";

  // ====== PRODUCT DATA STATE ======
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // ====== UI STATE ======
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  // ====== FILTER STATE ======
  // Sorting state
  const [sortBy, setSortBy] = useState("price_low");

  // Price range filter state
  const [priceRange, setPriceRange] = useState({
    min: "",
    max: "",
  });

  // Marketplace filter state - each marketplace can be toggled
  const [marketplaceFilters, setMarketplaceFilters] = useState({
    aliexpress: true,
    ebay: true,
    amazon: false, // Coming soon, so disabled
  });

  // ====== FILTER FUNCTIONS ======

  /**
   * Apply client-side filters to products
   * Since your backend doesn't support these filters yet, we'll filter on frontend
   * Later you can move this logic to backend for better performance
   */
  const applyClientFilters = useCallback(
    (products) => {
      return products.filter((product) => {
        // Price range filter
        const minPrice = priceRange.min ? parseFloat(priceRange.min) : 0;
        const maxPrice = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        const productPrice = product.sale_price || product.original_price;

        const priceInRange =
          productPrice >= minPrice && productPrice <= maxPrice;

        // Marketplace filter
        const marketplaceAllowed =
          marketplaceFilters[product.marketplace] || false;

        return priceInRange && marketplaceAllowed;
      });
    },
    [priceRange, marketplaceFilters]
  );

  // ====== CORE DATA FETCHING ======

  /**
   * Fetch initial search results (first page)
   * This resets pagination and applies filters
   */
  const fetchInitialProducts = useCallback(async () => {
    if (!query && !category) {
      setProducts([]);
      setIsInitialLoading(false);
      return;
    }

    try {
      setIsInitialLoading(true);
      setError(null);
      setCurrentPage(1);
      setHasMore(true);

      console.log(
        "Fetching initial products with query:",
        query,
        "sort:",
        sortBy
      );

      const searchQuery = query || category;
      const response = await productService.searchProducts(
        searchQuery,
        sortBy,
        1, // page = 1 for initial load
        12 // SMALLER page size for more pages = better infinite scroll experience
      );

      console.log("Initial API Response:", response);

      // Apply client-side filters to the results
      const filteredResults = applyClientFilters(response.results || []);

      setProducts(filteredResults);
      setTotalItems(response.pagination?.total_items || 0);
      setHasMore(response.pagination?.has_next || false);
    } catch (err) {
      console.error("Error fetching initial products:", err);
      setError(err.message || "Failed to fetch products. Please try again.");
      setProducts([]);
      setHasMore(false);
    } finally {
      setIsInitialLoading(false);
    }
  }, [query, category, sortBy, applyClientFilters]);

  /**
   * Fetch more products for infinite scrolling
   * Fetches next page and appends to existing results
   */
  const fetchMoreProducts = useCallback(async () => {
    if (!hasMore || (!query && !category)) {
      return;
    }

    try {
      const nextPage = currentPage + 1;
      console.log(`Fetching page ${nextPage} for query:`, query);

      const searchQuery = query || category;
      const response = await productService.searchProducts(
        searchQuery,
        sortBy,
        nextPage,
        12 // Same small page size
      );

      console.log(`Page ${nextPage} API Response:`, response);

      // Apply client-side filters to new results
      const filteredNewResults = applyClientFilters(response.results || []);

      // Append filtered results to existing products
      setProducts((prevProducts) => [...prevProducts, ...filteredNewResults]);
      setCurrentPage(nextPage);
      setHasMore(response.pagination?.has_next || false);
    } catch (err) {
      console.error("Error fetching more products:", err);
      throw err; // Re-throw for useInfiniteScroll to handle
    }
  }, [query, category, sortBy, currentPage, hasMore, applyClientFilters]);

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

  // ====== EVENT HANDLERS ======

  /**
   * Handle sort change - refetch from beginning
   */
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    // fetchInitialProducts will automatically run due to dependency
  };

  /**
   * Handle price range filter changes
   */
  const handlePriceRangeChange = (field, value) => {
    setPriceRange((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Effect will trigger re-filter of current results
  };

  /**
   * Handle marketplace filter changes
   */
  const handleMarketplaceChange = (marketplace, checked) => {
    setMarketplaceFilters((prev) => ({
      ...prev,
      [marketplace]: checked,
    }));
    // Effect will trigger re-filter of current results
  };

  /**
   * Reset all filters to default state
   */
  const resetFilters = () => {
    setPriceRange({ min: "", max: "" });
    setMarketplaceFilters({
      aliexpress: true,
      ebay: true,
      amazon: false,
    });
    setSortBy("price_low");
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
   * Apply filters to currently loaded products for display
   * This gives immediate feedback when filters change
   */
  const filteredProducts = applyClientFilters(products);
  const combinedError = error || infiniteScrollError;

  return (
    <div>
      {/* Search Results Header */}
      <div className="mb-6">
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
            : `Found ${totalItems} products${
                filteredProducts.length !== products.length
                  ? ` (${filteredProducts.length} after filters)`
                  : ""
              }`}
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
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Sidebar - RESTORED ORIGINAL FUNCTIONALITY */}
        <div className="w-full md:w-1/4">
          <div className="bg-white rounded-lg shadow p-4">
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
            <div className="mb-6">
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

            {/* Marketplace Filter - RESTORED */}
            <div className="mb-6">
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
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={marketplaceFilters.amazon}
                    onChange={(e) =>
                      handleMarketplaceChange("amazon", e.target.checked)
                    }
                    disabled={true}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-500">
                    Amazon (Coming Soon)
                  </span>
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
        <div className="w-full md:w-3/4">
          {/* Sort Controls - RESTORED original design */}
          <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              {isInitialLoading
                ? "Loading..."
                : `Showing ${filteredProducts.length} of ${totalItems} results`}
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
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {isInitialLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
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
          ) : filteredProducts.length > 0 ? (
            <>
              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={`${product.product_id}-${product.marketplace}-${index}`}
                    product={product}
                  />
                ))}
              </div>

              {/* Infinite Scroll Target and Loading States */}
              <div className="mt-8">
                {hasMore ? (
                  <div
                    ref={targetRef}
                    className="flex justify-center items-center py-8"
                  >
                    {isLoadingMore ? (
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        <span className="text-gray-600">
                          Loading more products...
                        </span>
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
            <div className="text-center py-12">
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
