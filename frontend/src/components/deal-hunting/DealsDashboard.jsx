// Deals dashboard component
import React, { useState, useEffect } from 'react';
import { 
  FireIcon, 
  StarIcon, 
  ClockIcon, 
  ShoppingCartIcon,
  ExternalLinkIcon,
  FunnelIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const DealsDashboard = () => {
  const [deals, setDeals] = useState([]);
  const [trendingDeals, setTrendingDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    marketplace: '',
    severity: '',
    limit: 20
  });
  const [availableFilters, setAvailableFilters] = useState({
    categories: [],
    marketplaces: []
  });

  useEffect(() => {
    loadDeals();
    loadTrendingDeals();
    loadStats();
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadDeals();
  }, [filters]);

  const loadDeals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.limit) params.append('limit', filters.limit);

      const response = await fetch(`/api/deal-hunting/deals?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const dealsData = await response.json();
        setDeals(dealsData);
      } else {
        console.error('Failed to load deals');
      }
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingDeals = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '10');
      if (filters.category) params.append('category', filters.category);
      if (filters.marketplace) params.append('marketplace', filters.marketplace);

      const response = await fetch(`/api/deal-hunting/deals/trending?${params}`);
      
      if (response.ok) {
        const trendingData = await response.json();
        setTrendingDeals(trendingData);
      }
    } catch (error) {
      console.error('Error loading trending deals:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/deal-hunting/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [categoriesRes, marketplacesRes] = await Promise.all([
        fetch('/api/deal-hunting/categories'),
        fetch('/api/deal-hunting/marketplaces')
      ]);

      const [categories, marketplaces] = await Promise.all([
        categoriesRes.json(),
        marketplacesRes.json()
      ]);

      setAvailableFilters({
        categories: categories.categories || [],
        marketplaces: marketplaces.marketplaces || []
      });
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const triggerManualHunt = async () => {
    try {
      const response = await fetch('/api/deal-hunting/hunt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Manual hunt completed! Found ${result.deals_found} deals.`);
        loadDeals();
        loadTrendingDeals();
      } else {
        alert('Failed to trigger deal hunt');
      }
    } catch (error) {
      console.error('Error triggering hunt:', error);
      alert('Failed to trigger deal hunt');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <FireIcon className="w-4 h-4" />;
      case 'high': return <SparklesIcon className="w-4 h-4" />;
      default: return <StarIcon className="w-4 h-4" />;
    }
  };

  const formatPrice = (price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const formatDiscount = (percentage) => {
    return `${Math.round(percentage)}% OFF`;
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deal Hunter Dashboard</h1>
            <p className="text-gray-600">Discover and track the best deals automatically</p>
          </div>
          <button
            onClick={triggerManualHunt}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <FireIcon className="w-4 h-4" />
            <span>Hunt Now</span>
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total_alerts_configured}</div>
              <div className="text-sm text-gray-600">Active Alerts</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total_alerts_sent}</div>
              <div className="text-sm text-gray-600">Alerts Sent</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.alerts_clicked}</div>
              <div className="text-sm text-gray-600">Alerts Clicked</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                ${stats.total_potential_savings.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Potential Savings</div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Categories</option>
              {availableFilters.categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marketplace</label>
            <select
              value={filters.marketplace}
              onChange={(e) => setFilters(prev => ({ ...prev, marketplace: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Marketplaces</option>
              {availableFilters.marketplaces.map(marketplace => (
                <option key={marketplace} value={marketplace}>{marketplace}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value={10}>10 deals</option>
              <option value={20}>20 deals</option>
              <option value={50}>50 deals</option>
              <option value={100}>100 deals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trending Deals */}
      {trendingDeals.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <FireIcon className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900">Trending Deals</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {trendingDeals.slice(0, 6).map(deal => (
              <div key={deal.deal_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getSeverityColor(deal.severity)}`}>
                    {getSeverityIcon(deal.severity)}
                    <span>{deal.severity.toUpperCase()}</span>
                  </span>
                  <span className="text-xs text-gray-500">{getTimeAgo(deal.detected_at)}</span>
                </div>
                
                <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{deal.title}</h4>
                
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-lg font-bold text-gray-900">{formatPrice(deal.current_price, deal.currency)}</span>
                    <span className="text-sm text-gray-500 line-through ml-2">{formatPrice(deal.original_price, deal.currency)}</span>
                  </div>
                  <span className="text-sm font-medium text-green-600">{formatDiscount(deal.discount_percentage)}</span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{deal.marketplace}</span>
                  {deal.rating && (
                    <div className="flex items-center space-x-1">
                      <StarIcon className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{deal.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your Deals */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Your Personalized Deals ({deals.length})</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <p className="text-gray-600 mt-2">Loading deals...</p>
          </div>
        ) : deals.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No deals found matching your criteria.</p>
            <p className="text-sm mt-1">Try adjusting your filters or creating more deal alerts.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {deals.map(deal => (
              <div key={deal.deal_id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-4">
                  {deal.image_url && (
                    <img 
                      src={deal.image_url} 
                      alt={deal.title}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 line-clamp-2">{deal.title}</h4>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getSeverityColor(deal.severity)}`}>
                          {getSeverityIcon(deal.severity)}
                          <span>{deal.severity.toUpperCase()}</span>
                        </span>
                        <a
                          href={deal.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View deal"
                        >
                          <ExternalLinkIcon className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-4">
                        <div>
                          <span className="text-xl font-bold text-gray-900">{formatPrice(deal.current_price, deal.currency)}</span>
                          <span className="text-sm text-gray-500 line-through ml-2">{formatPrice(deal.original_price, deal.currency)}</span>
                        </div>
                        <span className="text-lg font-medium text-green-600">{formatDiscount(deal.discount_percentage)}</span>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{deal.marketplace}</div>
                        {deal.rating && (
                          <div className="flex items-center space-x-1">
                            <StarIcon className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-gray-600">{deal.rating}</span>
                            {deal.review_count && (
                              <span className="text-sm text-gray-500">({deal.review_count})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        {deal.category && <span>Category: {deal.category}</span>}
                        {deal.brand && <span>Brand: {deal.brand}</span>}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="w-4 h-4" />
                        <span>{getTimeAgo(deal.detected_at)}</span>
                      </div>
                    </div>
                    
                    {deal.tags && deal.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {deal.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealsDashboard;