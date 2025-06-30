// Recently viewed products component
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const RecentlyViewedProducts = ({ limit = 10, showTitle = true }) => {
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentlyViewed();
  }, [limit]);

  const fetchRecentlyViewed = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user-activity/recently-viewed?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecentProducts(data.recently_viewed || []);
      }
    } catch (error) {
      console.error('Error fetching recently viewed products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = async (product) => {
    // Track the click
    try {
      await fetch('/api/user-activity/track-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          product_id: product.product_id,
          marketplace: product.marketplace,
          title: product.title,
          price: product.price,
          image_url: product.image_url
        })
      });
    } catch (error) {
      console.error('Error tracking product view:', error);
    }
  };

  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getMarketplaceColor = (marketplace) => {
    const colors = {
      'aliexpress': 'bg-red-100 text-red-800',
      'ebay': 'bg-yellow-100 text-yellow-800',
      'walmart': 'bg-blue-100 text-blue-800',
    };
    return colors[marketplace.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {showTitle && <h2 className="text-lg font-semibold text-gray-900">Recently Viewed</h2>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: limit }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48 mb-3"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-3 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentProducts.length === 0) {
    return (
      <div className="text-center py-8">
        {showTitle && <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently Viewed</h2>}
        <div className="text-gray-400 text-6xl mb-4">👁️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No recently viewed products</h3>
        <p className="text-gray-500 mb-4">
          Products you view will appear here for quick access
        </p>
        <Link
          to="/search"
          className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recently Viewed</h2>
          <button
            onClick={() => setRecentProducts([])}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear History
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentProducts.map((product, index) => (
          <div
            key={`${product.product_id}-${index}`}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="relative">
              {/* Product Image */}
              <div className="aspect-w-16 aspect-h-12 bg-gray-100">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-full h-48 object-contain p-2"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400"><span class="text-4xl">📦</span></div>';
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-400">
                    <span className="text-4xl">📦</span>
                  </div>
                )}
              </div>

              {/* Marketplace Badge */}
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMarketplaceColor(product.marketplace)}`}>
                  {product.marketplace.toUpperCase()}
                </span>
              </div>

              {/* Viewed timestamp */}
              <div className="absolute bottom-2 left-2">
                <span className="px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                  {formatDate(product.viewed_at)}
                </span>
              </div>
            </div>

            <div className="p-4">
              {/* Product Title */}
              <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm">
                {product.title}
              </h3>

              {/* Price */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-green-600">
                  {formatPrice(product.price)}
                </span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice(product.original_price)}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Link
                  to={`/product/${product.marketplace}/${product.product_id}`}
                  onClick={() => handleProductClick(product)}
                  className="flex-1 bg-blue-500 text-white text-center py-2 px-3 rounded text-sm hover:bg-blue-600 transition-colors"
                >
                  View Details
                </Link>
                <button
                  onClick={() => {
                    // Add to wishlist logic
                    console.log('Add to wishlist:', product);
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

      {recentProducts.length === limit && (
        <div className="text-center">
          <button
            onClick={() => fetchRecentlyViewed(limit + 6)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentlyViewedProducts;