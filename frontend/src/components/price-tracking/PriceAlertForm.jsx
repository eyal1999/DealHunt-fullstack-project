// Price alert creation form
import React, { useState } from 'react';

const PriceAlertForm = ({ productId, marketplace, currentPrice, onAlertCreated, onClose }) => {
  const [alertType, setAlertType] = useState('target_price');
  const [targetPrice, setTargetPrice] = useState('');
  const [percentageThreshold, setPercentageThreshold] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const alertData = {
        product_id: productId,
        marketplace: marketplace,
        alert_type: alertType,
      };

      if (alertType === 'target_price') {
        if (!targetPrice || parseFloat(targetPrice) <= 0) {
          throw new Error('Please enter a valid target price');
        }
        alertData.target_price = parseFloat(targetPrice);
      } else if (alertType === 'percentage_drop') {
        alertData.percentage_threshold = parseFloat(percentageThreshold) / 100;
      }

      const response = await fetch('/api/price-tracking/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(alertData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create alert');
      }

      const newAlert = await response.json();
      onAlertCreated && onAlertCreated(newAlert);
      onClose && onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const suggestedPrices = [
    Math.round(currentPrice * 0.9 * 100) / 100,  // 10% off
    Math.round(currentPrice * 0.8 * 100) / 100,  // 20% off
    Math.round(currentPrice * 0.7 * 100) / 100,  // 30% off
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Create Price Alert</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert Type
            </label>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="target_price">Target Price</option>
              <option value="percentage_drop">Percentage Drop</option>
              <option value="availability">Back in Stock</option>
            </select>
          </div>

          {alertType === 'target_price' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Price (Current: ${currentPrice})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Enter target price"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              
              {/* Quick price suggestions */}
              <div className="mt-2 flex space-x-2">
                <span className="text-sm text-gray-500">Quick select:</span>
                {suggestedPrices.map((price) => (
                  <button
                    key={price}
                    type="button"
                    onClick={() => setTargetPrice(price.toString())}
                    className="text-sm bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                  >
                    ${price}
                  </button>
                ))}
              </div>
            </div>
          )}

          {alertType === 'percentage_drop' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Drop Percentage
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={percentageThreshold}
                  onChange={(e) => setPercentageThreshold(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="absolute right-3 top-2 text-gray-500">%</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Alert when price drops by at least {percentageThreshold}%
              </p>
            </div>
          )}

          {alertType === 'availability' && (
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                You'll be notified when this product becomes available again.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PriceAlertForm;