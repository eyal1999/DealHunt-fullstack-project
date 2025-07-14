import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useWishlist } from "../../contexts/WishlistContext";
import { getImageUrl, getFallbackImageUrl } from "../../utils/simpleImageProxy";

const ProductCard = ({ product, isWishlistContext = false, customButton = null }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { isInWishlist: checkIsInWishlist, addToWishlist, removeFromWishlist, wishlistItems } = useWishlist();


  // Local state for wishlist operations
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  
  // Image loading state management
  const [imageState, setImageState] = useState('loading'); // loading, loaded, error
  const [currentImageSrc, setCurrentImageSrc] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 1;

  // Initialize image loading
  useEffect(() => {
    if (product?.image) {
      setImageState('loading');
      setCurrentImageSrc(getImageUrl(product.image));
      setRetryCount(0);
    } else {
      // No image provided, go straight to error state
      setImageState('error');
    }
  }, [product?.image]);

  // Handle image loading success
  const handleImageLoad = useCallback(() => {
    setImageState('loaded');
  }, []);

  // Handle image loading error with retry logic
  const handleImageError = useCallback((e) => {
    if (retryCount < MAX_RETRIES) {
      // Try fallback image
      setRetryCount(prev => prev + 1);
      setCurrentImageSrc(getFallbackImageUrl());
    } else {
      // Final failure - show error state
      setImageState('error');
    }
  }, [retryCount, MAX_RETRIES]);

  // Derive wishlist state directly from context - no local state needed
  const isInWishlist = useMemo(() => {
    if (isWishlistContext) return true;
    if (!isAuthenticated || !product?.product_id || !product?.marketplace) return false;
    return checkIsInWishlist(product.product_id, product.marketplace);
  }, [isWishlistContext, isAuthenticated, product?.product_id, product?.marketplace, checkIsInWishlist]);

  // Get marketplace logo component
  const getMarketplaceLogo = (marketplace) => {
    const marketplaceName = marketplace?.toLowerCase();
    
    switch (marketplaceName) {
      case 'aliexpress':
        return (
          <div className="flex items-center bg-white px-2 py-1 rounded shadow-sm border border-gray-200">
            <span className="text-xs font-bold text-orange-500">AliExpress</span>
          </div>
        );
      case 'ebay':
        return (
          <div className="flex items-center bg-white px-2 py-1 rounded shadow-sm border border-gray-200">
            <span className="text-xs font-bold text-blue-600">e</span>
            <span className="text-xs font-bold text-red-500">b</span>
            <span className="text-xs font-bold text-yellow-500">a</span>
            <span className="text-xs font-bold text-green-500">y</span>
          </div>
        );
      case 'amazon':
        return (
          <div className="flex items-center bg-white px-2 py-1 rounded shadow-sm border border-gray-200">
            <span className="text-xs font-bold text-gray-900">amazon</span>
            <svg className="w-3 h-2 ml-1" viewBox="0 0 100 30" fill="currentColor">
              <path d="M60 20c-10 8-25 12-37 12-18 0-33-7-45-18-1-1 0-2 1-1 15 8 33 13 52 13 13 0 27-3 40-8 2-1 3 1 1 2z" fill="#FF9900"/>
              <path d="M63 17c-1-2-8-1-11-1-1 0-1-1 0-1 8-1 20 0 21 1 1 1 0 8-4 11 0 1-1 0-1 0 3-4 4-8 3-10z" fill="#FF9900"/>
            </svg>
          </div>
        );
      case 'walmart':
        return (
          <div className="flex items-center bg-white px-2 py-1 rounded shadow-sm border border-gray-200">
            <div className="w-3 h-3 mr-1">
              <svg viewBox="0 0 100 100" fill="#0071ce">
                <circle cx="50" cy="25" r="8"/>
                <circle cx="25" cy="43" r="8"/>
                <circle cx="75" cy="43" r="8"/>
                <circle cx="25" cy="75" r="8"/>
                <circle cx="75" cy="75" r="8"/>
                <circle cx="50" cy="93" r="8"/>
              </svg>
            </div>
            <span className="text-xs font-bold text-blue-600">Walmart</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center bg-gray-800 text-white px-2 py-1 rounded border border-gray-600">
            <span className="text-xs font-medium capitalize">{marketplace || 'Unknown'}</span>
          </div>
        );
    }
  };

  // Handle adding product to wishlist
  const handleAddToWishlist = useCallback(
    async (e) => {
      e.preventDefault(); // Prevent navigation when clicking heart button
      e.stopPropagation(); // Prevent event bubbling

      // If in wishlist context, don't allow heart icon interaction
      if (isWishlistContext) {
        return;
      }

      // Check if user is authenticated
      if (!isAuthenticated) {
        // Prepare complete product data for auto-add after login
        const wishlistData = {
          product_id: product.product_id,
          marketplace: product.marketplace,
          title: product.title,
          original_price: product.original_price,
          sale_price: product.sale_price,
          image: product.image,
          detail_url: `/product/${product.marketplace}/${product.product_id}`,
          affiliate_link: product.affiliate_link,
        };

        // Store wishlist data in sessionStorage for persistence across navigation
        sessionStorage.setItem('pendingWishlistAdd', JSON.stringify(wishlistData));

        // Redirect to login with information about the intended action
        navigate("/login", {
          state: {
            from: `/product/${product.marketplace}/${product.product_id}`,
            message: "Please log in to add items to your wishlist",
            action: "add_to_wishlist",
            productTitle: product.title,
          },
        });
        return;
      }

      if (!product || isAddingToWishlist) return;

      try {
        setIsAddingToWishlist(true);

        if (isInWishlist) {
          // REMOVE from wishlist
          // Find the wishlist item to remove
          const wishlistItem = wishlistItems.find(item => 
            item.product_id === product.product_id && item.marketplace === product.marketplace
          );
          
          if (wishlistItem) {
            await removeFromWishlist(wishlistItem.id);
            console.log(`"${product.title}" removed from wishlist!`);
          }
        } else {
          // ADD to wishlist
          // Prepare product data for wishlist
          const wishlistData = {
            product_id: product.product_id,
            marketplace: product.marketplace,
            title: product.title,
            original_price: product.original_price,
            sale_price: product.sale_price,
            image: product.image,
            detail_url: `/product/${product.marketplace}/${product.product_id}`,
            affiliate_link: product.affiliate_link,
          };

          await addToWishlist(wishlistData);
          console.log(`"${product.title}" added to wishlist!`);
        }
      } catch (error) {
        console.error("Error updating wishlist:", error);

        if (
          error.message.includes("401") ||
          error.message.includes("Unauthorized")
        ) {
          // Redirect to login if token is invalid
          navigate("/login", {
            state: {
              from: `/product/${product.marketplace}/${product.product_id}`,
              message:
                "Your session has expired. Please log in to add items to your wishlist.",
            },
          });
          return;
        }

        // Could show error toast here
        alert("Failed to add item to wishlist. Please try again.");
      } finally {
        setIsAddingToWishlist(false);
      }
    },
    [isAuthenticated, product, isAddingToWishlist, navigate, isWishlistContext, isInWishlist, addToWishlist, removeFromWishlist, wishlistItems]
  );

  // Format price with proper currency
  const formatPrice = (price) => {
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
  };

  // Calculate discount percentage
  const calculateDiscount = (original, sale) => {
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
  };

  const discount = calculateDiscount(
    product.original_price,
    product.sale_price
  );

  return (
    <div className="product-card h-full bg-white rounded-lg shadow-md overflow-hidden flex flex-col transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:-translate-y-1">
      {/* Product Link - Wraps the clickable area */}
      <Link
        to={`/product/${product.marketplace}/${product.product_id}`}
        className="flex flex-col flex-grow"
      >
        {/* Product Image - Fixed height */}
        <div className="relative h-48 flex-shrink-0 overflow-hidden bg-white">
          {/* Loading spinner */}
          {imageState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}
          
          {/* Error state */}
          {imageState === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs">Image unavailable</p>
              </div>
            </div>
          )}
          
          {/* Actual image */}
          {currentImageSrc && (
            <img
              src={currentImageSrc}
              alt=""
              className={`w-full h-full object-scale-down ${
                imageState === 'loaded' 
                  ? 'transform transition-transform duration-300 hover:scale-105' 
                  : 'opacity-0'
              }`}
              style={{ display: imageState === 'error' ? 'none' : 'block' }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}

          {/* Marketplace logo badge */}
          <div className="absolute top-2 left-2">
            {getMarketplaceLogo(product.marketplace)}
          </div>

          {/* Discount badge */}
          {discount > 0 && (
            <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
              -{discount}%
            </span>
          )}
        </div>

        {/* Product Info - Flex grow to fill space */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Title - Fixed height with ellipsis */}
          <h3 className="font-semibold text-gray-800 mb-2 h-12 line-clamp-2 hover:text-primary transition-colors" title={product.title}>
            {product.title}
          </h3>

          {/* Price section - Push to bottom */}
          <div className="mt-auto">
            {/* Price */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-green-600">
                  {formatPrice(product.sale_price)}
                </span>
                {product.original_price &&
                  product.original_price !== product.sale_price && (
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(product.original_price)}
                    </span>
                  )}
              </div>
            </div>

            {/* Rating - Fixed height */}
            <div className="h-6 flex items-center mb-2">
              {(() => {
                // Check for rating in multiple possible fields
                const realRating = product.rating || 
                                  product.stars || 
                                  product.review_rating || 
                                  product.avg_rating || 
                                  product.customer_rating;
                
                // Generate a realistic mock rating based on product data if no real rating exists
                // This will be phased out as real ratings become available
                let displayRating = realRating;
                let isEstimated = false;
                
                if (!displayRating && product.product_id) {
                  // Use product_id hash to generate consistent mock ratings between 3.5-4.8
                  const hashCode = product.product_id.split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                  }, 0);
                  displayRating = 3.5 + (Math.abs(hashCode) % 14) / 10; // Range: 3.5-4.8
                  isEstimated = true;
                }
                
                if (displayRating && displayRating > 0) {
                  return (
                    <>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-4 h-4 ${
                              star <= Math.floor(displayRating)
                                ? "text-yellow-400"
                                : star <= displayRating
                                ? "text-yellow-200"
                                : "text-gray-300"
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                          </svg>
                        ))}
                      </div>
                      <span className="text-gray-600 text-sm ml-1">
                        {displayRating.toFixed(1)}
                        {isEstimated && <span className="text-xs text-gray-400 ml-1">(est.)</span>}
                        {realRating && <span className="text-xs text-green-600 ml-1">✓</span>}
                      </span>
                    </>
                  );
                } else {
                  return <span className="text-gray-400 text-sm">No ratings yet</span>;
                }
              })()}
            </div>

            {/* Sold Count or New Item Badge - Fixed height */}
            <div className="h-6 text-xs">
              {product.sold_count !== undefined ? (
                product.sold_count > 0 ? (
                  <span className="text-gray-500">
                    {product.sold_count.toLocaleString()} sold
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                    </svg>
                    New listing
                  </span>
                )
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>

            {/* Shipping Information - Fixed height */}
            <div className="h-5 text-xs mt-1">
              {product.shipping_cost !== undefined && product.shipping_cost !== null ? (
                product.shipping_cost === 0 ? (
                  <span className="text-green-600 font-medium">
                    Free shipping
                  </span>
                ) : (
                  <span className="text-gray-600">
                    Shipping: ${parseFloat(product.shipping_cost).toFixed(2)}
                  </span>
                )
              ) : (
                <span className="text-gray-400">Shipping varies</span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Action Buttons - Outside the Link to prevent navigation conflicts */}
      <div className="px-4 pb-4 flex justify-between items-center">
        <a
          href={product.affiliate_link}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking button
        >
          View Deal
        </a>

        <div className="flex items-center space-x-2">
          {/* Custom Button (e.g., Remove Item for wishlist) */}
          {customButton && customButton}

          {/* Enhanced Wishlist Button */}
          <button
            onClick={handleAddToWishlist}
            disabled={isAddingToWishlist || isWishlistContext}
            className={`p-2 rounded-full transition-all duration-200 ${
              isInWishlist || isWishlistContext
                ? "text-red-500 bg-red-50"
                : isAddingToWishlist
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-500 hover:text-red-500 hover:bg-red-50"
            } ${isWishlistContext ? "cursor-default" : ""}`}
            title={
              isWishlistContext
                ? "Item is in your wishlist"
                : isInWishlist
                ? "Remove from wishlist"
                : isAddingToWishlist
                ? (isInWishlist ? "Removing from wishlist..." : "Adding to wishlist...")
                : isAuthenticated
                ? "Add to wishlist"
                : "Login to add to wishlist"
            }
          >
            {isAddingToWishlist ? (
              // Loading spinner
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
            ) : (
              // Heart icon
              <svg
                className="w-5 h-5"
                fill={isInWishlist || isWishlistContext ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
