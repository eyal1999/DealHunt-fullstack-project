// PWA utility functions
class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isInstallable = false;
    this.registration = null;
    
    this.init();
  }

  async init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', this.registration);
        
        // Listen for updates
        this.registration.addEventListener('updatefound', () => {
          this.handleServiceWorkerUpdate();
        });
        
        // Check if already controlled by SW
        if (navigator.serviceWorker.controller) {
          console.log('Page is already controlled by a service worker');
        }
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('Install prompt fired');
      e.preventDefault();
      this.deferredPrompt = e;
      this.isInstallable = true;
      this.dispatchInstallableEvent();
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.dispatchInstalledEvent();
    });

    // Check if already installed
    this.checkIfInstalled();
  }

  handleServiceWorkerUpdate() {
    const newWorker = this.registration.installing;
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New service worker installed, show update available notification
        this.dispatchUpdateAvailableEvent();
      }
    });
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      return { outcome: 'no_prompt' };
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      this.deferredPrompt = null;
      this.isInstallable = false;
      
      if (outcome === 'accepted') {
        this.isInstalled = true;
      }
      
      return { outcome };
      
    } catch (error) {
      console.error('Install prompt error:', error);
      return { outcome: 'error', error };
    }
  }

  checkIfInstalled() {
    // Check if running in standalone mode (installed PWA)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      return true;
    }
    
    // Check for iOS standalone mode
    if (window.navigator.standalone === true) {
      this.isInstalled = true;
      return true;
    }
    
    return false;
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return 'not_supported';
    }
    
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    
    const permission = await Notification.requestPermission();
    return permission;
  }

  async subscribeToPushNotifications() {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }
    
    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }
    
    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          // You'll need to replace this with your actual VAPID public key
          'BEl62iUYgUivxIkv69yViEuiBIa40HI08PToHYMcJTn9QKnCZHh02YJMhSrGLhNrj8o1q0DyGHpklHc-QHWQeE'
        )
      });
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
      
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  }

  async sendSubscriptionToServer(subscription) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save subscription to server');
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async cacheForOffline(url, data) {
    if (!('caches' in window)) {
      return false;
    }
    
    try {
      const cache = await caches.open('dealhunt-dynamic-v1');
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(url, response);
      return true;
    } catch (error) {
      console.error('Cache error:', error);
      return false;
    }
  }

  async getFromCache(url) {
    if (!('caches' in window)) {
      return null;
    }
    
    try {
      const cache = await caches.open('dealhunt-dynamic-v1');
      const response = await cache.match(url);
      if (response) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  async addToOfflineQueue(action) {
    // Store actions to be performed when back online
    const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    offlineQueue.push({
      ...action,
      timestamp: Date.now()
    });
    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
    
    // Request background sync if available
    if (this.registration && 'sync' in this.registration) {
      try {
        await this.registration.sync.register('offline-actions');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  async processOfflineQueue() {
    const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    const processedActions = [];
    
    for (const action of offlineQueue) {
      try {
        await this.performAction(action);
        processedActions.push(action);
      } catch (error) {
        console.error('Failed to process offline action:', error);
        // Keep failed actions in queue for retry
      }
    }
    
    // Remove processed actions from queue
    const remainingQueue = offlineQueue.filter(
      action => !processedActions.includes(action)
    );
    localStorage.setItem('offlineQueue', JSON.stringify(remainingQueue));
    
    return {
      processed: processedActions.length,
      remaining: remainingQueue.length
    };
  }

  async performAction(action) {
    const response = await fetch(action.url, {
      method: action.method,
      headers: action.headers,
      body: action.body
    });
    
    if (!response.ok) {
      throw new Error(`Action failed: ${response.status}`);
    }
    
    return response;
  }

  // Event dispatchers
  dispatchInstallableEvent() {
    window.dispatchEvent(new CustomEvent('pwa:installable', {
      detail: { installable: this.isInstallable }
    }));
  }

  dispatchInstalledEvent() {
    window.dispatchEvent(new CustomEvent('pwa:installed', {
      detail: { installed: this.isInstalled }
    }));
  }

  dispatchUpdateAvailableEvent() {
    window.dispatchEvent(new CustomEvent('pwa:update-available'));
  }

  // Getters
  get installable() {
    return this.isInstallable;
  }

  get installed() {
    return this.isInstalled;
  }

  get serviceWorkerRegistration() {
    return this.registration;
  }
}

// Create singleton instance
const pwaManager = new PWAManager();

export default pwaManager;