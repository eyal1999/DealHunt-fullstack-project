// User dashboard with activity tracking and recommendations
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PriceHistoryChart from '../price-tracking/PriceHistoryChart';
import RecentlyViewedProducts from './RecentlyViewedProducts';

const UserDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    user: null,
    wishlists: [],
    recentActivity: [],
    priceAlerts: [],
    recommendations: [],
    stats: {
      totalWishlists: 0,
      totalProducts: 0,
      activeAlerts: 0,
      moneySaved: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple data sources in parallel
      const [
        wishlistsResponse,
        activityResponse,
        alertsResponse,
        analyticsResponse
      ] = await Promise.all([
        fetch('/api/enhanced-wishlist/', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/user-activity/recent', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/price-tracking/alerts', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/enhanced-wishlist/analytics/me', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const wishlists = await wishlistsResponse.json();
      const activity = await activityResponse.json();
      const alerts = await alertsResponse.json();
      const analytics = await analyticsResponse.json();

      // Calculate stats
      const stats = {
        totalWishlists: wishlists.length,
        totalProducts: wishlists.reduce((sum, w) => sum + w.products.length, 0),
        activeAlerts: alerts.filter(a => a.is_active).length,
        moneySaved: analytics.money_saved || 0
      };

      setDashboardData({
        wishlists: wishlists.slice(0, 4), // Show only first 4
        recentActivity: activity.slice(0, 10),
        priceAlerts: alerts.slice(0, 5),
        stats,
        recommendations: [] // Will be populated with AI recommendations later
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getActivityIcon = (type) => {
    const icons = {
      'wishlist_created': '📝',
      'product_added': '➕',
      'price_alert': '🔔',
      'product_viewed': '👁️',
      'search_performed': '🔍'
    };
    return icons[type] || '📋';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Your deal hunting activity at a glance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">📝</div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{dashboardData.stats.totalWishlists}</div>
              <div className="text-sm text-gray-500">Wishlists</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🛍️</div>
            <div>
              <div className="text-2xl font-bold text-green-600">{dashboardData.stats.totalProducts}</div>
              <div className="text-sm text-gray-500">Products Tracked</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">🔔</div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{dashboardData.stats.activeAlerts}</div>
              <div className="text-sm text-gray-500">Active Alerts</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">💰</div>
            <div>
              <div className="text-2xl font-bold text-purple-600">${dashboardData.stats.moneySaved.toFixed(2)}</div>
              <div className="text-sm text-gray-500">Money Saved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Wishlists & Activity */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Wishlists */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Wishlists</h2>
                <Link 
                  to="/wishlists" 
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All →
                </Link>
              </div>

              {dashboardData.wishlists.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboardData.wishlists.map(wishlist => (
                    <div key={wishlist.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                          style={{ backgroundColor: wishlist.color }}
                        >
                          ❤️
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{wishlist.name}</h3>
                          <p className="text-sm text-gray-500">{wishlist.products.length} items</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Total: ${wishlist.total_value.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📝</div>
                  <p>No wishlists yet</p>
                  <Link 
                    to="/wishlists" 
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Create your first wishlist
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recently Viewed Products */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently Viewed</h2>
              <RecentlyViewedProducts limit={6} showTitle={false} />
            </div>
          </div>
        </div>

        {/* Right Column - Activity & Alerts */}
        <div className="space-y-8">
          {/* Price Alerts */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Active Price Alerts</h2>
                <Link 
                  to="/price-tracking" 
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Manage →
                </Link>
              </div>

              {dashboardData.priceAlerts.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.priceAlerts.map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {alert.product_title || 'Product Alert'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {alert.alert_type === 'target_price' 
                            ? `Target: $${alert.target_price}`
                            : `${alert.percentage_threshold}% drop`
                          }
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        alert.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {alert.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-3xl mb-2">🔔</div>
                  <p className="text-sm">No active alerts</p>
                  <Link 
                    to="/price-tracking" 
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Set up alerts
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              
              {dashboardData.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="text-lg">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-3xl mb-2">📊</div>
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/search"
                  className="block w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">🔍</span>
                    <span className="text-sm font-medium text-blue-900">Search Products</span>
                  </div>
                </Link>
                
                <Link
                  to="/wishlists"
                  className="block w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">📝</span>
                    <span className="text-sm font-medium text-green-900">Manage Wishlists</span>
                  </div>
                </Link>
                
                <Link
                  to="/price-tracking"
                  className="block w-full p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">🔔</span>
                    <span className="text-sm font-medium text-orange-900">Price Alerts</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;