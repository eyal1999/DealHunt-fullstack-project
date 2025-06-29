// User locale preferences settings component
import React, { useState, useEffect } from 'react';
import { GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline';

const LocaleSettings = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState({
    country: 'US',
    language: 'en',
    currency: 'USD',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
    time_format: '12h',
    number_format: 'en-US',
    auto_detect: true,
    measurement_system: 'imperial',
    first_day_of_week: 0,
    preferred_marketplaces: [],
    exclude_international_shipping: false,
    max_shipping_cost: null
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [supportedLocales, setSupportedLocales] = useState({
    currencies: [],
    languages: [],
    countries: []
  });
  const [detectedLocale, setDetectedLocale] = useState(null);

  useEffect(() => {
    loadSupportedLocales();
    loadUserSettings();
    detectUserLocale();
  }, []);

  const loadSupportedLocales = async () => {
    try {
      const response = await fetch('/api/internationalization/supported-locales');
      if (response.ok) {
        const locales = await response.json();
        setSupportedLocales(locales);
      }
    } catch (error) {
      console.error('Failed to load supported locales:', error);
    }
  };

  const loadUserSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/internationalization/user-locale', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const userLocale = await response.json();
        if (userLocale) {
          setSettings(prevSettings => ({
            ...prevSettings,
            ...userLocale
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
      setMessage({ type: 'error', text: 'Failed to load locale settings' });
    } finally {
      setLoading(false);
    }
  };

  const detectUserLocale = async () => {
    try {
      const response = await fetch('/api/internationalization/detect-locale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const detected = await response.json();
        setDetectedLocale(detected);
      }
    } catch (error) {
      console.error('Failed to detect locale:', error);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleArraySettingChange = (key, value, checked) => {
    setSettings(prev => ({
      ...prev,
      [key]: checked 
        ? [...prev[key], value]
        : prev[key].filter(item => item !== value)
    }));
  };

  const applyDetectedSettings = () => {
    if (detectedLocale) {
      setSettings(prev => ({
        ...prev,
        country: detectedLocale.country || prev.country,
        language: detectedLocale.language || prev.language,
        currency: detectedLocale.currency || prev.currency,
        timezone: detectedLocale.timezone || prev.timezone
      }));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/internationalization/user-locale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Locale settings saved successfully!' });
        if (onSettingsChange) {
          onSettingsChange(settings);
        }
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      country: 'US',
      language: 'en',
      currency: 'USD',
      timezone: 'UTC',
      date_format: 'MM/DD/YYYY',
      time_format: '12h',
      number_format: 'en-US',
      auto_detect: true,
      measurement_system: 'imperial',
      first_day_of_week: 0,
      preferred_marketplaces: [],
      exclude_international_shipping: false,
      max_shipping_cost: null
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 mt-2">Loading locale settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <GlobeAltIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Locale Settings</h3>
        </div>
        <p className="text-sm text-gray-600">
          Customize your regional preferences for currency, language, and formatting.
        </p>
      </div>

      {/* Auto-detection Notice */}
      {detectedLocale && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <GlobeAltIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900">Detected Location</h4>
              <p className="text-sm text-blue-700 mt-1">
                We detected you're in {detectedLocale.country} with currency {detectedLocale.currency}.
                Would you like to apply these settings?
              </p>
              <button
                onClick={applyDetectedSettings}
                className="mt-2 text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
              >
                Apply Detected Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={settings.country}
              onChange={(e) => handleSettingChange('country', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              {supportedLocales.countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.code} - {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={settings.language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              {supportedLocales.languages.map(language => (
                <option key={language.code} value={language.code}>
                  {language.code} - {language.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={settings.currency}
              onChange={(e) => handleSettingChange('currency', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              {supportedLocales.currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Format Settings */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Format Preferences</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Format
              </label>
              <select
                value={settings.date_format}
                onChange={(e) => handleSettingChange('date_format', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (European)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Format
              </label>
              <select
                value={settings.time_format}
                onChange={(e) => handleSettingChange('time_format', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="12h">12-hour (AM/PM)</option>
                <option value="24h">24-hour</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Measurement System
              </label>
              <select
                value={settings.measurement_system}
                onChange={(e) => handleSettingChange('measurement_system', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="imperial">Imperial (US)</option>
                <option value="metric">Metric</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Day of Week
              </label>
              <select
                value={settings.first_day_of_week}
                onChange={(e) => handleSettingChange('first_day_of_week', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
              </select>
            </div>
          </div>
        </div>

        {/* Shopping Preferences */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Shopping Preferences</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Marketplaces
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['amazon', 'ebay', 'walmart', 'target', 'bestbuy', 'costco', 'aliexpress', 'etsy'].map(marketplace => (
                  <label key={marketplace} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.preferred_marketplaces.includes(marketplace)}
                      onChange={(e) => handleArraySettingChange('preferred_marketplaces', marketplace, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm capitalize">{marketplace}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="exclude_international"
                checked={settings.exclude_international_shipping}
                onChange={(e) => handleSettingChange('exclude_international_shipping', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="exclude_international" className="text-sm text-gray-700">
                Exclude products with international shipping
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Shipping Cost (Optional)
              </label>
              <input
                type="number"
                value={settings.max_shipping_cost || ''}
                onChange={(e) => handleSettingChange('max_shipping_cost', e.target.value ? parseFloat(e.target.value) : null)}
                min="0"
                step="0.01"
                className="w-full md:w-48 border border-gray-300 rounded px-3 py-2"
                placeholder="Enter max shipping cost"
              />
            </div>
          </div>
        </div>

        {/* Auto-detection Setting */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="auto_detect"
              checked={settings.auto_detect}
              onChange={(e) => handleSettingChange('auto_detect', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="auto_detect" className="text-sm text-gray-700">
              Automatically detect locale from browser and location
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            When enabled, we'll automatically adjust settings based on your location and browser preferences.
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' && <CheckIcon className="w-4 h-4" />}
              <span className="text-sm">{message.text}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-4">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
          
          <button
            onClick={resetToDefaults}
            className="border border-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-50 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocaleSettings;