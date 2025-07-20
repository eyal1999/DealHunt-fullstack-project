import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { productService } from "../api/apiServices";
import { useAuth } from "../contexts/AuthContext";
import { useWishlist } from "../contexts/WishlistContext";
import { useAutoWishlist } from "../hooks/useAutoWishlist";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { getImageUrl, getFallbackImageUrl } from "../utils/simpleImageProxy";
import { initProductPageAnimations, cleanupAnimations } from "../utils/scrollReveal";
import ProductRecommendations from "../components/recommendations/ProductRecommendations";
import ProductDetailSkeleton from "../components/loading/ProductDetailSkeleton";
import BackButton from "../components/common/BackButton";
import ImageModal from "../components/product/ImageModal";

// Simple Image Component for Product Details
const ProductImage = React.forwardRef(({
  src,
  alt,
  className = "",
  fallbackSrc = null,
  showLoader = true,
  style,
  ...props
}, ref) => {
  const [hasError, setHasError] = useState(false);
  
  // Use the simple proxy for the source
  const imageSrc = getImageUrl(src);
  const fallbackImageSrc = fallbackSrc ? getImageUrl(fallbackSrc) : getFallbackImageUrl();

  const handleError = (e) => {
    if (!hasError) {
      setHasError(true);
      e.target.src = fallbackImageSrc;
    }
  };

  return (
    <img
      ref={ref}
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={handleError}
      {...props}
    />
  );
});

