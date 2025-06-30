import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import productService from "../api/productService";
import { initHomePageAnimations } from "../utils/scrollReveal";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch featured products on component mount
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setError(null);
        
        const response = await productService.getFeaturedProducts(6);
        setFeaturedProducts(response.products);
        setIsLoading(false); // Only set loading false after successful fetch
      } catch (err) {
        console.error("Error fetching featured products:", err);
        setError("Failed to load featured products. Please try again later.");
        
        // Fallback to empty array so the UI doesn't break
        setFeaturedProducts([]);
        setIsLoading(false);
      }
    };

    // Start loading immediately
    fetchFeaturedProducts();
  }, []);

  // Initialize home page animations
  useEffect(() => {
    initHomePageAnimations();
  }, []);

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Retry loading featured products
  const retryFeaturedProducts = () => {
    const fetchFeaturedProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Clear cache to force fresh data on retry
        const cacheKey = 'featured_products_6';
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}_timestamp`);
        
        const response = await productService.getFeaturedProducts(6);
        setFeaturedProducts(response.products);
      } catch (err) {
        console.error("Error fetching featured products:", err);
        setError("Failed to load featured products. Please try again later.");
        setFeaturedProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-blue-700 text-white py-16 px-4 rounded-lg mb-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="hero-title text-4xl font-bold mb-4">
            Find the Best Deals Across the Web
          </h1>
          <p className="hero-subtitle text-xl mb-8">
            Compare prices from AliExpress, eBay, and more in one place.
          </p>

          {/* Main Search Box */}
          <form onSubmit={handleSearch} className="search-container max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for products..."
                className="w-full p-4 pr-12 text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-secondary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-secondary text-white p-2.5 rounded-full hover:bg-yellow-500"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="categories-section mb-12">
        <h2 className="text-2xl font-bold mb-6">Popular Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["Electronics", "Home & Garden", "Fashion", "Toys & Games"].map(
            (category, index) => (
              <div
                key={index}
                className="category-item bg-gray-100 p-4 rounded-lg text-center hover:bg-gray-200 cursor-pointer transition-colors"
                onClick={() => navigate(`/search?category=${category}`)}
              >
                <p className="font-medium">{category}</p>
              </div>
            )
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-section">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Featured Deals</h2>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="h-48 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <svg
                className="mx-auto h-12 w-12 text-red-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h3 className="text-lg font-medium text-red-800 mb-2">
                Unable to Load Featured Products
              </h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={retryFeaturedProducts}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Success State - Show Products */}
        {!isLoading && !error && featuredProducts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <div key={product.product_id} className="featured-product">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && featuredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                No Featured Products Available
              </h3>
              <p className="text-gray-600 mb-4">
                Check back later for the latest deals and trending products.
              </p>
              <button
                onClick={retryFeaturedProducts}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
