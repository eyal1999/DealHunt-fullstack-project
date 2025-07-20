import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import productService from "../api/productService";
import { initHomePageAnimations } from "../utils/scrollReveal";
import SearchDropdown from "../components/search/SearchDropdown";
import RecentlyViewedSection from "../components/home/RecentlyViewedSection";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState('mixed');
  const navigate = useNavigate();

  // Fetch featured products on component mount
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setError(null);
        setFeaturedProducts([]); // Clear products to show loading skeleton
        
        const response = await productService.getFeaturedProducts(6, 1, selectedMarketplace);
        setFeaturedProducts(response.products);
        setCurrentPage(response.page || 1);
        setHasNextPage(response.hasNextPage || false);
        setIsLoading(false);
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
  }, [selectedMarketplace]);

  // Initialize home page animations
  useEffect(() => {
    initHomePageAnimations();
  }, []);

  // Handle search submission
  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  // Load more featured products
  const loadMoreProducts = async () => {
    if (!hasNextPage || isLoadingMore) return;
    
    try {
      setIsLoadingMore(true);
      
      const nextPage = currentPage + 1;
      const response = await productService.getFeaturedProducts(6, nextPage, selectedMarketplace, false); // Don't use cache for load more
      
      // Append new products to existing ones
      setFeaturedProducts(prev => [...prev, ...response.products]);
      setCurrentPage(response.page || nextPage);
      setHasNextPage(response.hasNextPage || false);
      
    } catch (err) {
      console.error("Error loading more products:", err);
      // Don't show error for load more failures, just stop loading
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  // Retry loading featured products
  const retryFeaturedProducts = () => {
    const fetchFeaturedProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setCurrentPage(1);
        setFeaturedProducts([]); // Clear existing products
        
        // Clear all related cache to force fresh hot deals
        ['mixed', 'aliexpress', 'ebay'].forEach(marketplace => {
          for (let page = 1; page <= 10; page++) {
            const cacheKey = `featured_deals_6_${page}_${marketplace}`;
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(`${cacheKey}_timestamp`);
          }
        });
        
        const response = await productService.getFeaturedProducts(6, 1, selectedMarketplace, false);
        setFeaturedProducts(response.products);
        setCurrentPage(response.page || 1);
        setHasNextPage(response.hasNextPage || false);
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
  
  // Handle marketplace filter change
  const handleMarketplaceChange = (marketplace) => {
    if (marketplace !== selectedMarketplace) {
      setIsLoading(true);
      setSelectedMarketplace(marketplace);
      setCurrentPage(1);
      setError(null);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-blue-700 text-white py-16 px-4 rounded-lg mb-12 relative z-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="hero-title text-4xl font-bold mb-4">
            Find the Best Deals Across the Web
          </h1>
          <p className="hero-subtitle text-xl mb-8">
            Compare prices from AliExpress, eBay, and more in one place.
          </p>

          {/* Main Search Box */}
          <div className="search-container max-w-xl mx-auto relative z-[10000]">
            <SearchDropdown
              searchQuery={searchQuery}
              onSearch={handleSearch}
              onQueryChange={setSearchQuery}
              placeholder="Search for products..."
              className="w-full"
              variant="hero"
            />
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="categories-section mb-12 relative z-10">
        <h2 className="text-2xl font-bold mb-6">Popular Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["Electronics", "Home & Garden", "Fashion", "Toys & Games"].map(
            (category, index) => (
              <div
                key={index}
                className="category-item bg-gray-100 p-4 rounded-lg text-center hover:bg-gray-200 cursor-pointer transition-colors relative z-10"
                onClick={() => navigate(`/search?category=${category}`)}
              >
                <p className="font-medium">{category}</p>
              </div>
            )
          )}
        </div>
        
        {/* Explore All Categories Button */}
        <div className="text-center mt-6">
          <button 
            onClick={() => navigate('/categories')}
            className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            Explore All Categories
          </button>
        </div>
      </section>

      {/* Recently Viewed Section */}
      <RecentlyViewedSection />

      {/* Featured Hot Deals */}
      <section className="featured-section">
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold">🔥 Featured Hot Deals</h2>
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                TRENDING NOW
              </span>
            </div>
            
            {/* Marketplace Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 font-medium">From:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { value: 'mixed', label: '🌍 Mixed', desc: 'Best from both' },
                  { value: 'aliexpress', label: 'AliExpress', desc: 'Hot products' },
                  { value: 'ebay', label: 'eBay', desc: 'Trending items' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleMarketplaceChange(option.value)}
                    disabled={isLoading}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group ${
                      selectedMarketplace === option.value
                        ? 'bg-white shadow-sm'
                        : 'hover:bg-gray-50'
                    } disabled:opacity-50`}
                    title={option.desc}
                  >
                    {option.value === 'mixed' ? (
                      <span className={selectedMarketplace === option.value ? 'text-primary' : 'text-gray-600'}>
                        {option.label}
                      </span>
                    ) : option.value === 'aliexpress' ? (
                      <span className={`font-bold text-orange-500 ${selectedMarketplace === option.value ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                        {option.label}
                      </span>
                    ) : option.value === 'ebay' ? (
                      <span className={`font-bold ${selectedMarketplace === option.value ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                        <span className="text-blue-600">e</span>
                        <span className="text-red-500">b</span>
                        <span className="text-yellow-500">a</span>
                        <span className="text-green-500">y</span>
                      </span>
                    ) : (
                      option.label
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <p className="text-gray-600 mt-2">
            Limited-time offers from trending products with the biggest discounts
            {selectedMarketplace === 'mixed' && ' across multiple marketplaces'}
            {selectedMarketplace === 'aliexpress' && ' from AliExpress hot products'}
            {selectedMarketplace === 'ebay' && ' from eBay trending auctions'}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
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

        {/* Success State - Show Hot Deals */}
        {!isLoading && !error && featuredProducts.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {featuredProducts.map((product, index) => (
                <div key={`${product.product_id}-${product.marketplace}-${index}`} className="featured-product relative group">
                  {/* Enhanced ProductCard for hot deals */}
                  <div className="transform transition-transform duration-200 group-hover:scale-105">
                    <ProductCard product={product} />
                  </div>
                  
                  {/* Watch count information for eBay items */}
                  {product.watch_count > 0 && product.marketplace === 'ebay' && (
                    <div className="absolute bottom-2 right-2 z-10">
                      <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
                        {product.watch_count} watching
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Load More Section */}
            <div className="mt-8 text-center">
              {hasNextPage && (
                <button
                  onClick={loadMoreProducts}
                  disabled={isLoadingMore}
                  className="bg-gradient-to-r from-primary to-blue-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoadingMore ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>Loading More Deals...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>🔥 Load More Hot Deals</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </button>
              )}
              
              {!hasNextPage && featuredProducts.length >= 6 && (
                <div className="text-gray-500 text-sm">
                  ✨ You've seen all the hottest deals! Check back later for more.
                </div>
              )}
            </div>
          </>
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
                No Hot Deals Available
              </h3>
              <p className="text-gray-600 mb-4">
                Check back later for the latest trending deals with amazing discounts.
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
