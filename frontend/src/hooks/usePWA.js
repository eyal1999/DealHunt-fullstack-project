// React hook for PWA functionality
import { useState, useEffect, useCallback } from 'react';
import pwaManager from '../utils/pwa';

export const usePWA = () => {
  const [isInstallable, setIsInstallable] = useState(pwaManager.installable);
  const [isInstalled, setIsInstalled] = useState(pwaManager.installed);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationPermission, setNotificationPermission] = useState(
    'Notification' in window ? Notification.permission : 'not_supported'
  );

  useEffect(() => {
    // Listen for PWA events
    const handleInstallable = (event) => {
      setIsInstallable(event.detail.installable);
    };

    const handleInstalled = (event) => {
      setIsInstalled(event.detail.installed);
      setIsInstallable(false);
    };

    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    const handleOnline = () => {
      setIsOnline(true);
      // Process offline queue when back online
      pwaManager.processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener('pwa:installable', handleInstallable);
    window.addEventListener('pwa:installed', handleInstalled);
    window.addEventListener('pwa:update-available', handleUpdateAvailable);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('pwa:installable', handleInstallable);
      window.removeEventListener('pwa:installed', handleInstalled);
      window.removeEventListener('pwa:update-available', handleUpdateAvailable);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    try {
      const result = await pwaManager.promptInstall();
      
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      
      return result;
    } catch (error) {
      console.error('Install prompt error:', error);
      return { outcome: 'error', error };
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    try {
      const permission = await pwaManager.requestNotificationPermission();
      setNotificationPermission(permission);
      return permission;
    } catch (error) {
      console.error('Notification permission error:', error);
      return 'error';
    }
  }, []);

  const subscribeToPushNotifications = useCallback(async () => {
    try {
      const subscription = await pwaManager.subscribeToPushNotifications();
      return subscription;
    } catch (error) {
      console.error('Push subscription error:', error);
      throw error;
    }
  }, []);

  const updateApp = useCallback(async () => {
    if (pwaManager.serviceWorkerRegistration) {
      const registration = pwaManager.serviceWorkerRegistration;
      
      if (registration.waiting) {
        // Tell the waiting service worker to skip waiting and become active
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Listen for the controlling service worker to change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      }
    }
  }, []);

  const addToOfflineQueue = useCallback(async (action) => {
    return await pwaManager.addToOfflineQueue(action);
  }, []);

  const cacheData = useCallback(async (url, data) => {
    return await pwaManager.cacheForOffline(url, data);
  }, []);

  const getCachedData = useCallback(async (url) => {
    return await pwaManager.getFromCache(url);
  }, []);

  return {
    // State
    isInstallable,
    isInstalled,
    updateAvailable,
    isOnline,
    notificationPermission,
    
    // Actions
    promptInstall,
    requestNotificationPermission,
    subscribeToPushNotifications,
    updateApp,
    addToOfflineQueue,
    cacheData,
    getCachedData,
    
    // Computed values
    canInstall: isInstallable && !isInstalled,
    canNotify: notificationPermission === 'granted',
    needsNotificationPermission: notificationPermission === 'default',
    notificationsBlocked: notificationPermission === 'denied'
  };
};

// Hook for offline-aware API calls
export const useOfflineAwareAPI = () => {
  const { isOnline, addToOfflineQueue, cacheData, getCachedData } = usePWA();

  const apiCall = useCallback(async (url, options = {}) => {
    const { method = 'GET', ...restOptions } = options;
    
    // If offline and it's a GET request, try to get from cache
    if (!isOnline && method === 'GET') {
      const cachedData = await getCachedData(url);
      if (cachedData) {
        return { data: cachedData, fromCache: true };
      }
      throw new Error('No cached data available offline');
    }
    
    // If offline and it's a mutating request, add to offline queue
    if (!isOnline && method !== 'GET') {
      await addToOfflineQueue({
        url,
        method,
        headers: restOptions.headers,
        body: restOptions.body
      });
      
      return { queued: true, message: 'Action queued for when back online' };
    }
    
    // Online - make normal API call
    try {
      const response = await fetch(url, { method, ...restOptions });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache GET responses for offline use
      if (method === 'GET') {
        await cacheData(url, data);
      }
      
      return { data, fromCache: false };
      
    } catch (error) {
      // If network error and it's a GET request, try cache
      if (method === 'GET') {
        const cachedData = await getCachedData(url);
        if (cachedData) {
          return { data: cachedData, fromCache: true };
        }
      }
      throw error;
    }
  }, [isOnline, addToOfflineQueue, cacheData, getCachedData]);

  return {
    apiCall,
    isOnline
  };
};