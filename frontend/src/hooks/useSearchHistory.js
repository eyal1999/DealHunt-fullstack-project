import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/index';

// Custom hook for managing search history with cross-component synchronization
const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState([]);
  const { currentUser } = useAuth();

  // Load search history from backend (if logged in) or localStorage
  const loadSearchHistory = useCallback(async () => {
    try {
      if (currentUser) {
        // Load from backend for logged-in users
        try {
          const response = await api.get('/user/search-history');
          const backendHistory = response.search_history || [];
          
          // Merge with localStorage for better UX (get local searches too)
          const saved = localStorage.getItem('recentSearches');
          const localHistory = saved ? JSON.parse(saved) : [];
          
          // Merge and deduplicate, prioritizing backend data
          const mergedHistory = [...new Set([...backendHistory, ...localHistory])].slice(0, 20);
          
          setSearchHistory(mergedHistory);
          // Update localStorage with merged data
          localStorage.setItem('recentSearches', JSON.stringify(mergedHistory));
          return mergedHistory;
        } catch (error) {
          console.warn('Failed to load search history from backend, using localStorage:', error);
          // Fallback to localStorage if backend fails
          const saved = localStorage.getItem('recentSearches');
          const history = saved ? JSON.parse(saved) : [];
          setSearchHistory(history);
          return history;
        }
      } else {
        // Load from localStorage for non-logged-in users
        const saved = localStorage.getItem('recentSearches');
        const history = saved ? JSON.parse(saved) : [];
        setSearchHistory(history);
        return history;
      }
    } catch (error) {
      console.error('Error loading search history:', error);
      setSearchHistory([]);
      return [];
    }
  }, [currentUser]);

  // Save search history to backend (if logged in) and localStorage
  const saveSearchHistory = useCallback(async (newHistory) => {
    try {
      setSearchHistory(newHistory);
      localStorage.setItem('recentSearches', JSON.stringify(newHistory));
      
      // Save to backend if user is logged in
      if (currentUser) {
        try {
          await api.post('/user/search-history', {
            search_history: newHistory
          });
        } catch (error) {
          console.warn('Failed to save search history to backend:', error);
          // Continue with localStorage-only storage
        }
      }
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('searchHistoryChanged', {
        detail: { history: newHistory }
      }));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }, [currentUser]);

  // Add search to history
  const addToHistory = useCallback(async (query) => {
    if (!query.trim()) return;

    const currentHistory = [...searchHistory];
    
    // Remove if already exists (to move to top)
    const existingIndex = currentHistory.indexOf(query);
    if (existingIndex > -1) {
      currentHistory.splice(existingIndex, 1);
    }
    
    // Add to beginning
    currentHistory.unshift(query);
    
    // Keep only last 20 searches
    const trimmedHistory = currentHistory.slice(0, 20);
    
    await saveSearchHistory(trimmedHistory);
    
    // Force immediate sync to other components
    window.dispatchEvent(new CustomEvent('searchHistoryChanged', {
      detail: { history: trimmedHistory }
    }));
  }, [searchHistory, saveSearchHistory]);

  // Remove item from history
  const removeFromHistory = useCallback((queryToRemove) => {
    const updatedHistory = searchHistory.filter(item => item !== queryToRemove);
    saveSearchHistory(updatedHistory);
  }, [searchHistory, saveSearchHistory]);

  // Clear all history
  const clearHistory = useCallback(() => {
    saveSearchHistory([]);
  }, [saveSearchHistory]);

  // Handle search history on logout (optional privacy clearing)
  const handleLogoutHistory = useCallback(() => {
    if (!currentUser) {
      // User logged out - keep localStorage for better UX
      // Only clear if user explicitly wants privacy
      // localStorage.removeItem('recentSearches'); // Commented out for better UX
      
      // Instead, load from localStorage for anonymous browsing
      const saved = localStorage.getItem('recentSearches');
      const history = saved ? JSON.parse(saved) : [];
      setSearchHistory(history);
    }
  }, [currentUser]);

  // Listen for storage changes, custom events, and auth changes
  useEffect(() => {
    // Load initial data
    const initializeHistory = async () => {
      await loadSearchHistory();
    };
    initializeHistory();

    // Listen for localStorage changes from other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'recentSearches') {
        loadSearchHistory();
      }
    };

    // Listen for custom events from other components on same page
    const handleCustomEvent = (e) => {
      setSearchHistory(e.detail.history);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('searchHistoryChanged', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('searchHistoryChanged', handleCustomEvent);
    };
  }, [loadSearchHistory]);

  // Handle auth state changes
  useEffect(() => {
    const handleAuthChange = async () => {
      if (currentUser) {
        // User logged in - load their search history
        await loadSearchHistory();
      } else {
        // User logged out - load from localStorage for anonymous browsing
        handleLogoutHistory();
      }
    };
    handleAuthChange();
  }, [currentUser, loadSearchHistory, handleLogoutHistory]);

  return {
    searchHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
    loadSearchHistory
  };
};

export default useSearchHistory;