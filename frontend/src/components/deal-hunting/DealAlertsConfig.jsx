// Deal alerts configuration component
import React, { useState, useEffect } from 'react';
import { PlusIcon, BellIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

const DealAlertsConfig = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    alert_types: ['price_drop'],
    notification_channels: ['push', 'email'],
    severity_threshold: 'low',
    frequency_limit: 5,
    quiet_hours_start: '',
    quiet_hours_end: '',
    is_active: true,
    filters: {
      keywords: [],
      categories: [],
      marketplaces: [],
      min_discount_percentage: 10,
      max_price: null,
      min_price: null,
      brands: [],
      exclude_brands: [],
      exclude_keywords: [],
      rating_threshold: 0,
      reviews_threshold: 0
    }
  });
  const [availableOptions, setAvailableOptions] = useState({
    alert_types: [],
    severity_levels: [],
    notification_channels: [],
    categories: [],
    marketplaces: []
  });

  useEffect(() => {
    loadAlerts();
    loadAvailableOptions();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/deal-hunting/alerts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const alertsData = await response.json();
        setAlerts(alertsData);
      } else {
        console.error('Failed to load alerts');
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableOptions = async () => {
    try {
      const [alertTypesRes, severityRes, channelsRes, categoriesRes, marketplacesRes] = await Promise.all([
        fetch('/api/deal-hunting/alert-types'),
        fetch('/api/deal-hunting/severity-levels'),
        fetch('/api/deal-hunting/notification-channels'),
        fetch('/api/deal-hunting/categories'),
        fetch('/api/deal-hunting/marketplaces')
      ]);

      const [alertTypes, severityLevels, channels, categories, marketplaces] = await Promise.all([
        alertTypesRes.json(),
        severityRes.json(),
        channelsRes.json(),
        categoriesRes.json(),
        marketplacesRes.json()
      ]);

      setAvailableOptions({
        alert_types: alertTypes.alert_types || [],
        severity_levels: severityLevels.severity_levels || [],
        notification_channels: channels.notification_channels || [],
        categories: categories.categories || [],
        marketplaces: marketplaces.marketplaces || []
      });
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const handleCreateAlert = async () => {
    try {
      const response = await fetch('/api/deal-hunting/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadAlerts();
        setShowCreateForm(false);
        resetForm();
        alert('Alert created successfully!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to create alert');
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      alert('Failed to create alert');
    }
  };

  const handleUpdateAlert = async (alertId) => {
    try {
      const response = await fetch(`/api/deal-hunting/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadAlerts();
        setEditingAlert(null);
        resetForm();
        alert('Alert updated successfully!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to update alert');
      }
    } catch (error) {
      console.error('Error updating alert:', error);
      alert('Failed to update alert');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      const response = await fetch(`/api/deal-hunting/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadAlerts();
        alert('Alert deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to delete alert');
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
      alert('Failed to delete alert');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      alert_types: ['price_drop'],
      notification_channels: ['push', 'email'],
      severity_threshold: 'low',
      frequency_limit: 5,
      quiet_hours_start: '',
      quiet_hours_end: '',
      is_active: true,
      filters: {
        keywords: [],
        categories: [],
        marketplaces: [],
        min_discount_percentage: 10,
        max_price: null,
        min_price: null,
        brands: [],
        exclude_brands: [],
        exclude_keywords: [],
        rating_threshold: 0,
        reviews_threshold: 0
      }
    });
  };

  const startEdit = (alert) => {
    setFormData(alert);
    setEditingAlert(alert.alert_id);
    setShowCreateForm(true);
  };

  const handleArrayFieldChange = (field, value, checked, isFilter = false) => {
    const target = isFilter ? formData.filters : formData;
    const currentArray = target[field] || [];
    
    const newArray = checked 
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value);
    
    if (isFilter) {
      setFormData(prev => ({
        ...prev,
        filters: {
          ...prev.filters,
          [field]: newArray
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: newArray
      }));
    }
  };

  const addKeyword = (isExclude = false) => {
    const field = isExclude ? 'exclude_keywords' : 'keywords';
    const input = document.getElementById(isExclude ? 'exclude-keyword-input' : 'keyword-input');
    const keyword = input.value.trim();
    
    if (keyword && !formData.filters[field].includes(keyword)) {
      setFormData(prev => ({
        ...prev,
        filters: {
          ...prev.filters,
          [field]: [...prev.filters[field], keyword]
        }
      }));
      input.value = '';
    }
  };

  const removeKeyword = (keyword, isExclude = false) => {
    const field = isExclude ? 'exclude_keywords' : 'keywords';
    setFormData(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [field]: prev.filters[field].filter(k => k !== keyword)
      }
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 mt-2">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BellIcon className="w-6 h-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Deal Alerts</h2>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingAlert(null);
              setShowCreateForm(true);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Create Alert</span>
          </button>
        </div>
        
        <p className="text-gray-600">
          Set up automated alerts to get notified when great deals match your criteria.
        </p>
      </div>

      {/* Existing Alerts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Your Alerts ({alerts.length})</h3>
        </div>
        
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No alerts configured yet. Create your first alert to start receiving deal notifications.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {alerts.map(alert => (
              <div key={alert.alert_id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{alert.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        alert.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {alert.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {alert.severity_threshold}
                      </span>
                    </div>
                    
                    {alert.description && (
                      <p className="text-gray-600 mb-3">{alert.description}</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Alert Types: </span>
                        <span className="text-gray-600">{alert.alert_types.join(', ')}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Channels: </span>
                        <span className="text-gray-600">{alert.notification_channels.join(', ')}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Min Discount: </span>
                        <span className="text-gray-600">{alert.filters.min_discount_percentage}%</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Daily Limit: </span>
                        <span className="text-gray-600">{alert.frequency_limit} alerts</span>
                      </div>
                    </div>
                    
                    {alert.filters.keywords.length > 0 && (
                      <div className="mt-3">
                        <span className="font-medium text-gray-700 text-sm">Keywords: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {alert.filters.keywords.map(keyword => (
                            <span key={keyword} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => startEdit(alert)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit alert"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAlert(alert.alert_id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete alert"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Alert Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingAlert ? 'Edit Alert' : 'Create New Alert'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure when and how you want to be notified about deals.
            </p>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="e.g., Laptop Deals"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Optional description"
                />
              </div>
            </div>

            {/* Alert Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Types
                </label>
                <div className="space-y-2">
                  {availableOptions.alert_types.map(type => (
                    <label key={type.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.alert_types.includes(type.value)}
                        onChange={(e) => handleArrayFieldChange('alert_types', type.value, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Channels
                </label>
                <div className="space-y-2">
                  {availableOptions.notification_channels.map(channel => (
                    <label key={channel.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.notification_channels.includes(channel.value)}
                        onChange={(e) => handleArrayFieldChange('notification_channels', channel.value, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{channel.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Severity
                </label>
                <select
                  value={formData.severity_threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, severity_threshold: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  {availableOptions.severity_levels.map(level => (
                    <option key={level.value} value={level.value}>{level.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filters */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Deal Filters</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keywords
                  </label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      id="keyword-input"
                      type="text"
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      placeholder="Add keyword..."
                      onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                    />
                    <button
                      onClick={() => addKeyword()}
                      className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.filters.keywords.map(keyword => (
                      <span key={keyword} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded flex items-center space-x-1">
                        <span>{keyword}</span>
                        <button onClick={() => removeKeyword(keyword)} className="text-blue-600 hover:text-blue-800">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={formData.filters.min_price || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        filters: { ...prev.filters, min_price: e.target.value ? parseFloat(e.target.value) : null }
                      }))}
                      className="border border-gray-300 rounded px-3 py-2 text-sm"
                      placeholder="Min price"
                    />
                    <input
                      type="number"
                      value={formData.filters.max_price || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        filters: { ...prev.filters, max_price: e.target.value ? parseFloat(e.target.value) : null }
                      }))}
                      className="border border-gray-300 rounded px-3 py-2 text-sm"
                      placeholder="Max price"
                    />
                  </div>
                </div>

                {/* Discount Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Discount (%)
                  </label>
                  <input
                    type="number"
                    value={formData.filters.min_discount_percentage}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      filters: { ...prev.filters, min_discount_percentage: parseFloat(e.target.value) || 0 }
                    }))}
                    min="0"
                    max="100"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                {/* Frequency Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Alert Limit
                  </label>
                  <input
                    type="number"
                    value={formData.frequency_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, frequency_limit: parseInt(e.target.value) || 5 }))}
                    min="1"
                    max="50"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <button
                onClick={editingAlert ? () => handleUpdateAlert(editingAlert) : handleCreateAlert}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                {editingAlert ? 'Update Alert' : 'Create Alert'}
              </button>
              
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingAlert(null);
                  resetForm();
                }}
                className="border border-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealAlertsConfig;