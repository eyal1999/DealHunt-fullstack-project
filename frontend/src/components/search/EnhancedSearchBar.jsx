// Enhanced search bar with smart suggestions and voice search
import React, { useState, useRef, useEffect } from 'react';
import SmartSearchSuggestions from './SmartSearchSuggestions';

const EnhancedSearchBar = ({ 
  onSearch, 
  initialQuery = '', 
  placeholder = "Search for products, brands, or categories...",
  showVoiceSearch = true,
  showFilters = true,
  className = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Voice search setup
  useEffect(() => {
    if (showVoiceSearch && 'webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        handleSearch(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Load search history
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setSearchHistory(JSON.parse(stored));
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [showVoiceSearch]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery = query) => {
    if (searchQuery.trim()) {
      // Add to search history
      const updatedHistory = [
        searchQuery.trim(),
        ...searchHistory.filter(h => h !== searchQuery.trim())
      ].slice(0, 10);
      
      setSearchHistory(updatedHistory);
      localStorage.setItem('recentSearches', JSON.stringify(updatedHistory));
      
      // Trigger search
      onSearch(searchQuery.trim());
      setShowSuggestions(false);
      setIsSearchFocused(false);
      
      // Optional: blur the input
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    setIsSearchFocused(true);
    setShowSuggestions(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setIsSearchFocused(false);
    }
  };

  const startVoiceSearch = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting voice recognition:', error);
      }
    }
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleSearchHistoryUpdate = (updatedHistory) => {
    setSearchHistory(updatedHistory);
  };

  return (
    <div ref={searchContainerRef} className={`relative ${className}`}>
      {/* Search Input Container */}
      <div className={`relative flex items-center bg-white border rounded-lg shadow-sm transition-all duration-200 ${
        isSearchFocused ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 hover:border-gray-400'
      }`}>
        
        {/* Search Icon */}
        <div className="pl-4 pr-2">
          <svg 
            className="w-5 h-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Search Input */}
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 py-3 px-2 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500"
          autoComplete="off"
        />

        {/* Input Actions */}
        <div className="flex items-center space-x-2 pr-2">
          {/* Clear Button */}
          {query && (
            <button
              onClick={clearSearch}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="Clear search"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Voice Search Button */}
          {showVoiceSearch && 'webkitSpeechRecognition' in window && (
            <button
              onClick={isListening ? stopVoiceSearch : startVoiceSearch}
              className={`p-2 rounded-full transition-all duration-200 ${
                isListening 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
              }`}
              title={isListening ? "Stop voice search" : "Start voice search"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}

          {/* Search Button */}
          <button
            onClick={() => handleSearch()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
          >
            Search
          </button>
        </div>
      </div>

      {/* Voice Search Feedback */}
      {isListening && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-red-700">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Listening... Speak now</span>
            <button
              onClick={stopVoiceSearch}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Search Suggestions */}
      <SmartSearchSuggestions
        query={query}
        onSuggestionSelect={handleSuggestionSelect}
        onSearchHistoryUpdate={handleSearchHistoryUpdate}
        visible={showSuggestions && isSearchFocused}
      />

      {/* Search Shortcuts */}
      {isSearchFocused && query.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-40">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '📱', text: 'Electronics', color: 'bg-blue-50 text-blue-700' },
              { icon: '👗', text: 'Fashion', color: 'bg-pink-50 text-pink-700' },
              { icon: '🏠', text: 'Home & Garden', color: 'bg-green-50 text-green-700' },
              { icon: '⚽', text: 'Sports', color: 'bg-orange-50 text-orange-700' }
            ].map((shortcut, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionSelect(shortcut.text.toLowerCase())}
                className={`flex items-center space-x-2 p-2 rounded-lg transition-colors hover:opacity-80 ${shortcut.color}`}
              >
                <span className="text-lg">{shortcut.icon}</span>
                <span className="text-sm font-medium">{shortcut.text}</span>
              </button>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 space-y-1">
              <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Tab</kbd> to navigate suggestions</div>
              <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to search</div>
              {showVoiceSearch && <div><kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">🎤</kbd> for voice search</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearchBar;