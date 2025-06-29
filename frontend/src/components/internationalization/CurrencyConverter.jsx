// Currency converter component
import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

const CurrencyConverter = ({ onCurrencyChange, defaultFromCurrency = 'USD', defaultToCurrency = 'EUR' }) => {
  const [amount, setAmount] = useState(100);
  const [fromCurrency, setFromCurrency] = useState(defaultFromCurrency);
  const [toCurrency, setToCurrency] = useState(defaultToCurrency);
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currencies, setCurrencies] = useState([]);

  // Load supported currencies on component mount
  useEffect(() => {
    loadSupportedCurrencies();
  }, []);

  // Auto-convert when amount or currencies change
  useEffect(() => {
    if (amount > 0 && fromCurrency && toCurrency) {
      convertCurrency();
    }
  }, [amount, fromCurrency, toCurrency]);

  const loadSupportedCurrencies = async () => {
    try {
      const response = await fetch('/api/internationalization/currencies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const currencyData = await response.json();
        setCurrencies(currencyData);
      } else {
        setError('Failed to load currencies');
      }
    } catch (err) {
      console.error('Error loading currencies:', err);
      setError('Failed to load currencies');
    }
  };

  const convertCurrency = async () => {
    if (fromCurrency === toCurrency) {
      setConvertedAmount(amount);
      setExchangeRate(1);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get exchange rate
      const rateResponse = await fetch(
        `/api/internationalization/exchange-rate/${fromCurrency}/${toCurrency}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (rateResponse.ok) {
        const rate = await rateResponse.json();
        setExchangeRate(rate);
        
        // Convert amount
        const convertResponse = await fetch('/api/internationalization/convert-price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            amount: amount,
            from_currency: fromCurrency,
            to_currency: toCurrency
          })
        });

        if (convertResponse.ok) {
          const converted = await convertResponse.json();
          setConvertedAmount(converted);
          
          // Notify parent component of currency change
          if (onCurrencyChange) {
            onCurrencyChange({
              fromCurrency,
              toCurrency,
              rate,
              amount,
              convertedAmount: converted
            });
          }
        } else {
          setError('Conversion failed');
        }
      } else {
        setError('Failed to get exchange rate');
      }
    } catch (err) {
      console.error('Currency conversion error:', err);
      setError('Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
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

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Currency Converter</h3>
        <p className="text-sm text-gray-600">
          Convert prices between different currencies using real-time exchange rates.
        </p>
      </div>

      <div className="space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter amount"
          />
        </div>

        {/* Currency Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* From Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <div className="relative">
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 pr-8 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="w-4 h-4 absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={swapCurrencies}
              className="p-2 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
              title="Swap currencies"
            >
              <ArrowsRightLeftIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* To Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <div className="relative">
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 pr-8 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="w-4 h-4 absolute right-2 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Result Display */}
        <div className="bg-gray-50 rounded-lg p-4">
          {loading ? (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600">Converting...</span>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 text-sm">
              {error}
            </div>
          ) : convertedAmount !== null ? (
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatCurrency(convertedAmount, toCurrency)}
              </div>
              <div className="text-sm text-gray-600">
                {formatCurrency(amount, fromCurrency)} = {formatCurrency(convertedAmount, toCurrency)}
              </div>
              {exchangeRate && (
                <div className="text-xs text-gray-500 mt-1">
                  1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 text-sm">
              Enter an amount to convert
            </div>
          )}
        </div>

        {/* Quick Convert Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {[100, 500, 1000].map(quickAmount => (
            <button
              key={quickAmount}
              onClick={() => setAmount(quickAmount)}
              className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              {quickAmount}
            </button>
          ))}
        </div>

        {/* Exchange Rate Info */}
        {exchangeRate && !loading && (
          <div className="border-t border-gray-200 pt-4">
            <div className="text-xs text-gray-500 space-y-1">
              <div>Exchange rates are updated hourly</div>
              <div>Last updated: {new Date().toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrencyConverter;