// Personalized recommendations page component
import React, { useState, useEffect } from 'react';
import RecommendationCarousel from './RecommendationCarousel';
import PreferenceSettings from './PreferenceSettings';

const PersonalizedRecommendations = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [profileResponse, insightsResponse] = await Promise.all([
        fetch('/api/recommendations/profile', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/recommendations/insights', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setUserProfile(profileData);
      }

      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        setInsights(insightsData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = () => {
    fetchUserData();
    setShowSettings(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-48"></div>
                <div className="flex space-x-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="w-64 h-80 bg-gray-200 rounded-lg"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">For You</h1>
            <p className="text-gray-600 mt-1">
              Personalized recommendations based on your preferences and shopping behavior
            </p>
          </div>
          
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Preferences</span>
          </button>
        </div>

        {/* Insights Cards */}
        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4">
              <div className="text-2xl font-bold">
                {(insights.profile_completeness * 100).toFixed(0)}%
              </div>
              <div className="text-blue-100 text-sm">Profile Complete</div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4">
              <div className="text-2xl font-bold">
                {insights.top_categories.length}
              </div>
              <div className="text-green-100 text-sm">Preferred Categories</div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4">
              <div className="text-2xl font-bold">
                ${insights.price_range.min}-{insights.price_range.max}
              </div>
              <div className="text-purple-100 text-sm">Price Range</div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-4">
              <div className="text-2xl font-bold">
                {(insights.shopping_patterns.quality_focus * 100).toFixed(0)}%
              </div>
              <div className="text-orange-100 text-sm">Quality Focus</div>
            </div>
          </div>
        )}
      </div>

      {/* Recommendation Sections */}
      <div className="space-y-12">
        {/* Personal Recommendations */}
        <RecommendationCarousel
          title="🎯 Just For You"
          subtitle="Handpicked based on your unique preferences"
          recommendationType="personal"
          limit={12}
        />

        {/* Trending Recommendations */}
        <RecommendationCarousel
          title="🔥 Trending Now"
          subtitle="Popular products that match your interests"
          recommendationType="trending"
          limit={10}
        />

        {/* Deal Recommendations */}
        <RecommendationCarousel
          title="💸 Great Deals"
          subtitle="Price drops and deals in your favorite categories"
          recommendationType="price_based"
          limit={8}
        />

        {/* Similar to Wishlist */}
        <RecommendationCarousel
          title="❤️ Similar to Your Wishlist"
          subtitle="Products related to items you've saved"
          recommendationType="wishlist_based"
          limit={8}
        />

        {/* Search-Based */}
        <RecommendationCarousel
          title="🔍 Based on Your Searches"
          subtitle="Products related to what you've been looking for"
          recommendationType="search_based"
          limit={8}
        />
      </div>

      {/* Top Categories Section */}
      {insights && insights.top_categories.length > 0 && (
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Top Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {insights.top_categories.map((category, index) => (
              <div key={category.category} className="text-center">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-2xl mb-2">
                    {getCategoryEmoji(category.category)}
                  </div>
                  <div className="font-medium text-gray-900 capitalize">
                    {category.category}
                  </div>
                  <div className="text-sm text-gray-500">
                    {(category.score * 100).toFixed(0)}% interest
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Stats */}
      {insights && insights.recommendations_summary && (
        <div className="mt-12 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendation Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {insights.recommendations_summary.total_shown || 0}
              </div>
              <div className="text-sm text-gray-500">Recommendations Shown</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(insights.recommendations_summary.click_rate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Click Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(insights.recommendations_summary.conversion_rate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Wishlist Rate</div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                fetch('/api/recommendations/refresh-profile', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }).then(() => {
                  fetchUserData();
                  window.location.reload(); // Refresh recommendations
                });
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Refresh Profile from Recent Activity
            </button>
          </div>
        </div>
      )}

      {/* Preference Settings Modal */}
      {showSettings && (
        <PreferenceSettings
          userProfile={userProfile}
          onClose={() => setShowSettings(false)}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
};

const getCategoryEmoji = (category) => {
  const emojis = {
    'electronics': '📱',
    'fashion': '👗',
    'home': '🏠',
    'books': '📚',
    'sports': '⚽',
    'beauty': '💄',
    'toys': '🧸',
    'automotive': '🚗',
    'garden': '🌱',
    'health': '💊'
  };
  return emojis[category.toLowerCase()] || '🛍️';
};

export default PersonalizedRecommendations;