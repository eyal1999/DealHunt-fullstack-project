import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { productService, wishlistService } from "../api/apiServices";
import { useAuth } from "../contexts/AuthContext";

// Enhanced hook for handling AliExpress images with CORS issues
const useAliExpressImage = (originalSrc, fallbackSrc) => {
  const [imageSrc, setImageSrc] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!originalSrc) {
      setImageSrc(fallbackSrc || "");
      setIsLoading(false);
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // For AliExpress images, we might need to handle CORS
    testImageLoad(originalSrc)
      .then((success) => {
        if (success) {
          setImageSrc(originalSrc);
        } else {
          setImageSrc(fallbackSrc || "");
          setHasError(true);
        }
      })
      .catch(() => {
        setImageSrc(fallbackSrc || "");
        setHasError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [originalSrc, fallbackSrc]);

  return { imageSrc, isLoading, hasError };
};

// Helper function to test if an image can be loaded
const testImageLoad = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => reject(false);

    // Add timestamp to bypass cache issues
    img.src = src.includes("?")
      ? `${src}&t=${Date.now()}`
      : `${src}?t=${Date.now()}`;

    // Timeout after 10 seconds
    setTimeout(() => reject(false), 10000);
  });
};

// Enhanced Image Component for Product Details
const ProductImage = ({
  src,
  alt,
  className = "",
  fallbackSrc = "https://via.placeholder.com/400x300?text=Image+Not+Available",
  showLoader = true,
}) => {
  const { imageSrc, isLoading, hasError } = useAliExpressImage(
    src,
    fallbackSrc
  );

  if (isLoading && showLoader) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-100`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2 mx-auto"></div>
          <span className="text-sm text-gray-500">Loading image...</span>
        </div>
      </div>
    );
  }

  if (hasError || !imageSrc) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-100`}
      >
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">📷</div>
          <span className="text-sm">Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(e) => {
        // Last resort fallback
        e.target.src = fallbackSrc;
      }}
    />
  );
};

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
    // Create a temporary div to parse HTML safely
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = description;

    // Get text content only
    let textContent = tempDiv.textContent || tempDiv.innerText || "";

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
      </div>

      {/* Show warning if original had HTML content */}
      {containsHTML && (
        <div className="mt-3 text-xs text-gray-500">
          Description has been cleaned and formatted for better readability.
        </div>
      )}
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
}) => {
  // Memoize image processing to avoid recalculating on every render
  const processedImages = useMemo(() => {
    const images = [];

    // Add main image first
    if (product.main_image) {
      images.push(product.main_image);
    }

    // Add additional images, avoiding duplicates
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img) => {
        if (img && !images.includes(img)) {
          images.push(img);
        }
      });
    }

    return images;
  }, [product.main_image, product.images]);

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
    <div className="lg:col-span-1">
      {/* Video/Image Toggle for AliExpress */}
      {product.product_video_url && (
        <div className="mb-4 flex gap-2">
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
      <div className="mb-4">
        {showVideo && product.product_video_url ? (
          <div className="w-full h-96 bg-black rounded-lg overflow-hidden">
            <video
              controls
              className="w-full h-full object-contain"
              poster={processedImages[0] || ""}
            >
              <source src={product.product_video_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        ) : (
          <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
            {processedImages.length > 0 ? (
              <ProductImage
                src={processedImages[activeImage] || processedImages[0]}
                alt={product.title}
                className="w-full h-full object-contain cursor-zoom-in"
              />
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
        <div className="grid grid-cols-4 gap-2">
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
  const { isAuthenticated, currentUser } = useAuth();

  // State management
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  // Wishlist state
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [wishlistMessage, setWishlistMessage] = useState(null);
  const [isInWishlist, setIsInWishlist] = useState(false);

  // Fetch product detail with proper error handling
  const fetchProductDetail = useCallback(async () => {
    if (!marketplace || !id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use the existing productService instead of raw fetch
      const data = await productService.getProductDetails(marketplace, id);
      setProduct(data);
    } catch (err) {
      console.error("Error fetching product detail:", err);
      let errorMessage = "Failed to load product details";

      if (!navigator.onLine) {
        errorMessage = "No internet connection. Please check your connection";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  }, [marketplace, id]);

  useEffect(() => {
    if (marketplace && id) {
      fetchProductDetail();
    }
  }, [fetchProductDetail]);

  // Clear wishlist message after a delay
  useEffect(() => {
    if (wishlistMessage) {
      const timer = setTimeout(() => {
        setWishlistMessage(null);
      }, 5000); // Clear after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [wishlistMessage]);

  // Handle adding product to wishlist
  const handleAddToWishlist = useCallback(async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
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

      await wishlistService.addToWishlist(wishlistData);

      setIsInWishlist(true);
      setWishlistMessage({
        type: "success",
        text: `"${product.title}" has been added to your wishlist!`,
      });
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
  }, [isAuthenticated, product, isAddingToWishlist, navigate, marketplace, id]);

  // Check if product is already in wishlist (when user is authenticated)
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!isAuthenticated || !product) return;

      try {
        // Use the helper function from wishlistService
        const inWishlist = await wishlistService.isInWishlist(
          product.product_id,
          product.marketplace
        );
        setIsInWishlist(inWishlist);
      } catch (error) {
        console.error("Error checking wishlist status:", error);
        // Don't show error to user for this background check
        setIsInWishlist(false);
      }
    };

    checkWishlistStatus();
  }, [isAuthenticated, product]);

  // FIXED: Retry function that actually works
  const handleRetry = useCallback(() => {
    fetchProductDetail();
  }, [fetchProductDetail]);

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
                <span className="text-gray-600">{option.type}:</span>
                <div className="text-right">
                  <div className="font-medium">
                    {option.cost === "0" ? "Free" : `$${option.cost}`}
                  </div>
                  {option.estimated_delivery && (
                    <div className="text-xs text-gray-500">
                      Est:{" "}
                      {new Date(option.estimated_delivery).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
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
              <span className="font-medium">{returnPolicy.return_period}</span>
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
      Object.entries(product.categories).forEach(([level, category]) => {
        if (category && category !== "N/A") {
          breadcrumbs.push({ name: category, path: null });
        }
      });
    } else {
      // Fallback breadcrumbs
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-xl font-medium mb-4">Oops! Something went wrong</p>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="space-x-4">
          <button
            onClick={handleRetry}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
          <Link
            to="/"
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Back to Home
          </Link>
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
    <div>
      {/* Enhanced Breadcrumbs */}
      <div className="text-sm text-gray-500 mb-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ENHANCED Product Images & Video - Left Column */}
        <ProductImageSection
          product={product}
          activeImage={activeImage}
          setActiveImage={setActiveImage}
          showVideo={showVideo}
          setShowVideo={setShowVideo}
        />

        {/* Product Info - Middle Column */}
        <div className="lg:col-span-1">
          {/* Title and Basic Info */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              {product.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium capitalize">
                {product.marketplace}
              </span>

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
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
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
          </div>

          {/* Wishlist Message Display */}
          {wishlistMessage && (
            <div
              className={`mb-4 p-3 rounded-lg border ${
                wishlistMessage.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <div className="flex items-center">
                <span className="mr-2">
                  {wishlistMessage.type === "success" ? "✅" : "❌"}
                </span>
                {wishlistMessage.text}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-6 space-y-3">
            <a
              href={product.affiliate_link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-primary text-white py-3 px-4 rounded text-center font-medium hover:bg-blue-700 transition-colors block"
            >
              View on{" "}
              {product.marketplace.charAt(0).toUpperCase() +
                product.marketplace.slice(1)}
            </a>

            {/* Enhanced Wishlist Button */}
            <button
              onClick={handleAddToWishlist}
              disabled={isAddingToWishlist || isInWishlist}
              className={`w-full py-3 px-4 rounded text-center font-medium transition-colors ${
                isInWishlist
                  ? "bg-green-50 border border-green-200 text-green-800 cursor-not-allowed"
                  : isAddingToWishlist
                  ? "bg-gray-100 border border-gray-300 text-gray-500 cursor-not-allowed"
                  : "border border-primary text-primary hover:bg-primary hover:text-white"
              }`}
            >
              {isAddingToWishlist ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mr-2"></div>
                  Adding to Wishlist...
                </div>
              ) : isInWishlist ? (
                <div className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  Already in Wishlist
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
          <ProductDescription
            description={product.description}
            title={product.title}
          />
        </div>

        {/* Additional Info - Right Column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Seller/Shop Information */}
          {formatSellerInfo(product.seller, product.marketplace)}

          {/* Shipping Information */}
          {formatShippingInfo(product.shipping, product.location)}

          {/* Return Policy */}
          {formatReturnPolicy(product.return_policy)}

          {/* Product Specifications */}
          {product.specifications &&
            Object.keys(product.specifications).length > 0 && (
              <div className="bg-white border rounded-lg overflow-hidden">
                <h3 className="font-semibold p-4 bg-gray-50 border-b">
                  Specifications
                </h3>
                <div>
                  {Object.entries(product.specifications).map(
                    ([key, value], index) => (
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
                    )
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