// NEW: Enhanced Description Component with better text handling
const ProductDescription = ({ description, title }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Check if description contains HTML tags
  const containsHTML = useMemo(() => {
    if (!description) return false;
    return /<[^>]*>/g.test(description);
  }, [description]);

  // Clean and process the description
  const processedDescription = useMemo(() => {
    if (!description) return "";

    // If it's already cleaned text (no HTML), return as is
    if (!containsHTML) {
      return description;
    }

    // If it contains HTML, we need to be more careful
    // Safely extract text content without using innerHTML
    let textContent = description;
    
    try {
      // Remove HTML tags safely using regex instead of innerHTML
      textContent = description
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Remove styles
        .replace(/<[^>]*>/g, '')  // Remove all HTML tags
        .replace(/&nbsp;/g, ' ')  // Replace HTML entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
    } catch (error) {
      console.warn('Error processing description HTML:', error);
      // Fallback to original description if processing fails
      textContent = description.replace(/<[^>]*>/g, '').trim();
    }

    // Additional cleaning for any remaining unwanted patterns
    const unwantedPatterns = [
      /similar\s+items?/gi,
      /people\s+also\s+(bought|viewed|liked)/gi,
      /you\s+may\s+also\s+like/gi,
      /recommended\s+for\s+you/gi,
      /visit\s+my\s+store/gi,
      /see\s+other\s+items/gi,
      /browse\s+similar/gi,
      /check\s+out\s+my\s+other/gi,
    ];

    // Remove lines containing unwanted patterns
    const lines = textContent.split("\n");
    const cleanLines = lines.filter((line) => {
      const cleanLine = line.trim().toLowerCase();
      return !unwantedPatterns.some((pattern) => pattern.test(cleanLine));
    });

    return cleanLines.join("\n").trim();
  }, [description, containsHTML]);

  // Split description into paragraphs for better formatting
  const paragraphs = useMemo(() => {
    if (!processedDescription) return [];

    return processedDescription
      .split("\n")
      .map((para) => para.trim())
      .filter((para) => para.length > 0)
      .slice(0, showFullDescription ? undefined : 3); // Show first 3 paragraphs by default
  }, [processedDescription, showFullDescription]);

  // Check if description is truncated
  const isTruncated = useMemo(() => {
    if (!processedDescription) return false;
    const allParagraphs = processedDescription
      .split("\n")
      .filter((p) => p.trim().length > 0);
    return allParagraphs.length > 3;
  }, [processedDescription]);

  if (!processedDescription) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Description</h2>
        <div className="text-gray-500 italic">
          No description available for this product.
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Description</h2>

      <div className="space-y-3">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-gray-700 leading-relaxed">
            {paragraph}
          </p>
        ))}

        {isTruncated && (
          <button
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm mt-2 transition-colors"
          >
            {showFullDescription ? "Show Less" : "Show More"}
          </button>
        )}

        {/* Show warning if original had HTML content */}
        {containsHTML && (
          <div className="mt-3 text-xs text-gray-500">
            Description has been cleaned and formatted for better readability.
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Product Image Display Component
const SimpleProductImage = ({ src, alt }) => {
  return (
    <div className="w-full h-full">
      <ProductImage
        src={src}
        alt={alt}
        className="w-full h-full object-contain"
      />
    </div>
  );
};

// Enhanced Product Image Section Component
const ProductImageSection = ({
  product,
  activeImage,
  setActiveImage,
  showVideo,
  setShowVideo,
  onImageClick,
}) => {
  // Memoize image processing to avoid recalculating on every render
  const processedImages = useMemo(() => {
    const images = [];

    // Safety check: ensure product exists
    if (!product) return images;

    try {
      // Add main image first
      if (product.main_image && typeof product.main_image === 'string') {
        images.push(product.main_image);
      }

      // Add additional images, avoiding duplicates
      if (product.images && Array.isArray(product.images)) {
        product.images.forEach((img) => {
          if (img && typeof img === 'string' && !images.includes(img)) {
            images.push(img);
          }
        });
      }
    } catch (error) {
      console.warn('Error processing product images:', error);
    }

    return images;
  }, [product?.main_image, product?.images]);

  // Handle thumbnail click with bounds checking
  const handleThumbnailClick = useCallback(
    (index) => {
      if (index >= 0 && index < processedImages.length) {
        setActiveImage(index);
      }
    },
    [processedImages.length, setActiveImage]
  );


  return (
    <div className="product-images-section lg:col-span-1">
      {/* Video/Image Toggle for AliExpress */}
      {product?.product_video_url && typeof product.product_video_url === 'string' && (
        <div className="product-media-toggle mb-4 flex gap-2">
          <button
            onClick={() => setShowVideo(false)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              !showVideo
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Images
          </button>
          <button
            onClick={() => setShowVideo(true)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              showVideo
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Video
          </button>
        </div>
      )}

      {/* Main Image/Video Display */}
      <div className="product-main-image mb-4">
        {showVideo && product?.product_video_url && typeof product.product_video_url === 'string' ? (
          <div className="w-full h-96 bg-black rounded-lg overflow-hidden">
            <video
              controls
              className="w-full h-full object-contain"
              poster={processedImages?.[0] || ""}
              onError={(e) => {
                console.warn('Video failed to load:', product.product_video_url);
                setShowVideo(false); // Fall back to images if video fails
              }}
            >
              <source src={product.product_video_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        ) : (
          <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
            {processedImages.length > 0 ? (
              <button
                onClick={() => onImageClick && onImageClick(activeImage)}
                className="w-full h-full relative group cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
                title="Click to open image gallery"
              >
                <SimpleProductImage
                  src={processedImages[Math.min(activeImage, processedImages.length - 1)] || processedImages[0]}
                  alt={product?.title || 'Product image'}
                />
                
                {/* Overlay with zoom icon on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  <div className="bg-white bg-opacity-0 group-hover:bg-opacity-90 rounded-full p-3 transform scale-0 group-hover:scale-100 transition-all duration-200">
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </div>
                </div>
                
                {/* Image indicator if multiple images */}
                {processedImages.length > 1 && (
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    {activeImage + 1} / {processedImages.length}
                  </div>
                )}
              </button>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📷</div>
                  <span>No images available</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thumbnail Images */}
      {processedImages.length > 1 && (
        <div className="product-thumbnails grid grid-cols-4 gap-2">
          {processedImages.map((image, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`w-full h-20 bg-gray-100 rounded border-2 overflow-hidden transition-all ${
                activeImage === index
                  ? "border-blue-500 shadow-md"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <ProductImage
                src={image}
                alt={`${product.title} - Image ${index + 1}`}
                className="w-full h-full object-cover"
                showLoader={false}
              />
            </button>
          ))}
        </div>
      )}

    </div>
  );
};

const ProductDetailPage = () => {
  const { marketplace, id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isInWishlist: checkIsInWishlist, addToWishlist, removeFromWishlist, getWishlistItem, wishlistItems, isLoading: wishlistLoading, fetchWishlist } = useWishlist();

  // Enable auto-wishlist functionality
  useAutoWishlist();
  
  // Track recently viewed products
  const { addProduct: addToRecentlyViewed } = useRecentlyViewed();

  // Get marketplace logo component (same as ProductCard)
  const getMarketplaceLogo = (marketplace) => {
    const marketplaceName = marketplace?.toLowerCase();
    
    switch (marketplaceName) {
      case 'aliexpress':
        return (
          <div className="flex items-center bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
            <span className="text-sm font-bold text-orange-500">AliExpress</span>
          </div>
        );
      case 'ebay':
        return (
          <div className="flex items-center bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
            <span className="text-sm font-bold text-blue-600">e</span>
            <span className="text-sm font-bold text-red-500">b</span>
            <span className="text-sm font-bold text-yellow-500">a</span>
            <span className="text-sm font-bold text-green-500">y</span>
          </div>
        );
      case 'amazon':
        return (
          <div className="flex items-center bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
            <span className="text-sm font-bold text-gray-900">amazon</span>
            <svg className="w-4 h-3 ml-1" viewBox="0 0 100 30" fill="currentColor">
              <path d="M60 20c-10 8-25 12-37 12-18 0-33-7-45-18-1-1 0-2 1-1 15 8 33 13 52 13 13 0 27-3 40-8 2-1 3 1 1 2z" fill="#FF9900"/>
              <path d="M63 17c-1-2-8-1-11-1-1 0-1-1 0-1 8-1 20 0 21 1 1 1 0 8-4 11 0 1-1 0-1 0 3-4 4-8 3-10z" fill="#FF9900"/>
            </svg>
          </div>
        );
      case 'walmart':
        return (
          <div className="flex items-center bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200">
            <div className="w-4 h-4 mr-1">
              <svg viewBox="0 0 100 100" fill="#0071ce">
                <circle cx="50" cy="25" r="8"/>
                <circle cx="25" cy="43" r="8"/>
                <circle cx="75" cy="43" r="8"/>
                <circle cx="25" cy="75" r="8"/>
                <circle cx="75" cy="75" r="8"/>
                <circle cx="50" cy="93" r="8"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-blue-600">Walmart</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full border border-gray-300">
            <span className="text-sm font-medium capitalize text-gray-700">{marketplace || 'Unknown'}</span>
          </div>
        );
    }
  };

  // Get official marketplace name for text display
  const getOfficialMarketplaceName = (marketplace) => {
    const marketplaceNames = {
      'aliexpress': 'AliExpress',
      'ebay': 'ebay',
      'amazon': 'Amazon',
      'walmart': 'Walmart',
      'target': 'Target',
      'bestbuy': 'Best Buy',
      'newegg': 'Newegg',
      'etsy': 'Etsy'
    };
    
    return marketplaceNames[marketplace?.toLowerCase()] || 
           (marketplace?.charAt(0).toUpperCase() + marketplace?.slice(1)) || 
           'Unknown';
  };

  // State management
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isContentReady, setIsContentReady] = useState(false);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Wishlist state
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [wishlistMessage, setWishlistMessage] = useState(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  

  // Fetch product detail with proper error handling
  const fetchProductDetail = useCallback(async () => {
    if (!marketplace || !id) {
      console.log("Missing marketplace or id:", { marketplace, id });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the existing productService instead of raw fetch
      const data = await productService.getProductDetails(marketplace, id);
      setProduct(data);
      setError(null);
      setRetryCount(0);
      
      // Add a small delay to ensure smooth transition
      setTimeout(() => {
        setIsContentReady(true);
      }, 100);
      
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching product detail:", err);
      let errorMessage = "Failed to load product details";
      let shouldAutoRetry = false;

      if (!navigator.onLine) {
        errorMessage = "No internet connection. Please check your connection";
      } else if (err.message) {
        // Handle specific error types
        if (err.message.includes("503") || err.message.includes("Service Unavailable")) {
          errorMessage = "The service is temporarily busy. Please try again in a moment.";
          shouldAutoRetry = retryCount < 2; // Auto-retry up to 2 times for 503 errors
        } else if (err.message.includes("AliExpress service error")) {
          errorMessage = "AliExpress data temporarily unavailable. Please try refreshing the page.";
          shouldAutoRetry = retryCount < 1; // Auto-retry once for AliExpress errors
        } else if (err.message.includes("404") || err.message.includes("not found")) {
          errorMessage = "Product not found. It may have been removed or the link is invalid.";
        } else if (err.message.includes("timeout")) {
          errorMessage = "Request timed out. Please check your internet connection and try again.";
          shouldAutoRetry = retryCount < 1; // Auto-retry once for timeout errors
        } else {
          errorMessage = err.message;
        }
      }

      // Implement auto-retry with exponential backoff
      if (shouldAutoRetry) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // 1s, 2s, 4s, max 5s
        setIsAutoRetrying(true);
        setRetryCount(prev => prev + 1);
        
        console.log(`Auto-retrying in ${retryDelay}ms (attempt ${retryCount + 1})`);
        
        setTimeout(() => {
          setIsAutoRetrying(false);
          fetchProductDetail();
        }, retryDelay);
      } else {
        setError(errorMessage);
        setProduct(null);
        setIsLoading(false);
      }
    }
  }, [marketplace, id]);

  useEffect(() => {
    if (marketplace && id) {
      // Reset states when navigating to a new product
      setIsContentReady(false);
      setProduct(null);
      setError(null);
      setRetryCount(0);
      setIsAutoRetrying(false);
      
      // Scroll to top when navigating to product detail page
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      fetchProductDetail();
    }
  }, [fetchProductDetail]);
  
  // Track product view when product is successfully loaded
  useEffect(() => {
    if (product && !error && !isLoading) {
      // Add to recently viewed products
      addToRecentlyViewed(product);
    }
  }, [product, error, isLoading, addToRecentlyViewed]);

  // Clear wishlist message after a delay
  useEffect(() => {
    if (wishlistMessage) {
      const timer = setTimeout(() => {
        setWishlistMessage(null);
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [wishlistMessage]);

  // Initialize scroll reveal animations with safety checks
  useEffect(() => {
    if (product && !isLoading && !error) {
      // Clean up previous animations
      cleanupAnimations();
      
      // Ensure all content is visible first
      const elements = document.querySelectorAll('.product-breadcrumbs, .product-detail-content, .product-images-section, .product-info, .product-sidebar, .recommendations-section');
      elements.forEach(el => {
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        el.style.transform = 'none';
      });
      
      // Initialize animations after a delay
      const timer = setTimeout(() => {
        // Re-initialize with safer configuration
        initProductPageAnimations();
        
        // Ensure visibility after animations
        setTimeout(() => {
          elements.forEach(el => {
            if (window.getComputedStyle(el).opacity === '0') {
              el.style.opacity = '1';
              el.style.visibility = 'visible';
            }
          });
        }, 1000);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [product, isLoading, error]);

  // Force refresh wishlist when user becomes authenticated (for login redirects)
  useEffect(() => {
    if (isAuthenticated && product) {
      // Force refresh wishlist data when user becomes authenticated
      fetchWishlist(true, false);
    }
  }, [isAuthenticated, fetchWishlist, product]);

  // Check if product is already in wishlist (when user is authenticated and wishlist is loaded)
  useEffect(() => {
    if (!isAuthenticated || !product) {
      setIsInWishlist(false);
      return;
    }

    // Wait for wishlist to finish loading before checking
    if (wishlistLoading) return;

    const inWishlist = checkIsInWishlist(product.product_id, product.marketplace);
    setIsInWishlist(inWishlist);
  }, [isAuthenticated, product, checkIsInWishlist, wishlistItems, wishlistLoading]);

  // Handle removing product from wishlist
  const handleRemoveFromWishlist = useCallback(async () => {
    if (!isAuthenticated || !product || isAddingToWishlist) return;

    try {
      setIsAddingToWishlist(true);

      // Find the wishlist item to get its ID
      const wishlistItem = getWishlistItem(product.product_id, product.marketplace);

      if (!wishlistItem) {
        setWishlistMessage({
          type: "error",
          text: "Item not found in wishlist.",
        });
        setIsInWishlist(false);
        return;
      }

      await removeFromWishlist(wishlistItem.id);

      // The context will update the wishlist state automatically
      setWishlistMessage({
        type: "success",
        text: `"${product.title}" has been removed from your wishlist!`,
      });
    } catch (error) {
      console.error("Error removing from wishlist:", error);

      let errorMessage = "Failed to remove item from wishlist. Please try again.";

      if (
        error.message.includes("401") ||
        error.message.includes("Unauthorized")
      ) {
        errorMessage = "Your session has expired. Please log in again.";
        navigate("/login", {
          state: {
            from: `/product/${marketplace}/${id}`,
            message: "Your session has expired. Please log in to manage your wishlist.",
          },
        });
        return;
      }

      setWishlistMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setIsAddingToWishlist(false);
    }
  }, [isAuthenticated, product, isAddingToWishlist, navigate, marketplace, id, getWishlistItem, removeFromWishlist]);

  // Handle adding product to wishlist
  const handleAddToWishlist = useCallback(async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Prepare complete product data for auto-add after login
      const wishlistData = {
        product_id: product.product_id,
        marketplace: product.marketplace,
        title: product.title,
        original_price: product.original_price,
        sale_price: product.sale_price,
        image: product.main_image,
        detail_url: window.location.href, // Current product page URL
        affiliate_link: product.affiliate_link,
      };

      // Store wishlist data in sessionStorage for persistence across navigation
      sessionStorage.setItem('pendingWishlistAdd', JSON.stringify(wishlistData));

      // Redirect to login with information about the intended action
      navigate("/login", {
        state: {
          from: `/product/${marketplace}/${id}`,
          message: "Please log in to add items to your wishlist",
          action: "add_to_wishlist",
          productTitle: product?.title || "this product",
        },
      });
      return;
    }

    if (!product || isAddingToWishlist) return;

    try {
      setIsAddingToWishlist(true);

      // Prepare product data for wishlist
      const wishlistData = {
        product_id: product.product_id,
        marketplace: product.marketplace,
        title: product.title,
        original_price: product.original_price,
        sale_price: product.sale_price,
        image: product.main_image,
        detail_url: window.location.href, // Current product page URL
        affiliate_link: product.affiliate_link,
      };

      await addToWishlist(wishlistData);

      // The context will update the wishlist state automatically
      const successMessage = {
        type: "success",
        text: `"${product.title}" has been added to your wishlist!`,
      };
      setWishlistMessage(successMessage);
    } catch (error) {
      console.error("Error adding to wishlist:", error);

      let errorMessage = "Failed to add item to wishlist. Please try again.";

      if (
        error.message.includes("401") ||
        error.message.includes("Unauthorized")
      ) {
        errorMessage = "Your session has expired. Please log in again.";
        // Redirect to login if token is invalid
        navigate("/login", {
          state: {
            from: `/product/${marketplace}/${id}`,
            message:
              "Your session has expired. Please log in to add items to your wishlist.",
          },
        });
        return;
      }

      setWishlistMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setIsAddingToWishlist(false);
    }
  }, [isAuthenticated, product, isAddingToWishlist, navigate, marketplace, id, addToWishlist]);

  // FIXED: Retry function that actually works
  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setError(null);
    setIsLoading(true);
    fetchProductDetail();
  }, [fetchProductDetail]);

  // Image modal handlers
  const handleImageClick = useCallback((imageIndex) => {
    setActiveImage(imageIndex);
    setIsImageModalOpen(true);
  }, []);

  const handleCloseImageModal = useCallback(() => {
    setIsImageModalOpen(false);
  }, []);

  // Memoize processed images for modal
  const processedImages = useMemo(() => {
    const images = [];

    // Safety check: ensure product exists
    if (!product) return images;

    try {
      // Add main image first
      if (product.main_image && typeof product.main_image === 'string') {
        images.push(product.main_image);
      }

      // Add additional images, avoiding duplicates
      if (product.images && Array.isArray(product.images)) {
        product.images.forEach((img) => {
          if (img && typeof img === 'string' && !images.includes(img)) {
            images.push(img);
          }
        });
      }
    } catch (error) {
      console.warn('Error processing product images:', error);
    }

    return images;
  }, [product?.main_image, product?.images]);

  // Format price with currency
  const formatPrice = useCallback((price) => {
    try {
      const numPrice = typeof price === "string" ? parseFloat(price) : price;
      if (isNaN(numPrice)) return "$0.00";

      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(numPrice);
    } catch (error) {
      console.error("Error formatting price:", error);
      return "$0.00";
    }
  }, []);

  // Calculate discount percentage
  const calculateDiscount = useCallback((original, sale) => {
    try {
      const origNum =
        typeof original === "string" ? parseFloat(original) : original;
      const saleNum = typeof sale === "string" ? parseFloat(sale) : sale;

      if (
        isNaN(origNum) ||
        isNaN(saleNum) ||
        origNum <= 0 ||
        saleNum >= origNum
      ) {
        return 0;
      }

      return Math.round(((origNum - saleNum) / origNum) * 100);
    } catch (error) {
      console.error("Error calculating discount:", error);
      return 0;
    }
  }, []);

  // Format specification value safely
  const formatSpecificationValue = useCallback((value) => {
    if (!value) return "N/A";

    // If value is an array, join it properly
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    // If value is a string that looks like comma-separated characters, fix it
    if (typeof value === "string") {
      // Check if the string looks like individual characters separated by commas
      // (e.g., "N, E, S, -, 0, 0, 1" should become "NES-001")
      if (
        value.includes(", ") &&
        value.split(", ").every((part) => part.length <= 1)
      ) {
        return value.replace(/, /g, "");
      }
      return value;
    }

    // Convert other types to string
    return String(value);
  }, []);

  // Format delivery time to be more readable
  const formatDeliveryTime = useCallback((deliveryTime) => {
    if (!deliveryTime) return null;

    // If it's already in human-readable format (like AliExpress), return as is
    if (typeof deliveryTime === 'string' && deliveryTime.includes('business days')) {
      return deliveryTime;
    }

    // Check if it's an ISO date string (eBay format)
    if (typeof deliveryTime === 'string' && deliveryTime.includes('T') && deliveryTime.includes('Z')) {
      try {
        const deliveryDate = new Date(deliveryTime);
        const today = new Date();
        
        // Reset time parts to get accurate day difference
        today.setHours(0, 0, 0, 0);
        deliveryDate.setHours(0, 0, 0, 0);
        
        // Calculate difference in days
        const timeDiff = deliveryDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff <= 0) {
          return "Available now";
        } else if (daysDiff === 1) {
          return "1 business day";
        } else if (daysDiff <= 30) {
          return `${daysDiff} business days`;
        } else {
          return deliveryDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }
      } catch (error) {
        console.warn('Error parsing delivery date:', error);
        return deliveryTime;
      }
    }

    return deliveryTime;
  }, []);

  // Collapsible Specifications Component
  const ProductSpecifications = ({ specifications }) => {
    const [showAllSpecs, setShowAllSpecs] = useState(false);
    
    if (!specifications || Object.keys(specifications).length === 0) {
      return null;
    }

    const specEntries = Object.entries(specifications);
    const displayedSpecs = showAllSpecs ? specEntries : specEntries.slice(0, 4);
    const hasMoreSpecs = specEntries.length > 4;

    return (
      <div className="product-specifications bg-white border rounded-lg overflow-hidden">
        <h3 className="font-semibold p-4 bg-gray-50 border-b">
          Specifications
        </h3>
        <div>
          {displayedSpecs.map(([key, value], index) => (
            <div
              key={key}
              className={`flex py-2 px-4 ${
                index % 2 === 0 ? "bg-gray-50" : "bg-white"
              }`}
            >
              <div className="w-1/3 text-sm font-medium text-gray-700">
                {key}
              </div>
              <div className="w-2/3 text-sm text-gray-600">
                {formatSpecificationValue(value)}
              </div>
            </div>
          ))}
          
          {hasMoreSpecs && (
            <div className="px-4 py-2">
              <button
                onClick={() => setShowAllSpecs(!showAllSpecs)}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
              >
                {showAllSpecs ? "Show Less" : `Show More (${specEntries.length - 4} more)`}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const formatSellerInfo = useCallback((seller, marketplace) => {
    if (!seller) return null;

    const isEbay = marketplace === "ebay";
    const isAliExpress = marketplace === "aliexpress";

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">
          {isEbay ? "Seller Information" : "Shop Information"}
        </h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">
              {isEbay ? "Seller:" : "Shop:"}
            </span>
            <span className="font-medium">
              {seller.username || seller.shop_name || "N/A"}
            </span>
          </div>

          {/* eBay-specific fields */}
          {isEbay && seller.feedback_percentage && (
            <div className="flex justify-between">
              <span className="text-gray-600">Feedback:</span>
              <span className="font-medium text-green-600">
                {seller.feedback_percentage}% positive
              </span>
            </div>
          )}

          {isEbay && seller.feedback_score && (
            <div className="flex justify-between">
              <span className="text-gray-600">Rating:</span>
              <span className="font-medium">
                {Number(seller.feedback_score).toLocaleString()} reviews
              </span>
            </div>
          )}

          {/* AliExpress-specific fields */}
          {isAliExpress && seller.evaluate_rate && (
            <div className="flex justify-between">
              <span className="text-gray-600">Customer Rating:</span>
              <span className="font-medium text-green-600">
                {seller.evaluate_rate} satisfaction
              </span>
            </div>
          )}

          {isAliExpress && seller.shop_url && (
            <div className="mt-2">
              <a
                href={seller.shop_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Visit Shop
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }, []);

  // Format shipping information
  const formatShippingInfo = useCallback((shipping, location) => {
    if (!shipping && !location) return null;

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-800 mb-2">
          Shipping & Location
        </h3>

        {location && (
          <div className="mb-3 text-sm">
            <span className="text-gray-600">Ships from: </span>
            <span className="font-medium">
              {[location.city, location.state_or_province, location.country]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        )}

        {shipping && shipping.length > 0 && (
          <div className="space-y-2">
            {shipping.slice(0, 3).map((option, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {option.type || option.method || "Shipping"}:
                </span>
                <div className="text-right">
                  <div className="font-medium">
                    {(option.cost === "0" || option.cost === "0.00" || parseFloat(option.cost) === 0) ? "Free" : `$${option.cost}`}
                  </div>
                  {option.estimated_delivery && (
                    <div className="text-xs text-gray-500">
                      Est: {formatDeliveryTime(option.estimated_delivery)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Shipping Disclaimer */}
        {marketplace === "aliexpress" && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <div className="text-xs text-gray-500 leading-relaxed">
              <span className="text-gray-400">*</span> Shipping costs are estimates. Final costs may vary based on AliExpress promotions, cart total, and Choice program eligibility.
            </div>
          </div>
        )}
      </div>
    );
  }, []);

  // Format return policy
  const formatReturnPolicy = useCallback((returnPolicy) => {
    if (!returnPolicy) return null;

    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="font-semibold text-orange-800 mb-2">Return Policy</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Returns:</span>
            <span className="font-medium">
              {returnPolicy.returns_accepted ? "Accepted" : "Not Accepted"}
            </span>
          </div>

          {returnPolicy.return_period && (
            <div className="flex justify-between">
              <span className="text-gray-600">Period:</span>
              <span className="font-medium">
                {returnPolicy.return_period.toString().toLowerCase().includes('day') 
                  ? returnPolicy.return_period 
                  : `${returnPolicy.return_period} days`}
              </span>
            </div>
          )}

          {returnPolicy.return_method && (
            <div className="flex justify-between">
              <span className="text-gray-600">Method:</span>
              <span className="font-medium">{returnPolicy.return_method}</span>
            </div>
          )}
        </div>
      </div>
    );
  }, []);

  // Format breadcrumbs
  const formatBreadcrumbs = useCallback((product) => {
    const breadcrumbs = [{ name: "Home", path: "/" }];

    if (product?.categories) {
      // Handle categories if available
      if (Array.isArray(product.categories)) {
        // If categories is an array
        product.categories.forEach((category) => {
          if (category && typeof category === 'string' && category !== "N/A" && 
              !category.match(/^\/?\d+\/?\d*$/)) { // Skip numeric IDs like /44/629
            breadcrumbs.push({ name: category, path: null });
          }
        });
      } else if (typeof product.categories === 'object') {
        // If categories is an object
        Object.entries(product.categories).forEach(([level, category]) => {
          if (category && typeof category === 'string' && category !== "N/A" && 
              !category.match(/^\/?\d+\/?\d*$/)) { // Skip numeric IDs like /44/629
            breadcrumbs.push({ name: category, path: null });
          }
        });
      } else if (typeof product.categories === 'string') {
        // If categories is a single string
        const category = product.categories;
        if (category !== "N/A" && !category.match(/^\/?\d+\/?\d*$/)) {
          breadcrumbs.push({ name: category, path: null });
        }
      }
    }

    // If no valid categories were added, use fallback
    if (breadcrumbs.length === 1) {
      breadcrumbs.push({ name: "Products", path: "/search" });
      if (product?.marketplace) {
        breadcrumbs.push({
          name:
            product.marketplace.charAt(0).toUpperCase() +
            product.marketplace.slice(1),
          path: null,
        });
      }
    }

    return breadcrumbs;
  }, []);

  // Loading state - Show skeleton while loading
  if (isLoading || !isContentReady || isAutoRetrying) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isAutoRetrying && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center text-blue-800">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-sm font-medium">
                Retrying connection... (Attempt {retryCount + 1})
              </span>
            </div>
          </div>
        )}
        <ProductDetailSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    const isServiceError = error.includes("503") || error.includes("Service Unavailable") || error.includes("AliExpress");
    const isNotFound = error.includes("404") || error.includes("not found");
    
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="mb-6">
            {isServiceError ? (
              <div className="text-6xl mb-4">⚠️</div>
            ) : isNotFound ? (
              <div className="text-6xl mb-4">🔍</div>
            ) : (
              <div className="text-6xl mb-4">❌</div>
            )}
          </div>
          
          <h1 className="text-2xl font-bold mb-4 text-gray-900">
            {isServiceError ? "Service Temporarily Unavailable" : 
             isNotFound ? "Product Not Found" : 
             "Something Went Wrong"}
          </h1>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
          
          {isServiceError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-yellow-800">
                <strong>Why does this happen?</strong><br/>
                AliExpress may be experiencing high traffic or temporary maintenance. 
                This usually resolves within a few minutes.
              </p>
            </div>
          )}
          
          <div className="space-x-4">
            <button
              onClick={handleRetry}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              🔄 Try Again
            </button>
            <Link
              to="/"
              className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium inline-block"
            >
              🏠 Back to Home
            </Link>
            {!isNotFound && (
              <Link
                to="/search"
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-medium inline-block"
              >
                🔍 Browse Products
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No product found
  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-xl font-medium mb-4">Product not found</p>
        <p className="text-gray-600 mb-6">
          The product you're looking for doesn't exist or has been removed.
        </p>
        <Link
          to="/"
          className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  // Main render
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div style={{ opacity: 1, visibility: 'visible', transform: 'none' }}>
      {/* Back Button */}
      <div className="mb-4">
        <BackButton />
      </div>
      
      {/* Enhanced Breadcrumbs */}
      <div className="product-breadcrumbs text-sm text-gray-500 mb-6">
        {formatBreadcrumbs(product).map((crumb, index) => (
          <span key={index}>
            {index > 0 && <span className="mx-2">/</span>}
            {crumb.path && index < formatBreadcrumbs(product).length - 1 ? (
              <Link to={crumb.path} className="hover:text-primary">
                {crumb.name}
              </Link>
            ) : (
              <span
                className={
                  index === formatBreadcrumbs(product).length - 1
                    ? "text-gray-700 font-medium"
                    : ""
                }
              >
                {crumb.name}
              </span>
            )}
          </span>
        ))}
        {!product.categories && (
          <>
            <span className="mx-2">/</span>
            <span className="text-gray-700 truncate">{product.title}</span>
          </>
        )}
      </div>

      {/* Product Content */}
      <div className="product-detail-content grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ENHANCED Product Images & Video - Left Column */}
        <div>
          <ProductImageSection
            product={product}
            activeImage={activeImage}
            setActiveImage={setActiveImage}
            showVideo={showVideo}
            setShowVideo={setShowVideo}
            onImageClick={handleImageClick}
          />
        </div>

        {/* Product Info - Middle Column */}
        <div className="product-info lg:col-span-1">
          {/* Title and Basic Info */}
          <div className="product-title-section mb-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              {product.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              {getMarketplaceLogo(product.marketplace)}

              {product.condition && (
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    product.condition.toLowerCase() === "new"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {product.condition}
                </span>
              )}

              {product.top_rated_seller && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Top Rated
                </span>
              )}
            </div>
          </div>

          {/* Price Information */}
          <div className="product-price-section mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-green-600">
                {formatPrice(product.sale_price)}
              </span>

              {product.original_price &&
                product.original_price !== product.sale_price && (
                  <>
                    <span className="text-xl text-gray-500 line-through">
                      {formatPrice(product.original_price)}
                    </span>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">
                      {calculateDiscount(
                        product.original_price,
                        product.sale_price
                      )}
                      % OFF
                    </span>
                  </>
                )}
            </div>

            {/* Sold Count or New Item Badge */}
            {product.sold_count !== undefined && (
              <div className="flex items-center text-sm">
                {product.sold_count > 0 ? (
                  <span className="text-gray-600 font-medium">
                    {product.sold_count.toLocaleString()} sold
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                    </svg>
                    New listing
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Wishlist Message Display */}
          {wishlistMessage && (
            <div
              className={`wishlist-notification mb-4 p-4 rounded-lg border-2 shadow-lg ${
                wishlistMessage.type === "success"
                  ? "bg-green-100 border-green-300 text-green-900"
                  : "bg-red-100 border-red-300 text-red-900"
              }`}
              style={{ 
                zIndex: 1000, 
                position: 'relative',
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center',
                opacity: 1,
                visibility: 'visible'
              }}
            >
              <div className="flex items-center font-semibold w-full">
                <span className="mr-3 text-lg">
                  {wishlistMessage.type === "success" ? "✅" : "❌"}
                </span>
                <span className="flex-1">
                  {wishlistMessage.text || "Item added to wishlist successfully!"}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="product-actions mb-6 space-y-3">
            <a
              href={product.affiliate_link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-primary text-white py-3 px-4 rounded text-center font-medium hover:bg-blue-700 transition-colors block"
            >
              View on {getOfficialMarketplaceName(product.marketplace)}
            </a>

            {/* Enhanced Wishlist Toggle Button */}
            <button
              onClick={isInWishlist ? handleRemoveFromWishlist : handleAddToWishlist}
              disabled={isAddingToWishlist}
              className={`w-full py-3 px-4 rounded text-center font-medium transition-all duration-300 ${
                isInWishlist
                  ? "bg-green-50 border border-green-200 text-green-800 hover:bg-red-50 hover:border-red-200 hover:text-red-800"
                  : isAddingToWishlist
                  ? "bg-gray-100 border border-gray-300 text-gray-500 cursor-not-allowed"
                  : "border border-primary text-primary hover:bg-primary hover:text-white"
              }`}
              title={
                isInWishlist
                  ? "Click to remove from wishlist"
                  : isAddingToWishlist
                  ? "Processing..."
                  : isAuthenticated
                  ? "Add to wishlist"
                  : "Login required to add to wishlist"
              }
            >
              {isAddingToWishlist ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mr-2"></div>
                  {isInWishlist ? "Removing..." : "Adding..."}
                </div>
              ) : isInWishlist ? (
                <div className="flex items-center justify-center group">
                  <span className="mr-2 transition-transform group-hover:scale-110">❤️</span>
                  <span className="group-hover:hidden">In Wishlist</span>
                  <span className="hidden group-hover:inline">Click to Remove</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="mr-2">♡</span>
                  {isAuthenticated
                    ? "Add to Wishlist"
                    : "Add to Wishlist (Login Required)"}
                </div>
              )}
            </button>
          </div>

          {/* ENHANCED Description with better handling */}
          <div className="product-description-section">
            <ProductDescription
              description={product.description}
              title={product.title}
            />
          </div>
        </div>

        {/* Additional Info - Right Column */}
        <div className="product-sidebar lg:col-span-1 space-y-4">
          {/* Seller/Shop Information */}
          <div className="seller-info-section">
            {formatSellerInfo(product.seller, product.marketplace)}
          </div>

          {/* Shipping Information */}
          <div className="shipping-info-section">
            {formatShippingInfo(product.shipping, product.location)}
          </div>

          {/* Return Policy */}
          <div className="return-policy-section">
            {formatReturnPolicy(product.return_policy)}
          </div>

          {/* Product Specifications - Now Collapsible */}
          {product.specifications &&
            Object.keys(product.specifications).length > 0 && (
              <ProductSpecifications specifications={product.specifications} />
            )}
        </div>
      </div>

      {/* Product Recommendations Section */}
      <div>
        <ProductRecommendations 
          product={product} 
          marketplace={product.marketplace} 
        />
      </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        images={processedImages}
        initialIndex={activeImage}
        isOpen={isImageModalOpen}
        onClose={handleCloseImageModal}
        productTitle={product?.title || 'Product'}
      />
    </div>
  );
};

export default ProductDetailPage;
