// Movie-style skeleton loading component for product details page
import React from 'react';

const ProductDetailSkeleton = () => {
  return (
    <div className="animate-pulse">
      {/* Breadcrumbs Skeleton */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-1"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-1"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>

      {/* Main Product Content - 3 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Product Images */}
        <div className="lg:col-span-1 space-y-4">
          {/* Main Image */}
          <div className="aspect-square bg-gray-200 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
          </div>
          
          {/* Thumbnail Gallery */}
          <div className="flex space-x-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-16 h-16 bg-gray-200 rounded relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column - Product Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Title and Marketplace Badge */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="h-5 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-full"></div>
              <div className="h-6 bg-gray-200 rounded w-4/5"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>

          {/* Price Section */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="h-8 bg-gray-200 rounded w-24"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 rounded w-24"></div>
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>

        {/* Right Column - Product Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Seller Information */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-32"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>

          {/* Shipping Information */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-28"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>

          {/* Return Policy */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-24"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5"></div>
            </div>
          </div>

          {/* Specifications */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-32"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="mt-12 space-y-6">
        <div className="h-7 bg-gray-200 rounded w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square bg-gray-200 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailSkeleton;