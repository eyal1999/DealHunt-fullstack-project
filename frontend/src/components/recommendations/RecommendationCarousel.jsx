// AI-powered recommendation carousel component
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const RecommendationCarousel = ({ 
  title, 
  subtitle, 
  recommendationType = 'personal', 
  limit = 10,
  showFeedback = true,
  className = '' 
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    fetchRecommendations();
  }, [recommendationType, limit]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recommendations/?recommendation_type=${recommendationType}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = async (recommendation, index) => {
    // Track recommendation click
    if (showFeedback) {
      try {
        await fetch('/api/recommendations/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            product_id: recommendation.product_id,
            marketplace: recommendation.marketplace,
            recommendation_type: recommendation.recommendation_type,
            clicked: true,
            position_in_list: index,
            page_context: 'recommendation_carousel'
          })
        });
      } catch (error) {
        console.error('Error tracking recommendation click:', error);
      }
    }
  };

  const handleDismiss = async (recommendation, index) => {
    // Track recommendation dismissal
    if (showFeedback) {
      try {
        await fetch('/api/recommendations/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            product_id: recommendation.product_id,
            marketplace: recommendation.marketplace,
            recommendation_type: recommendation.recommendation_type,
            dismissed: true,
            position_in_list: index,
            page_context: 'recommendation_carousel'
          })
        });

        // Remove from current recommendations
        setRecommendations(prev => prev.filter((_, i) => i !== index));
      } catch (error) {
        console.error('Error tracking recommendation dismissal:', error);
      }
    }
  };

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 300;
    const newScrollLeft = direction === 'left' 
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };

  const getReasonEmoji = (reason) => {
    const emojis = {
      'trending_now': '🔥',
      'similar_products': '🔍',
      'price_drop': '💸',
      'category_match': '🎯',
      'wishlist_similar': '❤️',
      'search_history': '🔎',
      'frequently_viewed': '👁️',
      'brand_preference': '⭐',
      'seasonal_trend': '📅'
    };
    return emojis[reason] || '💡';
  };

  const getMarketplaceColor = (marketplace) => {
    const colors = {
      'aliexpress': 'bg-red-100 text-red-800',
      'ebay': 'bg-yellow-100 text-yellow-800',
      'walmart': 'bg-blue-100 text-blue-800',
      'amazon': 'bg-orange-100 text-orange-800'
    };
    return colors[marketplace.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className={`py-8 ${className}`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>
        <div className="flex space-x-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex-shrink-0 w-64 bg-white rounded-lg shadow-md animate-pulse">
              <div className="bg-gray-200 h-48 rounded-t-lg"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return (
      <div className={`py-8 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-lg mb-2">
            {error ? 'Unable to load recommendations' : 'No recommendations available'}
          </p>
          <p className="text-sm">
            {error ? 'Please try again later' : 'Check back soon for personalized suggestions!'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`py-8 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
        
        {/* Navigation buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Recommendation carousel */}
      <div
        ref={scrollContainerRef}
        className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {recommendations.map((recommendation, index) => (
          <div
            key={`${recommendation.product_id}-${index}`}
            className="flex-shrink-0 w-64 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow group relative"
          >
            {/* Dismiss button */}
            {showFeedback && (
              <button
                onClick={() => handleDismiss(recommendation, index)}
                className="absolute top-2 right-2 z-10 p-1 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
                title="Dismiss recommendation"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Recommendation reason badge */}
            <div className="absolute top-2 left-2 z-10">
              <div className="flex items-center space-x-1 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs">
                <span>{getReasonEmoji(recommendation.recommendation_reason)}</span>
                <span className="capitalize">{recommendation.recommendation_reason.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Product image */}
            <Link
              to={`/product/${recommendation.marketplace}/${recommendation.product_id}`}
              onClick={() => handleProductClick(recommendation, index)}
              className="block"
            >
              <div className="relative bg-gray-100 rounded-t-lg h-48 overflow-hidden">
                {recommendation.image_url ? (
                  <img
                    src={recommendation.image_url}
                    alt={recommendation.title}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
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
                {recommendation.discount_percentage && recommendation.discount_percentage > 0 && (
                  <div className="absolute bottom-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                    -{recommendation.discount_percentage.toFixed(0)}%
                  </div>
                )}
              </div>
            </Link>

            {/* Product info */}
            <div className="p-4">
              {/* Marketplace badge */}
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMarketplaceColor(recommendation.marketplace)}`}>
                  {recommendation.marketplace.toUpperCase()}
                </span>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <span>★</span>
                  <span>{(recommendation.confidence_score * 5).toFixed(1)}</span>
                </div>
              </div>

              {/* Product title */}
              <Link
                to={`/product/${recommendation.marketplace}/${recommendation.product_id}`}
                onClick={() => handleProductClick(recommendation, index)}
                className="block"
              >
                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm group-hover:text-blue-600 transition-colors">
                  {recommendation.title}
                </h3>
              </Link>

              {/* Price */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-green-600">
                    {formatPrice(recommendation.current_price)}
                  </span>
                  {recommendation.original_price && recommendation.original_price > recommendation.current_price && (
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(recommendation.original_price)}
                    </span>
                  )}
                </div>
              </div>

              {/* Category */}
              {recommendation.category && (
                <div className="text-xs text-gray-500 mb-3">
                  {recommendation.category}
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2">
                <Link
                  to={`/product/${recommendation.marketplace}/${recommendation.product_id}`}
                  onClick={() => handleProductClick(recommendation, index)}
                  className="flex-1 bg-blue-500 text-white text-center py-2 px-3 rounded text-sm hover:bg-blue-600 transition-colors"
                >
                  View
                </Link>
                <button
                  onClick={() => {
                    // Add to wishlist logic
                    console.log('Add to wishlist:', recommendation);
                    if (showFeedback) {
                      fetch('/api/recommendations/feedback', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                          product_id: recommendation.product_id,
                          marketplace: recommendation.marketplace,
                          recommendation_type: recommendation.recommendation_type,
                          added_to_wishlist: true,
                          position_in_list: index,
                          page_context: 'recommendation_carousel'
                        })
                      }).catch(console.error);
                    }
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

      {/* Refresh button */}
      <div className="text-center mt-6">
        <button
          onClick={fetchRecommendations}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1 mx-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh Recommendations</span>
        </button>
      </div>
    </div>
  );
};

export default RecommendationCarousel;