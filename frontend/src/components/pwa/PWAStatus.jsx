// PWA status and settings component
import React, { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';

const PWAStatus = () => {
  const {
    isInstalled,
    canInstall,
    promptInstall,
    notificationPermission,
    requestNotificationPermission,
    subscribeToPushNotifications,
    canNotify,
    needsNotificationPermission,
    notificationsBlocked,
    isOnline,
    updateAvailable,
    updateApp
  } = usePWA();

  const [subscribing, setSubscribing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleInstall = async () => {
    try {
      await promptInstall();
    } catch (error) {
      console.error('Install error:', error);
    }
  };

  const handleNotificationSetup = async () => {
    setSubscribing(true);
    
    try {
      if (needsNotificationPermission) {
        await requestNotificationPermission();
      }
      
      if (notificationPermission === 'granted') {
        await subscribeToPushNotifications();
      }
    } catch (error) {
      console.error('Notification setup error:', error);
    } finally {
      setSubscribing(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    
    try {
      await updateApp();
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getInstallationStatus = () => {
    if (isInstalled) {
      return { status: 'installed', color: 'green', text: 'Installed' };
    } else if (canInstall) {
      return { status: 'installable', color: 'blue', text: 'Can Install' };
    } else {
      return { status: 'browser', color: 'gray', text: 'Browser Only' };
    }
  };

  const getNotificationStatus = () => {
    if (notificationsBlocked) {
      return { status: 'blocked', color: 'red', text: 'Blocked' };
    } else if (canNotify) {
      return { status: 'enabled', color: 'green', text: 'Enabled' };
    } else if (needsNotificationPermission) {
      return { status: 'permission_needed', color: 'orange', text: 'Permission Needed' };
    } else {
      return { status: 'not_supported', color: 'gray', text: 'Not Supported' };
    }
  };

  const installStatus = getInstallationStatus();
  const notificationStatus = getNotificationStatus();

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">App Settings</h3>
        
        {/* Connection Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Connection Status</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          {!isOnline && (
            <p className="text-xs text-gray-500">
              You're currently offline. Some features may be limited, but your data will sync when you reconnect.
            </p>
          )}
        </div>

        {/* Installation Status */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">App Installation</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full bg-${installStatus.color}-500`}></div>
              <span className={`text-sm text-${installStatus.color}-600`}>
                {installStatus.text}
              </span>
            </div>
          </div>
          
          {installStatus.status === 'installed' && (
            <div className="space-y-2">
              <p className="text-xs text-green-600">
                ✓ DealHunt is installed as a PWA on your device
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>• Offline browsing available</div>
                <div>• Faster loading times</div>
                <div>• Desktop/home screen access</div>
              </div>
            </div>
          )}
          
          {installStatus.status === 'installable' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Install DealHunt as an app for the best experience
              </p>
              <button
                onClick={handleInstall}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600 transition-colors"
              >
                Install App
              </button>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Benefits of installing:</div>
                <div>• Works offline</div>
                <div>• Push notifications</div>
                <div>• Faster performance</div>
              </div>
            </div>
          )}
          
          {installStatus.status === 'browser' && (
            <p className="text-xs text-gray-500">
              App installation is not available in this browser or the app is already installed.
            </p>
          )}
        </div>

        {/* Notification Status */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Push Notifications</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full bg-${notificationStatus.color}-500`}></div>
              <span className={`text-sm text-${notificationStatus.color}-600`}>
                {notificationStatus.text}
              </span>
            </div>
          </div>
          
          {notificationStatus.status === 'enabled' && (
            <div className="space-y-2">
              <p className="text-xs text-green-600">
                ✓ You'll receive notifications for price drops and deals
              </p>
              <div className="text-xs text-gray-500">
                Notifications include: Price alerts, Deal recommendations, Wishlist updates
              </div>
            </div>
          )}
          
          {notificationStatus.status === 'permission_needed' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Enable notifications to get alerts about price drops and new deals
              </p>
              <button
                onClick={handleNotificationSetup}
                disabled={subscribing}
                className="w-full bg-orange-500 text-white px-4 py-2 rounded-md text-sm hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {subscribing ? 'Setting up...' : 'Enable Notifications'}
              </button>
            </div>
          )}
          
          {notificationStatus.status === 'blocked' && (
            <div className="space-y-2">
              <p className="text-xs text-red-600">
                Notifications are blocked. To enable them:
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>1. Click the lock icon in your address bar</div>
                <div>2. Set notifications to "Allow"</div>
                <div>3. Refresh the page</div>
              </div>
            </div>
          )}
          
          {notificationStatus.status === 'not_supported' && (
            <p className="text-xs text-gray-500">
              Push notifications are not supported in this browser.
            </p>
          )}
        </div>

        {/* Update Section */}
        {updateAvailable && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">App Update</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm text-blue-600">Available</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                A new version is available with improvements and bug fixes
              </p>
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Now'}
              </button>
            </div>
          </div>
        )}

        {/* Storage Info */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-gray-700">Offline Storage</span>
          <div className="text-xs text-gray-500 space-y-1">
            <div>• Product data cached for offline viewing</div>
            <div>• Wishlist changes saved locally</div>
            <div>• Search history available offline</div>
          </div>
          
          <button
            onClick={() => {
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => caches.delete(name));
                });
              }
              localStorage.removeItem('offlineQueue');
              alert('Cache cleared! Refresh the page to reload fresh data.');
            }}
            className="text-xs text-red-600 hover:text-red-800 transition-colors mt-2"
          >
            Clear Offline Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAStatus;