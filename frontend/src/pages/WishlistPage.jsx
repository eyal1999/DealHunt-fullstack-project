import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import { authService } from "../api/apiServices";
import { useAuth } from "../contexts/AuthContext";
import { useWishlist } from "../contexts/WishlistContext";
import { initWishlistPageAnimations } from "../utils/scrollReveal";

const WishlistPage = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const location = useLocation();
  const { wishlistItems, isLoading, error, fetchWishlist, removeFromWishlist, forceRefresh } = useWishlist();

  // Local state management
  const [removingItems, setRemovingItems] = useState(new Set());
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  
  // Bulk selection state
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isRemovingSelected, setIsRemovingSelected] = useState(false);
  
  // Notification preferences state
  const [priceDropNotifications, setPriceDropNotifications] = useState(
    currentUser?.price_drop_notifications ?? true
  );
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  // Force refresh on page load
  useEffect(() => {
    if (isAuthenticated && location.pathname === '/wishlist') {
      fetchWishlist(true); // Force refresh
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, location.pathname]);

  // Clear localStorage flags
  useEffect(() => {
    const needsRefresh = localStorage.getItem('wishlistNeedsRefresh');
    if (needsRefresh === 'true') {
      localStorage.removeItem('wishlistNeedsRefresh');
    }
  }, []);
  
  // Force refresh when page becomes visible (silent to avoid UI flash)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && location.pathname === '/wishlist') {
        fetchWishlist(true, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, location.pathname]);

  // The context already handles wishlist update events, so we don't need this anymore

  // Listen for focus events and refresh once on focus (silent)
  useEffect(() => {
    const handleWindowFocus = () => {
      if (isAuthenticated && location.pathname === '/wishlist') {
        fetchWishlist(true, true);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, location.pathname]);

  // Removed periodic auto-refresh - only refresh after user actions

  // Initialize wishlist page animations after content is ready
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        initWishlistPageAnimations();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, wishlistItems.length]);

  // Cleanup removingItems state for items that no longer exist
  useEffect(() => {
    if (removingItems.size > 0) {
      const currentItemIds = new Set(wishlistItems.map(item => item.id));
      const updatedRemovingItems = new Set();
      
      for (const itemId of removingItems) {
        if (currentItemIds.has(itemId)) {
          updatedRemovingItems.add(itemId);
        }
      }
      
      if (updatedRemovingItems.size !== removingItems.size) {
        setRemovingItems(updatedRemovingItems);
      }
    }
  }, [wishlistItems, removingItems]);

  // Update notification preference when currentUser changes
  useEffect(() => {
    if (currentUser?.price_drop_notifications !== undefined) {
      setPriceDropNotifications(currentUser.price_drop_notifications);
    }
  }, [currentUser]);

  // Enhanced remove function with better validation
  const handleRemoveItem = useCallback(
    async (item) => {
      console.log('🔴 WishlistPage: handleRemoveItem called with item:', item);
      
      // Validate item object
      if (!item || !item.id || typeof item.id !== "string") {
        console.error("❌ Invalid item for removal:", item);
        alert(
          "Error: Invalid item data. Please refresh the page and try again."
        );
        return;
      }

      // Check if item ID looks like a valid MongoDB ObjectId (24 hex characters)
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(item.id)) {
        console.error("❌ Invalid MongoDB ObjectId format:", item.id);
        alert(
          "Error: Invalid item ID format. Please refresh the page and try again."
        );
        return;
      }

      // Prevent multiple removal attempts for the same item
      if (removingItems.has(item.id)) {
        return;
      }

      try {
        // Add item to removing set to prevent double-clicks
        setRemovingItems((prev) => new Set(prev).add(item.id));

        // Show subtle sync indicator
        setIsAutoRefreshing(true);
        
        // Small delay to show the removal animation
        await new Promise(resolve => setTimeout(resolve, 200));

        // Call API to remove item using context
        await removeFromWishlist(item.id);

        // Use the force refresh function
        forceRefresh();
        
        // Turn off the syncing indicator after a delay
        setTimeout(() => {
          setIsAutoRefreshing(false);
        }, 800);

        // Show success feedback
        console.log(`Item "${item.title}" successfully removed from wishlist`);
      } catch (error) {
        console.error("❌ Error removing item from wishlist:", error);

        let errorMessage =
          "Failed to remove item from wishlist. Please try again.";
        if (
          error.message.includes("401") ||
          error.message.includes("Unauthorized")
        ) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (error.message.includes("404")) {
          errorMessage =
            "Item not found in wishlist. It may have been already removed.";
        }

        alert(errorMessage);
      } finally {
        // Remove item from removing set
        setRemovingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
        
        // Failsafe: Force refresh even if there was an error
        setTimeout(() => {
          forceRefresh();
        }, 500);
      }
    },
    [removingItems, removeFromWishlist, forceRefresh]
  );

  // Format date for display
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "Unknown date";

    try {
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  }, []);

  // Transform wishlist item to ProductCard format
  const transformWishlistItemForProductCard = useCallback((item) => {

    return {
      product_id: item.product_id,
      title: item.title,
      original_price: item.original_price,
      sale_price: item.sale_price,
      image: item.image,
      detail_url: `/product/${item.marketplace}/${item.product_id}`,
      affiliate_link: item.affiliate_link,
      marketplace: item.marketplace,
      rating: item.rating || null, // Try to use actual rating if available
      sold_count: item.sold_count || null, // Try to use actual sold count if available
    };
  }, []);

  // Retry function for error state
  const handleRetry = () => {
    fetchWishlist(true);
  };

  // Bulk selection handlers
  const toggleSelectMode = useCallback(() => {
    setIsSelectMode(!isSelectMode);
    setSelectedItems(new Set()); // Clear selections when toggling mode
  }, [isSelectMode]);

  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === wishlistItems.length) {
      // Deselect all
      setSelectedItems(new Set());
    } else {
      // Select all
      setSelectedItems(new Set(wishlistItems.map(item => item.id)));
    }
  }, [selectedItems.size, wishlistItems]);

  const toggleSelectItem = useCallback((itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const handleRemoveSelected = useCallback(async () => {
    if (selectedItems.size === 0) return;

    try {
      setIsRemovingSelected(true);
      
      // Show subtle sync indicator
      setIsAutoRefreshing(true);
      
      // Small delay to show the removal animation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Remove items one by one and track results
      const removePromises = Array.from(selectedItems).map(async (itemId) => {
        try {
          await removeFromWishlist(itemId);
          return { success: true, itemId };
        } catch (error) {
          console.error(`Failed to remove item ${itemId}:`, error);
          return { success: false, itemId, error };
        }
      });

      const results = await Promise.all(removePromises);
      
      // Count successful removals
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      // Update selected items to only include failed removals
      const failedIds = new Set(results.filter(r => !r.success).map(r => r.itemId));
      setSelectedItems(failedIds);
      
      // Only exit select mode if all items were successfully removed
      if (failureCount === 0) {
        setIsSelectMode(false);
      }
      
      // Auto-refresh after bulk removal to ensure UI consistency
      if (successCount > 0) {
        console.log('🔄 WishlistPage: Starting auto-refresh after bulk removal...');
        setIsAutoRefreshing(true);
        
        // Use the aggressive force refresh function
        console.log('🔄 WishlistPage: Calling forceRefresh for bulk removal...');
        forceRefresh();
        
        // Turn off the syncing indicator after a delay
        setTimeout(() => {
          console.log('🔄 WishlistPage: Turning off syncing indicator for bulk removal');
          setIsAutoRefreshing(false);
        }, 1500);
      }

      // Silent completion - no alerts for smooth experience

    } catch (error) {
      console.error("Error in bulk removal:", error);
      // Silent error handling - no alerts
    } finally {
      setIsRemovingSelected(false);
      
      // Failsafe: Force refresh even if there was an error
      setTimeout(() => {
        forceRefresh();
      }, 500);
    }
  }, [selectedItems, removeFromWishlist, forceRefresh]);

  // Handle notification preferences toggle
  const handleNotificationToggle = useCallback(async () => {
    try {
      setIsUpdatingNotifications(true);
      
      const newValue = !priceDropNotifications;
      
      await authService.updateNotificationPreferences({
        email_notifications: true, // Keep email notifications enabled
        price_drop_notifications: newValue
      });
      
      setPriceDropNotifications(newValue);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      alert("Failed to update notification preferences. Please try again.");
    } finally {
      setIsUpdatingNotifications(false);
    }
  }, [priceDropNotifications]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 text-gray-300 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <h2 className="text-xl font-semibold mb-2">Login Required</h2>
        <p className="text-gray-600 mb-6">
          Please log in to view your wishlist.
        </p>
        <Link
          to="/login"
          state={{
            from: "/wishlist",
            message: "Please log in to view your wishlist",
          }}
          className="bg-primary text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Log In
        </Link>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4 mx-auto"></div>
            <p className="text-gray-600">Loading your wishlist...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-red-300 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={handleRetry}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Try Again
            </button>
            <Link
              to="/"
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div>
      <div className="wishlist-header flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Wishlist</h1>

        <div className="flex items-center space-x-4">
          {/* Subtle sync indicator */}
          {isAutoRefreshing && (
            <div className="flex items-center text-blue-500 opacity-75">
              <div className="w-3 h-3 mr-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-xs font-medium">Updating...</span>
            </div>
          )}
          
          {/* Refresh button */}
          <button
            onClick={() => fetchWishlist(true)}
            disabled={isLoading}
            className="flex items-center text-primary hover:text-blue-700 transition-colors"
            title="Refresh wishlist"
          >
            <svg
              className={`w-5 h-5 mr-1 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Price Drop Notification Toggle */}
      <div className="notification-settings bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-blue-500 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <div>
              <h3 className="font-medium text-gray-900">Email Notifications</h3>
              <p className="text-sm text-gray-600">
                Get notified when prices drop for items in your wishlist
              </p>
            </div>
          </div>
          
          <button
            onClick={handleNotificationToggle}
            disabled={isUpdatingNotifications}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              priceDropNotifications ? "bg-blue-600" : "bg-gray-200"
            } ${isUpdatingNotifications ? "opacity-50 cursor-not-allowed" : ""}`}
            role="switch"
            aria-checked={priceDropNotifications}
            title={`${priceDropNotifications ? "Disable" : "Enable"} price drop notifications`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                priceDropNotifications ? "translate-x-5" : "translate-x-0"
              }`}
            />
            {isUpdatingNotifications && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full"></div>
              </div>
            )}
          </button>
        </div>
      </div>

      {wishlistItems.length > 0 ? (
        <div>
          {/* Wishlist summary and bulk actions */}
          <div className="wishlist-summary bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <p className="text-gray-600">
                {wishlistItems.length}{" "}
                {wishlistItems.length === 1 ? "item" : "items"} saved to your
                wishlist
              </p>
              
              {/* Bulk selection controls */}
              <div className="flex items-center gap-3">
                {isSelectMode && (
                  <>
                    <button
                      onClick={toggleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {selectedItems.size === wishlistItems.length ? "Deselect All" : "Select All"}
                    </button>
                    
                    {selectedItems.size > 0 && (
                      <button
                        onClick={handleRemoveSelected}
                        disabled={isRemovingSelected}
                        className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                      >
                        {isRemovingSelected ? (
                          <div className="flex items-center">
                            <div className="w-4 h-4 bg-white rounded-full mr-2 animate-pulse opacity-75"></div>
                            <span>Removing...</span>
                          </div>
                        ) : (
                          `Remove Selected (${selectedItems.size})`
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={toggleSelectMode}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </>
                )}
                
                {!isSelectMode && wishlistItems.length > 0 && (
                  <button
                    onClick={toggleSelectMode}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors font-medium shadow-sm"
                  >
                    Select Multiple
                  </button>
                )}
              </div>
            </div>
            
            {/* Selected items counter when in select mode */}
            {isSelectMode && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  {selectedItems.size > 0 
                    ? `${selectedItems.size} of ${wishlistItems.length} items selected`
                    : "Click items to select them for removal"
                  }
                </p>
              </div>
            )}
          </div>

          {/* Wishlist grid */}
          <div className="wishlist-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {wishlistItems.map((item) => {
              const isRemoving = removingItems.has(item.id);
              const isSelected = selectedItems.has(item.id);
              const productCardData = transformWishlistItemForProductCard(item);

              return (
                <div 
                  key={item.id} 
                  className={`wishlist-item relative cursor-pointer transition-all duration-300 ease-in-out transform ${
                    isRemoving ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'
                  } ${
                    isSelectMode 
                      ? isSelected 
                        ? 'ring-2 ring-blue-500 ring-offset-2' 
                        : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
                      : ''
                  }`}
                  onClick={isSelectMode ? () => toggleSelectItem(item.id) : undefined}
                  style={{
                    transition: 'all 0.3s ease-in-out',
                    transformOrigin: 'center center'
                  }}
                >
                  {/* Selection checkbox overlay */}
                  {isSelectMode && (
                    <div className="absolute top-2 left-2 z-20">
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'bg-white border-gray-300 hover:border-blue-400'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subtle removing overlay */}
                  {isRemoving && (
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 bg-opacity-90 z-10 flex items-center justify-center rounded-lg transition-all duration-300">
                      <div className="text-center">
                        <div className="w-6 h-6 bg-red-500 rounded-full mx-auto mb-2 animate-pulse"></div>
                        <span className="text-xs text-red-600 font-medium">
                          Removing...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Product Card with custom remove button */}
                  <ProductCard 
                    product={productCardData} 
                    isWishlistContext={true}
                    customButton={
                      !isSelectMode ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent selection when clicking remove
                            handleRemoveItem(item);
                          }}
                          disabled={isRemoving}
                          className={`bg-red-500 text-white px-3 py-2 rounded text-sm transition-colors ${
                            isRemoving
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-red-600"
                          }`}
                          title="Remove from wishlist"
                        >
                          {isRemoving ? "Removing..." : "Remove Item"}
                        </button>
                      ) : null
                    }
                  />

                  {/* Added date */}
                  <div className="absolute -bottom-6 left-0 right-0 bg-white bg-opacity-90 text-xs py-1 px-2 text-gray-500 text-center rounded-b-lg">
                    Added on {formatDate(item.added_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="empty-wishlist bg-white rounded-lg shadow-md p-8 text-center">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
          <p className="text-gray-600 mb-6">
            Save items you're interested in by clicking the "Add to Wishlist"
            button on any product.
          </p>
          <Link
            to="/"
            className="bg-primary text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
