import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { wishlistService } from "../../api/apiServices";
import { getImageUrl, getFallbackImageUrl } from "../../utils/simpleImageProxy";

const ProductCard = ({ product }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Local state for wishlist operations
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);

  // Handle adding product to wishlist
  const handleAddToWishlist = useCallback(
    async (e) => {
      e.preventDefault(); // Prevent navigation when clicking heart button
      e.stopPropagation(); // Prevent event bubbling

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

        await wishlistService.addToWishlist(wishlistData);

        setIsInWishlist(true);

        // Could show a toast notification here
        console.log(`"${product.title}" added to wishlist!`);
      } catch (error) {
        console.error("Error adding to wishlist:", error);

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
    [isAuthenticated, product, isAddingToWishlist, navigate]
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:-translate-y-1">
      {/* Product Link - Wraps the clickable area */}
      <Link
        to={`/product/${product.marketplace}/${product.product_id}`}
        className="block"
      >
        {/* Product Image */}
        <div className="relative h-48 overflow-hidden bg-white">
          <img
            src={getImageUrl(product.image)}
            alt={product.title}
            className="w-full h-full object-scale-down transform transition-transform duration-300 hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.target.src = getFallbackImageUrl();
            }}
          />

          {/* Marketplace badge */}
          <span className="absolute top-2 left-2 bg-gray-800 text-white px-2 py-1 rounded text-xs font-medium capitalize">
            {product.marketplace}
          </span>

          {/* Discount badge */}
          {discount > 0 && (
            <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
              -{discount}%
            </span>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 hover:text-primary transition-colors">
            {product.title}
          </h3>

          {/* Price */}
          <div className="flex items-center justify-between mb-3">
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

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center mb-3">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.floor(product.rating)
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
              <span className="text-gray-600 text-sm ml-1">
                {product.rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Sold Count */}
          {product.sold_count && product.sold_count > 0 && (
            <div className="text-gray-500 text-xs mb-2">
              {product.sold_count.toLocaleString()} sold
            </div>
          )}
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

        {/* Enhanced Wishlist Button */}
        <button
          onClick={handleAddToWishlist}
          disabled={isAddingToWishlist || isInWishlist}
          className={`p-2 rounded-full transition-all duration-200 ${
            isInWishlist
              ? "text-red-500 bg-red-50"
              : isAddingToWishlist
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-500 hover:text-red-500 hover:bg-red-50"
          }`}
          title={
            isInWishlist
              ? "Already in wishlist"
              : isAddingToWishlist
              ? "Adding to wishlist..."
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
              fill={isInWishlist ? "currentColor" : "none"}
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
  );
};

export default ProductCard;
