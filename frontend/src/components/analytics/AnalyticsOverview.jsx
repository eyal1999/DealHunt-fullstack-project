// Quick analytics overview component for main dashboard
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const AnalyticsOverview = () => {
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsSummary();
  }, []);

  const fetchAnalyticsSummary = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple endpoints in parallel
      const [summaryResponse, insightsResponse] = await Promise.all([
        fetch('/api/analytics/savings-summary', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/analytics/insights', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);
      }

      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        setInsights(insightsData);
      }
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
          <p className="text-sm text-gray-600">Your savings and activity summary</p>
        </div>
        
        <Link
          to="/analytics"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
        >
          <span>View Details</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Key Metrics */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_savings)}
            </div>
            <div className="text-sm text-gray-600">Total Saved</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.savings_this_month)}
            </div>
            <div className="text-sm text-gray-600">This Month</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(summary.potential_savings)}
            </div>
            <div className="text-sm text-gray-600">Potential</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {summary.alerts_triggered}
            </div>
            <div className="text-sm text-gray-600">Alerts</div>
          </div>
        </div>
      )}

      {/* Quick Insights */}
      {insights && insights.insights && insights.insights.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">💡 Quick Insights</h4>
          <div className="space-y-2">
            {insights.insights.slice(0, 2).map((insight, index) => (
              <div key={index} className="text-sm text-gray-700 p-2 bg-blue-50 rounded">
                {insight}
              </div>
            ))}
          </div>
          
          {insights.insights.length > 2 && (
            <Link
              to="/analytics?tab=insights"
              className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
            >
              View {insights.insights.length - 2} more insights
            </Link>
          )}
        </div>
      )}

      {/* Achievements Preview */}
      {insights && insights.achievements && insights.achievements.length > 0 && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">🏆 Recent Achievements</h4>
          <div className="flex space-x-3">
            {insights.achievements.slice(0, 3).map((achievement, index) => (
              <div
                key={index}
                className="flex-1 text-center p-3 bg-yellow-50 rounded border border-yellow-200"
                title={achievement.description}
              >
                <div className="text-lg mb-1">{achievement.icon}</div>
                <div className="text-xs font-medium text-gray-700">{achievement.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex space-x-3">
          <Link
            to="/analytics?tab=savings"
            className="flex-1 bg-green-500 text-white text-center py-2 px-4 rounded text-sm hover:bg-green-600 transition-colors"
          >
            Track Savings
          </Link>
          
          <Link
            to="/analytics?tab=behavior"
            className="flex-1 bg-blue-500 text-white text-center py-2 px-4 rounded text-sm hover:bg-blue-600 transition-colors"
          >
            View Patterns
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverview;