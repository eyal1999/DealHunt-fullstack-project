import api from "./index";

const productService = {
  /**
   * Search for products
   * @param {string} query - Search query
   * @param {string} sort - Sort mode (price_low, price_high)
   * @returns {Promise} - Promise that resolves to search results
   */
  searchProducts: async (query, sort = "price_low") => {
    try {
      return await api.get("/search", { q: query, sort });
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  },

  /**
   * Get product details
   * @param {string} marketplace - Marketplace identifier (aliexpress, ebay)
   * @param {string} productId - Product ID
   * @returns {Promise} - Promise that resolves to product details
   */
  getProductDetails: async (marketplace, productId) => {
    try {
      return await api.get(`/search/detail/${marketplace}/${productId}`);
    } catch (error) {
      console.error(
        `Error fetching product details for ${marketplace}/${productId}:`,
        error
      );
      throw error;
    }
  },
};

export default productService;
