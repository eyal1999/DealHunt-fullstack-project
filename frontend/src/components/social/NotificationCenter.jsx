// Notification center component for real-time notifications
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time notifications polling
    const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async (pageNum = 1, unreadOnly = false) => {
    try {
      setLoading(pageNum === 1);
      
      const response = await fetch(
        `/api/social/notifications?page=${pageNum}&unread_only=${unreadOnly}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (pageNum === 1) {
          setNotifications(data.notifications);
        } else {
          setNotifications(prev => [...prev, ...data.notifications]);
        }
        
        setUnreadCount(data.unread_count);
        setHasMore(pageNum < data.pages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/social/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/social/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'price_drop': '💸',
      'review_reply': '💬',
      'wishlist_shared': '❤️',
      'product_back_in_stock': '📦',
      'new_follower': '👥',
      'deal_alert': '🔥',
      'system_update': '⚙️'
    };
    return icons[type] || '🔔';
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

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      // Close dropdown and navigate
      setShowDropdown(false);
      // Navigation would be handled by the Link component
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5V9a6.5 6.5 0 10-13 0v4.5L1 17h5m9 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4">
                <div className="animate-pulse space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    {notification.action_url ? (
                      <Link
                        to={notification.action_url}
                        onClick={() => handleNotificationClick(notification)}
                        className="flex space-x-3"
                      >
                        <NotificationContent notification={notification} />
                      </Link>
                    ) : (
                      <div
                        onClick={() => handleNotificationClick(notification)}
                        className="flex space-x-3 cursor-pointer"
                      >
                        <NotificationContent notification={notification} />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Load more button */}
                {hasMore && (
                  <div className="p-4 text-center border-t border-gray-200">
                    <button
                      onClick={() => fetchNotifications(page + 1)}
                      disabled={loading}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <Link
              to="/notifications"
              onClick={() => setShowDropdown(false)}
              className="block w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// Notification content component
const NotificationContent = ({ notification }) => {
  const getNotificationIcon = (type) => {
    const icons = {
      'price_drop': '💸',
      'review_reply': '💬',
      'wishlist_shared': '❤️',
      'product_back_in_stock': '📦',
      'new_follower': '👥',
      'deal_alert': '🔥',
      'system_update': '⚙️'
    };
    return icons[type] || '🔔';
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

  return (
    <>
      {/* Icon */}
      <div className="flex-shrink-0">
        {notification.sender_avatar ? (
          <img
            src={notification.sender_avatar}
            alt={notification.sender_name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-lg">
            {getNotificationIcon(notification.type)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {notification.title}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {notification.message}
            </p>
          </div>
          
          {/* Unread indicator */}
          {!notification.read && (
            <div className="flex-shrink-0 ml-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          )}
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          {getTimeAgo(notification.created_at)}
        </div>
      </div>
    </>
  );
};

// Real-time notification hook
export const useRealTimeNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);

  useEffect(() => {
    // **MANUAL IMPLEMENTATION NEEDED**: Set up WebSocket or Server-Sent Events
    // for real-time notifications. For now, we'll use polling.
    
    const checkForNewNotifications = async () => {
      try {
        const response = await fetch('/api/social/notifications?unread_only=true&limit=1', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unread_count);
          
          if (data.notifications.length > 0) {
            const latest = data.notifications[0];
            
            // Check if this is a new notification
            if (!latestNotification || latest.id !== latestNotification.id) {
              setLatestNotification(latest);
              
              // Show browser notification if permission granted
              if (Notification.permission === 'granted') {
                new Notification(latest.title, {
                  body: latest.message,
                  icon: '/icons/icon-192x192.png',
                  tag: latest.id
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };

    // Check immediately and then every 30 seconds
    checkForNewNotifications();
    const interval = setInterval(checkForNewNotifications, 30000);

    return () => clearInterval(interval);
  }, [latestNotification]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  return {
    unreadCount,
    latestNotification,
    requestNotificationPermission
  };
};

export default NotificationCenter;