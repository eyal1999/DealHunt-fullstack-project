// Advanced search filters and sorting component
import React, { useState, useEffect } from 'react';

const AdvancedSearchFilters = ({ 
  onFiltersChange, 
  initialFilters = {}, 
  availableCategories = [],
  availableMarketplaces = [],
  searchResults = []
}) => {
  const [filters, setFilters] = useState({
    priceRange: { min: '', max: '' },
    categories: [],
    marketplaces: [],
    sortBy: 'relevance',
    sortOrder: 'desc',
    hasDiscount: false,
    minRating: 0,
    inStock: true,
    freeShipping: false,
    brands: [],
    conditions: ['new'],
    ...initialFilters
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableBrands, setAvailableBrands] = useState([]);

  // Sort options
  const sortOptions = [
    { value: 'relevance', label: 'Relevance', icon: '🎯' },
    { value: 'price_low', label: 'Price: Low to High', icon: '💰' },
    { value: 'price_high', label: 'Price: High to Low', icon: '💎' },
    { value: 'rating', label: 'Customer Rating', icon: '⭐' },
    { value: 'popularity', label: 'Popularity', icon: '🔥' },
    { value: 'newest', label: 'Newest First', icon: '🆕' },
    { value: 'discount', label: 'Biggest Discounts', icon: '💸' },
    { value: 'name_asc', label: 'Name A-Z', icon: '🔤' },
    { value: 'name_desc', label: 'Name Z-A', icon: '🔤' }
  ];

  // Condition options
  const conditionOptions = [
    { value: 'new', label: 'New', icon: '✨' },
    { value: 'used', label: 'Used', icon: '🔄' },
    { value: 'refurbished', label: 'Refurbished', icon: '🔧' }
  ];

  useEffect(() => {
    // Extract unique brands from search results
    const brands = [...new Set(
      searchResults
        .map(product => product.brand)
        .filter(Boolean)
    )].sort();
    setAvailableBrands(brands);
  }, [searchResults]);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleArrayFilterChange = (key, value, isChecked) => {
    setFilters(prev => ({
      ...prev,
      [key]: isChecked 
        ? [...prev[key], value]
        : prev[key].filter(item => item !== value)
    }));
  };

  const handlePriceRangeChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [field]: value
      }
    }));
  };

  const clearFilters = () => {
    setFilters({
      priceRange: { min: '', max: '' },
      categories: [],
      marketplaces: [],
      sortBy: 'relevance',
      sortOrder: 'desc',
      hasDiscount: false,
      minRating: 0,
      inStock: true,
      freeShipping: false,
      brands: [],
      conditions: ['new']
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.priceRange.min || filters.priceRange.max) count++;
    if (filters.categories.length > 0) count++;
    if (filters.marketplaces.length > 0) count++;
    if (filters.hasDiscount) count++;
    if (filters.minRating > 0) count++;
    if (!filters.inStock) count++;
    if (filters.freeShipping) count++;
    if (filters.brands.length > 0) count++;
    if (filters.conditions.length !== 1 || !filters.conditions.includes('new')) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">Filters & Sort</h3>
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
              {activeFilterCount} active
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
          </button>
          
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Quick Sort */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {sortOptions.slice(0, showAdvanced ? sortOptions.length : 5).map(option => (
            <button
              key={option.value}
              onClick={() => handleFilterChange('sortBy', option.value)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm transition-colors ${
                filters.sortBy === option.value
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceRange.min}
              onChange={(e) => handlePriceRangeChange('min', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.priceRange.max}
              onChange={(e) => handlePriceRangeChange('max', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
          <select
            multiple
            value={filters.categories}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value);
              handleFilterChange('categories', values);
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-20"
          >
            {availableCategories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Marketplaces */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Marketplaces</label>
          <div className="space-y-1">
            {availableMarketplaces.map(marketplace => (
              <label key={marketplace} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.marketplaces.includes(marketplace)}
                  onChange={(e) => handleArrayFilterChange('marketplaces', marketplace, e.target.checked)}
                  className="rounded"
                />
                <span className="capitalize">{marketplace}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Quick Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Filters</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={filters.hasDiscount}
                onChange={(e) => handleFilterChange('hasDiscount', e.target.checked)}
                className="rounded"
              />
              <span>On Sale</span>
            </label>
            
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={filters.freeShipping}
                onChange={(e) => handleFilterChange('freeShipping', e.target.checked)}
                className="rounded"
              />
              <span>Free Shipping</span>
            </label>
            
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                className="rounded"
              />
              <span>In Stock</span>
            </label>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Advanced Filters</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={filters.minRating}
                  onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">
                  {filters.minRating === 0 ? 'Any' : `${filters.minRating}+`}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Any</span>
                <span>5★</span>
              </div>
            </div>

            {/* Brands */}
            {availableBrands.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brands</label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableBrands.slice(0, 10).map(brand => (
                    <label key={brand} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.brands.includes(brand)}
                        onChange={(e) => handleArrayFilterChange('brands', brand, e.target.checked)}
                        className="rounded"
                      />
                      <span>{brand}</span>
                    </label>
                  ))}
                  {availableBrands.length > 10 && (
                    <div className="text-xs text-gray-500">
                      +{availableBrands.length - 10} more brands
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
              <div className="space-y-1">
                {conditionOptions.map(condition => (
                  <label key={condition.value} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.conditions.includes(condition.value)}
                      onChange={(e) => handleArrayFilterChange('conditions', condition.value, e.target.checked)}
                      className="rounded"
                    />
                    <span>{condition.icon}</span>
                    <span>{condition.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Search Options */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Search Options</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                />
                <span>Include similar products</span>
              </label>
              
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                />
                <span>Search in product descriptions</span>
              </label>
              
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                />
                <span>Show international shipping</span>
              </label>
              
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                />
                <span>Hide out of stock items</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Applied Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {filters.priceRange.min || filters.priceRange.max ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                Price: ${filters.priceRange.min || '0'} - ${filters.priceRange.max || '∞'}
                <button
                  onClick={() => handleFilterChange('priceRange', { min: '', max: '' })}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ) : null}

            {filters.categories.map(category => (
              <span key={category} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                {category}
                <button
                  onClick={() => handleArrayFilterChange('categories', category, false)}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            ))}

            {filters.marketplaces.map(marketplace => (
              <span key={marketplace} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                {marketplace}
                <button
                  onClick={() => handleArrayFilterChange('marketplaces', marketplace, false)}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            ))}

            {filters.hasDiscount && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                On Sale
                <button
                  onClick={() => handleFilterChange('hasDiscount', false)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </span>
            )}

            {filters.minRating > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                {filters.minRating}+ Rating
                <button
                  onClick={() => handleFilterChange('minRating', 0)}
                  className="ml-2 text-yellow-600 hover:text-yellow-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchFilters;