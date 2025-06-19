import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { productService } from "../api/apiServices";

// =====================================================
// ENHANCED IMAGE LOADING COMPONENTS AND HOOKS
// =====================================================

// Custom hook for handling AliExpress image loading with retry logic
const useAliExpressImage = (originalSrc, fallbackSrc) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!originalSrc) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // Try to load the image with various fixes for AliExpress
    const tryLoadImage = async () => {
      const imagesToTry = [
        originalSrc,
        // Remove query parameters that might cause issues
        originalSrc.split("?")[0],
        // Try different size variants (AliExpress specific)
        originalSrc.replace("_50x50.jpg", "_350x350.jpg"),
        originalSrc.replace("_100x100.jpg", "_350x350.jpg"),
        originalSrc.replace("_200x200.jpg", "_350x350.jpg"),
        // Try HTTPS if HTTP
        originalSrc.replace("http://", "https://"),
        fallbackSrc,
      ].filter(Boolean); // Remove any null/undefined values

      for (const src of imagesToTry) {
        try {
          const success = await loadImage(src);
          if (success) {
            setImageSrc(src);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.log(`Failed to load image: ${src}`);
        }
      }

      // If all attempts failed
      setHasError(true);
      setIsLoading(false);
    };

    tryLoadImage();
  }, [originalSrc, fallbackSrc]);

  return { imageSrc, isLoading, hasError };
};

