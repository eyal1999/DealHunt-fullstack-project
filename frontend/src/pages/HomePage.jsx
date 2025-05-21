import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import BlutoothSpeaker from "../assets/bluetooth_speaker.jpg";
import Smartwatch from "../assets/smartwatch.jpg";
import WirelessEarbuds from "../assets/wireless_earbuds.jpg";

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // Sample featured products data
  const featuredProducts = [
    {
      product_id: "1234",
      title: "Wireless Earbuds with Noise Cancellation and Long Battery Life",
      original_price: 59.99,
      sale_price: 39.99,
      image: WirelessEarbuds,
      detail_url: "/product/aliexpress/1234",
      affiliate_link: "#",
      marketplace: "aliexpress",
      rating: 4.5,
    },
    {
      product_id: "5678",
      title: "Smart Watch with Heart Rate Monitor and Sleep Tracking",
      original_price: 89.99,
      sale_price: 69.99,
      image: Smartwatch,
      detail_url: "/product/ebay/5678",
      affiliate_link: "#",
      marketplace: "ebay",
      rating: 4.2,
    },
    {
      product_id: "9012",
      title: "Portable Bluetooth Speaker Waterproof",
      original_price: 45.99,
      sale_price: 29.99,
      image: BlutoothSpeaker,
      detail_url: "/product/aliexpress/9012",
      affiliate_link: "#",
      marketplace: "aliexpress",
      rating: 4.7,
    },
  ];

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-blue-700 text-white py-16 px-4 rounded-lg mb-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">
            Find the Best Deals Across the Web
          </h1>
          <p className="text-xl mb-8">
            Compare prices from AliExpress, eBay, and more in one place.
          </p>

          {/* Main Search Box */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for products..."
                className="w-full p-4 pr-12 text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-secondary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-secondary text-white p-2.5 rounded-full hover:bg-yellow-500"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Popular Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["Electronics", "Home & Garden", "Fashion", "Toys & Games"].map(
            (category, index) => (
              <div
                key={index}
                className="bg-gray-100 p-4 rounded-lg text-center hover:bg-gray-200 cursor-pointer transition-colors"
                onClick={() => navigate(`/search?category=${category}`)}
              >
                <p className="font-medium">{category}</p>
              </div>
            )
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Featured Deals</h2>
          <button
            onClick={() => navigate("/search")}
            className="text-primary hover:underline"
          >
            View All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.product_id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
