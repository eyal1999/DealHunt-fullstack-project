// Movie-style skeleton loading component for search results page
import React from 'react';

const SearchResultsSkeleton = ({ showFilters = true, showSortControls = true, showHeader = false }) => {
  return (
    <div className="animate-pulse">
      {/* Search Header Skeleton */}
      {showHeader && (
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-40"></div>
            </div>
            <div className="flex space-x-2">
              <div className="h-8 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded w-8"></div>
              <div className="h-8 bg-gray-200 rounded w-8"></div>
            </div>
          </div>
        </div>
      )}

      {/* Search Results Layout */}
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Filters Sidebar Skeleton */}
        {showFilters && (
          <div className="w-full md:w-1/4">
            <div className="bg-white rounded-lg shadow p-4 space-y-6">
              
              {/* Filters Header */}
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>

              {/* Price Range Filter */}
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-24"></div>
                <div className="flex space-x-2">
                  <div className="h-10 bg-gray-200 rounded flex-1"></div>
                  <div className="h-10 bg-gray-200 rounded flex-1"></div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-20"></div>
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <div className="h-4 bg-gray-200 rounded w-4"></div>
                      <div className="h-4 bg-gray-200 rounded flex-1"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marketplace Filter */}
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-28"></div>
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <div className="h-4 bg-gray-200 rounded w-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className={`${showFilters ? 'flex-1' : 'w-full'}`}>
          
          {/* Sort Controls Skeleton */}
          {showSortControls && (
            <div className="flex justify-between items-center mb-6">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-200 rounded w-32"></div>
                <div className="h-8 bg-gray-200 rounded w-8"></div>
              </div>
            </div>
          )}

          {/* Search Results Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                
                {/* Product Image */}
                <div className="aspect-square bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
                  
                  {/* Marketplace Badge */}
                  <div className="absolute top-2 right-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>

                  {/* Discount Badge */}
                  <div className="absolute top-2 left-2">
                    <div className="h-6 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4 space-y-3">
                  
                  {/* Product Title */}
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center space-x-2">
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center space-x-2">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                  </div>

                  {/* Shipping */}
                  <div className="h-4 bg-gray-200 rounded w-24"></div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                    <div className="h-8 bg-gray-200 rounded w-8"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button Skeleton */}
          <div className="text-center mt-8">
            <div className="h-12 bg-gray-200 rounded w-40 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Skeleton for individual product cards during infinite scroll
export const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      {/* Product Image */}
      <div className="aspect-square bg-gray-200 relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
        
        {/* Marketplace Badge */}
        <div className="absolute top-2 right-2">
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>

        {/* Discount Badge */}
        <div className="absolute top-2 left-2">
          <div className="h-6 bg-gray-200 rounded w-12"></div>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-3">
        
        {/* Product Title */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>

        {/* Price */}
        <div className="flex items-center space-x-2">
          <div className="h-6 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>

        {/* Rating */}
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>

        {/* Shipping */}
        <div className="h-4 bg-gray-200 rounded w-24"></div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <div className="h-8 bg-gray-200 rounded flex-1"></div>
          <div className="h-8 bg-gray-200 rounded w-8"></div>
        </div>
      </div>
    </div>
  );
};

// Simple skeleton for just the product grid when filters are already loaded
export const ProductGridSkeleton = () => {
  return (
    <div className="animate-pulse">
      {/* Search Results Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
            
            {/* Product Image */}
            <div className="aspect-square bg-gray-200 relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
              
              {/* Marketplace Badge */}
              <div className="absolute top-2 right-2">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>

              {/* Discount Badge */}
              <div className="absolute top-2 left-2">
                <div className="h-6 bg-gray-200 rounded w-12"></div>
              </div>
            </div>

            {/* Product Info */}
            <div className="p-4 space-y-3">
              
              {/* Product Title */}
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>

              {/* Price */}
              <div className="flex items-center space-x-2">
                <div className="h-6 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>

              {/* Rating */}
              <div className="flex items-center space-x-2">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>

              {/* Shipping */}
              <div className="h-4 bg-gray-200 rounded w-24"></div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-200 rounded flex-1"></div>
                <div className="h-8 bg-gray-200 rounded w-8"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResultsSkeleton;