import { useState, useEffect, useCallback } from 'react';

// Custom hook for managing search history with cross-component synchronization
const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState([]);

  // Load search history from localStorage
  const loadSearchHistory = useCallback(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      const history = saved ? JSON.parse(saved) : [];
      setSearchHistory(history);
      return history;
    } catch (error) {
      console.error('Error loading search history:', error);
      setSearchHistory([]);
      return [];
    }
  }, []);

  // Save search history to localStorage and update state
  const saveSearchHistory = useCallback((newHistory) => {
    try {
      setSearchHistory(newHistory);
      localStorage.setItem('recentSearches', JSON.stringify(newHistory));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('searchHistoryChanged', {
        detail: { history: newHistory }
      }));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }, []);

  // Add search to history
  const addToHistory = useCallback((query) => {
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
    
    saveSearchHistory(trimmedHistory);
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

  // Listen for storage changes and custom events from other components
  useEffect(() => {
    // Load initial data
    loadSearchHistory();

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

  return {
    searchHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
    loadSearchHistory
  };
};

export default useSearchHistory;