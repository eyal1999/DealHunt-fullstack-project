// Multi-currency price display component
import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const MultiCurrencyPrice = ({ 
  price, 
  originalCurrency = 'USD', 
  showCurrencies = ['EUR', 'GBP', 'CAD', 'AUD'],
  compact = false,
  userCurrency = null
}) => {
  const [convertedPrices, setConvertedPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(!compact);
  const [selectedCurrencies, setSelectedCurrencies] = useState(showCurrencies);

  useEffect(() => {
    if (price && originalCurrency && selectedCurrencies.length > 0) {
      convertPrices();
    }
  }, [price, originalCurrency, selectedCurrencies]);

  const convertPrices = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/internationalization/localized-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: price,
          original_currency: originalCurrency,
          target_currencies: selectedCurrencies
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConvertedPrices(data.converted_prices);
      } else {
        setError('Failed to convert prices');
      }
    } catch (err) {
      console.error('Price conversion error:', err);
      setError('Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (e) {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  const toggleCurrency = (currency) => {
    setSelectedCurrencies(prev => 
      prev.includes(currency)
        ? prev.filter(c => c !== currency)
        : [...prev, currency]
    );
  };

  // Compact view for product cards
  if (compact && !expanded) {
    const primaryConvertedCurrency = userCurrency && convertedPrices[userCurrency] 
      ? userCurrency 
      : Object.keys(convertedPrices)[0];

    return (
      <div className="text-sm">
        <div className="font-semibold text-gray-900">
          {formatCurrency(price, originalCurrency)}
        </div>
        {primaryConvertedCurrency && convertedPrices[primaryConvertedCurrency] && (
          <div className="text-gray-600 text-xs">
            ≈ {formatCurrency(convertedPrices[primaryConvertedCurrency], primaryConvertedCurrency)}
          </div>
        )}
        <button
          onClick={() => setExpanded(true)}
          className="text-blue-500 hover:text-blue-600 text-xs flex items-center space-x-1 mt-1"
        >
          <span>More currencies</span>
          <ChevronDownIcon className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Original Price */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-gray-900">
          {formatCurrency(price, originalCurrency)}
        </span>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          Original
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Converting...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Converted Prices */}
      {!loading && !error && Object.keys(convertedPrices).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Converted Prices
            </span>
            {compact && (
              <button
                onClick={() => setExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <EyeSlashIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {Object.entries(convertedPrices).map(([currency, amount]) => (
              <div key={currency} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-700">
                  {currency}
                </span>
                <span className="text-sm text-gray-900">
                  {formatCurrency(amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Currency Selection */}
      {!compact && (
        <div className="border-t border-gray-200 pt-3">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Show Currencies
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL'].map(currency => (
              <label key={currency} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedCurrencies.includes(currency)}
                  onChange={() => toggleCurrency(currency)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 text-sm"
                />
                <span className="text-sm text-gray-700">{currency}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
        <div className="flex items-start space-x-1">
          <span>ℹ️</span>
          <div>
            <div>Exchange rates are approximate and update hourly.</div>
            <div>Final prices may vary at checkout due to payment processor rates.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simplified version for inline use
export const InlineMultiCurrencyPrice = ({ price, originalCurrency, targetCurrency, className = "" }) => {
  const [convertedPrice, setConvertedPrice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (price && originalCurrency && targetCurrency && originalCurrency !== targetCurrency) {
      convertPrice();
    }
  }, [price, originalCurrency, targetCurrency]);

  const convertPrice = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/internationalization/convert-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: price,
          from_currency: originalCurrency,
          to_currency: targetCurrency
        })
      });

      if (response.ok) {
        const converted = await response.json();
        setConvertedPrice(converted);
      }
    } catch (err) {
      console.error('Inline price conversion error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (e) {
      return `${amount.toFixed(2)} ${currency}`;
    }
  };

  if (originalCurrency === targetCurrency) {
    return (
      <span className={className}>
        {formatCurrency(price, originalCurrency)}
      </span>
    );
  }

  return (
    <span className={className}>
      {formatCurrency(price, originalCurrency)}
      {loading ? (
        <span className="text-gray-500 ml-2">...</span>
      ) : convertedPrice !== null ? (
        <span className="text-gray-600 ml-2">
          (≈ {formatCurrency(convertedPrice, targetCurrency)})
        </span>
      ) : null}
    </span>
  );
};

export default MultiCurrencyPrice;