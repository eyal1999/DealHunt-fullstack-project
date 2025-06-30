import ScrollReveal from 'scrollreveal';

// Cache buster - Updated: 2025-06-30 20:50

/**
 * ScrollReveal Animation Configurations
 * Following best practices for smooth, performant animations
 */
const revealConfigs = {
  // Basic fade in animation
  fadeIn: {
    duration: 800,
    distance: '20px',
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    reset: false,
    mobile: true,
    viewFactor: 0.1,
  },

  // Slide up animation (most common for content)
  slideUp: {
    duration: 800,
    distance: '50px',
    origin: 'bottom',
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    reset: false,
    mobile: true,
    viewFactor: 0.1,
  },

  // Slide down animation (good for headers/navbars)
  slideDown: {
    duration: 800,
    distance: '50px',
    origin: 'top',
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    reset: false,
    mobile: true,
    viewFactor: 0.1,
  },

  // Slide from left (good for sidebars)
  slideLeft: {
    duration: 800,
    distance: '50px',
    origin: 'left',
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    reset: false,
    mobile: true,
    viewFactor: 0.1,
  },

  // Slide from right (good for content sections)
  slideRight: {
    duration: 800,
    distance: '50px',
    origin: 'right',
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    reset: false,
    mobile: true,
    viewFactor: 0.1,
  },

  // Scale up animation (good for buttons, cards)
  scaleUp: {
    duration: 800,
    scale: 0.8,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    reset: false,
    mobile: true,
    viewFactor: 0.1,
  },

  // Staggered animation (for lists and grids)
  staggered: {
    duration: 600,
    distance: '30px',
    origin: 'bottom',
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    reset: false,
    mobile: true,
    viewFactor: 0.1,
    interval: 150,
  },

  // Card animation (optimized for product cards)
  card: {
    duration: 700,
    distance: '30px',
    origin: 'bottom',
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    reset: false,
    mobile: true,
    viewFactor: 0.1,
    scale: 0.95,
  },

  // Hero section animation (dramatic entrance)
  hero: {
    duration: 1000,
    distance: '60px',
    origin: 'bottom',
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    reset: false,
    mobile: true,
    viewFactor: 0.2,
  },

  // Fast animations for smaller elements
  quick: {
    duration: 500,
    distance: '20px',
    origin: 'bottom',
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    reset: false,
    mobile: true,
    viewFactor: 0.1,
  },
};

// Initialize ScrollReveal with global settings
const sr = ScrollReveal({
  // Global settings
  reset: false,
  mobile: true,
  useDelay: 'always',
  viewFactor: 0.1,
  viewOffset: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});

/**
 * Apply ScrollReveal animations to elements
 * @param {string} selector - CSS selector for elements
 * @param {string} animationType - Type of animation from revealConfigs
 * @param {object} customConfig - Optional custom configuration to override defaults
 */
export const revealElement = (selector, animationType = 'fadeIn', customConfig = {}) => {
  const config = {
    ...revealConfigs[animationType],
    ...customConfig,
  };

  sr.reveal(selector, config);
};

/**
 * Initialize common page animations
 * This should be called on each page to set up standard animations
 */
export const initPageAnimations = () => {
  // Header/Navbar animations
  revealElement('.navbar', 'slideDown', { delay: 200 });
  
  // Hero section animations
  revealElement('.hero-title', 'hero', { delay: 300 });
  revealElement('.hero-subtitle', 'slideUp', { delay: 500 });
  revealElement('.hero-buttons', 'fadeIn', { delay: 700 });
  
  // Main content sections
  revealElement('.content-section', 'slideUp', { interval: 200 });
  
  // Cards and product items
  revealElement('.product-card', 'card', { interval: 100 });
  revealElement('.wishlist-card', 'card', { interval: 150 });
  
  // Forms and inputs
  revealElement('.form-container', 'slideUp');
  revealElement('.form-group', 'fadeIn', { interval: 100 });
  
  // Buttons and CTAs
  revealElement('.cta-button', 'scaleUp', { delay: 400 });
  revealElement('.action-button', 'fadeIn');
  
  // Statistics and numbers
  revealElement('.stat-item', 'staggered');
  revealElement('.metric-card', 'scaleUp', { interval: 150 });
  
  // Footer
  revealElement('.footer', 'fadeIn', { delay: 300 });
};

/**
 * Initialize home page specific animations
 */
export const initHomePageAnimations = () => {
  // Search bar
  revealElement('.search-container', 'slideUp', { delay: 400 });
  
  // Featured products
  revealElement('.featured-section', 'slideUp', { delay: 500 });
  revealElement('.featured-product', 'card', { interval: 200 });
  
  // Categories section
  revealElement('.categories-section', 'slideUp', { delay: 600 });
  revealElement('.category-item', 'staggered');
  
  // Testimonials or reviews
  revealElement('.testimonial', 'slideLeft', { interval: 300 });
  
  // Benefits/features section
  revealElement('.feature-item', 'slideUp', { interval: 250 });
};

