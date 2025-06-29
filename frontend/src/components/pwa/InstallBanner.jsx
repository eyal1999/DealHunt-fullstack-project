// PWA install banner component
import React, { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';

const InstallBanner = () => {
  const {
    canInstall,
    isInstalled,
    promptInstall,
    isOnline,
    updateAvailable,
    updateApp
  } = usePWA();
  
  const [dismissed, setDismissed] = useState(
    localStorage.getItem('pwa-install-dismissed') === 'true'
  );
  const [installing, setInstalling] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    
    try {
      const result = await promptInstall();
      
      if (result.outcome === 'accepted') {
        console.log('PWA installation accepted');
      } else if (result.outcome === 'dismissed') {
        console.log('PWA installation dismissed');
        setDismissed(true);
        localStorage.setItem('pwa-install-dismissed', 'true');
      }
    } catch (error) {
      console.error('Installation error:', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
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

  // Show update banner if update is available
  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white rounded-lg shadow-lg z-50 border border-blue-500">
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium">App Update Available</h4>
              <p className="text-xs text-blue-100 mt-1">
                A new version of DealHunt is ready with bug fixes and improvements.
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="flex-1 bg-white text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Update Now'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-2 border border-blue-400 text-white text-sm rounded hover:bg-blue-500 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show install banner if app can be installed
  if (canInstall && !dismissed && !isInstalled) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg z-50">
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium">Install DealHunt</h4>
              <p className="text-xs text-purple-100 mt-1">
                Get faster access with our app! Install for offline browsing and instant notifications.
              </p>
              
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>Offline access</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>Push notifications</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>Faster loading</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-purple-200 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 bg-white text-purple-600 px-4 py-2 rounded text-sm font-medium hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {installing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Installing...</span>
                </div>
              ) : (
                'Install App'
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 border border-purple-300 text-white text-sm rounded hover:bg-purple-500 hover:bg-opacity-50 transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show offline indicator
  if (!isOnline) {
    return (
      <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-orange-500 text-white rounded-lg shadow-lg z-50">
        <div className="p-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">You're offline</p>
              <p className="text-xs text-orange-100">
                Some features are limited. Changes will sync when you reconnect.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show banner if installed or dismissed
  return null;
};

export default InstallBanner;