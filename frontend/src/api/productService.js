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
      // Check cache first (5 minute cache)
      const cacheKey = `featured_products_${limit}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      
      if (cachedData && cacheTimestamp) {
        const now = Date.now();
        const cacheAge = now - parseInt(cacheTimestamp);
        const cacheExpiry = 5 * 60 * 1000; // 5 minutes
        
        if (cacheAge < cacheExpiry) {
          console.log('Using cached featured products');
          return JSON.parse(cachedData);
        }
      }

      // Use a consistent, popular search term for better caching at API level
      const searchTerm = 'electronics'; // Popular, broad category
      
      // Search for products and get first page with limited results
      const response = await api.get("/search", {
        q: searchTerm,
        sort: "sold_high", // Get most popular items
        page: 1,
        page_size: limit,
      });

      const result = {
        success: true,
        products: response.results || [],
        searchTerm: searchTerm
      };

      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify(result));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());

      return result;
    } catch (error) {
      console.error("Error fetching featured products:", error);
      
      // Try to return cached data even if expired
      const cacheKey = `featured_products_${limit}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        console.log('Using expired cache as fallback');
        return JSON.parse(cachedData);
      }
      
      throw error;
    }
  },
};

export default productService;
