// Real-time notifications hook using Server-Sent Events
import { useState, useEffect, useCallback, useRef } from 'react';

export const useRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize real-time connection
  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found');
      return;
    }

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // **MANUAL IMPLEMENTATION NEEDED**: Update URL to match your actual domain
      // For development, this assumes your backend is running on the same host
      const eventSource = new EventSource(`/api/realtime/stream?token=${token}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('Real-time notifications connected');
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (err) {
          console.error('Error parsing notification data:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('EventSource error:', err);
        setConnected(false);
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setError('Failed to maintain real-time connection. Please refresh the page.');
        }
      };

    } catch (err) {
      console.error('Error creating EventSource:', err);
      setError('Failed to connect to real-time notifications');
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'connected':
        console.log('Notification stream connected:', data.message);
        break;
        
      case 'notification':
        // New notification received
        const notification = data.data;
        setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if permission granted
        showBrowserNotification(notification);
        break;
        
      case 'unread_notifications':
        // Initial unread notifications on connection
        setNotifications(data.data);
        setUnreadCount(data.data.filter(n => !n.read).length);
        break;
        
      case 'heartbeat':
        // Keep-alive heartbeat, no action needed
        break;
        
      default:
        console.log('Unknown notification type:', data.type);
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((notification) => {
    if (Notification.permission === 'granted') {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        tag: notification.id,
        requireInteraction: false,
        silent: false
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        browserNotif.close();
      }, 5000);

      // Handle click
      browserNotif.onclick = () => {
        window.focus();
        if (notification.action_url) {
          window.location.href = notification.action_url;
        }
        browserNotif.close();
      };
    }
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
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
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
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
  }, []);

  // Send test notification
  const sendTestNotification = useCallback(async (message = 'Test notification') => {
    try {
      const response = await fetch('/api/realtime/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message })
      });

      if (response.ok) {
        console.log('Test notification sent');
      } else {
        console.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    setConnected(false);
  }, []);

  // Effect to manage connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, can reduce activity
      } else {
        // Page is visible, ensure connection is active
        if (!connected && localStorage.getItem('token')) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connected, connect]);

  return {
    notifications,
    unreadCount,
    connected,
    error,
    markAsRead,
    markAllAsRead,
    requestNotificationPermission,
    sendTestNotification,
    connect,
    disconnect
  };
};

export default useRealtimeNotifications;