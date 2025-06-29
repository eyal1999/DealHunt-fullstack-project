// Advanced analytics dashboard component
import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
);

const AnalyticsDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchDashboard();
  }, [timeRange]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
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

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Unavailable</h2>
          <p className="text-gray-600">Unable to load analytics data</p>
        </div>
      </div>
    );
  }

  const { savings_metrics, shopping_behavior, wishlist_analytics, user_engagement } = dashboard;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Track your savings, behavior, and deal hunting success</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
                <option value="365">Last year</option>
              </select>
              
              <button
                onClick={fetchDashboard}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'savings', name: 'Savings', icon: '💰' },
                { id: 'behavior', name: 'Shopping', icon: '🛍️' },
                { id: 'tracking', name: 'Price Tracking', icon: '📈' },
                { id: 'insights', name: 'Insights', icon: '💡' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard
                title="Total Savings"
                value={formatCurrency(savings_metrics.total_savings)}
                change={`+${formatCurrency(savings_metrics.savings_this_month)} this month`}
                icon="💰"
                color="green"
              />
              
              <MetricCard
                title="Potential Savings"
                value={formatCurrency(savings_metrics.potential_savings)}
                change={`${savings_metrics.total_alerts_triggered} alerts triggered`}
                icon="📢"
                color="blue"
              />
              
              <MetricCard
                title="Active Wishlists"
                value={wishlist_analytics.total_wishlists}
                change={`${wishlist_analytics.total_products} products tracked`}
                icon="❤️"
                color="purple"
              />
              
              <MetricCard
                title="Search Activity"
                value={shopping_behavior.total_searches}
                change={`${user_engagement.active_days} active days`}
                icon="🔍"
                color="orange"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Savings Over Time */}
              <ChartCard title="Savings Trend" description="Your savings over time">
                <SavingsChart data={savings_metrics} />
              </ChartCard>

              {/* Category Distribution */}
              <ChartCard title="Shopping Categories" description="Your favorite categories">
                <CategoryChart data={shopping_behavior.favorite_categories} />
              </ChartCard>

              {/* Marketplace Performance */}
              <ChartCard title="Marketplace Usage" description="Where you shop most">
                <MarketplaceChart data={shopping_behavior.favorite_marketplaces} />
              </ChartCard>

              {/* Engagement Metrics */}
              <ChartCard title="Feature Usage" description="How you use DealHunt">
                <FeatureUsageChart data={user_engagement.feature_usage} />
              </ChartCard>
            </div>
          </div>
        )}

        {/* Savings Tab */}
        {activeTab === 'savings' && (
          <div className="space-y-6">
            <SavingsAnalysis savings={savings_metrics} goal={dashboard.savings_goal} progress={dashboard.goal_progress} />
          </div>
        )}

        {/* Shopping Behavior Tab */}
        {activeTab === 'behavior' && (
          <div className="space-y-6">
            <ShoppingBehaviorAnalysis behavior={shopping_behavior} />
          </div>
        )}

        {/* Price Tracking Tab */}
        {activeTab === 'tracking' && (
          <div className="space-y-6">
            <PriceTrackingAnalysis tracking={dashboard.price_tracking_analytics} />
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <PersonalizedInsights
              insights={dashboard.personalized_insights}
              recommendations={dashboard.recommendations}
              achievements={dashboard.achievements}
              nextMilestone={dashboard.next_milestone}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable Components

const MetricCard = ({ title, value, change, icon, color }) => {
  const colorClasses = {
    green: 'text-green-600 bg-green-100',
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100'
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-sm text-gray-600 mt-1">{change}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

const ChartCard = ({ title, description, children }) => (
  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
    <div className="h-64">
      {children}
    </div>
  </div>
);

const SavingsChart = ({ data }) => {
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Monthly Savings',
        data: [10, 25, 40, 35, 50, data.savings_this_month],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value;
          }
        }
      }
    }
  };

  return <Line data={chartData} options={options} />;
};

