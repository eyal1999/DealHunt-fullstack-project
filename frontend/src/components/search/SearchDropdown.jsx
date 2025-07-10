import React, { useState, useEffect, useRef } from 'react';
import useSearchHistory from '../../hooks/useSearchHistory';

const SearchDropdown = ({ 
  searchQuery, 
  onSearch, 
  onQueryChange, 
  placeholder = "Search for products...",
  className = "",
  showOnFocus = true,
  variant = "default" // "default" | "hero"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Use shared search history hook
  const { searchHistory, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

  // Filter search history based on current query
  useEffect(() => {
    const maxItems = variant === "hero" ? 6 : 8; // Limit items in hero variant to prevent collision
    
    if (!searchQuery.trim()) {
      setFilteredHistory(searchHistory.slice(0, maxItems)); // Show recent searches
    } else {
      const filtered = searchHistory.filter(item =>
        item.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5); // Show max 5 filtered results
      setFilteredHistory(filtered);
    }
    setSelectedIndex(-1); // Reset selection when query changes
  }, [searchQuery, searchHistory, variant]);

  // Handle removing item from history
  const handleRemoveFromHistory = (queryToRemove, e) => {
    e.stopPropagation();
    e.preventDefault();
    removeFromHistory(queryToRemove);
  };

  // Handle clearing all history
  const handleClearHistory = (e) => {
    e.stopPropagation();
    e.preventDefault();
    clearHistory();
    setIsOpen(false);
  };

  // Handle input focus
  const handleFocus = () => {
    if (showOnFocus) {
      setIsOpen(true);
    }
  };

  // Handle input blur
  const handleBlur = (e) => {
    // Delay closing to allow clicks on dropdown items
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 200);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    onQueryChange(value);
    
    if (value.trim()) {
      setIsOpen(true);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    // Close dropdown and update query first
    setIsOpen(false);
    onQueryChange(suggestion);
    
    // Add to history and navigate
    addToHistory(suggestion);
    onSearch(suggestion);
    
    // Blur input after a short delay
    setTimeout(() => {
      inputRef.current?.blur();
    }, 50);
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addToHistory(searchQuery.trim());
      onSearch(searchQuery.trim());
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || filteredHistory.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredHistory.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(filteredHistory[selectedIndex]);
        } else if (searchQuery.trim()) {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className={`w-full ${
              variant === "hero" 
                ? "p-4 pr-12 text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-secondary border-none" 
                : "p-2 pl-10 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
            }`}
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          <button
            type="submit"
            className={`absolute ${
              variant === "hero"
                ? "right-2.5 top-1/2 -translate-y-1/2 bg-secondary text-white p-2.5 rounded-full hover:bg-yellow-500"
                : "inset-y-0 left-0 pl-3 flex items-center"
            }`}
          >
            <svg
              className={`${variant === "hero" ? "w-5 h-5" : "h-5 w-5 text-gray-400"}`}
              fill={variant === "hero" ? "currentColor" : "none"}
              viewBox={variant === "hero" ? "0 0 20 20" : "0 0 24 24"}
              stroke={variant === "hero" ? undefined : "currentColor"}
              xmlns="http://www.w3.org/2000/svg"
            >
              {variant === "hero" ? (
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                ></path>
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              )}
            </svg>
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg overflow-y-auto ${
            variant === "hero" 
              ? "z-[9999] max-h-80 shadow-2xl" 
              : "z-50 max-h-96 shadow-lg"
          }`}
        >
          {filteredHistory.length > 0 ? (
            <>
              <div className="px-4 py-2 text-xs text-gray-500 border-b">
                {searchQuery.trim() ? 'Related searches' : 'Recent searches'}
              </div>
              {filteredHistory.map((item, index) => (
                <div
                  key={index}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between group ${
                    selectedIndex === index ? 'bg-blue-50' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSuggestionClick(item);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <svg 
                      className="h-4 w-4 text-gray-400" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                  <button
                    onClick={(e) => handleRemoveFromHistory(item, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                    title="Remove from history"
                  >
                    <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {searchHistory.length > 0 && (
                <div className="border-t">
                  <button
                    onClick={handleClearHistory}
                    className="w-full px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 text-left"
                  >
                    Clear search history
                  </button>
                </div>
              )}
            </>
          ) : searchHistory.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Start searching to see your history here
            </div>
          ) : (
            <div className="px-4 py-3 text-center text-gray-500 text-sm">
              No matching searches found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchDropdown;