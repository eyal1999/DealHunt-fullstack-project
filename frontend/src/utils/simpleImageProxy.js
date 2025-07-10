/**
 * Simple image proxy utility - no complex React hooks or async logic
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

/**
 * Check if URL is from AliExpress CDN
 * @param {string} url - Image URL
 * @returns {boolean} - True if AliExpress CDN
 */
export const isAliExpressImage = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  return url.includes('alicdn.com') || 
         url.includes('aliexpress.com') ||
         url.includes('ae-pic-a1.aliexpress-media.com') ||
         url.includes('ae-pic-a2.aliexpress-media.com') ||
         url.includes('ae01.alicdn.com') ||
         url.includes('ae02.alicdn.com') ||
         url.includes('ae03.alicdn.com') ||
         url.includes('ae04.alicdn.com');
};

/**
 * Convert image URL to use proxy if needed
 * @param {string} originalUrl - Original image URL
 * @returns {string} - Proxied URL if needed, original URL otherwise
 */
export const getImageUrl = (originalUrl) => {
  // If no URL, return placeholder
  if (!originalUrl || typeof originalUrl !== 'string') {
    return "https://via.placeholder.com/300x200?text=No+Image";
  }

  // If it's already a local URL or proxy URL, return as is
  if (originalUrl.startsWith('/') || originalUrl.includes(window.location.hostname)) {
    return originalUrl;
  }

  // If it's an AliExpress image, use the proxy
  if (isAliExpressImage(originalUrl)) {
    try {
      const encodedUrl = encodeURIComponent(originalUrl.trim());
      return `${API_BASE_URL}/images/proxy?url=${encodedUrl}`;
    } catch (error) {
      console.warn('Error encoding URL for proxy:', error);
      return originalUrl; // Fallback to original URL
    }
  }

  // For all other URLs, return as is
  return originalUrl;
};

/**
 * Get fallback image URL
 * @param {string} text - Optional text to display
 * @returns {string} - Fallback image URL
 */
export const getFallbackImageUrl = (text = 'Image Not Available') => {
  return `https://via.placeholder.com/300x200?text=${encodeURIComponent(text)}`;
};