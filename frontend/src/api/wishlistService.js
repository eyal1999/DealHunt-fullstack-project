import api from "./index";

const wishlistService = {
  /**
   * Get user's wishlist
   * @returns {Promise} - Promise that resolves to wishlist items
   */
  getWishlist: async () => {
    try {
      return await api.get("/wishlist");
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      throw error;
    }
  },

  /**
   * Add item to wishlist
   * @param {Object} productData - Product data to add to wishlist
   * @returns {Promise} - Promise that resolves to updated wishlist
   */
  addToWishlist: async (productData) => {
    try {
      return await api.post("/wishlist", productData);
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      throw error;
    }
  },

  /**
   * Remove item from wishlist
   * @param {string} productId - Product ID to remove
   * @returns {Promise} - Promise that resolves to updated wishlist
   */
  removeFromWishlist: async (productId) => {
    try {
      return await api.delete(`/wishlist/${productId}`);
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      throw error;
    }
  },
};

export default wishlistService;
