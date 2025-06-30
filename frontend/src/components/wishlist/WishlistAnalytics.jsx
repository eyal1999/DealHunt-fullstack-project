// Wishlist analytics and insights component
import React, { useState, useEffect } from 'react';

const WishlistAnalytics = ({ onClose }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/enhanced-wishlist/analytics/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'categories', label: 'Categories', icon: '📂' },
    { id: 'marketplaces', label: 'Marketplaces', icon: '🛒' },
    { id: 'sharing', label: 'Sharing', icon: '🔗' }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{analytics.total_wishlists}</div>
          <div className="text-sm text-blue-800">Total Wishlists</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{analytics.total_products}</div>
          <div className="text-sm text-green-800">Total Products</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">${analytics.total_value.toFixed(2)}</div>
          <div className="text-sm text-purple-800">Total Value</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">{analytics.products_with_alerts}</div>
          <div className="text-sm text-orange-800">Price Alerts</div>
        </div>
      </div>

      {/* Savings & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Savings</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Alerts Triggered:</span>
              <span className="font-medium">{analytics.alerts_triggered}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Money Saved:</span>
              <span className="font-bold text-green-600">${analytics.money_saved.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average List Size:</span>
              <span className="font-medium">{analytics.average_list_size.toFixed(1)} items</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Most Active Day:</span>
              <span className="font-medium">{analytics.most_active_day || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Lists Shared:</span>
              <span className="font-medium">{analytics.lists_shared}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Lists Received:</span>
              <span className="font-medium">{analytics.lists_received}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategories = () => {
    const categories = Object.entries(analytics.category_distribution);
    const total = categories.reduce((sum, [, count]) => sum + count, 0);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">📂 Categories Distribution</h3>
        {categories.length > 0 ? (
          <div className="space-y-3">
            {categories.map(([category, count]) => {
              const percentage = ((count / total) * 100).toFixed(1);
              return (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="capitalize font-medium">{category}</span>
                    <span className="text-sm text-gray-500">({count} lists)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No category data available</p>
        )}
      </div>
    );
  };

  const renderMarketplaces = () => {
    const marketplaces = Object.entries(analytics.marketplace_distribution);
    const total = marketplaces.reduce((sum, [, count]) => sum + count, 0);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">🛒 Marketplace Distribution</h3>
        {marketplaces.length > 0 ? (
          <div className="space-y-3">
            {marketplaces.map(([marketplace, count]) => {
              const percentage = ((count / total) * 100).toFixed(1);
              const colors = {
                'aliexpress': 'bg-red-500',
                'ebay': 'bg-yellow-500',
                'walmart': 'bg-blue-500',
              };
              const color = colors[marketplace.toLowerCase()] || 'bg-gray-500';
              
              return (
                <div key={marketplace} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="capitalize font-medium">{marketplace}</span>
                    <span className="text-sm text-gray-500">({count} products)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${color} h-2 rounded-full`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No marketplace data available</p>
        )}
      </div>
    );
  };

  const renderSharing = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">🔗 Sharing Activity</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{analytics.lists_shared}</div>
            <div className="text-blue-800 mt-1">Lists You've Shared</div>
            <div className="text-sm text-blue-600 mt-2">
              Lists you've made available to others
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{analytics.lists_received}</div>
            <div className="text-green-800 mt-1">Lists Shared With You</div>
            <div className="text-sm text-green-600 mt-2">
              Lists others have shared with you
            </div>
          </div>
        </div>
      </div>

      {analytics.lists_shared === 0 && analytics.lists_received === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🤝</div>
          <p className="text-lg mb-2">No sharing activity yet</p>
          <p className="text-sm">Start sharing your wishlists with friends and family!</p>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'categories':
        return renderCategories();
      case 'marketplaces':
        return renderMarketplaces();
      case 'sharing':
        return renderSharing();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Wishlist Analytics</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <p className="text-sm text-gray-500 text-center">
            Last updated: {new Date(analytics.last_updated).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WishlistAnalytics;