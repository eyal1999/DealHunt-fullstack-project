import React, { useState, useEffect } from 'react';
import ProductCard from '../product/ProductCard';

const ProductRecommendations = ({ 
  product, 
  marketplace = 'aliexpress' 
}) => {
  const [allRecommendations, setAllRecommendations] = useState([]);
  const [displayedRecommendations, setDisplayedRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('similar');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [searchOffsets, setSearchOffsets] = useState({
    ebay: 0,
    aliexpress: 0
  });
  
  const PRODUCTS_PER_PAGE = 6;
  const INITIAL_FETCH_SIZE = 12; // Initial products to fetch
  const LOAD_MORE_SIZE = 12; // Additional products to fetch on load more

  useEffect(() => {
    if (!product) {
      setLoading(false);
      return;
    }

    // Reset state when product changes
    setAllRecommendations([]);
    setDisplayedRecommendations([]);
    setCurrentPage(1);
    setActiveTab('similar');
    setCanLoadMore(true);
    setSearchOffsets({ ebay: 0, aliexpress: 0 });

    // Add a delay to prevent blocking page load
    const timeoutId = setTimeout(() => {
      fetchRecommendations();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [product]);

  // Update displayed recommendations when filters change
  useEffect(() => {
    filterAndPaginateRecommendations();
  }, [allRecommendations, activeTab, currentPage]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);


      // Extract category from product specifications or use a default
      const category = product.specifications?.Category || 
                     product.specifications?.category || 
                     product.categories?.first_level || 
                     'electronics';

      const recommendations = [];

      // Fetch AliExpress recommendations if original product is from AliExpress
      if (marketplace === 'aliexpress') {
        try {
          // Validate required parameters
          const productId = product.product_id;
          const title = product.title;
          const price = product.sale_price || product.original_price;
          
          if (!productId || !title || !price) {
            console.warn('Missing required parameters for AliExpress recommendations');
            return;
          }
          
          // Ensure price is a valid number
          const numericPrice = parseFloat(price);
          if (isNaN(numericPrice) || numericPrice <= 0) {
            console.warn('Invalid price for AliExpress recommendations:', price);
            return;
          }
          
          const aliResponse = await fetch(
            `/api/recommendations/aliexpress/comprehensive/${productId}?` +
            `product_title=${encodeURIComponent(title)}&` +
            `current_price=${numericPrice}&` +
            `category=${encodeURIComponent(category)}&` +
            `limit_per_type=8`,
            {
              signal: AbortSignal.timeout(10000)
            }
          );

          if (aliResponse.ok) {
            const aliData = await aliResponse.json();
            if (aliData.success && aliData.recommendations && aliData.recommendations.similar_products) {
              // Add only similar products
              const similarProducts = aliData.recommendations.similar_products.products.map(p => ({
                ...p,
                recommendation_type: 'similar',
                source_marketplace: 'aliexpress'
              }));
              
              recommendations.push(...similarProducts);
            }
          } else {
            console.warn('AliExpress recommendations API returned error:', aliResponse.status);
          }
        } catch (err) {
          console.warn('AliExpress recommendations failed:', err);
        }
      }

      // Always fetch eBay recommendations for more variety
      try {
        const ebayResult = await fetchEbayRecommendations(product.title, INITIAL_FETCH_SIZE, 0);
        recommendations.push(...ebayResult.products);
        
        // Update search offsets and tracking
        setSearchOffsets(prev => ({
          ...prev,
          ebay: INITIAL_FETCH_SIZE
        }));
        
        // Check if we can load more
        const hasMoreEbay = ebayResult.hasMore;
        
        // Also try to get AliExpress recommendations
        const aliResult = await fetchAliExpressSearchRecommendations(product.title, INITIAL_FETCH_SIZE, 0);
        recommendations.push(...aliResult.products);
        
        setSearchOffsets(prev => ({
          ...prev,
          aliexpress: INITIAL_FETCH_SIZE
        }));
        
        const hasMoreAli = aliResult.hasMore;
        
        // Set overall load more capability
        setCanLoadMore(hasMoreEbay || hasMoreAli);
        
      } catch (err) {
        console.warn('Recommendations failed:', err);
        setCanLoadMore(false);
      }

      
      // Balance recommendations with 1:1 ratio of AliExpress:eBay
      const balancedRecommendations = balanceProductRatio(recommendations);
      setAllRecommendations(balancedRecommendations);
      

    } catch (err) {
      console.error('Error fetching recommendations:', err);
      
      // Handle different types of errors
      if (err.name === 'AbortError') {
        setError('Recommendations timed out');
      } else if (err.message.includes('503')) {
        setError('Recommendations service temporarily unavailable');
      } else {
        setError('Unable to load recommendations');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEbayRecommendations = async (productTitle, pageSize = INITIAL_FETCH_SIZE, offset = 0) => {
    // Generate eBay recommendations by searching for similar products
    try {
      const keywords = extractKeywords(productTitle);
      const searchQuery = keywords.join(' ');
      
      const page = Math.floor(offset / pageSize) + 1;
      
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&ebay=true&aliexpress=false&page_size=${pageSize}&page=${page}`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (response.ok) {
        const data = await response.json();
        const products = data.results || [];
        
        // Only return similar products, no trending
        const similarProducts = products.map(p => ({
          ...p,
          recommendation_type: 'similar',
          source_marketplace: 'ebay'
        }));
        
        return {
          products: similarProducts,
          hasMore: products.length === pageSize // If we got full page, there might be more
        };
      }
    } catch (err) {
      console.warn('eBay search for recommendations failed:', err);
    }
    return { products: [], hasMore: false };
  };

  const fetchAliExpressSearchRecommendations = async (productTitle, pageSize = INITIAL_FETCH_SIZE, offset = 0) => {
    // Generate AliExpress recommendations by searching for similar products
    try {
      const keywords = extractKeywords(productTitle);
      const searchQuery = keywords.join(' ');
      
      const page = Math.floor(offset / pageSize) + 1;
      
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&ebay=false&aliexpress=true&page_size=${pageSize}&page=${page}`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (response.ok) {
        const data = await response.json();
        const products = data.results || [];
        
        // Only return similar products, no trending
        const similarProducts = products.map(p => ({
          ...p,
          recommendation_type: 'similar',
          source_marketplace: 'aliexpress'
        }));
        
        return {
          products: similarProducts,
          hasMore: products.length === pageSize // If we got full page, there might be more
        };
      }
    } catch (err) {
      console.warn('AliExpress search for recommendations failed:', err);
    }
    return { products: [], hasMore: false };
  };

  const extractKeywords = (title) => {
    // Enhanced keyword extraction for better similarity
    const stopWords = new Set(['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'pro', 'max', 'plus', 'new', 'brand']);
    
    // Clean the title and extract meaningful keywords
    let cleaned = title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(iphone|samsung|galaxy|phone|case|cover|protector|screen|protective)\s*(case|cover|protector|screen|protective)?\b/g, (match) => {
        // Keep important product type words together
        return match.replace(/\s+/g, ' ').trim();
      })
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = cleaned.split(' ')
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 4); // Use fewer but more relevant keywords
    
    // Prioritize product-specific terms
    const productTerms = ['iphone', 'samsung', 'galaxy', 'case', 'cover', 'protector', 'phone'];
    const prioritized = words.filter(word => productTerms.some(term => word.includes(term)));
    const others = words.filter(word => !productTerms.some(term => word.includes(term)));
    
    return [...prioritized, ...others].slice(0, 4);
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const balanceProductRatio = (products) => {
    // Separate products by marketplace
    const aliexpressProducts = products.filter(p => p.source_marketplace === 'aliexpress');
    const ebayProducts = products.filter(p => p.source_marketplace === 'ebay');
    
    // Shuffle each group individually
    const shuffledAliexpress = shuffleArray(aliexpressProducts);
    const shuffledEbay = shuffleArray(ebayProducts);
    
    // Interleave products to maintain 1:1 ratio
    const balanced = [];
    const maxLength = Math.max(shuffledAliexpress.length, shuffledEbay.length);
    
    for (let i = 0; i < maxLength; i++) {
      // Add AliExpress product if available
      if (i < shuffledAliexpress.length) {
        balanced.push(shuffledAliexpress[i]);
      }
      // Add eBay product if available
      if (i < shuffledEbay.length) {
        balanced.push(shuffledEbay[i]);
      }
    }
    
    return balanced;
  };

  const filterAndPaginateRecommendations = () => {
    // Show only similar products (no more trending tab)
    let filtered = allRecommendations.filter(p => p.recommendation_type === 'similar');

    // Paginate
    const startIndex = 0;
    const endIndex = currentPage * PRODUCTS_PER_PAGE;
    const displayed = filtered.slice(startIndex, endIndex);
    
    setDisplayedRecommendations(displayed);
    setHasNextPage(endIndex < filtered.length);
  };

  const loadMoreRecommendations = async () => {
    if (!isLoadingMore && canLoadMore) {
      setIsLoadingMore(true);
      
      try {
        const newRecommendations = [];
        let hasMoreData = false;
        
        // Fetch more eBay products
        const ebayResult = await fetchEbayRecommendations(
          product.title, 
          LOAD_MORE_SIZE, 
          searchOffsets.ebay
        );
        newRecommendations.push(...ebayResult.products);
        
        // Fetch more AliExpress products
        const aliResult = await fetchAliExpressSearchRecommendations(
          product.title, 
          LOAD_MORE_SIZE, 
          searchOffsets.aliexpress
        );
        newRecommendations.push(...aliResult.products);
        
        // Update offsets
        setSearchOffsets(prev => ({
          ebay: prev.ebay + LOAD_MORE_SIZE,
          aliexpress: prev.aliexpress + LOAD_MORE_SIZE
        }));
        
        // Check if we still have more data available
        hasMoreData = ebayResult.hasMore || aliResult.hasMore;
        setCanLoadMore(hasMoreData);
        
        // Add new recommendations to existing ones and immediately show them
        if (newRecommendations.length > 0) {
          const balancedNew = balanceProductRatio(newRecommendations);
          setAllRecommendations(prev => {
            // Combine existing and new products, then rebalance the entire set
            const allProducts = [...prev, ...balancedNew];
            const rebalanced = balanceProductRatio(allProducts);
            
            // Calculate how many pages we need to show the new products
            const similarProducts = rebalanced.filter(p => p.recommendation_type === 'similar');
            const neededPages = Math.ceil(similarProducts.length / PRODUCTS_PER_PAGE);
            
            // Update current page to show new products immediately
            setCurrentPage(neededPages);
            
            return rebalanced;
          });
        }
        
        // If no new products found, disable load more
        if (newRecommendations.length === 0) {
          setCanLoadMore(false);
        }
        
      } catch (err) {
        console.warn('Load more recommendations failed:', err);
        setCanLoadMore(false);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };


  const getSimilarCount = () => {
    return allRecommendations.filter(p => p.recommendation_type === 'similar').length;
  };

  const total = allRecommendations.length;

  if (!product) {
    return null;
  }

  if (loading) {
    return (
      <div className="recommendations-section bg-white rounded-lg shadow-sm border p-6 mt-6">
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <h3 className="text-xl font-semibold text-gray-900">🎯 Recommended Products</h3>
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                LOADING...
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-3/4 animate-pulse"></div>
                <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    // Fail silently for service errors to not block page functionality
    if (error.includes('service') || error.includes('503') || error.includes('timeout')) {
      return null;
    }
    
    return (
      <div className="recommendations-section bg-white rounded-lg shadow-sm border p-6 mt-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Recommended Products</h3>
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Recommendations temporarily unavailable</p>
        </div>
      </div>
    );
  }

  if (!loading && !error && total === 0) {
    return (
      <div className="recommendations-section bg-white rounded-lg shadow-sm border p-6 mt-6">
        <div className="mb-6">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-semibold text-gray-900">🎯 Recommended Products</h3>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="text-gray-400 text-4xl mb-4">🔍</div>
            <h4 className="text-lg font-medium text-gray-800 mb-2">No Recommendations Available</h4>
            <p className="text-gray-600">We couldn't find similar products for this item. Try browsing our featured deals instead.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendations-section bg-white rounded-lg shadow-sm border p-6 mt-6">
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-xl font-semibold text-gray-900">🔍 Similar Products</h3>
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            {getSimilarCount()} FOUND
          </span>
        </div>
      </div>

      {/* Products Grid */}
      {!loading && !error && displayedRecommendations.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {displayedRecommendations.map((recommendedProduct, index) => (
              <div key={`${recommendedProduct.product_id}-${recommendedProduct.source_marketplace}-${index}`} className="group relative">
                {/* Enhanced ProductCard for recommendations */}
                <div className="transform transition-transform duration-200 group-hover:scale-105">
                  <ProductCard product={recommendedProduct} />
                </div>
              </div>
            ))}
          </div>
          
          {/* Load More Section */}
          <div className="mt-8 text-center">
            {/* Show load more if we have more pages to display OR can fetch more from APIs */}
            {(hasNextPage || canLoadMore) && (
              <button
                onClick={() => {
                  // If we have more pages to show, show them first
                  if (hasNextPage) {
                    setCurrentPage(prev => prev + 1);
                  }
                  // If no more pages but can load more from APIs, fetch new data
                  else if (canLoadMore) {
                    loadMoreRecommendations();
                  }
                }}
                disabled={isLoadingMore}
                className="bg-gradient-to-r from-primary to-blue-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoadingMore ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    <span>Loading More Recommendations...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>🔍 Load More Similar Products</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
              </button>
            )}
            
            {!hasNextPage && !canLoadMore && displayedRecommendations.length >= 6 && (
              <div className="text-gray-500 text-sm">
                ✨ You've seen all available similar products! Try searching for different items.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductRecommendations;