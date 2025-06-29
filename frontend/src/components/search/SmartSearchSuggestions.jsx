// Smart search suggestions with autocomplete and recent searches
import React, { useState, useEffect, useRef } from 'react';

const SmartSearchSuggestions = ({ 
  query, 
  onSuggestionSelect, 
  onSearchHistoryUpdate,
  visible = false 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const suggestionsRef = useRef(null);

  // Popular search categories and suggestions
  const popularCategories = [
    { name: 'Electronics', icon: '📱', searches: ['iPhone', 'laptop', 'headphones', 'smartwatch'] },
    { name: 'Fashion', icon: '👗', searches: ['shoes', 'dress', 'jacket', 'accessories'] },
    { name: 'Home', icon: '🏠', searches: ['furniture', 'decor', 'kitchen', 'bedding'] },
    { name: 'Sports', icon: '⚽', searches: ['fitness', 'running shoes', 'yoga mat', 'gym equipment'] }
  ];

  useEffect(() => {
    // Load recent searches from localStorage
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored).slice(0, 5));
    }

    // Load trending searches (mock data)
    setTrendingSearches([
      { query: 'iPhone 15', trend: 'up', searches: 1250 },
      { query: 'Winter jacket', trend: 'up', searches: 890 },
      { query: 'Gaming laptop', trend: 'up', searches: 756 },
      { query: 'Wireless earbuds', trend: 'down', searches: 634 },
      { query: 'Smart home', trend: 'up', searches: 523 }
    ]);
  }, []);

  useEffect(() => {
    if (query && query.length >= 2) {
      fetchSuggestions(query);
    } else {
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  }, [query]);

  const fetchSuggestions = async (searchQuery) => {
    setLoading(true);
    
    try {
      // Mock API call - in real implementation, this would call your search suggestions API
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate API delay
      
      const mockSuggestions = generateMockSuggestions(searchQuery);
      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockSuggestions = (searchQuery) => {
    const allSuggestions = [
      // Product suggestions
      { type: 'product', text: `${searchQuery} deals`, icon: '💰', category: 'deals' },
      { type: 'product', text: `${searchQuery} review`, icon: '⭐', category: 'reviews' },
      { type: 'product', text: `best ${searchQuery}`, icon: '🏆', category: 'best' },
      { type: 'product', text: `cheap ${searchQuery}`, icon: '💸', category: 'budget' },
      { type: 'product', text: `${searchQuery} comparison`, icon: '⚖️', category: 'compare' },
      
      // Brand suggestions
      { type: 'brand', text: `${searchQuery} Apple`, icon: '🍎', category: 'brand' },
      { type: 'brand', text: `${searchQuery} Samsung`, icon: '📱', category: 'brand' },
      { type: 'brand', text: `${searchQuery} Nike`, icon: '👟', category: 'brand' },
      
      // Category suggestions
      { type: 'category', text: `${searchQuery} electronics`, icon: '📱', category: 'electronics' },
      { type: 'category', text: `${searchQuery} fashion`, icon: '👗', category: 'fashion' },
      { type: 'category', text: `${searchQuery} home`, icon: '🏠', category: 'home' },
    ];

    // Filter and sort suggestions based on relevance
    return allSuggestions
      .filter(suggestion => 
        suggestion.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        searchQuery.toLowerCase().includes(suggestion.text.toLowerCase().split(' ')[0])
      )
      .slice(0, 8);
  };

  const handleSuggestionClick = (suggestion) => {
    const searchText = typeof suggestion === 'string' ? suggestion : suggestion.text;
    addToSearchHistory(searchText);
    onSuggestionSelect(searchText);
  };

  const addToSearchHistory = (searchQuery) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
    onSearchHistoryUpdate && onSearchHistoryUpdate(updated);
  };

  const clearSearchHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
    onSearchHistoryUpdate && onSearchHistoryUpdate([]);
  };

  const handleKeyNavigation = (e) => {
    if (!visible) return;
    
    const allItems = [
      ...suggestions,
      ...(query.length < 2 ? recentSearches.map(s => ({ text: s, type: 'recent' })) : [])
    ];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev <= 0 ? allItems.length - 1 : prev - 1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(allItems[selectedIndex]);
    } else if (e.key === 'Escape') {
      setSelectedIndex(-1);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyNavigation);
    return () => document.removeEventListener('keydown', handleKeyNavigation);
  }, [visible, selectedIndex, suggestions, recentSearches, query]);

  if (!visible) return null;

  const showRecentSearches = query.length < 2 && recentSearches.length > 0;
  const showTrendingSearches = query.length < 2;
  const showSuggestions = query.length >= 2 && suggestions.length > 0;

  return (
    <div 
      ref={suggestionsRef}
      className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
    >
      {/* Loading */}
      {loading && (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <span className="text-sm text-gray-500 mt-2">Searching...</span>
        </div>
      )}

      {/* Search Suggestions */}
      {showSuggestions && !loading && (
        <div>
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Suggestions</h3>
          </div>
          <div className="py-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                  selectedIndex === index ? 'bg-blue-50 text-blue-800' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{suggestion.icon}</span>
                <div className="flex-1">
                  <div className="text-sm">{suggestion.text}</div>
                  <div className="text-xs text-gray-500 capitalize">{suggestion.type}</div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {showRecentSearches && !loading && (
        <div>
          <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-900">Recent Searches</h3>
            <button
              onClick={clearSearchHistory}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          <div className="py-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(search)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                  selectedIndex === (suggestions.length + index) ? 'bg-blue-50 text-blue-800' : 'text-gray-700'
                }`}
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{search}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending Searches */}
      {showTrendingSearches && !loading && (
        <div>
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Trending Searches</h3>
          </div>
          <div className="py-2">
            {trendingSearches.slice(0, 5).map((trending, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(trending.query)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-3 transition-colors"
              >
                <div className={`text-lg ${trending.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {trending.trend === 'up' ? '📈' : '📉'}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-900">{trending.query}</div>
                  <div className="text-xs text-gray-500">{trending.searches} searches</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular Categories */}
      {query.length < 2 && !loading && (
        <div>
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Popular Categories</h3>
          </div>
          <div className="py-2">
            {popularCategories.map((category, index) => (
              <div key={index} className="px-4 py-2">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{category.name}</span>
                </div>
                <div className="flex flex-wrap gap-1 ml-7">
                  {category.searches.map((search, searchIndex) => (
                    <button
                      key={searchIndex}
                      onClick={() => handleSuggestionClick(search)}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {query.length >= 2 && suggestions.length === 0 && !loading && (
        <div className="p-4 text-center text-gray-500">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-sm">No suggestions found for "{query}"</p>
          <p className="text-xs mt-1">Try a different search term</p>
        </div>
      )}

      {/* Search Tips */}
      {query.length === 0 && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <div className="text-xs text-gray-600">
            <strong>Search Tips:</strong> Try product names, brands, or categories. Use quotes for exact phrases.
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSearchSuggestions;