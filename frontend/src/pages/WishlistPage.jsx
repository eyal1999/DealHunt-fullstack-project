import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";

const WishlistPage = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock wishlist data for demonstration
  const mockWishlistItems = [
    {
      product_id: "1234",
      title: "Wireless Earbuds with Noise Cancellation",
      original_price: 59.99,
      sale_price: 39.99,
      image: "https://via.placeholder.com/300",
      detail_url: "/product/aliexpress/1234",
      affiliate_link: "#",
      marketplace: "aliexpress",
      rating: 4.5,
      added_at: "2025-04-15T14:30:00Z",
    },
    {
      product_id: "5678",
      title: "Smart Watch with Heart Rate Monitor",
      original_price: 89.99,
      sale_price: 69.99,
      image: "https://via.placeholder.com/300",
      detail_url: "/product/ebay/5678",
      affiliate_link: "#",
      marketplace: "ebay",
      rating: 4.2,
      added_at: "2025-04-20T10:15:00Z",
    },
    {
      product_id: "9012",
      title: "Portable Bluetooth Speaker Waterproof",
      original_price: 45.99,
      sale_price: 29.99,
      image: "https://via.placeholder.com/300",
      detail_url: "/product/aliexpress/9012",
      affiliate_link: "#",
      marketplace: "aliexpress",
      rating: 4.7,
      added_at: "2025-05-01T08:20:00Z",
    },
  ];

  // Simulate fetching wishlist items
  useEffect(() => {
    const fetchWishlist = async () => {
      setIsLoading(true);

      // In a real app, fetch from your API
      // try {
      //   const response = await fetch('/api/wishlist');
      //   const data = await response.json();
      //   setWishlistItems(data);
      // } catch (error) {
      //   console.error('Error fetching wishlist:', error);
      // }

      // Simulate API call
      setTimeout(() => {
        setWishlistItems(mockWishlistItems);
        setIsLoading(false);
      }, 800);
    };

    fetchWishlist();
  }, []);

  // Handle removing item from wishlist
  const handleRemoveItem = async (productId) => {
    // In a real app, call API to remove item
    // try {
    //   await fetch(`/api/wishlist/${productId}`, { method: 'DELETE' });
    //   setWishlistItems(wishlistItems.filter(item => item.product_id !== productId));
    // } catch (error) {
    //   console.error('Error removing item from wishlist:', error);
    // }

    // Simulate removal
    setWishlistItems(
      wishlistItems.filter((item) => item.product_id !== productId)
    );
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : wishlistItems.length > 0 ? (
        <div>
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <p className="text-gray-600">
              {wishlistItems.length}{" "}
              {wishlistItems.length === 1 ? "item" : "items"} saved to your
              wishlist
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => (
              <div key={item.product_id} className="relative">
                <ProductCard product={item} />

                {/* Remove button overlay */}
                <button
                  onClick={() => handleRemoveItem(item.product_id)}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                  title="Remove from wishlist"
                >
                  <svg
                    className="w-5 h-5 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* Added date */}
                <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 text-xs py-1 px-2 text-gray-500">
                  Added on {formatDate(item.added_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
          <p className="text-gray-600 mb-6">
            Save items you're interested in by clicking the heart icon on any
            product.
          </p>
          <Link
            to="/"
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
