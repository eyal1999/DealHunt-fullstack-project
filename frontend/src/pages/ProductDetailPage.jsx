import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const ProductDetailPage = () => {
  const { marketplace, id } = useParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  
  // Mock data for the product detail
  const mockProductDetail = {
    product_id: id,
    title: 'Wireless Earbuds with Noise Cancellation',
    original_price: 59.99,
    sale_price: 39.99,
    main_image: 'https://via.placeholder.com/600x400',
    images: [
      'https://via.placeholder.com/600x400',
      'https://via.placeholder.com/600x400/eee?text=Image+2',
      'https://via.placeholder.com/600x400/f5f5f5?text=Image+3',
      'https://via.placeholder.com/600x400/fafafa?text=Image+4'
    ],
    url: '#',
    affiliate_link: '#',
    marketplace: marketplace,
    sold_count: 1200,
    rating: 4.5,
    shipping_cost: 0,
    description: 'High-quality wireless earbuds with active noise cancellation technology. Features include long battery life, comfortable design, and excellent sound quality. Perfect for workouts, commuting, or everyday use. Available in multiple colors.',
    features: [
      'Active Noise Cancellation',
      'IPX7 Waterproof Rating',
      '8 Hour Battery Life (40 with case)',
      'Bluetooth 5.2',
      'Touch Controls',
      'Wireless Charging Case'
    ],
    specifications: {
      'Brand': 'TechAudio',
      'Model': 'TA-NC100',
      'Color': 'Black',
      'Connectivity': 'Bluetooth 5.2',
      'Battery': '8 hours (40 with case)',
      'Charging': 'USB-C & Wireless',
      'Waterproof Rating': 'IPX7',
      'Weight': '5.6g per earbud'
    }
  };
  
  // Simulate fetching product details
  useEffect(() => {
    const fetchProductDetail = async () => {
      setIsLoading(true);
      
      // In a real app, we would make an API call:
      // try {
      //   const response = await fetch(`/api/search/detail/${marketplace}/${id}`);
      //   const data = await response.json();
      //   setProduct(data);
      // } catch (error) {
      //   console.error('Error fetching product details:', error);
      // }
      
      // Simulate API call with mock data
      setTimeout(() => {
        setProduct(mockProductDetail);
        setIsLoading(false);
      }, 800);
    };
    
    fetchProductDetail();
  }, [marketplace, id]);
  
  // Format price with currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };
  
  // Calculate discount percentage
  const calculateDiscount = (original, sale) => {
    if (original <= 0) return 0;
    return Math.round(((original - sale) / original) * 100);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <p className="text-gray-600 mb-6">
          The product you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/" className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700">
          Back to Home
        </Link>
      </div>
    );
  }
  
  return (
    <div>
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/search" className="hover:text-primary">Search</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{product.title}</span>
      </div>
      
      {/* Product Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Product Images */}
        <div>
          {/* Main Image */}
          <div className="mb-4 border rounded-lg overflow-hidden">
            <img 
              src={product.images[activeImage]} 
              alt={product.title} 
              className="w-full h-auto"
            />
          </div>
          
          {/* Thumbnail Images */}
          <div className="grid grid-cols-5 gap-2">
            {product.images.map((image, index) => (
              <div 
                key={index}
                className={`border rounded cursor-pointer ${index === activeImage ? 'border-primary ring-2 ring-primary-light' : 'border-gray-200'}`}
                onClick={() => setActiveImage(index)}
              >
                <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-auto" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Product Info */}
        <div>
          {/* Title and Marketplace */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{product.title}</h1>
            <div className="flex items-center">
              <span className="text-gray-600 mr-2">From:</span>
              <span className="font-medium capitalize">{product.marketplace}</span>
            </div>
          </div>
          
          {/* Rating and Sold Count */}
          <div className="flex items-center mb-4">
            {product.rating && (
              <div className="flex items-center mr-4">
                <div className="flex text-yellow-400 mr-1">
                  {[...Array(5)].map((_, i) => (
                    <svg 
                      key={i} 
                      className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                    </svg>
                  ))}
                </div>
                <span className="text-gray-700">{product.rating.toFixed(1)}</span>
              </div>
            )}
            
            {product.sold_count && (
              <div className="text-gray-600 text-sm">
                {product.sold_count.toLocaleString()} sold
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
                    {calculateDiscount(product.original_price, product.sale_price)}% OFF
                  </span>
                </>
              )}
            </div>
            
            {/* Shipping Info */}
            <div className="text-gray-600">
              {product.shipping_cost > 0 
                ? `Shipping: ${formatPrice(product.shipping_cost)}` 
                : 'Free Shipping'}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <a 
              href={product.affiliate_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 bg-primary text-white py-3 px-4 rounded text-center font-medium hover:bg-blue-700 transition-colors"
            >
              View Deal
            </a>
            <button className="flex-1 border border-primary text-primary py-3 px-4 rounded text-center font-medium hover:bg-primary hover:text-white transition-colors">
              Add to Wishlist
            </button>
          </div>
          
          {/* Product Description */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-gray-700">{product.description}</p>
          </div>
          
          {/* Product Features */}
          {product.features && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Key Features</h2>
              <ul className="list-disc pl-5 text-gray-700">
                {product.features.map((feature, index) => (
                  <li key={index} className="mb-1">{feature}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Product Specifications */}
          {product.specifications && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Specifications</h2>
              <div className="border rounded-lg overflow-hidden">
                {Object.entries(product.specifications).map(([key, value], index) => (
                  <div 
                    key={key}
                    className={`flex ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                  >
                    <div className="w-1/3 py-2 px-4 font-medium text-gray-700 border-r">
                      {key}
                    </div>
                    <div className="w-2/3 py-2 px-4 text-gray-600">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;