/**
 * Initialize search results page animations
 */
export const initSearchPageAnimations = () => {
  // Search results header
  revealElement('.search-results-header', 'slideUp', { delay: 200 });
  
  // Filters sidebar
  revealElement('.filters-sidebar', 'slideLeft', { delay: 300 });
  revealElement('.price-filter', 'fadeIn', { delay: 400 });
  revealElement('.marketplace-filter', 'fadeIn', { delay: 500 });
  
  // Sort controls
  revealElement('.sort-controls', 'slideDown', { delay: 600 });
  
  // Search results grid
  revealElement('.search-results-grid', 'slideUp', { delay: 700 });
  revealElement('.search-result-item', 'card', { interval: 100 });
  
  // Pagination area
  revealElement('.pagination-area', 'fadeIn', { delay: 800 });
  
  // No results state
  revealElement('.no-results', 'fadeIn', { delay: 400 });
};

/**
 * Initialize product detail page animations
 */
export const initProductPageAnimations = () => {
  // Product breadcrumbs
  revealElement('.product-breadcrumbs', 'slideDown', { delay: 200 });
  
  // Product detail content
  revealElement('.product-detail-content', 'slideUp', { delay: 300 });
  
  // Product images section (left column)
  revealElement('.product-images-section', 'slideLeft', { delay: 400 });
  revealElement('.product-media-toggle', 'fadeIn', { delay: 500 });
  revealElement('.product-main-image', 'fadeIn', { delay: 600 });
  revealElement('.product-thumbnails', 'slideUp', { delay: 700 });
  
  // Product info sections (middle column)
  revealElement('.product-info', 'slideUp', { delay: 500 });
  revealElement('.product-title-section', 'fadeIn', { delay: 600 });
  revealElement('.product-price-section', 'scaleUp', { delay: 700 });
  revealElement('.wishlist-message', 'slideDown', { delay: 750 });
  revealElement('.product-actions', 'slideUp', { delay: 800 });
  revealElement('.product-description-section', 'fadeIn', { delay: 900 });
  
  // Product sidebar (right column)
  revealElement('.product-sidebar', 'slideRight', { delay: 600 });
  revealElement('.seller-info-section', 'fadeIn', { delay: 700 });
  revealElement('.shipping-info-section', 'fadeIn', { delay: 800 });
  revealElement('.return-policy-section', 'fadeIn', { delay: 900 });
  revealElement('.product-specifications', 'slideUp', { delay: 1000 });
  
  // Reviews section
  revealElement('.reviews-section', 'slideUp', { delay: 1100 });
  revealElement('.review-item', 'fadeIn', { interval: 150 });
  
  // Related products
  revealElement('.related-products', 'slideUp', { delay: 1200 });
  revealElement('.related-product', 'card', { interval: 200 });
};

/**
 * Initialize dashboard page animations
 */
export const initDashboardAnimations = () => {
  // Dashboard header
  revealElement('.dashboard-header', 'slideDown', { delay: 200 });
  
  // Stats cards
  revealElement('.stats-card', 'scaleUp', { interval: 150 });
  
  // Charts and analytics
  revealElement('.chart-container', 'slideUp', { delay: 400 });
  revealElement('.analytics-widget', 'fadeIn', { interval: 200 });
  
  // Recent activity
  revealElement('.activity-section', 'slideUp', { delay: 500 });
  revealElement('.activity-item', 'slideLeft', { interval: 100 });
  
  // Quick actions
  revealElement('.quick-actions', 'slideRight', { delay: 300 });
};

/**
 * Initialize wishlist page animations
 */
export const initWishlistPageAnimations = () => {
  // Wishlist header
  revealElement('.wishlist-header', 'slideUp', { delay: 200 });
  
  // Notification settings
  revealElement('.notification-settings', 'slideDown', { delay: 300 });
  
  // Wishlist summary
  revealElement('.wishlist-summary', 'fadeIn', { delay: 400 });
  
  // Wishlist grid
  revealElement('.wishlist-grid', 'slideUp', { delay: 500 });
  revealElement('.wishlist-item', 'card', { interval: 150 });
  
  // Empty state
  revealElement('.empty-wishlist', 'fadeIn', { delay: 400 });
};

/**
 * Initialize profile page animations
 */
