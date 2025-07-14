// Enhanced search results layout with filters and sorting
import React, { useState, useEffect } from 'react';
import AdvancedSearchFilters from './AdvancedSearchFilters';
import RecommendationCarousel from '../recommendations/RecommendationCarousel';

const SearchResultsLayout = ({ 
  searchQuery, 
  searchResults = [], 
  loading = false,
  onFiltersChange,
  onLoadMore,
  hasMore = false,
  totalResults = 0
}) => {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showFilters, setShowFilters] = useState(true);
  const [filteredResults, setFilteredResults] = useState(searchResults);
  const [currentFilters, setCurrentFilters] = useState({});

  // Available categories and marketplaces from results
  const availableCategories = [...new Set(searchResults.map(p => p.category).filter(Boolean))];
  const availableMarketplaces = [...new Set(searchResults.map(p => p.marketplace).filter(Boolean))];

  useEffect(() => {
    setFilteredResults(searchResults);
  }, [searchResults]);

  const handleFiltersChange = (filters) => {
    setCurrentFilters(filters);
    const filtered = applyFilters(searchResults, filters);
    setFilteredResults(filtered);
    onFiltersChange && onFiltersChange(filters);
  };

  const applyFilters = (results, filters) => {
    let filtered = [...results];

    // Price range filter
    if (filters.priceRange?.min || filters.priceRange?.max) {
      filtered = filtered.filter(product => {
        const price = product.sale_price || product.original_price || 0;
        const min = parseFloat(filters.priceRange.min) || 0;
        const max = parseFloat(filters.priceRange.max) || Infinity;
        return price >= min && price <= max;
      });
    }

    // Categories filter
    if (filters.categories?.length > 0) {
      filtered = filtered.filter(product => 
        filters.categories.includes(product.category)
      );
    }

    // Marketplaces filter
    if (filters.marketplaces?.length > 0) {
      filtered = filtered.filter(product => 
        filters.marketplaces.includes(product.marketplace)
      );
    }

    // Discount filter
    if (filters.hasDiscount) {
      filtered = filtered.filter(product => 
        product.original_price && product.sale_price && 
        product.original_price > product.sale_price
      );
    }

    // Rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(product => 
        (product.rating || 0) >= filters.minRating
      );
    }

    // Brands filter
    if (filters.brands?.length > 0) {
      filtered = filtered.filter(product => 
        filters.brands.includes(product.brand)
      );
    }

    // Sort results
    filtered = sortResults(filtered, filters.sortBy);

    return filtered;
  };

  const sortResults = (results, sortBy) => {
    const sorted = [...results];
    
    switch (sortBy) {
      case 'price_low':
        return sorted.sort((a, b) => (a.sale_price || a.original_price) - (b.sale_price || b.original_price));
      case 'price_high':
        return sorted.sort((a, b) => (b.sale_price || b.original_price) - (a.sale_price || a.original_price));
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'popularity':
        return sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
      case 'newest':
        return sorted.sort((a, b) => new Date(b.date_added || 0) - new Date(a.date_added || 0));
      case 'discount':
        return sorted.sort((a, b) => {
          const discountA = a.original_price && a.sale_price ? 
            ((a.original_price - a.sale_price) / a.original_price) * 100 : 0;
          const discountB = b.original_price && b.sale_price ? 
            ((b.original_price - b.sale_price) / b.original_price) * 100 : 0;
          return discountB - discountA;
        });
      case 'name_asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'name_desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return sorted; // Keep original order for relevance
    }
  };

  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };

  const calculateDiscount = (original, sale) => {
    if (!original || !sale || original <= sale) return 0;
    return Math.round(((original - sale) / original) * 100);
  };

  const getMarketplaceColor = (marketplace) => {
    const colors = {
      'aliexpress': 'bg-red-100 text-red-800',
      'ebay': 'bg-yellow-100 text-yellow-800',
      'walmart': 'bg-blue-100 text-blue-800',
    };
    return colors[marketplace?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
          
          {/* Filters skeleton */}
          <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
          
          {/* Results skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-gray-200 rounded-lg h-80"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Search Results Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {searchQuery ? `Search results for "${searchQuery}"` : 'All Products'}
          </h1>
          <p className="text-gray-600 mt-1">
            {totalResults > 0 ? `${totalResults.toLocaleString()} products found` : 'No products found'}
            {filteredResults.length !== searchResults.length && 
              ` (${filteredResults.length} after filters)`
            }
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
          </button>

          <div className="border-l border-gray-300 pl-2 ml-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
              title="Grid view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
              title="List view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6">
          <AdvancedSearchFilters
            onFiltersChange={handleFiltersChange}
            availableCategories={availableCategories}
            availableMarketplaces={availableMarketplaces}
            searchResults={searchResults}
          />
        </div>
      )}

      {/* Recommendations (if no search query) */}
      {!searchQuery && (
        <RecommendationCarousel
          title="🎯 Recommended for You"
          subtitle="Based on your browsing history and preferences"
          recommendationType="personal"
          limit={10}
          className="mb-8"
        />
      )}

      {/* Search Results */}
      {filteredResults.length > 0 ? (
        <>
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {filteredResults.map((product, index) => (
              <div
                key={`${product.marketplace}-${product.product_id}`}
                className={
                  viewMode === 'grid'
                    ? 'bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow'
                    : 'bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow flex'
                }
              >
                {/* Product Image */}
                <div className={viewMode === 'grid' ? 'relative' : 'relative w-48 flex-shrink-0'}>
                  <div className={`bg-gray-100 overflow-hidden ${viewMode === 'grid' ? 'h-48 rounded-t-lg' : 'h-full rounded-l-lg'}`}>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400"><span class="text-4xl">📦</span></div>';
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <span className="text-4xl">📦</span>
                      </div>
                    )}

                    {/* Discount badge */}
                    {product.original_price && product.sale_price && product.original_price > product.sale_price && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                        -{calculateDiscount(product.original_price, product.sale_price)}%
                      </div>
                    )}

                    {/* Marketplace badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMarketplaceColor(product.marketplace)}`}>
                        {product.marketplace?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm">
                    {product.title}
                  </h3>

                  {/* Price */}
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg font-bold text-green-600">
                      {formatPrice(product.sale_price || product.original_price)}
                    </span>
                    {product.original_price && product.sale_price && product.original_price > product.sale_price && (
                      <span className="text-sm text-gray-500 line-through">
                        {formatPrice(product.original_price)}
                      </span>
                    )}
                  </div>

                  {/* Rating */}
                  {product.rating && (
                    <div className="flex items-center space-x-1 mb-2">
                      <span className="text-yellow-400">★</span>
                      <span className="text-sm text-gray-600">{product.rating.toFixed(1)}</span>
                      {product.review_count && (
                        <span className="text-sm text-gray-500">({product.review_count})</span>
                      )}
                    </div>
                  )}

                  {/* Shipping */}
                  {product.shipping_cost !== undefined && product.shipping_cost !== null ? (
                    <div className="text-sm text-gray-600 mb-3">
                      {product.shipping_cost === 0 ? (
                        <span className="text-green-600">Free shipping</span>
                      ) : (
                        <span>Shipping: ${parseFloat(product.shipping_cost).toFixed(2)}</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 mb-3">
                      Shipping varies
                    </div>
                  )}

                  {/* Actions */}
                  <div className={`flex ${viewMode === 'list' ? 'flex-col space-y-2' : 'space-x-2'}`}>
                    <a
                      href={product.detail_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-blue-500 text-white text-center py-2 px-3 rounded text-sm hover:bg-blue-600 transition-colors"
                    >
                      View Product
                    </a>
                    <button
                      onClick={() => {
                        // Add to wishlist logic handled by ProductCard component
                      }}
                      className="bg-gray-100 text-gray-700 p-2 rounded hover:bg-gray-200 transition-colors"
                      title="Add to Wishlist"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={onLoadMore}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Load More Products
              </button>
            </div>
          )}
        </>
      ) : (
        // No Results
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery 
              ? `No products match your search for "${searchQuery}"` 
              : 'No products available'
            }
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <p>Try adjusting your search or filters:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check spelling and try different keywords</li>
              <li>Remove some filters to see more results</li>
              <li>Try broader categories or price ranges</li>
              <li>Browse our recommendations instead</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResultsLayout;