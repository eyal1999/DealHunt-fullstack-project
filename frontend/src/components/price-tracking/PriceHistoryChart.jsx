// Price history chart component
import React, { useState, useEffect } from 'react';

const PriceHistoryChart = ({ productId, marketplace }) => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // days

  useEffect(() => {
    fetchPriceHistory();
  }, [productId, marketplace, timeRange]);

  const fetchPriceHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/price-tracking/history/${marketplace}/${productId}?days=${timeRange}`
      );
      const data = await response.json();
      setPriceHistory(data);
    } catch (error) {
      console.error('Error fetching price history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMinMaxPrices = () => {
    if (!priceHistory.length) return { min: 0, max: 100 };
    const prices = priceHistory.map(h => h.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };

  const { min, max } = getMinMaxPrices();
  const priceRange = max - min;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!priceHistory.length) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No price history available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Price History</h3>
        <div className="flex space-x-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-3 py-1 rounded text-sm ${
                timeRange === days
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-48 mb-4">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y * 2}
              x2="400"
              y2={y * 2}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}

          {/* Price line */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={priceHistory
              .map((point, index) => {
                const x = (index / (priceHistory.length - 1)) * 400;
                const y = 200 - ((point.price - min) / priceRange) * 200;
                return `${x},${y}`;
              })
              .join(' ')}
          />

          {/* Data points */}
          {priceHistory.map((point, index) => {
            const x = (index / (priceHistory.length - 1)) * 400;
            const y = 200 - ((point.price - min) / priceRange) * 200;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="#3b82f6"
                className="cursor-pointer"
                title={`${formatDate(point.timestamp)}: ${formatPrice(point.price)}`}
              />
            );
          })}
        </svg>
      </div>

      {/* Price stats */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <p className="text-gray-500">Current</p>
          <p className="font-semibold text-lg">
            {formatPrice(priceHistory[priceHistory.length - 1]?.price || 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-500">Lowest</p>
          <p className="font-semibold text-lg text-green-600">
            {formatPrice(min)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-500">Highest</p>
          <p className="font-semibold text-lg text-red-600">
            {formatPrice(max)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PriceHistoryChart;