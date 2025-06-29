// Analytics data export component
import React, { useState } from 'react';

const AnalyticsExport = () => {
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('dashboard');
  const [format, setFormat] = useState('json');
  const [timeRange, setTimeRange] = useState('30');

  const handleExport = async () => {
    try {
      setExporting(true);
      
      let endpoint = '';
      let params = new URLSearchParams();
      
      if (exportType === 'dashboard') {
        endpoint = '/api/analytics/export/dashboard';
        params.append('format', format);
      } else if (exportType === 'events') {
        endpoint = '/api/analytics/export/events';
        params.append('format', format);
        params.append('days', timeRange);
      }
      
      const response = await fetch(`${endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create and download file
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: format === 'json' ? 'application/json' : 'text/csv'
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dealhunt-${exportType}-${new Date().toISOString().split('T')[0]}.${format}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        alert('Export completed successfully!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Analytics Data</h3>
        <p className="text-sm text-gray-600">
          Download your analytics data for external analysis or backup purposes.
        </p>
      </div>

      <div className="space-y-4">
        {/* Export Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Type
          </label>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="dashboard">Complete Dashboard Data</option>
            <option value="events">Raw Analytics Events</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {exportType === 'dashboard' 
              ? 'Includes all computed metrics, insights, and summaries'
              : 'Raw event data with timestamps and user actions'
            }
          </p>
        </div>

        {/* Time Range (for events only) */}
        {exportType === 'events' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="365">Last year</option>
            </select>
          </div>
        )}

        {/* Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="json"
                checked={format === 'json'}
                onChange={(e) => setFormat(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">JSON</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="csv"
                checked={format === 'csv'}
                onChange={(e) => setFormat(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">CSV</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {format === 'json' 
              ? 'Machine-readable format with full data structure'
              : 'Spreadsheet-compatible format (limited data structure)'
            }
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Privacy Notice</h4>
              <p className="text-xs text-yellow-700 mt-1">
                Exported data contains your personal analytics information. 
                Keep this data secure and don't share it with unauthorized parties.
              </p>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full bg-blue-500 text-white py-3 px-4 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {exporting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Data</span>
            </>
          )}
        </button>

        {/* Additional Options */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Additional Options</h4>
          
          <div className="space-y-2">
            <button
              onClick={() => {
                // **MANUAL IMPLEMENTATION NEEDED**: Schedule automated exports
                alert('Automated export scheduling not implemented yet');
              }}
              className="w-full text-left p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">Schedule Automated Exports</div>
                  <div className="text-xs text-gray-600">Set up weekly or monthly data exports</div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            <button
              onClick={() => {
                // **MANUAL IMPLEMENTATION NEEDED**: API access for third-party tools
                alert('API access configuration not implemented yet');
              }}
              className="w-full text-left p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">API Access</div>
                  <div className="text-xs text-gray-600">Connect third-party analytics tools</div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsExport;