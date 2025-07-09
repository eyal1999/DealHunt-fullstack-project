import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { wishlistService } from '../api/apiServices';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // Ref to track current wishlist items to avoid stale closures
  const wishlistItemsRef = useRef([]);
  
  // Update ref whenever wishlistItems changes
  useEffect(() => {
    wishlistItemsRef.current = wishlistItems;
  }, [wishlistItems]);

  // Fetch wishlist items with seamless loading
  const fetchWishlist = useCallback(async (force = false, silent = false) => {
    if (!isAuthenticated) {
      setWishlistItems([]);
      return;
    }

    // Prevent multiple simultaneous fetches
    if (isLoading && !force) {
      return;
    }

    // Rate limiting - don't fetch more than once per 500ms unless forced
    const now = Date.now();
    if (!force && lastFetchTime && (now - lastFetchTime) < 500) {
      return;
    }

    try {
      // Only show loading for initial loads, not for background refreshes
      if (!silent && wishlistItemsRef.current.length === 0) {
        setIsLoading(true);
      }
      setError(null);

      const items = await wishlistService.getWishlist();

      // Validate each item has required fields
      const validItems = items.filter((item) => {
        const hasId = item.id && typeof item.id === "string";
        const hasRequiredFields =
          item.title && item.product_id && item.marketplace;

        if (!hasId || !hasRequiredFields) {
          console.error("Invalid wishlist item:", item);
          return false;
        }

        return true;
      });

      // Smooth update - only update if data actually changed
      if (JSON.stringify(validItems) !== JSON.stringify(wishlistItemsRef.current)) {
        setWishlistItems(validItems);
      }
      
      setLastFetchTime(now);
    } catch (err) {
      console.error("Error fetching wishlist:", err);
      setError(err.message || "Failed to load wishlist");
    } finally {
      if (!silent && wishlistItemsRef.current.length === 0) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, isLoading, lastFetchTime]);

  // Add item to wishlist
  const addToWishlist = useCallback(async (productData) => {
    try {
      const result = await wishlistService.addToWishlist(productData);
      
      // Silent refresh to get the new item without UI disruption
      await fetchWishlist(true, true);
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('wishlistUpdated', { 
        detail: { action: 'added', product: productData } 
      }));
      
      // Also notify other tabs via localStorage
      localStorage.setItem('wishlistUpdated', JSON.stringify({
        action: 'added',
        timestamp: Date.now(),
        product: productData
      }));
      
      return result;
    } catch (error) {
      console.error('WishlistContext: Error adding to wishlist:', error);
      throw error;
    }
  }, [fetchWishlist]);

  // Remove item from wishlist
  const removeFromWishlist = useCallback(async (itemId) => {
    try {
      // Find the item that will be removed BEFORE the API call
      const removedItem = wishlistItemsRef.current.find(item => item.id === itemId);
      
      // Optimistic update: immediately remove from local state
      const updatedItems = wishlistItemsRef.current.filter(item => item.id !== itemId);
      setWishlistItems(updatedItems);
      
      const result = await wishlistService.removeFromWishlist(itemId);
      
      // Ensure the optimistic update sticks
      setWishlistItems(prev => prev.filter(item => item.id !== itemId));
      
      // Silent refresh after removal to avoid UI flash
      await fetchWishlist(true, true);
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('wishlistUpdated', { 
        detail: { 
          action: 'removed', 
          productId: removedItem?.product_id, 
          marketplace: removedItem?.marketplace 
        } 
      }));
      
      // Also notify other tabs via localStorage
      localStorage.setItem('wishlistUpdated', JSON.stringify({
        action: 'removed',
        timestamp: Date.now(),
        productId: removedItem?.product_id,
        marketplace: removedItem?.marketplace
      }));
      
      return result;
    } catch (error) {
      console.error('WishlistContext: Error removing from wishlist:', error);
      
      // Revert optimistic update on error (silent to avoid UI flash)
      await fetchWishlist(true, true);
      
      throw error;
    }
  }, [fetchWishlist]);

  // Check if item is in wishlist
  const isInWishlist = useCallback((productId, marketplace) => {
    return wishlistItemsRef.current.some(
      item => item.product_id === productId && item.marketplace === marketplace
    );
  }, []);

  // Get wishlist item by product ID and marketplace
  const getWishlistItem = useCallback((productId, marketplace) => {
    return wishlistItemsRef.current.find(
      item => item.product_id === productId && item.marketplace === marketplace
    );
  }, []);

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist().catch(err => {
        console.error('Initial wishlist fetch failed:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Listen for wishlist updates from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'wishlistUpdated' && e.newValue) {
        fetchWishlist(true, true);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      // Clear any pending refresh timers on unmount
      if (window.wishlistRefreshTimers) {
        window.wishlistRefreshTimers.forEach(timer => clearTimeout(timer));
        window.wishlistRefreshTimers = [];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Force refresh function for external components (silent to avoid UI flash)
  const forceRefresh = useCallback(() => {
    // Clear any existing refresh timers
    if (window.wishlistRefreshTimers) {
      window.wishlistRefreshTimers.forEach(timer => clearTimeout(timer));
      window.wishlistRefreshTimers = [];
    } else {
      window.wishlistRefreshTimers = [];
    }
    
    // Silent refresh to avoid UI disruption
    fetchWishlist(true, true);
  }, [fetchWishlist]);

  const value = {
    wishlistItems,
    isLoading,
    error,
    fetchWishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    getWishlistItem,
    forceRefresh,
  };
  

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};