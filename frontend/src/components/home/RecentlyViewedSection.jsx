import React, { useState, useRef, useEffect } from 'react';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import ProductCard from '../product/ProductCard';
import { XMarkIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const RecentlyViewedSection = () => {
  const { recentlyViewed, clearAll, removeProduct, getTimeSinceViewed } = useRecentlyViewed();
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position to show/hide navigation arrows
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Handle scroll navigation
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 288; // w-72 = 18rem = 288px
      scrollContainerRef.current.scrollBy({
        left: -cardWidth * 2, // Scroll 2 cards at a time
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 288; // w-72 = 18rem = 288px
      scrollContainerRef.current.scrollBy({
        left: cardWidth * 2, // Scroll 2 cards at a time
        behavior: 'smooth'
      });
    }
  };

  // Handle individual product removal
  const handleRemoveProduct = (productId, marketplace, event) => {
    event.preventDefault();
    event.stopPropagation();
    removeProduct(productId, marketplace);
  };

  // Update scroll indicators on mount and when products change
  useEffect(() => {
    checkScrollPosition();
    const handleResize = () => checkScrollPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [recentlyViewed]);

  // Don't render if no recently viewed products
  if (!recentlyViewed || recentlyViewed.length === 0) {
    return null;
  }

  return (
    <section className="recently-viewed-section py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-6 h-6 text-gray-600" />
            <h2 className="text-2xl font-bold text-gray-800">Recently Viewed</h2>
            <span className="text-sm text-gray-500">
              ({recentlyViewed.length} item{recentlyViewed.length !== 1 ? 's' : ''})
            </span>
          </div>
          
          {/* Clear All Button */}
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Clear viewing history"
          >
            <XMarkIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        </div>

        {/* Products Grid/Scroll Container with Navigation */}
        <div className="relative">
          {/* Left Navigation Arrow */}
          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 shadow-lg rounded-full p-2 transition-all duration-200 opacity-90 hover:opacity-100"
              title="Scroll left"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Right Navigation Arrow */}
          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 shadow-lg rounded-full p-2 transition-all duration-200 opacity-90 hover:opacity-100"
              title="Scroll right"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto pb-4 scrollbar-hide"
            onScroll={checkScrollPosition}
          >
            <div className="flex gap-4 min-w-max px-8">
              {recentlyViewed.map((product) => (
                <div
                  key={`${product.marketplace}-${product.product_id}`}
                  className="flex-shrink-0 w-64 sm:w-72 relative group"
                >
                  {/* Remove Button */}
                  <button
                    onClick={(e) => handleRemoveProduct(product.product_id, product.marketplace, e)}
                    className="absolute top-2 right-2 z-20 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 shadow-lg"
                    title="Remove from recently viewed"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>

                  {/* Timestamp */}
                  <div className="text-xs text-gray-500 mb-2 text-center">
                    Viewed {getTimeSinceViewed(product.viewedAt)}
                  </div>
                  
                  {/* Product Card */}
                  <ProductCard
                    product={{
                      ...product,
                      id: product.product_id,
                      image: product.main_image
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Gradient Fade on Edges (Desktop) */}
          <div className="hidden lg:block absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none" />
          <div className="hidden lg:block absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        </div>

      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default RecentlyViewedSection;