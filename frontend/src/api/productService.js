// frontend/src/api/productService.js
import api from "./index";

const productService = {
  /**
   * Search for products with pagination support
   * @param {string} query - Search query
   * @param {string} sort - Sort mode (price_low, price_high)
   * @param {number} page - Page number (starts from 1)
   * @param {number} pageSize - Number of items per page
   * @returns {Promise} - Promise that resolves to search results with pagination
   */
  searchProducts: async (
    query,
    sort = "price_low",
    page = 1,
    pageSize = 20
  ) => {
    try {
      return await api.get("/search", {
        q: query,
        sort,
        page,
        page_size: pageSize,
      });
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

  /**
   * Get featured/trending products for homepage
   * @param {number} limit - Number of products to fetch (default: 6)
   * @returns {Promise} - Promise that resolves to featured products
   */
  getFeaturedProducts: async (limit = 6) => {
    try {
      // Use popular search terms to get "featured" products
      const featuredSearches = [
        'wireless earbuds',
        'smart watch', 
        'bluetooth speaker',
        'phone case',
        'laptop stand',
        'wireless charger'
      ];
      
      // Pick a random search term to get varied results
      const randomSearch = featuredSearches[Math.floor(Math.random() * featuredSearches.length)];
      
      // Search for products and get first page with limited results
      const response = await api.get("/search", {
        q: randomSearch,
        sort: "price_low",
        page: 1,
        page_size: limit,
      });

      return {
        success: true,
        products: response.results || [],
        searchTerm: randomSearch
      };
    } catch (error) {
      console.error("Error fetching featured products:", error);
      throw error;
    }
  },
};

export default productService;
