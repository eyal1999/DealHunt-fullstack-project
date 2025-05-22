import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import { productService } from "../api/apiServices";

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";

  // React State - these are the "reactive" variables that trigger re-renders
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [sortBy, setSortBy] = useState("price_low");
  const [error, setError] = useState(null);

  // useEffect Hook - runs side effects (like API calls) when dependencies change
  useEffect(() => {
    const fetchProducts = async () => {
      // Only search if we have a query or category
      if (!query && !category) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log("Fetching products with query:", query, "sort:", sortBy);

        // Call the real API using our productService
        const searchQuery = query || category;
        const response = await productService.searchProducts(
          searchQuery,
          sortBy
        );

        console.log("API Response:", response);

        // Update state with the API response
        // The response should have a 'results' array based on your backend SearchResponse model
        setProducts(response.results || []);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError(err.message || "Failed to fetch products. Please try again.");
        setProducts([]);
      } finally {
        // This runs regardless of success or failure
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [query, category, sortBy]); // Dependencies - effect runs when any of these change

  // Handle sorting change - this is an event handler function
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    // The useEffect will automatically run again because sortBy is in its dependencies
  };

  // Retry function for error state
  const handleRetry = () => {
    setError(null);
    // Trigger useEffect to run again by changing a dependency
    setSortBy(sortBy); // This will trigger re-fetch
  };

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
          {isLoading
            ? "Searching..."
            : error
            ? "Search failed"
            : `Found ${products.length} products`}
        </p>
      </div>

      {/* Error State */}
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
        {/* Filters Sidebar */}
        <div className="w-full md:w-1/4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Filters</h2>
              <button className="text-primary text-sm hover:underline">
                Reset all filters
              </button>
            </div>

            {/* Price Range Filter */}
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
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Marketplace Filter */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Marketplace</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={true}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">AliExpress</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={true}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">eBay</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">Amazon (Coming Soon)</span>
                </label>
              </div>
            </div>

            {/* Apply Filters Button */}
            <button className="w-full bg-primary text-white py-2 rounded hover:bg-blue-700">
              Apply Filters
            </button>
          </div>
        </div>

        {/* Product Results */}
        <div className="w-full md:w-3/4">
          {/* Sort Controls */}
          <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              {isLoading ? "Loading..." : `Showing ${products.length} results`}
            </div>
            <div className="flex items-center">
              <span className="text-sm mr-2">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                disabled={isLoading}
                className="text-sm border-gray-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (
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
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
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
