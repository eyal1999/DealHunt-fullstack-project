// Enhanced wishlist management component
import React, { useState, useEffect } from 'react';
import WishlistCard from './WishlistCard';
import CreateWishlistModal from './CreateWishlistModal';
import WishlistAnalytics from './WishlistAnalytics';

const WishlistManager = () => {
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchWishlists();
  }, []);

  const fetchWishlists = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/enhanced-wishlist/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setWishlists(data);
    } catch (error) {
      console.error('Error fetching wishlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWishlist = async (wishlistData) => {
    try {
      const response = await fetch('/api/enhanced-wishlist/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(wishlistData)
      });

      if (response.ok) {
        const newWishlist = await response.json();
        setWishlists(prev => [newWishlist, ...prev]);
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating wishlist:', error);
    }
  };

  const handleDeleteWishlist = async (wishlistId) => {
    if (!confirm('Are you sure you want to delete this wishlist?')) return;

    try {
      const response = await fetch(`/api/enhanced-wishlist/${wishlistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setWishlists(prev => prev.filter(w => w.id !== wishlistId));
      }
    } catch (error) {
      console.error('Error deleting wishlist:', error);
    }
  };

  const categories = ['all', 'general', 'electronics', 'fashion', 'home', 'books', 'sports'];
  const filteredWishlists = selectedCategory === 'all' 
    ? wishlists 
    : wishlists.filter(w => w.category === selectedCategory);

  const stats = {
    totalLists: wishlists.length,
    totalProducts: wishlists.reduce((sum, w) => sum + w.products.length, 0),
    totalValue: wishlists.reduce((sum, w) => sum + w.total_value, 0),
    potentialSavings: wishlists.reduce((sum, w) => sum + w.potential_savings, 0)
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header with stats */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Wishlists</h1>
            <p className="text-gray-600 mt-1">Organize and track your favorite products</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAnalytics(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              View Analytics
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create New List
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalLists}</div>
            <div className="text-sm text-gray-500">Wishlists</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.totalProducts}</div>
            <div className="text-sm text-gray-500">Products</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">${stats.totalValue.toFixed(2)}</div>
            <div className="text-sm text-gray-500">Total Value</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">${stats.potentialSavings.toFixed(2)}</div>
            <div className="text-sm text-gray-500">Potential Savings</div>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Wishlists grid */}
      {filteredWishlists.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {selectedCategory === 'all' ? 'No wishlists yet' : `No ${selectedCategory} wishlists`}
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first wishlist to start organizing your favorite products
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create Your First Wishlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWishlists.map(wishlist => (
            <WishlistCard
              key={wishlist.id}
              wishlist={wishlist}
              onDelete={() => handleDeleteWishlist(wishlist.id)}
              onUpdate={fetchWishlists}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateWishlistModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateWishlist}
        />
      )}

      {showAnalytics && (
        <WishlistAnalytics
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
};

export default WishlistManager;