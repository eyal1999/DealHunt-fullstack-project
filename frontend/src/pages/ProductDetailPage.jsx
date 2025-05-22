import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { productService } from "../api/apiServices";

const ProductDetailPage = () => {
  const { marketplace, id } = useParams();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const fetchProductDetail = async () => {
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
        setActiveImage(0);
        setShowVideo(false);
      } catch (err) {
        console.error("Error fetching product details:", err);
        setError(err.message || "Failed to load product details");
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (marketplace && id) {
      fetchProductDetail();
    }
  }, [marketplace, id]);

  // Format price with currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Calculate discount percentage
  const calculateDiscount = (original, sale) => {
    if (original <= 0 || sale >= original) return 0;
    return Math.round(((original - sale) / original) * 100);
  };

  // Handle retry when error occurs
  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
  };

  // Format seller/shop information for both eBay and AliExpress
  const formatSellerInfo = (seller, marketplace) => {
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
                {seller.feedback_score.toLocaleString()} reviews
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
  };

  // Format shipping information
  const formatShippingInfo = (shipping, location) => {
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
  };

  // Format return policy
  const formatReturnPolicy = (returnPolicy) => {
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
  };

  // Enhanced breadcrumbs with category support
  const formatBreadcrumbs = (product) => {
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
  };

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
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Try Again
          </button>
        </div>
        <Link to="/search" className="text-primary hover:underline">
          ← Back to Search
        </Link>
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
        {/* Product Images & Video - Left Column */}
        <div className="lg:col-span-1">
          {/* Video/Image Toggle for AliExpress */}
          {product.product_video_url && (
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setShowVideo(false)}
                className={`px-3 py-1 rounded text-sm ${
                  !showVideo
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Images
              </button>
              <button
                onClick={() => setShowVideo(true)}
                className={`px-3 py-1 rounded text-sm ${
                  showVideo
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-700"
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
                poster={product.main_image}
              >
                <source src={product.product_video_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <img
                src={
                  product.images && product.images.length > 0
                    ? product.images[activeImage]
                    : product.main_image || product.image
                }
                alt={product.title}
                className="w-full h-auto max-h-96 object-contain p-4"
                onError={(e) => {
                  e.target.src =
                    "https://via.placeholder.com/400x300?text=Image+Not+Available";
                }}
              />
            )}
          </div>

          {/* Thumbnail Images */}
          {!showVideo && product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(0, 8).map((image, index) => (
                <div
                  key={index}
                  className={`border rounded cursor-pointer ${
                    index === activeImage
                      ? "border-primary ring-2 ring-primary/50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setActiveImage(index)}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full aspect-square object-cover"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/100x100?text=No+Image";
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

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