const CategoryChart = ({ data }) => {
  const chartData = {
    labels: data.slice(0, 5),
    datasets: [
      {
        data: [30, 25, 20, 15, 10],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6'
        ]
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  return <Doughnut data={chartData} options={options} />;
};

const MarketplaceChart = ({ data }) => {
  const chartData = {
    labels: data.slice(0, 5),
    datasets: [
      {
        label: 'Usage',
        data: [45, 30, 25],
        backgroundColor: 'rgba(59, 130, 246, 0.8)'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return <Bar data={chartData} options={options} />;
};

const FeatureUsageChart = ({ data }) => {
  const features = Object.keys(data).slice(0, 6);
  const values = Object.values(data).slice(0, 6);

  const chartData = {
    labels: features,
    datasets: [
      {
        label: 'Usage',
        data: values,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        pointBackgroundColor: 'rgba(59, 130, 246, 1)'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true
      }
    }
  };

  return <Radar data={chartData} options={options} />;
};

const SavingsAnalysis = ({ savings, goal, progress }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Savings Breakdown</h3>
      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Savings:</span>
          <span className="font-medium">{formatCurrency(savings.total_savings)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">This Month:</span>
          <span className="font-medium text-green-600">{formatCurrency(savings.savings_this_month)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">This Year:</span>
          <span className="font-medium">{formatCurrency(savings.savings_this_year)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Best Deal:</span>
          <span className="font-medium">{formatCurrency(savings.best_deal_savings)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Avg. Discount:</span>
          <span className="font-medium">{formatPercentage(savings.average_discount_percentage)}</span>
        </div>
      </div>
    </div>

    {goal && (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Savings Goal</h3>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {formatPercentage(progress)}
          </div>
          <p className="text-gray-600 mb-4">of {formatCurrency(goal)} goal</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {formatCurrency(goal * (progress / 100))} saved
          </p>
        </div>
      </div>
    )}
  </div>
);

const ShoppingBehaviorAnalysis = ({ behavior }) => (
  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Shopping Patterns</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Search Activity</h4>
        <p className="text-2xl font-bold text-blue-600">{behavior.total_searches}</p>
        <p className="text-sm text-gray-600">Total searches</p>
      </div>
      
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Session Duration</h4>
        <p className="text-2xl font-bold text-green-600">{behavior.session_duration_avg}min</p>
        <p className="text-sm text-gray-600">Average per session</p>
      </div>
      
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Engagement Rate</h4>
        <p className="text-2xl font-bold text-purple-600">{formatPercentage(100 - behavior.bounce_rate)}</p>
        <p className="text-sm text-gray-600">Active engagement</p>
      </div>
    </div>
  </div>
);

const PriceTrackingAnalysis = ({ tracking }) => (
  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Tracking Performance</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Active Trackers</h4>
        <p className="text-2xl font-bold text-blue-600">{tracking.total_trackers}</p>
        <p className="text-sm text-gray-600">Products being monitored</p>
      </div>
      
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Alerts Sent</h4>
        <p className="text-2xl font-bold text-green-600">{tracking.alerts_sent}</p>
        <p className="text-sm text-gray-600">Price drop notifications</p>
      </div>
    </div>
  </div>
);

const PersonalizedInsights = ({ insights, recommendations, achievements, nextMilestone }) => (
  <div className="space-y-6">
    {/* Insights */}
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Your Insights</h3>
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
            <p className="text-gray-800">{insight}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Recommendations */}
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Recommendations</h3>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div key={index} className="p-3 bg-green-50 rounded border-l-4 border-green-500">
            <p className="text-gray-800">{rec}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Achievements */}
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Achievements</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg text-center">
            <div className="text-3xl mb-2">{achievement.icon}</div>
            <h4 className="font-medium text-gray-900">{achievement.name}</h4>
            <p className="text-sm text-gray-600">{achievement.description}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Next Milestone */}
    {nextMilestone && (
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">🎯 Next Milestone</h3>
        <p>{nextMilestone}</p>
      </div>
    )}
  </div>
);

export default AnalyticsDashboard;