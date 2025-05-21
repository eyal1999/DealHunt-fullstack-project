// frontend\src\components\product\ProductCard.jsx
import React from "react";
import { Link } from "react-router-dom";

const ProductCard = ({ product }) => {
  // Calculate discount percentage
  const discountPercentage =
    product.original_price > 0
      ? Math.round(
          ((product.original_price - product.sale_price) /
            product.original_price) *
            100
        )
      : 0;

  // Format price with currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Get marketplace icon
  const getMarketplaceIcon = (marketplace) => {
    switch (marketplace.toLowerCase()) {
      case "aliexpress":
        return "🌐"; // Placeholder icons - in a real app you might use proper icons
      case "ebay":
        return "📦";
      case "amazon":
        return "📱";
      default:
        return "🛒";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Product Image */}
      <Link to={`/product/${product.marketplace}/${product.product_id}`}>
        <div className="relative h-48 overflow-hidden">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
          />
          {discountPercentage > 0 && (
            <div className="absolute top-2 right-2 bg-secondary text-white text-xs font-bold px-2 py-1 rounded">
              {discountPercentage}% OFF
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 text-xs font-semibold px-2 py-1 rounded">
            {getMarketplaceIcon(product.marketplace)}{" "}
            {product.marketplace.charAt(0).toUpperCase() +
              product.marketplace.slice(1)}
          </div>
        </div>
      </Link>

      {/* Product Details */}
      <div className="p-4">
        <Link to={`/product/${product.marketplace}/${product.product_id}`}>
          <h3
            className="font-semibold text-gray-800 mb-2 hover:text-primary truncate"
            title={product.title}
          >
            {product.title}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center mb-2">
          <span className="text-lg font-bold text-primary mr-2">
            {formatPrice(product.sale_price)}
          </span>
          {product.original_price > product.sale_price && (
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center">
            <div className="flex text-yellow-400 mr-1">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${
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
            <span className="text-gray-600 text-sm">
              {product.rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex justify-between">
          <a
            href={product.affiliate_link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
          >
            View Deal
          </a>
          <button className="text-gray-500 hover:text-secondary transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
