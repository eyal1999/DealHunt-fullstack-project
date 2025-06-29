// Enhanced notification center with real-time updates
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

const RealtimeNotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    connected,
    error,
    markAsRead,
    markAllAsRead,
    requestNotificationPermission,
    sendTestNotification
  } = useRealtimeNotifications();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Check if browser notifications are supported and permission status
    if ('Notification' in window && Notification.permission === 'default') {
      setShowPermissionBanner(true);
    }
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

  const handleNotificationPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setShowPermissionBanner(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      setShowDropdown(false);
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Permission Banner */}
      {showPermissionBanner && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-start space-x-3">
            <div className="text-xl">🔔</div>
            <div className="flex-1">
              <h4 className="font-medium mb-1">Enable Notifications</h4>
              <p className="text-sm opacity-90 mb-3">
                Get real-time alerts for price drops, deals, and more!
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleNotificationPermission}
                  className="bg-white text-blue-500 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
                >
                  Enable
                </button>
                <button
                  onClick={() => setShowPermissionBanner(false)}
                  className="text-white opacity-80 hover:opacity-100 px-3 py-1 text-sm"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowPermissionBanner(false)}
              className="text-white opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Notification Bell */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-colors"
        title={`${unreadCount} unread notifications`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5V9a6.5 6.5 0 10-13 0v4.5L1 17h5m9 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Connection Status Indicator */}
        <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} title={connected ? 'Connected' : 'Disconnected'} />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>
              
              <div className="flex items-center space-x-2">
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={() => sendTestNotification()}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    title="Send test notification"
                  >
                    Test
                  </button>
                )}
                
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
            
            {error && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {notifications.slice(0, 20).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {notification.action_url ? (
                      <Link
                        to={notification.action_url}
                        className="flex space-x-3"
                        onClick={() => setShowDropdown(false)}
                      >
                        <NotificationContent notification={notification} getNotificationIcon={getNotificationIcon} getTimeAgo={getTimeAgo} />
                      </Link>
                    ) : (
                      <div className="flex space-x-3">
                        <NotificationContent notification={notification} getNotificationIcon={getNotificationIcon} getTimeAgo={getTimeAgo} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-gray-500 text-sm">No notifications yet</p>
                <p className="text-gray-400 text-xs mt-1">
                  You'll see price alerts, deals, and social updates here
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="flex justify-between items-center">
              <Link
                to="/notifications"
                onClick={() => setShowDropdown(false)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Notifications
              </Link>
              
              <div className="text-xs text-gray-500">
                {connected ? 'Real-time updates' : 'Offline mode'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Notification content component
const NotificationContent = ({ notification, getNotificationIcon, getTimeAgo }) => {
  return (
    <>
      {/* Icon */}
      <div className="flex-shrink-0">
        {notification.sender_avatar ? (
          <img
            src={notification.sender_avatar}
            alt={notification.sender_name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">
            {getNotificationIcon(notification.type)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 leading-snug">
              {notification.title}
            </p>
            <p className="text-sm text-gray-600 mt-1 leading-snug">
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
        
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {getTimeAgo(notification.created_at)}
          </div>
          
          {/* Action data preview for special notifications */}
          {notification.action_data && notification.type === 'price_drop' && (
            <div className="text-xs text-green-600 font-medium">
              {notification.action_data.discount_percent}% off
            </div>
          )}
        </div>

        {/* Action data image for certain notifications */}
        {notification.action_data?.product_image && (
          <div className="mt-2">
            <img
              src={notification.action_data.product_image}
              alt="Product"
              className="w-12 h-12 object-cover rounded border"
            />
          </div>
        )}
      </div>
    </>
  );
};

export default RealtimeNotificationCenter;