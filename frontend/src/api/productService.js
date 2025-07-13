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
    maxPrice = null,
    aliexpress = true,
    ebay = true
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
      
      // Add marketplace filters
      params.aliexpress = aliexpress;
      params.ebay = ebay;
      
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
   * Get featured/trending products for homepage using Mixed Hot Products API
   * @param {number} limit - Number of products to fetch (default: 6)
   * @param {number} page - Page number for pagination (default: 1) 
   * @param {string} marketplace - Marketplace filter: 'mixed', 'aliexpress', or 'ebay'
   * @param {boolean} useCache - Whether to use caching (default: true)
   * @returns {Promise} - Promise that resolves to featured deals
   */
  getFeaturedProducts: async (limit = 6, page = 1, marketplace = 'mixed', useCache = true) => {
    try {
      // Check cache first (30 minutes cache for better UX)
      const cacheKey = `featured_deals_${limit}_${page}_${marketplace}`;
      
      if (useCache) {
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
        
        if (cachedData && cacheTimestamp) {
          const now = Date.now();
          const cacheAge = now - parseInt(cacheTimestamp);
          const cacheExpiry = 30 * 60 * 1000; // 30 minutes cache
          
          if (cacheAge < cacheExpiry) {
            console.log(`Using cached featured deals: page ${page}, marketplace ${marketplace}`);
            return JSON.parse(cachedData);
          }
        }
      }

      // Fetch hot products from the enhanced API endpoint
      console.log(`Fetching ${limit} featured deals (page ${page}, ${marketplace}) from hot products API`);
      const response = await api.get("/search/featured-deals", {
        limit: limit,
        page: page,
        marketplace: marketplace
      });

      const result = {
        success: true,
        products: response.deals || [],
        count: response.count || 0,
        page: response.page || page,
        hasNextPage: response.has_next_page || false,
        marketplace: response.marketplace || marketplace,
        source: response.source,
        message: response.message
      };

      // Cache the result if we got products and caching is enabled
      if (useCache && result.products.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(result));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
        console.log(`Cached ${result.products.length} featured deals (page ${page})`);
      }

      return result;
    } catch (error) {
      console.error("Error fetching featured deals:", error);
      
      // Try to return cached data even if expired
      if (useCache) {
        const cacheKey = `featured_deals_${limit}_${page}_${marketplace}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          console.log('Using expired cache as fallback for featured deals');
          return JSON.parse(cachedData);
        }
      }
      
      throw error;
    }
  },
};

export default productService;
