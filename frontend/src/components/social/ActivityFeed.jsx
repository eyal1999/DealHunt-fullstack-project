// Activity feed component for social features
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ActivityFeed = ({ followingOnly = true, className = '' }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [followingOnly]);

  const fetchActivities = async (pageNum = 1) => {
    try {
      setLoading(pageNum === 1);
      
      const response = await fetch(
        `/api/social/feed?following_only=${followingOnly}&page=${pageNum}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (pageNum === 1) {
          setActivities(data.activities);
        } else {
          setActivities(prev => [...prev, ...data.activities]);
        }
        
        setHasMore(pageNum < data.pages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType) => {
    const icons = {
      'review_created': '⭐',
      'content_shared': '🔗',
      'user_followed': '👥',
      'wishlist_created': '❤️',
      'deal_found': '💰'
    };
    return icons[activityType] || '📝';
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && activities.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="animate-pulse flex space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Feed Toggle */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Activity Feed</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Activities */}
      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex space-x-3">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  {activity.user_avatar ? (
                    <img
                      src={activity.user_avatar}
                      alt={activity.user_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-lg">{getActivityIcon(activity.activity_type)}</span>
                    </div>
                  )}
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <Link
                          to={`/profile/${activity.user_id}`}
                          className="font-medium hover:text-blue-600"
                        >
                          {activity.user_name || 'Anonymous'}
                        </Link>
                        <span className="ml-1">{activity.description}</span>
                      </p>
                      
                      {activity.content_title && (
                        <p className="text-sm text-gray-600 mt-1">
                          "{activity.content_title}"
                        </p>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0 ml-2">
                      <span className="text-xs text-gray-500">
                        {getTimeAgo(activity.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Activity Media */}
                  {activity.content_image && (
                    <div className="mt-2">
                      <img
                        src={activity.content_image}
                        alt="Activity content"
                        className="w-16 h-16 object-cover rounded border"
                      />
                    </div>
                  )}

                  {/* Activity Actions */}
                  {activity.content_url && (
                    <div className="mt-2">
                      <Link
                        to={activity.content_url}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => fetchActivities(page + 1)}
                disabled={loading}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 shadow-sm text-center">
          <div className="text-4xl mb-4">📱</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
          <p className="text-gray-600 mb-4">
            {followingOnly 
              ? "Follow other users to see their activity here!"
              : "Be the first to create some activity!"
            }
          </p>
          <div className="space-x-3">
            <Link
              to="/search"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Discover Products
            </Link>
            <Link
              to="/users"
              className="inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Find Users
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;