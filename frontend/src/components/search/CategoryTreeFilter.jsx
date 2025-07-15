// Hierarchical category tree filter with expandable checkboxes
import React, { useState, useEffect, useMemo } from 'react';

const CategoryTreeFilter = ({ 
  searchResults = [], 
  selectedCategories = [], 
  onCategoryChange
}) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set());


  // Get marketplace logo badge (same as ProductCard)
  const getMarketplaceLogo = (marketplace) => {
    const marketplaceName = marketplace?.toLowerCase();
    
    switch (marketplaceName) {
      case 'aliexpress':
        return (
          <div className="flex items-center bg-white px-1 py-0.5 rounded shadow-sm border border-gray-200 ml-2">
            <span className="text-xs font-bold text-orange-500">AliExpress</span>
          </div>
        );
      case 'ebay':
        return (
          <div className="flex items-center bg-white px-1 py-0.5 rounded shadow-sm border border-gray-200 ml-2">
            <span className="text-xs font-bold text-blue-600">e</span>
            <span className="text-xs font-bold text-red-500">b</span>
            <span className="text-xs font-bold text-yellow-500">a</span>
            <span className="text-xs font-bold text-green-500">y</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center bg-gray-800 text-white px-1 py-0.5 rounded border border-gray-600 ml-2">
            <span className="text-xs font-medium capitalize">{marketplace || 'Unknown'}</span>
          </div>
        );
    }
  };

  // Build hierarchical category structure from search results
  const categoryTree = useMemo(() => {
    const tree = {};
    const categoryMarketplaces = {}; // Track which marketplace each category comes from
    
    searchResults.forEach((product, index) => {
      
      
      // Handle marketplace-specific category hierarchy
      let parentCategory = '';
      let childCategory = '';
      
      if (product.categories && typeof product.categories === 'object') {
        if (product.marketplace === 'ebay') {
          // eBay: first_level is child, second_level is parent
          parentCategory = product.categories.second_level || '';
          childCategory = product.categories.first_level || '';
        } else if (product.marketplace === 'aliexpress') {
          // AliExpress: first_level is parent, second_level is child
          parentCategory = product.categories.first_level || '';
          childCategory = product.categories.second_level || '';
        } else {
          // Default fallback for unknown marketplaces
          parentCategory = product.categories.first_level || product.categories.category || '';
          childCategory = product.categories.second_level || '';
        }
      } else if (typeof product.categories === 'string') {
        parentCategory = product.categories;
      } else if (product.category) {
        parentCategory = product.category;
      }
      
      // Clean and validate category names
      parentCategory = parentCategory?.toString().trim() || '';
      childCategory = childCategory?.toString().trim() || '';
      
      // Skip invalid categories
      if (!parentCategory || parentCategory === 'N/A' || parentCategory.length < 2) {
        return;
      }
      
      // Initialize parent category if not exists
      if (!tree[parentCategory]) {
        tree[parentCategory] = {
          name: parentCategory,
          count: 0,
          subcategories: {},
          marketplace: product.marketplace // Track marketplace for this category
        };
        categoryMarketplaces[parentCategory] = product.marketplace;
      }
      
      tree[parentCategory].count += 1;
      
      // Add child category if exists and is different from parent
      if (childCategory && childCategory !== 'N/A' && childCategory.length > 1 && childCategory !== parentCategory) {
        if (!tree[parentCategory].subcategories[childCategory]) {
          tree[parentCategory].subcategories[childCategory] = {
            name: childCategory,
            count: 0,
            marketplace: product.marketplace // Track marketplace for subcategory
          };
        }
        tree[parentCategory].subcategories[childCategory].count += 1;
      }
    });
    
    // Sort categories by count (most popular first)
    const sortedTree = {};
    Object.keys(tree)
      .sort((a, b) => tree[b].count - tree[a].count)
      .forEach(key => {
        sortedTree[key] = tree[key];
        
        // Sort subcategories as well
        const sortedSubcategories = {};
        Object.keys(tree[key].subcategories)
          .sort((a, b) => tree[key].subcategories[b].count - tree[key].subcategories[a].count)
          .forEach(subKey => {
            sortedSubcategories[subKey] = tree[key].subcategories[subKey];
          });
        sortedTree[key].subcategories = sortedSubcategories;
      });
    
    
    return sortedTree;
  }, [searchResults]);

  // Toggle category expansion
  const toggleExpansion = (categoryName) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  // Handle category selection
  const handleCategoryToggle = (categoryPath, isChecked) => {
    let newSelected = [...selectedCategories];
    
    if (isChecked) {
      // Add category if not already selected
      if (!newSelected.includes(categoryPath)) {
        newSelected.push(categoryPath);
      }
    } else {
      // Remove category and all its subcategories
      newSelected = newSelected.filter(cat => 
        !cat.startsWith(categoryPath)
      );
    }
    
    onCategoryChange(newSelected);
  };

  // Check if category or any of its subcategories is selected
  const isCategorySelected = (categoryPath) => {
    return selectedCategories.some(cat => cat.startsWith(categoryPath));
  };

  // Check if specific category path is directly selected
  const isExactCategorySelected = (categoryPath) => {
    return selectedCategories.includes(categoryPath);
  };

  // Get category selection state for indeterminate checkboxes
  const getCategoryState = (categoryName) => {
    const categoryPath = categoryName;
    const subcategories = Object.keys(categoryTree[categoryName]?.subcategories || {});
    
    const directlySelected = isExactCategorySelected(categoryPath);
    const hasSelectedSubcategories = subcategories.some(subcat => 
      isExactCategorySelected(`${categoryPath} > ${subcat}`)
    );
    
    if (directlySelected && !hasSelectedSubcategories) {
      return { checked: true, indeterminate: false };
    } else if (!directlySelected && hasSelectedSubcategories) {
      return { checked: false, indeterminate: true };
    } else if (directlySelected && hasSelectedSubcategories) {
      return { checked: true, indeterminate: true };
    } else {
      return { checked: false, indeterminate: false };
    }
  };

  const totalCategories = Object.keys(categoryTree).length;
  
  if (totalCategories === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        No categories available for current search results
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          Categories
        </h3>
        {selectedCategories.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => onCategoryChange([])}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Clear all ({selectedCategories.length})
            </button>
          </div>
        )}
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {Object.entries(categoryTree).map(([categoryName, categoryData]) => {
          const hasSubcategories = Object.keys(categoryData.subcategories).length > 0;
          const isExpanded = expandedCategories.has(categoryName);
          const categoryState = getCategoryState(categoryName);
          const categoryPath = categoryName;
          
          return (
            <div key={categoryName} className="border-b border-gray-100 last:border-b-0">
              {/* Main Category */}
              <div className="flex items-center p-3 hover:bg-gray-50">
                <div className="flex items-center flex-1">
                  <input
                    type="checkbox"
                    checked={categoryState.checked}
                    ref={el => {
                      if (el) el.indeterminate = categoryState.indeterminate;
                    }}
                    onChange={(e) => handleCategoryToggle(categoryPath, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label 
                    className="ml-3 text-sm font-medium text-gray-900 flex-1 cursor-pointer"
                    onClick={() => {
                      const newChecked = !categoryState.checked;
                      handleCategoryToggle(categoryPath, newChecked);
                    }}
                  >
                    <span className="flex items-center">
                      {categoryName}
                      {getMarketplaceLogo(categoryData.marketplace)}
                    </span>
                  </label>
                </div>
                
                {hasSubcategories && (
                  <button
                    onClick={() => toggleExpansion(categoryName)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg 
                      className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Subcategories */}
              {hasSubcategories && isExpanded && (
                <div className="bg-gray-50">
                  {Object.entries(categoryData.subcategories).map(([subCategoryName, subCategoryData]) => {
                    const subCategoryPath = `${categoryName} > ${subCategoryName}`;
                    const isSubSelected = isExactCategorySelected(subCategoryPath);
                    
                    return (
                      <div key={subCategoryName} className="flex items-center p-3 pl-8 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={isSubSelected}
                          onChange={(e) => handleCategoryToggle(subCategoryPath, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label 
                          className="ml-3 text-sm text-gray-700 flex-1 cursor-pointer"
                          onClick={() => handleCategoryToggle(subCategoryPath, !isSubSelected)}
                        >
                          <span className="flex items-center">
                            {subCategoryName}
                            {getMarketplaceLogo(subCategoryData.marketplace)}
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryTreeFilter;