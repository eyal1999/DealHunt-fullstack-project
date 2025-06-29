// Individual wishlist card component
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const WishlistCard = ({ wishlist, onDelete, onUpdate }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleShare = async () => {
    try {
      const response = await fetch(`/api/enhanced-wishlist/${wishlist.id}/share/public`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Copy share link to clipboard
        const shareUrl = `${window.location.origin}${data.public_url}`;
        await navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error creating share link:', error);
    }
  };

  const getIconEmoji = (icon) => {
    const icons = {
      heart: '❤️',
      star: '⭐',
      gift: '🎁',
      home: '🏠',
      shopping: '🛍️',
      electronics: '📱',
      fashion: '👗',
      books: '📚',
      sports: '⚽'
    };
    return icons[icon] || '📋';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const productImages = wishlist.products.slice(0, 4).map(p => p.image_url).filter(Boolean);

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
              style={{ backgroundColor: wishlist.color }}
            >
              {getIconEmoji(wishlist.icon)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 truncate">{wishlist.name}</h3>
              <p className="text-sm text-gray-500">{wishlist.products.length} items</p>
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
              </svg>
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button
                    onClick={handleShare}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Share List
                  </button>
                  <button
                    onClick={onDelete}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete List
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {wishlist.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{wishlist.description}</p>
        )}
      </div>

      {/* Product preview */}
      <div className="p-4">
        {productImages.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square bg-gray-100 rounded-md overflow-hidden"
              >
                {productImages[index] ? (
                  <img
                    src={productImages[index]}
                    alt="Product"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.classList.add('bg-gray-200');
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">+</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-sm">No products yet</p>
          </div>
        )}

        {/* Stats */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Value:</span>
            <span className="font-medium">${wishlist.total_value.toFixed(2)}</span>
          </div>
          
          {wishlist.potential_savings > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Potential Savings:</span>
              <span className="font-medium text-green-600">${wishlist.potential_savings.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Last Updated:</span>
            <span className="text-gray-600">{formatDate(wishlist.updated_at)}</span>
          </div>
        </div>

        {/* Tags */}
        {wishlist.tags && wishlist.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {wishlist.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {wishlist.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{wishlist.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Status indicators */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex space-x-2">
            {wishlist.is_shared && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47A3 3 0 1015 8z"/>
                </svg>
                Shared
              </span>
            )}
            
            {wishlist.is_public && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
                Public
              </span>
            )}
          </div>

          <Link
            to={`/wishlist/${wishlist.id}`}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
          >
            View List
          </Link>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default WishlistCard;