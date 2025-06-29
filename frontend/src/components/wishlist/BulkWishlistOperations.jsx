// Bulk wishlist operations component
import React, { useState, useEffect } from 'react';

const BulkWishlistOperations = ({ 
  wishlistId, 
  selectedProducts = [], 
  onSelectionChange, 
  onOperationComplete 
}) => {
  const [wishlists, setWishlists] = useState([]);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [operation, setOperation] = useState(null);
  const [targetWishlistId, setTargetWishlistId] = useState('');
  const [bulkSettings, setBulkSettings] = useState({
    priority: 'medium',
    price_alerts_enabled: true,
    tags: []
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWishlists();
  }, []);

  const fetchWishlists = async () => {
    try {
      const response = await fetch('/api/enhanced-wishlist/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWishlists(data.filter(w => w.id !== wishlistId)); // Exclude current wishlist
      }
    } catch (error) {
      console.error('Error fetching wishlists:', error);
    }
  };

  const performBulkOperation = async (operationType) => {
    if (selectedProducts.length === 0) {
      alert('Please select products first');
      return;
    }

    setProcessing(true);

    try {
      let response;
      const productIds = selectedProducts.map(p => p.product_id);

      switch (operationType) {
        case 'remove':
          response = await fetch(`/api/enhanced-wishlist/${wishlistId}/bulk/remove`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              product_ids: productIds
            })
          });
          break;

        case 'move':
          if (!targetWishlistId) {
            alert('Please select a target wishlist');
            return;
          }
          response = await fetch(`/api/enhanced-wishlist/${wishlistId}/bulk/move`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              target_wishlist_id: targetWishlistId,
              product_ids: productIds
            })
          });
          break;

        case 'copy':
          if (!targetWishlistId) {
            alert('Please select a target wishlist');
            return;
          }
          response = await fetch(`/api/enhanced-wishlist/${wishlistId}/bulk/copy`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              target_wishlist_id: targetWishlistId,
              product_ids: productIds
            })
          });
          break;

        case 'update':
          response = await fetch(`/api/enhanced-wishlist/${wishlistId}/bulk/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              product_ids: productIds,
              updates: bulkSettings
            })
          });
          break;

        default:
          throw new Error('Unknown operation type');
      }

      if (response.ok) {
        const result = await response.json();
        alert(result.message || 'Operation completed successfully');
        
        // Clear selection and close menu
        onSelectionChange([]);
        setShowBulkMenu(false);
        setOperation(null);
        setTargetWishlistId('');
        
        // Notify parent component
        if (onOperationComplete) {
          onOperationComplete(operationType, result);
        }
      } else {
        const error = await response.json();
        alert(error.detail || 'Operation failed');
      }
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      alert('Operation failed');
    } finally {
      setProcessing(false);
    }
  };

  const renderOperationForm = () => {
    switch (operation) {
      case 'move':
      case 'copy':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Wishlist
              </label>
              <select
                value={targetWishlistId}
                onChange={(e) => setTargetWishlistId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              >
                <option value="">Select a wishlist...</option>
                {wishlists.map((wishlist) => (
                  <option key={wishlist.id} value={wishlist.id}>
                    {wishlist.name} ({wishlist.products?.length || 0} products)
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setOperation(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => performBulkOperation(operation)}
                disabled={!targetWishlistId || processing}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : `${operation === 'move' ? 'Move' : 'Copy'} Products`}
              </button>
            </div>
          </div>
        );

      case 'update':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={bulkSettings.priority}
                onChange={(e) => setBulkSettings(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={bulkSettings.price_alerts_enabled}
                  onChange={(e) => setBulkSettings(prev => ({ ...prev, price_alerts_enabled: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Enable price alerts</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={bulkSettings.tags.join(', ')}
                onChange={(e) => setBulkSettings(prev => ({ 
                  ...prev, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                }))}
                placeholder="sale, favorite, gift"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setOperation(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => performBulkOperation(operation)}
                disabled={processing}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Update Products'}
              </button>
            </div>
          </div>
        );

      case 'remove':
        return (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-red-800 text-sm">
                Are you sure you want to remove {selectedProducts.length} selected product{selectedProducts.length !== 1 ? 's' : ''} from this wishlist?
              </p>
              <p className="text-red-600 text-xs mt-1">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setOperation(null)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => performBulkOperation(operation)}
                disabled={processing}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Remove Products'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (selectedProducts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {selectedProducts.length} selected
          </div>
          
          {!showBulkMenu && (
            <button
              onClick={() => setShowBulkMenu(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Bulk Actions
            </button>
          )}
        </div>

        <button
          onClick={() => onSelectionChange([])}
          className="text-gray-400 hover:text-gray-600"
          title="Clear selection"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {showBulkMenu && !operation && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={() => setOperation('move')}
            className="flex items-center justify-center space-x-2 p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span className="text-sm">Move</span>
          </button>

          <button
            onClick={() => setOperation('copy')}
            className="flex items-center justify-center space-x-2 p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">Copy</span>
          </button>

          <button
            onClick={() => setOperation('update')}
            className="flex items-center justify-center space-x-2 p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-sm">Update</span>
          </button>

          <button
            onClick={() => setOperation('remove')}
            className="flex items-center justify-center space-x-2 p-3 border border-red-200 rounded hover:bg-red-50 transition-colors text-red-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-sm">Remove</span>
          </button>
        </div>
      )}

      {operation && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h4 className="font-medium text-gray-900 mb-3">
            {operation === 'move' && 'Move Products'}
            {operation === 'copy' && 'Copy Products'}
            {operation === 'update' && 'Update Product Settings'}
            {operation === 'remove' && 'Remove Products'}
          </h4>
          {renderOperationForm()}
        </div>
      )}
    </div>
  );
};

export default BulkWishlistOperations;