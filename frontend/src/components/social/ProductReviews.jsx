// Product reviews display and submission component
import React, { useState, useEffect } from 'react';

const ProductReviews = ({ productId, marketplace }) => {
  const [reviews, setReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId, marketplace, sortBy]);

  const fetchReviews = async (pageNum = 1) => {
    try {
      setLoading(pageNum === 1);
      const response = await fetch(
        `/api/social/reviews/product/${marketplace}/${productId}?page=${pageNum}&sort_by=${sortBy}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (pageNum === 1) {
          setReviews(data.reviews);
          setRatingSummary(data.rating_summary);
        } else {
          setReviews(prev => [...prev, ...data.reviews]);
        }
        
        setHasMore(pageNum < data.pages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (reviewId, isHelpful) => {
    try {
      const response = await fetch(`/api/social/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_helpful: isHelpful })
      });

      if (response.ok) {
        // Refresh reviews to show updated vote counts
        fetchReviews(1);
      }
    } catch (error) {
      console.error('Error voting on review:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderStars = (rating, interactive = false, size = 'w-4 h-4') => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${size} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} ${
              interactive ? 'cursor-pointer hover:text-yellow-400' : ''
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const renderRatingBreakdown = () => {
    if (!ratingSummary) return null;

    return (
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">
              {ratingSummary.average_rating}
            </div>
            <div className="flex justify-center mb-1">
              {renderStars(Math.round(ratingSummary.average_rating), false, 'w-5 h-5')}
            </div>
            <div className="text-sm text-gray-500">
              {ratingSummary.total_reviews} reviews
            </div>
          </div>
          
          <div className="flex-1 ml-8">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingSummary.rating_distribution[rating] || 0;
              const percentage = ratingSummary.total_reviews > 0 
                ? (count / ratingSummary.total_reviews) * 100 
                : 0;
              
              return (
                <div key={rating} className="flex items-center mb-1">
                  <span className="text-sm text-gray-600 w-8">{rating}★</span>
                  <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        <button
          onClick={() => setShowWriteReview(true)}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Write a Review
        </button>
      </div>
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900">Customer Reviews</h3>
        
        {/* Sort options */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1 text-sm"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest_rated">Highest Rated</option>
          <option value="lowest_rated">Lowest Rated</option>
          <option value="most_helpful">Most Helpful</option>
        </select>
      </div>

      {/* Rating breakdown */}
      {renderRatingBreakdown()}

      {/* Reviews list */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-gray-200 pb-6">
            {/* Review header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  {review.user_avatar ? (
                    <img
                      src={review.user_avatar}
                      alt={review.user_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 font-medium">
                      {review.user_name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                
                <div>
                  <div className="font-medium text-gray-900">
                    {review.user_name || 'Anonymous'}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    {renderStars(review.rating)}
                    <span>•</span>
                    <span>{formatDate(review.created_at)}</span>
                    {review.verified_purchase && (
                      <>
                        <span>•</span>
                        <span className="text-green-600 font-medium">Verified Purchase</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Review actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleVote(review.id, true)}
                  className="flex items-center space-x-1 text-sm text-gray-500 hover:text-green-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  <span>{review.helpful_votes}</span>
                </button>
                
                <button
                  onClick={() => handleVote(review.id, false)}
                  className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.737 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 9v-5m-7 10h2m5-10H9a2 2 0 00-2 2v6a2 2 0 002 2h2.5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Review content */}
            <div className="mb-3">
              <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
              <p className="text-gray-700 leading-relaxed">{review.content}</p>
            </div>

            {/* Review images */}
            {review.images && review.images.length > 0 && (
              <div className="flex space-x-2 mb-3">
                {review.images.slice(0, 4).map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Review image ${index + 1}`}
                    className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={() => {
                      // Open image in modal
                      window.open(image, '_blank');
                    }}
                  />
                ))}
                {review.images.length > 4 && (
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-sm text-gray-600">
                    +{review.images.length - 4}
                  </div>
                )}
              </div>
            )}

            {/* Helpfulness indicator */}
            {review.total_votes > 0 && (
              <div className="text-sm text-gray-500">
                {review.helpful_votes} of {review.total_votes} people found this helpful
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => fetchReviews(page + 1)}
            disabled={loading}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More Reviews'}
          </button>
        </div>
      )}

      {/* No reviews message */}
      {reviews.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-500 mb-4">
            Be the first to review this product and help others make informed decisions.
          </p>
          <button
            onClick={() => setShowWriteReview(true)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Write the First Review
          </button>
        </div>
      )}

      {/* Write review modal would go here */}
      {showWriteReview && (
        <WriteReviewModal
          productId={productId}
          marketplace={marketplace}
          onClose={() => setShowWriteReview(false)}
          onSubmit={() => {
            setShowWriteReview(false);
            fetchReviews(1);
          }}
        />
      )}
    </div>
  );
};

// Write Review Modal Component
const WriteReviewModal = ({ productId, marketplace, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    content: '',
    verified_purchase: false
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/social/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          product_id: productId,
          marketplace: marketplace,
          ...formData
        })
      });

      if (response.ok) {
        onSubmit();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, onRate) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            className={`w-8 h-8 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
          >
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Write a Review</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating *
              </label>
              {renderStars(formData.rating, (rating) => 
                setFormData(prev => ({ ...prev, rating }))
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Summarize your experience"
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Share your experience with this product..."
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>

            {/* Verified purchase */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.verified_purchase}
                onChange={(e) => setFormData(prev => ({ ...prev, verified_purchase: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-gray-700">I purchased this product</span>
            </label>

            {/* Submit buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.rating || !formData.title.trim() || !formData.content.trim()}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductReviews;