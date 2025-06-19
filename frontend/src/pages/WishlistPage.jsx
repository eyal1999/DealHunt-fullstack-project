import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import { wishlistService } from "../api/apiServices";
import { useAuth } from "../contexts/AuthContext";

const WishlistPage = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();

  // State management
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingItems, setRemovingItems] = useState(new Set());

  // Fetch wishlist items from the real API
  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log("🔄 Fetching wishlist for user:", currentUser?.email);

      const items = await wishlistService.getWishlist();
      console.log("📡 Raw API response:", items);
      console.log("📊 Number of items received:", items.length);

      // DEBUG: Validate each item has required fields
      const validItems = items.filter((item) => {
        const hasId = item.id && typeof item.id === "string";
        const hasRequiredFields =
          item.title && item.product_id && item.marketplace;

        if (!hasId) {
          console.error("❌ Item missing ID:", item);
        }
        if (!hasRequiredFields) {
          console.error("❌ Item missing required fields:", item);
        }

        return hasId && hasRequiredFields;
      });

      console.log("✅ Valid items after filtering:", validItems.length);

      // Log each valid item's ID for debugging
      validItems.forEach((item, index) => {
        console.log(`Valid Item ${index + 1}:`, {
          id: item.id,
          title: item.title?.substring(0, 30),
          product_id: item.product_id,
          marketplace: item.marketplace,
        });
      });

      setWishlistItems(validItems);
    } catch (err) {
      console.error("❌ Error fetching wishlist:", err);

      if (err.message.includes("401") || err.message.includes("Unauthorized")) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError("Failed to load your wishlist. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentUser]);

  // Load wishlist on component mount and when authentication changes
  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Enhanced remove function with better validation
  const handleRemoveItem = useCallback(
    async (item) => {
      console.log("🎯 REMOVE REQUEST - Full item:", item);
      console.log("🎯 Item ID to remove:", item.id);
      console.log("🎯 Item ID type:", typeof item.id);

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
        console.log("⚠️ Already removing this item, skipping");
        return;
      }

      try {
        // Add item to removing set to prevent double-clicks
        setRemovingItems((prev) => new Set(prev).add(item.id));

        console.log("🔄 Attempting to remove item with MongoDB _id:", item.id);

        // Call API to remove item
        const result = await wishlistService.removeFromWishlist(item.id);
        console.log("✅ Remove API response:", result);

        // Remove item from local state immediately for responsive UI
        setWishlistItems((prevItems) => {
          const newItems = prevItems.filter(
            (wishlistItem) => wishlistItem.id !== item.id
          );
          console.log(
            "🔄 Updated local state. Items before:",
            prevItems.length,
            "after:",
            newItems.length
          );
          return newItems;
        });

        console.log("✅ Item removed successfully from UI");
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

          // Remove from UI anyway since it's not in the database
          setWishlistItems((prevItems) =>
            prevItems.filter((wishlistItem) => wishlistItem.id !== item.id)
          );
        }

        alert(errorMessage);
      } finally {
        // Remove item from removing set
        setRemovingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      }
    },
    [removingItems]
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
      rating: null, // Not stored in wishlist
      sold_count: null, // Not stored in wishlist
    };
  }, []);

  // Retry function for error state
  const handleRetry = useCallback(() => {
    fetchWishlist();
  }, [fetchWishlist]);

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Wishlist</h1>

        {/* Refresh button */}
        <button
          onClick={fetchWishlist}
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

      {wishlistItems.length > 0 ? (
        <div>
          {/* Wishlist summary */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                {wishlistItems.length}{" "}
                {wishlistItems.length === 1 ? "item" : "items"} saved to your
                wishlist
              </p>
              <p className="text-sm text-gray-500">
                Click the ❌ button to remove items
              </p>
            </div>
          </div>

          {/* Wishlist grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => {
              const isRemoving = removingItems.has(item.id);
              const productCardData = transformWishlistItemForProductCard(item);

              return (
                <div key={item.id} className="relative">
                  {/* Removing overlay */}
                  {isRemoving && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center rounded-lg">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mb-2 mx-auto"></div>
                        <span className="text-sm text-gray-600">
                          Removing...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Product Card */}
                  <ProductCard product={productCardData} />

                  {/* Remove button overlay */}
                  <button
                    onClick={() => handleRemoveItem(item)}
                    disabled={isRemoving}
                    className={`absolute top-2 right-2 bg-white rounded-full p-1 shadow transition-colors ${
                      isRemoving
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-red-50"
                    }`}
                    title="Remove from wishlist"
                  >
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Added date */}
                  <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 text-xs py-1 px-2 text-gray-500 rounded-b-lg">
                    Added on {formatDate(item.added_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
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
