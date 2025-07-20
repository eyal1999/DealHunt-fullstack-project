import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'recentlyViewedProducts';
const MAX_ITEMS = 12;
const EXPIRY_DAYS = 30;

export const useRecentlyViewed = () => {
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Load recently viewed products from localStorage
  const loadRecentlyViewed = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out expired items (older than 30 days)
        const now = Date.now();
        const filtered = parsed.filter(item => {
          const itemAge = now - item.viewedAt;
          const thirtyDaysInMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
          return itemAge < thirtyDaysInMs;
        });
        
        // Sort by most recent first
        filtered.sort((a, b) => b.viewedAt - a.viewedAt);
        
        setRecentlyViewed(filtered);
        
        // Update localStorage if we filtered out expired items
        if (filtered.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
      }
    } catch (error) {
      console.error('Error loading recently viewed products:', error);
      setRecentlyViewed([]);
    }
  }, []);

  // Add a product to recently viewed
  const addProduct = useCallback((productData) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let products = stored ? JSON.parse(stored) : [];
      
      // Create the product entry
      const newProduct = {
        product_id: productData.product_id,
        marketplace: productData.marketplace,
        title: productData.title,
        main_image: productData.main_image,
        sale_price: productData.sale_price,
        original_price: productData.original_price,
        affiliate_link: productData.affiliate_link,
        viewedAt: Date.now()
      };
      
      // Remove existing entry for the same product if it exists
      products = products.filter(
        p => !(p.product_id === newProduct.product_id && p.marketplace === newProduct.marketplace)
      );
      
      // Add new product at the beginning
      products.unshift(newProduct);
      
      // Keep only the most recent MAX_ITEMS
      products = products.slice(0, MAX_ITEMS);
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
      
      // Update state
      setRecentlyViewed(products);
    } catch (error) {
      console.error('Error adding product to recently viewed:', error);
    }
  }, []);

  // Remove a specific product from recently viewed
  const removeProduct = useCallback((productId, marketplace) => {
    try {
      const filtered = recentlyViewed.filter(
        p => !(p.product_id === productId && p.marketplace === marketplace)
      );
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      setRecentlyViewed(filtered);
    } catch (error) {
      console.error('Error removing product from recently viewed:', error);
    }
  }, [recentlyViewed]);

  // Clear all recently viewed products
  const clearAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentlyViewed([]);
    } catch (error) {
      console.error('Error clearing recently viewed products:', error);
    }
  }, []);

  // Get time since viewed (for display)
  const getTimeSinceViewed = useCallback((viewedAt) => {
    const now = Date.now();
    const diff = now - viewedAt;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return new Date(viewedAt).toLocaleDateString();
  }, []);

  // Load on mount
  useEffect(() => {
    loadRecentlyViewed();
  }, [loadRecentlyViewed]);

  return {
    recentlyViewed,
    addProduct,
    removeProduct,
    clearAll,
    getTimeSinceViewed,
    loadRecentlyViewed
  };
};