export const initProfilePageAnimations = () => {
  // Profile header
  revealElement('.profile-header', 'slideUp', { delay: 200 });
  
  // Profile card
  revealElement('.profile-card', 'slideUp', { delay: 300 });
  
  // Profile tabs
  revealElement('.profile-tabs', 'slideDown', { delay: 400 });
  
  // Profile content
  revealElement('.profile-content', 'fadeIn', { delay: 500 });
  
  // Profile picture section
  revealElement('.profile-picture-section', 'slideRight', { delay: 600 });
  
  // Profile picture
  revealElement('.profile-picture', 'scaleUp', { delay: 700 });
};

/**
 * Initialize login page animations
 */
export const initLoginPageAnimations = () => {
  // Login header (title and subtitle)
  revealElement('.login-header', 'slideDown', { delay: 200 });
  revealElement('.login-title', 'fadeIn', { delay: 300 });
  revealElement('.login-subtitle', 'slideUp', { delay: 400 });
  
  // Messages
  revealElement('.login-message', 'slideDown', { delay: 500 });
  
  // Google sign-in section
  revealElement('.google-signin-section', 'scaleUp', { delay: 600 });
  
  // Divider
  revealElement('.login-divider', 'fadeIn', { delay: 700 });
  
  // Error messages
  revealElement('.login-error', 'slideDown', { delay: 750 });
  
  // Login form
  revealElement('.login-form', 'slideUp', { delay: 800 });
  revealElement('.form-field', 'fadeIn', { interval: 100, delay: 900 });
  revealElement('.form-options', 'fadeIn', { delay: 1100 });
  revealElement('.submit-button', 'scaleUp', { delay: 1200 });
};

/**
 * Initialize register page animations
 */
export const initRegisterPageAnimations = () => {
  // Register header (title and subtitle)
  revealElement('.register-header', 'slideDown', { delay: 200 });
  revealElement('.register-title', 'fadeIn', { delay: 300 });
  revealElement('.register-subtitle', 'slideUp', { delay: 400 });
  
  // Google sign-up section
  revealElement('.google-signup-section', 'scaleUp', { delay: 600 });
  
  // Divider
  revealElement('.register-divider', 'fadeIn', { delay: 700 });
  
  // Error messages
  revealElement('.register-error', 'slideDown', { delay: 750 });
  
  // Register form
  revealElement('.register-form', 'slideUp', { delay: 800 });
  revealElement('.form-field', 'fadeIn', { interval: 100, delay: 900 });
  revealElement('.form-options', 'fadeIn', { delay: 1200 });
  revealElement('.submit-button', 'scaleUp', { delay: 1300 });
};

/**
 * Initialize forgot password page animations
 */
export const initForgotPasswordPageAnimations = () => {
  // Forgot password header (title and subtitle)
  revealElement('.forgot-header', 'slideDown', { delay: 200 });
  revealElement('.forgot-title', 'fadeIn', { delay: 300 });
  revealElement('.forgot-subtitle', 'slideUp', { delay: 400 });
  
  // Error messages
  revealElement('.forgot-error', 'slideDown', { delay: 500 });
  
  // Success message (when email is sent)
  revealElement('.success-message', 'scaleUp', { delay: 600 });
  
  // Forgot password form
  revealElement('.forgot-form', 'slideUp', { delay: 600 });
  revealElement('.form-field', 'fadeIn', { delay: 700 });
  revealElement('.submit-button', 'scaleUp', { delay: 800 });
  revealElement('.back-link', 'fadeIn', { delay: 900 });
};

/**
 * Clean up ScrollReveal animations
 * Call this when unmounting components or changing routes
 */
export const cleanupAnimations = () => {
  sr.clean();
};

/**
 * Refresh animations for dynamic content
 * Call this when new content is added to the page
 */
export const refreshAnimations = () => {
  sr.sync();
};

/**
 * Custom hook for React components to easily add animations
 * @param {string} animationType - Type of animation
 * @param {object} customConfig - Custom configuration
 * @returns {function} - Ref callback to attach to elements
 */
export const useScrollReveal = (animationType = 'fadeIn', customConfig = {}) => {
  return (element) => {
    if (element) {
      const config = {
        ...revealConfigs[animationType],
        ...customConfig,
      };
      sr.reveal(element, config);
    }
  };
};

// Export the main ScrollReveal instance for advanced usage
export { sr };

// Export configuration objects for customization
export { revealConfigs };

export default {
  revealElement,
  initPageAnimations,
  initHomePageAnimations,
  initSearchPageAnimations,
  initProductPageAnimations,
  initDashboardAnimations,
  initWishlistPageAnimations,
  initProfilePageAnimations,
  initLoginPageAnimations,
  initRegisterPageAnimations,
  initForgotPasswordPageAnimations,
  cleanupAnimations,
  refreshAnimations,
  useScrollReveal,
  sr,
  revealConfigs,
};