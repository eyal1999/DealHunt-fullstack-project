// frontend/src/api/productService.js
import api from "./index";

const productService = {
  /**
   * Search for products with pagination support
   * @param {string} query - Search query
   * @param {string} sort - Sort mode (price_low, price_high)
   * @param {number} page - Page number (starts from 1)
   * @param {number} pageSize - Number of items per page
   * @param {number} minPrice - Minimum price filter (optional)
   * @param {number} maxPrice - Maximum price filter (optional)
   * @returns {Promise} - Promise that resolves to search results with pagination
   */
  searchProducts: async (
    query,
    sort = "price_low",
    page = 1,
    pageSize = 20,
    minPrice = null,
    maxPrice = null
  ) => {
    try {
      const params = {
        q: query,
        sort,
        page,
        page_size: pageSize,
      };
      
      // Add price filters if provided
      if (minPrice !== null && minPrice !== undefined && minPrice >= 0) {
        params.min_price = minPrice;
      }
      if (maxPrice !== null && maxPrice !== undefined && maxPrice >= 0) {
        params.max_price = maxPrice;
      }
      
      return await api.get("/search/", params);
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
      // Check cache first (30 minute cache - reduced frequency for more variety)
      const cacheKey = `featured_products_${limit}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      
      if (cachedData && cacheTimestamp) {
        const now = Date.now();
        const cacheAge = now - parseInt(cacheTimestamp);
        const cacheExpiry = 30 * 60 * 1000; // 30 minutes for more variety
        
        if (cacheAge < cacheExpiry) {
          console.log('Using cached featured products');
          return JSON.parse(cachedData);
        }
      }

      // Rotate through different categories and sorting methods for variety
      const categories = ['electronics', 'home', 'fashion', 'sports', 'books', 'beauty'];
      const sortMethods = ['sold_high', 'price_low', 'price_high'];
      
      // Use current hour to create a rotating selection that changes throughout the day
      const hour = new Date().getHours();
      const categoryIndex = hour % categories.length;
      const sortIndex = Math.floor(hour / 8) % sortMethods.length; // Changes every 8 hours
      
      const searchTerm = categories[categoryIndex];
      const sortMethod = sortMethods[sortIndex];
      
      // Get more results than needed to allow for shuffling
      const fetchLimit = Math.min(limit * 3, 50);
      
      // Search for products
      const response = await api.get("/search", {
        q: searchTerm,
        sort: sortMethod,
        page: 1,
        page_size: fetchLimit,
      });

      let products = response.results || [];
      
      // Shuffle the results and take only the requested limit for variety
      products = products.sort(() => Math.random() - 0.5).slice(0, limit);

      const result = {
        success: true,
        products: products,
        searchTerm: searchTerm,
        sortMethod: sortMethod
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