// Helper function to load an image and return a promise
const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Set crossOrigin to try to avoid CORS issues
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(true);
    img.onerror = () => reject(false);

    // Add timestamp to bypass cache if needed
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
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Images ({processedImages.length})
          </button>
          <button
            onClick={() => setShowVideo(true)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              showVideo
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Video
          </button>
        </div>
      )}

      {/* Main Image/Video Display */}
      <div className="mb-4 border rounded-lg overflow-hidden bg-white">
        {showVideo && product.product_video_url ? (
          <video
            controls
            className="w-full h-auto max-h-96"
            poster={processedImages[0]}
            onError={(e) => {
              console.log("Video failed to load, switching to images");
              setShowVideo(false);
            }}
          >
            <source src={product.product_video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <ProductImage
            src={processedImages[activeImage] || processedImages[0]}
            alt={`${product.title} - Main image`}
            className="w-full h-auto max-h-96 object-contain p-4"
          />
        )}
      </div>

      {/* Thumbnail Images */}
      {!showVideo && processedImages.length > 1 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600 font-medium">
            All Images ({processedImages.length})
          </div>
          <div className="grid grid-cols-4 gap-2">
            {processedImages.slice(0, 8).map((image, index) => (
              <div
                key={`${image}-${index}`} // Better key for React reconciliation
                className={`
                  border rounded cursor-pointer transition-all duration-200 relative
                  ${
                    index === activeImage
                      ? "border-primary ring-2 ring-primary/50 shadow-md"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }
                `}
                onClick={() => handleThumbnailClick(index)}
              >
                <ProductImage
                  src={image}
                  alt={`${product.title} - Thumbnail ${index + 1}`}
                  className="w-full aspect-square object-cover"
                  showLoader={false}
                />

                {/* Active indicator */}
                {index === activeImage && (
                  <div className="absolute top-1 right-1 bg-primary text-white text-xs px-1 py-0.5 rounded">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Show more images indicator */}
          {processedImages.length > 8 && (
            <div className="text-sm text-gray-500 text-center">
              +{processedImages.length - 8} more images
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =====================================================
// MAIN PRODUCT DETAIL PAGE COMPONENT
// =====================================================

const ProductDetailPage = () => {
  const { marketplace, id } = useParams();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  // Reset active image when product changes
  useEffect(() => {
    if (product) {
      setActiveImage(0);
      setShowVideo(false);
    }
  }, [product]);

  // FIXED: Proper fetchProductDetail with retry capability
  const fetchProductDetail = useCallback(async () => {
    if (!marketplace || !id) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log(`Fetching product details for ${marketplace}/${id}`);

      const productData = await productService.getProductDetails(
        marketplace,
        id
      );
      console.log("Product data received:", productData);

      setProduct(productData);
    } catch (err) {
      console.error("Error fetching product details:", err);

      // Better error message handling
      let errorMessage = "Failed to load product details";
      if (err.message.includes("404") || err.message.includes("not found")) {
        errorMessage = "Product not found";
      } else if (
        err.message.includes("network") ||
        err.message.includes("fetch")
      ) {
        errorMessage = "Network error. Please check your connection";
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

  // Format seller/shop information for both eBay and AliExpress
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
  const formatShippingInfo = useCallback(
    (shipping, location) => {
      if (!shipping && !location) return null;

      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">
            Shipping & Location
          </h3>

          {location && (
            <div className="mb-3">
              <span className="text-sm text-gray-600">Ships from: </span>
              <span className="text-sm font-medium">
                {[location.city, location.state, location.country]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}

          {shipping && shipping.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">
                Shipping Options:
              </span>
              {shipping.slice(0, 3).map((option, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {option.service || "Standard"}:
                  </span>
                  <span className="font-medium">
                    {option.cost > 0 ? formatPrice(option.cost) : "Free"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    },
    [formatPrice]
  );

  // Format return policy
  const formatReturnPolicy = useCallback((returnPolicy) => {
    if (!returnPolicy) return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">Return Policy</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Returns Accepted:</span>
            <span
              className={`font-medium ${
                returnPolicy.returns_accepted
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {returnPolicy.returns_accepted ? "Yes" : "No"}
            </span>
          </div>
          {returnPolicy.return_period && (
            <div className="flex justify-between">
              <span className="text-gray-600">Return Period:</span>
              <span className="font-medium">{returnPolicy.return_period}</span>
            </div>
          )}
          {returnPolicy.return_method && (
            <div className="flex justify-between">
              <span className="text-gray-600">Return Method:</span>
              <span className="font-medium">{returnPolicy.return_method}</span>
            </div>
          )}
        </div>
      </div>
    );
  }, []);

  // Enhanced breadcrumbs with category support
  const formatBreadcrumbs = useCallback((product) => {
    const breadcrumbs = [
      { name: "Home", path: "/" },
      { name: "Search", path: "/search" },
    ];

    // Add category breadcrumbs for AliExpress
    if (product.categories) {
      if (product.categories.first_level) {
        breadcrumbs.push({
          name: product.categories.first_level,
          path: `/search?category=${encodeURIComponent(
            product.categories.first_level
          )}`,
        });
      }
      if (product.categories.second_level) {
        breadcrumbs.push({
          name: product.categories.second_level,
          path: `/search?category=${encodeURIComponent(
            product.categories.second_level
          )}`,
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-2">Error Loading Product</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mr-2"
          >
            Try Again
          </button>
          <Link
            to="/search"
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  // Product not found state
  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
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

              {product.brand && (
                <span className="text-sm text-gray-600">
                  <strong>Brand:</strong> {product.brand}
                </span>
              )}

              {/* Discount Badge for AliExpress */}
              {product.discount_percentage > 0 && (
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">
                  {product.discount_percentage}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Rating and Sales */}
          <div className="flex items-center mb-4">
            {product.rating && (
              <div className="flex items-center mr-4">
                <div className="flex text-yellow-400 mr-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating)
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                    </svg>
                  ))}
                </div>
                <span className="text-gray-700">
                  {product.rating.toFixed(1)}
                </span>
              </div>
            )}

            {product.sold_count && (
              <div className="text-gray-600 text-sm">
                {product.sold_count.toLocaleString()} sold
              </div>
            )}

            {product.top_rated_seller && (
              <div className="ml-4">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                  Top Rated Seller
                </span>
              </div>
            )}
          </div>

          {/* Price Information */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex items-center mb-2">
              <span className="text-3xl font-bold text-primary mr-3">
                {formatPrice(product.sale_price)}
              </span>

              {product.original_price > product.sale_price && (
                <>
                  <span className="text-lg text-gray-500 line-through mr-2">
                    {formatPrice(product.original_price)}
                  </span>
                  <span className="bg-secondary text-white text-sm font-bold px-2 py-1 rounded">
                    {calculateDiscount(
                      product.original_price,
                      product.sale_price
                    )}
                    % OFF
                  </span>
                </>
              )}
            </div>

            {/* Additional product attributes */}
            <div className="text-sm text-gray-600 space-y-1">
              {product.color && (
                <div>
                  <strong>Color:</strong> {product.color}
                </div>
              )}
              {product.material && (
                <div>
                  <strong>Material:</strong> {product.material}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <a
              href={product.affiliate_link || product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-primary text-white py-3 px-4 rounded text-center font-medium hover:bg-blue-700 transition-colors"
            >
              View Deal on{" "}
              {product.marketplace.charAt(0).toUpperCase() +
                product.marketplace.slice(1)}
            </a>
            <button className="flex-1 border border-primary text-primary py-3 px-4 rounded text-center font-medium hover:bg-primary hover:text-white transition-colors">
              Add to Wishlist
            </button>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <div
                className="text-gray-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
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
                          {value}
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
