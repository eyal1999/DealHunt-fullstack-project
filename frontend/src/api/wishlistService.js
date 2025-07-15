import api from "./index";

const wishlistService = {
  /**
   * Get user's wishlist
   * @returns {Promise} - Promise that resolves to wishlist items array
   */
  getWishlist: async () => {
    try {
      const response = await api.get("/wishlist/");

      // The API returns an array of wishlist items directly
      return response || [];
    } catch (error) {
      console.error("Error fetching wishlist:", error);

      // Handle specific error cases
      if (error.status === 401) {
        throw new Error("Unauthorized - please log in again");
      } else if (error.status === 404) {
        // No wishlist items found is not really an error
        return [];
      }

      throw error;
    }
  },

  /**
   * Add item to wishlist
   * @param {Object} productData - Product data to add to wishlist
   * @returns {Promise} - Promise that resolves to the added wishlist item
   */
  addToWishlist: async (productData) => {
    try {
      // Validate required fields
      const requiredFields = [
        "product_id",
        "marketplace",
        "title",
        "original_price",
        "sale_price",
        "image",
        "detail_url",
        "affiliate_link",
      ];
      for (const field of requiredFields) {
        if (!productData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      const response = await api.post("/wishlist/", productData);

      return response;
    } catch (error) {
      console.error("Error adding to wishlist:", error);

      // Handle specific error cases
      if (error.status === 401) {
        throw new Error(
          "Unauthorized - please log in to add items to your wishlist"
        );
      } else if (error.status === 400) {
        throw new Error("Invalid product data - please try again");
      }

      throw error;
    }
  },

  /**
   * Remove item from wishlist
   * @param {string} itemId - The wishlist item ID (MongoDB _id) to remove
   * @returns {Promise} - Promise that resolves to success message
   */
  removeFromWishlist: async (itemId) => {
    try {
      if (!itemId || typeof itemId !== "string") {
        throw new Error("Invalid item ID provided");
      }

      // The backend expects the MongoDB _id as the path parameter
      const response = await api.delete(`/wishlist/${itemId}`);

      return response;
    } catch (error) {
      console.error("Error removing from wishlist:", error);

      // Handle specific error cases
      if (error.status === 401) {
        throw new Error("Unauthorized - please log in again");
      } else if (error.status === 404) {
        throw new Error("Item not found in your wishlist");
      } else if (error.status === 403) {
        throw new Error("You don't have permission to remove this item");
      }

      throw error;
    }
  },

  /**
   * Check if a product is in the user's wishlist
   * @param {string} productId - Product ID to check
   * @param {string} marketplace - Marketplace name
   * @returns {Promise<boolean>} - Promise that resolves to true if item is in wishlist
   */
  isInWishlist: async (productId, marketplace) => {
    try {
      const wishlistItems = await wishlistService.getWishlist();
      return wishlistItems.some(
        (item) =>
          item.product_id === productId && item.marketplace === marketplace
      );
    } catch (error) {
      console.error("Error checking wishlist status:", error);
      // Return false if we can't check (don't throw error for this helper function)
      return false;
    }
  },

  /**
   * Get wishlist item count for a user
   * @returns {Promise<number>} - Promise that resolves to the number of items in wishlist
   */
  getWishlistCount: async () => {
    try {
      const wishlistItems = await wishlistService.getWishlist();
      return wishlistItems.length;
    } catch (error) {
      console.error("Error getting wishlist count:", error);
      return 0;
    }
  },
};

export default wishlistService;
