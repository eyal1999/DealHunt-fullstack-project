import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const CategoriesPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('all');
  const [filteredCategories, setFilteredCategories] = useState([]);

  // Comprehensive categories data with subcategories
  const categoriesData = [
    {
      id: 'electronics',
      name: 'Electronics',
      icon: '📱',
      subcategories: [
        { id: 'smartphones', name: 'Smartphones' },
        { id: 'laptops', name: 'Laptops' },
        { id: 'tablets', name: 'Tablets' },
        { id: 'headphones', name: 'Headphones' }
      ]
    },
    {
      id: 'fashion',
      name: 'Fashion',
      icon: '👗',
      subcategories: [
        { id: 'womens-clothing', name: "Women's Clothing" },
        { id: 'mens-clothing', name: "Men's Clothing" },
        { id: 'shoes', name: 'Shoes' },
        { id: 'accessories', name: 'Accessories' }
      ]
    },
    {
      id: 'home-garden',
      name: 'Home & Garden',
      icon: '🏠',
      subcategories: [
        { id: 'furniture', name: 'Furniture' },
        { id: 'kitchen', name: 'Kitchen & Dining' },
        { id: 'garden', name: 'Garden & Outdoor' },
        { id: 'home-decor', name: 'Home Decor' }
      ]
    },
    {
      id: 'toys-games',
      name: 'Toys & Games',
      icon: '🎮',
      subcategories: [
        { id: 'video-games', name: 'Video Games' },
        { id: 'board-games', name: 'Board Games' },
        { id: 'action-figures', name: 'Action Figures' },
        { id: 'educational-toys', name: 'Educational Toys' }
      ]
    },
    {
      id: 'sports-outdoors',
      name: 'Sports & Outdoors',
      icon: '⚽',
      subcategories: [
        { id: 'fitness', name: 'Fitness Equipment' },
        { id: 'outdoor-recreation', name: 'Outdoor Recreation' },
        { id: 'team-sports', name: 'Team Sports' },
        { id: 'water-sports', name: 'Water Sports' }
      ]
    },
    {
      id: 'automotive',
      name: 'Automotive',
      icon: '🚗',
      subcategories: [
        { id: 'car-accessories', name: 'Car Accessories' },
        { id: 'tools', name: 'Tools & Equipment' },
        { id: 'replacement-parts', name: 'Replacement Parts' },
        { id: 'motorcycle', name: 'Motorcycle & ATV' }
      ]
    },
    {
      id: 'beauty-health',
      name: 'Beauty & Health',
      icon: '💄',
      subcategories: [
        { id: 'skincare', name: 'Skincare' },
        { id: 'makeup', name: 'Makeup' },
        { id: 'hair-care', name: 'Hair Care' },
        { id: 'health-wellness', name: 'Health & Wellness' }
      ]
    },
    {
      id: 'books-media',
      name: 'Books & Media',
      icon: '📚',
      subcategories: [
        { id: 'books', name: 'Books' },
        { id: 'movies', name: 'Movies & TV' },
        { id: 'music', name: 'Music' },
        { id: 'magazines', name: 'Magazines' }
      ]
    },
    {
      id: 'baby-kids',
      name: 'Baby & Kids',
      icon: '👶',
      subcategories: [
        { id: 'baby-gear', name: 'Baby Gear' },
        { id: 'kids-clothing', name: "Kids' Clothing" },
        { id: 'nursery', name: 'Nursery' },
        { id: 'baby-toys', name: 'Baby Toys' }
      ]
    },
    {
      id: 'crafts-hobbies',
      name: 'Crafts & Hobbies',
      icon: '🎨',
      subcategories: [
        { id: 'art-supplies', name: 'Art Supplies' },
        { id: 'sewing-crafts', name: 'Sewing & Crafts' },
        { id: 'collectibles', name: 'Collectibles' },
        { id: 'musical-instruments', name: 'Musical Instruments' }
      ]
    }
  ];

  // Alphabet filter
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Filter categories based on search and letter
  useEffect(() => {
    let filtered = categoriesData;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.subcategories.some(sub =>
          sub.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Filter by letter
    if (selectedLetter !== 'all') {
      filtered = filtered.filter(category =>
        category.name.charAt(0).toUpperCase() === selectedLetter
      );
    }

    setFilteredCategories(filtered);
  }, [searchTerm, selectedLetter]);

  const handleCategoryClick = (categoryId) => {
    navigate(`/search?category=${categoryId}`);
  };

  const handleSubcategoryClick = (categoryId, subcategoryId) => {
    navigate(`/search?category=${categoryId}&subcategory=${subcategoryId}`);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <ChevronRightIcon className="h-4 w-4" />
            <span className="text-gray-900 font-medium">Categories</span>
          </nav>

          {/* Page Title and Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-3xl font-bold text-gray-900">All Categories</h1>
            
            {/* Search Bar */}
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Alphabetical Filter */}
        <div className="mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Browse A-Z</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedLetter('all')}
                className={`px-3 py-2 text-sm rounded transition-colors ${
                  selectedLetter === 'all'
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                All
              </button>
              {alphabet.map((letter) => (
                <button
                  key={letter}
                  onClick={() => setSelectedLetter(letter)}
                  className={`px-3 py-2 text-sm rounded transition-colors ${
                    selectedLetter === letter
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div>
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                  {/* Category Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        </div>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  {/* Subcategories */}
                  <div className="border-t border-gray-100 p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Popular Subcategories:</h4>
                    <div className="space-y-1">
                      {category.subcategories.slice(0, 4).map((subcategory) => (
                        <button
                          key={subcategory.id}
                          onClick={() => handleSubcategoryClick(category.id, subcategory.id)}
                          className="w-full text-left px-2 py-1 rounded text-sm hover:bg-gray-100 transition-colors text-gray-700"
                        >
                          {subcategory.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriesPage;