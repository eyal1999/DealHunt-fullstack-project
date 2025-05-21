import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";

  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [sortBy, setSortBy] = useState("price_low");

  // In a real app, these would be fetched from the backend
  const mockProducts = [
    {
      product_id: "1234",
      title: "Wireless Earbuds with Noise Cancellation and Long Battery Life",
      original_price: 59.99,
      sale_price: 39.99,
      image: "https://via.placeholder.com/300",
      detail_url: "/product/aliexpress/1234",
      affiliate_link: "#",
      marketplace: "aliexpress",
      rating: 4.5,
      shipping_cost: 0,
    },
    {
      product_id: "5678",
      title: "Smart Watch with Heart Rate Monitor and Sleep Tracking",
      original_price: 89.99,
      sale_price: 69.99,
      image: "https://via.placeholder.com/300",
      detail_url: "/product/ebay/5678",
      affiliate_link: "#",
      marketplace: "ebay",
      rating: 4.2,
      shipping_cost: 3.99,
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
      shipping_cost: 0,
    },
    {
      product_id: "3456",
      title: "Digital Camera 4K with Wide Angle Lens",
      original_price: 299.99,
      sale_price: 249.99,
      image: "https://via.placeholder.com/300",
      detail_url: "/product/ebay/3456",
      affiliate_link: "#",
      marketplace: "ebay",
      rating: 4.4,
      shipping_cost: 0,
    },
    {
      product_id: "7890",
      title: "Mechanical Gaming Keyboard RGB Backlit",
      original_price: 79.99,
      sale_price: 59.99,
      image: "https://via.placeholder.com/300",
      detail_url: "/product/aliexpress/7890",
      affiliate_link: "#",
      marketplace: "aliexpress",
      rating: 4.6,
      shipping_cost: 5.99,
    },
    {
      product_id: "2345",
      title: "Wireless Mouse for Gaming and Office",
      original_price: 29.99,
      sale_price: 19.99,
      image: "https://via.placeholder.com/300",
      detail_url: "/product/ebay/2345",
      affiliate_link: "#",
      marketplace: "ebay",
      rating: 4.3,
      shipping_cost: 2.99,
    },
  ];

  // Simulate API call to fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);

      // In a real app, we would make an API call like this:
      // try {
      //   const response = await fetch(`/api/search?q=${query}&sort=${sortBy}`);
      //   const data = await response.json();
      //   setProducts(data.results);
      // } catch (error) {
      //   console.error('Error fetching products:', error);
      // }

      // For now, we'll simulate an API call with mock data
      setTimeout(() => {
        let filteredProducts = [...mockProducts];

        // Filter by query (simple case-insensitive match)
        if (query) {
          filteredProducts = filteredProducts.filter((product) =>
            product.title.toLowerCase().includes(query.toLowerCase())
          );
        }

        // Filter by category (if provided)
        if (category) {
          // This is a simplification - in a real app, products would have category info
          if (category === "Electronics") {
            filteredProducts = filteredProducts.filter((product) =>
              [
                "camera",
                "speaker",
                "keyboard",
                "mouse",
                "earbuds",
                "watch",
              ].some((keyword) => product.title.toLowerCase().includes(keyword))
            );
          }
        }

        // Sort products
        if (sortBy === "price_low") {
          filteredProducts.sort((a, b) => a.sale_price - b.sale_price);
        } else if (sortBy === "price_high") {
          filteredProducts.sort((a, b) => b.sale_price - a.sale_price);
        }

        setProducts(filteredProducts);
        setIsLoading(false);
      }, 800); // Simulate a 800ms API delay
    };

    fetchProducts();
  }, [query, category, sortBy]);

  // Handle sorting change
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  return (
    <div>
      {/* Search Results Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {query
            ? `Search results for "${query}"`
            : category
            ? `Browsing ${category}`
            : "All Products"}
        </h1>
        <p className="text-gray-600">
          {isLoading ? "Searching..." : `Found ${products.length} products`}
        </p>
      </div>

      {/* Search Results Layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Sidebar */}
        <div className="w-full md:w-1/4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Filters</h2>
              <button className="text-primary text-sm hover:underline">
                Reset all filters
              </button>
            </div>

            {/* Price Range Filter */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Price Range</h3>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label
                    htmlFor="min-price"
                    className="block text-sm text-gray-600 mb-1"
                  >
                    Min
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      id="min-price"
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="max-price"
                    className="block text-sm text-gray-600 mb-1"
                  >
                    Max
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      id="max-price"
                      placeholder="Any"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Marketplace Filter */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Marketplace</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={true}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">AliExpress</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={true}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">eBay</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm">Amazon (Coming Soon)</span>
                </label>
              </div>
            </div>

            {/* Apply Filters Button */}
            <button className="w-full bg-primary text-white py-2 rounded hover:bg-blue-700">
              Apply Filters
            </button>
          </div>
        </div>

        {/* Product Results */}
        <div className="w-full md:w-3/4">
          {/* Sort Controls */}
          <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              {isLoading ? "Loading..." : `Showing ${products.length} results`}
            </div>
            <div className="flex items-center">
              <span className="text-sm mr-2">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="text-sm border-gray-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-xl font-medium mb-4">No products found</p>
              <p className="text-gray-600 mb-6">
                Try adjusting your search or filter criteria
              </p>
              <button
                onClick={() => window.history.back()}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
