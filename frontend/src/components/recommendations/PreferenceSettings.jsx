// User preference settings for recommendations
import React, { useState, useEffect } from 'react';

const PreferenceSettings = ({ userProfile, onClose, onUpdate }) => {
  const [preferences, setPreferences] = useState({
    preferred_categories: {},
    preferred_brands: {},
    preferred_marketplaces: {},
    avg_price_range: { min: 0, max: 1000 },
    price_sensitivity: 0.5,
    prefers_deals: true,
    prefers_popular: false,
    prefers_new: false,
    quality_focus: 0.5
  });
  
  const [loading, setLoading] = useState(false);
  const [categories] = useState([
    'electronics', 'fashion', 'home', 'books', 'sports', 
    'beauty', 'toys', 'automotive', 'garden', 'health'
  ]);
  
  const [marketplaces] = useState([
    'aliexpress', 'ebay', 'walmart', 'amazon'
  ]);

  useEffect(() => {
    if (userProfile) {
      setPreferences({
        preferred_categories: userProfile.preferred_categories || {},
        preferred_brands: userProfile.preferred_brands || {},
        preferred_marketplaces: userProfile.preferred_marketplaces || {},
        avg_price_range: userProfile.avg_price_range || { min: 0, max: 1000 },
        price_sensitivity: userProfile.price_sensitivity || 0.5,
        prefers_deals: userProfile.prefers_deals !== undefined ? userProfile.prefers_deals : true,
        prefers_popular: userProfile.prefers_popular || false,
        prefers_new: userProfile.prefers_new || false,
        quality_focus: userProfile.quality_focus || 0.5
      });
    }
  }, [userProfile]);

  const handleCategoryChange = (category, value) => {
    setPreferences(prev => ({
      ...prev,
      preferred_categories: {
        ...prev.preferred_categories,
        [category]: parseFloat(value)
      }
    }));
  };

  const handleMarketplaceChange = (marketplace, value) => {
    setPreferences(prev => ({
      ...prev,
      preferred_marketplaces: {
        ...prev.preferred_marketplaces,
        [marketplace]: parseFloat(value)
      }
    }));
  };

  const handlePriceRangeChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      avg_price_range: {
        ...prev.avg_price_range,
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/recommendations/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        onUpdate();
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      alert('Failed to update preferences. Please try again.');
    } finally {
      setLoading(false);
    }
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
    return emojis[category] || '🛍️';
  };

  const getMarketplaceColor = (marketplace) => {
    const colors = {
      'aliexpress': 'text-red-600',
      'ebay': 'text-yellow-600',
      'walmart': 'text-blue-600',
      'amazon': 'text-orange-600'
    };
    return colors[marketplace] || 'text-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recommendation Preferences</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-8">
            
            {/* Category Preferences */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Category Interests</h3>
              <p className="text-sm text-gray-600 mb-4">
                Rate your interest in different product categories (0 = not interested, 1 = very interested)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map(category => (
                  <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getCategoryEmoji(category)}</span>
                      <span className="font-medium capitalize">{category}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={preferences.preferred_categories[category] || 0.1}
                        onChange={(e) => handleCategoryChange(category, e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm font-mono w-8">
                        {(preferences.preferred_categories[category] || 0.1).toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Marketplace Preferences */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Marketplace Preferences</h3>
              <p className="text-sm text-gray-600 mb-4">
                Rate your preference for different marketplaces
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marketplaces.map(marketplace => (
                  <div key={marketplace} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className={`font-bold text-lg ${getMarketplaceColor(marketplace)}`}>
                        {marketplace.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium capitalize">{marketplace}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={preferences.preferred_marketplaces[marketplace] || 0.5}
                        onChange={(e) => handleMarketplaceChange(marketplace, e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm font-mono w-8">
                        {(preferences.preferred_marketplaces[marketplace] || 0.5).toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Preferences */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Price Preferences</h3>
              
              <div className="space-y-4">
                {/* Price Range */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Typical Price Range
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Minimum</label>
                      <input
                        type="number"
                        min="0"
                        value={preferences.avg_price_range.min}
                        onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <span className="text-gray-400">to</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Maximum</label>
                      <input
                        type="number"
                        min="0"
                        value={preferences.avg_price_range.max}
                        onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        placeholder="1000"
                      />
                    </div>
                  </div>
                </div>

                {/* Price Sensitivity */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Sensitivity
                  </label>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">Low</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={preferences.price_sensitivity}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        price_sensitivity: parseFloat(e.target.value)
                      }))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">High</span>
                    <span className="text-sm font-mono w-8">
                      {preferences.price_sensitivity.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    How much does price affect your purchasing decisions?
                  </p>
                </div>
              </div>
            </div>

            {/* Shopping Preferences */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Shopping Preferences</h3>
              
              <div className="space-y-4">
                {/* Quality vs Price Focus */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quality vs Price Focus
                  </label>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">Price</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={preferences.quality_focus}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        quality_focus: parseFloat(e.target.value)
                      }))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500">Quality</span>
                    <span className="text-sm font-mono w-8">
                      {preferences.quality_focus.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Do you prioritize lower prices or higher quality products?
                  </p>
                </div>

                {/* Boolean Preferences */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.prefers_deals}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        prefers_deals: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <div>
                      <div className="font-medium">Prefer Deals</div>
                      <div className="text-xs text-gray-500">Show discounted items first</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.prefers_popular}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        prefers_popular: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <div>
                      <div className="font-medium">Prefer Popular</div>
                      <div className="text-xs text-gray-500">Show trending items</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.prefers_new}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        prefers_new: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <div>
                      <div className="font-medium">Prefer New</div>
                      <div className="text-xs text-gray-500">Show recently added items</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              These preferences help us personalize your recommendations
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferenceSettings;